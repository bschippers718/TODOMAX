import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Pressable, Keyboard, Text, View } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AnimationId, CelebrationTier, MASSIVE_HOLD_MS, Settings } from '../lib/types';
import { useTheme, Theme } from '../lib/theme';
import { animationRegistry, ANIMATION_DURATIONS } from './animations';

const MINIMAL_MS = 1100;

interface CelebrationOverlayProps {
  celebration: {
    active: boolean;
    animationId: AnimationId | null;
    streak: number;
    tier?: CelebrationTier;
    taskText?: string;
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
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Massive: after the scene, an end card holds with the stop's name on it.
  const [ending, setEnding] = useState(false);
  const minimal = settings.animationMode === 'minimal';
  const massive = celebration.tier === 'massive' && !minimal;

  useEffect(() => {
    if (celebration.active && celebration.animationId) {
      setEnding(false);
      // The movie owns the screen: drop the keyboard so it plays full-bleed.
      Keyboard.dismiss();
      const full = ANIMATION_DURATIONS[celebration.animationId];
      // Minimal: a glimpse, not a movie. Long enough to read, short enough to
      // never get in the way of the next strike.
      const duration = minimal ? Math.min(full, MINIMAL_MS) : full + (massive ? MASSIVE_HOLD_MS : 0);
      timerRef.current = setTimeout(() => {
        onDismiss();
      }, duration + 200);
      // The scenes run on their published length rather than reporting back,
      // so the end card is cued the same way: when the scene's time is up.
      if (massive) {
        holdRef.current = setTimeout(() => {
          setEnding(true);
          if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, full);
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (holdRef.current) clearTimeout(holdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebration.active, celebration.animationId, settings.animationMode]);

  // A scene that does say it's done early: Massive goes to its end card,
  // anything else is over.
  const onSceneDone = useCallback(() => {
    if (!massive || ending) {
      onDismiss();
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    if (holdRef.current) clearTimeout(holdRef.current);
    setEnding(true);
    if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    timerRef.current = setTimeout(onDismiss, MASSIVE_HOLD_MS);
  }, [massive, ending, onDismiss, settings.hapticsEnabled]);

  if (!celebration.active || !celebration.animationId) return null;

  const AnimationComponent = animationRegistry[celebration.animationId];
  if (!AnimationComponent) return null;

  // Minimal only shortens the moment (see MINIMAL_MS). The movie always owns
  // the whole screen — a small window never reads as a reward.

  return (
    <Pressable style={styles.overlay} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Celebration, tap to skip">
      <Animated.View
        style={[styles.backdrop, { backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.42)' : 'rgba(34, 31, 26, 0.16)' }]}
        exiting={FadeOut.duration(180)}
      />
      {!ending && (
        <Animated.View
          exiting={FadeOut.duration(150)}
          style={styles.animationContainer}
          pointerEvents="box-none"
        >
          <AnimationComponent
            onComplete={onSceneDone}
            streak={celebration.streak}
          />
        </Animated.View>
      )}
      {ending && <MassiveEndCard theme={theme} text={celebration.taskText} streak={celebration.streak} />}
    </Pressable>
  );
}

/**
 * The Massive end card. Black sign, one yellow, the stop's own words. It
 * holds so the size of what you did is the last thing on screen.
 */
function MassiveEndCard({ theme, text, streak }: { theme: Theme; text?: string; streak: number }) {
  return (
    <Animated.View
      entering={ZoomIn.springify().damping(16).stiffness(220).mass(0.8)}
      exiting={FadeOut.duration(150)}
      style={styles.endWrap}
      pointerEvents="none"
    >
      <View style={[styles.endCard, { backgroundColor: theme.text, borderColor: theme.bg, borderRadius: theme.radiusCard }, theme.isSignal && styles.endCardShadow]}>
        <Text style={[styles.endLabel, theme.fontLabel, { color: theme.gold }]} allowFontScaling={false}>
          MASSIVE
        </Text>
        {text ? (
          <Text style={[styles.endText, theme.fontDisplay, { color: theme.bg }]} numberOfLines={3} allowFontScaling={false}>
            {text}
          </Text>
        ) : null}
        <View style={[styles.endRule, { backgroundColor: theme.gold }]} />
        <Text style={[styles.endSub, theme.fontLabel, { color: theme.bg }]} allowFontScaling={false}>
          {streak} DONE TODAY
        </Text>
      </View>
    </Animated.View>
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
  endWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  endCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 2.5,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 24,
    gap: 14,
  },
  endCardShadow: {
    shadowColor: '#FCCC0A',
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 8, height: 8 },
  },
  endLabel: {
    fontSize: 11,
  },
  endText: {
    fontSize: 34,
    lineHeight: 38,
  },
  endRule: {
    height: 4,
    width: 56,
  },
  endSub: {
    fontSize: 9,
    opacity: 0.85,
  },
});
