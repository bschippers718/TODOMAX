import { useState, useCallback } from 'react';
import { AnimationId, Settings } from '../lib/types';
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
      const animationId = draw();
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
