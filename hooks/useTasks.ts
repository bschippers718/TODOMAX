import { useState, useEffect, useCallback, useRef } from 'react';
import { Task, generateId } from '../lib/types';
import { loadJSON, saveJSON, KEYS } from '../lib/storage';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [streak, setStreak] = useState(0);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  useEffect(() => {
    (async () => {
      const saved = await loadJSON<Task[]>(KEYS.TASKS);
      if (saved) setTasks(saved);
      const savedStreak = await loadJSON<number>(KEYS.STREAK);
      if (savedStreak !== null) setStreak(savedStreak);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded) {
      saveJSON(KEYS.TASKS, tasks);
    }
  }, [tasks, loaded]);

  useEffect(() => {
    if (loaded) {
      saveJSON(KEYS.STREAK, streak);
    }
  }, [streak, loaded]);

  const addTask = useCallback((text: string, difficulty: 'normal' | 'hard' = 'normal') => {
    const task: Task = {
      id: generateId(),
      text: text.trim(),
      completed: false,
      createdAt: Date.now(),
      difficulty,
    };
    setTasks(prev => [task, ...prev]);
  }, []);

  const completeTask = useCallback((id: string) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === id ? { ...t, completed: true, completedAt: Date.now() } : t
      )
    );
    setStreak(prev => prev + 1);
  }, []);

  const uncompleteTask = useCallback((id: string) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === id ? { ...t, completed: false, completedAt: undefined } : t
      )
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const editTask = useCallback((id: string, text: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, text: text.trim() } : t))
    );
  }, []);

  const clearCompleted = useCallback(() => {
    setTasks(prev => prev.filter(t => !t.completed));
  }, []);

  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return {
    tasks,
    activeTasks,
    completedTasks,
    streak,
    loaded,
    addTask,
    completeTask,
    uncompleteTask,
    deleteTask,
    editTask,
    clearCompleted,
  };
}
