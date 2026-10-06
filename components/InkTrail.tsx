import { memo, useMemo } from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';

/**
 * The finger's own mark. Points arrive from the pan gesture as a flat
 * [x, y, width, x, y, width, ...] array; each pooled segment draws the span
 * between two consecutive points. Everything runs on the UI thread, so the
 * ink stays glued to the finger. No canvas dependency: a segment is a view
 * translated to the midpoint, rotated along the stroke and scaled to length.
 */

/** Max segments on the page at once. When the trail outgrows it, every other point is dropped. */
export const INK_POOL = 96;
/** Minimum distance between recorded points. Keeps the pool for real motion. */
export const INK_MIN_STEP = 3;
/** Longer moves are subdivided so curves don't corner. */
export const INK_MAX_STEP = 14;

const SEG_W = 24;
const SEG_H = 6;

interface Props {
  points: SharedValue<number[]>;
  /** How many points are visible. Animating this reveals a pre-laid stroke. */
  count: SharedValue<number>;
  opacity: SharedValue<number>;
  color: string;
  /** Grease pencil (Signal): square ends. Marker (Classic): round. */
  square: boolean;
}

function Segment({
  i,
  points,
  count,
  square,
  base,
}: {
  i: number;
  points: SharedValue<number[]>;
  count: SharedValue<number>;
  square: boolean;
  base: StyleProp<ViewStyle>;
}) {
  const style = useAnimatedStyle(() => {
    const n = Math.floor(count.value);
    if (i + 1 >= n) return { opacity: 0 };
    const p = points.value;
    const a = i * 3;
    const b = a + 3;
    const x0 = p[a];
    const y0 = p[a + 1];
    const x1 = p[b];
    const y1 = p[b + 1];
    const w = (p[a + 2] + p[b + 2]) / 2;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    // Overlap neighbours by a cap so the trail reads as one continuous mark.
    const total = len + (square ? w * 0.6 : w);
    return {
      opacity: 1,
      transform: [
        { translateX: (x0 + x1) / 2 - SEG_W / 2 },
        { translateY: (y0 + y1) / 2 - SEG_H / 2 },
        { rotate: `${Math.atan2(dy, dx)}rad` },
        { scaleX: total / SEG_W },
        { scaleY: w / SEG_H },
      ],
    };
  });
  return <Animated.View style={[base, style]} />;
}

const INDICES = Array.from({ length: INK_POOL }, (_, i) => i);

function InkTrailInner({ points, count, opacity, color, square }: Props) {
  const layerStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  // One style object shared by every segment.
  const base = useMemo(() => [styles.seg, square && styles.segSquare, { backgroundColor: color }], [square, color]);
  return (
    <Animated.View style={[styles.layer, layerStyle]} pointerEvents="none">
      {INDICES.map((i) => (
        <Segment key={i} i={i} points={points} count={count} square={square} base={base} />
      ))}
    </Animated.View>
  );
}

export const InkTrail = memo(InkTrailInner);

/**
 * Append a point to the trail, in place, on the UI thread. Subdivides long
 * jumps and thins the pool when it fills.
 */
export function pushInkPoint(points: SharedValue<number[]>, count: SharedValue<number>, x: number, y: number, w: number) {
  'worklet';
  const p = points.value;
  const n = Math.floor(count.value);
  if (n === 0) {
    points.modify((v) => {
      'worklet';
      v.length = 0;
      v.push(x, y, w);
      return v;
    });
    count.value = 1;
    return;
  }
  const lx = p[(n - 1) * 3];
  const ly = p[(n - 1) * 3 + 1];
  const lw = p[(n - 1) * 3 + 2];
  const dx = x - lx;
  const dy = y - ly;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d < INK_MIN_STEP) return;

  const steps = Math.max(1, Math.ceil(d / INK_MAX_STEP));
  points.modify((v) => {
    'worklet';
    let m = n;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      v[m * 3] = lx + dx * t;
      v[m * 3 + 1] = ly + dy * t;
      v[m * 3 + 2] = lw + (w - lw) * t;
      m++;
    }
    v.length = m * 3;
    if (m >= INK_POOL) {
      // Thin: keep every other point, always keep the newest so the pen tip stays put.
      let k = 0;
      for (let i = 0; i < m; i += 2) {
        v[k * 3] = v[i * 3];
        v[k * 3 + 1] = v[i * 3 + 1];
        v[k * 3 + 2] = v[i * 3 + 2];
        k++;
      }
      if ((m - 1) % 2 !== 0) {
        v[k * 3] = v[(m - 1) * 3];
        v[k * 3 + 1] = v[(m - 1) * 3 + 1];
        v[k * 3 + 2] = v[(m - 1) * 3 + 2];
        k++;
      }
      v.length = k * 3;
      m = k;
    }
    count.value = m;
    return v;
  });
}

/**
 * A mark that already happened. Same geometry as the live trail, drawn once
 * from a stored, card-normalised [x, y, w, ...] array (see `Task.ink`).
 */
export const StaticInk = memo(function StaticInk({
  ink,
  width,
  height,
  color,
  square,
  opacity = 1,
}: {
  ink: number[];
  width: number;
  height: number;
  color: string;
  square: boolean;
  opacity?: number;
}) {
  const segs = useMemo(() => {
    const n = Math.floor(ink.length / 3);
    const out: ViewStyle[] = [];
    for (let i = 0; i + 1 < n; i++) {
      const a = i * 3;
      const b = a + 3;
      const x0 = ink[a] * width;
      const y0 = ink[a + 1] * height;
      const x1 = ink[b] * width;
      const y1 = ink[b + 1] * height;
      const w = (ink[a + 2] + ink[b + 2]) / 2;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.sqrt(dx * dx + dy * dy);
      const total = len + (square ? w * 0.6 : w);
      out.push({
        transform: [
          { translateX: (x0 + x1) / 2 - SEG_W / 2 },
          { translateY: (y0 + y1) / 2 - SEG_H / 2 },
          { rotate: `${Math.atan2(dy, dx)}rad` },
          { scaleX: total / SEG_W },
          { scaleY: w / SEG_H },
        ],
      });
    }
    return out;
  }, [ink, width, height, square]);
  if (width <= 0 || height <= 0) return null;
  return (
    <Animated.View style={[styles.layer, { opacity }]} pointerEvents="none">
      {segs.map((s, i) => (
        <Animated.View key={i} style={[styles.seg, square && styles.segSquare, { backgroundColor: color }, s]} />
      ))}
    </Animated.View>
  );
});

/** A plain hand-ish line across a card, for struck stops that have no saved mark. */
export function straightInk(penWidth: number, fromX = 0.12, toX = 0.94): number[] {
  const steps = 24;
  const out: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push(fromX + (toX - fromX) * t, 0.5 + Math.sin(t * Math.PI * 2.3) * 0.04 + t * 0.05, penWidth);
  }
  return out;
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  seg: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SEG_W,
    height: SEG_H,
    borderRadius: SEG_H / 2,
    backgroundColor: '#000',
  },
  segSquare: {
    borderRadius: 0,
  },
});
