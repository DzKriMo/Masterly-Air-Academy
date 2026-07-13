import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/constants/colors';

interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width,
  height,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const shimmerX = useSharedValue(-1);

  useEffect(() => {
    shimmerX.value = withDelay(
      300,
      withRepeat(
        withTiming(1, {
          duration: 1200,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );
  }, [shimmerX]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmerX.value, [-1, 1], [-width as number, width as number]);

    return {
      transform: [{ translateX }],
    };
  });

  return (
    <Animated.View
        style={[{ width: width as any, height, borderRadius }, style]}
    >
      <Animated.View style={[styles.shimmer, animatedStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.navy[700],
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    width: '60%',
    backgroundColor: '#223654',
    opacity: 0.6,
  },
});
