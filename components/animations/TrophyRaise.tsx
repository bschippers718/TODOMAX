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

const trophyImg = require('../../assets/animations/trophy-raise.png');

export function TrophyRaise({ onComplete }: CelebrationAnimationProps) {
  const sceneOpacity = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const imgY = useSharedValue(30);
  const shimmer = useSharedValue(0);
  const titleScale = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const subOpacity = useSharedValue(0);

  useEffect(() => {
    sceneOpacity.value = withSequence(
      withTiming(1, { duration: 250 }),
      withTiming(1, { duration: 2700 }),
      withTiming(0, { duration: 350 }),
    );

    imgY.value = withDelay(200, withTiming(0, { duration: 600 }));

    flashOpacity.value = withDelay(600, withSequence(
      withTiming(0.6, { duration: 50 }),
      withTiming(0, { duration: 200 }),
      withTiming(0.3, { duration: 50 }),
      withTiming(0, { duration: 200 }),
    ));

    shimmer.value = withDelay(800, withRepeat(
      withSequence(
        withTiming(0.15, { duration: 400 }),
        withTiming(0, { duration: 400 }),
      ), 3, false
    ));

    titleScale.value = withDelay(700, withSequence(
      withTiming(3, { duration: 80 }),
      withSpring(1, { damping: 5, stiffness: 300 }),
    ));
    titleOpacity.value = withDelay(700, withSequence(
      withTiming(1, { duration: 60 }),
      withTiming(1, { duration: 2000 }),
      withTiming(0, { duration: 250 }),
    ));

    subOpacity.value = withDelay(1000, withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(1, { duration: 1700 }),
      withTiming(0, { duration: 250 }),
    ));
  }, []);

  const sceneStyle = useAnimatedStyle(() => ({ opacity: sceneOpacity.value }));
  const imgStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: imgY.value }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));
  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
    opacity: titleOpacity.value,
  }));
  const subStyle = useAnimatedStyle(() => ({ opacity: subOpacity.value }));

  return (
    <Animated.View style={[styles.container, sceneStyle]}>
      <Animated.View style={imgStyle}>
        <Image source={trophyImg} style={styles.img} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[styles.flash, flashStyle]} />
      <Animated.View style={[styles.shimmer, shimmerStyle]} />
      <Animated.View style={[styles.titleWrap, titleStyle]}>
        <Text style={styles.titleText}>CHAMPION!</Text>
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
  shimmer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFD700', zIndex: 9 },
  titleWrap: { position: 'absolute', top: SH * 0.10, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  titleText: { fontFamily: 'PressStart2P', fontSize: 24, color: ANIM_COLORS.accent, textShadowColor: '#000', textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
  subWrap: { position: 'absolute', bottom: SH * 0.14, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  subText: { fontFamily: 'PressStart2P', fontSize: 9, color: ANIM_COLORS.cream, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 0 },
});
