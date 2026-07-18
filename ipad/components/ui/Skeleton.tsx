import React, { useEffect, useRef } from 'react';
import { StyleSheet, ViewStyle, Animated, Easing } from 'react-native';
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
  const shimmerX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerX, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [shimmerX]);

  const translateX = shimmerX.interpolate({
    inputRange: [-1, 1],
    outputRange: [-(width as number), width as number],
  });

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: colors.navy[700], overflow: 'hidden' },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          { transform: [{ translateX }] },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    width: '60%',
    backgroundColor: '#223654',
    opacity: 0.6,
  },
});
