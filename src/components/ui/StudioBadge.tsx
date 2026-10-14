import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { StudioTheme, Fonts } from '@/constants/theme';
import { StudioIcon } from './StudioIcon';

interface StudioBadgeProps {
  label: string;
  variant?: 'gold' | 'success' | 'warning' | 'neutral' | 'danger';
  iconName?: string;
  showDot?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export function StudioBadge({
  label,
  variant = 'neutral',
  iconName,
  showDot = false,
  style,
}: StudioBadgeProps) {
  const getBadgeStyle = () => {
    switch (variant) {
      case 'gold':
        return {
          bg: StudioTheme.colors.secondaryContainer,
          text: StudioTheme.colors.onSecondaryContainer,
          dot: StudioTheme.colors.secondary,
        };
      case 'success':
        return {
          bg: StudioTheme.colors.successSurface,
          text: StudioTheme.colors.success,
          dot: StudioTheme.colors.success,
        };
      case 'warning':
        return {
          bg: StudioTheme.colors.warningSurface,
          text: StudioTheme.colors.warning,
          dot: StudioTheme.colors.warning,
        };
      case 'danger':
        return {
          bg: StudioTheme.colors.errorContainer,
          text: StudioTheme.colors.onErrorContainer,
          dot: StudioTheme.colors.error,
        };
      case 'neutral':
      default:
        return {
          bg: StudioTheme.colors.surfaceContainerHigh,
          text: StudioTheme.colors.onSurface,
          dot: StudioTheme.colors.outline,
        };
    }
  };

  const colors = getBadgeStyle();

  return (
    <View style={[styles.badgeContainer, { backgroundColor: colors.bg }, style]}>
      {showDot && <View style={[styles.dot, { backgroundColor: colors.dot }]} />}
      {iconName && (
        <StudioIcon name={iconName} size={12} color={colors.text} style={styles.badgeIcon} />
      )}
      <Text style={[styles.badgeText, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: StudioTheme.radius.full,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: StudioTheme.radius.full,
    marginRight: 5,
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
