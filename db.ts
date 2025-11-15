// db.ts
// Robust IndexedDB wrapper with offline sync queue functionality.

import { supabase } from './supabaseClient';
import { Folder, Note, Playlist, QuickNote, Todo } from './types';

let db: IDBDatabase;
const DB_NAME_PREFIX = 'PollitoProductivoDB';
const DB_VERSION = 2; // Incremented version for new schema
const STORES = ['todos', 'folders', 'notes', 'playlists', 'quick_notes', 'settings', 'sync_queue', 'projects'];

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
 * 2. If successful, it performs an atomic transaction to replace the temporary local record
 *    with the server-confirmed record in IndexedDB.
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

            const relationalFields = ['subtasks', 'notes', 'todos'];
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
            
            // ATOMIC UPDATE: Replace the temporary local record with the permanent one from the server
            // within a single transaction to ensure data integrity.
            await new Promise<void>((resolve, reject) => {
                if (!db) return reject("DB not initialized for atomic create operation.");
                const tx = db.transaction(tableName, 'readwrite');
                const store = tx.objectStore(tableName);
                store.delete(tempId);
                store.put(newRecord);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
            
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
    // This robustness check handles the edge case where an item created offline is
    // updated before it has a chance to sync. Instead of making a failing network
    // request, we simply queue the update, which will be processed correctly
    // after the initial creation is synced.
    if (typeof payload.id === 'number' && payload.id < 0) {
        await queueMutation({ type: 'UPDATE', tableName, payload });
        await set(tableName, payload); // Still need to update the local version
        return payload;
    }

    // For online updates, do the optimistic update *after* the check above.
    await set(tableName, payload); 

    if (navigator.onLine) {
        try {
            const { id, ...updateData } = payload;
            
            const relationalFields = ['subtasks', 'notes', 'todos'];
            relationalFields.forEach(field => delete updateData[field]);
            delete updateData.created_at;
            delete updateData.user_id;
            
            let selectClause = '*';
            if (tableName === 'todos') selectClause = '*, subtasks(*)';

            const { data: updatedRecord, error } = await supabase.from(tableName).update(updateData).eq('id', id).select(selectClause).single();
            if (error) throw error;

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
    // This robustness check handles deleting an item that was created offline before
    // it could be synced. We just queue the delete operation, and the sync processor
    // will handle it correctly.
    if (typeof key === 'number' && key < 0) {
        await queueMutation({ type: 'DELETE', tableName, key });
        await remove(tableName, key); // Still perform the optimistic local delete
        return;
    }

    await remove(tableName, key); // Optimistic local delete for online items

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
            // Filter out any temporary negative IDs before sending to server
            const serverKeys = keys.filter(k => typeof k !== 'number' || k >= 0);
            if (serverKeys.length > 0) {
                const { error } = await supabase.from(tableName).delete().in('id', serverKeys);
                if (error) throw error;
            }
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

    // This loop is now resilient. If one operation fails, it will be logged
    // and skipped, but the loop will continue with the next operation.
    for (const op of operations) {
        try {
            switch (op.type) {
                case 'CREATE': {
                    const tempId = op.payload.id;
                    const { id, ...insertData } = op.payload;

                    const relationalFields = ['subtasks', 'notes', 'todos'];
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
                           console.warn(`Could not find server ID for temp ID ${recordId}. This update may fail if the create operation hasn't synced yet.`);
                        }
                    }

                    const { id, ...updateData } = payload;
                    
                    const relationalFields = ['subtasks', 'notes', 'todos'];
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
                    } else if (typeof key !== 'number' || key >= 0) {
                        const { error } = await supabase.from(op.tableName).delete().eq('id', key);
                        if (error) throw error;
                    }
                    break;
                }
                 case 'DELETE_MULTIPLE': {
                    const keys = op.keys!;
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
            // If the operation was successful, remove it from the queue.
            await remove('sync_queue', op.id!);

        } catch (error) {
            console.error('Sync operation failed, but continuing with the next one:', op, error);
            errors.push({ op, error });
            // Don't re-throw or return; just continue to the next operation.
        }
    }
    
    console.log("Sync process finished.");
    isSyncing = false;
    // The process is considered successful overall if it completed, but we report any individual errors.
    return { success: errors.length === 0, errors };
};