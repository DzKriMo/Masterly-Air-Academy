import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Send, Grid3X3 } from 'lucide-react-native';
import { ExamsService } from '@/services/exams.service';
import { Timer } from '@/components/exams/Timer';
import { QuestionCard } from '@/components/exams/QuestionCard';
import { AntiCheatOverlay } from '@/components/exams/AntiCheatOverlay';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import type { Question } from '@/types/models';

interface ExamStartData {
  attempt_id: string;
  exam_id: string;
  title: string;
  duration: number;
  attempt_number: number;
  questions: Question[];
}

export default function ExamSessionScreen() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const router = useRouter();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isPaused, setIsPaused] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [violations, setViolations] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const violationsRef = useRef(0);

  const { data: sessionData, isLoading } = useQuery({
    queryKey: ['examSession', examId],
    queryFn: async (): Promise<ExamStartData> => {
      const res = await ExamsService.start(examId!);
      return res.data as ExamStartData;
    },
    enabled: !!examId,
  });

  const submitMutation = useMutation({
    mutationFn: (answersPayload: Record<string, string>) =>
      ExamsService.submit(examId!, sessionData!.attempt_id, answersPayload),
  });

  const questions = sessionData?.questions ?? [];
  const totalSeconds = (sessionData?.duration ?? 60) * 60;
  const question = questions[currentQuestion];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  const handleTimeUp = useCallback(() => {
    handleSubmit(true);
  }, [answers, questions, examId, sessionData]);

  const handleViolation = useCallback((type: string) => {
    violationsRef.current += 1;
    setViolations(violationsRef.current);

    if (violationsRef.current >= 3) {
      Alert.alert(
        'Too Many Violations',
        'You have exceeded the allowed number of violations. Your exam will be submitted now.',
        [{ text: 'OK', onPress: () => handleSubmit(true) }],
      );
    }
  }, [answers, questions, examId, sessionData]);

  const handleSubmit = useCallback(
    async (autoSubmit = false) => {
      if (isSubmitting || !sessionData) return;

      if (!autoSubmit) {
        const unanswered = questions.length - Object.keys(answers).length;
        const confirmed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Submit Exam',
            unanswered > 0
              ? `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`
              : 'Are you sure you want to submit?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Submit', onPress: () => resolve(true) },
            ],
          );
        });
        if (!confirmed) return;
      }

      setIsSubmitting(true);
      try {
        const result = await submitMutation.mutateAsync(answers);
        const data = result.data as any;
        const score = data?.percentage ?? data?.score ?? 0;
        const total = questions.length;
        const passed = data?.is_passed ?? false;

        router.replace({
          pathname: '/(app)/exams/result',
          params: { score: String(score), total: String(total), passed: String(passed) },
        });
      } catch {
        Alert.alert('Error', 'Failed to submit exam. Please try again.');
        setIsSubmitting(false);
      }
    },
    [answers, questions, examId, isSubmitting, submitMutation, router, sessionData],
  );

  const handleSelectAnswer = useCallback(
    (answer: string) => {
      if (!question) return;
      setAnswers((prev) => ({ ...prev, [question.id]: answer }));
    },
    [question],
  );

  const goToQuestion = useCallback(
    (index: number) => {
      if (index >= 0 && index < questions.length) {
        setCurrentQuestion(index);
        setShowGrid(false);
      }
    },
    [questions.length],
  );

  if (isLoading || !question) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading exam...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AntiCheatOverlay onViolation={handleViolation} />

      <View style={styles.topBar}>
        <Timer
          totalSeconds={totalSeconds}
          onTimeUp={handleTimeUp}
          isPaused={isPaused}
        />

        <Text style={styles.progress}>
          {currentQuestion + 1} / {questions.length}
        </Text>

        <Button
          title="Submit"
          onPress={() => handleSubmit(false)}
          variant="primary"
          size="sm"
          loading={isSubmitting}
          icon={<Send size={14} color={colors.navy[900]} />}
        />
      </View>

      <ScrollView
        style={styles.questionArea}
        contentContainerStyle={styles.questionContent}
        showsVerticalScrollIndicator={false}
      >
        <QuestionCard
          question={question}
          selectedAnswer={answers[question.id]}
          onSelectAnswer={handleSelectAnswer}
        />
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          title="Prev"
          onPress={() => goToQuestion(currentQuestion - 1)}
          variant="secondary"
          size="sm"
          disabled={currentQuestion === 0}
          icon={<ArrowLeft size={14} color={colors.gold[400]} />}
        />

        <Pressable
          onPress={() => setShowGrid(!showGrid)}
          style={styles.gridToggle}
        >
          <Grid3X3 size={18} color={colors.text.secondary} />
          <Text style={styles.gridToggleText}>
            {answeredCount}/{questions.length}
          </Text>
        </Pressable>

        <Button
          title="Next"
          onPress={() => goToQuestion(currentQuestion + 1)}
          variant="secondary"
          size="sm"
          disabled={currentQuestion === questions.length - 1}
          icon={<ArrowRight size={14} color={colors.gold[400]} />}
        />
      </View>

      {showGrid && (
        <View style={styles.gridOverlay}>
          <View style={styles.gridContainer}>
            <Text style={styles.gridTitle}>Questions</Text>
            <View style={styles.grid}>
              {questions.map((q, index) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = index === currentQuestion;
                return (
                  <Pressable
                    key={q.id}
                    onPress={() => goToQuestion(index)}
                    style={[
                      styles.gridItem,
                      isAnswered && styles.gridItemAnswered,
                      isCurrent && styles.gridItemCurrent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.gridItemText,
                        isAnswered && styles.gridItemTextAnswered,
                        isCurrent && styles.gridItemTextCurrent,
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setShowGrid(false)}
              style={styles.gridClose}
            >
              <Text style={styles.gridCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      )}

      {violations > 0 && violations < 3 && (
        <View style={styles.violationBanner}>
          <Text style={styles.violationText}>
            Warning: Violation {violations}/3 detected
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy[900],
  },
  loadingText: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 16,
    color: colors.text.secondary,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.navy[700],
  },
  progress: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  questionArea: {
    flex: 1,
  },
  questionContent: {
    padding: 24,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.navy[700],
  },
  gridToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.navy[800],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  gridToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    fontVariant: ['tabular-nums'],
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 22, 40, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  gridContainer: {
    backgroundColor: colors.navy[800],
    borderRadius: 20,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    gap: 16,
  },
  gridTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  gridItem: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.navy[900],
    borderWidth: 1.5,
    borderColor: colors.navy[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItemAnswered: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: colors.status.success,
  },
  gridItemCurrent: {
    borderColor: colors.gold[500],
    borderWidth: 2,
  },
  gridItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.muted,
  },
  gridItemTextAnswered: {
    color: colors.status.success,
  },
  gridItemTextCurrent: {
    color: colors.gold[500],
  },
  gridClose: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  gridCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gold[400],
  },
  violationBanner: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: colors.status.warning,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  violationText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.status.warning,
  },
});
