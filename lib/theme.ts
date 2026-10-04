import { useColorScheme, ViewStyle, TextStyle } from 'react-native';
import { useSettings } from '../hooks/useSettings';

export type ColorScheme = 'light' | 'dark';

/**
 * Visual direction. `classic` is the original warm-paper + pixel-Manhattan look;
 * `signal` is the NYC-transit-signage direction from design/styleguides/01-signal.html:
 * paper, ink, one Route Yellow, hard offset shadows, line colours used as meaning.
 */
export type StyleId = 'classic' | 'signal';

export interface Theme {
  style: StyleId;
  isSignal: boolean;
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
  /** Brand gold — eyebrow, streak, prompt pip. Route Yellow in Signal. */
  gold: string;
  goldSoft: string;
  /** Ink that sits on top of `gold` (yellow needs dark ink, classic gold reads on cream). */
  onGold: string;
  green: string;
  blue: string;
  /** Extra line colours; only Signal gives them meaning. */
  orange: string;
  purple: string;
  grey: string;
  /** Primary filled button (add, choose photo). */
  buttonFill: string;
  buttonText: string;
  shadow: string;
  /** Wash laid over the map so content reads. */
  mapWash: string;
  /** Translucent fill behind the composer at the bottom. */
  composerBg: string;
  mapAsset: number;
  /** Whether the pixel-Manhattan wallpaper is drawn behind the list. */
  showMap: boolean;

  // ---- Shape & type tokens -------------------------------------------------
  /** Card / row corner radius. */
  radiusCard: number;
  /** Buttons, inputs, icon buttons. */
  radiusControl: number;
  /** Small tags and stamps. */
  radiusTag: number;
  /** Pills (price capsules, chips). Signal squares them off. */
  radiusPill: number;
  /** Border weight on cards and controls. */
  borderWidth: number;
  /** Colour of card / control borders. Ink in Signal, soft in Classic. */
  cardBorder: string;
  /** Hard offset shadow (Signal) vs soft blurred shadow (Classic). */
  shadowCard: ViewStyle;
  shadowControl: ViewStyle;
  shadowNone: ViewStyle;
  /** Press feedback: drop onto the shadow (Signal) or squash (Classic). */
  pressStyle: 'drop' | 'scale';
  /** Headline / app-name face. */
  fontDisplay: TextStyle;
  /** Task text face. */
  fontTask: TextStyle;
  /** Tiny uppercase stamps (TODAY, STREAK, DONE). */
  fontLabel: TextStyle;
}

const mapLight = require('../assets/kit/bg-map.jpg');
const mapDark = require('../assets/kit/bg-map-dark.jpg');

const SOFT_SHADOW = (color: string): ViewStyle => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.09,
  shadowRadius: 12,
  elevation: 2,
});
const SOFT_SHADOW_CONTROL = (color: string): ViewStyle => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
});
const HARD_SHADOW = (color: string, size: number): ViewStyle => ({
  shadowColor: color,
  shadowOffset: { width: size, height: size },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 3,
});
const NO_SHADOW: ViewStyle = { shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 0 };

const CLASSIC_SHAPE = {
  radiusCard: 14,
  radiusControl: 12,
  radiusTag: 4,
  radiusPill: 999,
  borderWidth: 1,
  pressStyle: 'scale' as const,
  fontDisplay: { fontWeight: '800', letterSpacing: -1.1 } as TextStyle,
  fontTask: { fontWeight: '700' } as TextStyle,
  fontLabel: { fontWeight: '900', letterSpacing: 1.2 } as TextStyle,
};

const SIGNAL_SHAPE = {
  radiusCard: 5,
  radiusControl: 5,
  radiusTag: 2,
  radiusPill: 4,
  borderWidth: 2.5,
  pressStyle: 'drop' as const,
  fontDisplay: { fontFamily: 'Archivo_900Black', fontWeight: '900', letterSpacing: -1.2 } as TextStyle,
  fontTask: { fontFamily: 'Archivo_700Bold', fontWeight: '700', letterSpacing: -0.2 } as TextStyle,
  fontLabel: { fontFamily: 'PressStart2P', fontWeight: '400', letterSpacing: 0 } as TextStyle,
};

export const LIGHT: Theme = {
  style: 'classic',
  isSignal: false,
  scheme: 'light',
  isDark: false,
  bg: '#F7F1E4',
  surface: 'rgba(255, 252, 244, 0.92)',
  surfaceSoft: 'rgba(247, 241, 228, 0.78)',
  inputBg: 'rgba(255, 252, 244, 0.9)',
  text: '#221F1A',
  textSecondary: '#68707A',
  // Hint copy is set in this; it has to clear AA on cream.
  textTertiary: '#7A7267',
  border: 'rgba(34, 31, 26, 0.1)',
  borderStrong: 'rgba(34, 31, 26, 0.16)',
  separator: 'rgba(34, 31, 26, 0.08)',
  accent: '#E5392D',
  gold: '#D99A21',
  goldSoft: 'rgba(217, 154, 33, 0.14)',
  onGold: '#D99A21',
  green: '#178C55',
  blue: '#007AFF',
  orange: '#D9772B',
  purple: '#8A5BD6',
  grey: '#9C9285',
  buttonFill: '#221F1A',
  buttonText: '#FFFFFF',
  shadow: '#564025',
  mapWash: 'rgba(241, 230, 210, 0.14)',
  composerBg: 'rgba(247, 241, 228, 0.82)',
  mapAsset: mapLight,
  showMap: true,
  ...CLASSIC_SHAPE,
  cardBorder: 'rgba(34, 31, 26, 0.16)',
  shadowCard: SOFT_SHADOW('#564025'),
  shadowControl: SOFT_SHADOW_CONTROL('#564025'),
  shadowNone: NO_SHADOW,
};

