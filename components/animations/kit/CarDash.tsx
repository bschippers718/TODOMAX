import { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
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
import { Image } from 'expo-image';
import { CelebrationAnimationProps, KIT_COLORS } from '../../../lib/types';
import { Flash, KitBanner, KIT_ASSETS, Sparkle, useSceneExit } from './pieces';

const { width: SW, height: SH } = Dimensions.get('window');

const ROAD_TOP = SH * 0.36;
const ROAD_H = SH * 0.2;
const CAR_W = SW * 0.42;
const CAR_H = CAR_W * (100 / 260);
const CAR_Y = ROAD_TOP + ROAD_H * 0.5 - CAR_H * 0.45;
const FINISH_X = SW * 0.5;
// Park fully on screen, rear bumper just past the line.
const STOP_X = SW - CAR_W - 14 + CAR_W * 0.1;
const DASH_PERIOD = 56;

// Beats (ms)
const T_GO = 220;
const D_DASH = 880;
const T_CROSS = T_GO + D_DASH - 120; // 980
const T_BRAKE = T_GO + D_DASH; // 1100
const T_BANNER = 1750;
const T_EXIT = 3000;
export const CAR_DASH_DURATION = 3300;

function SmokePuff({ delay, x }: { delay: number; x: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 620, easing: Easing.out(Easing.quad) }));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: p.value === 0 ? 0 : 0.75 * (1 - p.value),
    transform: [{ translateX: -p.value * 54 }, { translateY: -p.value * 22 }, { scale: 0.4 + p.value * 1.6 }],
  }));
  return <Animated.View style={[styles.smoke, { left: x, top: CAR_Y + CAR_H * 0.78 }, style]} />;
}

function SpeedLine({ y, length, delay }: { y: number; length: number; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 170, easing: Easing.linear }), 5, false));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: p.value === 0 || p.value === 1 ? 0 : 0.8,
    transform: [{ translateX: SW - p.value * (SW + length) }],
  }));
  return <Animated.View style={[styles.speedLine, { top: y, width: length }, style]} />;
}

