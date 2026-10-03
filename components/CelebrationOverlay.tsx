import { useEffect, useRef } from 'react';
import { StyleSheet, Pressable, Keyboard, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { AnimationId, Settings } from '../lib/types';
import { useTheme } from '../lib/theme';
import { animationRegistry, ANIMATION_DURATIONS } from './animations';

const MINIMAL_MS = 1100;

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
  const { width: SW, height: SH } = useWindowDimensions();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (celebration.active && celebration.animationId) {
      // The movie owns the screen: drop the keyboard so it plays full-bleed.
      Keyboard.dismiss();
      const full = ANIMATION_DURATIONS[celebration.animationId];
      // Minimal: a glimpse, not a movie. Long enough to read, short enough to
      // never get in the way of the next strike.
      const duration = settings.animationMode === 'minimal' ? Math.min(full, MINIMAL_MS) : full;
      timerRef.current = setTimeout(() => {
        onDismiss();
      }, duration + 200);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [celebration.active, celebration.animationId, settings.animationMode]);

  if (!celebration.active || !celebration.animationId) return null;

  const AnimationComponent = animationRegistry[celebration.animationId];
  if (!AnimationComponent) return null;

  const isMinimal = settings.animationMode === 'minimal';

  // Minimal: the same movie through a small window. The animation still lays
  // out at full screen size and is scaled into a framed card, so nothing in it
  // needs to know it's being glimpsed.
  if (isMinimal) {
    const frameW = Math.round(SW * 0.62);
    const frameH = Math.round(frameW * 0.78);
    const scale = frameW / SW;
    return (
      <Pressable style={styles.overlay} onPress={onDismiss} accessibilityLabel="Celebration, tap to skip">
        <Animated.View
          entering={FadeIn.duration(120)}
          exiting={FadeOut.duration(150)}
          style={[styles.animationContainer, styles.minimalHost]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.frame,
              theme.shadowCard,
              {
                width: frameW,
                height: frameH,
                borderRadius: theme.radiusCard,
                borderColor: theme.cardBorder,
                borderWidth: theme.borderWidth,
                backgroundColor: theme.surface,
              },
            ]}
          >
            <View style={[styles.frameClip, { borderRadius: Math.max(0, theme.radiusCard - theme.borderWidth) }]}>
              <View
                style={{
                  position: 'absolute',
                  width: SW,
                  height: SH,
                  left: (frameW - SW) / 2,
                  top: (frameH - SH) / 2,
                  transform: [{ scale }],
                }}
              >
                <AnimationComponent onComplete={onDismiss} streak={celebration.streak} />
              </View>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.overlay} onPress={onDismiss} accessibilityLabel="Celebration, tap to skip">
      <Animated.View
        style={[styles.backdrop, { backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.42)' : 'rgba(34, 31, 26, 0.16)' }]}
        exiting={FadeOut.duration(180)}
      />
      <Animated.View
        exiting={FadeOut.duration(150)}
        style={styles.animationContainer}
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
  minimalHost: {
    // Sit a little above centre so the glimpse reads as "about the list",
    // not as a modal.
    paddingBottom: 120,
  },
  // Chrome (border + shadow) and clipping live on separate views: iOS drops
  // a layer's shadow when that same layer clips.
  frame: {},
  frameClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});
