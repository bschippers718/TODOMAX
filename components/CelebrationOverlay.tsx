import { useEffect, useRef } from 'react';
import { StyleSheet, Pressable, Keyboard } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { AnimationId, Settings } from '../lib/types';
import { useTheme } from '../lib/theme';
import { animationRegistry, ANIMATION_DURATIONS } from './animations';

interface CelebrationOverlayProps {
  celebration: {
    active: boolean;
    animationId: AnimationId | null;
    streak: number;
  };
  settings: Settings;
  onDismiss: () => void;
}

export function CelebrationOverlay({
  celebration,
  settings,
  onDismiss,
}: CelebrationOverlayProps) {
  const theme = useTheme();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (celebration.active && celebration.animationId) {
      // The movie owns the screen: drop the keyboard so it plays full-bleed.
      Keyboard.dismiss();
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
    <Pressable style={styles.overlay} onPress={onDismiss} accessibilityLabel="Celebration, tap to skip">
      <Animated.View
        style={[styles.backdrop, { backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.42)' : 'rgba(34, 31, 26, 0.16)' }]}
        exiting={FadeOut.duration(180)}
      />
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
