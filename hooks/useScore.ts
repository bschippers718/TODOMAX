import { useEffect, useState } from 'react';
import { Task } from '../lib/types';
import { loadJSON, saveJSON, KEYS } from '../lib/storage';
import { useDayTick } from './useDayTick';
import {
  EMPTY_SCORE,
  ScoreAward,
  ScoreState,
  StrikeScoreContext,
  applyAward,
  applyRevoke,
  rollScoreState,
  scoreStrike,
} from '../lib/scoring';

type State = { score: ScoreState; shown: ScoreState | null; loaded: boolean };
type Listener = (s: State) => void;

let state: State = { score: EMPTY_SCORE, shown: null, loaded: false };
const listeners = new Set<Listener>();
let loadPromise: Promise<void> | null = null;

function emit() {
  listeners.forEach((l) => l(state));
}

function setScore(update: (prev: ScoreState) => ScoreState) {
  state = { ...state, score: update(state.score) };
  emit();
  if (state.loaded) saveJSON(KEYS.SCORE, state.score);
}

function loadOnce() {
  if (!loadPromise) {
    loadPromise = (async () => {
      const saved = await loadJSON<ScoreState>(KEYS.SCORE);
      const base = saved && typeof saved.dayScore === 'number' ? { ...EMPTY_SCORE, ...saved } : EMPTY_SCORE;
      state = { score: rollScoreState(base), shown: null, loaded: true };
      emit();
      if (state.score !== base) saveJSON(KEYS.SCORE, state.score);
    })();
  }
  return loadPromise;
}

/**
 * Freeze the numbers on screen. The bank still updates; the reels wait
 * until the celebration has finished, then spin up to the new total.
 */
export function holdScoreReveal() {
  if (state.shown) return;
  state = { ...state, shown: state.score };
  emit();
}

/** Let the score strip catch up to what's been banked. */
export function releaseScoreReveal() {
  if (!state.shown) return;
  state = { ...state, shown: null };
  emit();
}

/** Award points for a strike; returns the breakdown and stamps `pointsEarned` on the task via caller. */
export function awardStrike(task: Task, ctx: StrikeScoreContext): ScoreAward {
  const award = scoreStrike(task, ctx);
  setScore((s) => applyAward(s, award.total, ctx.now));
  return award;
}

/** Claw back points when a struck stop is restored (same day/week only). */
export function revokeStrike(task: Task) {
  const points = task.pointsEarned ?? 0;
  const at = task.completedAt;
  if (!points || !at) return;
  setScore((s) => applyRevoke(s, points, at));
}

export function useScore() {
  const [local, setLocal] = useState(state);
  const day = useDayTick();

  useEffect(() => {
    loadOnce();
    const listener: Listener = (s) => setLocal(s);
    listeners.add(listener);
    setLocal(state);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Bank highs and zero the day/week counters when the calendar rolls.
  useEffect(() => {
    if (!local.loaded) return;
    const rolled = rollScoreState(local.score);
    if (rolled.dayKey !== local.score.dayKey || rolled.weekKey !== local.score.weekKey) {
      setScore(() => rolled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, local.loaded]);

  const live = rollScoreState(local.score);
  return {
    // While a celebration is playing, keep the pre-strike numbers up.
    score: local.shown ? rollScoreState(local.shown) : live,
    loaded: local.loaded,
  };
}
