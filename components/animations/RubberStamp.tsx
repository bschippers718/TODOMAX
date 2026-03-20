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

export function RubberStamp({ onComplete }: CelebrationAnimationProps) {
  const bgOpacity = useSharedValue(0);
  const stampY = useSharedValue(-SH * 0.5);
  const stampScale = useSharedValue(1.3);
  const stampOpacity = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const shakeY = useSharedValue(0);
  const ring1Scale = useSharedValue(0);
  const ring1Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(0);
  const ring2Opacity = useSharedValue(0);
  const ring3Scale = useSharedValue(0);
  const ring3Opacity = useSharedValue(0);
  const dateOpacity = useSharedValue(0);
  const doneCheckScale = useSharedValue(0);
  const doneCheckOpacity = useSharedValue(0);

  useEffect(() => {
    bgOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(1, { duration: 2400 }),
      withTiming(0, { duration: 300 }),
    );

    stampOpacity.value = withDelay(200, withTiming(1, { duration: 50 }));
    stampY.value = withDelay(200, withSequence(
      withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }),
      withTiming(-25, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 100, easing: Easing.in(Easing.quad) }),
      withTiming(-8, { duration: 80, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 60 }),
    ));
    stampScale.value = withDelay(500, withSpring(1, { damping: 6, stiffness: 300 }));

    flashOpacity.value = withDelay(500, withSequence(
      withTiming(0.5, { duration: 40 }),
      withTiming(0, { duration: 200 }),
    ));

    shakeY.value = withDelay(500, withSequence(
      withTiming(5, { duration: 25 }), withTiming(-5, { duration: 25 }),
      withTiming(3, { duration: 25 }), withTiming(0, { duration: 25 }),
    ));

    ring1Scale.value = withDelay(550, withTiming(5, { duration: 500 }));
    ring1Opacity.value = withDelay(550, withSequence(withTiming(0.5, { duration: 50 }), withTiming(0, { duration: 500 })));
    ring2Scale.value = withDelay(700, withTiming(4, { duration: 500 }));
    ring2Opacity.value = withDelay(700, withSequence(withTiming(0.4, { duration: 50 }), withTiming(0, { duration: 500 })));
    ring3Scale.value = withDelay(850, withTiming(3, { duration: 500 }));
    ring3Opacity.value = withDelay(850, withSequence(withTiming(0.3, { duration: 50 }), withTiming(0, { duration: 500 })));

    dateOpacity.value = withDelay(800, withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 1000 }),
      withTiming(0, { duration: 300 }),
    ));

    doneCheckScale.value = withDelay(1000, withSpring(1, { damping: 5, stiffness: 250 }));
    doneCheckOpacity.value = withDelay(1000, withSequence(
      withTiming(1, { duration: 80 }),
      withTiming(1, { duration: 800 }),
      withTiming(0, { duration: 300 }),
    ));
  }, []);

  const bgStyle = useAnimatedStyle(() => ({ opacity: bgOpacity.value }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateY: shakeY.value }] }));
  const stampStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: stampY.value }, { scale: stampScale.value }], opacity: stampOpacity.value,
  }));
  const r1 = useAnimatedStyle(() => ({ transform: [{ scale: ring1Scale.value }], opacity: ring1Opacity.value }));
  const r2 = useAnimatedStyle(() => ({ transform: [{ scale: ring2Scale.value }], opacity: ring2Opacity.value }));
  const r3 = useAnimatedStyle(() => ({ transform: [{ scale: ring3Scale.value }], opacity: ring3Opacity.value }));
  const dateStyle = useAnimatedStyle(() => ({ opacity: dateOpacity.value }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: doneCheckScale.value }], opacity: doneCheckOpacity.value,
  }));

  const now = new Date();
  const dateStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;

  return (
    <Animated.View style={[styles.container, bgStyle]}>
      <Animated.View style={[styles.flash, flashStyle]} />
      <Animated.View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }, shakeStyle]}>
        <Animated.View style={[styles.ring, r1]} />
        <Animated.View style={[styles.ring, r2]} />
        <Animated.View style={[styles.ring, r3]} />

        <Animated.View style={[styles.stamp, stampStyle]}>
          <View style={styles.stampOuter}>
            <View style={styles.stampInner}>
              <Text style={styles.stampText}>DONE</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.dateContainer, dateStyle]}>
          <Text style={styles.dateText}>{dateStr}</Text>
          <Text style={styles.dateLabel}>COMPLETED</Text>
        </Animated.View>

        <Animated.View style={[styles.checkContainer, checkStyle]}>
          <Text style={styles.checkText}>✓ APPROVED</Text>
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
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: ANIM_COLORS.red, zIndex: 10 },
  ring: { position: 'absolute', width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: ANIM_COLORS.red },
  stamp: { zIndex: 5, transform: [{ rotate: '-12deg' }] },
  stampOuter: {
    borderWidth: 6, borderColor: ANIM_COLORS.red, borderRadius: 12, padding: 4,
    backgroundColor: 'rgba(248, 56, 0, 0.1)',
  },
  stampInner: {
    borderWidth: 3, borderColor: ANIM_COLORS.red, borderRadius: 8,
    paddingHorizontal: 36, paddingVertical: 16,
  },
  stampText: {
    fontFamily: 'PressStart2P', fontSize: 40, color: ANIM_COLORS.red,
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0,
  },
  dateContainer: { position: 'absolute', top: SH * 0.28, alignItems: 'center', zIndex: 4 },
  dateText: { fontFamily: 'PressStart2P', fontSize: 12, color: ANIM_COLORS.cream },
  dateLabel: { fontFamily: 'PressStart2P', fontSize: 8, color: ANIM_COLORS.dimmed, marginTop: 4 },
  checkContainer: { position: 'absolute', bottom: SH * 0.2, alignItems: 'center', zIndex: 4 },
  checkText: { fontFamily: 'PressStart2P', fontSize: 14, color: ANIM_COLORS.green },
});
