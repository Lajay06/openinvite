/**
 * BEHAVIOURAL test for the outage-vs-empty classification.
 *
 * This is the assertion that would have caught the first attempt. That version
 * shipped with five green STRUCTURAL pins — they asserted DailyUpdate's source
 * contained an error phase, a wired retry, and no .catch(() => []). All true,
 * and all irrelevant: the loaders it wrapped never rejected, so the error state
 * could not fire. A guard that reads the code cannot tell you the system works.
 *
 * Here the loaders are INJECTED, so a transport failure is simulated exactly —
 * no browser, no network, no SDK. If loadDashboardSources ever stops
 * distinguishing an outage from an empty account, these fail.
 */
import { pass, fail } from './_shared.mjs';
import { loadDashboardSources, formatSourceList } from '../../src/lib/dashboardSources.js';

const boom = (msg = 'simulated transport failure') => () => Promise.reject(new Error(msg));
const ok = (value) => () => Promise.resolve(value);

export async function runDashboardSources() {
  const results = [];
  console.log('\n  Dashboard sources — an outage must classify differently from an empty account:\n');

  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  // ── the case the production demo caught ─────────────────────────────────
  const allDown = await loadDashboardSources({
    guests: boom(), budget: boom(), vendors: boom(), schedule: boom(), tasks: boom(), 'wedding details': boom(),
  });
  check('every source failing classifies as "error", not "ok"',
    allDown.status === 'error' && allDown.failed.length === 6, `status=${allDown.status} failed=${allDown.failed.length}`);

  // ── the case that must NOT be mistaken for an outage ─────────────────────
  const allEmpty = await loadDashboardSources({
    guests: ok([]), budget: ok([]), vendors: ok([]), schedule: ok([]), tasks: ok([]), 'wedding details': ok([]),
  });
  check('a genuinely empty account classifies as "ok", not "error"',
    allEmpty.status === 'ok' && allEmpty.failed.length === 0, `status=${allEmpty.status}`);

  // THE distinction. Empty results are byte-identical in both cases; only the
  // classification separates them, which is the whole point of this module.
  check('empty-because-new and empty-because-broken are distinguishable',
    allDown.status !== allEmpty.status, `${allEmpty.status} vs ${allDown.status}`);

  // ── partial ─────────────────────────────────────────────────────────────
  const partial = await loadDashboardSources({
    guests: ok([{ id: 'g1' }]), budget: boom(), vendors: boom(),
    schedule: ok([]), tasks: ok([]), 'wedding details': ok([{ id: 'w1' }]),
  });
  check('a partial failure classifies as "partial"', partial.status === 'partial', `status=${partial.status}`);
  check('  and names exactly the sources that failed',
    JSON.stringify(partial.failed) === JSON.stringify(['budget', 'vendors']), JSON.stringify(partial.failed));
  check('  while still returning the data that DID load',
    Array.isArray(partial.data.guests) && partial.data.guests.length === 1, `${partial.data.guests?.length} guest(s)`);

  // Failure names reach user-facing copy, so their order must not depend on
  // which promise happened to settle first.
  const raced = await loadDashboardSources({
    guests: () => new Promise((_, r) => setTimeout(() => r(new Error('slow')), 30)),
    budget: boom(), vendors: ok([]), schedule: ok([]), tasks: ok([]), 'wedding details': ok([]),
  });
  check('failed names are ordered by source, not by settle time',
    JSON.stringify(raced.failed) === JSON.stringify(['guests', 'budget']), JSON.stringify(raced.failed));

  // ── the strict contract this depends on ─────────────────────────────────
  // A loader that swallows its own failure is indistinguishable from success.
  // This is precisely what { strict: false } does, and why DailyUpdate must
  // pass { strict: true } — pinned here so the reason survives.
  const swallowing = await loadDashboardSources({
    guests: ok([]), budget: ok([]), vendors: ok([]), schedule: ok([]), tasks: ok([]), 'wedding details': ok(null),
  });
  check('a swallowing loader reads as "ok" — why strict:true is mandatory',
    swallowing.status === 'ok', 'soft loaders cannot report failure, by construction');

  // ── the soft default is the other ~12 callers' contract ─────────────────
  // Only DailyUpdate opts in. If a second page ever adds strict:true it must be
  // a deliberate decision, not a copy-paste — every other page renders an empty
  // list on failure by design, and flipping that silently would turn a degraded
  // page into a thrown one.
  const { readFileSync, readdirSync, statSync } = await import('fs');
  const { resolve, dirname, join } = await import('path');
  const { fileURLToPath } = await import('url');
  const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../src');
  const walk = (d) => readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : (/\.(jsx?|mjs)$/.test(f) ? [p] : []);
  });
  const strictCallers = walk(SRC)
    .filter((f) => !/resolveMyWedding|dashboardSources/.test(f))
    .filter((f) => /strict:\s*true/.test(readFileSync(f, 'utf8')))
    .map((f) => f.slice(SRC.length + 1));
  check('only DailyUpdate opts into strict loaders; the soft default is untouched elsewhere',
    strictCallers.length === 1 && strictCallers[0] === 'pages/DailyUpdate.jsx',
    strictCallers.join(', ') || 'none');

  // ── user-facing copy: the source list must read as English ──────────────
  // "Your vendors, tasks could not be loaded" shipped in #487 — a bare comma
  // list, correct for one name and wrong for two.
  const JOINS = [
    [['vendors'], 'vendors'],
    [['vendors', 'tasks'], 'vendors and tasks'],
    [['vendors', 'tasks', 'schedule'], 'vendors, tasks and schedule'],
    [[], ''],
  ];
  for (const [input, expected] of JOINS) {
    const got = formatSourceList(input);
    check(`formatSourceList(${JSON.stringify(input)}) reads naturally`,
      got === expected, `"Your ${got} could not be loaded"`);
  }
  check('the two-source case is joined with "and", not a bare comma',
    !formatSourceList(['vendors', 'tasks']).includes(','), formatSourceList(['vendors', 'tasks']));

  return results;
}
