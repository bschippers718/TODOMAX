import { useRef, useEffect, useState } from 'react';
import { ShuffleBag } from '../lib/shuffleBag';
import { AnimationId, ALL_ANIMATION_IDS } from '../lib/types';
import { loadJSON, saveJSON, KEYS } from '../lib/storage';

export function useShuffleBag() {
  const bagRef = useRef<ShuffleBag<AnimationId> | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await loadJSON<AnimationId[]>(KEYS.SHUFFLE_BAG);
      bagRef.current = new ShuffleBag(ALL_ANIMATION_IDS, saved ?? undefined);
      setReady(true);
    })();
  }, []);

  const draw = (): AnimationId => {
    if (!bagRef.current) {
      bagRef.current = new ShuffleBag(ALL_ANIMATION_IDS);
    }
    const result = bagRef.current.draw();
    saveJSON(KEYS.SHUFFLE_BAG, bagRef.current.getRemaining());
    return result;
  };

  return { draw, ready };
}