export function CarDash({ streak = 1 }: CelebrationAnimationProps) {
  const sceneIn = useSharedValue(0);
  const carX = useSharedValue(-CAR_W);
  const carTilt = useSharedValue(0);
  const carBob = useSharedValue(0);
  const dashes = useSharedValue(0);
  const checkerFlash = useSharedValue(0);
  const flash = useSharedValue(0);
  const banner = useSharedValue(0);
  const exitStyle = useSceneExit(T_EXIT, 300);

  useEffect(() => {
    sceneIn.value = withTiming(1, { duration: 150 });

    // Launch hard, cross the line, then brake with a nose dip and settle.
    carX.value = withDelay(
      T_GO,
      withSequence(
        withTiming(FINISH_X - CAR_W * 0.1, { duration: D_DASH, easing: Easing.in(Easing.cubic) }),
        withTiming(STOP_X - CAR_W * 0.1, { duration: 420, easing: Easing.out(Easing.cubic) }),
      ),
    );
    carTilt.value = withDelay(
      T_GO,
      withSequence(
        withTiming(3, { duration: 200 }), // rear squats on launch
        withTiming(0, { duration: D_DASH - 200 }),
        withTiming(-5, { duration: 110 }), // nose dives on the brakes
        withSpring(0, { damping: 6, stiffness: 240 }),
      ),
    );
    carBob.value = withDelay(
      T_GO,
      withRepeat(withSequence(withTiming(-1.5, { duration: 60 }), withTiming(0, { duration: 60 })), 11, false),
    );

    // Road dashes stream under the car and stop when it does.
    dashes.value = withDelay(
      T_GO,
      withRepeat(withTiming(1, { duration: 120, easing: Easing.linear }), 11, false),
    );

    checkerFlash.value = withDelay(
      T_CROSS,
      withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 500 })),
    );
    flash.value = withDelay(T_CROSS, withSequence(withTiming(0.5, { duration: 40 }), withTiming(0, { duration: 160 })));

    banner.value = withDelay(T_BANNER, withSpring(1, { damping: 16, stiffness: 190, mass: 0.8 }));
  }, []);

  const sceneStyle = useAnimatedStyle(() => ({ opacity: sceneIn.value }));
  const carStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: carX.value },
      { translateY: carBob.value },
      { rotate: `${carTilt.value}deg` },
    ],
  }));
  const dashStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -dashes.value * DASH_PERIOD }],
  }));
  const checkerGlow = useAnimatedStyle(() => ({ opacity: checkerFlash.value }));

  const dashCount = Math.ceil(SW / DASH_PERIOD) + 2;
  const checkerRows = 6;

  return (
    <Animated.View style={[styles.container, sceneStyle, exitStyle]}>
      {/* Sky + skyline */}
      <View style={styles.sky} />
      <View style={styles.skylineRow}>
        {[0.18, 0.3, 0.22, 0.4, 0.26, 0.34, 0.2, 0.44, 0.28].map((h, i) => (
          <View key={i} style={[styles.tower, { height: SH * 0.12 * h * 2.4, backgroundColor: i % 2 ? '#1B2A44' : '#24365A' }]} />
        ))}
      </View>

      {/* Road */}
      <View style={styles.curbTop} />
      <View style={styles.road}>
        <Animated.View style={[styles.dashRow, dashStyle]}>
          {Array.from({ length: dashCount }).map((_, i) => (
            <View key={i} style={styles.dash} />
          ))}
        </Animated.View>
      </View>
      <View style={styles.curbBottom} />

      {/* Finish line */}
      <View style={[styles.checkerStrip, { left: FINISH_X }]}>
        {Array.from({ length: checkerRows }).map((_, r) => (
          <View key={r} style={styles.checkerRow}>
            <View style={[styles.checker, { backgroundColor: r % 2 ? '#fff' : KIT_COLORS.ink }]} />
            <View style={[styles.checker, { backgroundColor: r % 2 ? KIT_COLORS.ink : '#fff' }]} />
          </View>
        ))}
      </View>
      <Animated.View style={[styles.checkerGlow, { left: FINISH_X - 10 }, checkerGlow]} />

      <SpeedLine y={ROAD_TOP + 14} length={SW * 0.3} delay={T_GO + 260} />
      <SpeedLine y={ROAD_TOP + ROAD_H * 0.42} length={SW * 0.42} delay={T_GO + 320} />
      <SpeedLine y={ROAD_TOP + ROAD_H - 22} length={SW * 0.26} delay={T_GO + 380} />

      <Animated.View style={[styles.car, carStyle]}>
        <Image source={KIT_ASSETS.car} style={{ width: CAR_W, height: CAR_H }} contentFit="contain" />
      </Animated.View>

      <SmokePuff delay={T_BRAKE} x={STOP_X - CAR_W * 0.02} />
      <SmokePuff delay={T_BRAKE + 90} x={STOP_X + CAR_W * 0.08} />
      <SmokePuff delay={T_BRAKE + 180} x={STOP_X - CAR_W * 0.08} />

      <Sparkle delay={T_CROSS + 40} x={FINISH_X + 8} y={ROAD_TOP - 30} />
      <Sparkle delay={T_CROSS + 160} x={FINISH_X + 50} y={ROAD_TOP - 64} color="#C85CE8" size={6} />

      <KitBanner
        title="FINISH!"
        subtitle={`LAP ${streak}   ·   PERSONAL BEST`}
        slide={banner}
        top={SH * 0.64}
        titleSize={30}
      />

      <Flash opacity={flash} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0E1526',
    overflow: 'hidden',
  },
  sky: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: ROAD_TOP,
    backgroundColor: KIT_COLORS.sky,
  },
  skylineRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: SH - ROAD_TOP,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
  },
  tower: {
    width: SW / 11,
  },
  curbTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ROAD_TOP - 10,
    height: 10,
    backgroundColor: KIT_COLORS.curb,
  },
  road: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ROAD_TOP,
    height: ROAD_H,
    backgroundColor: KIT_COLORS.asphalt,
    overflow: 'hidden',
  },
  curbBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ROAD_TOP + ROAD_H,
    height: 10,
    backgroundColor: KIT_COLORS.curb,
  },
  dashRow: {
    position: 'absolute',
    left: 0,
    top: ROAD_H / 2 - 3,
    flexDirection: 'row',
  },
  dash: {
    width: DASH_PERIOD * 0.55,
    height: 6,
    marginRight: DASH_PERIOD * 0.45,
    backgroundColor: KIT_COLORS.route,
  },
  checkerStrip: {
    position: 'absolute',
    top: ROAD_TOP - 10,
    width: 20,
    height: ROAD_H + 20,
    zIndex: 4,
  },
  checkerRow: {
    flex: 1,
    flexDirection: 'row',
  },
  checker: {
    flex: 1,
  },
  checkerGlow: {
    position: 'absolute',
    top: ROAD_TOP - 20,
    width: 40,
    height: ROAD_H + 40,
    backgroundColor: KIT_COLORS.bannerYellow,
    zIndex: 3,
  },
  speedLine: {
    position: 'absolute',
    left: 0,
    height: 3,
    backgroundColor: KIT_COLORS.cream,
    zIndex: 6,
  },
  car: {
    position: 'absolute',
    left: 0,
    top: CAR_Y,
    zIndex: 10,
  },
  smoke: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#C8C8CC',
    zIndex: 9,
  },
});
