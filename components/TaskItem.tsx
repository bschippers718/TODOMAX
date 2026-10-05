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
  withDelay,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Task, Settings, TaskSize, LineId, TASK_SIZES, TASK_SIZE_LABEL, taskSize } from '../lib/types';
import { useTheme, IOS_SPRING, Theme } from '../lib/theme';
import { LINES, lineColor, onLineColor } from '../lib/lines';
import { Symbol } from './ui/Symbol';
import { InkTrail, pushInkPoint } from './InkTrail';

// Past the threshold the card resists, like pulling against a rubber band.
const OVERDRAG_RESISTANCE = 0.22;
// Pause between the finger lifting and the card folding away. Long enough to
// see what you did; short enough that the list keeps moving.
const HOLD_AFTER_STRIKE = 420;
const CARD_MARGIN = 4;

// How much of the card the mark has to cross before lifting counts. A single
// line across most of the text, or a dense scribble over one spot.
const COVER_EXTENT = 0.45;
const COVER_LENGTH = 1.0;

const SPRING_BACK = { damping: 20, stiffness: 260, mass: 0.7 };
// Overdamped so a height collapse never overshoots into negative space.
const SPRING_COLLAPSE = { damping: 26, stiffness: 240, mass: 0.9, overshootClamping: true };

// Pen: a grease pencil in Signal, a felt marker in Classic. Faster strokes run thinner.
const PEN_W = { signal: 5, classic: 6 };
const PEN_MIN = 0.65;
const PEN_MAX = 1.2;

// Which way the finger went first decides what the gesture is.
const MODE_NONE = 0;
const MODE_INK = 1;
const MODE_SLIDE = 2;

interface TaskItemProps {
  task: Task;
  settings: Settings;
  /** Position in the list; Signal shows it as a stop number. */
  index?: number;
  reduceMotion?: boolean;
  /** Fired the instant the mark lands (sound/haptics belong here). */
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
  const DELETE_THRESHOLD = SW * 0.3;
  const signal = theme.isSignal;
  const penBase = signal ? PEN_W.signal : PEN_W.classic;
  const [struck, setStruck] = useState(false);
  const [inking, setInking] = useState(false);

  const translateX = useSharedValue(0);
  const committed = useSharedValue(false);
  const mode = useSharedValue(MODE_NONE);

  // The mark itself: finger samples, how many are shown, and the layer's opacity.
  const inkPoints = useSharedValue<number[]>([]);
  const inkCount = useSharedValue(0);
  const inkOpacity = useSharedValue(1);
  // Coverage bookkeeping for the "that's enough" decision.
  const inkMinX = useSharedValue(0);
  const inkMaxX = useSharedValue(0);
  const inkLength = useSharedValue(0);
  const penW = useSharedValue(penBase);
  const lastT = useSharedValue(0);
  const armed = useSharedValue(false);

