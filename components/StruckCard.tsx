import { memo, useCallback, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Task, taskSize, isBig } from '../lib/types';
import { useTheme } from '../lib/theme';
import { lineColor, onLineColor } from '../lib/lines';
import { PressableScale } from './ui/PressableScale';
import { Symbol } from './ui/Symbol';
import { StaticInk, straightInk } from './InkTrail';

// Matches the live pen in TaskItem so a saved mark draws at the weight it was made.
const PEN_W = { signal: 5, classic: 6 };

interface Props {
  task: Task;
  /** Tap puts the stop back on the route. */
  onRestore?: (id: string) => void;
  hapticsEnabled?: boolean;
}

/**
 * A stop you've already struck, kept where you can see it. Same card as the
 * live one, painted the same, with the line you drew still on it.
 */
function StruckCardInner({ task, onRestore, hapticsEnabled = true }: Props) {
  const theme = useTheme();
  const signal = theme.isSignal;
  const size = taskSize(task);
  const big = isBig(size);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((b) => (b.w === width && b.h === height ? b : { w: width, h: height }));
  }, []);

  const paint = task.line ? lineColor(task.line, theme) : null;
  const onPaint = task.line ? onLineColor(task.line, theme) : null;
  const inkColor = paint ? onPaint! : theme.accent;
  const textColor = paint ? onPaint! : theme.text;
  const ink = task.ink && task.ink.length >= 6 ? task.ink : straightInk(signal ? PEN_W.signal : PEN_W.classic, signal ? 0.16 : 0.08);

  const restore = useCallback(() => {
    if (!onRestore) return;
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRestore(task.id);
  }, [onRestore, hapticsEnabled, task.id]);

  return (
    <View style={styles.container}>
      <PressableScale
        onPress={restore}
        pressStyle="scale"
        pressedScale={0.985}
        disabled={!onRestore}
        accessibilityRole="button"
        accessibilityLabel={`Struck: ${task.text}`}
        accessibilityHint={onRestore ? 'Double tap to put it back on the route' : undefined}
        style={[
          styles.card,
          { borderRadius: theme.radiusCard, borderWidth: theme.borderWidth, borderColor: theme.cardBorder, backgroundColor: paint ?? theme.surface },
          signal && theme.shadowCard,
          signal && styles.cardSignal,
        ]}
      >
        <View
          onLayout={onLayout}
          style={[
            styles.inner,
            { borderRadius: Math.max(0, theme.radiusCard - theme.borderWidth) },
            signal ? styles.innerSignal : styles.innerClassic,
            size === 's' && styles.innerSmall,
            big && styles.innerBig,
            size === 'xl' && styles.innerMassive,
          ]}
        >
          {signal && (
            <View style={[styles.bullet, big && styles.bulletBig, size === 'xl' && styles.bulletMassive, { backgroundColor: paint ? onPaint! : theme.green }]}>
              <Symbol name="checkmark" size={big ? 15 : 12} color={paint ? theme.green : '#fff'} weight="heavy" />
            </View>
          )}
          <Text
            style={[
              styles.text,
              big ? (signal ? theme.fontDisplay : styles.textBigClassic) : theme.fontTask,
              { color: textColor, opacity: 0.45 },
              signal && styles.textSignal,
              size === 's' && styles.textSmall,
              big && styles.textBig,
              size === 'xl' && styles.textMassive,
            ]}
            numberOfLines={big ? 4 : 3}
            maxFontSizeMultiplier={1.3}
          >
            {task.text}
          </Text>
          <StaticInk ink={ink} width={box.w} height={box.h} color={inkColor} square={signal} opacity={0.9} />
        </View>
      </PressableScale>
    </View>
  );
}

export const StruckCard = memo(StruckCardInner);

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    opacity: 0.82,
  },
  card: {},
  cardSignal: {
    marginRight: 4,
    marginBottom: 4,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  innerClassic: {
    paddingHorizontal: 17,
    paddingVertical: 15,
  },
  innerSignal: {
    paddingLeft: 14,
    paddingRight: 16,
    paddingVertical: 14,
  },
  innerSmall: {
    paddingVertical: 9,
  },
  innerBig: {
    minHeight: 100,
    paddingVertical: 24,
  },
  innerMassive: {
    minHeight: 128,
    paddingVertical: 30,
  },
  bullet: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletBig: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    marginLeft: -2,
  },
  bulletMassive: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 14,
    marginLeft: -4,
  },
  text: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    paddingRight: 8,
  },
  textSignal: {
    fontSize: 16,
    lineHeight: 21,
  },
  textSmall: {
    fontSize: 15,
    lineHeight: 19,
  },
  textBig: {
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.6,
  },
  textBigClassic: {
    fontWeight: '800',
  },
  textMassive: {
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.9,
  },
});
