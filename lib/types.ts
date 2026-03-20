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
}

export const DEFAULT_SETTINGS: Settings = {
  soundLevel: 'full',
  hapticsEnabled: true,
  animationMode: 'full',
};

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
  | 'interception';

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

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
