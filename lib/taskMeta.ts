/** Local midnight for a timestamp, so a due date is a day, not an instant. */
export function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function addDays(ms: number, days: number): number {
  const d = new Date(startOfLocalDay(ms));
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function isOverdue(due: number, now = Date.now()): boolean {
  return startOfLocalDay(due) < startOfLocalDay(now);
}

/** Quiet line under a stop: "Due today", "Due Oct 20". */
export function dueLabel(due: number, now = Date.now()): string {
  const day = startOfLocalDay(due);
  const today = startOfLocalDay(now);
  const diff = Math.round((day - today) / 86_400_000);
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff === -1) return 'Due yesterday';
  const d = new Date(day);
  const formatted = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric',
  });
  return `Due ${formatted}`;
}

/** http(s) only. A bare host gets https://. Anything else is not a link. */
export function hrefFor(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const withProto = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!u.hostname.includes('.')) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Host, for the one line the card has room for. */
export function linkLabel(url: string): string {
  const href = hrefFor(url);
  if (!href) return 'Link';
  try {
    return new URL(href).host.replace(/^www\./, '');
  } catch {
    return 'Link';
  }
}
