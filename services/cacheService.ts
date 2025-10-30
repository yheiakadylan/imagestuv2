const DB_NAME = 'ImageStudioCache';
const STORE_NAME = 'images';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                reject('IndexedDB is not supported');
                return;
            }
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject('Error opening DB');
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'url' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }
    return dbPromise;
};

export const saveImage = (url: string, dataUrl: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            const db = await getDb();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put({ url, dataUrl, timestamp: Date.now() });

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        } catch (error) {
            reject(error);
        }
    });
};

export const getImage = (url: string): Promise<string | null> => {
    return new Promise(async (resolve, reject) => {
         try {
            const db = await getDb();
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(url);

            request.onsuccess = () => {
                resolve(request.result ? request.result.dataUrl : null);
            };
            request.onerror = () => {
                reject(request.error);
            };
        } catch (error) {
             reject(error);
        }
    });
};
