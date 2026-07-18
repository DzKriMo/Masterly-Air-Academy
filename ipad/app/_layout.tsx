import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { queryClient } from '@/lib/query-client';
import { useUIStore } from '@/store/ui-store';
import '@/lib/i18n';

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();
  const initLocale = useUIStore((s) => s.initLocale);

  useEffect(() => {
    initLocale();
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="(app)" />
      ) : (
        <Stack.Screen name="login" />
      )}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate />
    </QueryClientProvider>
  );
}
