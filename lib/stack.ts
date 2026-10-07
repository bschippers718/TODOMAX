import { Task } from './types';

export type ListDropIntent = 'move' | 'tuck' | 'untuck';

export type ListDropResult =
  | { kind: 'moved' }
  | { kind: 'untucked' }
  | { kind: 'nothing-above' }
  | { kind: 'kept' }
  | { kind: 'tucked'; parent: string }
  | { kind: 'refused'; parent: string };

/** Walk `after` upstream. True when `target` is already something `startId` waits on. */
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
 * The original at the top of the stack `index` belongs to. A supporter whose
 * parent sits directly above — with only other supporters of that same stop
 * in between — walks up to that original. A top-level stop is its own original.
 */
export function stackOriginal(list: Task[], index: number): Task {
  let i = index;
  const seen = new Set<string>();
  while (i >= 0 && !seen.has(list[i].id)) {
    seen.add(list[i].id);
    const ups = list[i].after ?? [];
    let parentIdx = -1;
    for (let p = i - 1; p >= 0; p--) {
      if (!ups.includes(list[p].id)) continue;
      let contiguous = true;
      for (let j = p + 1; j <= i; j++) {
        if (!(list[j].after ?? []).includes(list[p].id)) {
          contiguous = false;
          break;
        }
      }
      if (contiguous) {
        parentIdx = p;
        break;
      }
    }
    if (parentIdx < 0) break;
    i = parentIdx;
  }
  return list[i];
}

/** Still sitting in the contiguous run under one of the stops it waits on. */
function stillSupporting(list: Task[], index: number): boolean {
  const ups = list[index].after ?? [];
  if (!ups.length) return false;
  for (let i = index - 1; i >= 0; i--) {
    if (!ups.includes(list[i].id)) continue;
    const pid = list[i].id;
    let contiguous = true;
    for (let j = i + 1; j < index; j++) {
      if (!(list[j].after ?? []).includes(pid)) {
        contiguous = false;
        break;
      }
    }
    if (contiguous) return true;
  }
  return false;
}

/**
 * Everyone tucked under `parentId`, in one flat group. A stop that was tucked
 * under a supporter (a chain) is pulled up so it supports the original too.
 * Links to stops outside the group are kept.
 */
function flattenSupporters(open: Task[], parentId: string): Task[] {
  const start = open.findIndex((t) => t.id === parentId);
  if (start < 0) return open;
  const member = new Set<string>([parentId]);
  for (let i = start + 1; i < open.length; i++) {
    const ups = open[i].after ?? [];
    if (ups.some((a) => member.has(a))) member.add(open[i].id);
    else break;
  }
  return open.map((t) => {
    if (t.id === parentId || !member.has(t.id)) return t;
    const outside = (t.after ?? []).filter((a) => !member.has(a));
    const after = [parentId, ...outside.filter((a) => a !== parentId)];
    if (after.length === (t.after?.length ?? 0) && after.every((a, n) => t.after?.[n] === a)) return t;
    return { ...t, after };
  });
}

function writeOpen(tasks: Task[], open: Task[]): Task[] {
  let k = 0;
  return tasks.map((t) => (t.completed ? t : open[k++]));
}

/**
 * Drop an open stop at `to` among the open stops.
 * Tuck joins the original at the top of that stack, so several supporters
 * can hang off one stop. A plain move only forgets the link once the stop
 * leaves that group.
 */
export function applyListDrop(tasks: Task[], id: string, to: number, intent: ListDropIntent): { tasks: Task[]; result: ListDropResult } {
  const open = tasks.filter((t) => !t.completed);
  const from = open.findIndex((t) => t.id === id);
  if (from < 0) return { tasks, result: { kind: 'moved' } };
  const target = Math.max(0, Math.min(to, open.length - 1));
  const next = [...open];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  const at = next.findIndex((t) => t.id === id);

  if (intent === 'untuck') {
    const cleared = next.map((t) => (t.id === id && t.after?.length ? { ...t, after: undefined } : t));
    return { tasks: writeOpen(tasks, cleared), result: { kind: 'untucked' } };
  }

  if (intent === 'tuck') {
    if (at === 0) return { tasks: writeOpen(tasks, next), result: { kind: 'nothing-above' } };
    const original = stackOriginal(next, at - 1);
    if (original.id === id) return { tasks: writeOpen(tasks, next), result: { kind: 'nothing-above' } };
    if (reaches(next, original.id, id)) {
      return { tasks: writeOpen(tasks, next), result: { kind: 'refused', parent: original.text } };
    }
    const pointed = next.map((t) => {
      if (t.id === id) return { ...t, after: [original.id, ...(t.after ?? []).filter((a) => a !== original.id)] };
      if (t.id === original.id && t.after?.includes(id)) {
        const after = t.after.filter((a) => a !== id);
        return { ...t, after: after.length ? after : undefined };
      }
      return t;
    });
    const flat = flattenSupporters(pointed, original.id);
    const before = moved.after ?? [];
    const after = flat.find((t) => t.id === id)?.after ?? [];
    // `kept` only when this drop didn't retarget anyone. Flattening a chain
    // (a supporter of a supporter) still counts as a tuck.
    const flattened = flat.some((t, n) => t !== pointed[n]);
    const same = !flattened && before.length === after.length && before.every((a, n) => a === after[n]);
    return {
      tasks: writeOpen(tasks, flat),
      result: same ? { kind: 'kept' } : { kind: 'tucked', parent: original.text },
    };
  }

  if (moved.after?.length && !stillSupporting(next, at)) {
    const cleared = next.map((t) => (t.id === id ? { ...t, after: undefined } : t));
    return { tasks: writeOpen(tasks, cleared), result: { kind: 'moved' } };
  }
  if (from === target) return { tasks, result: { kind: 'moved' } };
  return { tasks: writeOpen(tasks, next), result: { kind: 'moved' } };
}
