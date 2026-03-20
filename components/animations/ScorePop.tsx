import { useEffect } from 'react';
import { StyleSheet, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  withRepeat,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { CelebrationAnimationProps, ANIM_COLORS } from '../../lib/types';

const { width: SW, height: SH } = Dimensions.get('window');

const scoreImg = require('../../assets/animations/score-pop.png');

export function ScorePop({ onComplete }: CelebrationAnimationProps) {
  const sceneOpacity = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const imgScale = useSharedValue(0.9);
  const shakeX = useSharedValue(0);
  const titleScale = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const subOpacity = useSharedValue(0);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    sceneOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 2400 }),
      withTiming(0, { duration: 300 }),
    );

    imgScale.value = withDelay(100, withSpring(1, { damping: 6, stiffness: 200 }));

    flashOpacity.value = withDelay(350, withSequence(
      withTiming(0.9, { duration: 40 }),
      withTiming(0, { duration: 150 }),
    ));

    shakeX.value = withDelay(350, withSequence(
      withTiming(7, { duration: 30 }),
      withTiming(-7, { duration: 30 }),
      withTiming(5, { duration: 25 }),
      withTiming(-5, { duration: 25 }),
      withTiming(0, { duration: 20 }),
    ));

    pulseOpacity.value = withDelay(500, withRepeat(
      withSequence(
        withTiming(0.12, { duration: 300 }),
        withTiming(0, { duration: 300 }),
      ), 4, false
    ));

    titleScale.value = withDelay(500, withSequence(
      withTiming(3.2, { duration: 70 }),
      withSpring(1, { damping: 4, stiffness: 260 }),
    ));
    titleOpacity.value = withDelay(500, withSequence(
      withTiming(1, { duration: 50 }),
      withTiming(1, { duration: 1800 }),
      withTiming(0, { duration: 250 }),
    ));

    subOpacity.value = withDelay(800, withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(1, { duration: 1500 }),
      withTiming(0, { duration: 250 }),
    ));
  }, []);

  const sceneStyle = useAnimatedStyle(() => ({
    opacity: sceneOpacity.value,
    transform: [{ translateX: shakeX.value }],
  }));
  const imgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imgScale.value }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));
  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
    opacity: titleOpacity.value,
  }));
  const subStyle = useAnimatedStyle(() => ({ opacity: subOpacity.value }));

  return (
    <Animated.View style={[styles.container, sceneStyle]}>
      <Animated.View style={imgStyle}>
        <Image source={scoreImg} style={styles.img} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[styles.flash, flashStyle]} />
      <Animated.View style={[styles.pulse, pulseStyle]} />
      <Animated.View style={[styles.titleWrap, titleStyle]}>
        <Text style={styles.titleText}>VICTORY!</Text>
      </Animated.View>
      <Animated.View style={[styles.subWrap, subStyle]}>
        <Text style={styles.subText}>✓ TASK COMPLETE</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  img: { width: SW, height: SW * (612 / 1110) },
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFF', zIndex: 10 },
  pulse: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFD700', zIndex: 9 },
  titleWrap: { position: 'absolute', top: SH * 0.10, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  titleText: { fontFamily: 'PressStart2P', fontSize: 26, color: ANIM_COLORS.red, textShadowColor: '#000', textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
  subWrap: { position: 'absolute', bottom: SH * 0.14, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  subText: { fontFamily: 'PressStart2P', fontSize: 9, color: ANIM_COLORS.cream, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 0 },
});
