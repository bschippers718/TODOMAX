import { useState, useEffect, useMemo } from 'react';
import { Task, TaskSize, LineId, generateId } from '../lib/types';
import { loadJSON, saveJSON, KEYS } from '../lib/storage';

/**
 * One task list for the whole app. The list screen and the Map are two views
 * of the same stops, so the state lives at module level (like useSettings)
 * and every subscriber sees the same array.
 */
type State = { tasks: Task[]; streak: number; loaded: boolean };
type Listener = (s: State) => void;

let state: State = { tasks: [], streak: 0, loaded: false };
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

function setStreak(update: (prev: number) => number) {
  state = { ...state, streak: update(state.streak) };
  emit();
  if (state.loaded) saveJSON(KEYS.STREAK, state.streak);
}

function loadOnce() {
  if (!loadPromise) {
    loadPromise = (async () => {
      const [saved, savedStreak] = await Promise.all([loadJSON<Task[]>(KEYS.TASKS), loadJSON<number>(KEYS.STREAK)]);
      state = { tasks: saved ?? [], streak: savedStreak ?? 0, loaded: true };
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

export function completeTask(id: string) {
  setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: true, completedAt: Date.now() } : t)));
  setStreak((s) => s + 1);
}

export function uncompleteTask(id: string) {
  setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: false, completedAt: undefined } : t)));
}

export function deleteTask(id: string) {
  setTasks((prev) =>
    prev
      .filter((t) => t.id !== id)
      .map((t) => (t.after?.includes(id) ? { ...t, after: t.after.filter((a) => a !== id) } : t)),
  );
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

export function moveTask(id: string, pos: { x: number; y: number }) {
  setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, pos } : t)));
}

/** Assign canvas positions to several tasks at once (first visit to the Map). */
export function placeTasks(positions: Record<string, { x: number; y: number }>) {
  setTasks((prev) => prev.map((t) => (positions[t.id] && !t.pos ? { ...t, pos: positions[t.id] } : t)));
}

/**
 * Toggle "`toId` comes after `fromId`". Linking the other way round first
 * removes the reverse edge, so two stops are never mutually blocked.
 */
export function toggleLink(fromId: string, toId: string) {
  if (fromId === toId) return;
  setTasks((prev) => {
    const to = prev.find((t) => t.id === toId);
    const exists = to?.after?.includes(fromId) ?? false;
    return prev.map((t) => {
      if (t.id === toId) {
        const after = (t.after ?? []).filter((a) => a !== fromId);
        return { ...t, after: exists ? after : [...after, fromId] };
      }
      if (t.id === fromId && !exists && t.after?.includes(toId)) {
        return { ...t, after: t.after.filter((a) => a !== toId) };
      }
      return t;
    });
  });
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
      editTask,
      setTaskSize,
      setTaskLine,
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
    streak: snapshot.streak,
    loaded: snapshot.loaded,
    ...ops,
  };
}
