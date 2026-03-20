import { useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { CelebrationAnimationProps, ANIM_COLORS } from '../../lib/types';

const { width: SW, height: SH } = Dimensions.get('window');

export function StreakCombo({ onComplete, streak = 1 }: CelebrationAnimationProps) {
  const bgOpacity = useSharedValue(0);
  const bgFlash = useSharedValue(0);
  const labelScale = useSharedValue(0);
  const labelOpacity = useSharedValue(0);
  const numberScale = useSharedValue(0);
  const numberOpacity = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);
  const barWidth = useSharedValue(0);
  const barOpacity = useSharedValue(0);
  const fireOpacity = useSharedValue(0);
  const line1X = useSharedValue(-SW);
  const line2X = useSharedValue(SW);

  useEffect(() => {
    bgOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(1, { duration: 2200 }),
      withTiming(0, { duration: 300 }),
    );

    // Horizontal speed lines
    line1X.value = withDelay(100, withTiming(SW, { duration: 300 }));
    line2X.value = withDelay(150, withTiming(-SW, { duration: 300 }));

    // "STREAK" slams in
    labelScale.value = withDelay(200, withSequence(
      withTiming(3, { duration: 80 }),
      withSpring(1, { damping: 5, stiffness: 300 }),
    ));
    labelOpacity.value = withDelay(200, withSequence(
      withTiming(1, { duration: 60 }),
      withTiming(1, { duration: 1800 }),
      withTiming(0, { duration: 300 }),
    ));

    // Screen shake
    const shakeDuration = 35;
    shakeX.value = withDelay(250, withSequence(
      withTiming(12, { duration: shakeDuration }),
      withTiming(-10, { duration: shakeDuration }),
      withTiming(8, { duration: shakeDuration }),
      withTiming(-6, { duration: shakeDuration }),
      withTiming(4, { duration: shakeDuration }),
      withTiming(-2, { duration: shakeDuration }),
      withTiming(0, { duration: shakeDuration }),
    ));
    shakeY.value = withDelay(250, withSequence(
      withTiming(-6, { duration: shakeDuration }),
      withTiming(4, { duration: shakeDuration }),
      withTiming(-3, { duration: shakeDuration }),
      withTiming(0, { duration: shakeDuration }),
    ));

    bgFlash.value = withDelay(250, withSequence(
      withTiming(0.5, { duration: 50 }),
      withTiming(0, { duration: 200 }),
      withTiming(0, { duration: 300 }),
      withTiming(0.2, { duration: 50 }),
      withTiming(0, { duration: 200 }),
    ));

    // Number count-up effect
    numberScale.value = withDelay(500, withSequence(
      withTiming(4, { duration: 100, easing: Easing.out(Easing.back(2)) }),
      withSpring(1, { damping: 4, stiffness: 250 }),
    ));
    numberOpacity.value = withDelay(500, withSequence(
      withTiming(1, { duration: 60 }),
      withTiming(1, { duration: 1200 }),
      withTiming(0, { duration: 300 }),
    ));

    // Combo bar fills up
    barOpacity.value = withDelay(700, withTiming(1, { duration: 100 }));
    barWidth.value = withDelay(700, withTiming(Math.min(streak / 10, 1), {
      duration: 600, easing: Easing.out(Easing.quad),
    }));

    // Fire effect for high streaks
    if (streak >= 3) {
      fireOpacity.value = withDelay(800, withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0.6, { duration: 200 }),
        withTiming(1, { duration: 200 }),
        withTiming(0.6, { duration: 200 }),
        withTiming(0, { duration: 300 }),
      ));
    }
  }, []);

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: bgFlash.value }));
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }, { translateY: shakeY.value }] }));
  const labelStyle = useAnimatedStyle(() => ({ transform: [{ scale: labelScale.value }], opacity: labelOpacity.value }));
  const numberStyle = useAnimatedStyle(() => ({ transform: [{ scale: numberScale.value }], opacity: numberOpacity.value }));
  const barOuterStyle = useAnimatedStyle(() => ({ opacity: barOpacity.value }));
  const barInnerStyle = useAnimatedStyle(() => ({ width: `${barWidth.value * 100}%` }));
  const fireStyle = useAnimatedStyle(() => ({ opacity: fireOpacity.value }));
  const l1 = useAnimatedStyle(() => ({ transform: [{ translateX: line1X.value }] }));
  const l2 = useAnimatedStyle(() => ({ transform: [{ translateX: line2X.value }] }));

  return (
    <Animated.View style={[styles.container, bgStyle]}>
      <Animated.View style={[styles.flash, flashStyle]} />

      <Animated.View style={shakeStyle}>
        <Animated.View style={[styles.speedLine, { top: SH * 0.35 }, l1]} />
        <Animated.View style={[styles.speedLine, { top: SH * 0.6 }, l2]} />

        <Animated.View style={[styles.fireContainer, fireStyle]}>
          <Text style={styles.fireEmoji}>🔥</Text>
        </Animated.View>

        <Animated.View style={labelStyle}>
          <Text style={styles.streakLabel}>STREAK</Text>
        </Animated.View>

        <Animated.View style={[styles.numberContainer, numberStyle]}>
          <Text style={styles.timesSign}>×</Text>
          <Text style={styles.streakNumber}>{streak}</Text>
        </Animated.View>

        <Animated.View style={[styles.barOuter, barOuterStyle]}>
          <Animated.View style={[styles.barInner, barInnerStyle]} />
          <Text style={styles.barLabel}>COMBO</Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 5, 0, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: ANIM_COLORS.red, zIndex: 10 },
  speedLine: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: ANIM_COLORS.red, opacity: 0.4 },
  fireContainer: { position: 'absolute', top: SH * 0.18, alignSelf: 'center' },
  fireEmoji: { fontSize: 60 },
  streakLabel: {
    fontFamily: 'PressStart2P', fontSize: 28, color: ANIM_COLORS.cream, textAlign: 'center',
    textShadowColor: ANIM_COLORS.red, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0,
  },
  numberContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  timesSign: { fontFamily: 'PressStart2P', fontSize: 32, color: ANIM_COLORS.red, marginRight: 4 },
  streakNumber: {
    fontFamily: 'PressStart2P', fontSize: 72, color: ANIM_COLORS.red,
    textShadowColor: ANIM_COLORS.accent, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0,
  },
  barOuter: {
    width: SW * 0.6, height: 16, backgroundColor: ANIM_COLORS.card, borderRadius: 8,
    borderWidth: 2, borderColor: ANIM_COLORS.cardBorder, marginTop: 30, overflow: 'hidden',
    justifyContent: 'center',
  },
  barInner: { height: '100%', backgroundColor: ANIM_COLORS.red, borderRadius: 6 },
  barLabel: { position: 'absolute', alignSelf: 'center', fontFamily: 'PressStart2P', fontSize: 6, color: ANIM_COLORS.cream },
});
