import { useEffect } from 'react';
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
import { CelebrationAnimationProps, KIT_COLORS } from '../../../lib/types';
import { Flash, KitBanner, PIXEL_FONT, Sparkle, useSceneExit } from './pieces';

const { width: SW, height: SH } = Dimensions.get('window');

const REG_W = Math.min(SW * 0.62, 260);
const REG_H = REG_W * 0.78;
const REG_LEFT = SW / 2 - REG_W / 2;
const REG_TOP = SH * 0.47;
const RECEIPT_W = REG_W * 0.56;
const RECEIPT_H = SH * 0.26;

// Beats (ms)
const T_PRINT = 380;
const D_PRINT = 900;
const T_RING = T_PRINT + D_PRINT + 160; // 1440
const T_BANNER = T_RING + 360;
const T_EXIT = 3000;
export const CASH_REGISTER_DURATION = 3300;

const RECEIPT_LINES = (streak: number) => [
  'TODOMAX RECEIPT',
  '- - - - - - - - -',
  'TASK        DONE',
  `STREAK       x${streak}`,
  'EXCUSES        0',
  '- - - - - - - - -',
  'TOTAL  1 LESS',
  '       THING',
  'THANK YOU!',
];

function ReceiptLine({ text, index, count, progress }: { text: string; index: number; count: number; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: progress.value >= (index + 0.5) / count ? 1 : 0,
  }));
  return <Animated.Text style={[styles.receiptLine, style]}>{text}</Animated.Text>;
}

function Coin({ delay, angle, speed }: { delay: number; angle: number; speed: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 820, easing: Easing.linear }));
  }, []);
  const style = useAnimatedStyle(() => {
    const time = t.value;
    const x = Math.cos(angle) * speed * time;
    const y = Math.sin(angle) * speed * time + 0.5 * 640 * time * time;
    // Spin: squash scaleX to fake a coin flipping edge-on.
    const flip = Math.abs(Math.cos(time * Math.PI * 4));
    return {
      opacity: time === 0 ? 0 : Math.max(0, 1 - Math.pow(time, 4)),
      transform: [{ translateX: x }, { translateY: y }, { scaleX: 0.25 + 0.75 * flip }],
    };
  });
  return (
    <Animated.View style={[styles.coin, style]}>
      <View style={styles.coinInner} />
    </Animated.View>
  );
}

