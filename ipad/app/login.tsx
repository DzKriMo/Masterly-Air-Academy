import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Plane, Mail, Lock, Fingerprint } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { colors } from '@/constants/colors';
import { loginSchema } from '@/utils/validators';
import { isBiometricAvailable, authenticateWithBiometrics } from '@/lib/auth';
import { Input, Button } from '@/components/ui';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  React.useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  const handleLogin = useCallback(async () => {
    setErrors({});
    setServerError('');

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        t('auth.invalidCredentials');
      setServerError(message);
    } finally {
      setLoading(false);
    }
  }, [email, password, login, t]);

  const handleBiometric = useCallback(async () => {
    try {
      const success = await authenticateWithBiometrics(t('auth.biometricPrompt'));
      if (!success) return;

      setLoading(true);
      // Biometric login reuses stored credentials or token
      // The auth store hydration handles navigation
    } catch {
      setServerError(t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoSection}>
          <View style={styles.logoIcon}>
            <Plane size={40} color={colors.gold[500]} />
          </View>
          <Text style={styles.appName}>{t('app.name')}</Text>
          <Text style={styles.tagline}>{t('app.tagline')}</Text>
        </View>

        <View style={styles.formSection}>
          {serverError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{serverError}</Text>
            </View>
          ) : null}

          <Input
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            placeholder="student@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
            icon={<Mail size={18} color={colors.text.muted} />}
          />

          <Input
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            error={errors.password}
            icon={<Lock size={18} color={colors.text.muted} />}
          />

          <Button
            title={loading ? t('auth.signingIn') : t('auth.login')}
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            size="lg"
            style={styles.loginButton}
          />

          {biometricAvailable && (
            <Button
              title={t('auth.biometric')}
              onPress={handleBiometric}
              variant="ghost"
              size="md"
              icon={<Fingerprint size={20} color={colors.gold[400]} />}
              style={styles.biometricButton}
            />
          )}

          <Text style={styles.studentOnly}>{t('auth.studentOnly')}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy[900],
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.navy[800],
    borderWidth: 1,
    borderColor: colors.navy[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  formSection: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  errorBannerText: {
    color: colors.status.error,
    fontSize: 14,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: 8,
  },
  biometricButton: {
    marginTop: 4,
  },
  studentOnly: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: 12,
  },
});
