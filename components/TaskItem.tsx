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
const SCRIBBLE_WIDTH = SCREEN_WIDTH * 0.65;
const SCRIBBLE_VARIANTS = ['doubleSlash', 'zigzag', 'markerLoop', 'pixelX'] as const;

type ScribbleVariant = (typeof SCRIBBLE_VARIANTS)[number];

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
  const scribbleVariant = useRef(getScribbleVariant(task.id)).current;

  const strike1Progress = useSharedValue(0);
  const strike2Progress = useSharedValue(0);
  const strike3Progress = useSharedValue(0);
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

        strike1Progress.value = withTiming(1, { duration: 130, easing: Easing.out(Easing.quad) });
        strike2Progress.value = withDelay(90, withTiming(1, { duration: 130, easing: Easing.out(Easing.quad) }));
        strike3Progress.value = withDelay(170, withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }));

        // Shake
        shakeX.value = withSequence(
          withTiming(6, { duration: 25 }),
          withTiming(-6, { duration: 25 }),
          withTiming(4, { duration: 20 }),
          withTiming(-2, { duration: 20 }),
          withTiming(0, { duration: 15 }),
        );

        strikeGlow.value = withDelay(130, withSequence(
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
  const swipeProgressStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD * 0.25], [0, 1], Extrapolation.CLAMP),
  }));
  const strike1Style = useAnimatedStyle(() => ({
    width: Math.max(
      interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, SCRIBBLE_WIDTH], Extrapolation.CLAMP),
      strike1Progress.value * SCRIBBLE_WIDTH,
    ),
  }));
  const strike2Style = useAnimatedStyle(() => ({
    width: Math.max(
      interpolate(translateX.value, [SWIPE_THRESHOLD * 0.18, SWIPE_THRESHOLD], [0, SCRIBBLE_WIDTH], Extrapolation.CLAMP),
      strike2Progress.value * SCRIBBLE_WIDTH,
    ),
  }));
  const strike3Style = useAnimatedStyle(() => ({
    width: Math.max(
      interpolate(translateX.value, [SWIPE_THRESHOLD * 0.38, SWIPE_THRESHOLD], [0, SCRIBBLE_WIDTH * 0.9], Extrapolation.CLAMP),
      strike3Progress.value * SCRIBBLE_WIDTH * 0.9,
    ),
  }));
  const loopStyle = useAnimatedStyle(() => {
    const progress = Math.max(
      interpolate(translateX.value, [SWIPE_THRESHOLD * 0.25, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
      strike2Progress.value,
    );
    return {
      opacity: progress,
      transform: [{ scaleX: progress }, { rotate: '-7deg' }],
    };
  });
  const pixelXStyle = useAnimatedStyle(() => {
    const progress = Math.max(
      interpolate(translateX.value, [SWIPE_THRESHOLD * 0.35, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
      strike3Progress.value,
    );
    return {
      opacity: progress,
      transform: [{ scale: progress }],
    };
  });
  const glowStyle = useAnimatedStyle(() => ({ opacity: strikeGlow.value }));
  const splatStyle = useAnimatedStyle(() => ({ opacity: splatOpacity.value }));

  const renderScribble = () => {
    if (scribbleVariant === 'zigzag') {
      return (
        <Animated.View style={[styles.scribbleLayer, swipeProgressStyle]}>
          <Animated.View style={[styles.zig, styles.zig1, strike1Style]} />
          <Animated.View style={[styles.zig, styles.zig2, strike2Style]} />
          <Animated.View style={[styles.zig, styles.zig3, strike3Style]} />
        </Animated.View>
      );
    }

    if (scribbleVariant === 'markerLoop') {
      return (
        <Animated.View style={[styles.scribbleLayer, swipeProgressStyle]}>
          <Animated.View style={[styles.loopStroke, loopStyle]} />
          <Animated.View style={[styles.loopSlash, strike1Style]} />
          <Animated.View style={[styles.loopSlashTwo, strike2Style]} />
        </Animated.View>
      );
    }

    if (scribbleVariant === 'pixelX') {
      return (
        <Animated.View style={[styles.scribbleLayer, swipeProgressStyle]}>
          <Animated.View style={[styles.pixelSlash, styles.pixelSlashA, strike1Style]} />
          <Animated.View style={[styles.pixelSlash, styles.pixelSlashB, strike2Style]} />
          <Animated.View style={[styles.pixelX, pixelXStyle]}>
            <View style={[styles.pixelBlock, styles.pixelBlockA]} />
            <View style={[styles.pixelBlock, styles.pixelBlockB]} />
            <View style={[styles.pixelBlock, styles.pixelBlockC]} />
            <View style={[styles.pixelBlock, styles.pixelBlockD]} />
          </Animated.View>
        </Animated.View>
      );
    }

    return (
      <Animated.View style={[styles.scribbleLayer, swipeProgressStyle]}>
        <Animated.View style={[styles.strike1, strike1Style]} />
        <Animated.View style={[styles.strike2, strike2Style]} />
        <Animated.View style={[styles.strike3, strike3Style]} />
      </Animated.View>
    );
  };

  return (
    <Animated.View style={containerStyle}>
      <Animated.View style={[styles.bgReveal, bgStyle]}>
        <Text style={styles.completeIcon}>✓</Text>
        <Text style={styles.completeLabel}>DONE!</Text>
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

            {renderScribble()}

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

function getScribbleVariant(id: string): ScribbleVariant {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return SCRIBBLE_VARIANTS[Math.abs(hash) % SCRIBBLE_VARIANTS.length];
}

const styles = StyleSheet.create({
  bgReveal: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingLeft: 20,
    borderRadius: 14,
    backgroundColor: '#178C55',
  },
  completeIcon: {
    fontSize: 23,
    color: COLORS.white,
    fontWeight: '900',
  },
  completeLabel: {
    position: 'absolute',
    right: 18,
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  card: {
    height: CARD_HEIGHT,
    backgroundColor: 'rgba(255, 252, 244, 0.9)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(34, 31, 26, 0.12)',
    paddingHorizontal: 18,
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#564025',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 2,
  },
  taskText: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    paddingRight: 32,
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(229, 57, 45, 0.08)',
    borderRadius: 14,
  },
  scribbleLayer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  strike1: {
    position: 'absolute',
    left: 12,
    height: 4,
    backgroundColor: STRIKE_RED,
    borderRadius: 2,
    top: '38%',
    transform: [{ rotate: '5deg' }],
  },
  strike2: {
    position: 'absolute',
    left: 18,
    height: 4,
    backgroundColor: STRIKE_RED,
    borderRadius: 2,
    top: '54%',
    transform: [{ rotate: '-7deg' }],
  },
  strike3: {
    position: 'absolute',
    left: 26,
    height: 3,
    backgroundColor: STRIKE_RED,
    borderRadius: 2,
    top: '48%',
    transform: [{ rotate: '1deg' }],
  },
  zig: {
    position: 'absolute',
    height: 4,
    backgroundColor: STRIKE_RED,
    borderRadius: 1,
  },
  zig1: {
    left: 12,
    top: '32%',
    transform: [{ rotate: '14deg' }],
  },
  zig2: {
    left: 20,
    top: '52%',
    transform: [{ rotate: '-15deg' }],
  },
  zig3: {
    left: 28,
    top: '43%',
    transform: [{ rotate: '11deg' }],
  },
  loopStroke: {
    position: 'absolute',
    left: 16,
    top: 9,
    width: SCRIBBLE_WIDTH * 0.74,
    height: 40,
    borderWidth: 4,
    borderColor: STRIKE_RED,
    borderRadius: 24,
  },
  loopSlash: {
    position: 'absolute',
    left: 18,
    top: '45%',
    height: 4,
    backgroundColor: STRIKE_RED,
    borderRadius: 2,
    transform: [{ rotate: '-4deg' }],
  },
  loopSlashTwo: {
    position: 'absolute',
    left: 28,
    top: '57%',
    height: 3,
    backgroundColor: STRIKE_RED,
    borderRadius: 2,
    transform: [{ rotate: '5deg' }],
  },
  pixelSlash: {
    position: 'absolute',
    left: 14,
    height: 5,
    backgroundColor: STRIKE_RED,
    borderRadius: 0,
  },
  pixelSlashA: {
    top: '38%',
    transform: [{ rotate: '10deg' }],
  },
  pixelSlashB: {
    top: '57%',
    transform: [{ rotate: '-10deg' }],
  },
  pixelX: {
    position: 'absolute',
    right: 48,
    top: 15,
    width: 30,
    height: 30,
  },
  pixelBlock: {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: STRIKE_RED,
  },
  pixelBlockA: { left: 0, top: 0 },
  pixelBlockB: { right: 0, top: 0 },
  pixelBlockC: { left: 0, bottom: 0 },
  pixelBlockD: { right: 0, bottom: 0 },
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
