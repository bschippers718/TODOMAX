import { useState, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { AnimationId, Settings } from '../lib/types';
import { useShuffleBag } from './useShuffleBag';

interface CelebrationState {
  active: boolean;
  animationId: AnimationId | null;
  streak: number;
}

export function useCelebration(settings: Settings) {
  const { draw } = useShuffleBag();
  const [celebration, setCelebration] = useState<CelebrationState>({
    active: false,
    animationId: null,
    streak: 0,
  });

  const triggerCelebration = useCallback(
    (streak: number): AnimationId | null => {
      if (settings.animationMode === 'quiet') return null;

      const animationId: AnimationId = 'touchdown'; // TEMP: force for testing

      if (settings.hapticsEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

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
