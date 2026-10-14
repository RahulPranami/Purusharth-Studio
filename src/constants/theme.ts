/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1B1C19',
    background: '#FBF9F4',
    backgroundElement: '#F5F3EE',
    backgroundSelected: '#EAE8E3',
    textSecondary: '#444748',
    primary: '#171717',
    gold: '#755A2A',
    goldLight: '#FCD89C',
    hairline: '#E7E5DF',
  },
  dark: {
    text: '#F2F1EC',
    background: '#1B1C19',
    backgroundElement: '#252623',
    backgroundSelected: '#30312E',
    textSecondary: '#C4C7C7',
    primary: '#FFFFFF',
    gold: '#E5C188',
    goldLight: '#5B4315',
    hairline: '#3E403D',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Purusharth Studio Design System Tokens
 * Source of truth: stitch/purusharth_studio/DESIGN.md
 */
export const StudioTheme = {
  colors: {
    surface: '#FBF9F4',
    surfaceDim: '#DBDAD5',
    surfaceBright: '#FBF9F4',
    surfaceContainerLowest: '#FFFFFF',
    surfaceContainerLow: '#F5F3EE',
    surfaceContainer: '#F0EEE9',
    surfaceContainerHigh: '#EAE8E3',
    surfaceContainerHighest: '#E4E2DD',
    onSurface: '#1B1C19',
    onSurfaceVariant: '#444748',
    inverseSurface: '#30312E',
    inverseOnSurface: '#F2F1EC',
    primary: '#171717',
    onPrimary: '#FFFFFF',
    primaryContainer: '#1C1B1B',
    onPrimaryContainer: '#858383',
    secondary: '#755A2A',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#FCD89C',
    onSecondaryContainer: '#775D2D',
    secondaryFixed: '#FFDEA9',
    secondaryFixedDim: '#E5C188',
    outline: '#747878',
    outlineVariant: '#C4C7C7',
    hairline: '#E7E5DF',
    error: '#BA1A1A',
    onError: '#FFFFFF',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#93000A',
    success: '#1B4D3E',
    successSurface: '#EBF3EF',
    warning: '#8C6314',
    warningSurface: '#FAF4E8',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    marginMobile: 20,
    gutterMobile: 16,
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 9999,
  },
  shadows: {
    level0: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    level1: {
      shadowColor: '#1B1C19',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    level2: {
      shadowColor: '#1B1C19',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.07,
      shadowRadius: 20,
      elevation: 4,
    },
    level3: {
      shadowColor: '#1B1C19',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 32,
      elevation: 8,
    },
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'Plus Jakarta Sans',
    serif: 'Bodoni Moda',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
  web: {
    sans: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    serif: '"Bodoni Moda", Georgia, serif',
    rounded: '"Plus Jakarta Sans", sans-serif',
    mono: 'monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
