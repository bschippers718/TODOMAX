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
import { CelebrationAnimationProps, KIT_COLORS } from '../../../lib/types';
import { Flash, KitBanner, Sparkle, useSceneExit } from './pieces';

const { width: SW, height: SH } = Dimensions.get('window');

// Hydrant geometry. It sits a little below centre so the jet has room to grow.
const HW = Math.min(SW * 0.36, 150);
const HYDRANT_CX = SW / 2;
const HYDRANT_BASE_Y = SH * 0.62;
const BODY_W = HW * 0.56;
const BODY_H = HW * 0.92;
const DOME_H = HW * 0.3;
const BASE_H = HW * 0.18;
const HYDRANT_H = DOME_H + BODY_H + BASE_H;
const HYDRANT_TOP = HYDRANT_BASE_Y - HYDRANT_H;
// The front nozzle — where the water comes from.
const NOZZLE = HW * 0.26;
const NOZZLE_CX = HYDRANT_CX;
const NOZZLE_CY = HYDRANT_TOP + DOME_H + BODY_H * 0.42;
// The jet aims at the viewer; in 2D that's the middle of the screen.
const CAMERA_CX = SW / 2;
const CAMERA_CY = SH * 0.42;

const WATER = KIT_COLORS.water;
const WATER_LIGHT = '#6FB7F0';
const WATER_PALE = '#BFE3FF';
const BOLT = '#7A1310';

// Beats (ms)
const T_SHAKE = 380;
const T_POP = 820;
const T_BLAST = T_POP + 40;
const T_SPLASH = T_BLAST + 420;
const T_BANNER = T_SPLASH + 460;
const T_EXIT = 3200;
export const HYDRANT_BLAST_DURATION = 3500;

// Deterministic pseudo-random so the layout is stable across renders.
const rnd = (i: number, k: number) => ((i * 9301 + k * 49297) % 233280) / 233280;

/** One slug of the jet: starts at the nozzle, rushes at the camera and swells. */
function JetSlug({ delay, size, offsetX, offsetY, color }: { delay: number; size: number; offsetX: number; offsetY: number; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 520, easing: Easing.in(Easing.quad) }));
  }, []);
  const style = useAnimatedStyle(() => {
    const t = p.value;
    const dx = CAMERA_CX - NOZZLE_CX + offsetX;
    const dy = CAMERA_CY - NOZZLE_CY + offsetY;
    return {
      opacity: t === 0 ? 0 : t < 0.8 ? 0.95 : Math.max(0, (1 - t) / 0.2),
      transform: [{ translateX: dx * t }, { translateY: dy * t }, { scale: 0.25 + 7.5 * t * t }, { rotate: '45deg' }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.slug, { left: NOZZLE_CX - size / 2, top: NOZZLE_CY - size / 2, width: size, height: size, backgroundColor: color }, style]}
    />
  );
}

/** Spray droplet: flung outward from the nozzle, growing as it nears the lens. */
function Droplet({ delay, angle, dist, size, color }: { delay: number; angle: number; dist: number; size: number; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 640, easing: Easing.out(Easing.quad) }));
  }, []);
  const style = useAnimatedStyle(() => {
    const t = p.value;
    const x = Math.cos(angle) * dist * t;
    const y = Math.sin(angle) * dist * t + 90 * t * t; // a little gravity
    return {
      opacity: t === 0 ? 0 : Math.max(0, 1 - Math.pow(t, 2.5)),
      transform: [{ translateX: x }, { translateY: y }, { scale: 0.4 + 2.6 * t }, { rotate: `${t * 180}deg` }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.droplet, { left: NOZZLE_CX - size / 2, top: NOZZLE_CY - size / 2, width: size, height: size, backgroundColor: color }, style]}
    />
  );
}

/** Water left on the lens after the hit: lands, then slowly runs down. */
function LensDrop({ delay, x, y, size }: { delay: number; x: number; y: number; size: number }) {
  const land = useSharedValue(0);
  const run = useSharedValue(0);
  useEffect(() => {
    land.value = withDelay(delay, withSpring(1, { damping: 10, stiffness: 260, mass: 0.5 }));
    run.value = withDelay(delay + 300, withTiming(1, { duration: 1700, easing: Easing.in(Easing.quad) }));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, land.value) * 0.85,
    transform: [{ translateY: run.value * (40 + size * 0.6) }, { scale: 0.4 + 0.6 * land.value }, { scaleY: 1 + run.value * 0.5 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.lensDrop, { left: x - size / 2, top: y - size / 2, width: size, height: size * 1.15 }, style]}>
      <View style={[styles.lensHighlight, { width: size * 0.28, height: size * 0.28, left: size * 0.18, top: size * 0.16 }]} />
    </Animated.View>
  );
}

