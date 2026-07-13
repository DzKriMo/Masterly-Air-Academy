import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
}

const VARIANT_CONFIG: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: 'rgba(34, 197, 94, 0.15)', text: colors.status.success },
  warning: { bg: 'rgba(245, 158, 11, 0.15)', text: colors.status.warning },
  error: { bg: 'rgba(239, 68, 68, 0.15)', text: colors.status.error },
  info: { bg: 'rgba(59, 130, 246, 0.15)', text: colors.status.info },
  default: { bg: 'rgba(148, 163, 184, 0.15)', text: colors.text.secondary },
};

const SIZE_CONFIG: Record<BadgeSize, { paddingV: number; paddingH: number; fontSize: number }> = {
  sm: { paddingV: 2, paddingH: 8, fontSize: 11 },
  md: { paddingV: 4, paddingH: 12, fontSize: 13 },
};

export function Badge({
  label,
  variant = 'default',
  size = 'sm',
  style,
}: BadgeProps) {
  const variantConfig = VARIANT_CONFIG[variant];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: variantConfig.bg,
          paddingVertical: sizeConfig.paddingV,
          paddingHorizontal: sizeConfig.paddingH,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: variantConfig.text, fontSize: sizeConfig.fontSize }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 100,
  },
  label: {
    fontWeight: '600',
  },
});
