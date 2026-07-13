import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Globe, Fingerprint, Bell, Info, LogOut, ChevronRight } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import {
  isBiometricAvailable,
  getStoredBiometric,
  setStoredBiometric,
} from '@/lib/auth';
import { APP_VERSION } from '@/constants/config';

type Language = 'en' | 'fr' | 'ar';

const LANGUAGES: { key: Language; label: string }[] = [
  { key: 'en', label: 'EN' },
  { key: 'fr', label: 'FR' },
  { key: 'ar', label: 'AR' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { t, locale, switchTo } = useTranslation();
  const { logout } = useAuth();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    isBiometricAvailable().then((available) => {
      setBiometricAvailable(available);
      if (available) {
        getStoredBiometric().then(setBiometricEnabled);
      }
    });
  }, []);

  const handleLanguageChange = useCallback(
    (lang: Language) => {
      switchTo(lang);
    },
    [switchTo],
  );

  const handleBiometricToggle = useCallback(async (value: boolean) => {
    try {
      await setStoredBiometric(value);
      setBiometricEnabled(value);
    } catch {
      Alert.alert('Error', 'Failed to update biometric setting.');
    }
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      t('settings.logout'),
      'Are you sure you want to sign out?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logout'),
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ],
    );
  }, [logout, t]);

  return (
    <View style={styles.container}>
      <Header
        title={t('settings.title')}
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Globe size={18} color={colors.gold[500]} />
            <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          </View>
          <View style={styles.segmentedControl}>
            {LANGUAGES.map((lang) => {
              const isActive = locale === lang.key;
              return (
                <Pressable
                  key={lang.key}
                  onPress={() => handleLanguageChange(lang.key)}
                  style={[
                    styles.segment,
                    isActive && styles.segmentActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      isActive && styles.segmentTextActive,
                    ]}
                  >
                    {lang.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {biometricAvailable && (
          <Card style={styles.section}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Fingerprint size={20} color={colors.gold[500]} />
                <View>
                  <Text style={styles.settingLabel}>{t('settings.biometric')}</Text>
                  <Text style={styles.settingDescription}>
                    {biometricEnabled
                      ? t('settings.enableBiometric')
                      : t('settings.disableBiometric')}
                  </Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: colors.navy[700], true: colors.gold[600] }}
                thumbColor={biometricEnabled ? colors.navy[900] : colors.text.muted}
              />
            </View>
          </Card>
        )}

        <Card style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Bell size={20} color={colors.gold[500]} />
              <View>
                <Text style={styles.settingLabel}>{t('settings.notifications')}</Text>
                <Text style={styles.settingDescription}>
                  {notificationsEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.navy[700], true: colors.gold[600] }}
              thumbColor={notificationsEnabled ? colors.navy[900] : colors.text.muted}
            />
          </View>
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info size={18} color={colors.gold[500]} />
            <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>{t('settings.version')}</Text>
            <Text style={styles.aboutValue}>{APP_VERSION}</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>App</Text>
            <Text style={styles.aboutValue}>Masterly Air Academy</Text>
          </View>
        </Card>

        <Button
          title={t('settings.logout')}
          onPress={handleSignOut}
          variant="danger"
          size="lg"
          icon={<LogOut size={18} color="#ffffff" />}
          style={styles.logoutButton}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy[900],
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  section: {
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.navy[900],
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: colors.gold[500],
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.muted,
  },
  segmentTextActive: {
    color: colors.navy[900],
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  settingDescription: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  aboutLabel: {
    fontSize: 14,
    color: colors.text.muted,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  logoutButton: {
    marginTop: 8,
  },
});
