// db.ts
// Robust IndexedDB wrapper with offline sync queue functionality.

import { supabase } from './supabaseClient';
import { Folder, Note, Playlist, QuickNote, Todo } from './types';

let db: IDBDatabase;
const DB_NAME_PREFIX = 'PollitoProductivoDB';
const DB_VERSION = 2; // Incremented version for new schema
const STORES = ['todos', 'folders', 'notes', 'playlists', 'quick_notes', 'settings', 'sync_queue'];

// --- Types for Sync Queue ---
interface SyncOperation {
    id?: number; // Auto-incrementing primary key
    type: 'CREATE' | 'UPDATE' | 'DELETE' | 'DELETE_ALL' | 'DELETE_MULTIPLE';
    tableName: string;
    payload?: any; // For CREATE/UPDATE
    key?: number | string; // For DELETE
    keys?: (number | string)[]; // For DELETE_MULTIPLE
    userId?: string; // For DELETE_ALL
}


// --- DB Initialization ---
export const initDB = (username: string): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }
        const dbName = `${DB_NAME_PREFIX}_${username}`;
        const request = indexedDB.open(dbName, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const dbInstance = (event.target as IDBOpenDBRequest).result;
            STORES.forEach(storeName => {
                if (!dbInstance.objectStoreNames.contains(storeName)) {
                    const keyPath = storeName === 'settings' ? 'key' : 'id';
                    const autoIncrement = storeName === 'sync_queue';
                    dbInstance.createObjectStore(storeName, { keyPath, autoIncrement });
                }
            });
        };

        request.onsuccess = (event) => {
            db = (event.target as IDBOpenDBRequest).result;
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
            reject(`Error opening IndexedDB for user ${username}.`);
        };
    });
};


// --- Generic DB Helpers ---
const getStore = (storeName: string, mode: IDBTransactionMode) => {
    if (!db) throw new Error("Database is not initialized. Call initDB first.");
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
};

