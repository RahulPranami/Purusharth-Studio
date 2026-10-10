import React from 'react';
import { Platform, Text, TextStyle } from 'react-native';

interface AdminIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: TextStyle;
}

export function AdminIcon({ name, size = 20, color = '#141b2b', style }: AdminIconProps) {
  if (Platform.OS === 'web') {
    return (
      <Text
        style={[
          {
            fontFamily: 'Material Symbols Outlined, sans-serif',
            fontSize: size,
            color,
            lineHeight: size,
            userSelect: 'none',
          } as TextStyle,
          style,
        ]}
      >
        {name}
      </Text>
    );
  }

  // Fallback for native if font isn't linked
  return (
    <Text
      style={[
        {
          fontSize: size,
          color,
          lineHeight: size,
        },
        style,
      ]}
    >
      •
    </Text>
  );
}
