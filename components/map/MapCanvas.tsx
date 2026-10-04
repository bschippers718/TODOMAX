import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Task, TaskSize, taskSize } from '../../lib/types';
import { Theme, IOS_SPRING_SNAPPY } from '../../lib/theme';
import { lineColor } from '../../lib/lines';

export type Point = { x: number; y: number };
type Positions = Record<string, Point>;
type Dims = Record<string, { w: number; h: number }>;

export const CARD_WIDTH: Record<TaskSize, number> = { s: 150, m: 190, l: 240 };
const GRID = { cols: 2, cellW: 212, cellH: 118, originX: 24, originY: 24 };
const MIN_SCALE = 0.5;
const MAX_SCALE = 2;

/** Deterministic jitter so the first layout is a loose jumble, not a spreadsheet. */
function jitter(id: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 37) - 18);
}

/** Positions for tasks that have never been placed. */
export function autoPlace(tasks: Task[]): Positions {
  const out: Positions = {};
  let slot = 0;
  for (const t of tasks) {
    if (t.pos) continue;
    const col = slot % GRID.cols;
    const row = Math.floor(slot / GRID.cols);
    out[t.id] = {
      x: GRID.originX + col * GRID.cellW + jitter(t.id, 7),
      y: GRID.originY + row * GRID.cellH + jitter(t.id, 13),
    };
    slot++;
  }
  return out;
}

interface Props {
  tasks: Task[];
  theme: Theme;
  haptics: boolean;
  reduceMotion: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, pos: Point) => void;
  onStrike: (id: string) => void;
  onComplete: (id: string, size: TaskSize) => void;
  /** Exposed so the screen can drop new stops at the viewport centre. */
  viewport: { tx: SharedValue<number>; ty: SharedValue<number>; scale: SharedValue<number> };
}

