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

function InkSplat({ delay, x, y, size }: { delay: number; x: number; y: number; size: number }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 6, stiffness: 400 }));
    opacity.value = withDelay(delay, withSequence(
      withTiming(0.9, { duration: 50 }),
      withDelay(600, withTiming(0, { duration: 400 })),
    ));
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }], opacity: opacity.value,
    left: x, top: y, width: size, height: size, borderRadius: size / 2,
  }));
  return <Animated.View style={[styles.inkSplat, style]} />;
}

export function PerfectStamp({ onComplete }: CelebrationAnimationProps) {
  const bgOpacity = useSharedValue(0);
  const stampScale = useSharedValue(5);
  const stampOpacity = useSharedValue(0);
  const stampRotation = useSharedValue(-0.15);
  const flashOpacity = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const ratingOpacity = useSharedValue(0);

  useEffect(() => {
    bgOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(1, { duration: 2200 }),
      withTiming(0, { duration: 300 }),
    );

    stampOpacity.value = withDelay(200, withTiming(1, { duration: 50 }));
    stampScale.value = withDelay(200, withSequence(
      withTiming(1.15, { duration: 150, easing: Easing.in(Easing.quad) }),
      withSpring(1, { damping: 3, stiffness: 500 }),
    ));
    stampRotation.value = withDelay(200, withSpring(0.05, { damping: 4, stiffness: 200 }));

    flashOpacity.value = withDelay(350, withSequence(
      withTiming(0.6, { duration: 40 }),
      withTiming(0, { duration: 200 }),
    ));

    shakeX.value = withDelay(350, withSequence(
      withTiming(8, { duration: 30 }), withTiming(-8, { duration: 30 }),
      withTiming(6, { duration: 30 }), withTiming(-4, { duration: 30 }),
      withTiming(0, { duration: 30 }),
    ));

    checkScale.value = withDelay(700, withSpring(1, { damping: 5, stiffness: 300 }));
    checkOpacity.value = withDelay(700, withSequence(
      withTiming(1, { duration: 80 }),
      withTiming(1, { duration: 1000 }),
      withTiming(0, { duration: 300 }),
    ));

    ratingOpacity.value = withDelay(1000, withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(1, { duration: 700 }),
      withTiming(0, { duration: 300 }),
    ));
  }, []);

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const stampStyle = useAnimatedStyle(() => ({
    transform: [{ scale: stampScale.value }, { rotate: `${stampRotation.value}rad` }],
    opacity: stampOpacity.value,
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }], opacity: checkOpacity.value,
  }));
  const ratingStyle = useAnimatedStyle(() => ({ opacity: ratingOpacity.value }));

  const splats = [
    { delay: 370, x: SW * 0.1, y: SH * 0.3, size: 20 },
    { delay: 390, x: SW * 0.75, y: SH * 0.28, size: 16 },
    { delay: 410, x: SW * 0.15, y: SH * 0.6, size: 22 },
    { delay: 430, x: SW * 0.7, y: SH * 0.62, size: 14 },
    { delay: 450, x: SW * 0.4, y: SH * 0.25, size: 12 },
    { delay: 470, x: SW * 0.55, y: SH * 0.68, size: 18 },
  ];

  return (
    <Animated.View style={[styles.container, bgStyle]}>
      <Animated.View style={[styles.flash, flashStyle]} />
      <Animated.View style={[StyleSheet.absoluteFillObject, shakeStyle]}>
        {splats.map((s, i) => <InkSplat key={i} {...s} />)}

        <Animated.View style={[styles.stamp, stampStyle]}>
          <View style={styles.stampBorder}>
            <Text style={styles.stampText}>PERFECT</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.checkContainer, checkStyle]}>
          <Text style={styles.checkText}>✓</Text>
        </Animated.View>

        <Animated.View style={[styles.ratingContainer, ratingStyle]}>
          <Text style={styles.ratingText}>★ ★ ★ ★ ★</Text>
          <Text style={styles.ratingLabel}>FLAWLESS EXECUTION</Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: ANIM_COLORS.green, zIndex: 10 },
  stamp: { position: 'absolute', top: SH * 0.32, alignSelf: 'center', zIndex: 5 },
  stampBorder: {
    borderWidth: 6, borderColor: ANIM_COLORS.green, borderRadius: 12,
    paddingHorizontal: 30, paddingVertical: 16,
    backgroundColor: 'rgba(0, 184, 0, 0.15)',
  },
  stampText: {
    fontFamily: 'PressStart2P', fontSize: 32, color: ANIM_COLORS.green,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0,
  },
  checkContainer: { position: 'absolute', top: SH * 0.48, alignSelf: 'center', zIndex: 5 },
  checkText: { fontFamily: 'PressStart2P', fontSize: 48, color: ANIM_COLORS.green },
  ratingContainer: { position: 'absolute', bottom: SH * 0.2, alignSelf: 'center', alignItems: 'center', zIndex: 5 },
  ratingText: { fontSize: 28, color: ANIM_COLORS.accent, letterSpacing: 4 },
  ratingLabel: { fontFamily: 'PressStart2P', fontSize: 8, color: ANIM_COLORS.cream, marginTop: 8 },
  inkSplat: { position: 'absolute', backgroundColor: ANIM_COLORS.green, zIndex: 4 },
});
