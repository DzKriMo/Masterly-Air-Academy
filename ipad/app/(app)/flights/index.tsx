import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Plane } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/hooks/useTranslation';
import { colors } from '@/constants/colors';
import { FlightsService } from '@/services';
import type { FlightLesson } from '@/types/models';
import { Card, Badge, SearchBar, Skeleton, EmptyState, ErrorState } from '@/components/ui';

export default function FlightsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const {
    data: flights,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<FlightLesson[]>({
    queryKey: ['flights'],
    queryFn: async () => {
      const res = await FlightsService.list();
      const data = res.data;
      if (Array.isArray(data)) return data as FlightLesson[];
      return (data as any)?.results ?? [];
    },
  });

  const stats = useMemo(() => {
    if (!flights || flights.length === 0) {
      return { totalHours: 0, completed: 0, passRate: 0 };
    }
    const completed = flights.filter((f) => f.status === 'completed' || f.status === 'graded');
    const passed = completed.filter((f) => f.result === 'pass');
    const totalHours = completed.reduce((sum, f) => sum + (f.flight_duration ?? 0), 0);
    return {
      totalHours: totalHours.toFixed(1),
      completed: completed.length,
      passRate: completed.length > 0 ? Math.round((passed.length / completed.length) * 100) : 0,
    };
  }, [flights]);

  const filtered = useMemo(() => {
    if (!flights) return [];
    if (!search.trim()) return flights;
    const q = search.toLowerCase();
    return flights.filter(
      (f) =>
        (f.instructor_name ?? f.instructor).toLowerCase().includes(q) ||
        (f.aircraft_registration ?? f.aircraft).toLowerCase().includes(q) ||
        f.scheduled_date.includes(q),
    );
  }, [flights, search]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handlePress = useCallback(
    (id: string) => {
      router.push(`/flights/${id}`);
    },
    [router],
  );

  if (isLoading) {
    return <FlightsSkeleton />;
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorState onRetry={handleRefresh} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('flights.title')}</Text>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalHours}</Text>
          <Text style={styles.statLabel}>{t('flights.totalHours')}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats.completed}</Text>
          <Text style={styles.statLabel}>{t('flights.completed')}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats.passRate}%</Text>
          <Text style={styles.statLabel}>{t('flights.result')}</Text>
        </Card>
      </View>

      <View style={styles.searchContainer}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={`${t('common.search')}...`}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.gold[500]}
            colors={[colors.gold[500]]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Plane size={32} color={colors.text.muted} />}
            title={t('flights.noFlights')}
            message={t('flights.noFlights')}
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.card} onPress={() => handlePress(item.id)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardDate}>{item.scheduled_date}</Text>
              <FlightStatusBadge status={item.status} />
            </View>
            <Text style={styles.cardSub}>
              {item.instructor_name ?? item.instructor}
              {item.aircraft_registration
                ? ` • ${item.aircraft_registration}`
                : item.aircraft
                  ? ` • ${item.aircraft}`
                  : ''}
            </Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardDuration}>
                {item.flight_duration ? `${item.flight_duration} min` : '—'}
              </Text>
              {item.grade !== null && (
                <Text style={styles.cardGrade}>{item.grade}%</Text>
              )}
            </View>
          </Card>
        )}
      />
    </View>
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
      case 'no_show':
        return 'error';
      default:
        return 'default';
    }
  })();

  return <Badge label={status} variant={variant} size="sm" />;
}

function FlightsSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Skeleton width={100} height={24} borderRadius={4} />
      </View>
      <View style={styles.statsRow}>
        <Skeleton width="31%" height={70} borderRadius={16} />
        <Skeleton width="31%" height={70} borderRadius={16} />
        <Skeleton width="31%" height={70} borderRadius={16} />
      </View>
      <View style={styles.searchContainer}>
        <Skeleton width="100%" height={44} borderRadius={10} />
      </View>
      <View style={styles.list}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={90} borderRadius={16} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy[900],
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gold[400],
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 10,
    flexGrow: 1,
  },
  card: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  cardSub: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardDuration: {
    fontSize: 13,
    color: colors.text.muted,
  },
  cardGrade: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gold[400],
  },
});
