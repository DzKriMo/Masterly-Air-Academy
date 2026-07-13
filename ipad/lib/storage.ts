import { MMKV } from 'react-native-mmkv';
import * as SecureStore from 'expo-secure-store';
import type { User } from '@/types/api';

export const mmkv = new MMKV({
  id: 'masterly-air-academy',
});

// --- SecureStore token helpers ---

export async function storeTokens(access: string, refresh: string): Promise<void> {
  await SecureStore.setItemAsync('access_token', access);
  await SecureStore.setItemAsync('refresh_token', refresh);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync('access_token');
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync('refresh_token');
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
}

// --- MMKV user helpers ---

export function storeUser(user: User): void {
  mmkv.set('user', JSON.stringify(user));
}

export function getUser(): User | null {
  const raw = mmkv.getString('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function removeUser(): void {
  mmkv.delete('user');
}

// --- MMKV locale helpers ---

export function storeLocale(locale: string): void {
  mmkv.set('locale', locale);
}

export function getLocale(): string {
  return mmkv.getString('locale') ?? 'en';
}

// --- Clear everything ---

export async function clearAll(): Promise<void> {
  await clearTokens();
  mmkv.clearAll();
}
