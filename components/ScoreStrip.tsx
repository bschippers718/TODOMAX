import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useScore } from '../hooks/useScore';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { formatScore } from '../lib/scoring';
import { useTheme } from '../lib/theme';

type Props = {
  /** `inline` under the Signal route; `badge` for Classic header chrome. */
  variant?: 'inline' | 'badge';
};

/**
 * Today's score, today's high, this week's score, and the weekly high.
 * Quiet chrome — the squares still own the route; this is the tally.
 */
export function ScoreStrip({ variant = 'inline' }: Props) {
  const theme = useTheme();
  const { score, loaded } = useScore();
  if (!loaded) return null;

  const today = formatScore(score.dayScore);
  const week = formatScore(score.weekScore);
  // A high only earns a place when it is still ahead of this period.
  // Once today is the record, repeating it as "HI" is the same number twice.
  const dayBest = score.dayHigh > score.dayScore ? formatScore(score.dayHigh) : null;
  const weekBest = score.weekHigh > score.weekScore ? formatScore(score.weekHigh) : null;
  const label = `Today ${today}${dayBest ? `, best ${dayBest}` : ''}, week ${week}${weekBest ? `, best ${weekBest}` : ''}`;

  if (variant === 'badge') {
    return (
      <View
        style={[
          styles.badge,
          theme.shadowControl,
          {
            backgroundColor: theme.surfaceSoft,
            borderColor: theme.cardBorder,
            borderWidth: theme.borderWidth,
            borderRadius: theme.radiusControl,
          },
        ]}
        accessible
        accessibilityLabel={label}
      >
        <Text style={[styles.badgeEyebrow, { color: theme.gold }]} maxFontSizeMultiplier={1.2}>
          TODAY
        </Text>
        <SlotNumber value={today} color={theme.text} fontSize={18} lineHeight={22} />
        {dayBest && (
          <Text style={[styles.badgeSub, { color: theme.textTertiary }]} maxFontSizeMultiplier={1.2}>
            BEST {dayBest}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.inline} accessible accessibilityLabel={label}>
      <ScoreGroup title="TODAY" value={today} best={dayBest} valueColor={theme.text} labelColor={theme.textTertiary} />
      <ScoreGroup title="WEEK" value={week} best={weekBest} valueColor={theme.text} labelColor={theme.textTertiary} />
    </View>
  );
}

function ScoreGroup({
  title,
  value,
  best,
  valueColor,
  labelColor,
}: {
  title: string;
  value: string;
  best: string | null;
  valueColor: string;
  labelColor: string;
}) {
  return (
    <View style={styles.group}>
      <Text style={[styles.bitLabel, { color: labelColor }]} maxFontSizeMultiplier={1.2}>
        {title}
      </Text>
      <View style={styles.figure}>
        <SlotNumber value={value} color={valueColor} fontSize={17} lineHeight={22} />
      </View>
      {best != null && (
        <Text style={[styles.best, { color: labelColor }]} maxFontSizeMultiplier={1.2}>
          best {best}
        </Text>
      )}
    </View>
  );
}

/** How far a reel travels past the short hop, in extra revolutions. */
function reelSteps(from: number, to: number): number {
  return ((to - from + 10) % 10) + 10;
}

/**
 * One digit column. It spins past a full turn of numerals and eases onto
 * the one it owes, the way a reel slows into the window.
 */
function Reel({
  from,
  to,
  delay,
  duration,
  cell,
  fontSize,
  color,
}: {
  from: number;
  to: number;
  delay: number;
  duration: number;
  cell: number;
  fontSize: number;
  color: string;
}) {
  const steps = reelSteps(from, to);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
  }, [delay, duration, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -cell * steps * progress.value }],
  }));

  const glyphs = [];
  for (let i = 0; i <= steps; i++) glyphs.push((from + i) % 10);

  return (
    <View style={{ height: cell, overflow: 'hidden', width: Math.ceil(fontSize * 0.68) }}>
      <Animated.View style={style}>
        {glyphs.map((g, i) => (
          <Text
            key={i}
            style={{
              height: cell,
              lineHeight: cell,
              fontSize,
              fontWeight: '800',
              color,
              textAlign: 'center',
              fontVariant: ['tabular-nums'],
            }}
            allowFontScaling={false}
          >
            {g}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

/**
 * A number that stays put until it changes, then rolls into the new value.
 * The first paint just shows the figure — the spin is for a score landing.
 */
function SlotNumber({ value, color, fontSize, lineHeight }: { value: string; color: string; fontSize: number; lineHeight: number }) {
  const reduce = useReduceMotion();
  const shown = useRef(value);
  const [spin, setSpin] = useState<{ from: string; to: string; id: number } | null>(null);
  const spinId = useRef(0);

  useEffect(() => {
    if (shown.current === value) return;
    const from = shown.current;
    shown.current = value;
    if (reduce || from === value) return;
    spinId.current += 1;
    setSpin({ from, to: value, id: spinId.current });
  }, [value, reduce]);

  if (!spin || spin.to !== value) {
    return (
      <Text
        style={[styles.slotRest, { color, fontSize, lineHeight }]}
        maxFontSizeMultiplier={1.2}
      >
        {value}
      </Text>
    );
  }

  const len = Math.max(spin.from.length, spin.to.length, 1);
  const fromP = spin.from.padStart(len, '0');
  const toP = spin.to.padStart(len, '0');
  const longest = 520 + (len - 1) * 140 + (len - 1) * 70;

  return (
    <ReelRow
      key={spin.id}
      from={fromP}
      to={toP}
      cell={lineHeight}
      fontSize={fontSize}
      color={color}
      settleMs={longest}
      onDone={() => setSpin(null)}
    />
  );
}

function ReelRow({
  from,
  to,
  cell,
  fontSize,
  color,
  settleMs,
  onDone,
}: {
  from: string;
  to: string;
  cell: number;
  fontSize: number;
  color: string;
  settleMs: number;
  onDone: () => void;
}) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const timer = setTimeout(() => done.current(), settleMs + 40);
    return () => clearTimeout(timer);
  }, [settleMs]);

  return (
    <View style={{ flexDirection: 'row', height: cell, overflow: 'hidden' }} accessibilityElementsHidden>
      {to.split('').map((digit, i) => (
        <Reel
          key={i}
          from={Number(from[i])}
          to={Number(digit)}
          delay={i * 70}
          duration={520 + i * 140}
          cell={cell}
          fontSize={fontSize}
          color={color}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  inline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 22,
    marginTop: 12,
  },
  group: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  figure: {
    minWidth: 18,
    alignItems: 'flex-end',
  },
  best: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
    marginBottom: 1,
  },
  bitLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  slotRest: {
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 58,
  },
  badgeEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  badgeNum: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  badgeSub: {
    fontSize: 10,
    fontWeight: '700',
  },
});
