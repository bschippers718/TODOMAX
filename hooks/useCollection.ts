import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimationId } from '../lib/types';
import { CollectionState, EMPTY_COLLECTION, getCollectionStats } from '../lib/collection';
import { loadJSON, saveJSON, KEYS } from '../lib/storage';

type Listener = (state: CollectionState, loaded: boolean) => void;

let state: CollectionState = EMPTY_COLLECTION;
let loaded = false;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l(state, loaded));
}

function commit(next: CollectionState) {
  state = next;
  notify();
  saveJSON(KEYS.COLLECTION, state);
}

function loadOnce() {
  if (!loadPromise) {
    loadPromise = (async () => {
      const saved = await loadJSON<Partial<CollectionState>>(KEYS.COLLECTION);
      state = {
        earned: saved?.earned ?? {},
        previewed: saved?.previewed ?? {},
        lastViewedAt: saved?.lastViewedAt ?? 0,
      };
      loaded = true;
      notify();
    })();
  }
  return loadPromise;
}

/**
 * Record that a celebration played after a real task completion.
 * Returns true the first time an animation is earned.
 */
export function recordEarned(id: AnimationId): boolean {
  const now = Date.now();
  const prev = state.earned[id];
  const isFirst = !prev;
  commit({
    ...state,
    earned: {
      ...state.earned,
      [id]: prev
        ? { count: prev.count + 1, firstAt: prev.firstAt, lastAt: now }
        : { count: 1, firstAt: now, lastAt: now },
    },
  });
  return isFirst;
}

/** Record a store/board preview. Lifts the "???" on a tile but doesn't count as earned. */
export function recordPreviewed(id: AnimationId) {
  commit({
    ...state,
    previewed: { ...state.previewed, [id]: (state.previewed[id] ?? 0) + 1 },
  });
}

export function markCollectionViewed() {
  commit({ ...state, lastViewedAt: Date.now() });
}

export function useCollection(unlockedIds: AnimationId[]) {
  const [current, setCurrent] = useState<CollectionState>(state);
  const [isLoaded, setIsLoaded] = useState(loaded);

  useEffect(() => {
    const listener: Listener = (next, nextLoaded) => {
      setCurrent(next);
      setIsLoaded(nextLoaded);
    };
    listeners.add(listener);
    listener(state, loaded);
    loadOnce();
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const stats = useMemo(() => getCollectionStats(current, unlockedIds), [current, unlockedIds]);

  const markViewed = useCallback(() => markCollectionViewed(), []);

  return {
    collection: current,
    stats,
    hasNew: stats.fresh > 0,
    loaded: isLoaded,
    recordEarned,
    recordPreviewed,
    markViewed,
  };
}
