import React, { useCallback } from 'react';
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '@/constants/colors';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  size?: ButtonSize;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SIZE_CONFIG: Record<ButtonSize, { paddingV: number; paddingH: number; fontSize: number; iconGap: number }> = {
  sm: { paddingV: 8, paddingH: 14, fontSize: 13, iconGap: 6 },
  md: { paddingV: 12, paddingH: 20, fontSize: 15, iconGap: 8 },
  lg: { paddingV: 16, paddingH: 28, fontSize: 17, iconGap: 10 },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  size = 'md',
  style,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  const sizeConfig = SIZE_CONFIG[size];
  const isDisabled = disabled || loading;

  const variantStyles = getVariantStyles(variant);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[
        styles.base,
        {
          paddingVertical: sizeConfig.paddingV,
          paddingHorizontal: sizeConfig.paddingH,
          opacity: isDisabled ? 0.5 : 1,
        },
        variantStyles.container,
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantStyles.loaderColor} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: sizeConfig.iconGap }}>
          {icon}
          <Text
            style={[
              styles.label,
              { fontSize: sizeConfig.fontSize },
              variantStyles.label,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

function getVariantStyles(variant: ButtonVariant): {
  container: ViewStyle;
  label: TextStyle;
  loaderColor: string;
} {
  switch (variant) {
    case 'primary':
      return {
        container: {
          backgroundColor: colors.gold[500],
        },
        label: {
          color: colors.navy[900],
        },
        loaderColor: colors.navy[900],
      };
    case 'secondary':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.navy[700],
        },
        label: {
          color: colors.gold[400],
        },
        loaderColor: colors.gold[400],
      };
    case 'danger':
      return {
        container: {
          backgroundColor: colors.status.error,
        },
        label: {
          color: '#ffffff',
        },
        loaderColor: '#ffffff',
      };
    case 'ghost':
      return {
        container: {
          backgroundColor: 'transparent',
        },
        label: {
          color: colors.gold[400],
        },
        loaderColor: colors.gold[400],
      };
  }
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
