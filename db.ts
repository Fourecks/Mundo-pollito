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
// Exact whitelist of columns present in Supabase remote tables
const TABLE_ALLOWED_COLUMNS: Record<string, Set<string>> = {
    todos: new Set([
        'id', 'user_id', 'created_at', 'text', 'completed', 'priority', 'due_date', 
        'end_date', 'start_time', 'end_time', 'notes', 'project_id', 'gcal_event_id', 
        'recurrence', 'reminder_offset', 'reminder_at', 'notification_sent',
        'kanban_column', 'story_points', 'sprint_id', 'milestone_id', 'tags',
        'dependencies', 'comments', 'attachments', 'assignee', 'calendar_provider',
        'calendar_event_link', 'notion_page_id', 'notion_url'
    ]),
    subtasks: new Set([
        'id', 'todo_id', 'created_at', 'text', 'completed'
    ]),
    projects: new Set([
        'id', 'user_id', 'created_at', 'name', 'description', 'emoji', 'color', 
        'is_archived', 'status', 'priority', 'start_date', 'target_date', 'lead', 
        'kanban_columns', 'sprints', 'milestones', 'docs', 'inbox', 'activities', 
        'members', 'template_type', 'goal_id', 'channels', 'chat_messages', 'polls',
        'huddles', 'expenses', 'time_entries', 'doc_folders', 'quarterly_priorities',
        'lists', 'todos', 'owner_email', 'owner_name'
    ]),
    project_invitations: new Set([
        'id', 'project_id', 'project_name', 'project_emoji', 'project_color',
        'inviter_id', 'inviter_name', 'inviter_email', 'sender_id', 'sender_email',
        'invitee_email', 'receiver_email', 'status', 'created_at'
    ]),
    folders: new Set([
        'id', 'user_id', 'created_at', 'name'
    ]),
    notes: new Set([
        'id', 'user_id', 'folder_id', 'created_at', 'updated_at', 'title', 'content'
    ]),
    playlists: new Set([
        'id', 'user_id', 'created_at', 'name', 'type', 'source_id', 'platform', 
        'is_favorite', 'thumbnail_url'
    ]),
    quick_notes: new Set([
        'id', 'user_id', 'created_at', 'text'
    ]),
    habits: new Set([
        'id', 'user_id', 'created_at', 'name', 'emoji', 'frequency'
    ]),
    habit_records: new Set([
        'id', 'user_id', 'habit_id', 'created_at', 'completed_at'
    ]),
    profiles: new Set([
        'id', 'pomodoro_settings', 'gcal_settings', 'ui_settings', 'timezone_offset'
    ]),
    user_backgrounds: new Set([
        'id', 'user_id', 'name', 'path', 'type', 'is_favorite', 'created_at'
    ]),
    ai_conversations: new Set([
        'id', 'user_id', 'created_at', 'title', 'messages'
    ]),
};

