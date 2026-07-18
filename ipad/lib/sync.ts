import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/lib/api';

export interface SyncAction {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

const SYNC_QUEUE_KEY = '@masterly:sync_queue';
const MAX_RETRIES = 3;

export async function getSyncQueue(): Promise<SyncAction[]> {
  const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SyncAction[];
  } catch {
    return [];
  }
}

async function persistQueue(queue: SyncAction[]): Promise<void> {
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

export async function addToSyncQueue(action: Omit<SyncAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
  const queue = await getSyncQueue();
  const entry: SyncAction = {
    ...action,
    id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
    retryCount: 0,
  };
  queue.push(entry);
  await persistQueue(queue);
}

export async function processSyncQueue(): Promise<{ processed: number; failed: number }> {
  const queue = await getSyncQueue();
  let processed = 0;
  let failed = 0;
  const remaining: SyncAction[] = [];

  for (const action of queue) {
    try {
      await api.request({
        url: action.endpoint,
        method: action.method,
        data: action.data,
      });
      processed++;
    } catch {
      if (action.retryCount + 1 >= MAX_RETRIES) {
        failed++;
      } else {
        remaining.push({ ...action, retryCount: action.retryCount + 1 });
      }
    }
  }

  await persistQueue(remaining);
  return { processed, failed };
}

export async function clearSyncQueue(): Promise<void> {
  await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
}
