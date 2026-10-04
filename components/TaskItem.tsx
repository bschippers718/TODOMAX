import { useRef, useCallback, useState, memo } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  Pressable,
  useWindowDimensions,
  LayoutChangeEvent,
  AccessibilityActionEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Task, Settings, TaskSize, LineId, TASK_SIZES, TASK_SIZE_LABEL, taskSize } from '../lib/types';
import { useTheme, IOS_SPRING, Theme } from '../lib/theme';
import { LINES, lineColor, onLineColor } from '../lib/lines';
import { Symbol } from './ui/Symbol';

const SCRIBBLE_VARIANTS = ['doubleSlash', 'zigzag', 'markerLoop', 'pixelX'] as const;

// How much of the scribble the finger can draw before release. The remainder is
// finished by the "pen" on release so there's always a satisfying final flick.
const DRAG_MAX = 0.86;
// Past the threshold the card resists, like pulling against a rubber band.
const OVERDRAG_RESISTANCE = 0.22;
// Pause between the strike landing and the card crumpling away.
const HOLD_AFTER_STRIKE = 340;
const CARD_MARGIN = 4;

// Each stroke owns a slice of the 0..1 strike progress. Slices overlap slightly so the
// next stroke starts as the previous one finishes — one continuous scribble, no pen lift.
const STROKE_1: [number, number] = [0.0, 0.42];
const STROKE_2: [number, number] = [0.3, 0.72];
const STROKE_3: [number, number] = [0.58, 1.0];

const SPRING_BACK = { damping: 20, stiffness: 260, mass: 0.7 };
// Overdamped so a height collapse never overshoots into negative space.
const SPRING_COLLAPSE = { damping: 26, stiffness: 240, mass: 0.9, overshootClamping: true };

type ScribbleVariant = (typeof SCRIBBLE_VARIANTS)[number];

interface TaskItemProps {
  task: Task;
  settings: Settings;
  /** Position in the list; Signal shows it as a stop number. */
  index?: number;
  reduceMotion?: boolean;
  /** Fired the instant the scribble lands (sound/haptics belong here). */
  onStrike?: (id: string) => void;
  /** Fired after the card has fully collapsed and can be removed from the list. */
  onComplete: (id: string, size: TaskSize) => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string, text: string) => void;
  onSize?: (id: string, size: TaskSize) => void;
  onLine?: (id: string, line: LineId | undefined) => void;
  /** Open stops this one comes after (texts), shown as a quiet hint. */
  upstream?: string[];
}

/**
 * A pen stroke that draws along its own axis as `strike` moves through [start, end].
 * Uses scaleX from the left edge (GPU transform) rather than animating `width` (layout).
 */
function useStrokeStyle(
  strike: SharedValue<number>,
  [start, end]: [number, number],
  rotateDeg: number,
) {
  return useAnimatedStyle(() => {
    const p = interpolate(strike.value, [start, end], [0, 1], Extrapolation.CLAMP);
    // Pen lands light and loads up over the first ~30% of the stroke.
    const pressure = 0.55 + 0.45 * Math.min(1, p * 3.2);
    return {
      opacity: p > 0.002 ? 1 : 0,
      // Rotate first so the scale runs along the stroke's own axis.
      transform: [{ rotate: `${rotateDeg}deg` }, { scaleX: p }, { scaleY: pressure }],
    };
  });
}

// Per-variant stroke angles (degrees). Kept here because the animated transform
// replaces any static transform on the view.
const ANGLES: Record<ScribbleVariant, [number, number, number]> = {
  doubleSlash: [5, -7, 1],
  zigzag: [14, -15, 11],
  markerLoop: [-4, -7, 5],
  pixelX: [10, -10, 0],
};

