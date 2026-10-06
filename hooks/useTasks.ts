import { useState, useEffect, useMemo } from 'react';
import { Task, TaskSize, LineId, generateId } from '../lib/types';
import { loadJSON, saveJSON, KEYS } from '../lib/storage';

/**
 * One task list for the whole app. The list screen and the Map are two views
 * of the same stops, so the state lives at module level (like useSettings)
 * and every subscriber sees the same array.
 */
/**
 * A streak is days, not strikes: consecutive calendar days with at least one
 * stop struck. `lastDay` is the local YYYY-MM-DD of the most recent strike.
 */
type Streak = { count: number; lastDay: string | null };
type State = { tasks: Task[]; streak: Streak; loaded: boolean };
type Listener = (s: State) => void;

const NO_STREAK: Streak = { count: 0, lastDay: null };
let state: State = { tasks: [], streak: NO_STREAK, loaded: false };
const listeners = new Set<Listener>();
let loadPromise: Promise<void> | null = null;

function emit() {
  listeners.forEach((l) => l(state));
}

function setTasks(update: (prev: Task[]) => Task[]) {
  state = { ...state, tasks: update(state.tasks) };
  emit();
  if (state.loaded) saveJSON(KEYS.TASKS, state.tasks);
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The streak as it stands right now: alive if the last strike was today or yesterday. */
export function currentStreak(streak: Streak, now = Date.now()): number {
  if (!streak.lastDay) return 0;
  const today = dayKey(now);
  const yesterday = dayKey(now - 86_400_000);
  return streak.lastDay === today || streak.lastDay === yesterday ? streak.count : 0;
}

function advanceStreak(prev: Streak, now = Date.now()): Streak {
  const today = dayKey(now);
  if (prev.lastDay === today) return prev;
  const yesterday = dayKey(now - 86_400_000);
  return { count: prev.lastDay === yesterday ? prev.count + 1 : 1, lastDay: today };
}

function setStreak(update: (prev: Streak) => Streak) {
  state = { ...state, streak: update(state.streak) };
  emit();
  if (state.loaded) saveJSON(KEYS.STREAK, state.streak);
}

function loadOnce() {
  if (!loadPromise) {
    loadPromise = (async () => {
      const [saved, savedStreak] = await Promise.all([loadJSON<Task[]>(KEYS.TASKS), loadJSON<Streak | number>(KEYS.STREAK)]);
      // Older builds stored a plain strike count under this key. It was never a
      // day streak, so it starts over rather than pretending.
      const streak = savedStreak && typeof savedStreak === 'object' && typeof savedStreak.count === 'number' ? savedStreak : NO_STREAK;
      state = { tasks: Array.isArray(saved) ? saved : [], streak, loaded: true };
      emit();
    })();
  }
  return loadPromise;
}

// ---- Operations -----------------------------------------------------------

export function addTask(text: string, difficulty: 'normal' | 'hard' = 'normal') {
  const task: Task = { id: generateId(), text: text.trim(), completed: false, createdAt: Date.now(), difficulty };
  setTasks((prev) => [task, ...prev]);
  return task;
}

export function completeTask(id: string, ink?: number[]) {
  const now = Date.now();
  setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: true, completedAt: now, ink: ink?.length ? ink : undefined } : t)));
  setStreak((s) => advanceStreak(s, now));
}

export function uncompleteTask(id: string) {
  setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: false, completedAt: undefined, ink: undefined } : t)));
}

export function deleteTask(id: string) {
  setTasks((prev) =>
    prev
      .filter((t) => t.id !== id)
      .map((t) => (t.after?.includes(id) ? { ...t, after: t.after.filter((a) => a !== id) } : t)),
  );
}

/** Put a deleted stop back where it was (Undo). Links it had are gone; its own `after` is kept. */
export function restoreTask(task: Task, index: number) {
  setTasks((prev) => {
    if (prev.some((t) => t.id === task.id)) return prev;
    const ids = new Set(prev.map((t) => t.id));
    const restored: Task = { ...task, after: task.after?.filter((a) => ids.has(a)) };
    const next = [...prev];
    next.splice(Math.max(0, Math.min(index, next.length)), 0, restored);
    return next;
  });
}

export function editTask(id: string, text: string) {
  setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, text: text.trim() } : t)));
}

export function setTaskSize(id: string, size: TaskSize) {
  setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, size } : t)));
}

export function setTaskLine(id: string, line: LineId | undefined) {
  setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, line } : t)));
}

/**
 * Move an open stop to position `to` among the open stops. The array is the
 * order, so this is the whole persistence story; struck stops keep their slots.
 */
