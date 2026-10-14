import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { StudioTheme, Fonts } from '@/constants/theme';
import { StudioIcon } from './StudioIcon';

interface StudioButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'gold' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  iconName?: string;
  iconTrailingName?: string;
  style?: ViewStyle | ViewStyle[];
  labelStyle?: TextStyle;
  fullWidth?: boolean;
}

export function StudioButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  iconName,
  iconTrailingName,
  style,
  labelStyle,
  fullWidth = true,
}: StudioButtonProps) {
  const getContainerStyle = () => {
    switch (variant) {
      case 'gold':
        return styles.goldBtn;
      case 'outline':
        return styles.outlineBtn;
      case 'ghost':
        return styles.ghostBtn;
      case 'danger':
        return styles.dangerBtn;
      case 'primary':
      default:
        return styles.primaryBtn;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'gold':
        return styles.goldText;
      case 'outline':
        return styles.outlineText;
      case 'ghost':
        return styles.ghostText;
      case 'danger':
        return styles.dangerText;
      case 'primary':
      default:
        return styles.primaryText;
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'gold':
        return StudioTheme.colors.onSecondary;
      case 'outline':
        return StudioTheme.colors.onSurface;
      case 'ghost':
        return StudioTheme.colors.onSurfaceVariant;
      case 'danger':
        return StudioTheme.colors.onError;
      case 'primary':
      default:
        return StudioTheme.colors.onPrimary;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return styles.sizeSm;
      case 'lg':
        return styles.sizeLg;
      case 'md':
      default:
        return styles.sizeMd;
    }
  };

  const getTextSizeStyle = () => {
    switch (size) {
      case 'sm':
        return styles.textSm;
      case 'lg':
        return styles.textLg;
      case 'md':
      default:
        return styles.textMd;
    }
  };

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 22 : 18;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.baseBtn,
        getSizeStyle(),
        getContainerStyle(),
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabledBtn,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? StudioTheme.colors.primary : '#FFFFFF'}
        />
      ) : (
        <View style={styles.contentRow}>
          {iconName ? (
            <StudioIcon name={iconName} size={iconSize} color={getIconColor()} style={styles.leadingIcon} />
          ) : null}
          <Text style={[styles.baseText, getTextSizeStyle(), getTextStyle(), labelStyle]}>
            {label}
          </Text>
          {iconTrailingName ? (
            <StudioIcon name={iconTrailingName} size={iconSize} color={getIconColor()} style={styles.trailingIcon} />
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseBtn: {
    borderRadius: StudioTheme.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    fontFamily: Fonts.sans,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  sizeSm: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sizeMd: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sizeLg: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  textSm: {
    fontSize: 11,
  },
  textMd: {
    fontSize: 13,
  },
  textLg: {
    fontSize: 14,
  },
  primaryBtn: {
    backgroundColor: StudioTheme.colors.primary,
  },
  primaryText: {
    color: StudioTheme.colors.onPrimary,
  },
  goldBtn: {
    backgroundColor: StudioTheme.colors.secondary,
  },
  goldText: {
    color: StudioTheme.colors.onSecondary,
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
  },
  outlineText: {
    color: StudioTheme.colors.onSurface,
  },
  ghostBtn: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: StudioTheme.colors.onSurfaceVariant,
  },
  dangerBtn: {
    backgroundColor: StudioTheme.colors.error,
  },
  dangerText: {
    color: StudioTheme.colors.onError,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  leadingIcon: {
    marginRight: 6,
  },
  trailingIcon: {
    marginLeft: 6,
  },
});