function TaskItemInner({
  task,
  settings,
  index = 0,
  reduceMotion = false,
  onStrike,
  onComplete,
  onDelete,
  onEdit,
  onSize,
  onLine,
  upstream,
}: TaskItemProps) {
  const theme = useTheme();
  const { width: SW } = useWindowDimensions();
  const SWIPE_THRESHOLD = SW * 0.35;
  const DELETE_THRESHOLD = SW * 0.3;
  const SCRIBBLE_WIDTH = SW * 0.65;
  const signal = theme.isSignal;
  const [struck, setStruck] = useState(false);

  const translateX = useSharedValue(0);
  const strike = useSharedValue(0);
  const committed = useSharedValue(false);

  // Height comes from content (Dynamic Type friendly); we only pin it while collapsing.
  const measuredHeight = useSharedValue(0);
  const collapse = useSharedValue(0);
  const collapsing = useSharedValue(false);
  const cardOpacity = useSharedValue(1);
  const cardScale = useSharedValue(1);
  const cardRotate = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const strikeGlow = useSharedValue(0);
  const splatOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(1);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  const size = taskSize(task);
  const line = task.line;
  const inputRef = useRef<TextInput>(null);

  const scribbleVariant = useRef(getScribbleVariant(task.id)).current;
  const hapticsEnabled = settings.hapticsEnabled;

  const fireComplete = useCallback(() => onComplete(task.id, size), [task.id, onComplete, size]);
  const fireDelete = useCallback(() => onDelete(task.id), [task.id, onDelete]);
  const fireStrike = useCallback(() => {
    // The "it's done" moment is a success notification, not a thud.
    if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStruck(true);
    onStrike?.(task.id);
  }, [task.id, onStrike, hapticsEnabled]);
  const fireTick = useCallback(() => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [hapticsEnabled]);
  const fireDeleteHaptic = useCallback(() => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [hapticsEnabled]);
  const fireArm = useCallback(() => {
    if (hapticsEnabled) Haptics.selectionAsync();
  }, [hapticsEnabled]);

  const beginEdit = useCallback(() => {
    if (!onEdit) return;
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDraft(task.text);
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [onEdit, hapticsEnabled, task.text]);

  const commitEdit = useCallback(() => {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== task.text) onEdit?.(task.id, trimmed);
  }, [draft, task.id, task.text, onEdit]);

  // Little haptic ticks as each pen stroke lands under the finger, and a
  // selection click when the delete side arms.
  useAnimatedReaction(
    () => ({ s: strike.value, x: translateX.value }),
    (cur, prev) => {
      if (prev === null || committed.value) return;
      const crossed = (t: number) => prev.s < t && cur.s >= t;
      if (crossed(STROKE_1[1]) || crossed(STROKE_2[1])) {
        runOnJS(fireTick)();
      }
      if (prev.x > -DELETE_THRESHOLD && cur.x <= -DELETE_THRESHOLD) {
        runOnJS(fireArm)();
      }
    },
    [fireTick, fireArm, DELETE_THRESHOLD],
  );

  const collapseOut = (delay: number, done: () => void) => {
    'worklet';
    collapsing.value = true;
    cardOpacity.value = withDelay(delay, withTiming(0, { duration: 180 }));
    collapse.value = withDelay(
      delay,
      withSpring(1, SPRING_COLLAPSE, (finished) => {
        if (finished) runOnJS(done)();
      }),
    );
  };

  const land = () => {
    'worklet';
    runOnJS(fireStrike)();
    textOpacity.value = withTiming(0.3, { duration: 220 });

    if (reduceMotion) {
      // Honour Reduce Motion: ink lands, card fades and folds. No shake, no flash.
      collapseOut(HOLD_AFTER_STRIKE, fireComplete);
      return;
    }

    // Impact: the card jolts as the pen slams down on the last stroke.
    shakeX.value = withSequence(
      withTiming(5, { duration: 28 }),
      withTiming(-5, { duration: 28 }),
      withTiming(3, { duration: 24 }),
      withTiming(-1.5, { duration: 22 }),
      withTiming(0, { duration: 18 }),
    );
    strikeGlow.value = withSequence(
      withTiming(1, { duration: 70 }),
      withTiming(0.35, { duration: 320 }),
    );
    splatOpacity.value = withSequence(
      withTiming(0.75, { duration: 50 }),
      withTiming(0.45, { duration: 380 }),
    );

    // Crumple on a spring, then collapse and hand off to the list.
    cardScale.value = withDelay(
      HOLD_AFTER_STRIKE,
      withSequence(
        withSpring(1.025, { damping: 14, stiffness: 420, mass: 0.6 }),
        withSpring(0.88, { damping: 20, stiffness: 300, mass: 0.8 }),
      ),
    );
    cardRotate.value = withDelay(
      HOLD_AFTER_STRIKE + 70,
      withSpring(-1.6, { damping: 18, stiffness: 260, mass: 0.8 }),
    );
    collapseOut(HOLD_AFTER_STRIKE + 170, fireComplete);
  };

  const flingOutAndDelete = () => {
    'worklet';
    runOnJS(fireDeleteHaptic)();
    translateX.value = withTiming(-SW, {
      duration: reduceMotion ? 160 : 240,
      easing: Easing.in(Easing.cubic),
    });
    collapseOut(reduceMotion ? 100 : 160, fireDelete);
  };

  const panGesture = Gesture.Pan()
    .enabled(!editing)
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      if (committed.value) return;
      const dx = e.translationX;
      if (dx >= 0) {
        const over = Math.max(0, dx - SWIPE_THRESHOLD);
        translateX.value = Math.min(dx, SWIPE_THRESHOLD) + over * OVERDRAG_RESISTANCE;
        strike.value = Math.min(dx / SWIPE_THRESHOLD, 1) * DRAG_MAX;
      } else {
        const adx = -dx;
        const over = Math.max(0, adx - DELETE_THRESHOLD);
        translateX.value = -(Math.min(adx, DELETE_THRESHOLD) + over * OVERDRAG_RESISTANCE);
        strike.value = 0;
      }
    })
    .onEnd((e) => {
      if (committed.value) return;

      if (e.translationX > SWIPE_THRESHOLD) {
        committed.value = true;
        translateX.value = withSpring(0, SPRING_BACK);
        // Finish the scribble at a constant pen speed from wherever the finger left it.
        const remaining = 1 - strike.value;
        strike.value = withTiming(
          1,
          { duration: 110 + remaining * 240, easing: Easing.out(Easing.cubic) },
          (finished) => {
            if (finished) land();
          },
        );
      } else if (e.translationX < -DELETE_THRESHOLD) {
        committed.value = true;
        flingOutAndDelete();
      } else {
        translateX.value = withSpring(0, SPRING_BACK);
        // Not enough — the ink lifts back off the page.
        strike.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) });
      }
    });

  const longPress = Gesture.LongPress()
    .enabled(!editing && Boolean(onEdit))
    .minDuration(420)
    .maxDistance(12)
    .onStart(() => {
      if (committed.value) return;
      runOnJS(beginEdit)();
    });

  const gesture = Gesture.Race(longPress, panGesture);

  const onCardLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (!collapsing.value) measuredHeight.value = e.nativeEvent.layout.height;
    },
    [collapsing, measuredHeight],
  );

  const containerStyle = useAnimatedStyle(() => {
    if (!collapsing.value) {
      return { opacity: cardOpacity.value, marginVertical: CARD_MARGIN };
    }
    const k = 1 - collapse.value;
    return {
      opacity: cardOpacity.value,
      height: Math.max(0, measuredHeight.value * k),
      marginVertical: CARD_MARGIN * k,
    };
  });

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { scale: cardScale.value },
      { rotate: `${cardRotate.value}deg` },
    ],
  }));

  const cardSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const deleteBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-24, -DELETE_THRESHOLD * 0.6], [0, 1], Extrapolation.CLAMP),
  }));
  const trashStyle = useAnimatedStyle(() => {
    const armed = translateX.value <= -DELETE_THRESHOLD;
    return {
      transform: [{ scale: withSpring(armed ? 1.25 : 1, IOS_SPRING) }],
    };
  });

  const textAnimStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: strikeGlow.value * 0.08 }));
  const splatStyle = useAnimatedStyle(() => ({ opacity: splatOpacity.value }));

  const angles = ANGLES[scribbleVariant];
  const stroke1Style = useStrokeStyle(strike, STROKE_1, angles[0]);
  const stroke2Style = useStrokeStyle(strike, STROKE_2, angles[1]);
  const stroke3Style = useStrokeStyle(strike, STROKE_3, angles[2]);

  const loopStyle = useAnimatedStyle(() => {
    const p = interpolate(strike.value, [0.22, 0.78], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: p > 0.002 ? 1 : 0,
      transform: [{ rotate: '-7deg' }, { scaleX: p }, { scaleY: 0.7 + 0.3 * p }],
    };
  });

  const pixelXStyle = useAnimatedStyle(() => {
    const p = interpolate(strike.value, [0.68, 1], [0, 1], Extrapolation.CLAMP);
    // Snap in with a little overshoot — pixel-art pop.
    const scale = p < 0.75 ? (p / 0.75) * 1.18 : 1.18 - ((p - 0.75) / 0.25) * 0.18;
    return {
      opacity: p > 0.002 ? 1 : 0,
      transform: [{ scale }],
    };
  });

  const strokeW = { width: SCRIBBLE_WIDTH };
  const strokeWShort = { width: SCRIBBLE_WIDTH * 0.9 };
  // Signal: a grease pencil, not a marker — square-ended strokes.
  const strikeColor = signal ? { backgroundColor: theme.accent, borderRadius: 0 } : { backgroundColor: theme.accent };

  const renderScribble = () => {
    if (scribbleVariant === 'zigzag') {
      return (
        <View style={styles.scribbleLayer} pointerEvents="none">
          <Animated.View style={[styles.stroke, strikeColor, strokeW, styles.zig1, stroke1Style]} />
          <Animated.View style={[styles.stroke, strikeColor, strokeW, styles.zig2, stroke2Style]} />
          <Animated.View style={[styles.stroke, strikeColor, strokeWShort, styles.zig3, stroke3Style]} />
        </View>
      );
    }

    if (scribbleVariant === 'markerLoop') {
      return (
        <View style={styles.scribbleLayer} pointerEvents="none">
          <Animated.View style={[styles.stroke, strikeColor, strokeW, styles.loopSlash, stroke1Style]} />
          <Animated.View
            style={[styles.loopStroke, { borderColor: theme.accent, width: SCRIBBLE_WIDTH * 0.74 }, loopStyle]}
          />
          <Animated.View style={[styles.stroke, strikeColor, strokeWShort, styles.loopSlashTwo, stroke3Style]} />
        </View>
      );
    }

    if (scribbleVariant === 'pixelX') {
      return (
        <View style={styles.scribbleLayer} pointerEvents="none">
          <Animated.View style={[styles.stroke, strikeColor, strokeW, styles.pixelSlash, styles.pixelSlashA, stroke1Style]} />
          <Animated.View style={[styles.stroke, strikeColor, strokeW, styles.pixelSlash, styles.pixelSlashB, stroke2Style]} />
          <Animated.View style={[styles.pixelX, pixelXStyle]}>
            <View style={[styles.pixelBlock, strikeColor, styles.pixelBlockA]} />
            <View style={[styles.pixelBlock, strikeColor, styles.pixelBlockB]} />
            <View style={[styles.pixelBlock, strikeColor, styles.pixelBlockC]} />
            <View style={[styles.pixelBlock, strikeColor, styles.pixelBlockD]} />
          </Animated.View>
        </View>
      );
    }

    return (
      <View style={styles.scribbleLayer} pointerEvents="none">
        <Animated.View style={[styles.stroke, strikeColor, strokeW, styles.strike1, stroke1Style]} />
        <Animated.View style={[styles.stroke, strikeColor, strokeW, styles.strike2, stroke2Style]} />
        <Animated.View style={[styles.stroke, strikeColor, strokeWShort, styles.strike3, stroke3Style]} />
      </View>
    );
  };

  // VoiceOver: the swipe gestures are exposed as custom actions, like Reminders.
  const onAccessibilityAction = useCallback(
    (e: AccessibilityActionEvent) => {
      switch (e.nativeEvent.actionName) {
        case 'complete':
          if (committed.value) return;
          committed.value = true;
          strike.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }, (f) => {
            if (f) land();
          });
          break;
        case 'delete':
          if (committed.value) return;
          committed.value = true;
          flingOutAndDelete();
          break;
        case 'edit':
          beginEdit();
          break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [beginEdit],
  );

  const radius = { borderRadius: theme.radiusCard };
  // Signal: the index bullet is the line marker. Express Blue on the first stop,
  // ink on the rest, Go Green once the pen has landed.
  const bulletColor = struck ? theme.green : line ? lineColor(line, theme) : index === 0 ? theme.blue : theme.text;
  const bulletInk = struck ? '#fff' : line ? onLineColor(line, theme) : theme.isDark && index !== 0 ? theme.bg : '#fff';
  const textStyle = [
    styles.taskText,
    size === 'l' ? (signal ? theme.fontDisplay : styles.taskTextBigClassic) : theme.fontTask,
    { color: theme.text },
    signal && styles.taskTextSignal,
    size === 's' && styles.taskTextSmall,
    size === 'l' && styles.taskTextBig,
  ];

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.View style={[styles.bgReveal, radius, signal && styles.bgSignal, { backgroundColor: theme.green }, bgStyle]}>
        <Symbol name="checkmark" size={22} color="#fff" weight="heavy" />
        <Text style={[styles.completeLabel, signal && styles.completeLabelSignal]} allowFontScaling={false}>
          DONE!
        </Text>
      </Animated.View>

      <Animated.View style={[styles.bgDelete, radius, signal && styles.bgSignal, { backgroundColor: theme.accent }, deleteBgStyle]}>
        <Animated.View style={trashStyle}>
          <Symbol name="trash.fill" size={20} color="#fff" weight="semibold" />
        </Animated.View>
      </Animated.View>

      <Animated.View style={shakeStyle}>
        <GestureDetector gesture={gesture}>
          <Animated.View
            onLayout={onCardLayout}
            style={[
              styles.card,
              radius,
              theme.shadowCard,
              {
                backgroundColor: theme.surface,
                borderWidth: theme.borderWidth,
                borderColor: editing ? theme.accent : theme.cardBorder,
              },
              signal && styles.cardSignal,
              cardSlideStyle,
            ]}
            accessible={!editing}
            accessibilityRole="button"
            accessibilityLabel={task.text}
            accessibilityHint="Swipe right to complete, left to delete, hold to edit"
            accessibilityActions={[
              { name: 'complete', label: 'Complete' },
              { name: 'delete', label: 'Delete' },
              ...(onEdit ? [{ name: 'edit', label: 'Edit' }] : []),
            ]}
            onAccessibilityAction={onAccessibilityAction}
          >
           {/* Inner layer clips the scribble; the outer keeps its shadow unclipped. */}
           <View
             style={[
               styles.cardInner,
               { borderRadius: Math.max(0, theme.radiusCard - theme.borderWidth) },
               signal ? styles.cardInnerSignal : styles.cardInnerClassic,
               size === 's' && styles.cardInnerSmall,
               size === 'l' && styles.cardInnerBig,
             ]}
           >
            <Animated.View style={[styles.glowOverlay, { backgroundColor: theme.accent }, glowStyle]} />

            {signal ? (
              <View style={[styles.bullet, size === 'l' && styles.bulletBig, { backgroundColor: bulletColor }]}>
                <Text style={[styles.bulletText, size === 'l' && styles.bulletTextBig, { color: bulletInk }]} allowFontScaling={false}>
                  {index + 1}
                </Text>
              </View>
            ) : (
              line && <View style={[styles.lineBar, { backgroundColor: lineColor(line, theme) }]} />
            )}

            {editing ? (
              <View>
                <TextInput
                  ref={inputRef}
                  style={[textStyle, styles.taskInput]}
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={commitEdit}
                  onBlur={commitEdit}
                  returnKeyType="done"
                  multiline={false}
                  selectTextOnFocus
                  keyboardAppearance={theme.isDark ? 'dark' : 'light'}
                  maxFontSizeMultiplier={1.3}
                  accessibilityLabel="Edit task"
                />
                <EditTray
                  theme={theme}
                  size={size}
                  line={line}
                  onSize={onSize ? (v) => { if (hapticsEnabled) Haptics.selectionAsync(); onSize(task.id, v); } : undefined}
                  onLine={onLine ? (v) => { if (hapticsEnabled) Haptics.selectionAsync(); onLine(task.id, v); } : undefined}
                  onDone={commitEdit}
                />
              </View>
            ) : (
              <Animated.View style={textAnimStyle}>
                <Text style={textStyle} numberOfLines={size === 'l' ? 4 : 3} maxFontSizeMultiplier={1.3}>
                  {task.text}
                </Text>
                {upstream && upstream.length > 0 && !struck && (
                  <Text style={[styles.upstream, { color: theme.textTertiary }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                    after {upstream[0]}
                    {upstream.length > 1 ? ` +${upstream.length - 1}` : ''}
                  </Text>
                )}
              </Animated.View>
            )}

            {renderScribble()}

            <Animated.View style={[styles.splat, strikeColor, styles.splat1, splatStyle]} />
            <Animated.View style={[styles.splat, strikeColor, styles.splat2, splatStyle]} />
            <Animated.View style={[styles.splat, strikeColor, styles.splat3, splatStyle]} />
           </View>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </Animated.View>
  );
}

