// db.ts
// Robust IndexedDB wrapper with offline sync queue functionality.

import { supabase } from './supabaseClient';
import { Todo } from './types';

let db: IDBDatabase;
const DB_NAME_PREFIX = 'PollitoProductivoDB';
const DB_VERSION = 2; // Incremented version for new schema
const STORES = ['todos', 'folders', 'notes', 'playlists', 'quick_notes', 'settings', 'sync_queue'];

// --- Types for Sync Queue ---
interface SyncOperation {
    id?: number; // Auto-incrementing primary key
    type: 'CREATE' | 'UPDATE' | 'DELETE' | 'DELETE_ALL';
    tableName: string;
    payload?: any; // For CREATE/UPDATE
    key?: number | string; // For DELETE
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

const queueMutation = async (op: Omit<SyncOperation, 'id'>) => {
    await add('sync_queue', op);
};

export const syncableCreate = async (tableName: string, payload: any) => {
    await add(tableName, payload);
    await queueMutation({ type: 'CREATE', tableName, payload });
};
export const syncableUpdate = async (tableName: string, payload: any) => {
    await set(tableName, payload);
    await queueMutation({ type: 'UPDATE', tableName, payload });
};
export const syncableDelete = async (tableName: string, key: number | string) => {
    await remove(tableName, key);
    await queueMutation({ type: 'DELETE', tableName, key });
};
export const syncableDeleteAll = async (tableName: string, userId: string) => {
    await clearStore(tableName);
    await queueMutation({ type: 'DELETE_ALL', tableName, userId });
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

                    // FIX: Clean the payload before sending to Supabase.
                    // The frontend state might have relational fields (like 'subtasks' or 'notes')
                    // that don't exist as columns in the database table. Supabase insert will fail if they are present.
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