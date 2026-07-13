import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { MessageSquare, Plus, Send } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { MessagesService } from '@/services/messages.service';
import { timeAgo } from '@/utils/formatters';
import { useTranslation } from '@/hooks/useTranslation';
import type { Message } from '@/types/models';

type Tab = 'inbox' | 'sent';

export default function MessagesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('inbox');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: inboxData,
    isLoading: inboxLoading,
    refetch: refetchInbox,
  } = useQuery({
    queryKey: ['messages', 'inbox'],
    queryFn: async () => {
      const { data } = await MessagesService.list();
      return (data as unknown as Message[]) ?? [];
    },
  });

  const {
    data: sentData,
    isLoading: sentLoading,
    refetch: refetchSent,
  } = useQuery({
    queryKey: ['messages', 'sent'],
    queryFn: async () => {
      const { data } = await MessagesService.getSent();
      return (data as unknown as Message[]) ?? [];
    },
  });

  const messages = activeTab === 'inbox' ? (inboxData ?? []) : (sentData ?? []);
  const isLoading = activeTab === 'inbox' ? inboxLoading : sentLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchInbox(), refetchSent()]);
    setRefreshing(false);
  }, [refetchInbox, refetchSent]);

  const renderSkeleton = () => (
    <View style={styles.listContent}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <Skeleton width="30%" height={14} borderRadius={4} />
          <Skeleton width="70%" height={18} borderRadius={4} style={{ marginTop: 8 }} />
          <Skeleton width="50%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <Header
        title={t('messages.title')}
        showBack
        onBack={() => router.back()}
      />

      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab('inbox')}
          style={[styles.tab, activeTab === 'inbox' && styles.tabActive]}
        >
          <MessageSquare
            size={16}
            color={activeTab === 'inbox' ? colors.gold[500] : colors.text.muted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'inbox' && styles.tabTextActive,
            ]}
          >
            {t('messages.inbox')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('sent')}
          style={[styles.tab, activeTab === 'sent' && styles.tabActive]}
        >
          <Send
            size={16}
            color={activeTab === 'sent' ? colors.gold[500] : colors.text.muted}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'sent' && styles.tabTextActive,
            ]}
          >
            {t('messages.sent')}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={messages}
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
              icon={<MessageSquare size={32} color={colors.text.muted} />}
              title={t('messages.noMessages')}
              message={
                activeTab === 'inbox'
                  ? t('messages.noMessages')
                  : t('messages.noMessages')
              }
            />
          }
          renderItem={({ item }) => (
            <Card
              style={[styles.messageCard, !item.is_read && activeTab === 'inbox' ? styles.unreadCard : undefined] as any}
              onPress={() => router.push({ pathname: '/(app)/(more)/message-detail', params: { id: item.id } })}
            >
              <View style={styles.messageHeader}>
                <View style={styles.senderInfo}>
                  {activeTab === 'inbox' && !item.is_read && (
                    <View style={styles.unreadDot} />
                  )}
                  <Text
                    style={[
                      styles.senderName,
                      !item.is_read && activeTab === 'inbox' && styles.unreadName,
                    ]}
                    numberOfLines={1}
                  >
                    {activeTab === 'inbox'
                      ? item.sender_name ?? 'Unknown'
                      : item.receiver_name ?? 'Unknown'}
                  </Text>
                </View>
                <Text style={styles.timeAgo}>{timeAgo(item.created_at)}</Text>
              </View>
              <Text
                style={[
                  styles.subject,
                  !item.is_read && activeTab === 'inbox' && styles.unreadSubject,
                ]}
                numberOfLines={1}
              >
                {item.subject}
              </Text>
              <Text style={styles.preview} numberOfLines={1}>
                {item.body}
              </Text>
            </Card>
          )}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => router.push('/(app)/(more)/messages-compose')}
      >
        <Plus size={24} color={colors.navy[900]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy[900],
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: colors.navy[700],
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.muted,
  },
  tabTextActive: {
    color: colors.gold[500],
  },
  listContent: {
    padding: 20,
    gap: 10,
  },
  skeletonCard: {
    backgroundColor: colors.navy[800],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.navy[700],
  },
  messageCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.gold[500],
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold[500],
  },
  senderName: {
    fontSize: 14,
    color: colors.text.muted,
  },
  unreadName: {
    fontWeight: '700',
    color: colors.text.primary,
  },
  timeAgo: {
    fontSize: 12,
    color: colors.text.muted,
  },
  subject: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 2,
  },
  unreadSubject: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  preview: {
    fontSize: 13,
    color: colors.text.muted,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gold[500],
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.gold[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