export const TaskItem = memo(TaskItemInner);

/**
 * Size and line live in the edit state, where you're already looking at one
 * task on purpose. Nothing here is asked at add time.
 */
function EditTray({
  theme,
  size,
  line,
  onSize,
  onLine,
  onDone,
}: {
  theme: Theme;
  size: TaskSize;
  line: LineId | undefined;
  onSize?: (s: TaskSize) => void;
  onLine?: (l: LineId | undefined) => void;
  onDone: () => void;
}) {
  const signal = theme.isSignal;
  return (
    <View style={[styles.tray, { borderTopColor: theme.separator }]}>
      {onSize && (
        <View style={styles.trayGroup} accessibilityRole="radiogroup" accessibilityLabel="Size">
          {TASK_SIZES.map((s) => {
            const on = s === size;
            return (
              <Pressable
                key={s}
                onPress={() => onSize(s)}
                hitSlop={6}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={TASK_SIZE_LABEL[s]}
                style={[
                  styles.sizeChip,
                  s === 's' && styles.sizeChipS,
                  s === 'l' && styles.sizeChipL,
                  {
                    borderColor: on ? theme.text : theme.textTertiary,
                    backgroundColor: on ? theme.text : 'transparent',
                    borderRadius: theme.radiusTag,
                  },
                ]}
              >
                <Text
                  style={[styles.sizeChipText, signal && theme.fontLabel, { color: on ? theme.bg : theme.textSecondary }]}
                  allowFontScaling={false}
                >
                  {s.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {onLine && (
        <View style={styles.trayGroup} accessibilityRole="radiogroup" accessibilityLabel="Line">
          <Pressable
            onPress={() => onLine(undefined)}
            hitSlop={6}
            accessibilityRole="radio"
            accessibilityState={{ selected: !line }}
            accessibilityLabel="No line"
            style={[styles.swatch, styles.swatchNone, { borderColor: !line ? theme.text : theme.textTertiary }]}
          >
            <View style={[styles.swatchSlash, { backgroundColor: !line ? theme.text : theme.textTertiary }]} />
          </Pressable>
          {LINES.map((l) => {
            const on = l.id === line;
            return (
              <Pressable
                key={l.id}
                onPress={() => onLine(l.id)}
                hitSlop={6}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${l.name} line`}
                style={[
                  styles.swatch,
                  { backgroundColor: lineColor(l.id, theme), borderColor: on ? theme.text : 'transparent', borderRadius: signal ? 3 : 10 },
                ]}
              />
            );
          })}
        </View>
      )}
      <Pressable onPress={onDone} hitSlop={8} style={styles.trayDone} accessibilityRole="button" accessibilityLabel="Done editing">
        <Text style={[styles.trayDoneText, { color: theme.blue }]} maxFontSizeMultiplier={1.2}>
          Done
        </Text>
      </Pressable>
    </View>
  );
}

function getScribbleVariant(id: string): ScribbleVariant {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return SCRIBBLE_VARIANTS[Math.abs(hash) % SCRIBBLE_VARIANTS.length];
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    marginVertical: CARD_MARGIN,
  },
  bgReveal: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    borderRadius: 14,
  },
  bgDelete: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 22,
    borderRadius: 14,
  },
  // Stop short of the hard-shadow gutter.
  bgSignal: {
    right: 4,
    bottom: 4,
  },
  completeLabel: {
    position: 'absolute',
    right: 18,
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  completeLabelSignal: {
    fontFamily: 'PressStart2P',
    fontSize: 8,
    fontWeight: '400',
    letterSpacing: 0,
  },
  card: {
    minHeight: 58,
  },
  // Room for the hard shadow so it isn't clipped by the row container.
  cardSignal: {
    marginRight: 4,
    marginBottom: 4,
  },
  cardInner: {
    flex: 1,
    minHeight: 56,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardInnerClassic: {
    paddingHorizontal: 17,
    paddingVertical: 15,
  },
  // The stop bullet sits in the gutter.
  cardInnerSignal: {
    paddingLeft: 54,
    paddingRight: 16,
    paddingVertical: 14,
  },
  bullet: {
    position: 'absolute',
    left: 14,
    top: '50%',
    marginTop: -13,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: {
    fontSize: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  taskText: {
    fontSize: 17,
    lineHeight: 22,
    paddingRight: 8,
  },
  taskTextSignal: {
    fontSize: 16,
    lineHeight: 21,
  },
  taskTextSmall: {
    fontSize: 15,
    lineHeight: 19,
  },
  taskTextBig: {
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.6,
  },
  taskTextBigClassic: {
    fontWeight: '800',
  },
  taskInput: {
    paddingVertical: 0,
    margin: 0,
  },
  cardInnerSmall: {
    minHeight: 42,
    paddingVertical: 9,
  },
  cardInnerBig: {
    minHeight: 100,
    paddingVertical: 24,
  },
  bulletBig: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginTop: -16,
    left: 12,
  },
  bulletTextBig: {
    fontSize: 15,
  },
  lineBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  upstream: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  tray: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  trayGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sizeChip: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  sizeChipS: {
    width: 22,
    height: 22,
  },
  sizeChipL: {
    width: 32,
    height: 32,
  },
  sizeChipText: {
    fontSize: 9,
    fontWeight: '900',
  },
  swatch: {
    width: 20,
    height: 20,
    borderWidth: 2,
  },
  swatchNone: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSlash: {
    width: 12,
    height: 2,
    transform: [{ rotate: '-45deg' }],
  },
  trayDone: {
    marginLeft: 'auto',
    paddingVertical: 4,
    paddingLeft: 8,
  },
  trayDoneText: {
    fontSize: 15,
    fontWeight: '700',
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    borderRadius: 14,
  },
  scribbleLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  // Base pen stroke. Full length is laid out once; drawing is a scaleX from the left
  // edge so it runs on the UI thread without triggering layout.
  stroke: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    transformOrigin: 'left center',
  },
  strike1: { left: 12, top: '38%' },
  strike2: { left: 18, top: '54%' },
  strike3: { left: 26, top: '48%', height: 3 },
  zig1: { left: 12, top: '32%', borderRadius: 1 },
  zig2: { left: 20, top: '52%', borderRadius: 1 },
  zig3: { left: 28, top: '43%', borderRadius: 1 },
  loopStroke: {
    position: 'absolute',
    left: 16,
    top: '15%',
    height: '70%',
    borderWidth: 4,
    borderRadius: 24,
    transformOrigin: 'left center',
  },
  loopSlash: { left: 18, top: '45%' },
  loopSlashTwo: { left: 28, top: '57%', height: 3 },
  pixelSlash: { left: 14, height: 5, borderRadius: 0 },
  pixelSlashA: { top: '38%' },
  pixelSlashB: { top: '57%' },
  pixelX: {
    position: 'absolute',
    right: 28,
    top: '50%',
    marginTop: -15,
    width: 30,
    height: 30,
  },
  pixelBlock: {
    position: 'absolute',
    width: 10,
    height: 10,
  },
  pixelBlockA: { left: 0, top: 0 },
  pixelBlockB: { right: 0, top: 0 },
  pixelBlockC: { left: 0, bottom: 0 },
  pixelBlockD: { right: 0, bottom: 0 },
  splat: {
    position: 'absolute',
    borderRadius: 10,
  },
  splat1: { width: 6, height: 6, top: '22%', left: '35%' },
  splat2: { width: 4, height: 4, top: '68%', left: '55%' },
  splat3: { width: 7, height: 5, top: '28%', right: '22%', borderRadius: 3 },
});
