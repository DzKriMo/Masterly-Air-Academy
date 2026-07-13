import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Calendar,
  Award,
  Receipt,
  MessageSquare,
  Bell,
  UserCircle,
  Settings,
} from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { Card } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { useNotifications } from '@/hooks/useNotifications';
import { useTranslation } from '@/hooks/useTranslation';

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  route: string;
  getBadge?: () => number;
}

export default function MoreIndexScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { unreadCount } = useNotifications();

  const menuItems: MenuItem[] = [
    {
      key: 'schedule',
      label: t('schedule.title'),
      icon: <Calendar size={28} color={colors.gold[500]} />,
      route: '/(app)/(more)/schedule',
    },
    {
      key: 'certificates',
      label: t('certificates.title'),
      icon: <Award size={28} color={colors.gold[500]} />,
      route: '/(app)/(more)/certificates',
    },
    {
      key: 'invoices',
      label: t('invoices.title'),
      icon: <Receipt size={28} color={colors.gold[500]} />,
      route: '/(app)/(more)/invoices',
    },
    {
      key: 'messages',
      label: t('messages.title'),
      icon: <MessageSquare size={28} color={colors.gold[500]} />,
      route: '/(app)/(more)/messages',
    },
    {
      key: 'notifications',
      label: t('notifications.title'),
      icon: <Bell size={28} color={colors.gold[500]} />,
      route: '/(app)/(more)/notifications',
      getBadge: () => unreadCount,
    },
    {
      key: 'profile',
      label: t('profiles.title'),
      icon: <UserCircle size={28} color={colors.gold[500]} />,
      route: '/(app)/(more)/profile',
    },
    {
      key: 'settings',
      label: t('settings.title'),
      icon: <Settings size={28} color={colors.gold[500]} />,
      route: '/(app)/(more)/settings',
    },
  ];

  return (
    <View style={styles.container}>
      <Header title={t('tabs.more')} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {menuItems.map((item) => {
            const badge = item.getBadge?.() ?? 0;
            return (
              <Card key={item.key} style={styles.card} onPress={() => router.push(item.route as any)}>
                <View style={styles.cardInner}>
                  <View style={styles.iconContainer}>
                    {item.icon}
                  </View>
                  <Text style={styles.label}>{item.label}</Text>
                  {badge > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {badge > 99 ? '99+' : badge}
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            );
          })}
        </View>
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
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    maxWidth: '48%',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  cardInner: {
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.navy[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.status.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
});
