export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
  difficulty?: 'normal' | 'hard';
}

export interface Settings {
  soundLevel: 'silent' | 'subtle' | 'full';
  hapticsEnabled: boolean;
  animationMode: 'full' | 'minimal' | 'quiet';
  customBackgroundUri: string | null;
  /** Visual direction — see lib/theme.ts. */
  style: 'classic' | 'signal';
  /** After this hour (24h) until 6am, celebrations drop to Minimal. */
  quietHoursEnabled: boolean;
  quietHoursStart: 20 | 21 | 22 | 23;
}

export const DEFAULT_SETTINGS: Settings = {
  soundLevel: 'full',
  hapticsEnabled: true,
  animationMode: 'full',
  customBackgroundUri: null,
  style: 'signal',
  quietHoursEnabled: false,
  quietHoursStart: 21,
};

/** Quiet hours run from `start` until 6am. */
export function isQuietHour(settings: Settings, now = new Date()): boolean {
  if (!settings.quietHoursEnabled) return false;
  const h = now.getHours();
  return h >= settings.quietHoursStart || h < 6;
}

/**
 * Striking several tasks in quick succession shouldn't mean several movies.
 * Within this window of the last celebration ending, play the minimal version.
 */
export const CELEBRATION_COOLDOWN_MS = 20_000;

export type AnimationId =
  | 'touchdown'
  | 'scorePop'
  | 'streakCombo'
  | 'perfectStamp'
  | 'footballSpike'
  | 'swordSlash'
  | 'rubberStamp'
  | 'trophyRaise'
  | 'singleConfetti'
  | 'halftimeBand'
  | 'instantReplay'
  | 'interception'
  | 'levelClear'
  | 'pixelPowerUp'
  // Errand Run (Animation Kit style)
  | 'errandComplete'
  | 'routeDrawn'
  | 'stopwatchStop'
  // Garage pack
  | 'carDash'
  // Checkout pack
  | 'cashRegister';

export const ALL_ANIMATION_IDS: AnimationId[] = [
  'touchdown',
  'scorePop',
  'streakCombo',
  'perfectStamp',
  'footballSpike',
  'swordSlash',
  'rubberStamp',
  'trophyRaise',
  'singleConfetti',
  'halftimeBand',
  'instantReplay',
  'interception',
  'levelClear',
  'pixelPowerUp',
  'errandComplete',
  'routeDrawn',
  'stopwatchStop',
  'carDash',
  'cashRegister',
];

export interface CelebrationAnimationProps {
  onComplete: () => void;
  streak?: number;
}

// Clean app UI palette (Apple-inspired light theme)
export const COLORS = {
  bg: '#FAFAF8',
  card: '#FFFFFF',
  cardBorder: '#E8E5DE',
  cream: '#F5F1E8',
  text: '#1A1A1A',
  textSecondary: '#8E8E93',
  red: '#FF3B30',
  green: '#34C759',
  blue: '#007AFF',
  white: '#FFFFFF',
  dimmed: '#AEAEB2',
  accent: '#FF9500',
  separator: '#E5E5EA',
} as const;

// Wild palette used only by celebration animations (they take over the screen)
export const ANIM_COLORS = {
  bg: '#0a0a0a',
  card: '#1a1a1a',
  cardBorder: '#2a2a2a',
  cream: '#FCF5C7',
  red: '#F83800',
  green: '#00B800',
  blue: '#0058F8',
  white: '#FFFFFF',
  dimmed: '#666666',
  accent: '#FFD700',
} as const;

// Palette lifted from the Animation Kit (pixel Manhattan, red banners, LCD watch)
export const KIT_COLORS = {
  sky: '#3F8FD6',
  water: '#2F7CC4',
  bannerRed: '#E3221B',
  bannerYellow: '#E8D21C',
  bannerShadow: '#1B1B1B',
  typeGreen: '#1FD36A',
  route: '#F6E21A',
  cream: '#FFF7E0',
  ink: '#161616',
  // building shards
  shardBlue: '#6FA3D1',
  shardBlueDark: '#3E6E9E',
  shardGreen: '#4F9A3A',
  shardGray: '#C9D3DC',
  // LCD
  lcd: '#B7C4B0',
  lcdInk: '#1E2A22',
  watchBody: '#1A1E2A',
  watchTrim: '#4A90E2',
  // road
  asphalt: '#2E2E33',
  curb: '#F2E7C9',
} as const;

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