export function MapCanvas({ tasks, theme, haptics, reduceMotion, selectedId, onSelect, onMove, onStrike, onComplete, viewport }: Props) {
  const { tx, ty, scale } = viewport;
  const positions = useSharedValue<Positions>({});
  const dims = useSharedValue<Dims>({});
  const dragging = useSharedValue<string | null>(null);

  // Mirror store positions into the shared map, except for the card in hand.
  useEffect(() => {
    const next: Positions = { ...positions.value };
    for (const t of tasks) {
      if (t.pos && t.id !== dragging.value) next[t.id] = t.pos;
    }
    for (const id of Object.keys(next)) {
      if (!tasks.some((t) => t.id === id)) delete next[id];
    }
    positions.value = next;
  }, [tasks, positions, dragging]);

  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);
  const startScale = useSharedValue(1);

  const clearSelection = () => onSelect(null);

  const canvasPan = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = startTx.value + e.translationX;
      ty.value = startTy.value + e.translationY;
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, startScale.value * e.scale));
      const ratio = next / startScale.value;
      // Zoom about the fingers, not the origin.
      tx.value = e.focalX - (e.focalX - startTx.value) * ratio;
      ty.value = e.focalY - (e.focalY - startTy.value) * ratio;
      scale.value = next;
    });

  const backgroundTap = Gesture.Tap().onEnd(() => {
    runOnJS(clearSelection)();
  });

  const canvasGesture = Gesture.Race(Gesture.Simultaneous(canvasPan, pinch), backgroundTap);

  const worldStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const edges = useMemo(() => {
    const ids = new Set(tasks.map((t) => t.id));
    const out: { from: string; to: string; color: string }[] = [];
    for (const t of tasks) {
      for (const up of t.after ?? []) {
        if (!ids.has(up)) continue;
        const upstream = tasks.find((x) => x.id === up)!;
        out.push({ from: up, to: t.id, color: upstream.line ? lineColor(upstream.line, theme) : theme.isSignal ? theme.text : theme.textTertiary });
      }
    }
    return out;
  }, [tasks, theme]);

  return (
    <GestureDetector gesture={canvasGesture}>
      <View style={styles.viewport} collapsable={false}>
        <Animated.View style={[styles.world, worldStyle]}>
          {edges.map((e) => (
            <Edge key={`${e.from}->${e.to}`} from={e.from} to={e.to} color={e.color} positions={positions} dims={dims} theme={theme} />
          ))}
          {tasks.map((t) => (
            <MapCard
              key={t.id}
              task={t}
              theme={theme}
              haptics={haptics}
              reduceMotion={reduceMotion}
              selected={selectedId === t.id}
              linking={selectedId !== null && selectedId !== t.id}
              positions={positions}
              dims={dims}
              dragging={dragging}
              scale={scale}
              onSelect={onSelect}
              onMove={onMove}
              onStrike={onStrike}
              onComplete={onComplete}
            />
          ))}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

// ---- Edge -------------------------------------------------------------------

function Edge({
  from,
  to,
  color,
  positions,
  dims,
  theme,
}: {
  from: string;
  to: string;
  color: string;
  positions: SharedValue<Positions>;
  dims: SharedValue<Dims>;
  theme: Theme;
}) {
  const style = useAnimatedStyle(() => {
    const a = positions.value[from];
    const b = positions.value[to];
    const da = dims.value[from] ?? { w: CARD_WIDTH.m, h: 60 };
    const db = dims.value[to] ?? { w: CARD_WIDTH.m, h: 60 };
    if (!a || !b) return { opacity: 0 };
    const ax = a.x + da.w / 2;
    const ay = a.y + da.h / 2;
    const bx = b.x + db.w / 2;
    const by = b.y + db.h / 2;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    // Stop the line where it meets the destination card's edge so the arrow shows.
    const cos = Math.abs(Math.cos(angle));
    const sin = Math.abs(Math.sin(angle));
    const toEdge = Math.min(cos > 0.0001 ? db.w / 2 / cos : Infinity, sin > 0.0001 ? db.h / 2 / sin : Infinity);
    const inset = Math.min(len * 0.6, toEdge + 12);
    return {
      opacity: 1,
      width: Math.max(0, len - inset),
      transform: [{ translateX: ax }, { translateY: ay }, { rotate: `${angle}rad` }],
    };
  });
  const thickness = theme.isSignal ? 3 : 2;
  return (
    <Animated.View style={[styles.edge, { height: thickness, backgroundColor: color, marginTop: -thickness / 2 }, style]} pointerEvents="none">
      <View
        style={[
          styles.arrow,
          {
            borderLeftColor: color,
            borderTopWidth: 6,
            borderBottomWidth: 6,
            borderLeftWidth: 10,
            top: -6 + thickness / 2,
          },
        ]}
      />
    </Animated.View>
  );
}

// ---- Card -------------------------------------------------------------------

const MapCard = memo(function MapCard({
  task,
  theme,
  haptics,
  reduceMotion,
  selected,
  linking,
  positions,
  dims,
  dragging,
  scale,
  onSelect,
  onMove,
  onStrike,
  onComplete,
}: {
  task: Task;
  theme: Theme;
  haptics: boolean;
  reduceMotion: boolean;
  selected: boolean;
  linking: boolean;
  positions: SharedValue<Positions>;
  dims: SharedValue<Dims>;
  dragging: SharedValue<string | null>;
  scale: SharedValue<number>;
  onSelect: (id: string | null) => void;
  onMove: (id: string, pos: Point) => void;
  onStrike: (id: string) => void;
  onComplete: (id: string, size: TaskSize) => void;
}) {
  const size = taskSize(task);
  const signal = theme.isSignal;
  const lift = useSharedValue(0);
  const struck = useSharedValue(0);
  const committed = useSharedValue(false);
  const startPos = useSharedValue<Point>({ x: 0, y: 0 });
  const id = task.id;

  const pickUp = () => {
    if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  const putDown = (p: Point) => onMove(id, p);
  const tap = () => {
    if (haptics) Haptics.selectionAsync();
    onSelect(id);
  };
  const strikeNow = () => {
    if (haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onStrike(id);
  };
  const complete = () => onComplete(id, size);

  const gesture = useMemo(() => {
    const drag = Gesture.Pan()
      .activateAfterLongPress(160)
      .onStart(() => {
        if (committed.value) return;
        dragging.value = id;
        startPos.value = positions.value[id] ?? { x: 0, y: 0 };
        lift.value = withSpring(1, IOS_SPRING_SNAPPY);
        runOnJS(pickUp)();
      })
      .onUpdate((e) => {
        if (committed.value) return;
        const s = scale.value;
        positions.value = {
          ...positions.value,
          [id]: { x: startPos.value.x + e.translationX / s, y: startPos.value.y + e.translationY / s },
        };
      })
      .onFinalize(() => {
        lift.value = withSpring(0, IOS_SPRING_SNAPPY);
        const p = positions.value[id];
        dragging.value = null;
        if (p) runOnJS(putDown)(p);
      });

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDelay(260)
      .onEnd(() => {
        if (committed.value) return;
        committed.value = true;
        runOnJS(strikeNow)();
        struck.value = withSequence(
          withTiming(1, { duration: reduceMotion ? 120 : 220, easing: Easing.out(Easing.cubic) }),
          withTiming(2, { duration: reduceMotion ? 120 : 260, easing: Easing.in(Easing.cubic) }, (f) => {
            if (f) runOnJS(complete)();
          }),
        );
      });

    const singleTap = Gesture.Tap()
      .numberOfTaps(1)
      .onEnd(() => {
        if (committed.value) return;
        runOnJS(tap)();
      });

    return Gesture.Race(drag, Gesture.Exclusive(doubleTap, singleTap));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, size, haptics, reduceMotion]);

  const placement = useAnimatedStyle(() => {
    const p = positions.value[id];
    if (!p) return { opacity: 0 };
    const liftScale = 1 + lift.value * 0.04;
    const s = struck.value;
    // Phase 1 (0→1): flash green, settle. Phase 2 (1→2): shrink and fade away.
    const gone = Math.max(0, s - 1);
    return {
      opacity: 1 - gone,
      transform: [
        { translateX: p.x },
        { translateY: p.y },
        { scale: liftScale * (1 - gone * 0.2) },
        { rotate: `${lift.value * -1.2}deg` },
      ],
      zIndex: lift.value > 0 ? 10 : 1,
    };
  });

  const flash = useAnimatedStyle(() => ({
    opacity: Math.min(1, struck.value) * (1 - Math.max(0, struck.value - 1)),
  }));

  const shadow = useAnimatedStyle(() => {
    if (!signal) return {};
    const d = 4 + lift.value * 4;
    return { shadowOffset: { width: d, height: d } };
  });

  const border = selected ? theme.blue : linking ? theme.textTertiary : theme.cardBorder;
  const dot = task.line ? lineColor(task.line, theme) : signal ? theme.text : theme.textTertiary;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          dims.value = { ...dims.value, [id]: { w: width, h: height } };
        }}
        style={[
          styles.card,
          theme.shadowCard,
          shadow,
          {
            width: CARD_WIDTH[size],
            backgroundColor: theme.surface,
            borderColor: border,
            borderWidth: selected ? Math.max(2.5, theme.borderWidth) : theme.borderWidth,
            borderRadius: theme.radiusCard,
          },
          size === 's' && styles.cardS,
          size === 'l' && styles.cardL,
          placement,
        ]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={task.text}
        accessibilityHint="Double tap to strike. Tap to connect to another stop. Hold and drag to move."
      >
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: theme.green, borderRadius: Math.max(0, theme.radiusCard - theme.borderWidth) }, flash]} />
        <View style={[styles.dot, { backgroundColor: dot, borderRadius: signal ? 2 : 5 }, size === 'l' && styles.dotL]} />
        <Text
          style={[
            styles.text,
            size === 'l' ? (signal ? theme.fontDisplay : styles.textBigClassic) : theme.fontTask,
            { color: theme.text },
            size === 's' && styles.textS,
            size === 'l' && styles.textL,
          ]}
          numberOfLines={size === 'l' ? 4 : 3}
          allowFontScaling={false}
        >
          {task.text}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
  world: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 1,
    height: 1,
  },
  edge: {
    position: 'absolute',
    left: 0,
    top: 0,
    transformOrigin: 'left center',
  },
  arrow: {
    position: 'absolute',
    right: -10,
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  card: {
    position: 'absolute',
    left: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  cardS: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  cardL: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    marginTop: 5,
  },
  dotL: {
    width: 14,
    height: 14,
    marginTop: 6,
  },
  text: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  textS: {
    fontSize: 13,
    lineHeight: 17,
  },
  textL: {
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.5,
  },
  textBigClassic: {
    fontWeight: '800',
  },
});
