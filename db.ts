const DB_NAME_PREFIX = 'LivelyTodoDB';
const DB_VERSION = 4; // Bump version to trigger upgrade and remove old stores
const BACKGROUNDS_STORE_NAME = 'backgrounds';


const dbConnections: { [key: string]: IDBDatabase } = {};

// Function to initialize the database for a specific user
export const initDB = (username: string): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const dbName = `${DB_NAME_PREFIX}_${username}`;
        if (dbConnections[dbName]) {
            return resolve(dbConnections[dbName]);
        }

        const request = indexedDB.open(dbName, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const dbInstance = (event.target as IDBOpenDBRequest).result;
            // Clean up old gallery store if it exists
            if (dbInstance.objectStoreNames.contains('galleryImages')) {
                dbInstance.deleteObjectStore('galleryImages');
            }
             // Clean up old backgrounds store if it exists
            if (dbInstance.objectStoreNames.contains(BACKGROUNDS_STORE_NAME)) {
                dbInstance.deleteObjectStore(BACKGROUNDS_STORE_NAME);
            }
        };

        request.onsuccess = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            dbConnections[dbName] = db;
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
            reject(`Error opening IndexedDB for user ${username}.`);
        };
    });
};
