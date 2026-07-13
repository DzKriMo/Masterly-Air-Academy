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
  addToQueue: (action: Omit<SyncAction, 'id' | 'timestamp' | 'retryCount'>) => void;
  processQueue: () => Promise<void>;
  clearQueue: () => void;
  setLastSyncTime: (time: number) => void;
  hydrate: () => void;
}

type SyncStore = SyncState & SyncActions;

export const useSyncStore = create<SyncStore>((set, get) => ({
  queue: [],
  isSyncing: false,
  lastSyncTime: null,

  addToQueue: (action) => {
    libAddToSyncQueue(action);
    set({ queue: getSyncQueue() });
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
      set({ queue: getSyncQueue(), isSyncing: false });
    }
  },

  clearQueue: () => {
    libClearSyncQueue();
    set({ queue: [] });
  },

  setLastSyncTime: (time) => set({ lastSyncTime: time }),

  hydrate: () => {
    set({ queue: getSyncQueue() });
  },
}));
