import { create } from 'zustand';
import type { SyncAction } from '@/lib/sync';
import {
  getSyncQueue,
  addToSyncQueue as libAddToSyncQueue,
  processSyncQueue as libProcessSyncQueue,
  clearSyncQueue as libClearSyncQueue,
} from '@/lib/sync';

interface SyncState {
  queue: SyncAction[];
  isSyncing: boolean;
  lastSyncTime: number | null;
}

interface SyncActions {
  addToQueue: (action: Omit<SyncAction, 'id' | 'timestamp' | 'retryCount'>) => Promise<void>;
  processQueue: () => Promise<void>;
  clearQueue: () => Promise<void>;
  setLastSyncTime: (time: number) => void;
  hydrate: () => Promise<void>;
}

type SyncStore = SyncState & SyncActions;

export const useSyncStore = create<SyncStore>((set, get) => ({
  queue: [],
  isSyncing: false,
  lastSyncTime: null,

  addToQueue: async (action) => {
    await libAddToSyncQueue(action);
    set({ queue: await getSyncQueue() });
  },

  processQueue: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });
    try {
      const { processed, failed } = await libProcessSyncQueue();
      if (processed > 0 || failed > 0) {
        set({ lastSyncTime: Date.now() });
      }
    } finally {
      set({ queue: await getSyncQueue(), isSyncing: false });
    }
  },

  clearQueue: async () => {
    await libClearSyncQueue();
    set({ queue: [] });
  },

  setLastSyncTime: (time) => set({ lastSyncTime: time }),

  hydrate: async () => {
    set({ queue: await getSyncQueue() });
  },
}));
