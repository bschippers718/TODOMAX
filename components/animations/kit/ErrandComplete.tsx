import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { CelebrationAnimationProps, KIT_COLORS } from '../../../lib/types';
import {
  Flash,
  KitBanner,
  KIT_ASSETS,
  PixelFlag,
  Shard,
  Sparkle,
  TypedText,
  useSceneExit,
} from './pieces';

const { width: SW, height: SH } = Dimensions.get('window');

const BUILDING_W = SW * 0.64;
const BUILDING_H = BUILDING_W * (180 / 310);
const BUILDING_TOP = SH * 0.2;
const BUILDING_CX = SW / 2;
const BUILDING_CY = BUILDING_TOP + BUILDING_H * 0.55;

// Beats (ms)
const T_LAND = 420;
const T_SHATTER = 700;
const T_FLAG = 980;
const T_TYPE_1 = 1050;
const T_TYPE_2 = 1400;
const T_BANNER = 2000;
const T_EXIT = 3150;
export const ERRAND_COMPLETE_DURATION = 3450;

const SHARD_COLORS = [
  KIT_COLORS.shardBlue,
  KIT_COLORS.shardBlueDark,
  KIT_COLORS.shardGreen,
  KIT_COLORS.shardGray,
  KIT_COLORS.shardBlue,
  KIT_COLORS.ink,
];

export function ErrandComplete({ streak = 1 }: CelebrationAnimationProps) {
  const sceneIn = useSharedValue(0);
  const drop = useSharedValue(0);
  const squash = useSharedValue(1);
  const buildingAlive = useSharedValue(1);
  const flash = useSharedValue(0);
  const type1 = useSharedValue(0);
  const type2 = useSharedValue(0);
  const typedFade = useSharedValue(1);
  const banner = useSharedValue(0);
  const exitStyle = useSceneExit(T_EXIT, 300);

  const shards = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const spread = (i / 13) * Math.PI * 0.9 + Math.PI * 0.05; // fan upward: ~9° .. 171°
        return {
          angle: -spread,
          speed: 280 + ((i * 97) % 5) * 85,
          color: SHARD_COLORS[i % SHARD_COLORS.length],
          size: 10 + ((i * 31) % 3) * 4,
          tall: i % 3 === 0,
          delay: T_SHATTER + (i % 4) * 18,
        };
      }),
    [],
  );

  useEffect(() => {
    sceneIn.value = withTiming(1, { duration: 160 });

    // Building drops in and lands with a squash.
    drop.value = withTiming(1, { duration: T_LAND, easing: Easing.in(Easing.quad) });
    squash.value = withDelay(
      T_LAND,
      withSequence(
        withTiming(0.86, { duration: 70, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 7, stiffness: 320 }),
      ),
    );

    // Shatter: a flash, the building swells for a frame and is gone.
    flash.value = withDelay(
      T_SHATTER - 30,
      withSequence(withTiming(0.7, { duration: 40 }), withTiming(0, { duration: 180 })),
    );
    buildingAlive.value = withDelay(
      T_SHATTER - 40,
      withSequence(withTiming(1.12, { duration: 50 }), withTiming(0, { duration: 60 })),
    );

    // Type in green, then the banner takes over and the type goes yellow.
    type1.value = withDelay(T_TYPE_1, withTiming(1, { duration: 320, easing: Easing.linear }));
    type2.value = withDelay(T_TYPE_2, withTiming(1, { duration: 480, easing: Easing.linear }));
    typedFade.value = withDelay(T_BANNER + 40, withTiming(0, { duration: 120 }));
    banner.value = withDelay(T_BANNER, withSpring(1, { damping: 16, stiffness: 190, mass: 0.8 }));
  }, []);

  const sceneStyle = useAnimatedStyle(() => ({ opacity: sceneIn.value }));
  const buildingStyle = useAnimatedStyle(() => {
    const alive = buildingAlive.value;
    return {
      opacity: alive > 0.05 ? 1 : 0,
      transform: [
        { translateY: (1 - drop.value) * -SH * 0.55 },
        { scaleY: squash.value },
        { scaleX: 1 + (1 - squash.value) * 0.6 },
        { scale: Math.max(alive, 0.01) },
      ],
    };
  });
  const typedStyle = useAnimatedStyle(() => ({ opacity: typedFade.value }));

  return (
    <Animated.View style={[styles.container, sceneStyle, exitStyle]}>
      <Image source={KIT_ASSETS.map} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={styles.tint} />

      <Animated.View style={[styles.building, buildingStyle]}>
        <Image source={KIT_ASSETS.building} style={styles.buildingImg} contentFit="contain" />
      </Animated.View>

      {shards.map((s, i) => (
        <Shard
          key={i}
          delay={s.delay}
          originX={BUILDING_CX - s.size / 2}
          originY={BUILDING_CY - s.size / 2}
          angle={s.angle}
          speed={s.speed}
          color={s.color}
          size={s.size}
          tall={s.tall}
        />
      ))}

      <Sparkle delay={T_SHATTER + 60} x={BUILDING_CX - SW * 0.22} y={BUILDING_CY - 30} />
      <Sparkle delay={T_SHATTER + 180} x={BUILDING_CX + SW * 0.24} y={BUILDING_CY - 56} color="#C85CE8" />
      <Sparkle delay={T_SHATTER + 300} x={BUILDING_CX + SW * 0.06} y={BUILDING_CY - 120} color={KIT_COLORS.typeGreen} size={6} />

      <PixelFlag delay={T_FLAG} x={BUILDING_CX} y={BUILDING_CY + 24} />

      <Animated.View style={[styles.typedWrap, typedStyle]}>
        <TypedText text="ERRAND" progress={type1} size={26} />
        <TypedText text="COMPLETE!" progress={type2} size={26} />
      </Animated.View>

      <KitBanner
        title={'ERRAND\nCOMPLETE!'}
        subtitle={`STREAK x${streak}   ·   ONE LESS THING`}
        slide={banner}
        top={SH * 0.55}
      />

      <Flash opacity={flash} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: KIT_COLORS.sky,
    overflow: 'hidden',
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 20, 40, 0.18)',
  },
  building: {
    position: 'absolute',
    left: BUILDING_CX - BUILDING_W / 2,
    top: BUILDING_TOP,
    width: BUILDING_W,
    height: BUILDING_H,
    zIndex: 10,
  },
  buildingImg: {
    width: '100%',
    height: '100%',
  },
  typedWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: SH * 0.55 + 22,
    alignItems: 'center',
    zIndex: 20,
  },
});
