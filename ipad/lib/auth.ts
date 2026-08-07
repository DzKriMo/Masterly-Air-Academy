import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return isEnrolled;
}

export async function authenticateWithBiometrics(
  prompt: string = 'Authenticate to continue',
): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: prompt,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  return result.success;
}

export function isStudentRole(role: string): boolean {
  const studentRoles = ['student', 'candidate', 'graduate'];
  return studentRoles.includes(role.toLowerCase());
}

const BIOMETRIC_KEY = 'biometric_enabled';
const BIOMETRIC_EMAIL_KEY = 'biometric_email';
const BIOMETRIC_PASSWORD_KEY = 'biometric_password';

export async function getStoredBiometric(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(BIOMETRIC_KEY);
  return value === 'true';
}

export async function setStoredBiometric(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_KEY, String(enabled));
}

export async function storeBiometricCredentials(
  email: string,
  password: string,
): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email);
  await SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, password);
}

export async function getBiometricCredentials(): Promise<{
  email: string;
  password: string;
} | null> {
  const email = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
  const password = await SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY);
  if (!email || !password) return null;
  return { email, password };
}

export async function clearBiometricCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_PASSWORD_KEY);
}
