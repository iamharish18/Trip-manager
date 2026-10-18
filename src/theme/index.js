// Builds React Native Paper (Material 3) themes from our color tokens.
// Paper components use the MD3 names; our own components use `theme.app`.

import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, useTheme } from 'react-native-paper';

import { darkColors, lightColors } from './colors';

function buildTheme(base, c) {
  return {
    ...base,
    roundness: 3,
    colors: {
      ...base.colors,
      primary: c.primary,
      onPrimary: c.onPrimary,
      primaryContainer: c.primaryTint,
      onPrimaryContainer: c.text,
      secondary: c.primary,
      onSecondary: c.onPrimary,
      secondaryContainer: c.primaryTint,
      onSecondaryContainer: c.text,
      background: c.background,
      onBackground: c.text,
      surface: c.card,
      onSurface: c.text,
      surfaceVariant: c.card,
      onSurfaceVariant: c.muted,
      outline: c.border,
      outlineVariant: c.border,
      error: c.negative,
      onError: c.onPrimary,
      inverseSurface: c.text,
      inverseOnSurface: c.background,
      inversePrimary: c.primaryTint,
      elevation: {
        ...base.colors.elevation,
        level1: c.card,
        level2: c.card,
        level3: c.card,
      },
    },
    app: c,
  };
}

export const lightTheme = buildTheme(MD3LightTheme, lightColors);
export const darkTheme = buildTheme(MD3DarkTheme, darkColors);

// Follows the phone's light/dark setting.
export function useAppThemeForScheme() {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}

// Current theme inside screens and components.
export const useAppTheme = useTheme;
