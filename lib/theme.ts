import { useColorScheme } from 'react-native';

export type ColorScheme = 'light' | 'dark';

export interface Theme {
  scheme: ColorScheme;
  isDark: boolean;
  /** Screen background behind the map. */
  bg: string;
  /** Opaque-ish card surface. */
  surface: string;
  /** Softer translucent surface (completed section, empty state). */
  surfaceSoft: string;
  /** Input field fill. */
  inputBg: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderStrong: string;
  separator: string;
  /** Brand red — strike-out ink, destructive, links. */
  accent: string;
  /** Brand gold — eyebrow, streak, prompt pip. */
  gold: string;
  goldSoft: string;
  green: string;
  blue: string;
  /** Primary filled button (add, choose photo). */
  buttonFill: string;
  buttonText: string;
  shadow: string;
  /** Wash laid over the map so content reads. */
  mapWash: string;
  /** Translucent fill behind the composer at the bottom. */
  composerBg: string;
  mapAsset: number;
}

const mapLight = require('../assets/kit/bg-map.jpg');
const mapDark = require('../assets/kit/bg-map-dark.jpg');

export const LIGHT: Theme = {
  scheme: 'light',
  isDark: false,
  bg: '#F7F1E4',
  surface: 'rgba(255, 252, 244, 0.92)',
  surfaceSoft: 'rgba(247, 241, 228, 0.78)',
  inputBg: 'rgba(255, 252, 244, 0.9)',
  text: '#221F1A',
  textSecondary: '#68707A',
  textTertiary: '#9C9285',
  border: 'rgba(34, 31, 26, 0.1)',
  borderStrong: 'rgba(34, 31, 26, 0.16)',
  separator: 'rgba(34, 31, 26, 0.08)',
  accent: '#E5392D',
  gold: '#D99A21',
  goldSoft: 'rgba(217, 154, 33, 0.14)',
  green: '#178C55',
  blue: '#007AFF',
  buttonFill: '#221F1A',
  buttonText: '#FFFFFF',
  shadow: '#564025',
  mapWash: 'rgba(241, 230, 210, 0.14)',
  composerBg: 'rgba(247, 241, 228, 0.82)',
  mapAsset: mapLight,
};

export const DARK: Theme = {
  scheme: 'dark',
  isDark: true,
  bg: '#10121C',
  surface: 'rgba(32, 35, 48, 0.94)',
  surfaceSoft: 'rgba(22, 25, 36, 0.78)',
  inputBg: 'rgba(32, 35, 48, 0.92)',
  text: '#F4EFE6',
  textSecondary: '#A9AEBC',
  textTertiary: '#737A8A',
  border: 'rgba(255, 255, 255, 0.1)',
  borderStrong: 'rgba(255, 255, 255, 0.16)',
  separator: 'rgba(255, 255, 255, 0.08)',
  accent: '#FF5A4E',
  gold: '#F2B544',
  goldSoft: 'rgba(242, 181, 68, 0.16)',
  green: '#3DCB82',
  blue: '#0A84FF',
  buttonFill: '#F4EFE6',
  buttonText: '#10121C',
  shadow: '#000000',
  mapWash: 'rgba(16, 18, 28, 0.2)',
  composerBg: 'rgba(16, 18, 28, 0.84)',
  mapAsset: mapDark,
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DARK : LIGHT;
}

/** iOS default spring — what UIKit's interactive animations feel like. */
export const IOS_SPRING = { damping: 20, stiffness: 220, mass: 0.8 } as const;
export const IOS_SPRING_SNAPPY = { damping: 18, stiffness: 300, mass: 0.7 } as const;
