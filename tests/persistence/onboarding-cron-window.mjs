/**
 * tests/persistence/onboarding-cron-window.mjs
 *
 * api/cron/send-onboarding-emails.js has been silently failing every run
 * since it shipped (wrong User-list auth form, fixed by switching to the
 * WeddingDetails-first pattern proven in send-weekly-digest.js) — which
 * means its day-3/day-7 date-window selection logic has never actually
 * been exercised against real data either. Base44's created_date is
 * server-stamped, not settable on write, so that logic can't be proven via
 * seeded live records; this is a direct boundary-condition check of the
 * exported isInWindow() instead. Pure logic, no live Base44/network calls.
 */

import { pass, fail } from './_shared.mjs';
import { isInWindow, DAY3_MIN_H, DAY3_MAX_H, DAY7_MIN_H, DAY7_MAX_H } from '../../api/cron/send-onboarding-emails.js';

const hoursAgo = (h) => new Date(Date.now() - h * 3_600_000).toISOString();

const CASES = [
  ['71.9h ago — just before day-3 window', hoursAgo(71.9), DAY3_MIN_H, DAY3_MAX_H, false],
  ['72h ago exactly — day-3 window start (inclusive)', hoursAgo(72), DAY3_MIN_H, DAY3_MAX_H, true],
  ['84h ago — middle of day-3 window', hoursAgo(84), DAY3_MIN_H, DAY3_MAX_H, true],
  ['95.9h ago — just before day-3 window end', hoursAgo(95.9), DAY3_MIN_H, DAY3_MAX_H, true],
  ['96h ago exactly — day-3 window end (exclusive)', hoursAgo(96), DAY3_MIN_H, DAY3_MAX_H, false],
  ['167.9h ago — just before day-7 window', hoursAgo(167.9), DAY7_MIN_H, DAY7_MAX_H, false],
  ['168h ago exactly — day-7 window start (inclusive)', hoursAgo(168), DAY7_MIN_H, DAY7_MAX_H, true],
  ['180h ago — middle of day-7 window', hoursAgo(180), DAY7_MIN_H, DAY7_MAX_H, true],
  ['192h ago exactly — day-7 window end (exclusive)', hoursAgo(192), DAY7_MIN_H, DAY7_MAX_H, false],
  ['80h ago does not also match the day-7 window (no cross-window overlap)', hoursAgo(80), DAY7_MIN_H, DAY7_MAX_H, false],
  ['180h ago does not also match the day-3 window (no cross-window overlap)', hoursAgo(180), DAY3_MIN_H, DAY3_MAX_H, false],
  ['null created_date never matches (no throw)', null, DAY3_MIN_H, DAY3_MAX_H, false],
];

export async function runOnboardingCronWindow() {
  const results = [];
  console.log('\n  Onboarding cron — day-3/day-7 window boundary conditions:\n');

  for (const [label, date, min, max, expected] of CASES) {
    const actual = isInWindow(date, min, max);
    results.push(actual === expected
      ? pass(label, actual)
      : fail(label, expected, actual));
  }

  return results;
}
