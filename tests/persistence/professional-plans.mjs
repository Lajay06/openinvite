/**
 * tests/persistence/professional-plans.mjs
 *
 * Openinvite Professional: the plan constants are the goal's, the over-limit
 * rule never deletes and picks the newest events, the flag is off on the
 * production host, and the product is never called "Pro".
 * goals/2026-10-14-professional.md, Names and Pricing.
 *
 * PLANT (R19): the same over-limit rule, sorted the wrong way (oldest go
 * read-only), must be told apart from the right one by the same assertion.
 */
import { readFileSync } from 'node:fs';
import { pass, fail, stripComments } from './_shared.mjs';
import { PLANS, TRIAL, limitsFor, readOnlyEventIds, hasFreeSlot, usd, isPastArchiveDate } from '../../src/lib/professionalPlans.js';
import { PRODUCT_NAME, PRODUCT_SHORT, isProfessionalOn, homeForAccount } from '../../src/lib/professionalBrand.js';

export function runProfessionalPlans() {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Professional, plans, limits and the flag:\n');

  check('professional plans: Solo, Team, Agency at the goal prices', PLANS.solo.monthly === 29.95 && PLANS.solo.yearly === 299 && PLANS.team.monthly === 79 && PLANS.team.yearly === 790 && PLANS.agency.monthly === 149 && PLANS.agency.yearly === 1490, Object.values(PLANS).map((p) => `${p.name} ${usd(p.monthly)}`).join(', '));
  check('professional plans: 10, 30 and 75 active events; 1, 5 and unlimited seats', PLANS.solo.events === 10 && PLANS.team.events === 30 && PLANS.agency.events === 75 && PLANS.solo.seats === 1 && PLANS.team.seats === 5 && PLANS.agency.seats === Infinity, 'as the goal');
  check('professional plans: the trial is 14 days and 2 events', TRIAL.days === 14 && limitsFor('trial').events === 2, JSON.stringify(limitsFor('trial')));
  check('professional plans: US$1,490 and US$29.95 print in USD', usd(1490) === 'US$1,490' && usd(29.95) === 'US$29.95', `${usd(1490)} ${usd(29.95)}`);

  const now = new Date('2026-10-14T00:00:00Z');
  const ev = (id, created, date = '2027-03-01', status = 'active') => ({ id, created_date: created, event_date: date, status });
  const events = [ev('a', '2026-01-01'), ev('b', '2026-02-01'), ev('c', '2026-03-01'), ev('old', '2025-01-01', '2026-08-01')];
  const ro = readOnlyEventIds(events, 'trial', { now });
  check('professional plans: over the limit, the newest events go read-only, and nothing is removed', ro.has('c') && !ro.has('a') && !ro.has('b') && events.length === 4, [...ro].join(','));
  check('professional plans: an event 30 days past its date is archived and read-only', ro.has('old') && isPastArchiveDate('2026-08-01', now) && !isPastArchiveDate('2026-09-20', now), 'old archived');
  check('professional plans: a canceled workspace is read-only throughout', readOnlyEventIds(events, 'agency', { now, canceled: true }).size === 4, 'all four');
  check('professional plans: no free slot on a full trial', !hasFreeSlot(events, 'trial', now) && hasFreeSlot(events, 'solo', now), 'trial full, solo free');

  // PLANT: the wrong sort direction. The assertion above must reject it.
  const wrong = new Set([...events].filter((e) => e.id !== 'old').sort((x, y) => y.created_date.localeCompare(x.created_date)).slice(2).map((e) => e.id));
  check('PLANT: an over-limit rule that locks the oldest event is told apart', !(wrong.has('c') && !wrong.has('a')), `planted locks ${[...wrong].join(',')}`);

  check('professional brand: the product name is Openinvite Professional, short form Professional', PRODUCT_NAME === 'Openinvite Professional' && PRODUCT_SHORT === 'Professional', PRODUCT_SHORT);
  check('professional flag: off on openinvite.com.au with no build flag', isProfessionalOn({}, 'openinvite.com.au') === false, 'off');
  check('professional flag: on with VITE_PROFESSIONAL=1, and on a vercel.app preview', isProfessionalOn({ VITE_PROFESSIONAL: '1' }, 'openinvite.com.au') && isProfessionalOn({}, 'openinvite-git-x.vercel.app'), 'on');
  check('professional routing: a professional account goes to /professional/app; a couple is untouched', homeForAccount({ accountType: 'professional' }) === '/professional/app' && homeForAccount({ plan: 'ultra' }) === null, 'as the goal');

  // "Pro" alone is a couple plan. No Professional source file may call the product that.
  const files = ['src/lib/professionalBrand.js', 'src/lib/professionalPlans.js'];
  const shortened = files.filter((f) => /['"`>]\s*Pro\s*['"`<]/.test(stripComments(readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8'), { trailing: true })));
  check('professional brand: no Professional file shortens the product to "Pro"', shortened.length === 0, shortened.join(', ') || `${files.length} files`);
  return r;
}
