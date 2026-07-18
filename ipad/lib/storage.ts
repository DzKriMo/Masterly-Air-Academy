import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { User } from '@/types/api';

const STORAGE_KEYS = {
  USER: '@masterly:user',
  LOCALE: '@masterly:locale',
};

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

export async function storeUser(user: User): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export async function getUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export async function removeUser(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.USER);
}

export async function storeLocale(locale: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.LOCALE, locale);
}

export async function getLocale(): Promise<string> {
  const locale = await AsyncStorage.getItem(STORAGE_KEYS.LOCALE);
  return locale ?? 'en';
}

export async function clearAll(): Promise<void> {
  await clearTokens();
  await AsyncStorage.clear();
}