const sanitizeForSupabase = (tableName: string, data: any) => {
    const allowed = TABLE_ALLOWED_COLUMNS[tableName];
    if (!allowed) {
        const copy = { ...data };
        delete copy.subtasks;
        delete copy.todos;
        delete copy.notes;
        return copy;
    }
    const clean: any = {};
    for (const key of Object.keys(data)) {
        if (allowed.has(key) && data[key] !== undefined) {
            clean[key] = data[key];
        }
    }

    // Optimization: Prevent PostgreSQL JSONB statement timeouts (error 57014)
    // by ensuring extremely large base64 strings in 'projects.docs' are stripped
    // before syncing to the cloud database.
    if (tableName === 'projects' && clean.docs && Array.isArray(clean.docs)) {
        clean.docs = clean.docs.map((doc: any) => {
            if (doc && doc.file_url && doc.file_url.startsWith('data:') && doc.file_url.length > 500 * 1024) {
                // If the file is larger than 500KB in base64 length, strip it from the remote payload.
                // This keeps the remote database lightweight and lightning-fast.
                return {
                    ...doc,
                    file_url: "", // Strip the file_url from remote sync
                    content: (doc.content || "") + "\n\n(Archivo local de gran tamaño optimizado; se conserva en el dispositivo del autor)."
                };
            }
            return doc;
        });
    }

    return clean;
};

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
            const { id: tempId, ...rawInsertData } = payload;
            const subtasksToCreate = (tableName === 'todos' && payload.subtasks) ? payload.subtasks : null;
            const insertData = sanitizeForSupabase(tableName, rawInsertData);

            const { data: newRecord, error } = await supabase.from(tableName).insert(insertData).select().single();
            if (error) throw error;
            
            let finalRecord = { ...payload, ...newRecord, subtasks: [] };

            if (subtasksToCreate && subtasksToCreate.length > 0) {
                const subtaskPayloads = subtasksToCreate.map((st: any) => ({
                    text: st.text,
                    completed: st.completed || false,
                    todo_id: newRecord.id
                }));
                const { data: newSubtasks, error: subtaskError } = await supabase.from('subtasks').insert(subtaskPayloads).select();
                if (subtaskError) {
                    console.error("Online CREATE: Failed to create subtasks, but main task was created.", subtaskError);
                } else {
                    finalRecord.subtasks = newSubtasks;
                }
            }
            
            await new Promise<void>((resolve, reject) => {
                if (!db) return reject("DB not initialized for atomic create.");
                const tx = db.transaction(tableName, 'readwrite');
                tx.objectStore(tableName).delete(tempId);
                tx.objectStore(tableName).put(finalRecord);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
            
            return finalRecord;
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
            const { id, ...rawUpdateData } = payload;
            
            const subtasksToSync = (tableName === 'todos' && payload.subtasks) ? payload.subtasks : null;
            const updateData = sanitizeForSupabase(tableName, rawUpdateData);
            
            delete updateData.created_at;
            delete updateData.user_id;
            
            const { data: updatedRecord, error } = await supabase.from(tableName).update(updateData).eq('id', id).select().single();
            if (error) throw error;
            
            let finalRecord = { ...payload, ...updatedRecord, subtasks: payload.subtasks || [] };
            
            if (subtasksToSync !== null) {
                await supabase.from('subtasks').delete().eq('todo_id', id);
                if (subtasksToSync.length > 0) {
                    const subtaskPayloads = subtasksToSync.map((st: any) => ({ text: st.text, completed: st.completed, todo_id: id }));
                    const { data: newSubtasks, error: subtaskError } = await supabase.from('subtasks').insert(subtaskPayloads).select();
                     if (subtaskError) console.error("Online UPDATE: Failed to sync subtasks.", subtaskError);
                     else finalRecord.subtasks = newSubtasks;
                }
            }

            await set(tableName, finalRecord);
            return finalRecord;
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
    let hasNetworkError = false;

    for (const op of operations) {
        try {
            switch (op.type) {
                case 'CREATE': {
                    const tempId = op.payload.id;
                    const subtasksToCreate = (op.tableName === 'todos' && op.payload.subtasks) ? op.payload.subtasks : null;
                    const { id, ...originalInsertData } = op.payload;
                    let insertData = sanitizeForSupabase(op.tableName, originalInsertData);

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
                    
                    let finalRecord = { ...op.payload, ...newRecord, subtasks: [] };

                    if (subtasksToCreate && subtasksToCreate.length > 0) {
                        const subtaskPayloads = subtasksToCreate.map((st: any) => ({
                            text: st.text,
                            completed: st.completed || false,
                            todo_id: newRecord.id
                        }));
                        const { data: newSubtasks, error: subtaskError } = await supabase.from('subtasks').insert(subtaskPayloads).select();
                        if (subtaskError) {
                            console.error("Failed to sync subtasks for new todo", subtaskError);
                        } else {
                            finalRecord.subtasks = newSubtasks;
                        }
                    }

                    if (tempId < 0) tempIdMap.set(tempId, newRecord.id);
                    await remove(op.tableName, tempId);
                    await add(op.tableName, finalRecord);
                    break;
                }
                case 'UPDATE': {
                    let payload = { ...op.payload };
                    let recordId = payload.id;
                    
                    if (typeof recordId === 'number' && recordId < 0) {
                        if (tempIdMap.has(recordId)) {
                            payload.id = tempIdMap.get(recordId)!;
                        } else { continue; } 
                    }

                    for (const field of foreignKeyFields) {
                        if (payload.hasOwnProperty(field) && typeof payload[field] === 'number' && payload[field] < 0) {
                            if (tempIdMap.has(payload[field])) {
                                payload[field] = tempIdMap.get(payload[field]);
                            }
                        }
                    }

                    const { id: finalId, ...rawUpdateData } = payload;
                    const subtasksToSync = (op.tableName === 'todos' && payload.subtasks) ? payload.subtasks : null;

                    if (subtasksToSync !== null) {
                        const { error: deleteError } = await supabase.from('subtasks').delete().eq('todo_id', finalId);
                        if (deleteError) console.error(`Failed to delete old subtasks for todo ${finalId}`, deleteError);

                        if (subtasksToSync.length > 0) {
                            const subtaskPayloads = subtasksToSync.map((st: any) => ({
                                text: st.text,
                                completed: st.completed,
                                todo_id: finalId
                            }));
                            const { error: insertError = null } = await supabase.from('subtasks').insert(subtaskPayloads);
                            if (insertError) console.error(`Failed to insert new subtasks for todo ${finalId}`, insertError);
                        }
                    }

                    let updateData = sanitizeForSupabase(op.tableName, rawUpdateData);
                    delete updateData.created_at;
                    delete updateData.user_id;

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
        } catch (error: any) {
            const isNetworkError = !navigator.onLine || error?.message?.includes('Failed to fetch') || error?.name === 'TypeError';
            if (isNetworkError) {
                console.warn('Network unavailable during sync queue processing. Queue will resume when online.', error);
                errors.push({ op, error });
                hasNetworkError = true;
                break; // Stop iterating remaining queue until connectivity is restored
            }
            console.error('Sync operation failed permanently, removing from queue to avoid blocking future syncs:', op, error);
            await remove('sync_queue', op.id!);
            errors.push({ op, error });
        }
    }
    
    isSyncing = false;
    return { success: !hasNetworkError, errors };
};