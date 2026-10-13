/**
 * Tiny assert harness — run with: npx tsx lib/serviceAdvisory.test.ts
 * (or node after tsc). Kept next to the module so the advisory copy stays honest.
 */
import { buildServiceAdvisory } from './serviceAdvisory';
import { Task } from './types';

function task(partial: Partial<Task> & Pick<Task, 'id' | 'text'>): Task {
  return {
    completed: false,
    createdAt: Date.now(),
    ...partial,
  };
}

const today = new Date();
today.setHours(12, 0, 0, 0);
const now = today.getTime();
const yesterday = now - 86_400_000;

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failed++;
    console.error('FAIL', msg);
  } else {
    console.log('ok ', msg);
  }
}

{
  const a = buildServiceAdvisory([], now);
  assert(a.line === null, 'empty board → no advisory');
}

{
  const tasks = [
    task({ id: 'a', text: 'Finish the pitch deck for Thursday', due: yesterday }),
    task({ id: 'b', text: 'Call the dentist', due: yesterday }),
    task({ id: 'c', text: 'Water the fig', due: now }),
  ];
  const a = buildServiceAdvisory(tasks, now);
  assert(a.delayed === 2 && a.waiting === 0, 'two overdue → delayed 2');
  assert(a.line === '2 delayed', `line is "2 delayed" (got ${a.line})`);
}

{
  const tasks = [
    task({ id: 'a', text: 'Finish the pitch deck for Thursday' }),
    task({ id: 'b', text: 'Send Maya the outline', after: ['a'] }),
    task({ id: 'c', text: 'Book the room', after: ['a'] }),
  ];
  const a = buildServiceAdvisory(tasks, now);
  assert(a.waiting === 2 && a.delayed === 0, 'two waiting on one upstream');
  assert(a.line === '2 waiting on Finish the pitch deck for T…', `got ${a.line}`);
}

{
  const tasks = [
    task({ id: 'a', text: 'Finish the pitch deck for Thursday', due: yesterday }),
    task({ id: 'b', text: 'Send Maya the outline', after: ['a'], due: yesterday }),
  ];
  const a = buildServiceAdvisory(tasks, now);
  assert(a.delayed === 2 && a.waiting === 1, 'overdue + waiting both count');
  assert(a.line === '2 delayed · 1 waiting on Finish the pitch deck for T…', `got ${a.line}`);
}

{
  const tasks = [
    task({ id: 'a', text: 'Alpha' }),
    task({ id: 'b', text: 'Bravo' }),
    task({ id: 'c', text: 'Depends A', after: ['a'] }),
    task({ id: 'd', text: 'Depends B', after: ['b'] }),
  ];
  const a = buildServiceAdvisory(tasks, now);
  assert(a.waiting === 2, 'two waiting on different upstreams');
  assert(a.line === '2 waiting', `no single culprit → "2 waiting" (got ${a.line})`);
}

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nall passed');
