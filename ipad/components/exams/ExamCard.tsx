import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, HelpCircle, Award } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import type { Exam } from '@/types/models';

interface ExamCardProps {
  exam: Exam;
  onPress: () => void;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function ExamCard({ exam, onPress }: ExamCardProps) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{exam.title}</Text>
          <Badge label={exam.code} variant="info" size="sm" />
        </View>
        <Text style={styles.subject}>{exam.subject}</Text>
      </View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Clock size={14} color={colors.text.muted} />
          <Text style={styles.metaText}>{formatDuration(exam.duration)}</Text>
        </View>
        <View style={styles.metaItem}>
          <HelpCircle size={14} color={colors.text.muted} />
          <Text style={styles.metaText}>{exam.questions_count ?? '—'} Q</Text>
        </View>
        <View style={styles.metaItem}>
          <Award size={14} color={colors.text.muted} />
          <Text style={styles.metaText}>{exam.passing_grade}%</Text>
        </View>
      </View>

      <Button
        title="Start"
        onPress={onPress}
        variant="primary"
        size="sm"
        style={styles.button}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  header: {
    gap: 6,
  },
  titleRow: {
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
  subject: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  meta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 13,
    color: colors.text.muted,
  },
  button: {
    alignSelf: 'flex-start',
  },
});
