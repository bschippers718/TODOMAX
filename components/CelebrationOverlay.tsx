import { useEffect, useRef } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { AnimationId, Settings } from '../lib/types';
import { animationRegistry } from './animations';

interface CelebrationOverlayProps {
  celebration: {
    active: boolean;
    animationId: AnimationId | null;
    streak: number;
  };
  settings: Settings;
  onDismiss: () => void;
}

const ANIMATION_DURATIONS: Record<AnimationId, number> = {
  touchdown: 3800,
  scorePop: 2650,
  streakCombo: 2600,
  perfectStamp: 2600,
  footballSpike: 2950,
  swordSlash: 2800,
  rubberStamp: 2800,
  trophyRaise: 3300,
  singleConfetti: 3150,
  halftimeBand: 3350,
  instantReplay: 3200,
  interception: 3050,
  levelClear: 3500,
  pixelPowerUp: 3200,
};

export function CelebrationOverlay({
  celebration,
  settings,
  onDismiss,
}: CelebrationOverlayProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (celebration.active && celebration.animationId) {
      const duration = ANIMATION_DURATIONS[celebration.animationId];
      timerRef.current = setTimeout(() => {
        onDismiss();
      }, duration + 200);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [celebration.active, celebration.animationId]);

  if (!celebration.active || !celebration.animationId) return null;

  const AnimationComponent = animationRegistry[celebration.animationId];
  if (!AnimationComponent) return null;

  const isMinimal = settings.animationMode === 'minimal';

  return (
    <Pressable style={styles.overlay} onPress={onDismiss}>
      <Animated.View style={styles.backdrop} exiting={FadeOut.duration(180)} />
      <Animated.View
        exiting={FadeOut.duration(150)}
        style={[styles.animationContainer, isMinimal && styles.minimal]}
        pointerEvents="box-none"
      >
        <AnimationComponent
          onComplete={onDismiss}
          streak={celebration.streak}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34, 31, 26, 0.16)',
  },
  animationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimal: {
    opacity: 0.7,
  },
});
