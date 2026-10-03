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
import { Image } from 'expo-image';
import { CelebrationAnimationProps, KIT_COLORS } from '../../../lib/types';
import { KitBanner, KIT_ASSETS, PIXEL_FONT, PixelFlag, Sparkle, pixelShadow, useSceneExit } from './pieces';

const { width: SW, height: SH } = Dimensions.get('window');

// Route waypoints
const A = { x: SW * 0.3, y: SH * 0.7 };
const B = { x: SW * 0.3, y: SH * 0.46 };
const C = { x: SW * 0.64, y: SH * 0.46 };
const D = { x: SW * 0.64, y: SH * 0.28 };

const LINE = 9;
const CAR_W = SW * 0.26;
const CAR_H = CAR_W * (100 / 260);

// Beats (ms)
const T_SEG1 = 250;
const D_SEG1 = 560;
const D_SEG2 = 480;
const D_SEG3 = 380;
const T_ARRIVE = T_SEG1 + D_SEG1 + D_SEG2 + D_SEG3; // 1670
const T_BANNER = T_ARRIVE + 420;
const T_EXIT = 3250;
export const ROUTE_DRAWN_DURATION = 3550;

export function RouteDrawn({ streak = 1 }: CelebrationAnimationProps) {
  const sceneIn = useSharedValue(0);
  const seg1 = useSharedValue(0);
  const seg2 = useSharedValue(0);
  const seg3 = useSharedValue(0);
  const carX = useSharedValue(A.x);
  const carY = useSharedValue(A.y);
  const carBob = useSharedValue(0);
  const carSettle = useSharedValue(0);
  const pinPulse = useSharedValue(0);
  const banner = useSharedValue(0);
  const exitStyle = useSceneExit(T_EXIT, 300);

  useEffect(() => {
    sceneIn.value = withTiming(1, { duration: 160 });

    const lin = (d: number) => ({ duration: d, easing: Easing.linear });
    seg1.value = withDelay(T_SEG1, withTiming(1, lin(D_SEG1)));
    seg2.value = withDelay(T_SEG1 + D_SEG1, withTiming(1, lin(D_SEG2)));
    seg3.value = withDelay(T_SEG1 + D_SEG1 + D_SEG2, withTiming(1, lin(D_SEG3)));

    // The car rides the tip of the line.
    carY.value = withDelay(
      T_SEG1,
      withSequence(
        withTiming(B.y, lin(D_SEG1)),
        withTiming(C.y, lin(D_SEG2)),
        withTiming(D.y, lin(D_SEG3)),
      ),
    );
    carX.value = withDelay(T_SEG1 + D_SEG1, withTiming(C.x, lin(D_SEG2)));
    carBob.value = withDelay(
      T_SEG1,
      withRepeat(withSequence(withTiming(-2, { duration: 90 }), withTiming(0, { duration: 90 })), 8, false),
    );
    // Arrival: nose dips, then settles.
    carSettle.value = withDelay(
      T_ARRIVE,
      withSequence(withTiming(1, { duration: 90 }), withSpring(0, { damping: 6, stiffness: 260 })),
    );

    pinPulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 500, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 500, easing: Easing.inOut(Easing.quad) })),
      -1,
      false,
    );

    banner.value = withDelay(T_BANNER, withSpring(1, { damping: 16, stiffness: 190, mass: 0.8 }));
  }, []);

  const sceneStyle = useAnimatedStyle(() => ({ opacity: sceneIn.value }));
  const seg1Style = useAnimatedStyle(() => ({ transform: [{ scaleY: seg1.value }] }));
  const seg2Style = useAnimatedStyle(() => ({ transform: [{ scaleX: seg2.value }] }));
  const seg3Style = useAnimatedStyle(() => ({ transform: [{ scaleY: seg3.value }] }));
  const carStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: carX.value - CAR_W / 2 },
      { translateY: carY.value - CAR_H * 0.78 + carBob.value },
      { rotate: `${carSettle.value * -6}deg` },
    ],
  }));
  const pinStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + 0.5 * pinPulse.value,
    transform: [{ scale: 1 + 0.35 * pinPulse.value }],
  }));

  return (
    <Animated.View style={[styles.container, sceneStyle, exitStyle]}>
      <Image source={KIT_ASSETS.map} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={styles.tint} />

      {/* Route: three segments that grow from their start point. */}
      <Animated.View style={[styles.route, { left: A.x - LINE / 2, top: B.y, height: A.y - B.y, width: LINE, transformOrigin: 'center bottom' }, seg1Style]} />
      <Animated.View style={[styles.route, { left: B.x - LINE / 2, top: B.y - LINE / 2, width: C.x - B.x + LINE, height: LINE, transformOrigin: 'left center' }, seg2Style]} />
      <Animated.View style={[styles.route, { left: C.x - LINE / 2, top: D.y, height: C.y - D.y, width: LINE, transformOrigin: 'center bottom' }, seg3Style]} />

      {/* Start marker + destination pin */}
      <View style={[styles.startDot, { left: A.x - 9, top: A.y - 9 }]} />
      <Text style={[styles.mapLabel, { left: A.x - 60, top: A.y + 16 }]}>START HERE</Text>
      <Animated.View style={[styles.pinRing, { left: D.x - 16, top: D.y - 16 }, pinStyle]} />
      <View style={[styles.pinDot, { left: D.x - 6, top: D.y - 6 }]} />

      <Animated.View style={[styles.car, carStyle]}>
        <Image source={KIT_ASSETS.car} style={{ width: CAR_W, height: CAR_H }} contentFit="contain" />
      </Animated.View>

      <PixelFlag delay={T_ARRIVE + 60} x={D.x} y={D.y + 4} height={64} />
      <Sparkle delay={T_ARRIVE + 120} x={D.x - 44} y={D.y - 26} />
      <Sparkle delay={T_ARRIVE + 240} x={D.x + 52} y={D.y - 44} color="#C85CE8" size={6} />

      <KitBanner
        title="ROUTE CLEARED"
        subtitle={`STOP #${streak} CHECKED OFF`}
        slide={banner}
        top={SH * 0.76}
        titleSize={22}
      />
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
    backgroundColor: 'rgba(10, 20, 40, 0.14)',
  },
  route: {
    position: 'absolute',
    backgroundColor: KIT_COLORS.route,
    zIndex: 5,
  },
  startDot: {
    position: 'absolute',
    width: 18,
    height: 18,
    backgroundColor: KIT_COLORS.ink,
    borderWidth: 4,
    borderColor: KIT_COLORS.cream,
    zIndex: 6,
  },
  mapLabel: {
    position: 'absolute',
    width: 120,
    textAlign: 'center',
    fontFamily: PIXEL_FONT,
    fontSize: 9,
    color: KIT_COLORS.ink,
    ...pixelShadow(KIT_COLORS.cream, 1),
    zIndex: 6,
  },
  pinRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: KIT_COLORS.bannerRed,
    zIndex: 6,
  },
  pinDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: KIT_COLORS.bannerRed,
    zIndex: 7,
  },
  car: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 12,
  },
});