export const getAll = <T>(storeName: string): Promise<T[]> => {
    return new Promise((resolve, reject) => {
        if (!db) return resolve([]);
        const store = getStore(storeName, 'readonly');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
};

export const get = <T>(storeName: string, key: IDBValidKey): Promise<T | undefined> => {
    return new Promise((resolve, reject) => {
        if (!db) return resolve(undefined);
        const store = getStore(storeName, 'readonly');
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const add = <T>(storeName: string, value: T): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!db) return reject("DB not initialized");
        const store = getStore(storeName, 'readwrite');
        const request = store.add(value);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const set = <T>(storeName: string, value: T): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!db) return reject("DB not initialized");
        const store = getStore(storeName, 'readwrite');
        const request = store.put(value);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const remove = (storeName: string, key: IDBValidKey): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!db) return reject("DB not initialized");
        const store = getStore(storeName, 'readwrite');
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const removeMultiple = (storeName: string, keys: IDBValidKey[]): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!db) return reject("DB not initialized");
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        keys.forEach(key => store.delete(key));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

const clearStore = (storeName: string): Promise<void> => {
     return new Promise((resolve, reject) => {
        if (!db) return reject("DB not initialized");
        const store = getStore(storeName, 'readwrite');
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export const clearAndPutAll = <T>(storeName: string, data: T[]): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!db) return reject("DB not initialized");
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.clear();
        data.forEach(item => store.put(item));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};


// --- Offline Sync Queue Logic ---

/**
 * Adds a mutation operation to the sync_queue in IndexedDB.
 * This is used to persist changes made while offline, so they can be
 * sent to the server when the connection is restored.
 * @param op - The synchronization operation to queue.
 */
const queueMutation = async (op: Omit<SyncOperation, 'id'>) => {
    await add('sync_queue', op);
};

/**
 * Creates a record with an "online-first" strategy.
 * 1. Tries to insert the record directly into Supabase.
 * 2. If successful, it adds the server-confirmed record to the local IndexedDB.
 * 3. If it fails (e.g., offline), it falls back to adding the temporary record
 *    locally and queuing the 'CREATE' operation for a later sync.
 * @param tableName - The name of the Supabase/IndexedDB table.
 * @param payload - The record to create. Should have a temporary negative ID.
 * @returns The saved record (either from Supabase with a real ID, or the temporary local one).
 */
export const syncableCreate = async (tableName: string, payload: any): Promise<any> => {
    // We add to local DB first for optimistic UI updates in the component.
    // The component is responsible for replacing the temp record with the server record.
    await add(tableName, payload);

    if (navigator.onLine) {
        try {
            const { id: tempId, ...insertData } = payload;

            const relationalFields = ['subtasks', 'notes'];
            relationalFields.forEach(field => {
                if (insertData.hasOwnProperty(field)) {
                    delete insertData[field];
                }
            });

            let selectClause = '*';
            if (tableName === 'todos') {
                selectClause = '*, subtasks(*)';
            }

            const { data: newRecord, error } = await supabase.from(tableName).insert(insertData).select(selectClause).single();
            if (error) throw error;
            
            // Replace the temporary local record with the permanent one from the server.
            await remove(tableName, tempId);
            await add(tableName, newRecord); 
            return newRecord;
        } catch (error) {
            console.error(`Online CREATE failed for ${tableName}, falling back to offline mode.`, error);
            await queueMutation({ type: 'CREATE', tableName, payload });
            return payload; // Return original payload on failure
        }
    } 
    else {
        await queueMutation({ type: 'CREATE', tableName, payload });
        return payload;
    }
};

/**
 * Updates a record with an "online-first" strategy.
 * 1. Optimistically updates the record in the local IndexedDB.
 * 2. Tries to send the update to Supabase.
 * 3. If successful, it updates the local record again with the server-confirmed data.
 * 4. If it fails (e.g., offline), it queues the 'UPDATE' operation for a later sync.
 * @param tableName - The name of the Supabase/IndexedDB table.
 * @param payload - The full record object with the fields to update. Must include the 'id'.
 * @returns The updated record (either from Supabase or the optimistic local one).
 */
export const syncableUpdate = async (tableName: string, payload: any): Promise<any> => {
    await set(tableName, payload); // Optimistic local update for immediate UI feedback.

    if (navigator.onLine) {
        try {
            const { id, ...updateData } = payload;
            
            // Remove client-side only or relational fields before sending to Supabase.
            const relationalFields = ['subtasks', 'notes'];
            relationalFields.forEach(field => {
                if (updateData.hasOwnProperty(field)) {
                    delete updateData[field];
                }
            });
            // These fields are managed by the database and should not be part of an update payload.
            delete updateData.created_at;
            delete updateData.user_id;
            
            let selectClause = '*';
            if (tableName === 'todos') {
                selectClause = '*, subtasks(*)';
            }

            const { data: updatedRecord, error } = await supabase.from(tableName).update(updateData).eq('id', id).select(selectClause).single();
            if (error) throw error;

            // Ensure local DB has the confirmed server state.
            await set(tableName, updatedRecord);
            return updatedRecord;
        } catch (error) {
            console.error(`Online UPDATE failed for ${tableName}, queueing for later.`, error);
            await queueMutation({ type: 'UPDATE', tableName, payload });
            return payload;
        }
    } else {
        await queueMutation({ type: 'UPDATE', tableName, payload });
        return payload;
    }
};

/**
 * Deletes a single record with an "online-first" strategy.
 * @param tableName - The name of the Supabase/IndexedDB table.
 * @param key - The 'id' of the record to delete.
 */
export const syncableDelete = async (tableName: string, key: number | string): Promise<void> => {
    await remove(tableName, key); // Optimistic local delete

    if (navigator.onLine) {
        try {
            const { error } = await supabase.from(tableName).delete().eq('id', key);
            if (error) throw error;
        } catch (error) {
            console.error(`Online DELETE failed for ${tableName}, queueing for later.`, error);
            await queueMutation({ type: 'DELETE', tableName, key });
        }
    } else {
        await queueMutation({ type: 'DELETE', tableName, key });
    }
};

/**
 * Deletes multiple records with an "online-first" strategy. This is much more
 * efficient than calling `syncableDelete` in a loop when online.
 * @param tableName - The name of the Supabase/IndexedDB table.
 * @param keys - An array of 'id's of the records to delete.
 */
export const syncableDeleteMultiple = async (tableName: string, keys: (number | string)[]): Promise<void> => {
    if (keys.length === 0) return;
    await removeMultiple(tableName, keys); // Optimistic local bulk delete

    if (navigator.onLine) {
        try {
            const { error } = await supabase.from(tableName).delete().in('id', keys);
            if (error) throw error;
        } catch (error) {
            console.error(`Online DELETE_MULTIPLE failed for ${tableName}, queueing for later.`, error);
            await queueMutation({ type: 'DELETE_MULTIPLE', tableName, keys });
        }
    } else {
        await queueMutation({ type: 'DELETE_MULTIPLE', tableName, keys });
    }
};

/**
 * Deletes all records for a user from a table with an "online-first" strategy.
 * @param tableName - The name of the Supabase/IndexedDB table.
 * @param userId - The 'user_id' to filter by for deletion.
 */
export const syncableDeleteAll = async (tableName: string, userId: string): Promise<void> => {
    await clearStore(tableName); // Optimistic local clear

    if (navigator.onLine) {
        try {
            const { error } = await supabase.from(tableName).delete().eq('user_id', userId);
            if (error) throw error;
        } catch (error) {
            console.error(`Online DELETE_ALL failed for ${tableName}, queueing for later.`, error);
            await queueMutation({ type: 'DELETE_ALL', tableName, userId });
        }
    } else {
        await queueMutation({ type: 'DELETE_ALL', tableName, userId });
    }
};

let isSyncing = false;
export const processSyncQueue = async (): Promise<{ success: boolean; errors: any[] }> => {
    if (isSyncing || !navigator.onLine) return { success: true, errors: [] };
    isSyncing = true;
    console.log("Starting sync process...");

    const operations: SyncOperation[] = await getAll('sync_queue');
    if (operations.length === 0) {
        isSyncing = false;
        console.log("Sync queue is empty.");
        return { success: true, errors: [] };
    }

    const errors: any[] = [];
    const tempIdMap = new Map<number, number>();

    for (const op of operations) {
        try {
            switch (op.type) {
                case 'CREATE': {
                    const tempId = op.payload.id;
                    const { id, ...insertData } = op.payload;

                    const relationalFields = ['subtasks', 'notes'];
                    relationalFields.forEach(field => {
                        if (insertData.hasOwnProperty(field)) {
                            delete insertData[field];
                        }
                    });

                    let selectClause = '*';
                    if (op.tableName === 'todos') {
                        selectClause = '*, subtasks(*)';
                    }

                    const { data: newRecord, error } = await supabase.from(op.tableName).insert(insertData).select(selectClause).single();
                    if (error) {
                        console.error(`Supabase CREATE error on table '${op.tableName}':`, error);
                        throw new Error(`Supabase CREATE error: ${error.message}`);
                    }
                    
                    if (tempId < 0) tempIdMap.set(tempId, newRecord.id);
                    await remove(op.tableName, tempId);
                    await add(op.tableName, newRecord);
                    break;
                }
                case 'UPDATE': {
                    let payload = { ...op.payload };
                    let recordId = payload.id;
                    
                    if (typeof recordId === 'number' && recordId < 0) {
                        if (tempIdMap.has(recordId)) {
                            recordId = tempIdMap.get(recordId);
                        } else {
                            console.warn(`Could not find server ID for temp ID ${recordId}. This may happen if a record is updated before its create operation is synced. The update will be attempted with the temp ID.`);
                        }
                    }

                    const { id, ...updateData } = payload;
                    
                    const relationalFields = ['subtasks', 'notes'];
                    relationalFields.forEach(field => delete updateData[field]);

                    delete updateData.created_at;
                    delete updateData.user_id;

                    const { error } = await supabase.from(op.tableName).update(updateData).eq('id', recordId);
                    if (error) throw error;
                    
                    break;
                }
                case 'DELETE': {
                    let key = op.key!;
                    if (typeof key === 'number' && key < 0 && tempIdMap.has(key)) {
                        // This item was created and deleted offline before a sync. No need to delete from server.
                    } else {
                        const { error } = await supabase.from(op.tableName).delete().eq('id', key);
                        if (error) throw error;
                    }
                    break;
                }
                 case 'DELETE_MULTIPLE': {
                    const keys = op.keys!;
                    // Filter out temporary IDs that were created and deleted offline.
                    const serverKeys = keys.filter(key => typeof key !== 'number' || key >= 0);
                    if (serverKeys.length > 0) {
                        const { error } = await supabase.from(op.tableName).delete().in('id', serverKeys);
                        if (error) throw error;
                    }
                    break;
                }
                case 'DELETE_ALL': {
                    const { error } = await supabase.from(op.tableName).delete().eq('user_id', op.userId!);
                    if (error) throw error;
                    break;
                }
            }
            await remove('sync_queue', op.id!);
        } catch (error) {
            console.error('Sync operation failed:', op, error);
            errors.push({ op, error });
            isSyncing = false;
            return { success: false, errors };
        }
    }
    
    console.log("Sync process finished successfully.");
    isSyncing = false;
    return { success: true, errors: [] };
};