export function HydrantBlast({ streak = 1 }: CelebrationAnimationProps) {
  const sceneIn = useSharedValue(0);
  const pop = useSharedValue(0);
  const shake = useSharedValue(0);
  const recoil = useSharedValue(1);
  const cap = useSharedValue(0);
  const flash = useSharedValue(0);
  const wash = useSharedValue(0);
  const banner = useSharedValue(0);
  const exitStyle = useSceneExit(T_EXIT, 300);

  const slugs = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        delay: T_BLAST + i * 55,
        size: NOZZLE * (0.8 + rnd(i, 1) * 0.5),
        offsetX: (rnd(i, 2) - 0.5) * SW * 0.16,
        offsetY: (rnd(i, 3) - 0.5) * SH * 0.1,
        color: i % 3 === 0 ? WATER_LIGHT : i % 3 === 1 ? WATER : WATER_PALE,
      })),
    [],
  );

  const droplets = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        delay: T_BLAST + 60 + (i % 6) * 40,
        angle: (i / 22) * Math.PI * 2 + rnd(i, 4) * 0.3,
        dist: SW * (0.35 + rnd(i, 5) * 0.45),
        size: 8 + Math.round(rnd(i, 6) * 10),
        color: i % 4 === 0 ? '#FFFFFF' : i % 2 === 0 ? WATER_LIGHT : WATER_PALE,
      })),
    [],
  );

  const lensDrops = useMemo(
    () =>
      Array.from({ length: 11 }, (_, i) => ({
        delay: T_SPLASH + 60 + Math.round(rnd(i, 7) * 220),
        x: SW * (0.06 + rnd(i, 8) * 0.88),
        y: SH * (0.05 + rnd(i, 9) * 0.5),
        size: 22 + Math.round(rnd(i, 10) * 34),
      })),
    [],
  );

  useEffect(() => {
    sceneIn.value = withTiming(1, { duration: 140 });
    pop.value = withSpring(1, { damping: 9, stiffness: 220, mass: 0.7 });

    // Pressure builds: the hydrant rattles harder and harder.
    shake.value = withDelay(
      T_SHAKE,
      withSequence(
        withTiming(2, { duration: 50 }),
        withTiming(-2, { duration: 50 }),
        withTiming(3, { duration: 45 }),
        withTiming(-3, { duration: 45 }),
        withTiming(4, { duration: 40 }),
        withTiming(-4, { duration: 40 }),
        withTiming(5, { duration: 35 }),
        withTiming(-5, { duration: 35 }),
        withTiming(6, { duration: 30 }),
        withTiming(-6, { duration: 30 }),
        withTiming(0, { duration: 30 }),
      ),
    );

    // The cap blows. White flash, hydrant kicks back.
    cap.value = withDelay(T_POP, withTiming(1, { duration: 700, easing: Easing.linear }));
    flash.value = withDelay(T_POP, withSequence(withTiming(0.6, { duration: 40 }), withTiming(0, { duration: 160 })));
    recoil.value = withDelay(
      T_POP,
      withSequence(withTiming(0.86, { duration: 60 }), withSpring(1, { damping: 6, stiffness: 300 })),
    );

    // Water hits the lens: a blue wall, then it drains to a wet tint.
    wash.value = withDelay(
      T_SPLASH,
      withSequence(withTiming(0.92, { duration: 70 }), withTiming(0.22, { duration: 420, easing: Easing.out(Easing.cubic) })),
    );

    banner.value = withDelay(T_BANNER, withSpring(1, { damping: 16, stiffness: 190, mass: 0.8 }));
  }, []);

  const sceneStyle = useAnimatedStyle(() => ({ opacity: sceneIn.value }));
  const hydrantStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shake.value },
      { scale: 0.7 + 0.3 * pop.value },
      { scaleY: recoil.value },
      { scaleX: 1 + (1 - recoil.value) * 0.5 },
    ],
  }));
  const capStyle = useAnimatedStyle(() => {
    const t = cap.value;
    return {
      opacity: t >= 1 ? 0 : 1,
      transform: [
        { translateX: 190 * t },
        { translateY: -320 * t + 0.5 * 1100 * t * t },
        { rotate: `${t * 720}deg` },
      ],
    };
  });
  const washStyle = useAnimatedStyle(() => ({ opacity: wash.value }));

  const subtitle = streak >= 2 ? `${streak} DONE TODAY   ·   SOMEBODY COOL THIS PERSON OFF` : 'HOT STREAK   ·   SOMEBODY COOL THIS PERSON OFF';

  return (
    <Animated.View style={[styles.container, sceneStyle, exitStyle]}>
      {/* Street: a row of brownstones, a sidewalk, the road. */}
      <View style={styles.skyline} pointerEvents="none">
        {Array.from({ length: 7 }).map((_, i) => {
          const h = SH * (0.16 + rnd(i, 11) * 0.14);
          return (
            <View key={i} style={[styles.building, { height: h, backgroundColor: i % 2 === 0 ? '#5A3A2E' : '#6E4A3C' }]}>
              {Array.from({ length: 6 }).map((_, w) => (
                <View key={w} style={[styles.window, { opacity: rnd(i, w + 20) > 0.35 ? 1 : 0.25 }]} />
              ))}
            </View>
          );
        })}
      </View>
      <View style={styles.sidewalk} />
      <View style={styles.curb} />
      <View style={styles.road} />
      <View style={styles.roadLine} />

      {/* Hydrant */}
      <Animated.View style={[styles.hydrant, hydrantStyle]}>
        <View style={styles.domeTop} />
        <View style={styles.dome} />
        <View style={styles.collar} />
        <View style={styles.body}>
          <View style={[styles.bolt, { top: BODY_H * 0.12, left: BODY_W * 0.18 }]} />
          <View style={[styles.bolt, { top: BODY_H * 0.12, right: BODY_W * 0.18 }]} />
          <View style={[styles.bolt, { bottom: BODY_H * 0.12, left: BODY_W * 0.18 }]} />
          <View style={[styles.bolt, { bottom: BODY_H * 0.12, right: BODY_W * 0.18 }]} />
        </View>
        <View style={[styles.sideNozzle, { left: -HW * 0.2 }]} />
        <View style={[styles.sideNozzle, { right: -HW * 0.2 }]} />
        <View style={styles.chain} />
        <View style={styles.base} />
        {/* Front nozzle, open once the cap goes */}
        <View style={styles.nozzleRing}>
          <View style={styles.nozzleHole} />
        </View>
        <Animated.View style={[styles.cap, capStyle]}>
          <View style={styles.capNut} />
        </Animated.View>
      </Animated.View>

      {slugs.map((s, i) => (
        <JetSlug key={`s${i}`} {...s} />
      ))}
      {droplets.map((d, i) => (
        <Droplet key={`d${i}`} {...d} />
      ))}

      <Sparkle delay={T_POP + 40} x={NOZZLE_CX + HW * 0.5} y={NOZZLE_CY - HW * 0.3} />
      <Sparkle delay={T_POP + 140} x={NOZZLE_CX - HW * 0.55} y={NOZZLE_CY - HW * 0.1} color="#FFFFFF" size={6} />

      {/* Water on the lens */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wash, washStyle]} />
      {lensDrops.map((l, i) => (
        <LensDrop key={`l${i}`} {...l} />
      ))}

      <KitBanner title={"YOU'RE\nON FIRE!"} subtitle={subtitle} slide={banner} top={SH * 0.2} />

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
  skyline: {
    position: 'absolute',
    left: -10,
    right: -10,
    top: HYDRANT_BASE_Y - SH * 0.3 - SH * 0.08,
    height: SH * 0.3,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  building: {
    width: SW / 6.2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    paddingTop: 10,
    borderTopWidth: 4,
    borderColor: KIT_COLORS.ink,
  },
  window: {
    width: 8,
    height: 11,
    marginBottom: 10,
    backgroundColor: KIT_COLORS.bannerYellow,
  },
  sidewalk: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: HYDRANT_BASE_Y - SH * 0.08,
    height: SH * 0.08 + 10,
    backgroundColor: '#9FA4A8',
  },
  curb: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: HYDRANT_BASE_Y + 6,
    height: 10,
    backgroundColor: KIT_COLORS.curb,
    borderBottomWidth: 3,
    borderColor: KIT_COLORS.ink,
  },
  road: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: HYDRANT_BASE_Y + 16,
    bottom: 0,
    backgroundColor: KIT_COLORS.asphalt,
  },
  roadLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: HYDRANT_BASE_Y + 16 + (SH - HYDRANT_BASE_Y) * 0.45,
    height: 6,
    backgroundColor: KIT_COLORS.route,
    opacity: 0.85,
  },
  hydrant: {
    position: 'absolute',
    left: HYDRANT_CX - HW / 2,
    top: HYDRANT_TOP,
    width: HW,
    height: HYDRANT_H,
    alignItems: 'center',
    zIndex: 10,
  },
  domeTop: {
    width: HW * 0.22,
    height: DOME_H * 0.4,
    backgroundColor: KIT_COLORS.bannerRed,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: KIT_COLORS.ink,
  },
  dome: {
    width: HW * 0.62,
    height: DOME_H * 0.6,
    backgroundColor: KIT_COLORS.bannerRed,
    borderWidth: 3,
    borderColor: KIT_COLORS.ink,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  collar: {
    width: HW * 0.76,
    height: 8,
    backgroundColor: BOLT,
    borderWidth: 3,
    borderColor: KIT_COLORS.ink,
  },
  body: {
    width: BODY_W,
    height: BODY_H,
    backgroundColor: KIT_COLORS.bannerRed,
    borderWidth: 3,
    borderColor: KIT_COLORS.ink,
  },
  bolt: {
    position: 'absolute',
    width: 6,
    height: 6,
    backgroundColor: BOLT,
  },
  sideNozzle: {
    position: 'absolute',
    top: DOME_H + BODY_H * 0.3,
    width: HW * 0.26,
    height: HW * 0.17,
    backgroundColor: KIT_COLORS.bannerRed,
    borderWidth: 3,
    borderColor: KIT_COLORS.ink,
  },
  chain: {
    position: 'absolute',
    top: DOME_H + BODY_H * 0.44,
    left: HW * 0.1,
    width: HW * 0.08,
    height: BODY_H * 0.26,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: '#B8B8B8',
    borderBottomLeftRadius: 6,
  },
  base: {
    width: HW * 0.8,
    height: BASE_H,
    backgroundColor: BOLT,
    borderWidth: 3,
    borderColor: KIT_COLORS.ink,
  },
  nozzleRing: {
    position: 'absolute',
    top: DOME_H + BODY_H * 0.42 - NOZZLE / 2,
    left: HW / 2 - NOZZLE / 2,
    width: NOZZLE,
    height: NOZZLE,
    backgroundColor: BOLT,
    borderWidth: 3,
    borderColor: KIT_COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nozzleHole: {
    width: NOZZLE * 0.5,
    height: NOZZLE * 0.5,
    backgroundColor: KIT_COLORS.ink,
  },
  cap: {
    position: 'absolute',
    top: DOME_H + BODY_H * 0.42 - NOZZLE / 2 - 2,
    left: HW / 2 - NOZZLE / 2 - 2,
    width: NOZZLE + 4,
    height: NOZZLE + 4,
    backgroundColor: KIT_COLORS.bannerRed,
    borderWidth: 3,
    borderColor: KIT_COLORS.ink,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 11,
  },
  capNut: {
    width: NOZZLE * 0.34,
    height: NOZZLE * 0.34,
    backgroundColor: BOLT,
  },
  slug: {
    position: 'absolute',
    zIndex: 12,
  },
  droplet: {
    position: 'absolute',
    zIndex: 13,
  },
  wash: {
    backgroundColor: WATER,
    zIndex: 15,
  },
  lensDrop: {
    position: 'absolute',
    zIndex: 16,
    backgroundColor: 'rgba(191, 227, 255, 0.78)',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(47, 124, 196, 0.6)',
  },
  lensHighlight: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    opacity: 0.9,
  },
});
