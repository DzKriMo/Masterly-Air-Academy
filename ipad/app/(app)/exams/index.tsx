import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ClipboardList } from 'lucide-react-native';
import { ExamsService } from '@/services/exams.service';
import { ExamCard } from '@/components/exams/ExamCard';
import { ExamResultCard } from '@/components/exams/ExamResultCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { colors } from '@/constants/colors';
import type { Exam, QuizAttempt } from '@/types/models';

interface ExamListResponse {
  exams: Exam[];
  attempts: QuizAttempt[];
}

export default function ExamsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['exams'],
    queryFn: async (): Promise<ExamListResponse> => {
      const [examsRes, attemptsRes] = await Promise.all([
        ExamsService.list(),
        ExamsService.myAttempts(),
      ]);
      return {
        exams: examsRes.data?.results ?? examsRes.data ?? [],
        attempts: attemptsRes.data?.results ?? attemptsRes.data ?? [],
      };
    },
  });

  const exams = data?.exams ?? [];
  const attempts = data?.attempts ?? [];

  const attemptedExamIds = useMemo(
    () => new Set(attempts.map((a) => a.exam)),
    [attempts],
  );

  const filteredExams = useMemo(() => {
    if (!search.trim()) return exams;
    const q = search.toLowerCase();
    return exams.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q),
    );
  }, [exams, search]);

  const availableExams = useMemo(
    () => filteredExams.filter((e) => !attemptedExamIds.has(e.id)),
    [filteredExams, attemptedExamIds],
  );

  const completedExams = useMemo(
    () => filteredExams.filter((e) => attemptedExamIds.has(e.id)),
    [filteredExams, attemptedExamIds],
  );

  const getAttemptsForExam = useCallback(
    (examId: string) => attempts.filter((a) => a.exam === examId),
    [attempts],
  );

  const handlePressExam = useCallback(
    (examId: string) => {
      router.push(`/(app)/exams/${examId}`);
    },
    [router],
  );

  const sections: { title: string; data: Exam[]; type: 'available' | 'completed' }[] = [];
  if (availableExams.length > 0) sections.push({ title: 'Available', data: availableExams, type: 'available' });
  if (completedExams.length > 0) sections.push({ title: 'Completed', data: completedExams, type: 'completed' });

  const renderItem = ({ item, section }: { item: Exam; section: { type: string } }) => {
    if (section.type === 'completed') {
      const examAttempts = getAttemptsForExam(item.id);
      const latest = examAttempts[examAttempts.length - 1];
      return (
        <View style={styles.cardWrapper}>
          <ExamResultCard attempt={latest} examTitle={item.title} />
          <Text style={styles.attemptsText}>
            {examAttempts.length} / {item.max_attempts} attempts used
          </Text>
        </View>
      );
    }
    return (
      <ExamCard
        exam={item}
        onPress={() => handlePressExam(item.id)}
      />
    );
  };

  if (isError) {
    return (
      <View style={styles.container}>
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Exams</Text>
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search exams..."
        style={styles.search}
      />

      {exams.length === 0 && !isLoading ? (
        <EmptyState
          icon={<ClipboardList size={32} color={colors.text.muted} />}
          title="No Exams Available"
          message="There are no exams assigned to you at the moment."
        />
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(s) => s.title}
          renderItem={({ item: section }) => (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.data.map((exam) => (
                <View key={exam.id} style={styles.cardGap}>
                  {renderItem({ item: exam, section })}
                </View>
              ))}
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.gold[500]}
              colors={[colors.gold[500]]}
            />
          }
          ListEmptyComponent={
            search ? (
              <EmptyState
                icon={<ClipboardList size={32} color={colors.text.muted} />}
                title="No Results"
                message="No exams match your search."
              />
            ) : null
          }
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
  },
  search: {
    marginHorizontal: 20,
    marginVertical: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.gold[400],
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardGap: {
    marginBottom: 4,
  },
  cardWrapper: {
    gap: 6,
  },
  attemptsText: {
    fontSize: 12,
    color: colors.text.muted,
    paddingHorizontal: 4,
  },
});
