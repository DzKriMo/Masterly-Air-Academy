import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors } from '@/constants/colors';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { MessagesService } from '@/services/messages.service';
import { timeAgo } from '@/utils/formatters';
import type { Message } from '@/types/models';

export default function MessageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: message, isLoading, error } = useQuery({
    queryKey: ['message', id],
    queryFn: async () => {
      const { data } = await MessagesService.get(id!);
      return data as unknown as Message;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Header title="Message" showBack onBack={() => router.back()} />
        <View style={styles.content}>
          <Card style={styles.card}>
            <Skeleton width="40%" height={14} borderRadius={4} />
            <Skeleton width="80%" height={18} borderRadius={4} style={{ marginTop: 12 }} />
            <Skeleton width="30%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
            <Skeleton width="100%" height={80} borderRadius={4} style={{ marginTop: 16 }} />
          </Card>
        </View>
      </View>
    );
  }

  if (error || !message) {
    return (
      <View style={styles.container}>
        <Header title="Message" showBack onBack={() => router.back()} />
        <View style={styles.content}>
          <ErrorState
            message="This message may have been deleted."
            onRetry={() => router.back()}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Message" showBack onBack={() => router.back()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>From</Text>
            <Text style={styles.value}>{message.sender_name ?? 'Unknown'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.field}>
            <Text style={styles.label}>Subject</Text>
            <Text style={[styles.value, styles.subject]}>{message.subject}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{timeAgo(message.created_at)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.field}>
            <Text style={styles.label}>Message</Text>
            <Text style={styles.body}>{message.body}</Text>
          </View>
        </Card>
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
  card: {
    padding: 20,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 15,
    color: colors.text.primary,
  },
  subject: {
    fontWeight: '700',
    fontSize: 17,
  },
  divider: {
    height: 1,
    backgroundColor: colors.navy[700],
    marginVertical: 14,
  },
  body: {
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 22,
  },
});
