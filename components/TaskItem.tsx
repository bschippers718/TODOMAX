import { useRef, useCallback } from 'react';
import { Text, View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Task, COLORS, Settings } from '../lib/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;
const CARD_HEIGHT = 58;

interface TaskItemProps {
  task: Task;
  settings: Settings;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskItem({ task, settings, onComplete, onDelete }: TaskItemProps) {
  const translateX = useSharedValue(0);
  const cardHeight = useSharedValue(CARD_HEIGHT);
  const cardOpacity = useSharedValue(1);
  const cardMargin = useSharedValue(4);
  const isCompleting = useRef(false);

  const strike1Progress = useSharedValue(0);
  const strike2Progress = useSharedValue(0);
  const strikeGlow = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const splatOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(1);

  const triggerComplete = useCallback(() => {
    if (isCompleting.current) return;
    isCompleting.current = true;
    onComplete(task.id);
  }, [task.id, onComplete]);

  const fireHeavyHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  const panGesture = Gesture.Pan()
    .activeOffsetX(10)
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      if (e.translationX > 0) {
        translateX.value = e.translationX;
      }
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(0, { duration: 120 });

        if (settings.hapticsEnabled) {
          runOnJS(fireHeavyHaptic)();
        }

        // First slash
        strike1Progress.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });

        // Shake
        shakeX.value = withSequence(
          withTiming(6, { duration: 25 }),
          withTiming(-6, { duration: 25 }),
          withTiming(4, { duration: 20 }),
          withTiming(-2, { duration: 20 }),
          withTiming(0, { duration: 15 }),
        );

        // Second slash
        strike2Progress.value = withDelay(180, withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) }));

        // Glow
        strikeGlow.value = withDelay(180, withSequence(
          withTiming(1, { duration: 80 }),
          withTiming(0.3, { duration: 300 }),
        ));

        // Splats
        splatOpacity.value = withDelay(160, withSequence(
          withTiming(0.7, { duration: 50 }),
          withTiming(0.4, { duration: 400 }),
        ));

        // Text dims
        textOpacity.value = withDelay(180, withTiming(0.3, { duration: 200 }));

        // Crumple
        cardScale.value = withDelay(500, withSequence(
          withTiming(1.02, { duration: 60 }),
          withTiming(0.9, { duration: 200, easing: Easing.in(Easing.quad) }),
        ));

        // Collapse
        cardHeight.value = withDelay(750, withTiming(0, { duration: 250, easing: Easing.in(Easing.quad) }));
        cardOpacity.value = withDelay(750, withTiming(0, { duration: 200 }));
        cardMargin.value = withDelay(750, withTiming(0, { duration: 250 }));

        runOnJS(triggerComplete)();
      } else {
        translateX.value = withTiming(0, { duration: 200 });
      }
    });

  const containerStyle = useAnimatedStyle(() => ({
    height: cardHeight.value,
    marginVertical: cardMargin.value,
    opacity: cardOpacity.value,
    overflow: 'hidden' as const,
  }));

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { scale: cardScale.value }],
  }));

  const cardSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const textAnimStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));
  const strike1Style = useAnimatedStyle(() => ({ width: strike1Progress.value * SCREEN_WIDTH * 0.65 }));
  const strike2Style = useAnimatedStyle(() => ({ width: strike2Progress.value * SCREEN_WIDTH * 0.65 }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: strikeGlow.value }));
  const splatStyle = useAnimatedStyle(() => ({ opacity: splatOpacity.value }));

  return (
    <Animated.View style={containerStyle}>
      <Animated.View style={[styles.bgReveal, bgStyle]}>
        <Text style={styles.completeIcon}>✓</Text>
      </Animated.View>

      <Animated.View style={shakeStyle}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.card, cardSlideStyle]}>
            <Animated.View style={[styles.glowOverlay, glowStyle]} />

            <Animated.View style={textAnimStyle}>
              <Text style={styles.taskText} numberOfLines={2}>
                {task.text}
              </Text>
            </Animated.View>

            <Animated.View style={[styles.strike1, strike1Style]} />
            <Animated.View style={[styles.strike2, strike2Style]} />

            <Animated.View style={[styles.splat, styles.splat1, splatStyle]} />
            <Animated.View style={[styles.splat, styles.splat2, splatStyle]} />
            <Animated.View style={[styles.splat, styles.splat3, splatStyle]} />

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => onDelete(task.id)}
              hitSlop={8}
            >
              <Text style={styles.deleteText}>×</Text>
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </Animated.View>
  );
}

const STRIKE_RED = '#FF3B30';

const styles = StyleSheet.create({
  bgReveal: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingLeft: 20,
    borderRadius: 12,
    backgroundColor: COLORS.green,
  },
  completeIcon: {
    fontSize: 20,
    color: COLORS.white,
    fontWeight: '700',
  },
  card: {
    height: CARD_HEIGHT,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 16,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  taskText: {
    color: COLORS.text,
    fontSize: 17,
    paddingRight: 32,
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderRadius: 12,
  },
  strike1: {
    position: 'absolute',
    left: 12,
    height: 3,
    backgroundColor: STRIKE_RED,
    borderRadius: 2,
    top: '42%',
    transform: [{ rotate: '6deg' }],
  },
  strike2: {
    position: 'absolute',
    left: 12,
    height: 3,
    backgroundColor: STRIKE_RED,
    borderRadius: 2,
    top: '58%',
    transform: [{ rotate: '-8deg' }],
  },
  splat: {
    position: 'absolute',
    backgroundColor: STRIKE_RED,
    borderRadius: 10,
  },
  splat1: { width: 6, height: 6, top: '22%', left: '35%' },
  splat2: { width: 4, height: 4, top: '68%', left: '55%' },
  splat3: { width: 7, height: 5, top: '28%', right: '22%', borderRadius: 3 },
  deleteButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  deleteText: {
    color: COLORS.dimmed,
    fontSize: 22,
    fontWeight: '400',
  },
});
