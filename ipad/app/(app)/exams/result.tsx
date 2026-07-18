import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trophy, ArrowLeft } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function ConfettiPiece({ delay, x, color }: { delay: number; x: number; color: string }) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const tyAnim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT + 40,
          duration: 2000,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -20,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    const rotAnim = Animated.loop(
      Animated.timing(rotate, {
        toValue: 360 * 5,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const opAnim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]),
    );

    tyAnim.start();
    rotAnim.start();
    opAnim.start();

    return () => {
      tyAnim.stop();
      rotAnim.stop();
      opAnim.stop();
    };
  }, [delay]);

  const rotateStr = rotate.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        { left: x, backgroundColor: color },
        { transform: [{ translateY }, { rotate: rotateStr }], opacity },
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

  const scale = useRef(new Animated.Value(0)).current;
  const scoreScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      damping: 10,
      stiffness: 100,
      useNativeDriver: true,
    }).start();

    Animated.delay(300).start(() => {
      Animated.spring(scoreScale, {
        toValue: 1,
        damping: 8,
        stiffness: 80,
        useNativeDriver: true,
      }).start();
    });
  }, []);

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

      <Animated.View
        style={[styles.content, { transform: [{ scale }] }]}
      >
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

        <Animated.View style={[styles.scoreCard, { transform: [{ scale: scoreScale }] }]}>
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
