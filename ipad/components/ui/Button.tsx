import React, { useRef } from 'react';
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
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
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      damping: 15,
      stiffness: 400,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      damping: 15,
      stiffness: 400,
      useNativeDriver: true,
    }).start();
  };

  const sizeConfig = SIZE_CONFIG[size];
  const isDisabled = disabled || loading;
  const variantStyles = getVariantStyles(variant);

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
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
      </Pressable>
    </Animated.View>
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
