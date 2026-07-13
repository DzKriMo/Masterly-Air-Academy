import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar, Clock } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { colors } from '@/constants/colors';
import { formatDate } from '@/utils/formatters';
import type { QuizAttempt } from '@/types/models';

interface ExamResultCardProps {
  attempt: QuizAttempt;
  examTitle: string;
}

function formatTimeTaken(start: string, end: string | null): string {
  if (!end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function ExamResultCard({ attempt, examTitle }: ExamResultCardProps) {
  const passed = attempt.is_passed === true;
  const scoreColor = passed ? colors.status.success : colors.status.error;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{examTitle}</Text>
        <Badge
          label={passed ? 'Passed' : 'Failed'}
          variant={passed ? 'success' : 'error'}
          size="md"
        />
      </View>

      <View style={styles.scoreRow}>
        <Text style={[styles.score, { color: scoreColor }]}>
          {attempt.score ?? '—'}
        </Text>
        <Text style={styles.scoreUnit}>%</Text>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Calendar size={14} color={colors.text.muted} />
          <Text style={styles.detailText}>{formatDate(attempt.started_at)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Clock size={14} color={colors.text.muted} />
          <Text style={styles.detailText}>
            {formatTimeTaken(attempt.started_at, attempt.completed_at)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  score: {
    fontSize: 36,
    fontWeight: '800',
  },
  scoreUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  details: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailText: {
    fontSize: 13,
    color: colors.text.muted,
  },
});
