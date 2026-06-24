import { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ANIM_COLORS, CelebrationAnimationProps } from '../../lib/types';

const { width: SW, height: SH } = Dimensions.get('window');

function PixelSpark({
  delay,
  left,
  top,
  color,
}: {
  delay: number;
  left: number;
  top: number;
  color: string;
}) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const y = useSharedValue(10);

  useEffect(() => {
    scale.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 80 }),
      withTiming(0.2, { duration: 560 }),
    ));
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 80 }),
      withTiming(0, { duration: 560 }),
    ));
    y.value = withDelay(delay, withTiming(-28, { duration: 640, easing: Easing.out(Easing.quad) }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }, { scale: scale.value }],
  }));

  return <Animated.View style={[styles.spark, { left, top, backgroundColor: color }, style]} />;
}

export function LevelClear({ streak = 1 }: CelebrationAnimationProps) {
  const curtain = useSharedValue(0);
  const titleY = useSharedValue(-80);
  const titleScale = useSharedValue(0.8);
  const titleOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0);
  const scanline = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const exitOpacity = useSharedValue(1);

  useEffect(() => {
    curtain.value = withSequence(
      withTiming(1, { duration: 160 }),
      withTiming(1, { duration: 2600 }),
      withTiming(0, { duration: 260 }),
    );
    titleOpacity.value = withDelay(180, withTiming(1, { duration: 80 }));
    titleY.value = withDelay(180, withSpring(0, { damping: 6, stiffness: 180 }));
    titleScale.value = withDelay(180, withSequence(
      withTiming(1.2, { duration: 80 }),
      withSpring(1, { damping: 5, stiffness: 240 }),
    ));
    cardScale.value = withDelay(520, withSpring(1, { damping: 5, stiffness: 220 }));
    scanline.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.linear }), 4, false);
    flashOpacity.value = withDelay(450, withSequence(
      withTiming(0.55, { duration: 40 }),
      withTiming(0, { duration: 160 }),
    ));
    exitOpacity.value = withDelay(3000, withTiming(0, { duration: 280 }));
  }, []);

  const sceneStyle = useAnimatedStyle(() => ({
    opacity: curtain.value * exitOpacity.value,
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }, { scale: titleScale.value }],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));
  const scanlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanline.value * SH }],
  }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));

  return (
    <Animated.View style={[styles.container, sceneStyle]}>
      <View style={styles.tileGrid}>
        {Array.from({ length: 48 }).map((_, index) => (
          <View key={index} style={styles.tile} />
        ))}
      </View>
      <Animated.View style={[styles.scanline, scanlineStyle]} />
      <Animated.View style={[styles.flash, flashStyle]} />

      <Animated.View style={[styles.titleWrap, titleStyle]}>
        <Text style={styles.levelText}>LEVEL</Text>
        <Text style={styles.clearText}>CLEAR!</Text>
      </Animated.View>

      <Animated.View style={[styles.scoreCard, cardStyle]}>
        <Text style={styles.scoreLabel}>TASK BONUS</Text>
        <Text style={styles.scoreValue}>{String(1000 + streak * 250).padStart(5, '0')}</Text>
        <Text style={styles.comboText}>STREAK x{streak}</Text>
      </Animated.View>

      <PixelSpark delay={620} left={SW * 0.18} top={SH * 0.36} color={ANIM_COLORS.accent} />
      <PixelSpark delay={700} left={SW * 0.72} top={SH * 0.32} color={ANIM_COLORS.green} />
      <PixelSpark delay={780} left={SW * 0.26} top={SH * 0.68} color={ANIM_COLORS.red} />
      <PixelSpark delay={860} left={SW * 0.68} top={SH * 0.66} color={ANIM_COLORS.blue} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: '#11101f',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tileGrid: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    flexWrap: 'wrap',
    opacity: 0.22,
  },
  tile: {
    width: SW / 6,
    height: SH / 8,
    borderBottomWidth: 1,
    borderColor: '#3b3a62',
    borderRightWidth: 1,
  },
  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ANIM_COLORS.white,
    zIndex: 20,
  },
  titleWrap: {
    alignItems: 'center',
    marginTop: -SH * 0.14,
    zIndex: 5,
  },
  levelText: {
    color: ANIM_COLORS.cream,
    fontFamily: 'PressStart2P',
    fontSize: 18,
    letterSpacing: 2,
  },
  clearText: {
    color: ANIM_COLORS.accent,
    fontFamily: 'PressStart2P',
    fontSize: 31,
    marginTop: 10,
    textShadowColor: ANIM_COLORS.red,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  scoreCard: {
    alignItems: 'center',
    backgroundColor: '#06060c',
    borderColor: ANIM_COLORS.cream,
    borderWidth: 4,
    marginTop: 42,
    paddingHorizontal: 28,
    paddingVertical: 18,
    shadowColor: ANIM_COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    zIndex: 5,
  },
  scoreLabel: {
    color: ANIM_COLORS.green,
    fontFamily: 'PressStart2P',
    fontSize: 8,
  },
  scoreValue: {
    color: ANIM_COLORS.white,
    fontFamily: 'PressStart2P',
    fontSize: 22,
    marginTop: 12,
  },
  comboText: {
    color: ANIM_COLORS.red,
    fontFamily: 'PressStart2P',
    fontSize: 8,
    marginTop: 12,
  },
  spark: {
    position: 'absolute',
    width: 14,
    height: 14,
    zIndex: 6,
  },
});
