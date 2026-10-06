import { useState, useCallback } from 'react';
import { AnimationId, CelebrationTier, Settings, isAnimationEligible } from '../lib/types';
import { useShuffleBag } from './useShuffleBag';

export interface CelebrationState {
  active: boolean;
  animationId: AnimationId | null;
  streak: number;
  tier: CelebrationTier;
  /** The stop that earned it; the Massive end card names it. */
  taskText?: string;
}

export function useCelebration(settings: Settings, pool: AnimationId[]) {
  const { draw } = useShuffleBag(pool);
  const [celebration, setCelebration] = useState<CelebrationState>({
    active: false,
    animationId: null,
    streak: 0,
    tier: 'scene',
  });

  // Haptics for the completion moment live in TaskItem (the pen landing);
  // firing another "success" here would double-buzz ~700ms later.
  const triggerCelebration = useCallback(
    (streak: number, tier: CelebrationTier = 'scene', taskText?: string): AnimationId | null => {
      if (settings.animationMode === 'quiet') return null;
      // `streak` is today's tally; some celebrations wait for a hot day.
      // `tier` is the stop's size; the signature scenes wait for a big one.
      const animationId = draw((id) => isAnimationEligible(id, streak, tier));
      setCelebration({ active: true, animationId, streak, tier, taskText });
      return animationId;
    },
    [settings, draw]
  );

  const dismissCelebration = useCallback(() => {
    setCelebration({ active: false, animationId: null, streak: 0, tier: 'scene' });
  }, []);

  return {
    celebration,
    triggerCelebration,
    dismissCelebration,
  };
}
