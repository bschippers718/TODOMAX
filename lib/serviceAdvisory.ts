import { Task, openUpstream } from './types';
import { isOverdue } from './taskMeta';

export type ServiceAdvisory = {
  delayed: number;
  waiting: number;
  /** Short line for the strip under Daily Route. Null when nothing to report. */
  line: string | null;
};

function shortLabel(text: string, max = 28): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(1, max - 1))}…`;
}

/**
 * One-line "service advisory" for open stops that are overdue or still waiting
 * on an upstream stop. No task text for delayed-only; waiting names the stop
 * most people are stuck behind when there's a clear culprit.
 */
export function buildServiceAdvisory(tasks: Task[], now = Date.now()): ServiceAdvisory {
  let delayed = 0;
  const waitingOn = new Map<string, { count: number; text: string }>();

  for (const t of tasks) {
    if (t.completed) continue;
    if (t.due != null && isOverdue(t.due, now)) delayed++;
    const ups = openUpstream(t, tasks);
    if (!ups.length) continue;
    // Count against the first open upstream — that's the platform you're held at.
    const head = ups[0];
    const cur = waitingOn.get(head.id);
    if (cur) cur.count += 1;
    else waitingOn.set(head.id, { count: 1, text: head.text });
  }

  let waiting = 0;
  let top: { count: number; text: string } | null = null;
  for (const v of waitingOn.values()) {
    waiting += v.count;
    if (!top || v.count > top.count) top = v;
  }

  if (delayed === 0 && waiting === 0) return { delayed: 0, waiting: 0, line: null };

  const parts: string[] = [];
  if (delayed > 0) parts.push(`${delayed} delayed`);
  if (waiting > 0) {
    // Name the hold only when there's a clear culprit (alone, or strict majority).
    if (top && (waitingOn.size === 1 || top.count > waiting - top.count)) {
      parts.push(`${waiting} waiting on ${shortLabel(top.text)}`);
    } else {
      parts.push(`${waiting} waiting`);
    }
  }

  return { delayed, waiting, line: parts.join(' · ') };
}
