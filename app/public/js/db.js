// Stockage local (IndexedDB) : tout reste sur le téléphone.
const DB_NAME = 'hybrid';
const DB_VERSION = 1;
const STORES = ['kv', 'activities', 'workouts'];

let dbPromise;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('activities')) db.createObjectStore('activities', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('workouts')) db.createObjectStore('workouts', { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function run(store, mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const s = tx.objectStore(store);
    const req = fn(s);
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export const db = {
  get: (key) => run('kv', 'readonly', s => s.get(key)),
  set: (key, value) => run('kv', 'readwrite', s => s.put(value, key)),
  del: (key) => run('kv', 'readwrite', s => s.delete(key)),
  all: (store) => run(store, 'readonly', s => s.getAll()),
  put: (store, value) => run(store, 'readwrite', s => s.put(value)),
  putMany: (store, values) => run(store, 'readwrite', s => { for (const v of values) s.put(v); }),
  remove: (store, key) => run(store, 'readwrite', s => s.delete(key)),
  clear: (store) => run(store, 'readwrite', s => s.clear()),
};

/** Demande au navigateur de ne jamais effacer les données de l'app. */
export async function persistStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch { /* non bloquant */ }
}

const KV_KEYS = ['moves', 'creatine', 'whey', 'settings', 'mealPlan', 'shopChecked', 'shopExtra', 'menuWeek', 'menuSeed', 'menuHistory'];

/** Sauvegarde complète (sans les jetons Strava). */
export async function exportData() {
  const kv = {};
  for (const k of KV_KEYS) kv[k] = await db.get(k);
  return {
    app: 'hybrid',
    version: 1,
    exportedAt: new Date().toISOString(),
    kv,
    workouts: await db.all('workouts'),
    activities: await db.all('activities'),
  };
}

export async function importData(data) {
  if (!data || data.app !== 'hybrid' || !Array.isArray(data.workouts)) throw new Error('Ce fichier n’est pas une sauvegarde HYBRID.');
  for (const k of KV_KEYS) if (data.kv?.[k] !== undefined) await db.set(k, data.kv[k]);
  await db.putMany('workouts', data.workouts);
  if (Array.isArray(data.activities)) await db.putMany('activities', data.activities);
}

export { STORES };
