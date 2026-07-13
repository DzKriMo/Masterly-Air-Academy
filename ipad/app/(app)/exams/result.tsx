import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Trophy, ArrowLeft } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function ConfettiPiece({ delay, x, color }: { delay: number; x: number; color: string }) {
  const translateY = useSharedValue(-20);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(SCREEN_HEIGHT + 40, { duration: 2000, easing: Easing.in(Easing.ease) }),
          withTiming(-20, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
    rotate.value = withDelay(
      delay,
      withRepeat(
        withTiming(360 * 5, { duration: 2000, easing: Easing.linear }),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(1, { duration: 1800 }),
          withTiming(0, { duration: 100 }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, translateY, rotate, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          left: x,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

const CONFETTI_COLORS = [
  colors.gold[500],
  colors.gold[400],
  colors.status.success,
  colors.status.info,
  '#ffffff',
];

export default function ExamResultScreen() {
  const { score, total, passed } = useLocalSearchParams<{
    score: string;
    total: string;
    passed: string;
  }>();
  const router = useRouter();

  const scoreNum = Number(score) || 0;
  const totalNum = Number(total) || 1;
  const passedBool = passed === 'true';
  const percentage = Math.round((scoreNum / totalNum) * 100);

  const scale = useSharedValue(0);
  const scoreScale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 100 });
    scoreScale.value = withDelay(300, withSpring(1, { damping: 8, stiffness: 80 }));
  }, [scale, scoreScale]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const scoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
  }));

  const confettiPieces = passedBool
    ? Array.from({ length: 30 }, (_, i) => ({
        delay: i * 80,
        x: Math.random() * SCREEN_WIDTH,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      }))
    : [];

  return (
    <View style={styles.container}>
      {confettiPieces.map((piece, index) => (
        <ConfettiPiece key={index} {...piece} />
      ))}

      <Animated.View style={[styles.content, containerStyle]}>
        <View
          style={[
            styles.iconContainer,
            passedBool ? styles.iconSuccess : styles.iconError,
          ]}
        >
          <Trophy size={40} color={passedBool ? colors.status.success : colors.status.error} />
        </View>

        <Text style={styles.title}>
          {passedBool ? 'Congratulations!' : 'Keep Trying!'}
        </Text>

        <Text style={styles.subtitle}>
          {passedBool
            ? 'You have successfully passed the exam.'
            : 'You did not pass this time. Review and try again.'}
        </Text>

        <Animated.View style={[styles.scoreCard, scoreStyle]}>
          <Text style={[styles.scoreNumber, { color: passedBool ? colors.status.success : colors.status.error }]}>
            {percentage}%
          </Text>
          <Text style={styles.scoreDetail}>
            {scoreNum} / {totalNum} correct
          </Text>
        </Animated.View>

        <Button
          title="Back to Exams"
          onPress={() => router.replace('/(app)/exams')}
          variant={passedBool ? 'primary' : 'secondary'}
          size="lg"
          style={styles.backButton}
          icon={<ArrowLeft size={16} color={passedBool ? colors.navy[900] : colors.gold[400]} />}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy[900],
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  iconError: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  scoreCard: {
    backgroundColor: colors.navy[800],
    borderWidth: 1,
    borderColor: colors.navy[700],
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 48,
    alignItems: 'center',
    gap: 6,
    marginVertical: 12,
  },
  scoreNumber: {
    fontSize: 52,
    fontWeight: '900',
  },
  scoreDetail: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  backButton: {
    minWidth: 200,
  },
  confettiPiece: {
    position: 'absolute',
    top: 0,
    width: 8,
    height: 8,
    borderRadius: 2,
  },
});