export function reorderTask(id: string, to: number) {
  setTasks((prev) => {
    const open = prev.filter((t) => !t.completed);
    const from = open.findIndex((t) => t.id === id);
    if (from < 0) return prev;
    const target = Math.max(0, Math.min(to, open.length - 1));
    if (from === target) return prev;
    const next = [...open];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    let k = 0;
    return prev.map((t) => (t.completed ? t : next[k++]));
  });
}

/** `id` now comes after `upstreamId` (list drag: tucked under the stop above). */
export function linkAfter(id: string, upstreamId: string): 'linked' | 'refused' | 'kept' {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return 'refused';
  if (t.after?.includes(upstreamId)) return 'kept';
  const r = toggleLink(upstreamId, id);
  return r === 'linked' ? 'linked' : 'refused';
}

/** Pull a stop out from under everything it waited on. */
export function clearAfter(id: string) {
  setTasks((prev) => prev.map((t) => (t.id === id && t.after?.length ? { ...t, after: undefined } : t)));
}

export function moveTask(id: string, pos: { x: number; y: number }) {
  setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, pos } : t)));
}

/** Assign canvas positions to several tasks at once (first visit to the Map). */
export function placeTasks(positions: Record<string, { x: number; y: number }>) {
  setTasks((prev) => prev.map((t) => (positions[t.id] && !t.pos ? { ...t, pos: positions[t.id] } : t)));
}

/** True if `target` is reachable from `startId` by walking `after` upstream. */
function reaches(tasks: Task[], startId: string, target: string): boolean {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const stack = [startId];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === target) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const up of byId.get(id)?.after ?? []) stack.push(up);
  }
  return false;
}

/**
 * Toggle "`toId` comes after `fromId`". Linking the other way round first
 * removes the reverse edge, so two stops are never mutually blocked, and a
 * link that would close a longer loop (A→B→C→A) is refused.
 */
export function toggleLink(fromId: string, toId: string): 'linked' | 'unlinked' | 'refused' {
  if (fromId === toId) return 'refused';
  const prev = state.tasks;
  const to = prev.find((t) => t.id === toId);
  const fromTask = prev.find((t) => t.id === fromId);
  if (!to || !fromTask) return 'refused';
  const exists = to.after?.includes(fromId) ?? false;
  if (!exists) {
    // Adding fromId upstream of toId: refuse if toId is already upstream of
    // fromId through anything other than the direct reverse edge we strip.
    const indirect = (fromTask.after ?? []).filter((a) => a !== toId);
    if (indirect.some((a) => reaches(prev, a, toId))) return 'refused';
  }
  setTasks((cur) =>
    cur.map((t) => {
      if (t.id === toId) {
        const after = (t.after ?? []).filter((a) => a !== fromId);
        return { ...t, after: exists ? after : [...after, fromId] };
      }
      if (t.id === fromId && !exists && t.after?.includes(toId)) {
        return { ...t, after: t.after.filter((a) => a !== toId) };
      }
      return t;
    }),
  );
  return exists ? 'unlinked' : 'linked';
}

/** Replace everything (developer: sample data / reset). Streak is kept. */
export function replaceTasks(next: Task[]) {
  setTasks(() => next);
}

export function clearCompleted() {
  setTasks((prev) => {
    const gone = new Set(prev.filter((t) => t.completed).map((t) => t.id));
    return prev
      .filter((t) => !t.completed)
      .map((t) => (t.after?.some((a) => gone.has(a)) ? { ...t, after: t.after.filter((a) => !gone.has(a)) } : t));
  });
}

// ---- Hook -----------------------------------------------------------------

export function useTasks() {
  const [snapshot, setSnapshot] = useState<State>(state);

  useEffect(() => {
    const listener: Listener = (s) => setSnapshot(s);
    listeners.add(listener);
    listener(state);
    loadOnce();
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const activeTasks = useMemo(() => snapshot.tasks.filter((t) => !t.completed), [snapshot.tasks]);
  const completedTasks = useMemo(() => snapshot.tasks.filter((t) => t.completed), [snapshot.tasks]);

  // Stable references so memoised rows don't re-render on every store change.
  const ops = useMemo(
    () => ({
      addTask,
      completeTask,
      uncompleteTask,
      deleteTask,
      restoreTask,
      editTask,
      setTaskSize,
      setTaskLine,
      reorderTask,
      linkAfter,
      clearAfter,
      moveTask,
      placeTasks,
      toggleLink,
      clearCompleted,
      replaceTasks,
    }),
    [],
  );

  return {
    tasks: snapshot.tasks,
    activeTasks,
    completedTasks,
    streak: currentStreak(snapshot.streak),
    loaded: snapshot.loaded,
    ...ops,
  };
}
