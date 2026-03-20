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

const replayImg = require('../../assets/animations/instant-replay.png');

export function InstantReplay({ onComplete }: CelebrationAnimationProps) {
  const sceneOpacity = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const imgScale = useSharedValue(1.05);
  const scanlineY = useSharedValue(-SH);
  const titleScale = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const subOpacity = useSharedValue(0);
  const staticFlicker = useSharedValue(0);

  useEffect(() => {
    sceneOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(1, { duration: 2800 }),
      withTiming(0, { duration: 250 }),
    );

    imgScale.value = withTiming(1, { duration: 2000 });

    flashOpacity.value = withSequence(
      withTiming(0.9, { duration: 40 }),
      withTiming(0, { duration: 100 }),
      withDelay(100, withSequence(
        withTiming(0.4, { duration: 30 }),
        withTiming(0, { duration: 100 }),
      )),
    );

    staticFlicker.value = withRepeat(
      withSequence(
        withTiming(0.04, { duration: 80 }),
        withTiming(0, { duration: 80 }),
      ), 15, false
    );

    scanlineY.value = withDelay(300, withRepeat(
      withTiming(SH, { duration: 2500 }),
      2, false
    ));

    titleScale.value = withDelay(500, withSequence(
      withTiming(2.5, { duration: 80 }),
      withSpring(1, { damping: 5, stiffness: 300 }),
    ));
    titleOpacity.value = withDelay(500, withSequence(
      withTiming(1, { duration: 60 }),
      withTiming(1, { duration: 2100 }),
      withTiming(0, { duration: 250 }),
    ));

    subOpacity.value = withDelay(800, withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(1, { duration: 1800 }),
      withTiming(0, { duration: 250 }),
    ));
  }, []);

  const sceneStyle = useAnimatedStyle(() => ({ opacity: sceneOpacity.value }));
  const imgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imgScale.value }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const flickerStyle = useAnimatedStyle(() => ({ opacity: staticFlicker.value }));
  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanlineY.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
    opacity: titleOpacity.value,
  }));
  const subStyle = useAnimatedStyle(() => ({ opacity: subOpacity.value }));

  return (
    <Animated.View style={[styles.container, sceneStyle]}>
      <Animated.View style={imgStyle}>
        <Image source={replayImg} style={styles.img} contentFit="contain" />
      </Animated.View>
      <Animated.View style={[styles.flash, flashStyle]} />
      <Animated.View style={[styles.flicker, flickerStyle]} />
      <Animated.View style={[styles.scanline, scanStyle]} />
      <Animated.View style={[styles.titleWrap, titleStyle]}>
        <Text style={styles.titleText}>REPLAY!</Text>
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
  flicker: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFF', zIndex: 8 },
  scanline: {
    position: 'absolute', left: 0, right: 0, height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)', zIndex: 9,
  },
  titleWrap: { position: 'absolute', top: SH * 0.10, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  titleText: { fontFamily: 'PressStart2P', fontSize: 28, color: ANIM_COLORS.white, textShadowColor: ANIM_COLORS.blue, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
  subWrap: { position: 'absolute', bottom: SH * 0.14, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  subText: { fontFamily: 'PressStart2P', fontSize: 9, color: ANIM_COLORS.cream, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 0 },
});
