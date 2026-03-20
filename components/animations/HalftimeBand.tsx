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
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { CelebrationAnimationProps, ANIM_COLORS } from '../../lib/types';

const { width: SW, height: SH } = Dimensions.get('window');

const halftimeImg = require('../../assets/animations/halftime-band.png');

export function HalftimeBand({ onComplete }: CelebrationAnimationProps) {
  const sceneOpacity = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const imgScale = useSharedValue(1.1);
  const imgY = useSharedValue(-10);
  const titleScale = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const subOpacity = useSharedValue(0);
  const noteFloat = useSharedValue(0);

  useEffect(() => {
    sceneOpacity.value = withSequence(
      withTiming(1, { duration: 250 }),
      withTiming(1, { duration: 2800 }),
      withTiming(0, { duration: 350 }),
    );

    imgScale.value = withTiming(1, { duration: 2500, easing: Easing.out(Easing.quad) });
    imgY.value = withTiming(0, { duration: 2500, easing: Easing.out(Easing.quad) });

    flashOpacity.value = withDelay(400, withSequence(
      withTiming(0.5, { duration: 50 }),
      withTiming(0, { duration: 200 }),
    ));

    noteFloat.value = withDelay(500, withRepeat(
      withSequence(
        withTiming(-3, { duration: 500 }),
        withTiming(3, { duration: 500 }),
      ), -1, true
    ));

    titleScale.value = withDelay(600, withSequence(
      withTiming(2.8, { duration: 80 }),
      withSpring(1, { damping: 5, stiffness: 280 }),
    ));
    titleOpacity.value = withDelay(600, withSequence(
      withTiming(1, { duration: 60 }),
      withTiming(1, { duration: 2100 }),
      withTiming(0, { duration: 250 }),
    ));

    subOpacity.value = withDelay(900, withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(1, { duration: 1800 }),
      withTiming(0, { duration: 250 }),
    ));
  }, []);

  const sceneStyle = useAnimatedStyle(() => ({ opacity: sceneOpacity.value }));
  const imgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imgScale.value }, { translateY: imgY.value }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }, { translateY: noteFloat.value }],
    opacity: titleOpacity.value,
  }));
  const subStyle = useAnimatedStyle(() => ({ opacity: subOpacity.value }));

  return (
    <Animated.View style={[styles.container, sceneStyle]}>
      <Animated.View style={imgStyle}>
        <Image source={halftimeImg} style={styles.img} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[styles.flash, flashStyle]} />
      <Animated.View style={[styles.titleWrap, titleStyle]}>
        <Text style={styles.titleText}>HALFTIME!</Text>
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
  titleWrap: { position: 'absolute', top: SH * 0.10, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  titleText: { fontFamily: 'PressStart2P', fontSize: 26, color: ANIM_COLORS.accent, textShadowColor: '#000', textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
  subWrap: { position: 'absolute', bottom: SH * 0.14, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  subText: { fontFamily: 'PressStart2P', fontSize: 9, color: ANIM_COLORS.cream, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 0 },
});