export const DARK: Theme = {
  style: 'classic',
  isSignal: false,
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
  onGold: '#F2B544',
  green: '#3DCB82',
  blue: '#0A84FF',
  orange: '#F08A3E',
  purple: '#A98BE8',
  grey: '#737A8A',
  buttonFill: '#F4EFE6',
  buttonText: '#10121C',
  shadow: '#000000',
  mapWash: 'rgba(16, 18, 28, 0.2)',
  composerBg: 'rgba(16, 18, 28, 0.84)',
  mapAsset: mapDark,
  showMap: true,
  ...CLASSIC_SHAPE,
  cardBorder: 'rgba(255, 255, 255, 0.16)',
  shadowCard: SOFT_SHADOW('#000000'),
  shadowControl: SOFT_SHADOW_CONTROL('#000000'),
  shadowNone: NO_SHADOW,
};

// ---- Signal ----------------------------------------------------------------
// MTA line colours. Each one means something; none is decorative.
export const SIGNAL_LINES = {
  paper: '#F6F3EC',
  enamel: '#FFFFFF',
  ink: '#0B0B0C',
  routeYellow: '#FCCC0A',
  stopRed: '#EE352E',
  goGreen: '#00933C',
  expressBlue: '#0039A6',
  transferOrange: '#FF6319',
  localPurple: '#B933AD',
  shuttleGrey: '#808183',
} as const;

export const SIGNAL_LIGHT: Theme = {
  style: 'signal',
  isSignal: true,
  scheme: 'light',
  isDark: false,
  bg: SIGNAL_LINES.paper,
  surface: SIGNAL_LINES.enamel,
  surfaceSoft: SIGNAL_LINES.enamel,
  inputBg: SIGNAL_LINES.enamel,
  text: SIGNAL_LINES.ink,
  textSecondary: '#4A4A4D',
  // Shuttle grey reads fine as a swatch but not as 12pt copy on paper.
  textTertiary: '#5F6063',
  border: 'rgba(11, 11, 12, 0.14)',
  borderStrong: SIGNAL_LINES.ink,
  separator: 'rgba(11, 11, 12, 0.12)',
  accent: SIGNAL_LINES.stopRed,
  gold: SIGNAL_LINES.routeYellow,
  goldSoft: SIGNAL_LINES.routeYellow,
  onGold: SIGNAL_LINES.ink,
  green: SIGNAL_LINES.goGreen,
  blue: SIGNAL_LINES.expressBlue,
  orange: SIGNAL_LINES.transferOrange,
  purple: SIGNAL_LINES.localPurple,
  grey: SIGNAL_LINES.shuttleGrey,
  buttonFill: SIGNAL_LINES.routeYellow,
  buttonText: SIGNAL_LINES.ink,
  shadow: SIGNAL_LINES.ink,
  mapWash: 'transparent',
  composerBg: SIGNAL_LINES.paper,
  mapAsset: mapLight,
  showMap: false,
  ...SIGNAL_SHAPE,
  cardBorder: SIGNAL_LINES.ink,
  shadowCard: HARD_SHADOW(SIGNAL_LINES.ink, 4),
  shadowControl: HARD_SHADOW(SIGNAL_LINES.ink, 3),
  shadowNone: NO_SHADOW,
};

// Dark flips paper/ink and keeps every line colour as-is. True black, not iOS grey.
export const SIGNAL_DARK: Theme = {
  ...SIGNAL_LIGHT,
  scheme: 'dark',
  isDark: true,
  bg: '#000000',
  surface: '#000000',
  surfaceSoft: '#000000',
  inputBg: '#000000',
  text: '#FFFFFF',
  textSecondary: '#C9C9CC',
  textTertiary: SIGNAL_LINES.shuttleGrey,
  border: 'rgba(255, 255, 255, 0.18)',
  borderStrong: '#FFFFFF',
  separator: 'rgba(255, 255, 255, 0.16)',
  shadow: '#FFFFFF',
  composerBg: '#000000',
  mapAsset: mapDark,
  cardBorder: '#FFFFFF',
  shadowCard: HARD_SHADOW('#FFFFFF', 4),
  shadowControl: HARD_SHADOW('#FFFFFF', 3),
};

export function themeFor(style: StyleId, scheme: string | null | undefined): Theme {
  const dark = scheme === 'dark';
  if (style === 'signal') return dark ? SIGNAL_DARK : SIGNAL_LIGHT;
  return dark ? DARK : LIGHT;
}

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const { settings } = useSettings();
  return themeFor(settings.style, scheme);
}

/** iOS default spring — what UIKit's interactive animations feel like. */
export const IOS_SPRING = { damping: 20, stiffness: 220, mass: 0.8 } as const;
export const IOS_SPRING_SNAPPY = { damping: 18, stiffness: 300, mass: 0.7 } as const;

/**
 * The loud voice: Route Yellow type with a Stop Red hard shadow, the way a
 * paperback cover shouts over a skyline. Reserved for moments that have been
 * earned — the board is clear, or you've just arrived. Never the daily chrome.
 */
export function loudType(theme: Theme): TextStyle {
  if (!theme.isSignal) return {};
  return {
    color: theme.gold,
    textShadowColor: theme.accent,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  };
}
