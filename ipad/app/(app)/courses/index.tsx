import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/hooks/useTranslation';
import { colors } from '@/constants/colors';
import { CoursesService } from '@/services';
import type { Course } from '@/types/models';
import { Card, Badge, SearchBar, Skeleton, EmptyState, ErrorState } from '@/components/ui';

export default function CoursesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const {
    data: courses,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<Course[]>({
    queryKey: ['courses'],
    queryFn: async () => {
      const res = await CoursesService.list();
      const data = res.data;
      if (Array.isArray(data)) return data as Course[];
      return (data as any)?.results ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!courses) return [];
    if (!search.trim()) return courses;
    const q = search.toLowerCase();
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.instructor_name ?? c.instructor).toLowerCase().includes(q) ||
        c.subject_title?.toLowerCase().includes(q),
    );
  }, [courses, search]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handlePress = useCallback(
    (id: string) => {
      router.push(`/courses/${id}`);
    },
    [router],
  );

  if (isLoading) {
    return <CoursesSkeleton />;
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
        <Text style={styles.title}>{t('courses.title')}</Text>
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
            icon={<BookOpen size={32} color={colors.text.muted} />}
            title={t('courses.noCourses')}
            message={t('courses.noCourses')}
          />
        }
        renderItem={({ item }) => (
          <Card style={styles.card} onPress={() => handlePress(item.id)}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <CourseStatusBadge status={item.status} t={t} />
            </View>
            <Text style={styles.cardInstructor}>
              {item.instructor_name ?? item.instructor}
            </Text>
            <Text style={styles.cardMeta}>
              {item.scheduled_date}
              {item.start_time ? ` • ${item.start_time}` : ''}
              {item.end_time ? ` – ${item.end_time}` : ''}
            </Text>
          </Card>
        )}
      />
    </View>
  );
}

function CourseStatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const variant: 'success' | 'warning' | 'error' | 'info' | 'default' = (() => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'in_progress':
      case 'ongoing':
        return 'info';
      case 'upcoming':
      case 'scheduled':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  })();

  return <Badge label={status} variant={variant} size="sm" />;
}

function CoursesSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Skeleton width={120} height={24} borderRadius={4} />
      </View>
      <View style={styles.searchContainer}>
        <Skeleton width="100%" height={44} borderRadius={10} />
      </View>
      <View style={styles.list}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={100} borderRadius={16} />
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
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  cardInstructor: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.text.muted,
  },
});
