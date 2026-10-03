import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

let cached: boolean | null = null;

/**
 * Mirrors iOS Settings → Accessibility → Motion → Reduce Motion.
 * When on, celebrations drop to minimal mode and the strike-out skips
 * the shake / flash beats.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState<boolean>(cached ?? false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      cached = v;
      if (alive) setReduce(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      cached = v;
      setReduce(v);
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return reduce;
}
