import { AnimationId } from './types';

/**
 * Celebration Packs
 *
 * A pack is a themed bundle of celebration animations. Free packs are always
 * unlocked; paid packs unlock after purchase. Purchases here are mocked (see
 * hooks/usePacks.ts) — the shape is deliberately the same as what a StoreKit /
 * RevenueCat integration would return so it can be swapped in without touching UI.
 */

export type PackId = 'starter' | 'errands' | 'sports' | 'cars' | 'shopping';

export interface AnimationPack {
  id: PackId;
  name: string;
  tagline: string;
  description: string;
  /** Display price. `null` means free. */
  price: string | null;
  /** Hex accent used for the pack card. */
  accent: string;
  /** Line colour in the Signal style (see lib/theme.ts SIGNAL_LINES). */
  signalAccent: string;
  /** Single glyph shown on the card (kept to text so there's no icon dependency). */
  glyph: string;
  animations: AnimationId[];
  /** Human-readable names for each animation, for the pack detail list. */
  animationNames: Partial<Record<AnimationId, string>>;
  /** Marks the hero pack on the store screen. */
  featured?: boolean;
  /** Number of animations promised but not yet shipped — shown as "+N coming". */
  comingSoon?: number;
}

export const FREE_PACK_IDS: PackId[] = ['starter', 'errands'];

export const PACKS: AnimationPack[] = [
  {
    id: 'errands',
    name: 'Errand Run',
    tagline: 'Your day is a route across the city.',
    description:
      'Pixel Manhattan, shattering landmarks, planted flags and a stopwatch that beats the clock. The signature ToDOMax set.',
    price: null,
    accent: '#E3221B',
    signalAccent: '#EE352E', // Stop Red
    glyph: '⚑',
    featured: true,
    animations: ['errandComplete', 'routeDrawn', 'stopwatchStop'],
    animationNames: {
      errandComplete: 'Errand Complete',
      routeDrawn: 'Route Cleared',
      stopwatchStop: 'Beat the Clock',
    },
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Stamps, confetti and arcade pops.',
    description: 'The everyday set. Quick, punchy and always on.',
    price: null,
    accent: '#178C55',
    signalAccent: '#00933C', // Go Green
    glyph: '✓',
    animations: [
      'scorePop',
      'streakCombo',
      'perfectStamp',
      'rubberStamp',
      'singleConfetti',
      'swordSlash',
      'levelClear',
      'pixelPowerUp',
    ],
    animationNames: {
      scorePop: 'Score Pop',
      streakCombo: 'Streak Combo',
      perfectStamp: 'Perfect Stamp',
      rubberStamp: 'Rubber Stamp',
      singleConfetti: 'Single Confetti',
      swordSlash: 'Sword Slash',
      levelClear: 'Level Clear',
      pixelPowerUp: 'Pixel Power-Up',
    },
  },
  {
    id: 'sports',
    name: 'Game Day',
    tagline: 'Every finished task is a touchdown.',
    description:
      'Tecmo-style touchdowns, spikes, interceptions, instant replays and the halftime band.',
    price: '$1.99',
    accent: '#0058F8',
    signalAccent: '#0039A6', // Express Blue
    glyph: '🏈',
    animations: [
      'touchdown',
      'footballSpike',
      'halftimeBand',
      'instantReplay',
      'interception',
      'trophyRaise',
    ],
    animationNames: {
      touchdown: 'Touchdown',
      footballSpike: 'Football Spike',
      halftimeBand: 'Halftime Band',
      instantReplay: 'Instant Replay',
      interception: 'Interception',
      trophyRaise: 'Trophy Raise',
    },
  },
  {
    id: 'cars',
    name: 'Garage',
    tagline: 'Floor it to the finish line.',
    description: 'Pixel sedans, checkered flags, burnouts and the open road.',
    price: '$1.99',
    accent: '#D9772B',
    signalAccent: '#FF6319', // Transfer Orange
    glyph: '🚗',
    animations: ['carDash'],
    animationNames: { carDash: 'Finish Line' },
    comingSoon: 2,
  },
  {
    id: 'shopping',
    name: 'Checkout',
    tagline: 'Ring it up. Cross it off.',
    description: 'Receipts that print your win, cash drawers that pop, coins that fly.',
    price: '$1.99',
    accent: '#8A5BD6',
    signalAccent: '#B933AD', // Local Purple
    glyph: '🧾',
    animations: ['cashRegister'],
    animationNames: { cashRegister: 'Ka-Ching' },
    comingSoon: 2,
  },
];

export const PACKS_BY_ID: Record<PackId, AnimationPack> = PACKS.reduce(
  (acc, pack) => {
    acc[pack.id] = pack;
    return acc;
  },
  {} as Record<PackId, AnimationPack>,
);

/** The pack's accent in the current visual style. */
export function packAccent(pack: AnimationPack, isSignal: boolean): string {
  return isSignal ? pack.signalAccent : pack.accent;
}

export function getPackForAnimation(id: AnimationId): AnimationPack | undefined {
  return PACKS.find((p) => p.animations.includes(id));
}

/** Every animation the user is allowed to see, given which packs they own. */
export function getUnlockedAnimationIds(ownedPacks: PackId[]): AnimationId[] {
  const unlocked = new Set<PackId>([...FREE_PACK_IDS, ...ownedPacks]);
  return PACKS.filter((p) => unlocked.has(p.id)).flatMap((p) => p.animations);
}
