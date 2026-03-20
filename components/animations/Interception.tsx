import { useEffect } from 'react';
import { StyleSheet, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { CelebrationAnimationProps, ANIM_COLORS } from '../../lib/types';

const { width: SW, height: SH } = Dimensions.get('window');

const interceptImg = require('../../assets/animations/interception.png');

export function Interception({ onComplete }: CelebrationAnimationProps) {
  const sceneOpacity = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const imgScale = useSharedValue(1.2);
  const imgX = useSharedValue(20);
  const shakeX = useSharedValue(0);
  const titleScale = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const subOpacity = useSharedValue(0);

  useEffect(() => {
    sceneOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(1, { duration: 2600 }),
      withTiming(0, { duration: 300 }),
    );

    imgScale.value = withTiming(1, { duration: 2000 });
    imgX.value = withTiming(0, { duration: 2000 });

    flashOpacity.value = withDelay(250, withSequence(
      withTiming(0.85, { duration: 35 }),
      withTiming(0, { duration: 130 }),
      withTiming(0.4, { duration: 35 }),
      withTiming(0, { duration: 130 }),
    ));

    shakeX.value = withDelay(250, withSequence(
      withTiming(8, { duration: 30 }),
      withTiming(-8, { duration: 30 }),
      withTiming(6, { duration: 25 }),
      withTiming(-4, { duration: 25 }),
      withTiming(0, { duration: 20 }),
    ));

    titleScale.value = withDelay(450, withSequence(
      withTiming(3, { duration: 70 }),
      withSpring(1, { damping: 4, stiffness: 280 }),
    ));
    titleOpacity.value = withDelay(450, withSequence(
      withTiming(1, { duration: 50 }),
      withTiming(1, { duration: 2000 }),
      withTiming(0, { duration: 250 }),
    ));

    subOpacity.value = withDelay(750, withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(1, { duration: 1750 }),
      withTiming(0, { duration: 250 }),
    ));
  }, []);

  const sceneStyle = useAnimatedStyle(() => ({
    opacity: sceneOpacity.value,
    transform: [{ translateX: shakeX.value }],
  }));
  const imgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imgScale.value }, { translateX: imgX.value }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
    opacity: titleOpacity.value,
  }));
  const subStyle = useAnimatedStyle(() => ({ opacity: subOpacity.value }));

  return (
    <Animated.View style={[styles.container, sceneStyle]}>
      <Animated.View style={imgStyle}>
        <Image source={interceptImg} style={styles.img} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[styles.flash, flashStyle]} />
      <Animated.View style={[styles.titleWrap, titleStyle]}>
        <Text style={styles.titleText}>PICKED OFF!</Text>
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
  titleWrap: { position: 'absolute', top: SH * 0.12, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  titleText: { fontFamily: 'PressStart2P', fontSize: 22, color: ANIM_COLORS.red, textShadowColor: '#000', textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
  subWrap: { position: 'absolute', bottom: SH * 0.14, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  subText: { fontFamily: 'PressStart2P', fontSize: 9, color: ANIM_COLORS.cream, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 0 },
});
