import { useMemo } from 'react';
import { SharedValue, useSharedValue } from 'react-native-reanimated';

/**
 * Hold a card and it lifts; move it and the list makes room. The rows share
 * this state so each one can work out, on the UI thread, where to stand.
 *
 * Rows are stacked with no gaps other than their own vertical margins, so a
 * list of heights is enough to know where every slot is.
 */
export const ROW_GAP = 8; // CARD_MARGIN * 2 in TaskItem
/** Sideways travel that reads as "tuck it under the one above" (or pull it out). */
export const TUCK_DX = 44;
/** How far a tucked stop steps in from the left edge. */
export const INDENT = 22;

export interface DragState {
  /** Id of the lifted card, or '' when nothing is held. */
  id: SharedValue<string>;
  /** Slot the card came from and the slot it is hovering over. */
  from: SharedValue<number>;
  to: SharedValue<number>;
  /** Finger travel since the lift. */
  dy: SharedValue<number>;
  dx: SharedValue<number>;
  /** Row heights by index (margins excluded). */
  heights: SharedValue<number[]>;
  /**
   * Where the lifted card sat on screen (page coordinates). A copy of the
   * card is drawn there, above the list, and follows the finger: lifting the
   * real row above its neighbours would reorder native views mid-touch, and
   * UIKit cancels the touch when that happens.
   */
  ghostX: SharedValue<number>;
  ghostY: SharedValue<number>;
  ghostW: SharedValue<number>;
}

export function useDragState(): DragState {
  const id = useSharedValue('');
  const from = useSharedValue(0);
  const to = useSharedValue(0);
  const dy = useSharedValue(0);
  const dx = useSharedValue(0);
  const heights = useSharedValue<number[]>([]);
  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const ghostW = useSharedValue(0);
  return useMemo(
    () => ({ id, from, to, dy, dx, heights, ghostX, ghostY, ghostW }),
    [id, from, to, dy, dx, heights, ghostX, ghostY, ghostW],
  );
}

/** Sideways travel of the lifted card: a hint, then a snap once tuck takes. */
export function ghostDx(dx: number): number {
  'worklet';
  if (dx > TUCK_DX) return INDENT;
  if (dx < -TUCK_DX) return -Math.round(INDENT * 0.45);
  return Math.max(-TUCK_DX * 0.6, Math.min(TUCK_DX * 0.75, dx * 0.7));
}

/** Which slot the lifted card's centre is over after travelling `dy`. */
export function slotFor(heights: number[], from: number, dy: number, count: number): number {
  'worklet';
  let idx = from;
  let acc = 0;
  if (dy > 0) {
    while (idx + 1 < count) {
      const h = (heights[idx + 1] ?? 56) + ROW_GAP;
      if (dy - acc > h / 2) {
        acc += h;
        idx++;
      } else break;
    }
  } else {
    while (idx > 0) {
      const h = (heights[idx - 1] ?? 56) + ROW_GAP;
      if (-dy - acc > h / 2) {
        acc += h;
        idx--;
      } else break;
    }
  }
  return idx;
}

/** Distance the lifted card should settle at so it sits in slot `to`. */
export function settleOffset(heights: number[], from: number, to: number): number {
  'worklet';
  let d = 0;
  if (to > from) for (let i = from + 1; i <= to; i++) d += (heights[i] ?? 56) + ROW_GAP;
  else for (let i = to; i < from; i++) d -= (heights[i] ?? 56) + ROW_GAP;
  return d;
}
