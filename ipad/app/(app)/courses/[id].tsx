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
  BookOpen,
  User,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react-native';
import { useTranslation } from '@/hooks/useTranslation';
import { colors } from '@/constants/colors';
import { CoursesService } from '@/services';
import type { Course, Module, AttendanceRecord } from '@/types/models';
import { Card, Badge, Skeleton, ErrorState } from '@/components/ui';
import { Header } from '@/components/ui';

export default function CourseDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [activeTab, setActiveTab] = React.useState<'overview' | 'modules' | 'attendance'>('overview');

  const courseId = id!;

  const {
    data: course,
    isLoading,
    error,
    refetch,
  } = useQuery<Course>({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const res = await CoursesService.get(courseId);
      return res.data as Course;
    },
    enabled: !!courseId,
  });

  const { data: modules } = useQuery<Module[]>({
    queryKey: ['course-modules', courseId],
    queryFn: async () => {
      const res = await CoursesService.getMaterials(courseId);
      const data = res.data;
      if (Array.isArray(data)) return data as Module[];
      return (data as any)?.results ?? [];
    },
    enabled: !!courseId && activeTab === 'modules',
  });

  const { data: attendance, isLoading: attendanceLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['course-attendance', courseId],
    queryFn: async () => {
      const res = await CoursesService.getAttendance(courseId);
      const data = res.data;
      if (Array.isArray(data)) return data as AttendanceRecord[];
      return (data as any)?.results ?? [];
    },
    enabled: !!courseId && activeTab === 'attendance',
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const attendanceStats = React.useMemo(() => {
    if (!attendance) return { present: 0, absent: 0, late: 0, total: 0 };
    return {
      present: attendance.filter((a) => a.status === 'present').length,
      absent: attendance.filter((a) => a.status === 'absent').length,
      late: attendance.filter((a) => a.status === 'late').length,
      total: attendance.length,
    };
  }, [attendance]);

  if (isLoading) {
    return <CourseDetailSkeleton onBack={() => router.back()} t={t} />;
  }

  if (error || !course) {
    return (
      <View style={styles.container}>
        <Header
          title={t('courses.title')}
          showBack
          onBack={() => router.back()}
        />
        <ErrorState onRetry={handleRefresh} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title={course.title}
        subtitle={course.subject_title ?? course.subject}
        showBack
        onBack={() => router.back()}
      />

      <View style={styles.tabBar}>
        {(['overview', 'modules', 'attendance'] as const).map((tab) => (
          <Text
            key={tab}
            style={[styles.tabText, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            {tab === 'overview'
              ? t('dashboard.overview')
              : tab === 'modules'
                ? t('courses.modules')
                : t('courses.attendance')}
          </Text>
        ))}
      </View>

      <ScrollView
        style={styles.scrollContent}
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
        {activeTab === 'overview' && (
          <View style={styles.section}>
            <InfoRow icon={<User size={16} color={colors.text.secondary} />} label={t('courses.instructor')} value={course.instructor_name ?? course.instructor} />
            <InfoRow icon={<MapPin size={16} color={colors.text.secondary} />} label={t('courses.room')} value={course.room_name ?? course.room} />
            <InfoRow icon={<Clock size={16} color={colors.text.secondary} />} label={t('courses.schedule')} value={`${course.scheduled_date} • ${course.start_time} – ${course.end_time}`} />
            <Card style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>{t('courses.schedule')}</Text>
                <CourseStatusBadge status={course.status} />
              </View>
            </Card>
          </View>
        )}

        {activeTab === 'modules' && (
          <View style={styles.section}>
            {(!modules || modules.length === 0) ? (
              <Card>
                <Text style={styles.emptyText}>{t('dashboard.noData')}</Text>
              </Card>
            ) : (
              modules.map((mod) => (
                <Card key={mod.id} style={styles.moduleCard}>
                  <View style={styles.moduleHeader}>
                    <Text style={styles.moduleTitle} numberOfLines={1}>
                      {mod.title}
                    </Text>
                    <Text style={styles.moduleOrder}>#{mod.order}</Text>
                  </View>
                  {mod.progress !== undefined && (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBg}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${mod.progress}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>{mod.progress}%</Text>
                    </View>
                  )}
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === 'attendance' && (
          <View style={styles.section}>
            {attendanceLoading ? (
              <View style={styles.section}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} width="100%" height={60} borderRadius={16} />
                ))}
              </View>
            ) : (
              <>
                <View style={styles.attendanceGrid}>
                  <Card style={styles.attendanceStat}>
                    <CheckCircle size={20} color={colors.status.success} />
                    <Text style={[styles.attendanceValue, { color: colors.status.success }]}>
                      {attendanceStats.present}
                    </Text>
                    <Text style={styles.attendanceLabel}>{t('courses.present')}</Text>
                  </Card>
                  <Card style={styles.attendanceStat}>
                    <XCircle size={20} color={colors.status.error} />
                    <Text style={[styles.attendanceValue, { color: colors.status.error }]}>
                      {attendanceStats.absent}
                    </Text>
                    <Text style={styles.attendanceLabel}>{t('courses.absent')}</Text>
                  </Card>
                  <Card style={styles.attendanceStat}>
                    <AlertCircle size={20} color={colors.status.warning} />
                    <Text style={[styles.attendanceValue, { color: colors.status.warning }]}>
                      {attendanceStats.late}
                    </Text>
                    <Text style={styles.attendanceLabel}>{t('courses.upcoming')}</Text>
                  </Card>
                </View>

                {attendance && attendance.length > 0 ? (
                  attendance.map((record) => (
                    <Card key={record.id} style={styles.attendanceItem}>
                      <View style={styles.attendanceRow}>
                        <Text style={styles.attendanceDate}>{record.date}</Text>
                        <Badge
                          label={record.status}
                          variant={
                            record.status === 'present'
                              ? 'success'
                              : record.status === 'absent'
                                ? 'error'
                                : record.status === 'late'
                                  ? 'warning'
                                  : 'info'
                          }
                          size="sm"
                        />
                      </View>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <Text style={styles.emptyText}>{t('dashboard.noData')}</Text>
                  </Card>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card style={styles.infoRow}>
      <View style={styles.infoRowInner}>
        {icon}
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value || '—'}</Text>
        </View>
      </View>
    </Card>
  );
}

function CourseStatusBadge({ status }: { status: string }) {
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

  return <Badge label={status} variant={variant} size="md" />;
}

function CourseDetailSkeleton({ onBack, t }: { onBack: () => void; t: (k: string) => string }) {
  return (
    <View style={styles.container}>
      <Header title={t('courses.title')} showBack onBack={onBack} />
      <View style={styles.scrollContent}>
        <View style={styles.section}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={60} borderRadius={16} />
          ))}
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.navy[700],
    paddingHorizontal: 16,
  },
  tabText: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.muted,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    color: colors.gold[500],
    borderBottomColor: colors.gold[500],
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    gap: 10,
    paddingBottom: 32,
  },
  section: {
    gap: 10,
  },
  infoRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  infoRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statusCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  moduleCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  moduleOrder: {
    fontSize: 12,
    color: colors.text.muted,
    marginLeft: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.navy[700],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.gold[500],
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    minWidth: 36,
    textAlign: 'right',
  },
  attendanceGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  attendanceStat: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    gap: 6,
  },
  attendanceValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  attendanceLabel: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  attendanceItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attendanceDate: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
