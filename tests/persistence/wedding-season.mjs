/**
 * Season derivation — hemisphere-aware.
 *
 * Reproduction: a New Year's Eve wedding at Crown Sydney was told it was a
 * "winter" wedding. The old helper had the venue and used a fixed Northern
 * Hemisphere month table anyway.
 *
 * These fixtures are self-contained on purpose. The owner's real row now
 * stores the corrected value, so asserting against that row would prove the
 * DATA was fixed, not the DERIVATION. Each case below states its own date and
 * address and must be right on its own terms.
 */
import { pass, fail } from './_shared.mjs';
import { deriveSeason, parseCountry, hemisphereFor } from '../../src/lib/weddingSeason.js';

const SYD = '1 Barangaroo Ave, Barangaroo NSW 2000, Australia';
const NYC = '11 Madison Ave, New York, NY 10010, United States';

export async function runWeddingSeason() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Season derivation — the hemisphere decides:\n');

  // ── the reproduction case, and its northern twin ──────────────────────
  check('Sydney, 31 Dec -> Summer (the reported bug)', deriveSeason('2026-12-31', SYD) === 'Summer', deriveSeason('2026-12-31', SYD));
  check('New York, 31 Dec -> Winter (same date, other hemisphere)', deriveSeason('2026-12-31', NYC) === 'Winter', deriveSeason('2026-12-31', NYC));
  check('  the two are opposites on the same day',
    deriveSeason('2026-12-31', SYD) !== deriveSeason('2026-12-31', NYC), 'Summer vs Winter');

  // ── no location means no season, never a default ──────────────────────
  check('no address -> null, not a guess', deriveSeason('2026-12-31', undefined) === null, String(deriveSeason('2026-12-31', undefined)));
  check('empty address -> null', deriveSeason('2026-12-31', '') === null, String(deriveSeason('2026-12-31', '')));
  check('a bare venue name with no country -> null', deriveSeason('2026-12-31', 'Crown Sydney') === null, String(deriveSeason('2026-12-31', 'Crown Sydney')));
  check('an unlisted country -> null, NOT defaulted to northern',
    deriveSeason('2026-12-31', 'Somewhere, Freedonia') === null, String(deriveSeason('2026-12-31', 'Somewhere, Freedonia')));
  check('no date -> null', deriveSeason(null, SYD) === null, String(deriveSeason(null, SYD)));
  check('an unparseable date -> null, not a throw', deriveSeason('not-a-date', SYD) === null, String(deriveSeason('not-a-date', SYD)));

  // ── meteorological months, both hemispheres, all four seasons ─────────
  const N = [['2027-01-15','Winter'],['2027-04-15','Spring'],['2027-07-15','Summer'],['2027-10-15','Autumn']];
  for (const [date, want] of N) {
    check(`  northern ${date} -> ${want}`, deriveSeason(date, NYC) === want, deriveSeason(date, NYC));
  }
  const S = [['2027-01-15','Summer'],['2027-04-15','Autumn'],['2027-07-15','Winter'],['2027-10-15','Spring']];
  for (const [date, want] of S) {
    check(`  southern ${date} -> ${want}`, deriveSeason(date, SYD) === want, deriveSeason(date, SYD));
  }

  // ── the month boundary is whole-month, not astronomical ───────────────
  check('1 Dec and 31 Dec are the same season (meteorological, not solstice)',
    deriveSeason('2026-12-01', SYD) === deriveSeason('2026-12-31', SYD), 'both Summer');
  check('30 Nov and 1 Dec differ (the month boundary is the boundary)',
    deriveSeason('2026-11-30', SYD) !== deriveSeason('2026-12-01', SYD), 'Spring -> Summer');

  // ── the parsing pieces ────────────────────────────────────────────────
  check('parseCountry takes the last comma-separated token', parseCountry(SYD) === 'Australia', parseCountry(SYD));
  check('hemisphereFor is case and punctuation tolerant',
    hemisphereFor('australia') === 'south' && hemisphereFor('Australia.') === 'south', 'south');
  check('hemisphereFor returns null for unknown, never a default',
    hemisphereFor('Freedonia') === null, String(hemisphereFor('Freedonia')));

  // ── the OLD behaviour is now provably wrong (negative control) ────────
  const oldNorthernOnly = (d) => { const m = new Date(d).getMonth() + 1;
    return m >= 3 && m <= 5 ? 'Spring' : m >= 6 && m <= 8 ? 'Summer' : m >= 9 && m <= 11 ? 'Autumn' : 'Winter'; };
  check('the OLD helper returns Winter for Sydney NYE — why this exists',
    oldNorthernOnly('2026-12-31') === 'Winter' && deriveSeason('2026-12-31', SYD) === 'Summer',
    'old=Winter, new=Summer');

  return results;
}
