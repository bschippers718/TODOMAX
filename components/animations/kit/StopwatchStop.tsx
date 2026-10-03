import { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CelebrationAnimationProps, KIT_COLORS } from '../../../lib/types';
import { Flash, KitBanner, PIXEL_FONT, Sparkle, pixelShadow, useSceneExit } from './pieces';

const { width: SW, height: SH } = Dimensions.get('window');

const WATCH = Math.min(SW * 0.6, 250);
const WATCH_TOP = SH * 0.2;
const START_SECONDS = 25 * 60;

// Beats (ms)
const T_COUNT = 300;
const D_COUNT = 1150;
const T_STOP = T_COUNT + D_COUNT; // 1450
const T_BANNER = T_STOP + 380;
const T_EXIT = 3050;
export const STOPWATCH_STOP_DURATION = 3350;

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function formatClock(totalSeconds: number) {
  'worklet';
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function StopwatchStop({ streak = 1 }: CelebrationAnimationProps) {
  const sceneIn = useSharedValue(0);
  const pop = useSharedValue(0);
  const seconds = useSharedValue(START_SECONDS);
  const tick = useSharedValue(0);
  const stopped = useSharedValue(0);
  const shake = useSharedValue(0);
  const flash = useSharedValue(0);
  const button = useSharedValue(0);
  const banner = useSharedValue(0);
  const exitStyle = useSceneExit(T_EXIT, 300);

  useEffect(() => {
    sceneIn.value = withTiming(1, { duration: 140 });
    pop.value = withSpring(1, { damping: 9, stiffness: 220, mass: 0.7 });

    // Rewind: fast at first, then the last seconds tick down one by one.
    seconds.value = withDelay(T_COUNT, withTiming(0, { duration: D_COUNT, easing: Easing.out(Easing.cubic) }));
    tick.value = withDelay(T_COUNT, withTiming(1, { duration: D_COUNT, easing: Easing.linear }));

    // STOP: thumb presses the crown, screen inverts, watch jolts.
    button.value = withDelay(
      T_STOP - 60,
      withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 160 })),
    );
    flash.value = withDelay(T_STOP, withSequence(withTiming(0.55, { duration: 40 }), withTiming(0, { duration: 160 })));
    stopped.value = withDelay(T_STOP, withTiming(1, { duration: 60 }));
    shake.value = withDelay(
      T_STOP,
      withSequence(
        withTiming(6, { duration: 30 }),
        withTiming(-6, { duration: 30 }),
        withTiming(4, { duration: 26 }),
        withTiming(-2, { duration: 24 }),
        withTiming(0, { duration: 20 }),
      ),
    );

    banner.value = withDelay(T_BANNER, withSpring(1, { damping: 16, stiffness: 190, mass: 0.8 }));
  }, []);

  const sceneStyle = useAnimatedStyle(() => ({ opacity: sceneIn.value }));
  const watchStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shake.value },
      { scale: 0.6 + 0.4 * pop.value },
      { rotate: `${(1 - pop.value) * -12}deg` },
    ],
  }));
  // Digits jitter by a pixel while the clock is spinning.
  const digitsStyle = useAnimatedStyle(() => {
    const spinning = tick.value > 0 && tick.value < 1;
    const jitter = spinning ? (Math.round(tick.value * 60) % 2 === 0 ? 0 : 1) : 0;
    return {
      color: stopped.value > 0.5 ? KIT_COLORS.lcd : KIT_COLORS.lcdInk,
      transform: [{ translateY: jitter }],
    };
  });
  const lcdStyle = useAnimatedStyle(() => ({
    backgroundColor: stopped.value > 0.5 ? KIT_COLORS.lcdInk : KIT_COLORS.lcd,
  }));
  const crownStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: button.value * 6 }],
  }));
  const stopLabelStyle = useAnimatedStyle(() => ({
    opacity: stopped.value,
    transform: [{ scale: 0.7 + 0.3 * stopped.value }],
  }));
  const digitsProps = useAnimatedProps(() => ({ text: formatClock(seconds.value) }) as any);

  return (
    <Animated.View style={[styles.container, sceneStyle, exitStyle]}>
      <View style={styles.grid} pointerEvents="none">
        {Array.from({ length: 40 }).map((_, i) => (
          <View key={i} style={styles.gridTile} />
        ))}
      </View>

      <Animated.View style={[styles.watchWrap, watchStyle]}>
        {/* Crown + side button */}
        <Animated.View style={[styles.crown, crownStyle]} />
        <View style={styles.sideButton} />

        <View style={styles.watchBody}>
          <Text style={styles.brand}>TODOMAX · CHRONO</Text>
          <Animated.View style={[styles.lcd, lcdStyle]}>
            <Text style={styles.lcdLabel}>ERRAND TIMER</Text>
            <AnimatedTextInput
              editable={false}
              defaultValue={formatClock(START_SECONDS)}
              animatedProps={digitsProps}
              style={[styles.digits, digitsStyle]}
              underlineColorAndroid="transparent"
            />
            <Animated.Text style={[styles.stopLabel, stopLabelStyle]}>STOP</Animated.Text>
          </Animated.View>
          <View style={styles.watchFooter}>
            <Text style={styles.footerLabel}>LAP</Text>
            <View style={styles.footerPill}>
              <Text style={styles.footerPillText}>WR</Text>
            </View>
            <Text style={styles.footerLabel}>SPLIT</Text>
          </View>
        </View>
      </Animated.View>

      <Sparkle delay={T_STOP + 80} x={SW / 2 - WATCH * 0.56} y={WATCH_TOP + WATCH * 0.2} />
      <Sparkle delay={T_STOP + 200} x={SW / 2 + WATCH * 0.58} y={WATCH_TOP + WATCH * 0.5} color="#C85CE8" />
      <Sparkle delay={T_STOP + 320} x={SW / 2 + WATCH * 0.3} y={WATCH_TOP - 24} color={KIT_COLORS.typeGreen} size={6} />

      <KitBanner
        title={'BEAT THE\nCLOCK!'}
        subtitle={`TIME TO SPARE   ·   STREAK x${streak}`}
        slide={banner}
        top={SH * 0.6}
      />

      <Flash opacity={flash} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F1320',
    overflow: 'hidden',
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    flexWrap: 'wrap',
    opacity: 0.18,
  },
  gridTile: {
    width: SW / 5,
    height: SH / 8,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#3B4A7A',
  },
  watchWrap: {
    position: 'absolute',
    left: SW / 2 - WATCH / 2,
    top: WATCH_TOP,
    width: WATCH,
    height: WATCH,
    zIndex: 10,
  },
  crown: {
    position: 'absolute',
    top: -14,
    left: WATCH * 0.22,
    width: WATCH * 0.14,
    height: 20,
    backgroundColor: KIT_COLORS.watchTrim,
    borderWidth: 3,
    borderColor: KIT_COLORS.ink,
  },
  sideButton: {
    position: 'absolute',
    top: -14,
    right: WATCH * 0.22,
    width: WATCH * 0.14,
    height: 20,
    backgroundColor: '#8FA3B8',
    borderWidth: 3,
    borderColor: KIT_COLORS.ink,
  },
  watchBody: {
    flex: 1,
    backgroundColor: KIT_COLORS.watchBody,
    borderRadius: WATCH * 0.2,
    borderWidth: 6,
    borderColor: KIT_COLORS.watchTrim,
    paddingHorizontal: WATCH * 0.09,
    paddingVertical: WATCH * 0.08,
    justifyContent: 'space-between',
  },
  brand: {
    fontFamily: PIXEL_FONT,
    fontSize: 6,
    color: '#8FA3B8',
    textAlign: 'center',
  },
  lcd: {
    borderWidth: 4,
    borderColor: KIT_COLORS.ink,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lcdLabel: {
    fontFamily: PIXEL_FONT,
    fontSize: 5,
    color: '#55675C',
    marginBottom: 6,
  },
  digits: {
    fontFamily: PIXEL_FONT,
    // 8 glyphs of Press Start 2P are ~1em wide each; keep them inside the LCD.
    fontSize: WATCH * 0.074,
    color: KIT_COLORS.lcdInk,
    padding: 0,
    margin: 0,
    textAlign: 'center',
    width: '100%',
  },
  stopLabel: {
    position: 'absolute',
    right: 8,
    bottom: 4,
    fontFamily: PIXEL_FONT,
    fontSize: 6,
    color: KIT_COLORS.bannerRed,
  },
  watchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontFamily: PIXEL_FONT,
    fontSize: 6,
    color: '#8FA3B8',
  },
  footerPill: {
    backgroundColor: KIT_COLORS.bannerRed,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  footerPillText: {
    fontFamily: PIXEL_FONT,
    fontSize: 6,
    color: KIT_COLORS.cream,
    ...pixelShadow(KIT_COLORS.ink, 1),
  },
});
