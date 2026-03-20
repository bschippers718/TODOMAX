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

export function SingleConfetti({ onComplete }: CelebrationAnimationProps) {
  const bgOpacity = useSharedValue(0);
  const cannonX = useSharedValue(SW * 0.15);
  const cannonKick = useSharedValue(0);
  const cannonOpacity = useSharedValue(0);
  const confettiX = useSharedValue(SW * 0.2);
  const confettiY = useSharedValue(SH * 0.55);
  const confettiRotation = useSharedValue(0);
  const confettiOpacity = useSharedValue(0);
  const confettiScale = useSharedValue(0.5);
  const dotDot1 = useSharedValue(0);
  const dotDot2 = useSharedValue(0);
  const dotDot3 = useSharedValue(0);
  const laughOpacity = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const labelOpacity = useSharedValue(0);

  useEffect(() => {
    bgOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(1, { duration: 2700 }),
      withTiming(0, { duration: 300 }),
    );

    // Cannon appears
    cannonOpacity.value = withDelay(200, withTiming(1, { duration: 200 }));

    // Cannon fires
    cannonKick.value = withDelay(600, withSequence(
      withTiming(-15, { duration: 60 }),
      withSpring(0, { damping: 8 }),
    ));

    // Single confetti piece launches
    confettiOpacity.value = withDelay(650, withTiming(1, { duration: 40 }));
    confettiY.value = withDelay(650, withSequence(
      withTiming(SH * 0.2, { duration: 400, easing: Easing.out(Easing.quad) }),
      withTiming(SH * 0.65, { duration: 600, easing: Easing.in(Easing.quad) }),
    ));
    confettiX.value = withDelay(650, withTiming(SW * 0.55, { duration: 1000 }));
    confettiRotation.value = withDelay(650, withTiming(16, { duration: 1000 }));
    confettiScale.value = withDelay(650, withSequence(
      withTiming(2, { duration: 150 }),
      withTiming(1.5, { duration: 850 }),
    ));

    // Comedic "..." pause
    dotDot1.value = withDelay(1400, withSequence(withTiming(1, { duration: 100 }), withTiming(1, { duration: 1000 }), withTiming(0, { duration: 200 })));
    dotDot2.value = withDelay(1600, withSequence(withTiming(1, { duration: 100 }), withTiming(1, { duration: 800 }), withTiming(0, { duration: 200 })));
    dotDot3.value = withDelay(1800, withSequence(withTiming(1, { duration: 100 }), withTiming(1, { duration: 600 }), withTiming(0, { duration: 200 })));

    // "That's it" laugh
    laughOpacity.value = withDelay(2000, withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(1, { duration: 300 }),
      withTiming(0, { duration: 200 }),
    ));

    // Then the real checkmark
    checkScale.value = withDelay(2300, withSpring(1, { damping: 4, stiffness: 300 }));
    checkOpacity.value = withDelay(2300, withSequence(
      withTiming(1, { duration: 80 }),
      withTiming(1, { duration: 500 }),
      withTiming(0, { duration: 200 }),
    ));

    labelOpacity.value = withDelay(2400, withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(1, { duration: 400 }),
      withTiming(0, { duration: 200 }),
    ));
  }, []);

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const cannonStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cannonKick.value }], opacity: cannonOpacity.value,
  }));
  const confStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: confettiX.value }, { translateY: confettiY.value },
      { rotate: `${confettiRotation.value}rad` }, { scale: confettiScale.value },
    ],
    opacity: confettiOpacity.value,
  }));
  const d1 = useAnimatedStyle(() => ({ opacity: dotDot1.value }));
  const d2 = useAnimatedStyle(() => ({ opacity: dotDot2.value }));
  const d3 = useAnimatedStyle(() => ({ opacity: dotDot3.value }));
  const laughStyle = useAnimatedStyle(() => ({ opacity: laughOpacity.value }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }], opacity: checkOpacity.value,
  }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.value }));

  return (
    <Animated.View style={[styles.container, bgStyle]}>
      <Animated.View style={[styles.cannon, cannonStyle]}>
        <View style={styles.cannonBarrel} />
        <View style={styles.cannonBase} />
        <View style={styles.cannonWheel} />
      </Animated.View>

      <Animated.View style={[styles.confetti, confStyle]}>
        <View style={styles.confettiPiece} />
      </Animated.View>

      <View style={styles.dotsContainer}>
        <Animated.Text style={[styles.dot, d1]}>.</Animated.Text>
        <Animated.Text style={[styles.dot, d2]}>.</Animated.Text>
        <Animated.Text style={[styles.dot, d3]}>.</Animated.Text>
      </View>

      <Animated.View style={[styles.laughContainer, laughStyle]}>
        <Text style={styles.laughText}>that's it?</Text>
      </Animated.View>

      <Animated.View style={[styles.checkContainer, checkStyle]}>
        <Text style={styles.checkText}>✓</Text>
      </Animated.View>

      <Animated.View style={[styles.labelContainer, labelStyle]}>
        <Text style={styles.labelText}>NAILED IT.</Text>
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
  cannon: { position: 'absolute', bottom: SH * 0.25, left: SW * 0.08, zIndex: 3 },
  cannonBarrel: {
    width: 50, height: 28, backgroundColor: '#555', borderRadius: 6,
    transform: [{ rotate: '-30deg' }],
  },
  cannonBase: { width: 40, height: 20, backgroundColor: '#444', borderRadius: 4, marginTop: -4, marginLeft: 5 },
  cannonWheel: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: '#666',
    position: 'absolute', bottom: -10, left: 8,
  },
  confetti: { position: 'absolute', zIndex: 5 },
  confettiPiece: {
    width: 16, height: 22, backgroundColor: ANIM_COLORS.accent, borderRadius: 3,
    transform: [{ rotate: '15deg' }],
  },
  dotsContainer: {
    flexDirection: 'row', position: 'absolute', top: SH * 0.38, gap: 8,
  },
  dot: { fontFamily: 'PressStart2P', fontSize: 40, color: ANIM_COLORS.dimmed },
  laughContainer: { position: 'absolute', top: SH * 0.32 },
  laughText: { fontFamily: 'PressStart2P', fontSize: 14, color: ANIM_COLORS.dimmed },
  checkContainer: { position: 'absolute', zIndex: 6 },
  checkText: { fontFamily: 'PressStart2P', fontSize: 64, color: ANIM_COLORS.green },
  labelContainer: { position: 'absolute', bottom: SH * 0.18 },
  labelText: {
    fontFamily: 'PressStart2P', fontSize: 18, color: ANIM_COLORS.cream,
    textShadowColor: ANIM_COLORS.green, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0,
  },
});
