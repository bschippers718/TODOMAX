import { Task, LineId, TaskSize } from './types';

/**
 * A realistic full day, for look-and-feel: twenty open stops across every size
 * and line, a handful of links, hand-laid Map positions, and four already
 * struck today so the Daily Route has colour. Loaded from Settings → Try it out.
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
  { text: 'Email the accountant about the K-1', line: 'grey', pos: { x: 20, y: 700 }, ageH: 26 },
  { text: 'Rough cut of the trailer by Sunday', size: 'xl', line: 'purple', pos: { x: 250, y: 700 } },
  { text: 'Order new running shoes', size: 's', line: 'green', pos: { x: 560, y: 690 } },
  { text: 'Prep questions for the Tuesday interview', line: 'blue', pos: { x: 30, y: 840 }, after: [0] },
  { text: 'Cancel the unused streaming sub', size: 's', line: 'grey', pos: { x: 270, y: 850 } },
  { text: 'Sketch the title card options', line: 'red', pos: { x: 440, y: 830 }, after: [11] },
  { text: 'Groceries for the week', size: 's', line: 'orange', pos: { x: 20, y: 970 } },
  { text: 'Call Mom back', size: 's', pos: { x: 210, y: 970 }, ageH: 40 },
  // Struck today
  { text: 'Take out the recycling', size: 's', line: 'orange', pos: { x: 0, y: 0 }, doneMinAgo: 260 },
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
