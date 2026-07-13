import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Receipt, AlertTriangle, Clock, CheckCircle } from 'lucide-react-native';
import * as Print from 'expo-print';
import { colors } from '@/constants/colors';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { InvoicesService } from '@/services/invoices.service';
import { API_BASE } from '@/constants/config';
import { formatDate, formatCurrency } from '@/utils/formatters';
import { useTranslation } from '@/hooks/useTranslation';
import type { Invoice } from '@/types/models';

function getStatusVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'success';
    case 'pending':
    case 'partially_paid':
      return 'warning';
    case 'overdue':
      return 'error';
    default:
      return 'default';
  }
}

function getStatusLabel(status: string, t: (key: string) => string): string {
  switch (status.toLowerCase()) {
    case 'paid':
      return t('invoices.paid');
    case 'pending':
      return t('invoices.issued');
    case 'overdue':
      return t('invoices.overdue');
    case 'partially_paid':
      return t('invoices.partiallyPaid');
    default:
      return status;
  }
}

export default function InvoicesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: invoices,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data } = await InvoicesService.list();
      return (data as unknown as Invoice[]) ?? [];
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const summary = useMemo(() => {
    const list = invoices ?? [];
    const unpaid = list.filter(
      (inv) => inv.status.toLowerCase() !== 'paid',
    );
    const overdue = list.filter(
      (inv) => inv.status.toLowerCase() === 'overdue',
    );
    const totalUnpaid = unpaid.reduce((sum, inv) => sum + inv.amount, 0);
    return {
      unpaidCount: unpaid.length,
      overdueCount: overdue.length,
      totalUnpaid,
    };
  }, [invoices]);

  const handleViewPdf = useCallback(
    (invoice: Invoice) => {
      const url = `${API_BASE}${InvoicesService.getPdfUrl(invoice.id)}`;
      Alert.alert(
        `${t('invoices.title')} ${invoice.invoice_number}`,
        formatCurrency(invoice.amount, invoice.currency),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('invoices.downloadPdf'),
            onPress: async () => {
              try {
                await Print.printAsync({ uri: url });
              } catch {
                Alert.alert(t('common.error'), 'Unable to open PDF.');
              }
            },
          },
        ],
      );
    },
    [t],
  );

  const renderSkeleton = () => (
    <View style={styles.listContent}>
      <Skeleton width="100%" height={80} borderRadius={12} />
      <Skeleton width="100%" height={80} borderRadius={12} style={{ marginTop: 12 }} />
      <Skeleton width="100%" height={80} borderRadius={12} style={{ marginTop: 12 }} />
    </View>
  );

  if (error) {
    return (
      <View style={styles.container}>
        <Header
          title={t('invoices.title')}
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
        title={t('invoices.title')}
        showBack
        onBack={() => router.back()}
      />

      {isLoading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={invoices ?? []}
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
          ListHeaderComponent={
            (invoices ?? []).length > 0 ? (
              <Card style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Receipt size={20} color={colors.gold[500]} />
                    <View>
                      <Text style={styles.summaryLabel}>Unpaid</Text>
                      <Text style={styles.summaryValue}>
                        {formatCurrency(summary.totalUnpaid)}
                      </Text>
                    </View>
                  </View>
                  {summary.overdueCount > 0 && (
                    <View style={styles.summaryItem}>
                      <AlertTriangle size={20} color={colors.status.error} />
                      <View>
                        <Text style={styles.summaryLabel}>Overdue</Text>
                        <Text style={[styles.summaryValue, { color: colors.status.error }]}>
                          {summary.overdueCount}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </Card>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Receipt size={32} color={colors.text.muted} />}
              title={t('invoices.noInvoices')}
              message={t('invoices.noInvoices')}
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.card} onPress={() => handleViewPdf(item)}>
              <View style={styles.cardHeader}>
                <Text style={styles.invoiceNumber}>{item.invoice_number}</Text>
                <Badge
                  label={getStatusLabel(item.status, t)}
                  variant={getStatusVariant(item.status)}
                  size="sm"
                />
              </View>

              <View style={styles.cardBody}>
                <View style={styles.amountRow}>
                  <Text style={styles.amount}>
                    {formatCurrency(item.amount, item.currency)}
                  </Text>
                </View>

                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Clock size={14} color={colors.text.muted} />
                    <Text style={styles.detailText}>
                      {t('invoices.dueDate')}: {formatDate(item.due_at)}
                    </Text>
                  </View>
                  {item.paid_at && (
                    <View style={styles.detailItem}>
                      <CheckCircle size={14} color={colors.status.success} />
                      <Text style={[styles.detailText, { color: colors.status.success }]}>
                        {formatDate(item.paid_at)}
                      </Text>
                    </View>
                  )}
                </View>
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
  summaryCard: {
    paddingVertical: 16,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 24,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.text.muted,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  card: {
    paddingVertical: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  invoiceNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  cardBody: {
    gap: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gold[500],
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: colors.text.muted,
  },
});
