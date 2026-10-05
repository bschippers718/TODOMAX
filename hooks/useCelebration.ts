import { useState, useCallback } from 'react';
import { AnimationId, Settings, isAnimationEligible } from '../lib/types';
import { useShuffleBag } from './useShuffleBag';

interface CelebrationState {
  active: boolean;
  animationId: AnimationId | null;
  streak: number;
}

export function useCelebration(settings: Settings, pool: AnimationId[]) {
  const { draw } = useShuffleBag(pool);
  const [celebration, setCelebration] = useState<CelebrationState>({
    active: false,
    animationId: null,
    streak: 0,
  });

  // Haptics for the completion moment live in TaskItem (the pen landing);
  // firing another "success" here would double-buzz ~700ms later.
  const triggerCelebration = useCallback(
    (streak: number): AnimationId | null => {
      if (settings.animationMode === 'quiet') return null;
      // `streak` is today's tally; some celebrations wait for a hot day.
      const animationId = draw((id) => isAnimationEligible(id, streak));
      setCelebration({ active: true, animationId, streak });
      return animationId;
    },
    [settings, draw]
  );

  const dismissCelebration = useCallback(() => {
    setCelebration({ active: false, animationId: null, streak: 0 });
  }, []);

  return {
    celebration,
    triggerCelebration,
    dismissCelebration,
  };
}
