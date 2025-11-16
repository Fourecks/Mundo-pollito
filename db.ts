// db.ts
// Robust IndexedDB wrapper with offline sync queue functionality.

import { supabase } from './supabaseClient';
import { Folder, Note, Playlist, QuickNote, Todo } from './types';

let db: IDBDatabase;
const DB_NAME_PREFIX = 'PollitoProductivoDB';
const DB_VERSION = 4; // Incremented version for new schema
const STORES = ['todos', 'folders', 'notes', 'playlists', 'quick_notes', 'settings', 'sync_queue', 'projects', 'habits', 'habit_records'];

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
const queueMutation = async (op: Omit<SyncOperation, 'id'>) => {
    await add('sync_queue', op);
};

export const syncableCreate = async (tableName: string, payload: any): Promise<any> => {
    await add(tableName, payload);

    if (navigator.onLine) {
        try {
            const { id: tempId, ...insertData } = payload;
            const relationalFields = ['subtasks', 'notes', 'todos'];
            relationalFields.forEach(field => {
                if (insertData.hasOwnProperty(field)) delete insertData[field];
            });

            let selectClause = '*';
            if (tableName === 'todos') selectClause = '*, subtasks(*)';

            const { data: newRecord, error } = await supabase.from(tableName).insert(insertData).select(selectClause).single();
            
            if (error && error.code === '23505') { // Unique constraint violation
                console.warn(`Record already exists for ${tableName}, attempting to fetch (self-heal).`, payload);
                let query = supabase.from(tableName);
                let existingRecord = null;
                
                // Add specific self-healing logic for known unique constraints
                if (tableName === 'habit_records') {
                    const { data } = await query.select('*').eq('habit_id', payload.habit_id).eq('completed_at', payload.completed_at).single();
                    existingRecord = data;
                }
                
                if (existingRecord) {
                    await set(tableName, existingRecord);
                    return existingRecord;
                } else {
                    throw new Error(`Self-heal failed: Could not find existing record for ${tableName} despite 23505 error.`);
                }
            } else if (error) {
                throw error;
            }

            await new Promise<void>((resolve, reject) => {
                if (!db) return reject("DB not initialized for atomic create.");
                const tx = db.transaction(tableName, 'readwrite');
                tx.objectStore(tableName).delete(tempId);
                tx.objectStore(tableName).put(newRecord);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
            
            return newRecord;
        } catch (error) {
            console.error(`Online CREATE failed for ${tableName}, falling back to offline.`, error);
            await queueMutation({ type: 'CREATE', tableName, payload });
            return payload;
        }
    } 
    else {
        await queueMutation({ type: 'CREATE', tableName, payload });
        return payload;
    }
};

export const syncableUpdate = async (tableName: string, payload: any): Promise<any> => {
    if (typeof payload.id === 'number' && payload.id < 0) {
        await queueMutation({ type: 'UPDATE', tableName, payload });
        await set(tableName, payload);
        return payload;
    }

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

export const syncableDelete = async (tableName: string, key: number | string): Promise<void> => {
    if (typeof key === 'number' && key < 0) {
        await queueMutation({ type: 'DELETE', tableName, key });
        await remove(tableName, key);
        return;
    }

    await remove(tableName, key); 

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

export const syncableDeleteMultiple = async (tableName: string, keys: (number | string)[]): Promise<void> => {
    if (keys.length === 0) return;
    await removeMultiple(tableName, keys); 

    if (navigator.onLine) {
        try {
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

export const syncableDeleteAll = async (tableName: string, userId: string): Promise<void> => {
    await clearStore(tableName);

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

    let operations: SyncOperation[] = await getAll('sync_queue');
    if (operations.length === 0) {
        isSyncing = false;
        return { success: true, errors: [] };
    }

    const getSortPriority = (op: SyncOperation) => {
        const parentTables = ['folders', 'projects', 'habits'];
        if (op.type === 'CREATE' && parentTables.includes(op.tableName)) return 1;
        if (op.type === 'CREATE') return 2;
        if (op.type === 'UPDATE') return 3;
        return 4; // DELETE, DELETE_MULTIPLE, DELETE_ALL
    };
    operations.sort((a, b) => getSortPriority(a) - getSortPriority(b));

    const errors: any[] = [];
    const tempIdMap = new Map<number, number | string>();
    const foreignKeyFields = ['habit_id', 'project_id', 'folder_id', 'todo_id'];

    for (const op of operations) {
        try {
            switch (op.type) {
                case 'CREATE': {
                    const tempId = op.payload.id;
                    const { id, ...originalInsertData } = op.payload;
                    let insertData = { ...originalInsertData };

                    // Resolve foreign keys
                    for (const field of foreignKeyFields) {
                        if (insertData.hasOwnProperty(field) && typeof insertData[field] === 'number' && insertData[field] < 0) {
                            const tempFkId = insertData[field];
                            if (tempIdMap.has(tempFkId)) {
                                insertData[field] = tempIdMap.get(tempFkId);
                            } else {
                                throw new Error(`Dependency Error: Cannot create ${op.tableName}. Parent with temp ID ${tempFkId} has not been synced.`);
                            }
                        }
                    }

                    const { data: newRecord, error } = await supabase.from(op.tableName).insert(insertData).select().single();
                    if (error) throw error;
                    
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
                            payload.id = tempIdMap.get(recordId)!;
                        } else { continue; } // Skip if parent create op hasn't happened yet
                    }

                    for (const field of foreignKeyFields) {
                        if (payload.hasOwnProperty(field) && typeof payload[field] === 'number' && payload[field] < 0) {
                            if (tempIdMap.has(payload[field])) {
                                payload[field] = tempIdMap.get(payload[field]);
                            }
                        }
                    }

                    const { id: finalId, ...updateData } = payload;
                    const relationalFields = ['subtasks', 'notes', 'todos'];
                    relationalFields.forEach(field => delete updateData[field]);

                    const { error } = await supabase.from(op.tableName).update(updateData).eq('id', finalId);
                    if (error) throw error;
                    break;
                }
                case 'DELETE': {
                    let key = op.key!;
                    if (typeof key === 'number' && key < 0 && tempIdMap.has(key)) {
                        // Item was created and deleted offline, do nothing on server.
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
            await remove('sync_queue', op.id!);
        } catch (error) {
            console.error('Sync operation failed, but continuing with the next one:', op, error);
            errors.push({ op, error });
        }
    }
    
    isSyncing = false;
    return { success: errors.length === 0, errors };
};
