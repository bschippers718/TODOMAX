import { AnimationId, ALL_ANIMATION_IDS } from './types';
import { PACKS, AnimationPack } from './packs';

/**
 * The Collection ("board") tracks which celebrations the user has actually
 * earned by finishing a task, versus merely previewed in the store, versus
 * never seen at all. Earned is the one that counts; previews just lift the
 * mystery on a tile.
 */

export interface EarnedEntry {
  count: number;
  firstAt: number;
  lastAt: number;
}

export interface CollectionState {
  earned: Partial<Record<AnimationId, EarnedEntry>>;
  previewed: Partial<Record<AnimationId, number>>;
  /** Last time the board was opened — anything earned after this is "new". */
  lastViewedAt: number;
}

export const EMPTY_COLLECTION: CollectionState = {
  earned: {},
  previewed: {},
  lastViewedAt: 0,
};

export type TileStatus = 'locked' | 'hidden' | 'previewed' | 'earned';

export interface AnimationMeta {
  /** SF Symbol shown on the tile. */
  symbol: string;
  /** One-line flavour text shown once the tile is revealed. */
  blurb: string;
}

export const ANIMATION_META: Record<AnimationId, AnimationMeta> = {
  // Errand Run
  errandComplete: { symbol: 'building.2.fill', blurb: 'A landmark shatters into shards.' },
  routeDrawn: { symbol: 'map.fill', blurb: 'Your route inks itself across the city.' },
  stopwatchStop: { symbol: 'stopwatch.fill', blurb: 'The clock runs down and freezes at zero.' },
  hydrantBlast: { symbol: 'drop.fill', blurb: 'A hydrant lets loose. Two or more in a day, on a Big stop.' },
  // Starter
  scorePop: { symbol: 'plus.circle.fill', blurb: 'Points pop and stack.' },
  streakCombo: { symbol: 'flame.fill', blurb: 'Your streak flares up.' },
  perfectStamp: { symbol: 'checkmark.seal.fill', blurb: 'PERFECT, stamped and sealed.' },
  rubberStamp: { symbol: 'seal.fill', blurb: 'A rubber stamp thuds down.' },
  singleConfetti: { symbol: 'party.popper.fill', blurb: 'One perfect piece of confetti.' },
  swordSlash: { symbol: 'bolt.fill', blurb: 'A slash cuts the screen in two.' },
  levelClear: { symbol: 'gamecontroller.fill', blurb: 'LEVEL CLEAR — arcade style.' },
  pixelPowerUp: { symbol: 'arrow.up.circle.fill', blurb: 'Power-up collected.' },
  // Game Day
  touchdown: { symbol: 'football.fill', blurb: 'Six points. Crowd goes wild.' },
  footballSpike: { symbol: 'arrow.down.to.line', blurb: 'Spike it in the end zone.' },
  halftimeBand: { symbol: 'music.note', blurb: 'The halftime band marches on.' },
  instantReplay: { symbol: 'arrow.counterclockwise', blurb: 'Let’s see that again.' },
  interception: { symbol: 'hand.raised.fill', blurb: 'Picked off at the line.' },
  trophyRaise: { symbol: 'trophy.fill', blurb: 'Hoist the hardware.' },
  // Garage
  carDash: { symbol: 'car.fill', blurb: 'Pedal down to the chequered flag.' },
  // Checkout
  cashRegister: { symbol: 'dollarsign.circle.fill', blurb: 'Ka-ching. Receipt printed.' },
};

export function getAnimationName(id: AnimationId): string {
  for (const pack of PACKS) {
    const n = pack.animationNames[id];
    if (n) return n;
  }
  return id;
}

export function getTileStatus(
  id: AnimationId,
  state: CollectionState,
  unlocked: boolean,
): TileStatus {
  if (!unlocked) return 'locked';
  if (state.earned[id]) return 'earned';
  if (state.previewed[id]) return 'previewed';
  return 'hidden';
}

export interface CollectionStats {
  total: number;
  earned: number;
  previewed: number;
  locked: number;
  /** Earned since the board was last opened. */
  fresh: number;
}

export function getCollectionStats(state: CollectionState, unlockedIds: AnimationId[]): CollectionStats {
  const unlocked = new Set(unlockedIds);
  let earned = 0;
  let previewed = 0;
  let fresh = 0;
  for (const id of ALL_ANIMATION_IDS) {
    const e = state.earned[id];
    if (e) {
      earned += 1;
      if (e.firstAt > state.lastViewedAt) fresh += 1;
    } else if (state.previewed[id] && unlocked.has(id)) {
      // A locked pack can be previewed from the store, but its tiles read "locked".
      previewed += 1;
    }
  }
  return {
    total: ALL_ANIMATION_IDS.length,
    earned,
    previewed,
    locked: ALL_ANIMATION_IDS.length - unlocked.size,
    fresh,
  };
}

export interface BoardSection {
  pack: AnimationPack;
  unlocked: boolean;
  earnedInPack: number;
}

export function getBoardSections(unlockedIds: AnimationId[], state: CollectionState): BoardSection[] {
  const unlocked = new Set(unlockedIds);
  return PACKS.map((pack) => ({
    pack,
    unlocked: pack.animations.every((id) => unlocked.has(id)),
    earnedInPack: pack.animations.filter((id) => state.earned[id]).length,
  }));
}
