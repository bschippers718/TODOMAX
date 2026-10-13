import { Task, TaskSize, taskSize } from './types';

/**
 * Points mirror stop size — the same ladder that drives celebration weight.
 * Bonuses are small, named, and never bigger than a Medium, so the size you
 * picked still decides the day.
 *
 *   Small    10   glimpse
 *   Medium   25   scene
 *   Big      50   feature
 *   Massive 100   massive
 *
 *   Carried   +10  (created before today, still open when struck)
 *   Combo     +5 per earlier strike today, capped at +40
 *   Cleared   +50  (last open stop of the day)
 */

export const SIZE_POINTS: Record<TaskSize, number> = {
  s: 10,
  m: 25,
  l: 50,
  xl: 100,
};

export const CARRIED_BONUS = 10;
export const COMBO_STEP = 5;
export const COMBO_CAP = 40;
export const CLEAR_BONUS = 50;

export type ScoreAward = {
  base: number;
  carried: number;
  combo: number;
  clear: number;
  total: number;
};

export type ScoreState = {
  dayKey: string;
  dayScore: number;
  weekKey: string;
  weekScore: number;
  dayHigh: number;
  dayHighKey: string | null;
  weekHigh: number;
  weekHighKey: string | null;
};

export const EMPTY_SCORE: ScoreState = {
  dayKey: '',
  dayScore: 0,
  weekKey: '',
  weekScore: 0,
  dayHigh: 0,
  dayHighKey: null,
  weekHigh: 0,
  weekHighKey: null,
};

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Monday-start week id = that Monday's dayKey. */
export function weekKey(ts: number): string {
  const d = new Date(ts);
  const day = d.getDay(); // 0 Sun … 6 Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  d.setHours(12, 0, 0, 0);
  return dayKey(d.getTime());
}

export function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export type StrikeScoreContext = {
  /** Strikes already completed today, before this one. */
  priorToday: number;
  /** Open stops remaining after this strike. */
  remainingAfter: number;
  now?: number;
};

/** Points for one strike. Pure — no persistence. */
export function scoreStrike(task: Pick<Task, 'size' | 'createdAt'>, ctx: StrikeScoreContext): ScoreAward {
  const now = ctx.now ?? Date.now();
  const base = SIZE_POINTS[taskSize(task)];
  const carried = task.createdAt < startOfLocalDay(now) ? CARRIED_BONUS : 0;
  const combo = Math.min(COMBO_CAP, Math.max(0, ctx.priorToday) * COMBO_STEP);
  const clear = ctx.remainingAfter === 0 ? CLEAR_BONUS : 0;
  return { base, carried, combo, clear, total: base + carried + combo + clear };
}

/** Roll period keys forward and bank highs before adding/revoking points. */
export function rollScoreState(state: ScoreState, now = Date.now()): ScoreState {
  const dk = dayKey(now);
  const wk = weekKey(now);
  let next = state;

  if (state.dayKey && state.dayKey !== dk) {
    next = bankDayHigh(next);
    next = { ...next, dayKey: dk, dayScore: 0 };
  } else if (!state.dayKey) {
    next = { ...next, dayKey: dk };
  }

  if (state.weekKey && state.weekKey !== wk) {
    next = bankWeekHigh(next);
    next = { ...next, weekKey: wk, weekScore: 0 };
  } else if (!state.weekKey) {
    next = { ...next, weekKey: wk };
  }

  return next;
}

function bankDayHigh(state: ScoreState): ScoreState {
  if (state.dayScore <= 0) return state;
  if (state.dayScore > state.dayHigh) {
    return { ...state, dayHigh: state.dayScore, dayHighKey: state.dayKey };
  }
  return state;
}

function bankWeekHigh(state: ScoreState): ScoreState {
  if (state.weekScore <= 0) return state;
  if (state.weekScore > state.weekHigh) {
    return { ...state, weekHigh: state.weekScore, weekHighKey: state.weekKey };
  }
  return state;
}

export function applyAward(state: ScoreState, points: number, now = Date.now()): ScoreState {
  let next = rollScoreState(state, now);
  if (points <= 0) return next;
  next = {
    ...next,
    dayScore: next.dayScore + points,
    weekScore: next.weekScore + points,
  };
  // Live highs: beating your best mid-day / mid-week counts immediately.
  if (next.dayScore > next.dayHigh) {
    next = { ...next, dayHigh: next.dayScore, dayHighKey: next.dayKey };
  }
  if (next.weekScore > next.weekHigh) {
    next = { ...next, weekHigh: next.weekScore, weekHighKey: next.weekKey };
  }
  return next;
}

/** Undo points from a strike that is being restored. Only same day/week buckets. */
export function applyRevoke(state: ScoreState, points: number, completedAt: number, now = Date.now()): ScoreState {
  let next = rollScoreState(state, now);
  if (points <= 0) return next;
  if (dayKey(completedAt) === next.dayKey) {
    next = { ...next, dayScore: Math.max(0, next.dayScore - points) };
  }
  if (weekKey(completedAt) === next.weekKey) {
    next = { ...next, weekScore: Math.max(0, next.weekScore - points) };
  }
  return next;
}

export function formatScore(n: number): string {
  return String(Math.max(0, Math.floor(n)));
}
