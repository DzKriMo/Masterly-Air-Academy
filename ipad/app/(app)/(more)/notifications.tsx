import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Plane,
  FileText,
  Receipt,
  Award,
  MessageSquare,
  Bell,
} from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useNotifications } from '@/hooks/useNotifications';
import { useTranslation } from '@/hooks/useTranslation';
import { timeAgo } from '@/utils/formatters';
import type { Notification } from '@/types/models';

interface NotificationTypeConfig {
  icon: React.ReactNode;
  color: string;
}

function getNotificationConfig(type: string): NotificationTypeConfig {
  switch (type.toLowerCase()) {
    case 'flight':
      return {
        icon: <Plane size={18} color={colors.status.info} />,
        color: colors.status.info,
      };
    case 'exam':
      return {
        icon: <FileText size={18} color={colors.gold[500]} />,
        color: colors.gold[500],
      };
    case 'invoice':
      return {
        icon: <Receipt size={18} color={colors.status.error} />,
        color: colors.status.error,
      };
    case 'certificate':
      return {
        icon: <Award size={18} color={colors.status.success} />,
        color: colors.status.success,
      };
    case 'message':
      return {
        icon: <MessageSquare size={18} color={colors.status.info} />,
        color: colors.status.info,
      };
    default:
      return {
        icon: <Bell size={18} color={colors.text.muted} />,
        color: colors.text.muted,
      };
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const {
    notifications,
    isLoading,
    markAsRead,
    markAllRead,
  } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const renderSkeleton = () => (
    <View style={styles.listContent}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <View style={styles.skeletonRow}>
            <Skeleton width={36} height={36} borderRadius={18} />
            <View style={styles.skeletonText}>
              <Skeleton width="80%" height={14} borderRadius={4} />
              <Skeleton width="60%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
              <Skeleton width="30%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <Header
        title={t('notifications.title')}
        showBack
        onBack={() => router.back()}
        rightAction={
          notifications.some((n) => !n.is_read) ? (
            <Pressable onPress={() => markAllRead()} style={styles.markAllButton}>
              <Text style={styles.markAllText}>{t('notifications.markAllRead')}</Text>
            </Pressable>
          ) : undefined
        }
      />

      {isLoading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.gold[500]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Bell size={32} color={colors.text.muted} />}
              title={t('notifications.noNotifications')}
              message={t('notifications.noNotifications')}
            />
          }
          renderItem={({ item }) => {
            const config = getNotificationConfig(item.type);

            return (
              <Card
                style={[styles.notificationCard, !item.is_read ? styles.unreadCard : undefined] as any}
                onPress={() => {
                  if (!item.is_read) {
                    markAsRead(item.id);
                  }
                }}
              >
                <View style={styles.notificationRow}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: `${config.color}20` },
                    ]}
                  >
                    {config.icon}
                  </View>
                  <View style={styles.content}>
                    <View style={styles.headerRow}>
                      <Text
                        style={[
                          styles.title,
                          !item.is_read && styles.unreadTitle,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {!item.is_read && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.message} numberOfLines={2}>
                      {item.message}
                    </Text>
                    <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
                  </View>
                </View>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy[900],
  },
  listContent: {
    padding: 20,
    gap: 8,
  },
  skeletonCard: {
    backgroundColor: colors.navy[800],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.navy[700],
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonText: {
    flex: 1,
  },
  markAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gold[500],
  },
  notificationCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  unreadCard: {
    backgroundColor: `${colors.gold[500]}08`,
  },
  notificationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    flex: 1,
  },
  unreadTitle: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold[500],
  },
  message: {
    fontSize: 13,
    color: colors.text.muted,
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
});