  // Height comes from content (Dynamic Type friendly); we only pin it while collapsing.
  const measuredHeight = useSharedValue(0);
  const cardWidth = useSharedValue(SW);
  const collapse = useSharedValue(0);
  const collapsing = useSharedValue(false);
  const cardOpacity = useSharedValue(1);
  const textOpacity = useSharedValue(1);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);
  const size = taskSize(task);
  const line = task.line;
  const inputRef = useRef<TextInput>(null);

  const hapticsEnabled = settings.hapticsEnabled;

  // Worklets and the VoiceOver handler are built once per row; they call
  // through these so a size change or new handler is never missed.
  const latest = useRef({ onComplete, onDelete, onStrike, size, hapticsEnabled });
  latest.current = { onComplete, onDelete, onStrike, size, hapticsEnabled };

  const fireComplete = useCallback(() => latest.current.onComplete(task.id, latest.current.size), [task.id]);
  const fireDelete = useCallback(() => latest.current.onDelete(task.id), [task.id]);
  const fireStrike = useCallback(() => {
    // The "it's done" moment is a success notification, not a thud.
    if (latest.current.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setStruck(true);
    latest.current.onStrike?.(task.id);
  }, [task.id]);
  const firePenDown = useCallback(() => {
    // Pen touches paper.
    if (hapticsEnabled) Haptics.selectionAsync();
    setInking(true);
  }, [hapticsEnabled]);
  const fireArmed = useCallback(() => {
    // "That'll do": lift whenever you like.
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [hapticsEnabled]);
  const fireDeleteHaptic = useCallback(() => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [hapticsEnabled]);
  const fireDeleteArm = useCallback(() => {
    if (hapticsEnabled) Haptics.selectionAsync();
  }, [hapticsEnabled]);
  const clearInk = useCallback(() => setInking(false), []);

  const beginEdit = useCallback(() => {
    if (!onEdit) return;
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setDraft(task.text);
    editingRef.current = true;
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [onEdit, hapticsEnabled, task.text]);

  const editingRef = useRef(false);
  const commitEdit = useCallback(() => {
    // Return and the blur it causes both land here; commit once.
    if (!editingRef.current) return;
    editingRef.current = false;
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed && trimmed !== task.text) onEdit?.(task.id, trimmed);
  }, [draft, task.id, task.text, onEdit]);

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

  // The finger lifts with enough on the page: the mark stays, the words
  // recede, and after a beat the card folds out of the list.
  const land = () => {
    'worklet';
    runOnJS(fireStrike)();
    textOpacity.value = withTiming(0.3, { duration: 220 });
    collapseOut(HOLD_AFTER_STRIKE, fireComplete);
  };

  // Not enough: the ink lifts back off the page.
  const liftInk = () => {
    'worklet';
    textOpacity.value = withTiming(1, { duration: 160 });
    inkOpacity.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) }, (finished) => {
      if (!finished) return;
      inkCount.value = 0;
      inkOpacity.value = 1;
      runOnJS(clearInk)();
    });
  };

  // Record the finger. Width eases with speed so the mark has a hand in it.
  const inkAt = (x: number, y: number) => {
    'worklet';
    const now = Date.now();
    const n = Math.floor(inkCount.value);
    let w = penW.value;
    if (n > 0) {
      const p = inkPoints.value;
      const lx = p[(n - 1) * 3];
      const ly = p[(n - 1) * 3 + 1];
      const d = Math.sqrt((x - lx) * (x - lx) + (y - ly) * (y - ly));
      // The first two samples arrive in the same tick; treat them as unhurried.
      const dt = Math.max(1, now - lastT.value);
      const speed = n === 1 ? 0 : d / dt;
      const target = penBase * Math.min(PEN_MAX, Math.max(PEN_MIN, PEN_MAX - 0.3 * speed));
      w = w * 0.55 + target * 0.45;
      inkLength.value += d;
    } else {
      inkMinX.value = x;
      inkMaxX.value = x;
      inkLength.value = 0;
    }
    penW.value = w;
    lastT.value = now;
    if (x < inkMinX.value) inkMinX.value = x;
    if (x > inkMaxX.value) inkMaxX.value = x;
    pushInkPoint(inkPoints, inkCount, x, y, w);

    if (!armed.value) {
      const cw = cardWidth.value;
      if (inkMaxX.value - inkMinX.value >= cw * COVER_EXTENT || inkLength.value >= cw * COVER_LENGTH) {
        armed.value = true;
        textOpacity.value = withTiming(0.5, { duration: 160 });
        runOnJS(fireArmed)();
      }
    }
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

  // Pan coordinates are relative to the card; the ink layer sits inside its border.
  const inset = theme.borderWidth;

  const panGesture = Gesture.Pan()
    .enabled(!editing)
    .maxPointers(1)
    .activeOffsetX([-10, 10])
    // A scribble rarely starts dead horizontal; give it a little slack
    // before the list claims the touch as a scroll.
    .failOffsetY([-14, 14])
    .onStart((e) => {
      if (committed.value) return;
      if (e.translationX < 0) {
        mode.value = MODE_SLIDE;
        return;
      }
      // Rightward: this is a pen. Start the mark where the finger first landed,
      // not where the gesture woke up.
      mode.value = MODE_INK;
      armed.value = false;
      inkCount.value = 0;
      inkOpacity.value = 1;
      penW.value = penBase;
      lastT.value = Date.now();
      runOnJS(firePenDown)();
      inkAt(e.x - e.translationX - inset, e.y - e.translationY - inset);
      inkAt(e.x - inset, e.y - inset);
    })
    .onUpdate((e) => {
      if (committed.value) return;
      if (mode.value === MODE_INK) {
        inkAt(e.x - inset, e.y - inset);
        return;
      }
      if (mode.value === MODE_SLIDE) {
        const adx = Math.max(0, -e.translationX);
        const over = Math.max(0, adx - DELETE_THRESHOLD);
        const prev = translateX.value;
        const next = -(Math.min(adx, DELETE_THRESHOLD) + over * OVERDRAG_RESISTANCE);
        translateX.value = next;
        if (prev > -DELETE_THRESHOLD && next <= -DELETE_THRESHOLD) runOnJS(fireDeleteArm)();
      }
    })
    .onEnd((e) => {
      if (committed.value) return;
      if (mode.value === MODE_INK) {
        if (armed.value) {
          committed.value = true;
          land();
        } else {
          liftInk();
        }
        return;
      }
      if (mode.value === MODE_SLIDE) {
        if (e.translationX < -DELETE_THRESHOLD) {
          committed.value = true;
          flingOutAndDelete();
        } else {
          translateX.value = withSpring(0, SPRING_BACK);
        }
      }
    })
    .onFinalize((_e, success) => {
      // Cancelled mid-stroke (system gesture, call banner, second finger):
      // onEnd never ran, so put the row back ourselves.
      if (!success && !committed.value) {
        if (mode.value === MODE_INK) liftInk();
        else if (mode.value === MODE_SLIDE) translateX.value = withSpring(0, SPRING_BACK);
      }
      mode.value = MODE_NONE;
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
      if (!collapsing.value) {
        measuredHeight.value = e.nativeEvent.layout.height;
        cardWidth.value = e.nativeEvent.layout.width;
      }
    },
    [collapsing, measuredHeight, cardWidth],
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

  const cardSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-24, -DELETE_THRESHOLD * 0.6], [0, 1], Extrapolation.CLAMP),
  }));
  const trashScale = useSharedValue(1);
  useAnimatedReaction(
    () => translateX.value <= -DELETE_THRESHOLD,
    (isArmed, was) => {
      if (isArmed !== was) trashScale.value = withSpring(isArmed ? 1.25 : 1, IOS_SPRING);
    },
  );
  const trashStyle = useAnimatedStyle(() => ({
    transform: [{ scale: trashScale.value }],
  }));

  const textAnimStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));

  // VoiceOver: the gestures are exposed as custom actions, like Reminders.
  // "Complete" lays a single hand-ish line across the text and reveals it.
  const strikeWithoutFinger = () => {
    'worklet';
    const cw = cardWidth.value;
    const h = measuredHeight.value || 56;
    const x0 = signal ? 50 : 14;
    const x1 = cw - 20;
    const steps = 28;
    inkPoints.modify((v) => {
      'worklet';
      v.length = 0;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        v.push(x0 + (x1 - x0) * t, h / 2 + Math.sin(t * Math.PI * 2.3) * 2.5 + t * 3, penBase);
      }
      return v;
    });
    inkOpacity.value = 1;
    inkCount.value = withTiming(steps + 1, { duration: 320, easing: Easing.out(Easing.cubic) }, (f) => {
      if (f) land();
    });
  };

  const onAccessibilityAction = useCallback(
    (e: AccessibilityActionEvent) => {
      switch (e.nativeEvent.actionName) {
        case 'complete':
          if (committed.value) return;
          committed.value = true;
          setInking(true);
          strikeWithoutFinger();
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
    [beginEdit, task.id],
  );

  const radius = { borderRadius: theme.radiusCard };
  // A line colours the whole card, not just its marker. Editing drops back to
  // the plain surface so the tray's controls stay legible.
  const painted = Boolean(line) && !editing;
  const paint = painted ? lineColor(line!, theme) : null;
  const onPaint = painted ? onLineColor(line!, theme) : null;
  // The index bullet: on a painted card it's the inverse (ink bubble, coloured
  // numeral). Otherwise, Express Blue on the first stop, ink on the rest.
  // Go Green once the pen has landed.
  const bulletColor = painted
    ? onPaint!
    : struck
      ? theme.green
      : index === 0
        ? theme.blue
        : theme.text;
  const bulletInk = painted
    ? struck
      ? theme.green
      : paint!
    : struck
      ? '#fff'
      : theme.isDark && index !== 0
        ? theme.bg
        : '#fff';
  const inkColor = painted ? onPaint! : theme.accent;
  const textStyle = [
    styles.taskText,
    size === 'l' ? (signal ? theme.fontDisplay : styles.taskTextBigClassic) : theme.fontTask,
    { color: painted ? onPaint! : theme.text },
    signal && styles.taskTextSignal,
    size === 's' && styles.taskTextSmall,
    size === 'l' && styles.taskTextBig,
  ];

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.View style={[styles.bgDelete, radius, signal && styles.bgSignal, { backgroundColor: theme.accent }, deleteBgStyle]}>
        <Animated.View style={trashStyle}>
          <Symbol name="trash.fill" size={20} color="#fff" weight="semibold" />
        </Animated.View>
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <Animated.View
          onLayout={onCardLayout}
          style={[
            styles.card,
            radius,
            signal && theme.shadowCard,
            size === 's' ? styles.cardSmall : styles.cardRegular,
            {
              backgroundColor: paint ?? theme.surface,
              borderWidth: theme.borderWidth,
              borderColor: editing ? theme.accent : theme.cardBorder,
            },
            signal && styles.cardSignal,
            cardSlideStyle,
          ]}
          accessible={!editing}
          accessibilityRole="button"
          accessibilityLabel={task.text}
          accessibilityHint={struck ? undefined : 'Actions available'}
          accessibilityState={{ busy: struck }}
          accessibilityActions={[
            { name: 'complete', label: 'Complete' },
            { name: 'delete', label: 'Delete' },
            ...(onEdit ? [{ name: 'edit', label: 'Edit' }] : []),
          ]}
          onAccessibilityAction={onAccessibilityAction}
        >
          {/* Inner layer clips the ink; the outer keeps its shadow unclipped. */}
          <View
            style={[
              styles.cardInner,
              { borderRadius: Math.max(0, theme.radiusCard - theme.borderWidth) },
              signal ? styles.cardInnerSignal : styles.cardInnerClassic,
              size === 's' && styles.cardInnerSmall,
              size === 'l' && styles.cardInnerBig,
            ]}
          >
            {/* The bullet is a row sibling of the text, so it centres on the
                text block whatever height the card ends up. */}
            {signal && (
              <View style={[styles.bullet, size === 'l' && styles.bulletBig, { backgroundColor: bulletColor }]}>
                <Text style={[styles.bulletText, size === 'l' && styles.bulletTextBig, { color: bulletInk }]} allowFontScaling={false}>
                  {index + 1}
                </Text>
              </View>
            )}

            {editing ? (
              <View style={styles.body}>
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
              <Animated.View style={[styles.body, textAnimStyle]}>
                <Text style={textStyle} numberOfLines={size === 'l' ? 4 : 3} maxFontSizeMultiplier={1.3}>
                  {task.text}
                </Text>
                {upstream && upstream.length > 0 && !struck && (
                  <Text
                    style={[styles.upstream, painted ? { color: onPaint!, opacity: 0.8 } : { color: theme.textTertiary }]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.3}
                  >
                    after {upstream[0]}
                    {upstream.length > 1 ? ` +${upstream.length - 1}` : ''}
                  </Text>
                )}
              </Animated.View>
            )}

            {inking && (
              <InkTrail points={inkPoints} count={inkCount} opacity={inkOpacity} color={inkColor} square={signal} />
            )}
          </View>
        </Animated.View>
      </GestureDetector>
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
                accessibilityState={{ checked: on }}
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
            accessibilityState={{ checked: !line }}
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
                accessibilityState={{ checked: on }}
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

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    marginVertical: CARD_MARGIN,
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
  card: {},
  cardRegular: {
    minHeight: 58,
  },
  cardSmall: {
    minHeight: 46,
  },
  // Room for the hard shadow so it isn't clipped by the row container.
  cardSignal: {
    marginRight: 4,
    marginBottom: 4,
  },
  cardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardInnerClassic: {
    paddingHorizontal: 17,
    paddingVertical: 15,
  },
  // The stop bullet sits in the gutter.
  cardInnerSignal: {
    paddingLeft: 14,
    paddingRight: 16,
    paddingVertical: 14,
  },
  // Text column; the bullet (if any) sits beside it.
  body: {
    flex: 1,
  },
  bullet: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 14,
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
    marginRight: 12,
    marginLeft: -2,
  },
  bulletTextBig: {
    fontSize: 15,
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
});
