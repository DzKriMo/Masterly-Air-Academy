import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Award, Download, Share2 } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors } from '@/constants/colors';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { CertificatesService } from '@/services/certificates.service';
import { API_BASE } from '@/constants/config';
import { formatDate } from '@/utils/formatters';
import { useTranslation } from '@/hooks/useTranslation';
import type { Certificate } from '@/types/models';

function getStatusVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (status.toLowerCase()) {
    case 'active':
    case 'valid':
      return 'success';
    case 'expired':
      return 'error';
    case 'revoked':
      return 'error';
    case 'pending':
      return 'warning';
    default:
      return 'default';
  }
}

export default function CertificatesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: certificates,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['certificates'],
    queryFn: async () => {
      const { data } = await CertificatesService.list();
      return (data as unknown as Certificate[]) ?? [];
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleViewPdf = useCallback((cert: Certificate) => {
    const url = `${API_BASE}${CertificatesService.getPdfUrl(cert.id)}`;
    Alert.alert(
      t('certificates.title'),
      `${t('certificates.number')}: ${cert.certificate_number}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('certificates.downloadPdf'),
          onPress: async () => {
            try {
              await Print.printAsync({ uri: url });
            } catch {
              Alert.alert(t('common.error'), 'Unable to open PDF.');
            }
          },
        },
        {
          text: t('certificates.share'),
          onPress: async () => {
            try {
              const isAvailable = await Sharing.isAvailableAsync();
              if (isAvailable) {
                await Sharing.shareAsync(url);
              }
            } catch {
              Alert.alert(t('common.error'), 'Unable to share.');
            }
          },
        },
      ],
    );
  }, [t]);

  const renderSkeleton = () => (
    <View style={styles.listContent}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={styles.skeletonCard}>
          <Skeleton width="60%" height={20} borderRadius={4} />
          <Skeleton width="40%" height={16} borderRadius={4} style={{ marginTop: 10 }} />
          <Skeleton width="80%" height={16} borderRadius={4} style={{ marginTop: 8 }} />
          <Skeleton width="30%" height={16} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );

  if (error) {
    return (
      <View style={styles.container}>
        <Header
          title={t('certificates.title')}
          showBack
          onBack={() => router.back()}
        />
        <ErrorState onRetry={() => refetch()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title={t('certificates.title')}
        showBack
        onBack={() => router.back()}
      />

      {isLoading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={certificates ?? []}
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
              icon={<Award size={32} color={colors.text.muted} />}
              title={t('certificates.noCertificates')}
              message={t('certificates.noCertificates')}
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.card} onPress={() => handleViewPdf(item)}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Award size={18} color={colors.gold[500]} />
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.program}
                  </Text>
                </View>
                <Badge
                  label={item.status}
                  variant={getStatusVariant(item.status)}
                  size="sm"
                />
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('certificates.number')}</Text>
                  <Text style={styles.infoValue}>{item.certificate_number}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('certificates.issued')}</Text>
                  <Text style={styles.infoValue}>{formatDate(item.issue_date)}</Text>
                </View>
                {item.expiry_date && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('certificates.validUntil')}</Text>
                    <Text style={styles.infoValue}>{formatDate(item.expiry_date)}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardActions}>
                <Pressable style={styles.actionButton} onPress={() => handleViewPdf(item)}>
                  <Download size={14} color={colors.gold[500]} />
                  <Text style={styles.actionText}>{t('certificates.downloadPdf')}</Text>
                </Pressable>
              </View>
            </Card>
          )}
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
    gap: 12,
  },
  skeletonCard: {
    backgroundColor: colors.navy[800],
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.navy[700],
  },
  card: {
    paddingVertical: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: colors.text.muted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.navy[700],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gold[500],
  },
});
