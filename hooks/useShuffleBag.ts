import { useRef, useEffect, useState } from 'react';
import { ShuffleBag } from '../lib/shuffleBag';
import { AnimationId } from '../lib/types';
import { loadJSON, saveJSON, KEYS } from '../lib/storage';

/**
 * Draws celebrations without repeats until the pool is exhausted.
 * `pool` is the set of unlocked animations; when it changes (e.g. a pack is
 * bought) the bag is rebuilt, keeping any still-valid remaining draws.
 */
export function useShuffleBag(pool: AnimationId[]) {
  const bagRef = useRef<ShuffleBag<AnimationId> | null>(null);
  const poolRef = useRef<AnimationId[]>(pool);
  const [ready, setReady] = useState(false);
  const poolKey = pool.join(',');

  useEffect(() => {
    poolRef.current = pool;
    (async () => {
      const saved = await loadJSON<AnimationId[]>(KEYS.SHUFFLE_BAG);
      const remaining = (saved ?? []).filter((id) => pool.includes(id));
      // Newly unlocked animations should show up soon, not after the current bag
      // drains — so fold them in on top of what's left.
      const fresh = pool.filter((id) => !remaining.includes(id));
      const seed = remaining.length > 0 ? [...fresh, ...remaining] : undefined;
      bagRef.current = new ShuffleBag(pool, seed);
      setReady(true);
    })();
  }, [poolKey]);

  const draw = (): AnimationId => {
    if (!bagRef.current) {
      bagRef.current = new ShuffleBag(poolRef.current);
    }
    const result = bagRef.current.draw();
    saveJSON(KEYS.SHUFFLE_BAG, bagRef.current.getRemaining());
    return result;
  };

  return { draw, ready };
}
