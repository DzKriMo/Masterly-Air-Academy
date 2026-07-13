import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  User,
  Plane as PlaneIcon,
  Clock,
  Calendar,
  Award,
  CheckSquare,
  MessageSquare,
} from 'lucide-react-native';
import { useTranslation } from '@/hooks/useTranslation';
import { colors } from '@/constants/colors';
import { FlightsService } from '@/services';
import type { FlightLesson } from '@/types/models';
import { Card, Badge, Skeleton, ErrorState } from '@/components/ui';
import { Header } from '@/components/ui';

export default function FlightDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const flightId = id!;

  const {
    data: flight,
    isLoading,
    error,
    refetch,
  } = useQuery<FlightLesson>({
    queryKey: ['flight', flightId],
    queryFn: async () => {
      const res = await FlightsService.get(flightId);
      return res.data as FlightLesson;
    },
    enabled: !!flightId,
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return <FlightDetailSkeleton onBack={() => router.back()} t={t} />;
  }

  if (error || !flight) {
    return (
      <View style={styles.container}>
        <Header title={t('flights.title')} showBack onBack={() => router.back()} />
        <ErrorState onRetry={handleRefresh} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title={flight.scheduled_date}
        subtitle={flight.status}
        showBack
        onBack={() => router.back()}
        rightAction={
          <FlightStatusBadge status={flight.status} />
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRefresh}
            tintColor={colors.gold[500]}
            colors={[colors.gold[500]]}
          />
        }
      >
        <View style={styles.infoGrid}>
          <InfoCard
            icon={<PlaneIcon size={18} color={colors.gold[500]} />}
            label={t('flights.aircraft')}
            value={flight.aircraft_registration ?? flight.aircraft_model ?? flight.aircraft}
          />
          <InfoCard
            icon={<User size={18} color={colors.status.info} />}
            label={t('flights.instructor')}
            value={flight.instructor_name ?? flight.instructor}
          />
          <InfoCard
            icon={<Clock size={18} color={colors.status.success} />}
            label={t('flights.duration')}
            value={flight.flight_duration ? `${flight.flight_duration} min` : '—'}
          />
          <InfoCard
            icon={<Calendar size={18} color={colors.status.warning} />}
            label={t('flights.scheduled')}
            value={
              flight.start_time
                ? `${flight.start_time}${flight.end_time ? ` – ${flight.end_time}` : ''}`
                : '—'
            }
          />
        </View>

        {flight.grade !== null && (
          <Card style={styles.gradeCard}>
            <View style={styles.gradeHeader}>
              <Award size={20} color={colors.gold[500]} />
              <Text style={styles.gradeTitle}>{t('flights.grade')}</Text>
            </View>
            <View style={styles.gradeContent}>
              <Text style={styles.gradeValue}>{flight.grade}%</Text>
              {flight.result && (
                <Badge
                  label={flight.result === 'pass' ? t('flights.pass') : t('flights.fail')}
                  variant={flight.result === 'pass' ? 'success' : 'error'}
                  size="md"
                />
              )}
            </View>
          </Card>
        )}

        {flight.maneuvers && flight.maneuvers.length > 0 && (
          <Card style={styles.maneuverCard}>
            <View style={styles.maneuverHeader}>
              <CheckSquare size={18} color={colors.text.secondary} />
              <Text style={styles.maneuverTitle}>{t('flights.maneuvers')}</Text>
            </View>
            {flight.maneuvers.map((maneuver, index) => (
              <View key={index} style={styles.maneuverItem}>
                <Text style={styles.maneuverBullet}>•</Text>
                <Text style={styles.maneuverText}>{maneuver}</Text>
              </View>
            ))}
          </Card>
        )}

        {flight.remarks && (
          <Card style={styles.remarksCard}>
            <View style={styles.remarksHeader}>
              <MessageSquare size={18} color={colors.text.secondary} />
              <Text style={styles.remarksTitle}>{t('flights.remarks')}</Text>
            </View>
            <Text style={styles.remarksText}>{flight.remarks}</Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card style={styles.infoCard}>
      <View style={styles.infoIcon}>{icon}</View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </Card>
  );
}

function FlightStatusBadge({ status }: { status: string }) {
  const variant: 'success' | 'warning' | 'error' | 'info' | 'default' = (() => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'graded':
        return 'success';
      case 'scheduled':
        return 'info';
      case 'in_progress':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  })();

  return <Badge label={status} variant={variant} size="sm" />;
}

function FlightDetailSkeleton({ onBack, t }: { onBack: () => void; t: (k: string) => string }) {
  return (
    <View style={styles.container}>
      <Header title={t('flights.title')} showBack onBack={onBack} />
      <View style={styles.scroll}>
        <View style={styles.infoGrid}>
          <Skeleton width="48%" height={100} borderRadius={16} />
          <Skeleton width="48%" height={100} borderRadius={16} />
          <Skeleton width="48%" height={100} borderRadius={16} />
          <Skeleton width="48%" height={100} borderRadius={16} />
        </View>
      </View>
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
  scrollInner: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoCard: {
    width: '48%',
    padding: 14,
    gap: 8,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.navy[900],
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: colors.text.muted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  gradeCard: {
    padding: 16,
  },
  gradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  gradeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  gradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gradeValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gold[400],
  },
  maneuverCard: {
    padding: 16,
  },
  maneuverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  maneuverTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  maneuverItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
  },
  maneuverBullet: {
    fontSize: 14,
    color: colors.gold[500],
    lineHeight: 20,
  },
  maneuverText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    flex: 1,
  },
  remarksCard: {
    padding: 16,
  },
  remarksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  remarksTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  remarksText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
