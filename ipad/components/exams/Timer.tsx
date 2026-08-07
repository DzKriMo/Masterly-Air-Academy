import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '@/constants/colors';

interface TimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
  isPaused: boolean;
}

function getTimerColor(ratio: number): string {
  if (ratio > 0.5) return colors.status.success;
  if (ratio > 0.25) return colors.status.warning;
  return colors.status.error;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function Timer({ totalSeconds, onTimeUp, isPaused }: TimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeUpRef = useRef(onTimeUp);
  const pulse = useRef(new Animated.Value(1)).current;

  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    endTimeRef.current = Date.now() + totalSeconds * 1000;
    setRemaining(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      pulse.setValue(1);
      return;
    }

    if (endTimeRef.current === null) {
      endTimeRef.current = Date.now() + totalSeconds * 1000;
    }

    const tick = () => {
      if (endTimeRef.current === null) return;
      const remainingMs = endTimeRef.current - Date.now();
      if (remainingMs <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setRemaining(0);
        onTimeUpRef.current();
        return;
      }
      setRemaining(Math.ceil(remainingMs / 1000));
    };

    tick();
    intervalRef.current = setInterval(tick, 250);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, totalSeconds]);

  useEffect(() => {
    if (isPaused || remaining > 300) {
      pulse.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();

    return () => {
      animation.stop();
      pulse.setValue(1);
    };
  }, [isPaused, remaining > 300]);

  const ratio = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const timerColor = getTimerColor(ratio);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulse }] }]}>
      <View style={[styles.ring, { borderColor: timerColor }]}>
        <Text style={[styles.time, { color: timerColor }]}>
          {formatTime(remaining)}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 22, 40, 0.8)',
  },
  time: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
