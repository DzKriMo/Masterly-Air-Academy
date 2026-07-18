import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { storeTokens } from '@/lib/storage';
import { isStudentRole } from '@/lib/auth';
import api from '@/lib/api';
import type { LoginResponse } from '@/types/api';

export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, logout: storeLogout, hydrate } =
    useAuthStore();

  useEffect(() => {
    hydrate();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      useAuthStore.getState().setLoading(true);
      try {
        const { data } = await api.post<LoginResponse>('/login/', {
          email,
          password,
        });

        const loginData = data as unknown as LoginResponse;

        if (!isStudentRole(loginData.user.role)) {
          throw new Error('Only students can access the iPad application.');
        }

        await storeTokens(loginData.access, loginData.refresh);
        setUser(loginData.user);

        return loginData.user;
      } catch (error) {
        useAuthStore.getState().setLoading(false);
        throw error;
      }
    },
    [setUser],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/logout/').catch(() => {});
    } finally {
      await storeLogout();
    }
  }, [storeLogout]);

  return { user, isAuthenticated, isLoading, login, logout };
}
