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

function Sparkle({ delay, x, y }: { delay: number; x: number; y: number }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  useEffect(() => {
    scale.value = withDelay(delay, withSequence(
      withTiming(1.5, { duration: 100 }),
      withTiming(0, { duration: 300 }),
    ));
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 50 }),
      withTiming(0, { duration: 350 }),
    ));
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }], opacity: opacity.value, left: x, top: y,
  }));
  return <Animated.View style={[styles.sparkle, style]} />;
}

export function SwordSlash({ onComplete }: CelebrationAnimationProps) {
  const bgOpacity = useSharedValue(0);
  const slashRotation = useSharedValue(-0.8);
  const slashScale = useSharedValue(0);
  const slashOpacity = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const topHalfY = useSharedValue(0);
  const topHalfRotation = useSharedValue(0);
  const bottomHalfY = useSharedValue(0);
  const bottomHalfRotation = useSharedValue(0);
  const halvesOpacity = useSharedValue(0);
  const labelScale = useSharedValue(0);
  const labelOpacity = useSharedValue(0);
  const swordX = useSharedValue(-SW * 0.5);
  const swordOpacity = useSharedValue(0);

  useEffect(() => {
    bgOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(1, { duration: 2400 }),
      withTiming(0, { duration: 300 }),
    );

    // Sword sweeps across
    swordOpacity.value = withDelay(200, withSequence(
      withTiming(1, { duration: 50 }),
      withDelay(250, withTiming(0, { duration: 150 })),
    ));
    swordX.value = withDelay(200, withTiming(SW * 0.5, { duration: 250, easing: Easing.out(Easing.quad) }));

    // Slash line appears
    slashOpacity.value = withDelay(350, withSequence(
      withTiming(1, { duration: 40 }),
      withDelay(1200, withTiming(0, { duration: 400 })),
    ));
    slashScale.value = withDelay(350, withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }));
    slashRotation.value = withDelay(350, withTiming(-0.3, { duration: 120 }));

    flashOpacity.value = withDelay(400, withSequence(
      withTiming(0.8, { duration: 30 }),
      withTiming(0, { duration: 200 }),
    ));

    shakeX.value = withDelay(400, withSequence(
      withTiming(10, { duration: 25 }), withTiming(-10, { duration: 25 }),
      withTiming(6, { duration: 25 }), withTiming(-4, { duration: 25 }),
      withTiming(0, { duration: 25 }),
    ));

    // Task splits apart
    halvesOpacity.value = withDelay(550, withTiming(1, { duration: 50 }));
    topHalfY.value = withDelay(550, withTiming(-SH * 0.15, { duration: 600, easing: Easing.in(Easing.quad) }));
    topHalfRotation.value = withDelay(550, withTiming(-0.1, { duration: 600 }));
    bottomHalfY.value = withDelay(550, withTiming(SH * 0.15, { duration: 600, easing: Easing.in(Easing.quad) }));
    bottomHalfRotation.value = withDelay(550, withTiming(0.1, { duration: 600 }));

    labelScale.value = withDelay(800, withSequence(
      withTiming(1.5, { duration: 80 }),
      withSpring(1, { damping: 6 }),
    ));
    labelOpacity.value = withDelay(800, withSequence(
      withTiming(1, { duration: 80 }),
      withTiming(1, { duration: 1000 }),
      withTiming(0, { duration: 300 }),
    ));
  }, []);

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const slashStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${slashRotation.value}rad` }, { scaleX: slashScale.value }],
    opacity: slashOpacity.value,
  }));
  const topStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: topHalfY.value }, { rotate: `${topHalfRotation.value}rad` }],
    opacity: halvesOpacity.value,
  }));
  const bottomStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bottomHalfY.value }, { rotate: `${bottomHalfRotation.value}rad` }],
    opacity: halvesOpacity.value,
  }));
  const labelStyle = useAnimatedStyle(() => ({
    transform: [{ scale: labelScale.value }], opacity: labelOpacity.value,
  }));
  const swordStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swordX.value }, { rotate: '-30deg' }], opacity: swordOpacity.value,
  }));

  const sparkles = [
    { delay: 420, x: SW * 0.2, y: SH * 0.38 },
    { delay: 440, x: SW * 0.4, y: SH * 0.42 },
    { delay: 460, x: SW * 0.6, y: SH * 0.46 },
    { delay: 480, x: SW * 0.75, y: SH * 0.5 },
    { delay: 500, x: SW * 0.35, y: SH * 0.4 },
  ];

  return (
    <Animated.View style={[styles.container, bgStyle]}>
      <Animated.View style={[styles.flash, flashStyle]} />
      <Animated.View style={[StyleSheet.absoluteFillObject, shakeStyle]}>
        <Animated.View style={[styles.sword, swordStyle]}>
          <View style={styles.swordBlade} />
          <View style={styles.swordHandle} />
        </Animated.View>

        <Animated.View style={[styles.topHalf, topStyle]}>
          <View style={styles.halfBlock} />
        </Animated.View>

        <Animated.View style={[styles.slashLine, slashStyle]} />

        <Animated.View style={[styles.bottomHalf, bottomStyle]}>
          <View style={styles.halfBlock} />
        </Animated.View>

        {sparkles.map((s, i) => <Sparkle key={i} {...s} />)}

        <Animated.View style={[styles.labelContainer, labelStyle]}>
          <Text style={styles.labelText}>SLASHED!</Text>
          <Text style={styles.subLabel}>✓ ELIMINATED</Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    alignItems: 'center', justifyContent: 'center',
  },
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: ANIM_COLORS.white, zIndex: 10 },
  sword: { position: 'absolute', top: SH * 0.3, zIndex: 6 },
  swordBlade: { width: 120, height: 8, backgroundColor: ANIM_COLORS.cream, borderRadius: 2 },
  swordHandle: { width: 8, height: 24, backgroundColor: ANIM_COLORS.accent, borderRadius: 2, alignSelf: 'flex-start', marginTop: -8 },
  slashLine: {
    position: 'absolute', top: SH * 0.45, left: SW * 0.05, right: SW * 0.05,
    height: 6, backgroundColor: ANIM_COLORS.cream, zIndex: 5,
    shadowColor: ANIM_COLORS.cream, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 12,
  },
  topHalf: { position: 'absolute', top: SH * 0.35, left: SW * 0.1, right: SW * 0.1, height: SH * 0.1 },
  bottomHalf: { position: 'absolute', top: SH * 0.47, left: SW * 0.1, right: SW * 0.1, height: SH * 0.1 },
  halfBlock: { flex: 1, backgroundColor: ANIM_COLORS.card, borderRadius: 6, borderWidth: 1, borderColor: ANIM_COLORS.cardBorder },
  sparkle: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: ANIM_COLORS.cream, zIndex: 7 },
  labelContainer: { position: 'absolute', bottom: SH * 0.2, alignSelf: 'center', alignItems: 'center', zIndex: 5 },
  labelText: {
    fontFamily: 'PressStart2P', fontSize: 24, color: ANIM_COLORS.cream,
    textShadowColor: ANIM_COLORS.red, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0,
  },
  subLabel: { fontFamily: 'PressStart2P', fontSize: 10, color: ANIM_COLORS.green, marginTop: 12 },
});
