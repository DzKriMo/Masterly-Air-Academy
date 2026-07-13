import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { colors } from '@/constants/colors';

interface HeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  style?: ViewStyle;
}

export function Header({
  title,
  subtitle,
  rightAction,
  showBack = false,
  onBack,
  style,
}: HeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.leftSection}>
        {showBack && onBack && (
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.text.primary} />
          </Pressable>
        )}
        <View style={styles.titleSection}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightAction && <View style={styles.rightSection}>{rightAction}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.navy[900],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.navy[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 1,
  },
  rightSection: {
    marginLeft: 12,
  },
});
