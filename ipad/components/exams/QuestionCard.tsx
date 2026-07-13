import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { Badge } from '@/components/ui/Badge';
import type { Question } from '@/types/models';

interface QuestionCardProps {
  question: Question;
  selectedAnswer: string | undefined;
  onSelectAnswer: (answer: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  MCQ: 'Multiple Choice',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short Answer',
  FILL_BLANK: 'Fill in the Blank',
};

export function QuestionCard({
  question,
  selectedAnswer,
  onSelectAnswer,
}: QuestionCardProps) {
  const typeKey = question.question_type.toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Badge
          label={`Q${question.order}`}
          variant="default"
          size="sm"
        />
        <Badge
          label={TYPE_LABELS[typeKey] ?? typeKey}
          variant="info"
          size="sm"
        />
      </View>

      <Text style={styles.questionText}>{question.text}</Text>

      {typeKey === 'MCQ' && question.options.length > 0 && (
        <View style={styles.options}>
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            return (
              <Pressable
                key={index}
                onPress={() => onSelectAnswer(option)}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                ]}
              >
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
                <Text
                  style={[styles.optionText, isSelected && styles.optionTextSelected]}
                  numberOfLines={3}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {typeKey === 'TRUE_FALSE' && (
        <View style={styles.tfRow}>
          {['True', 'False'].map((option) => {
            const isSelected = selectedAnswer === option;
            return (
              <Pressable
                key={option}
                onPress={() => onSelectAnswer(option)}
                style={[
                  styles.tfButton,
                  isSelected && styles.tfButtonSelected,
                ]}
              >
                <Text
                  style={[styles.tfText, isSelected && styles.tfTextSelected]}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {typeKey === 'SHORT_ANSWER' && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={selectedAnswer ?? ''}
            onChangeText={onSelectAnswer}
            placeholder="Type your answer..."
            placeholderTextColor={colors.text.muted}
            multiline
            textAlignVertical="top"
          />
        </View>
      )}

      {typeKey === 'FILL_BLANK' && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={selectedAnswer ?? ''}
            onChangeText={onSelectAnswer}
            placeholder="Fill in the blank..."
            placeholderTextColor={colors.text.muted}
            autoCapitalize="none"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    gap: 8,
  },
  questionText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    lineHeight: 26,
  },
  options: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navy[800],
    borderWidth: 1.5,
    borderColor: colors.navy[700],
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  optionCardSelected: {
    borderColor: colors.gold[500],
    backgroundColor: 'rgba(196, 148, 60, 0.08)',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.text.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.gold[500],
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.gold[500],
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 22,
  },
  optionTextSelected: {
    color: colors.gold[400],
    fontWeight: '600',
  },
  tfRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tfButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.navy[800],
    borderWidth: 1.5,
    borderColor: colors.navy[700],
    borderRadius: 12,
    paddingVertical: 18,
  },
  tfButtonSelected: {
    borderColor: colors.gold[500],
    backgroundColor: 'rgba(196, 148, 60, 0.08)',
  },
  tfText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  tfTextSelected: {
    color: colors.gold[400],
  },
  inputContainer: {
    backgroundColor: colors.navy[800],
    borderWidth: 1.5,
    borderColor: colors.navy[700],
    borderRadius: 12,
    minHeight: 52,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    padding: 14,
    minHeight: 52,
  },
});
