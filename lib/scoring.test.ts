/**
 * Run: npx tsx lib/scoring.test.ts
 */
import {
  SIZE_POINTS,
  applyAward,
  applyRevoke,
  dayKey,
  scoreStrike,
  weekKey,
  EMPTY_SCORE,
  CARRIED_BONUS,
  CLEAR_BONUS,
  COMBO_STEP,
} from './scoring';

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failed++;
    console.error('FAIL', msg);
  } else {
    console.log('ok ', msg);
  }
}

const noon = new Date('2026-10-13T16:00:00Z').getTime(); // afternoon UTC; local may vary
// Use a fixed local noon constructed from local parts so dayKey is stable in CI.
const localNoon = (() => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.getTime();
})();
const todayStart = (() => {
  const d = new Date(localNoon);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
})();

{
  const a = scoreStrike({ size: 's', createdAt: localNoon }, { priorToday: 0, remainingAfter: 3, now: localNoon });
  assert(a.total === SIZE_POINTS.s, `small = ${SIZE_POINTS.s} (got ${a.total})`);
}

{
  const a = scoreStrike({ size: 'xl', createdAt: localNoon }, { priorToday: 0, remainingAfter: 3, now: localNoon });
  assert(a.total === SIZE_POINTS.xl, `massive = ${SIZE_POINTS.xl}`);
}

{
  const a = scoreStrike(
    { size: 'm', createdAt: todayStart - 1000 },
    { priorToday: 2, remainingAfter: 0, now: localNoon },
  );
  const expected = SIZE_POINTS.m + CARRIED_BONUS + 2 * COMBO_STEP + CLEAR_BONUS;
  assert(a.total === expected, `medium + carried + combo2 + clear = ${expected} (got ${a.total})`);
  assert(a.carried === CARRIED_BONUS && a.clear === CLEAR_BONUS && a.combo === 10, 'breakdown matches');
}

{
  const a = scoreStrike({ size: 'm', createdAt: localNoon }, { priorToday: 20, remainingAfter: 1, now: localNoon });
  assert(a.combo === 40, 'combo caps at 40');
}

{
  let s = applyAward(EMPTY_SCORE, 25, localNoon);
  assert(s.dayScore === 25 && s.weekScore === 25 && s.dayHigh === 25, 'first award sets day/week/high');
  s = applyAward(s, 100, localNoon);
  assert(s.dayScore === 125 && s.dayHigh === 125, 'high tracks live');
}

{
  const dk = dayKey(localNoon);
  const wk = weekKey(localNoon);
  let s = applyAward({ ...EMPTY_SCORE, dayKey: dk, weekKey: wk }, 80, localNoon);
  // Revoke same day
  s = applyRevoke(s, 25, localNoon, localNoon);
  assert(s.dayScore === 55 && s.weekScore === 55, `revoke same day (got day ${s.dayScore})`);
  // Revoke from a prior day does not touch today's bucket
  const yesterday = localNoon - 86_400_000;
  s = applyRevoke(s, 10, yesterday, localNoon);
  assert(s.dayScore === 55, 'revoke other day leaves today');
}

{
  // Week key is Monday of the containing week
  const wed = new Date();
  wed.setHours(12, 0, 0, 0);
  // find a Wednesday
  while (wed.getDay() !== 3) wed.setDate(wed.getDate() + 1);
  const mon = new Date(wed);
  mon.setDate(wed.getDate() - 2);
  assert(weekKey(wed.getTime()) === dayKey(mon.getTime()), 'week key is Monday');
}

void noon; // keep import-ish quiet if unused after localNoon preference

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('\nall passed');
