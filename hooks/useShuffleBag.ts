import { useEffect, useState } from 'react';
import { ShuffleBag } from '../lib/shuffleBag';
import { AnimationId } from '../lib/types';
import { loadJSON, saveJSON, KEYS } from '../lib/storage';

// One bag for the whole app. The list and the Map each mount this hook, and
// "no repeats until the pool is exhausted" only holds if they share it.
let bag: ShuffleBag<AnimationId> | null = null;
let bagKey = '';
let building: Promise<void> | null = null;

async function buildBag(pool: AnimationId[], key: string) {
  const saved = await loadJSON<AnimationId[]>(KEYS.SHUFFLE_BAG);
  if (bagKey === key && bag) return; // someone else finished first
  const remaining = (Array.isArray(saved) ? saved : []).filter((id) => pool.includes(id));
  // Newly unlocked animations should show up soon, not after the current bag
  // drains — so fold them in on top of what's left.
  const fresh = pool.filter((id) => !remaining.includes(id));
  const seed = remaining.length > 0 ? [...remaining, ...fresh] : undefined;
  bag = new ShuffleBag(pool, seed);
  bagKey = key;
}

/**
 * Draws celebrations without repeats until the pool is exhausted.
 * `pool` is the set of unlocked animations in rotation; when it changes (e.g. a
 * pack is bought) the bag is rebuilt, keeping any still-valid remaining draws.
 */
export function useShuffleBag(pool: AnimationId[]) {
  const [ready, setReady] = useState(bagKey === pool.join(','));
  const poolKey = pool.join(',');

  useEffect(() => {
    let cancelled = false;
    if (bagKey !== poolKey) {
      building = buildBag(pool, poolKey);
    }
    (building ?? Promise.resolve()).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolKey]);

  const draw = (eligible?: (id: AnimationId) => boolean): AnimationId => {
    if (!bag || bagKey !== poolKey) {
      bag = new ShuffleBag(pool);
      bagKey = poolKey;
    }
    const result = bag.draw(eligible);
    saveJSON(KEYS.SHUFFLE_BAG, bag.getRemaining());
    return result;
  };

  return { draw, ready };
}
