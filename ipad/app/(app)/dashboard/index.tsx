import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  Plane,
  BookOpen,
  GraduationCap,
  Target,
  AlertTriangle,
  Clock,
  FileText,
} from 'lucide-react-native';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/constants/colors';
import { DashboardService } from '@/services';
import type { StudentDashboard } from '@/types/models';
import { Card, Badge, Skeleton, ErrorState } from '@/components/ui';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const {
    data: dashboard,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<StudentDashboard>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await DashboardService.get();
      return res.data as StudentDashboard;
    },
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !dashboard) {
    return (
      <View style={styles.container}>
        <ErrorState onRetry={handleRefresh} />
      </View>
    );
  }

  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={handleRefresh}
          tintColor={colors.gold[500]}
          colors={[colors.gold[500]]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <Card style={styles.welcomeCard}>
        <Text style={styles.welcomeText}>
          {t('dashboard.welcome', { name: firstName })}
        </Text>
      </Card>

      <View style={styles.statsGrid}>
        <StatCard
          icon={<Plane size={20} color={colors.gold[500]} />}
          label={t('dashboard.flightHours')}
          value={`${dashboard.total_flight_hours}`}
          unit="h"
        />
        <StatCard
          icon={<BookOpen size={20} color={colors.status.info} />}
          label={t('dashboard.coursesEnrolled')}
          value={`${dashboard.total_lessons_completed}`}
        />
        <StatCard
          icon={<GraduationCap size={20} color={colors.status.success} />}
          label={t('dashboard.theoryProgress')}
          value={`${dashboard.theory_progress}%`}
        />
        <StatCard
          icon={<Target size={20} color={colors.status.warning} />}
          label={t('dashboard.flightProgress')}
          value={`${dashboard.flight_progress}%`}
        />
      </View>

      {dashboard.unpaid_invoices_count > 0 && (
        <Card style={styles.alertCard}>
          <View style={styles.alertRow}>
            <AlertTriangle size={18} color={colors.status.warning} />
            <Text style={styles.alertText}>
              {t('dashboard.overdueInvoice')} ({dashboard.unpaid_invoices_count})
            </Text>
          </View>
        </Card>
      )}

      {dashboard.expiring_documents.length > 0 && (
        <Card style={styles.alertCard}>
          <View style={styles.alertRow}>
            <FileText size={18} color={colors.status.error} />
            <Text style={[styles.alertText, { color: colors.status.error }]}>
              {t('dashboard.expiringDocs')} ({dashboard.expiring_documents.length})
            </Text>
          </View>
        </Card>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.upcomingSchedule')}</Text>
        {dashboard.upcoming_schedule.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>{t('dashboard.noData')}</Text>
          </Card>
        ) : (
          dashboard.upcoming_schedule.slice(0, 5).map((item, index) => (
            <Card key={index} style={styles.scheduleItem}>
              <View style={styles.scheduleRow}>
                <Clock size={16} color={colors.text.secondary} />
                <View style={styles.scheduleInfo}>
                  <Text style={styles.scheduleTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.scheduleMeta}>
                    {item.date}
                    {item.time ? ` • ${item.time}` : ''}
                  </Text>
                </View>
                <Badge
                  label={item.type === 'course' ? t('schedule.course') : t('schedule.flight')}
                  variant={item.type === 'course' ? 'info' : 'success'}
                  size="sm"
                />
              </View>
            </Card>
          ))
        )}
      </View>

      {dashboard.recent_results.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.recentResults')}</Text>
          {dashboard.recent_results.map((result, index) => (
            <Card key={index} style={styles.resultItem}>
              <View style={styles.resultRow}>
                <Text style={styles.resultExam} numberOfLines={1}>
                  {result.exam}
                </Text>
                <View style={styles.resultRight}>
                  {result.score !== null && (
                    <Text style={styles.resultScore}>{result.score}%</Text>
                  )}
                  <Badge
                    label={result.passed ? t('exams.passed') : t('exams.failed')}
                    variant={result.passed ? 'success' : 'error'}
                    size="sm"
                  />
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <Card style={styles.statCard}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statValue}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Skeleton width="100%" height={70} borderRadius={16} />
      <View style={styles.statsGrid}>
        <Skeleton width="48%" height={110} borderRadius={16} />
        <Skeleton width="48%" height={110} borderRadius={16} />
        <Skeleton width="48%" height={110} borderRadius={16} />
        <Skeleton width="48%" height={110} borderRadius={16} />
      </View>
      <Skeleton width="60%" height={20} borderRadius={4} />
      <Skeleton width="100%" height={56} borderRadius={16} />
      <Skeleton width="100%" height={56} borderRadius={16} />
      <Skeleton width="100%" height={56} borderRadius={16} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy[900],
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  welcomeCard: {
    padding: 20,
    backgroundColor: colors.navy[800],
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'flex-start',
    padding: 16,
    gap: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.navy[900],
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  statUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  alertCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  alertText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.status.warning,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  scheduleItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  scheduleMeta: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  resultItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultExam: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  resultRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultScore: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gold[400],
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
