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

function Coin({ index }: { index: number }) {
  const opacity = useSharedValue(0);
  const y = useSharedValue(44);
  const scaleX = useSharedValue(1);

  useEffect(() => {
    const delay = 140 + index * 70;
    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 80 }),
      withDelay(1150, withTiming(0, { duration: 220 })),
    ));
    y.value = withDelay(delay, withTiming(-SH * 0.42, { duration: 1350, easing: Easing.out(Easing.cubic) }));
    scaleX.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.25, { duration: 90 }),
        withTiming(1, { duration: 90 }),
      ),
      7,
      false,
    ));
  }, []);

  const spread = (index - 3.5) * 34;
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: spread },
      { translateY: y.value },
      { scaleX: scaleX.value },
    ],
  }));

  return (
    <Animated.View style={[styles.coin, style]}>
      <Text style={styles.coinText}>●</Text>
    </Animated.View>
  );
}

export function PixelPowerUp({ streak = 1 }: CelebrationAnimationProps) {
  const sceneOpacity = useSharedValue(0);
  const burstScale = useSharedValue(0);
  const titleY = useSharedValue(30);
  const titleOpacity = useSharedValue(0);
  const titleScale = useSharedValue(0.6);
  const blockY = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const exitOpacity = useSharedValue(1);

  useEffect(() => {
    sceneOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(1, { duration: 2500 }),
      withTiming(0, { duration: 250 }),
    );
    blockY.value = withDelay(200, withSequence(
      withTiming(-24, { duration: 90 }),
      withSpring(0, { damping: 4, stiffness: 300 }),
    ));
    burstScale.value = withDelay(240, withSequence(
      withTiming(1.15, { duration: 120 }),
      withTiming(0.85, { duration: 700 }),
      withTiming(0, { duration: 300 }),
    ));
    glowOpacity.value = withDelay(220, withSequence(
      withTiming(0.55, { duration: 120 }),
      withRepeat(withSequence(
        withTiming(0.25, { duration: 180 }),
        withTiming(0.55, { duration: 180 }),
      ), 4, false),
      withTiming(0, { duration: 220 }),
    ));
    titleOpacity.value = withDelay(560, withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(1, { duration: 1650 }),
      withTiming(0, { duration: 250 }),
    ));
    titleY.value = withDelay(560, withSpring(0, { damping: 5, stiffness: 240 }));
    titleScale.value = withDelay(560, withSequence(
      withTiming(1.15, { duration: 80 }),
      withSpring(1, { damping: 4, stiffness: 260 }),
    ));
    exitOpacity.value = withDelay(2800, withTiming(0, { duration: 220 }));
  }, []);

  const sceneStyle = useAnimatedStyle(() => ({
    opacity: sceneOpacity.value * exitOpacity.value,
  }));
  const blockStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: blockY.value }],
  }));
  const burstStyle = useAnimatedStyle(() => ({
    transform: [{ scale: burstScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }, { scale: titleScale.value }],
  }));

  return (
    <Animated.View style={[styles.container, sceneStyle]}>
      <View style={styles.pixelSky}>
        {Array.from({ length: 28 }).map((_, index) => (
          <View key={index} style={[styles.star, index % 2 === 0 && styles.starAlt]} />
        ))}
      </View>

      <Animated.View style={[styles.glow, glowStyle]} />
      <Animated.View style={[styles.burst, burstStyle]} />

      <View style={styles.coinLayer}>
        {Array.from({ length: 8 }).map((_, index) => (
          <Coin key={index} index={index} />
        ))}
      </View>

      <Animated.View style={[styles.block, blockStyle]}>
        <Text style={styles.blockText}>?</Text>
      </Animated.View>

      <Animated.View style={[styles.titleWrap, titleStyle]}>
        <Text style={styles.powerText}>POWER UP!</Text>
        <Text style={styles.subText}>COMBO x{streak}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: '#050510',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pixelSky: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    flexWrap: 'wrap',
    opacity: 0.22,
    padding: 16,
  },
  star: {
    width: 5,
    height: 5,
    backgroundColor: ANIM_COLORS.blue,
    marginHorizontal: 22,
    marginVertical: 34,
  },
  starAlt: {
    backgroundColor: ANIM_COLORS.cream,
    transform: [{ rotate: '45deg' }],
  },
  glow: {
    position: 'absolute',
    width: SW * 0.8,
    height: SW * 0.8,
    borderRadius: SW * 0.4,
    backgroundColor: ANIM_COLORS.accent,
  },
  burst: {
    position: 'absolute',
    width: SW * 0.72,
    height: SW * 0.72,
    borderColor: ANIM_COLORS.white,
    borderRadius: SW * 0.36,
    borderWidth: 8,
  },
  coinLayer: {
    position: 'absolute',
    alignItems: 'center',
    top: SH * 0.48,
  },
  coin: {
    position: 'absolute',
  },
  coinText: {
    color: ANIM_COLORS.accent,
    fontSize: 28,
    textShadowColor: '#7a4100',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  block: {
    alignItems: 'center',
    backgroundColor: ANIM_COLORS.accent,
    borderBottomColor: '#a15a00',
    borderBottomWidth: 8,
    borderColor: '#fff2a8',
    borderLeftWidth: 4,
    borderRightColor: '#7a4100',
    borderRightWidth: 8,
    borderTopWidth: 4,
    height: 96,
    justifyContent: 'center',
    width: 96,
    zIndex: 6,
  },
  blockText: {
    color: '#5f3300',
    fontFamily: 'PressStart2P',
    fontSize: 42,
  },
  titleWrap: {
    alignItems: 'center',
    bottom: SH * 0.18,
    position: 'absolute',
    zIndex: 8,
  },
  powerText: {
    color: ANIM_COLORS.green,
    fontFamily: 'PressStart2P',
    fontSize: 24,
    textShadowColor: '#003b00',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  subText: {
    color: ANIM_COLORS.cream,
    fontFamily: 'PressStart2P',
    fontSize: 9,
    marginTop: 12,
  },
});
