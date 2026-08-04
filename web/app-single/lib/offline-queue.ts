// ============================================================
// MASTERLY AIR ACADEMY | Offline Queue (IndexedDB)
// Queues log entries when offline, syncs when online.
// ============================================================

const DB_NAME = 'maa-offline';
const DB_VERSION = 1;
const STORE = 'pending-entries';

interface PendingEntry {
  id?: number;
  data: {
    date: string;
    flight_duration: number;
    exercises: string[];
    notes?: string;
    aircraft_text?: string;
    aircraft?: string;
  };
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const offlineQueue = {
  /** Add an entry to the offline queue. */
  async push(entry: PendingEntry['data']): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).add({ data: entry, createdAt: Date.now() });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  },

  /** Get all pending entries. */
  async getAll(): Promise<PendingEntry[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => { db.close(); resolve(req.result || []); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  },

  /** Count pending entries. */
  async count(): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).count();
      req.onsuccess = () => { db.close(); resolve(req.result); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  },

  /** Remove an entry by ID. */
  async remove(id: number): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  },

  /** Remove entries by IDs in a single transaction. */
  async removeIds(ids: number[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      ids.forEach(id => store.delete(id));
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  },

  /** Remove all entries. */
  async clear(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  },
};

let syncLock = false;

/** Try to sync all pending entries to the API. Returns count of synced. */
export async function syncPendingEntries(apiPost: (data: any) => Promise<any>): Promise<number> {
  if (syncLock) return 0;
  syncLock = true;
  try {
    const entries = await offlineQueue.getAll();
    if (entries.length === 0) return 0;

    let synced = 0;
    const toRemove: number[] = [];
    for (const entry of entries) {
      try {
        await apiPost(entry.data);
        toRemove.push(entry.id!);
        synced++;
      } catch {
        continue; // skip bad entries, continue with rest
      }
    }
    if (toRemove.length > 0) {
      await offlineQueue.removeIds(toRemove);
    }
    return synced;
  } finally {
    syncLock = false;
  }
}
