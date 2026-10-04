import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Re-renders the caller when the calendar day changes: at local midnight
 * while the app is open, or when it comes back to the foreground on a new
 * day. Anything derived from "today" (the date line, the route, the streak)
 * should depend on the returned key.
 */
export function useDayTick(): string {
  const [day, setDay] = useState(dayKey);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const arm = () => {
      if (timer) clearTimeout(timer);
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      timer = setTimeout(() => {
        setDay(dayKey());
        arm();
      }, midnight.getTime() - now.getTime());
    };
    arm();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        setDay(dayKey());
        arm();
      }
    });
    return () => {
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return day;
}
