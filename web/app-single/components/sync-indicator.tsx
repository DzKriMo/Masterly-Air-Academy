"use client";

import { useEffect, useState, useCallback } from "react";
import { offlineQueue, syncPendingEntries } from "@/lib/offline-queue";
import { api } from "@/lib/api";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshCount = useCallback(async () => {
    try { setPendingCount(await offlineQueue.count()); } catch {}
  }, []);

  const sync = useCallback(async () => {
    if (!isOnline) return;
    try {
      const synced = await syncPendingEntries((data) => api.post('/flight-log-entries/', data));
      await refreshCount();
      return synced;
    } catch {}
    return 0;
  }, [isOnline, refreshCount]);

  useEffect(() => {
    const goOnline = () => { setIsOnline(true); sync(); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    refreshCount();
    // Sync on mount if online
    if (navigator.onLine) sync();
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [sync, refreshCount]);

  return { isOnline, pendingCount, sync, refreshCount };
}

export function SyncIndicator({ isOnline, pendingCount, onSync }: { isOnline: boolean; pendingCount: number; onSync?: () => void }) {
  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 transition-all ${
      !isOnline ? 'bg-red-500 text-white' : 'bg-amber-500 text-navy-900'
    }`}>
      {!isOnline ? (
        <>Offline</>
      ) : (
        <>
          <span>{pendingCount} pending sync</span>
          <button onClick={onSync} className="underline hover:no-underline">Sync now</button>
        </>
      )}
    </div>
  );
}