export function CashRegister({ streak = 1 }: CelebrationAnimationProps) {
  const sceneIn = useSharedValue(0);
  const pop = useSharedValue(0);
  const print = useSharedValue(0);
  const paid = useSharedValue(0);
  const drawer = useSharedValue(0);
  const jolt = useSharedValue(0);
  const flash = useSharedValue(0);
  const banner = useSharedValue(0);
  const exitStyle = useSceneExit(T_EXIT, 300);
  const lines = RECEIPT_LINES(streak);

  useEffect(() => {
    sceneIn.value = withTiming(1, { duration: 150 });
    pop.value = withSpring(1, { damping: 9, stiffness: 220, mass: 0.7 });

    // Receipt chatters out in steps, like a thermal printer.
    print.value = withDelay(T_PRINT, withTiming(1, { duration: D_PRINT, easing: Easing.steps(lines.length, true) }));
    paid.value = withDelay(T_PRINT + D_PRINT + 40, withTiming(1, { duration: 80 }));

    // KA-CHING: drawer slams open, register jumps, coins fly.
    drawer.value = withDelay(T_RING, withSpring(1, { damping: 8, stiffness: 320, mass: 0.6 }));
    jolt.value = withDelay(
      T_RING,
      withSequence(withTiming(-10, { duration: 60, easing: Easing.out(Easing.quad) }), withSpring(0, { damping: 6, stiffness: 300 })),
    );
    flash.value = withDelay(T_RING, withSequence(withTiming(0.5, { duration: 40 }), withTiming(0, { duration: 160 })));

    banner.value = withDelay(T_BANNER, withSpring(1, { damping: 16, stiffness: 190, mass: 0.8 }));
  }, []);

  const sceneStyle = useAnimatedStyle(() => ({ opacity: sceneIn.value }));
  const registerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - pop.value) * 80 + jolt.value }, { scale: 0.7 + 0.3 * pop.value }],
  }));
  // Paper feeds up out of the slot inside a clipping frame — no squash.
  const receiptStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - print.value) * RECEIPT_H }],
  }));
  const displayStyle = useAnimatedStyle(() => ({
    backgroundColor: paid.value > 0.5 ? KIT_COLORS.typeGreen : '#17301F',
  }));
  const displayTextStyle = useAnimatedStyle(() => ({
    color: paid.value > 0.5 ? KIT_COLORS.ink : KIT_COLORS.typeGreen,
  }));
  const paidTextStyle = useAnimatedStyle(() => ({
    color: KIT_COLORS.ink,
    opacity: paid.value,
  }));
  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drawer.value * REG_H * 0.3 }],
  }));

  const coinOriginX = SW / 2;
  const coinOriginY = REG_TOP + REG_H * 0.92;

  return (
    <Animated.View style={[styles.container, sceneStyle, exitStyle]}>
      <View style={styles.grid} pointerEvents="none">
        {Array.from({ length: 40 }).map((_, i) => (
          <View key={i} style={styles.gridTile} />
        ))}
      </View>

      {/* Receipt rises out of the slot. Rendered behind the register body. */}
      <View style={styles.receiptClip} pointerEvents="none">
        <Animated.View style={[styles.receipt, receiptStyle]}>
          <View style={styles.receiptEdge} />
          {lines.map((line, i) => (
            <ReceiptLine key={i} text={line} index={i} count={lines.length} progress={print} />
          ))}
        </Animated.View>
      </View>

      <Animated.View style={[styles.register, registerStyle]}>
        {/* Drawer (behind body, slides down) */}
        <Animated.View style={[styles.drawer, drawerStyle]}>
          <View style={styles.drawerHandle} />
        </Animated.View>

        <View style={styles.body}>
          <View style={styles.slot} />
          <Animated.View style={[styles.display, displayStyle]}>
            <Animated.Text style={[styles.displayText, displayTextStyle]}>1 ITEM</Animated.Text>
            <Animated.Text style={[styles.displayText, paidTextStyle]}>PAID</Animated.Text>
          </Animated.View>
          <View style={styles.keypad}>
            {Array.from({ length: 9 }).map((_, i) => (
              <View key={i} style={[styles.key, i === 8 && styles.keyGo]} />
            ))}
            <View style={styles.keyWide} />
          </View>
        </View>
      </Animated.View>

      {/* Coins burst from the drawer */}
      <View style={[styles.coinOrigin, { left: coinOriginX, top: coinOriginY }]} pointerEvents="none">
        <Coin delay={T_RING + 20} angle={-Math.PI * 0.78} speed={520} />
        <Coin delay={T_RING + 60} angle={-Math.PI * 0.62} speed={620} />
        <Coin delay={T_RING + 40} angle={-Math.PI * 0.5} speed={560} />
        <Coin delay={T_RING + 80} angle={-Math.PI * 0.36} speed={600} />
        <Coin delay={T_RING + 110} angle={-Math.PI * 0.22} speed={500} />
      </View>

      <Sparkle delay={T_RING + 60} x={REG_LEFT - 16} y={REG_TOP + 10} />
      <Sparkle delay={T_RING + 180} x={REG_LEFT + REG_W + 14} y={REG_TOP + REG_H * 0.4} color="#C85CE8" />

      <KitBanner
        title="KA-CHING!"
        subtitle={`STREAK x${streak}   ·   NO REFUNDS`}
        slide={banner}
        top={SH * 0.14}
        titleSize={30}
      />

      <Flash opacity={flash} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1A1230',
    overflow: 'hidden',
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    flexWrap: 'wrap',
    opacity: 0.16,
  },
  gridTile: {
    width: SW / 5,
    height: SH / 8,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#6E4FB0',
  },
  receiptClip: {
    position: 'absolute',
    left: SW / 2 - RECEIPT_W / 2,
    top: REG_TOP - RECEIPT_H + 16,
    width: RECEIPT_W,
    height: RECEIPT_H,
    overflow: 'hidden',
    zIndex: 5,
  },
  receipt: {
    width: RECEIPT_W,
    height: RECEIPT_H,
    backgroundColor: KIT_COLORS.cream,
    paddingTop: 14,
    paddingHorizontal: 10,
  },
  receiptEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    borderTopWidth: 6,
    borderStyle: 'dashed',
    borderColor: '#1A1230',
  },
  receiptLine: {
    fontFamily: PIXEL_FONT,
    fontSize: 7,
    lineHeight: 15,
    color: '#2B2B2B',
  },
  register: {
    position: 'absolute',
    left: REG_LEFT,
    top: REG_TOP,
    width: REG_W,
    height: REG_H,
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    left: REG_W * 0.04,
    right: REG_W * 0.04,
    top: REG_H * 0.62,
    height: REG_H * 0.36,
    backgroundColor: '#3A3F4A',
    borderWidth: 4,
    borderColor: KIT_COLORS.ink,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  drawerHandle: {
    width: REG_W * 0.3,
    height: 8,
    backgroundColor: KIT_COLORS.bannerYellow,
  },
  body: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: REG_H * 0.72,
    backgroundColor: '#5B6270',
    borderWidth: 4,
    borderColor: KIT_COLORS.ink,
    padding: REG_W * 0.06,
  },
  slot: {
    alignSelf: 'center',
    width: RECEIPT_W + 10,
    height: 8,
    backgroundColor: KIT_COLORS.ink,
    marginTop: -REG_W * 0.06 - 4,
  },
  display: {
    marginTop: 10,
    borderWidth: 4,
    borderColor: KIT_COLORS.ink,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  displayText: {
    fontFamily: PIXEL_FONT,
    fontSize: 9,
  },
  keypad: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  key: {
    width: (REG_W - REG_W * 0.12 - 8 - 6 * 3) / 4,
    height: 14,
    backgroundColor: '#C9D3DC',
    borderWidth: 2,
    borderColor: KIT_COLORS.ink,
  },
  keyGo: {
    backgroundColor: KIT_COLORS.typeGreen,
  },
  keyWide: {
    width: (REG_W - REG_W * 0.12 - 8 - 6 * 3) / 4,
    height: 14,
    backgroundColor: KIT_COLORS.bannerRed,
    borderWidth: 2,
    borderColor: KIT_COLORS.ink,
  },
  coinOrigin: {
    position: 'absolute',
    width: 0,
    height: 0,
    zIndex: 12,
  },
  coin: {
    position: 'absolute',
    left: -9,
    top: -9,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: KIT_COLORS.bannerYellow,
    borderWidth: 2,
    borderColor: '#9A7A00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#9A7A00',
  },
});
