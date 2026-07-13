import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, CalendarDays, Plane } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { CoursesService } from '@/services/courses.service';
import { FlightsService } from '@/services/flights.service';
import { useTranslation } from '@/hooks/useTranslation';
import type { Course, FlightLesson } from '@/types/models';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 6);

function getWeekDates(offset: number = 0): Date[] {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + offset * 7);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h + (m ? m / 60 : 0);
}

interface TimelineEvent {
  id: string;
  type: 'course' | 'flight';
  title: string;
  subtitle: string;
  startTime: string;
  endTime: string;
  startHour: number;
  endHour: number;
}

export default function ScheduleScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    return day === 0 ? 6 : day - 1;
  });

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const selectedDate = weekDates[selectedDay];
  const selectedKey = formatDateKey(selectedDate);

  const { data: coursesData, isLoading: coursesLoading, refetch: refetchCourses } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data } = await CoursesService.list();
      return (data as unknown as Course[]) ?? [];
    },
  });

  const { data: flightsData, isLoading: flightsLoading, refetch: refetchFlights } = useQuery({
    queryKey: ['flights'],
    queryFn: async () => {
      const { data } = await FlightsService.list();
      return (data as unknown as FlightLesson[]) ?? [];
    },
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchCourses(), refetchFlights()]);
    setRefreshing(false);
  }, [refetchCourses, refetchFlights]);

  const events: TimelineEvent[] = useMemo(() => {
    const courseEvents: TimelineEvent[] = (coursesData ?? [])
      .filter((c) => c.scheduled_date === selectedKey)
      .map((c) => ({
        id: `course-${c.id}`,
        type: 'course' as const,
        title: c.title,
        subtitle: `${c.room_name ?? c.room} · ${c.instructor_name ?? ''}`,
        startTime: c.start_time,
        endTime: c.end_time,
        startHour: parseTime(c.start_time),
        endHour: parseTime(c.end_time),
      }));

    const flightEvents: TimelineEvent[] = (flightsData ?? [])
      .filter((f) => f.scheduled_date === selectedKey)
      .map((f) => ({
        id: `flight-${f.id}`,
        type: 'flight' as const,
        title: `Flight – ${f.aircraft_model ?? f.aircraft_registration ?? 'Aircraft'}`,
        subtitle: `${f.instructor_name ?? ''} · ${f.flight_duration} min`,
        startTime: f.start_time ?? '00:00',
        endTime: f.end_time ?? '00:00',
        startHour: f.start_time ? parseTime(f.start_time) : 0,
        endHour: f.end_time ? parseTime(f.end_time) : 0,
      }));

    return [...courseEvents, ...flightEvents].sort((a, b) => a.startHour - b.startHour);
  }, [coursesData, flightsData, selectedKey]);

  const isLoading = coursesLoading || flightsLoading;

  const today = new Date();
  const isToday = formatDateKey(today) === selectedKey;

  return (
    <View style={styles.container}>
      <Header
        title={t('schedule.title')}
        showBack
        onBack={() => router.back()}
      />

      <View style={styles.weekNav}>
        <Pressable
          onPress={() => setWeekOffset((p) => p - 1)}
          style={styles.navButton}
        >
          <ChevronLeft size={20} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.weekLabel}>
          {weekDates[0].toLocaleDateString('en', { month: 'short', day: 'numeric' })}{' '}
          –{' '}
          {weekDates[6].toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
        <Pressable
          onPress={() => setWeekOffset((p) => p + 1)}
          style={styles.navButton}
        >
          <ChevronRight size={20} color={colors.text.primary} />
        </Pressable>
      </View>

      <View style={styles.daySelector}>
        {DAY_NAMES.map((name, idx) => {
          const dateKey = formatDateKey(weekDates[idx]);
          const isSelected = idx === selectedDay;
          const isTodayDay = formatDateKey(today) === dateKey;

          return (
            <Pressable
              key={name}
              onPress={() => setSelectedDay(idx)}
              style={[
                styles.dayButton,
                isSelected && styles.dayButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.dayName,
                  isSelected && styles.dayNameSelected,
                ]}
              >
                {name}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.dayNumberSelected,
                  isTodayDay && !isSelected && styles.dayNumberToday,
                ]}
              >
                {weekDates[idx].getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={80} borderRadius={12} style={{ marginBottom: 12 }} />
          ))}
        </View>
      ) : events.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={32} color={colors.text.muted} />}
          title={t('schedule.noClasses')}
          message={t('schedule.noClasses')}
        />
      ) : (
        <ScrollView
          style={styles.timelineScroll}
          contentContainerStyle={styles.timelineContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.gold[500]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {events.map((event) => {
            const topOffset = (event.startHour - 6) * 80;
            const height = Math.max((event.endHour - event.startHour) * 80, 40);

            return (
              <Card
                key={event.id}
                style={[styles.eventCard, { top: topOffset, height, borderLeftColor: event.type === 'course' ? colors.status.info : colors.gold[500] }] as any}
              >
                <View style={styles.eventHeader}>
                  {event.type === 'flight' ? (
                    <Plane size={14} color={colors.gold[500]} />
                  ) : (
                    <CalendarDays size={14} color={colors.status.info} />
                  )}
                  <Text style={styles.eventType} numberOfLines={1}>
                    {event.type === 'course' ? t('schedule.course') : t('schedule.flight')}
                  </Text>
                </View>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {event.title}
                </Text>
                <Text style={styles.eventSubtitle} numberOfLines={1}>
                  {event.startTime} – {event.endTime}
                </Text>
                {event.subtitle ? (
                  <Text style={styles.eventDetail} numberOfLines={1}>
                    {event.subtitle}
                  </Text>
                ) : null}
              </Card>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy[900],
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.navy[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  daySelector: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 4,
  },
  dayButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  dayButtonSelected: {
    backgroundColor: colors.gold[500],
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted,
    marginBottom: 4,
  },
  dayNameSelected: {
    color: colors.navy[900],
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  dayNumberSelected: {
    color: colors.navy[900],
  },
  dayNumberToday: {
    color: colors.gold[500],
  },
  loadingContainer: {
    padding: 20,
  },
  timelineScroll: {
    flex: 1,
  },
  timelineContent: {
    padding: 20,
    paddingBottom: 40,
  },
  eventCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderLeftWidth: 3,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  eventType: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'uppercase',
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  eventSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  eventDetail: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
});
