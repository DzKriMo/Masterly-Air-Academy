import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useSyncStore } from '@/store/sync-store';

export function useOffline() {
  const [isOffline, setIsOffline] = useState(false);
  const { isSyncing, lastSyncTime, processQueue } = useSyncStore();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const offline = !(state.isConnected && state.isInternetReachable);
      setIsOffline(offline);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isOffline) {
      processQueue();
    }
  }, [isOffline, processQueue]);

  return { isOffline, isSyncing, lastSyncTime };
}
