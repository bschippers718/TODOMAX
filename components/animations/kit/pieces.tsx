import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { KIT_COLORS } from '../../../lib/types';

const { width: SW } = Dimensions.get('window');

export const KIT_ASSETS = {
  building: require('../../../assets/kit/building.png'),
  car: require('../../../assets/kit/car.png'),
  flag: require('../../../assets/kit/flag.png'),
  map: require('../../../assets/kit/map.jpg'),
};

export const PIXEL_FONT = 'PressStart2P';

/** Hard-edged 8-bit drop shadow, like the kit's banner type. */
export const pixelShadow = (color: string = KIT_COLORS.bannerShadow, px = 3) => ({
  textShadowColor: color,
  textShadowOffset: { width: px, height: px },
  textShadowRadius: 0,
});

// ---------------------------------------------------------------------------
// Scene exit: one opacity value that every kit animation fades out on.
// ---------------------------------------------------------------------------
export function useSceneExit(startAt: number, duration = 300) {
  const exit = useSharedValue(1);
  useEffect(() => {
    exit.value = withDelay(startAt, withTiming(0, { duration }));
  }, []);
  return useAnimatedStyle(() => ({ opacity: exit.value }));
}

// ---------------------------------------------------------------------------
// Red banner that slams in from the left with yellow pixel type.
// Driven by a 0..1 `slide` so callers can time it against other beats.
// ---------------------------------------------------------------------------
export function KitBanner({
  title,
  subtitle,
  slide,
  top,
  titleSize = 26,
}: {
  title: string;
  subtitle?: string;
  slide: SharedValue<number>;
  top: number;
  titleSize?: number;
}) {
  const barStyle = useAnimatedStyle(() => ({
    opacity: slide.value > 0.01 ? 1 : 0,
    transform: [{ translateX: (1 - slide.value) * -SW }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: slide.value,
    // Text lands a hair after the bar with a tiny overshoot.
    transform: [{ scale: 0.9 + 0.1 * Math.min(1, slide.value * 1.15) }],
  }));

  return (
    <View style={[styles.bannerWrap, { top }]} pointerEvents="none">
      <Animated.View style={[styles.bannerBar, barStyle]} />
      <Animated.View style={[styles.bannerTextWrap, textStyle]}>
        <Text style={[styles.bannerTitle, { fontSize: titleSize }]}>{title}</Text>
        {subtitle ? <Text style={styles.bannerSub}>{subtitle}</Text> : null}
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Typewriter text: letters pop in as `progress` runs 0..1. One shared value,
// one derived style per letter — nothing on the JS thread per frame.
// ---------------------------------------------------------------------------
function TypedLetter({
  ch,
  index,
  count,
  progress,
  color,
  size,
}: {
  ch: string;
  index: number;
  count: number;
  progress: SharedValue<number>;
  color: string;
  size: number;
}) {
  const style = useAnimatedStyle(() => {
    // Offset by half a step so the first letter waits for progress to move.
    const threshold = (index + 0.5) / count;
    const on = progress.value >= threshold;
    // Each letter pops slightly oversized the instant it appears.
    const since = Math.max(0, progress.value - threshold) * count;
    const scale = on ? 1 + 0.3 * Math.max(0, 1 - since * 2) : 0.6;
    return { opacity: on ? 1 : 0, transform: [{ scale }] };
  });
  return (
    <Animated.Text style={[styles.typed, { color, fontSize: size }, pixelShadow(), style]}>
      {ch === ' ' ? '\u00A0' : ch}
    </Animated.Text>
  );
}

export function TypedText({
  text,
  progress,
  color = KIT_COLORS.typeGreen,
  size = 22,
}: {
  text: string;
  progress: SharedValue<number>;
  color?: string;
  size?: number;
}) {
  const letters = useMemo(() => text.split(''), [text]);
  return (
    <View style={styles.typedRow}>
      {letters.map((ch, i) => (
        <TypedLetter
          key={`${ch}-${i}`}
          ch={ch}
          index={i}
          count={letters.length}
          progress={progress}
          color={color}
          size={size}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Building shard: a chunky block flung from a point with gravity and spin.
// ---------------------------------------------------------------------------
export function Shard({
  delay,
  originX,
  originY,
  angle,
  speed,
  color,
  size = 14,
  tall = false,
}: {
  delay: number;
  originX: number;
  originY: number;
  /** radians, 0 = right, -PI/2 = up */
  angle: number;
  speed: number;
  color: string;
  size?: number;
  tall?: boolean;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 900, easing: Easing.linear }));
  }, []);

  const style = useAnimatedStyle(() => {
    const time = t.value;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const gravity = 520; // px/s^2 — feels heavy, like masonry
    const x = vx * time;
    const y = vy * time + 0.5 * gravity * time * time;
    return {
      opacity: time === 0 ? 0 : Math.max(0, 1 - Math.pow(time, 3)),
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${time * (angle > -Math.PI / 2 ? 540 : -540)}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.shard,
        {
          left: originX,
          top: originY,
          width: size,
          height: tall ? size * 2.2 : size,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Pixel sparkle: a plus-shaped burst of blocks that pops and fades.
// ---------------------------------------------------------------------------
export function Sparkle({
  delay,
  x,
  y,
  color = KIT_COLORS.bannerYellow,
  size = 8,
}: {
  delay: number;
  x: number;
  y: number;
  color?: string;
  size?: number;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 120 }),
        withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) }),
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scale: 0.4 + 0.6 * p.value }, { rotate: `${p.value * 90}deg` }],
  }));

  const arm = size * 2.2;
  return (
    <Animated.View style={[styles.sparkle, { left: x - arm, top: y - arm, width: arm * 2, height: arm * 2 }, style]}>
      <View style={[styles.sparkBlock, { width: size, height: size, backgroundColor: color, left: arm - size / 2, top: 0 }]} />
      <View style={[styles.sparkBlock, { width: size, height: size, backgroundColor: color, left: arm - size / 2, bottom: 0 }]} />
      <View style={[styles.sparkBlock, { width: size, height: size, backgroundColor: color, top: arm - size / 2, left: 0 }]} />
      <View style={[styles.sparkBlock, { width: size, height: size, backgroundColor: color, top: arm - size / 2, right: 0 }]} />
      <View style={[styles.sparkBlock, { width: size, height: size, backgroundColor: '#fff', left: arm - size / 2, top: arm - size / 2 }]} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Flag drop: pole slams into the ground and the flag settles with a spring.
// ---------------------------------------------------------------------------
export function PixelFlag({ delay, x, y, height = 76 }: { delay: number; x: number; y: number; height?: number }) {
  const drop = useSharedValue(0);
  useEffect(() => {
    drop.value = withDelay(delay, withSpring(1, { damping: 9, stiffness: 240, mass: 0.6 }));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: drop.value > 0.02 ? 1 : 0,
    transform: [{ translateY: (1 - drop.value) * -120 }, { scaleY: 0.85 + 0.15 * drop.value }],
  }));
  const width = height * (180 / 210);
  return (
    <Animated.View style={[styles.flag, { left: x - width * 0.18, top: y - height, width, height }, style]}>
      <Image source={KIT_ASSETS.flag} style={{ width, height }} contentFit="contain" />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Full-screen white flash. Pass the shared value so callers control timing.
// ---------------------------------------------------------------------------
export function Flash({ opacity }: { opacity: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, style]} />;
}

const styles = StyleSheet.create({
  bannerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  bannerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 4,
    bottom: 4,
    backgroundColor: KIT_COLORS.bannerRed,
  },
  bannerTextWrap: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  bannerTitle: {
    fontFamily: PIXEL_FONT,
    color: KIT_COLORS.bannerYellow,
    textAlign: 'center',
    lineHeight: 34,
    ...pixelShadow(),
  },
  bannerSub: {
    fontFamily: PIXEL_FONT,
    color: KIT_COLORS.cream,
    fontSize: 9,
    marginTop: 10,
    letterSpacing: 1,
    ...pixelShadow(KIT_COLORS.bannerShadow, 2),
  },
  typedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  typed: {
    fontFamily: PIXEL_FONT,
    lineHeight: 30,
  },
  shard: {
    position: 'absolute',
    zIndex: 12,
  },
  sparkle: {
    position: 'absolute',
    zIndex: 14,
  },
  sparkBlock: {
    position: 'absolute',
  },
  flag: {
    position: 'absolute',
    zIndex: 13,
  },
  flash: {
    backgroundColor: '#FFFFFF',
    zIndex: 40,
  },
});
