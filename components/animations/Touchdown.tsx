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
import { Image } from 'expo-image';
import { CelebrationAnimationProps, ANIM_COLORS } from '../../lib/types';

const { width: SW, height: SH } = Dimensions.get('window');
const GIF_ASPECT = 612 / 1110;
const GIF_H = SW * GIF_ASPECT;

const tecmoGif = require('../../assets/animations/tecmo-touchdown.gif');

export function Touchdown({ onComplete }: CelebrationAnimationProps) {
  // --- Phase 1: Black panels creep in from edges ---
  const topH = useSharedValue(0);
  const bottomH = useSharedValue(0);
  const sideW = useSharedValue(0);
  const vignetteOpacity = useSharedValue(0);

  // --- Phase 2: GIF crossfades in ---
  const gifOpacity = useSharedValue(0);
  const gifScale = useSharedValue(1.08);

  // --- Phase 3: Text + effects ---
  const flashOpacity = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const tdScale = useSharedValue(0);
  const tdOpacity = useSharedValue(0);
  const subOpacity = useSharedValue(0);

  // --- Phase 4: Exit ---
  const exitOpacity = useSharedValue(1);

  const CREEP_DUR = 450;
  const CREEP_EASE = Easing.bezier(0.4, 0, 0.2, 1);

  useEffect(() => {
    // Phase 1 (0–450ms): Black panels slide in from all edges
    const targetTopH = (SH - GIF_H) / 2;
    const targetBottomH = targetTopH;
    const targetSideW = 0;

    topH.value = withTiming(targetTopH, { duration: CREEP_DUR, easing: CREEP_EASE });
    bottomH.value = withTiming(targetBottomH, { duration: CREEP_DUR, easing: CREEP_EASE });
    sideW.value = withTiming(SW * 0.03, { duration: CREEP_DUR, easing: CREEP_EASE });
    vignetteOpacity.value = withTiming(1, { duration: CREEP_DUR * 0.6, easing: CREEP_EASE });

    // Phase 2 (200–700ms): GIF crossfades in with subtle zoom settle
    gifOpacity.value = withDelay(200, withTiming(1, {
      duration: 500, easing: Easing.out(Easing.quad),
    }));
    gifScale.value = withDelay(200, withTiming(1, {
      duration: 800, easing: Easing.out(Easing.quad),
    }));

    // Phase 3 (700ms+): Flash, shake, text
    flashOpacity.value = withDelay(700, withSequence(
      withTiming(0.65, { duration: 40 }),
      withTiming(0, { duration: 150 }),
    ));

    shakeX.value = withDelay(700, withSequence(
      withTiming(5, { duration: 35 }),
      withTiming(-5, { duration: 35 }),
      withTiming(4, { duration: 30 }),
      withTiming(-3, { duration: 30 }),
      withTiming(0, { duration: 25 }),
    ));

    tdScale.value = withDelay(850, withSequence(
      withTiming(2.8, { duration: 80 }),
      withSpring(1, { damping: 5, stiffness: 300 }),
    ));
    tdOpacity.value = withDelay(850, withSequence(
      withTiming(1, { duration: 60 }),
      withTiming(1, { duration: 2200 }),
      withTiming(0, { duration: 300 }),
    ));

    subOpacity.value = withDelay(1200, withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 1850 }),
      withTiming(0, { duration: 300 }),
    ));

    // Phase 4 (3400ms+): Everything fades out
    exitOpacity.value = withDelay(3400, withTiming(0, { duration: 400 }));
  }, []);

  // Animated styles
  const topPanelStyle = useAnimatedStyle(() => ({
    height: topH.value,
  }));
  const bottomPanelStyle = useAnimatedStyle(() => ({
    height: bottomH.value,
  }));
  const leftPanelStyle = useAnimatedStyle(() => ({
    width: sideW.value,
  }));
  const rightPanelStyle = useAnimatedStyle(() => ({
    width: sideW.value,
  }));
  const vignetteStyle = useAnimatedStyle(() => ({
    opacity: vignetteOpacity.value,
  }));
  const gifStyle = useAnimatedStyle(() => ({
    opacity: gifOpacity.value,
    transform: [{ scale: gifScale.value }],
  }));
  const containerShake = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
    opacity: exitOpacity.value,
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const tdStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tdScale.value }],
    opacity: tdOpacity.value,
  }));
  const subStyle = useAnimatedStyle(() => ({ opacity: subOpacity.value }));

  return (
    <Animated.View style={[styles.container, containerShake]}>
      {/* Vignette: semi-transparent black that fades in first */}
      <Animated.View style={[styles.vignette, vignetteStyle]} />

      {/* Black panels creeping in from edges */}
      <Animated.View style={[styles.panelTop, topPanelStyle]} />
      <Animated.View style={[styles.panelBottom, bottomPanelStyle]} />
      <Animated.View style={[styles.panelLeft, leftPanelStyle]} />
      <Animated.View style={[styles.panelRight, rightPanelStyle]} />

      {/* GIF crossfades in */}
      <Animated.View style={[styles.gifWrap, gifStyle]}>
        <Image
          source={tecmoGif}
          style={styles.gif}
          contentFit="contain"
          autoplay={true}
        />
      </Animated.View>

      {/* White flash */}
      <Animated.View style={[styles.flash, flashStyle]} />

      {/* Text overlays */}
      <Animated.View style={[styles.tdContainer, tdStyle]}>
        <Text style={styles.tdText}>TOUCHDOWN!</Text>
      </Animated.View>

      <Animated.View style={[styles.subContainer, subStyle]}>
        <Text style={styles.subText}>✓ TASK COMPLETE</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },

  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 1,
  },

  panelTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: '#000', zIndex: 5,
  },
  panelBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#000', zIndex: 5,
  },
  panelLeft: {
    position: 'absolute', top: 0, bottom: 0, left: 0,
    backgroundColor: '#000', zIndex: 5,
  },
  panelRight: {
    position: 'absolute', top: 0, bottom: 0, right: 0,
    backgroundColor: '#000', zIndex: 5,
  },

  gifWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  gif: {
    width: SW,
    height: GIF_H,
  },

  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },

  tdContainer: {
    position: 'absolute',
    top: SH * 0.12,
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  tdText: {
    fontFamily: 'PressStart2P',
    fontSize: 26,
    color: ANIM_COLORS.accent,
    textShadowColor: '#000',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  subContainer: {
    position: 'absolute',
    bottom: SH * 0.15,
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  subText: {
    fontFamily: 'PressStart2P',
    fontSize: 9,
    color: ANIM_COLORS.cream,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
});
