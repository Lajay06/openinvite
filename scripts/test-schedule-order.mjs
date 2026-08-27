#!/usr/bin/env node
/**
 * THE SCHEDULE RUNS FORWARDS.
 *
 * Schedule.jsx and ScheduleHub.jsx sorted by start_time ONLY — `event_date` was
 * not a sort key at all, though the entity declares it and requires it. So a
 * 09:00 breakfast on 1 January sorted above a 17:00 dinner on 31 December, and
 * days appeared to descend while times ascended. Every couple with more than
 * one day of events saw it.
 *
 * Three cases:
 *   1. ORDER   — the comparator is chronological
 *   2. NO TZ   — dates are compared as strings, never through new Date()
 *   3. ONE RULE — no surface re-implements the comparison inline
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { compareDayThenTime, sortScheduleItems } from '../src/lib/scheduleOrder.js';

const ROOT = new URL('..', import.meta.url).pathname;
let failed = 0;
const fail = (c, m) => { console.error(`  FAIL [${c}] ${m}`); failed++; };
const pass = (c, m) => console.log(`  pass [${c}] ${m}`);

/* ── 1. ORDER ───────────────────────────────────────────────────────── */
const I = (d, t, n) => ({ event_date: d, start_time: t, name: n });
const items = [
  I('2027-01-01', '09:00', 'new year breakfast'),
  I('2026-12-31', '17:00', 'new year eve dinner'),
  I('2026-12-31', '09:00', 'nye breakfast'),
  I(null, '08:00', 'undated'),
  I('2027-01-01', '08:00', 'new year early'),
];
const got = sortScheduleItems(items).map(x => x.name);
const want = ['nye breakfast', 'new year eve dinner', 'new year early', 'new year breakfast', 'undated'];
if (JSON.stringify(got) === JSON.stringify(want)) pass('order', 'day first, then time, undated last');
else fail('order', `got ${JSON.stringify(got)}\n           want ${JSON.stringify(want)}`);

// THE REPORTED SYMPTOM, asserted directly.
const [first] = sortScheduleItems([I('2027-01-01', '09:00', 'a'), I('2026-12-31', '17:00', 'b')]);
if (first.event_date === '2026-12-31') pass('order', '31 December sorts above 1 January');
else fail('order', '1 January still sorts above 31 December — the reported defect');

if (sortScheduleItems([]).length === 0 && sortScheduleItems(null).length === 0) pass('order', 'empty and null do not throw');
else fail('order', 'empty input threw');

const src = [I('2027-01-01', '09:00', 'a'), I('2026-12-31', '17:00', 'b')];
sortScheduleItems(src);
if (src[0].name === 'a') pass('order', 'sorts a copy, never the caller’s array');
else fail('order', 'sorted in place — these arrays come from query caches');

/* ── 2. NO TIMEZONE ─────────────────────────────────────────────────── */
const before = process.env.TZ;
for (const tz of ['Pacific/Midway', 'America/New_York', 'UTC', 'Pacific/Auckland']) {
  process.env.TZ = tz;
  const r = compareDayThenTime('2026-12-31', '17:00', '2027-01-01', '09:00');
  if (r < 0) pass('no-tz', `${tz}: 31 Dec 2026 precedes 1 Jan 2027`);
  else fail('no-tz', `${tz}: comparison inverted across the year boundary`);
}
process.env.TZ = before;

// Code only. The file's own doc block explains why `new Date()` is wrong here,
// and a guard that cannot tell prose from code fails on the explanation.
const orderCode = readFileSync(join(ROOT, 'src/lib/scheduleOrder.js'), 'utf8')
  .split('\n')
  .filter(l => { const t = l.trimStart(); return !(t.startsWith('*') || t.startsWith('//') || t.startsWith('/*')); })
  .join('\n');
if (!/new Date\(/.test(orderCode)) pass('no-tz', 'the comparator never constructs a Date');
else fail('no-tz', 'scheduleOrder.js constructs a Date — a calendar date must not be given a timezone');

/* ── 3. ONE RULE ────────────────────────────────────────────────────── */
const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    if (e === 'node_modules' || e.startsWith('.')) continue;
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|jsx)$/.test(p)) files.push(p);
  }
})(join(ROOT, 'src'));

let inline = 0;
// Same line contains both `.sort(` and a schedule field — `[^)]*` was tried
// first and could not cross the `(a, b)` parameter list, so it never reached
// `start_time` and the guard passed a reintroduced defect. Verified by
// reintroducing it.
const INLINE = /(\.sort\(.*\b(start_time|event_date)\b)|9999-12-31/;
for (const f of files) {
  const r = relative(ROOT, f);
  if (r === 'src/lib/scheduleOrder.js') continue;
  // A NAMED ALLOWANCE, WITH ITS REASON — never a category-wide pass.
  // DayChart receives one day's items, already grouped by event_date by its
  // parent, so sorting by time alone is correct there. Verified at the call
  // site (WeddingDayTimelineBuilder.jsx: dayGroups -> <DayChart items={items}>)
  // rather than assumed from the name.
  // Keyed on the CODE, not a line number — adding one import above it
  // invalidated a line-number allowance immediately.
  const ALLOWED = {
    'src/components/schedule/WeddingDayTimelineBuilder.jsx': [
      '[...items].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)),',
    ],
  };
  for (const [i, line] of readFileSync(f, 'utf8').split('\n').entries()) {
    if (line.trimStart().startsWith('*') || line.trimStart().startsWith('//')) continue;
    if (!INLINE.test(line)) continue;
    if ((ALLOWED[r] || []).includes(line.trim())) continue;
    fail('one-rule', `${r}:${i + 1} orders schedule items inline — use scheduleOrder.js`); inline++;
  }
}
if (!inline) pass('one-rule', 'every surface orders through the one comparator');

console.log(failed ? `\n  ${failed} failure(s)` : '\n  the schedule runs forwards, everywhere');
process.exit(failed ? 1 : 0);
