import { Task, LineId, TaskSize } from './types';

/**
 * A realistic day, for look-and-feel: twelve open stops across every size and
 * line, a few links, hand-laid Map positions, and three already struck today
 * so the Daily Route has colour. Loaded from Settings → Developer.
 */
type Seed = {
  text: string;
  size?: TaskSize;
  line?: LineId;
  pos: { x: number; y: number };
  after?: number[];
  /** Hours ago it was added (older than today's start = "carried"). */
  ageH?: number;
  /** Struck this many minutes ago (today). */
  doneMinAgo?: number;
};

const SEEDS: Seed[] = [
  { text: 'Finish the pitch deck for Thursday', size: 'l', line: 'blue', pos: { x: 20, y: 20 } },
  { text: 'Return library books', size: 's', line: 'grey', pos: { x: 300, y: 24 }, ageH: 30 },
  { text: 'Call the dentist about the crown', line: 'red', pos: { x: 40, y: 150 }, ageH: 50 },
  { text: 'Book the room for Friday review', line: 'blue', pos: { x: 262, y: 150 }, after: [0] },
  { text: 'Pick up dry cleaning on 7th Ave', size: 's', line: 'orange', pos: { x: 470, y: 40 } },
  { text: 'Draft the Q4 budget memo', size: 'l', line: 'purple', pos: { x: 30, y: 290 }, ageH: 28 },
  { text: 'Send Maya the outline', line: 'blue', pos: { x: 300, y: 300 }, after: [5] },
  { text: 'Water the fig', size: 's', line: 'green', pos: { x: 470, y: 170 } },
  { text: 'Renew passport before the trip', line: 'yellow', pos: { x: 20, y: 430 } },
  { text: 'Fix the squeaky hinge', size: 's', pos: { x: 240, y: 440 } },
  { text: "Plan Dad's birthday dinner", line: 'orange', pos: { x: 410, y: 420 } },
  { text: 'Write the Signal style guide intro', size: 'l', line: 'red', pos: { x: 200, y: 560 }, after: [5, 6] },
  // Struck today
  { text: 'Buy coffee filters', size: 's', line: 'green', pos: { x: 0, y: 0 }, doneMinAgo: 190 },
  { text: 'Reply to the landlord', line: 'grey', pos: { x: 0, y: 0 }, doneMinAgo: 120 },
  { text: 'Submit expense report', size: 'l', line: 'blue', pos: { x: 0, y: 0 }, doneMinAgo: 35 },
];

export function buildSampleTasks(now = Date.now()): Task[] {
  const ids = SEEDS.map((_, i) => `sample-${i + 1}`);
  return SEEDS.map((s, i) => {
    const done = s.doneMinAgo !== undefined;
    const createdAt = done ? now - s.doneMinAgo! * 60_000 - 3 * 3_600_000 : now - (s.ageH ?? i * 0.4) * 3_600_000;
    const t: Task = {
      id: ids[i],
      text: s.text,
      completed: done,
      createdAt,
      size: s.size,
      line: s.line,
      pos: done ? undefined : s.pos,
      after: s.after?.map((n) => ids[n]),
    };
    if (done) t.completedAt = now - s.doneMinAgo! * 60_000;
    return t;
  });
}
