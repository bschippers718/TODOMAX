import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSettings } from './useSettings';
import { usePacks } from './usePacks';
import { useCelebration } from './useCelebration';
import { useSound } from './useSound';
import { useCollection } from './useCollection';
import { useReduceMotion } from './useReduceMotion';
import { useToast } from '../components/ui/Toast';
import { ANIMATION_DURATIONS } from '../components/animations';
import { useTheme } from '../lib/theme';
import { CELEBRATION_COOLDOWN_MS, isQuietHour, Settings, TaskSize } from '../lib/types';
import { ANIMATION_META, getAnimationName } from '../lib/collection';
import { getPackForAnimation, packAccent, PackId } from '../lib/packs';
import { completeTask, useTasks } from './useTasks';

// Matches CelebrationOverlay's cap for the minimal variant.
export const MINIMAL_VISUAL_MS = 1100;

// One cooldown for the whole app: striking on the Map and then on the list is
// still rapid fire.
let cooldownUntil = 0;

/**
 * Celebrations in rotation: owned packs, narrowed to the ones the user chose
 * to play from. Never empty — if the filter would leave nothing, fall back to
 * everything owned.
 */
export function useCelebrationPool() {
  const { unlockedAnimations } = usePacks();
  const { settings } = useSettings();
  return useMemo(() => {
    const enabled = settings.enabledPacks;
    if (!enabled) return unlockedAnimations;
    const set = new Set(enabled as PackId[]);
    const scoped = unlockedAnimations.filter((id) => {
      const p = getPackForAnimation(id);
      return p ? set.has(p.id) : false;
    });
    return scoped.length > 0 ? scoped : unlockedAnimations;
  }, [unlockedAnimations, settings.enabledPacks]);
}

/**
 * Everything that happens after the pen lands, shared by the list and the Map:
 * commit the task, pick a celebration, decide how big to play it, record it in
 * the Collection, and say so if it's new.
 */
export function useStrikeFlow() {
  const router = useRouter();
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const { settings: rawSettings } = useSettings();
  const { tasks } = useTasks();
  const pool = useCelebrationPool();

  // Reduce Motion caps celebrations at "minimal" regardless of the user's pick.
  const settings: Settings = useMemo(
    () =>
      reduceMotion && rawSettings.animationMode === 'full'
        ? { ...rawSettings, animationMode: 'minimal' }
        : rawSettings,
    [rawSettings, reduceMotion],
  );

  // Rapid-fire and late-night protection: the celebration still counts (it's
  // recorded in the Collection) but plays as a glimpse instead of a movie.
  const [damped, setDamped] = useState(false);
  const celebrationSettings: Settings = useMemo(
    () => (damped && settings.animationMode === 'full' ? { ...settings, animationMode: 'minimal' } : settings),
    [damped, settings],
  );

  const { celebration, triggerCelebration, dismissCelebration } = useCelebration(settings, pool);
  const { playComplete, playCelebration } = useSound(settings);
  const { recordEarned, hasNew, stats } = useCollection(pool);
  const { show: showToast, toast } = useToast();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // The pen lands: sound now, while the card is still on screen.
  const onStrike = useCallback(() => {
    playComplete();
  }, [playComplete]);

  // The card is gone: commit and roll the celebration.
  const onComplete = useCallback(
    (id: string, size: TaskSize = 'm') => {
      completeTask(id);

      const now = Date.now();
      // Size decides the weight of the moment. A big stop always gets the
      // movie (quiet hours still win); a small one is always a glimpse.
      const inCooldown = now < cooldownUntil;
      const quiet = isQuietHour(settings) || size === 's' || (inCooldown && size !== 'l');
      setDamped(quiet);

      // Today's tally including this one; Streak Combo shows it as the combo count.
      const dayStart = new Date(now).setHours(0, 0, 0, 0);
      const struckToday = tasks.filter((t) => t.completed && (t.completedAt ?? 0) >= dayStart && t.id !== id).length + 1;
      const animId = triggerCelebration(struckToday);
      if (!animId) return;
      playCelebration(animId);

      const fullMs = ANIMATION_DURATIONS[animId];
      const visualMs = quiet || settings.animationMode === 'minimal' ? Math.min(fullMs, MINIMAL_VISUAL_MS) : fullMs;
      cooldownUntil = now + visualMs + CELEBRATION_COOLDOWN_MS;

      // Add it to the board. First time? Say so once the movie has finished.
      const isFirst = recordEarned(animId);
      if (isFirst) {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => {
          const p = getPackForAnimation(animId);
          showToast({
            title: 'New in your Collection',
            subtitle: getAnimationName(animId),
            icon: ANIMATION_META[animId].symbol,
            tint: p ? packAccent(p, theme.isSignal) : undefined,
            onPress: () => router.push('/collection'),
          });
        }, visualMs + 450);
      }
    },
    [triggerCelebration, tasks, playCelebration, recordEarned, showToast, theme.isSignal, settings, router],
  );

  return {
    settings,
    reduceMotion,
    celebration,
    celebrationSettings,
    dismissCelebration,
    toast,
    hasNew,
    stats,
    onStrike,
    onComplete,
    showToast,
  };
}
