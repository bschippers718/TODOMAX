/** How big a job it is. Bigger signs for bigger stops; the strike earns more. */
export type TaskSize = 's' | 'm' | 'l' | 'xl';

/** Which route line a task sits on — colour as category. */
export type LineId = 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'yellow' | 'grey';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
  difficulty?: 'normal' | 'hard';
  size?: TaskSize;
  line?: LineId;
  /** Position on the Map canvas, in canvas points. Assigned on first visit. */
  pos?: { x: number; y: number };
  /** Upstream stops: this task comes after these. */
  after?: string[];
  /**
   * The mark that struck it, so the struck card shows *your* line. Flat
   * [x, y, w, ...]: x and y as fractions of the card's width and height,
   * w the pen width in points.
   */
  ink?: number[];
}

export const TASK_SIZES: TaskSize[] = ['s', 'm', 'l', 'xl'];
export const TASK_SIZE_LABEL: Record<TaskSize, string> = { s: 'Small', m: 'Medium', l: 'Big', xl: 'Massive' };

/** Big and Massive share the display treatment; Massive goes further. */
export function isBig(size: TaskSize): boolean {
  return size === 'l' || size === 'xl';
}

export function taskSize(t: Pick<Task, 'size'>): TaskSize {
  return t.size ?? 'm';
}

/** Open upstream stops for `t`, i.e. what still has to happen first. */
export function openUpstream(t: Task, all: Task[]): Task[] {
  if (!t.after?.length) return [];
  return t.after.map((id) => all.find((x) => x.id === id)).filter((x): x is Task => Boolean(x) && !x!.completed);
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
  /** First-launch choices made. */
  onboarded: boolean;
  /**
   * Packs whose celebrations are in rotation. `null` means every owned pack.
   * Owning a pack and playing from it are separate: you can keep Game Day
   * in your Collection without ever seeing a touchdown.
   */
  enabledPacks: string[] | null;
}

export const DEFAULT_SETTINGS: Settings = {
  soundLevel: 'full',
  hapticsEnabled: true,
  animationMode: 'full',
  customBackgroundUri: null,
  style: 'signal',
  quietHoursEnabled: false,
  quietHoursStart: 21,
  onboarded: false,
  enabledPacks: null,
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
  | 'hydrantBlast'
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
  'hydrantBlast',
  'carDash',
  'cashRegister',
];

/**
 * Some celebrations only make sense once the day is going well. A hydrant
 * blast for your first strike of the morning is a bit much; for your third
 * it's earned. Unlisted animations are always eligible.
 */
export const ANIMATION_MIN_STREAK: Partial<Record<AnimationId, number>> = {
  hydrantBlast: 2,
};

/**
 * How big the moment is. Decided by the size of the stop, so a small errand
 * gets a glimpse and a massive one gets the whole show.
 *
 *   glimpse  — a ~1s cut of the scene, no banner hold
 *   scene    — the full scene
 *   feature  — the full scene; the signature pieces live here and up
 *   massive  — feature, then a held end card with the stop's name
 */
export type CelebrationTier = 'glimpse' | 'scene' | 'feature' | 'massive';

export const TIER_RANK: Record<CelebrationTier, number> = { glimpse: 0, scene: 1, feature: 2, massive: 3 };

export function tierForSize(size: TaskSize): CelebrationTier {
  switch (size) {
    case 's':
      return 'glimpse';
    case 'm':
      return 'scene';
    case 'l':
      return 'feature';
    case 'xl':
      return 'massive';
  }
}

/**
 * The long, elaborate scenes wait for a Big stop. A Medium draws from the
 * rest, so the difference between sizes is one you can see. Soft floor: if a
 * pack has nothing else, the shuffle still plays what it has.
 */
export const ANIMATION_MIN_TIER: Partial<Record<AnimationId, CelebrationTier>> = {
  errandComplete: 'feature',
  routeDrawn: 'feature',
  hydrantBlast: 'feature',
  touchdown: 'feature',
  trophyRaise: 'feature',
  levelClear: 'feature',
};

export function isAnimationEligible(id: AnimationId, streak: number, tier: CelebrationTier = 'feature'): boolean {
  if (streak < (ANIMATION_MIN_STREAK[id] ?? 0)) return false;
  return TIER_RANK[tier] >= TIER_RANK[ANIMATION_MIN_TIER[id] ?? 'glimpse'];
}

/** How long the Massive end card holds after the scene. */
export const MASSIVE_HOLD_MS = 1600;

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
