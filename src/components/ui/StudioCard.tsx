import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { StudioTheme } from '@/constants/theme';

interface StudioCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'elevated' | 'low' | 'high';
}

export function StudioCard({ children, style, variant = 'elevated' }: StudioCardProps) {
  return (
    <View
      style={[
        styles.cardBase,
        variant === 'elevated' && styles.cardElevated,
        variant === 'low' && styles.cardLow,
        variant === 'high' && styles.cardHigh,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cardBase: {
    borderRadius: StudioTheme.radius.xl,
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
    padding: StudioTheme.spacing.md,
    overflow: 'hidden',
  },
  cardElevated: {
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    ...StudioTheme.shadows.level1,
  },
  cardLow: {
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    ...StudioTheme.shadows.level0,
  },
  cardHigh: {
    backgroundColor: StudioTheme.colors.surfaceContainerHigh,
    ...StudioTheme.shadows.level2,
  },
});
