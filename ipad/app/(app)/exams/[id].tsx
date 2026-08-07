import React from 'react';
import { View, Text, Alert, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  HelpCircle,
  Award,
  Hash,
  BookOpen,
  RotateCcw,
} from 'lucide-react-native';
import { ExamsService } from '@/services/exams.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/ErrorState';
import { colors } from '@/constants/colors';
import { isValidUuid } from '@/utils/validators';
import { useTranslation } from '@/hooks/useTranslation';
import type { Exam } from '@/types/models';

interface ExamAttempt {
  id: string;
  exam: string;
  exam_code: string;
  attempt: number;
  score: number | null;
  is_passed: boolean;
  started_at: string;
}

interface ExamDetailResponse {
  exam: Exam;
  attempts_used: number;
  can_attempt: boolean;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function ExamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const hasValidId = typeof id === 'string' && isValidUuid(id);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['exam', id],
    queryFn: async (): Promise<ExamDetailResponse> => {
      const [examRes, attemptsRes] = await Promise.all([
        ExamsService.get(id as string),
        ExamsService.myAttempts(),
      ]);
      const exam = examRes.data as Exam;
      const attempts: ExamAttempt[] = Array.isArray(attemptsRes.data)
        ? (attemptsRes.data as ExamAttempt[])
        : ((attemptsRes.data as { results?: ExamAttempt[] } | undefined)?.results ?? []);
      const attemptsUsed = attempts.filter((a) => a.exam === id).length;
      const maxAttempts = exam.max_attempts ?? 1;
      return {
        exam,
        attempts_used: attemptsUsed,
        can_attempt: attemptsUsed < maxAttempts,
      };
    },
    enabled: hasValidId,
  });

  const handleStart = () => {
    if (!hasValidId) return;
    Alert.alert(
      t('exams.startExam'),
      t('exams.readyMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('exams.startExam'),
          onPress: () =>
            router.push({
              pathname: '/(app)/exams/session',
              params: { examId: id },
            }),
        },
      ],
    );
  };

  if (isError || !hasValidId) {
    return (
      <View style={styles.container}>
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Button
            title={t('common.back')}
            onPress={() => router.back()}
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={16} color={colors.gold[400]} />}
          />
        </View>
      </View>
    );
  }

  const exam = data?.exam;
  if (!exam) {
    return (
      <View style={styles.container}>
        <ErrorState message={t('exams.notFound')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Button
          title={t('common.back')}
          onPress={() => router.back()}
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={16} color={colors.gold[400]} />}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <Badge label={exam.code} variant="info" size="md" />
          <Text style={styles.title}>{exam.title}</Text>
          <View style={styles.subjectRow}>
            <BookOpen size={16} color={colors.text.muted} />
            <Text style={styles.subject}>{exam.subject}</Text>
          </View>
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Clock size={20} color={colors.gold[500]} />
              <Text style={styles.infoLabel}>{t('exams.duration')}</Text>
              <Text style={styles.infoValue}>{formatDuration(exam.duration)}</Text>
            </View>
            <View style={styles.infoItem}>
              <HelpCircle size={20} color={colors.gold[500]} />
              <Text style={styles.infoLabel}>{t('exams.questions')}</Text>
              <Text style={styles.infoValue}>{exam.questions_count ?? '—'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Award size={20} color={colors.gold[500]} />
              <Text style={styles.infoLabel}>{t('exams.passingGrade')}</Text>
              <Text style={styles.infoValue}>{exam.passing_grade}%</Text>
            </View>
            <View style={styles.infoItem}>
              <RotateCcw size={20} color={colors.gold[500]} />
              <Text style={styles.infoLabel}>{t('exams.maxAttempts')}</Text>
              <Text style={styles.infoValue}>
                {data?.attempts_used ?? 0} / {exam.max_attempts ?? 1}
              </Text>
            </View>
          </View>
        </Card>

        {data?.can_attempt ? (
          <View style={styles.startSection}>
            <Text style={styles.readyText}>
              {t('exams.readyMessage')}
            </Text>
            <Button
              title={t('exams.startExam')}
              onPress={handleStart}
              variant="primary"
              size="lg"
              style={styles.startButton}
            />
          </View>
        ) : (
          <Card style={styles.deniedCard}>
            <Text style={styles.deniedText}>
              {t('exams.cannotAttempt')}
            </Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy[900],
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 20,
  },
  titleSection: {
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text.primary,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subject: {
    fontSize: 15,
    color: colors.text.secondary,
  },
  infoCard: {
    padding: 20,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  infoItem: {
    width: '45%',
    gap: 4,
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  startSection: {
    gap: 16,
  },
  readyText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  startButton: {
    alignSelf: 'flex-start',
  },
  deniedCard: {
    borderColor: colors.status.error,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  deniedText: {
    fontSize: 14,
    color: colors.status.error,
    textAlign: 'center',
  },
});
