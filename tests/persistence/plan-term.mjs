/**
 * tests/persistence/plan-term.mjs
 *
 * THE 24-MONTH TERM. Owner rulings 2026-10-13 (the term) and 2026-10-15 (how
 * it behaves), and it must land before launch.
 *
 * The rulings, each one asserted below:
 *
 *   1. The end date is planExpiresAt when present, otherwise planActivatedAt
 *      plus 24 months as a FALLBACK ONLY, never written back. Gift claims keep
 *      writing planExpiresAt as they do now.
 *   2. Past the term the couple is read only: view and export always work, no
 *      edits and no new publish. An already published guest site stays live,
 *      and guest RSVPs, meal choices and replies always work. The term never
 *      governs anything a guest does.
 *   3. Missing both dates means no expiry. Never lock someone out on missing
 *      data.
 *   5. planExpiresAt is declared in the live User schema, so the mirror
 *      carries it too.
 *
 * ── WHAT THIS GUARD DOES NOT CLAIM ───────────────────────────────────────
 *
 * Ruling 2 says "no edits". isReadOnly(user) is the predicate that says so,
 * and the WRITE PATHS DO NOT CONSULT IT YET: the publish toggle in
 * StudioShareTab.jsx, the one in WBRightPanel.jsx, and the mobile lane's
 * SiteContainer.jsx are all still unguarded, as is every save button. Wiring
 * them is the next PR and it crosses into another lane's file. Stated here
 * rather than implied, because a guard that looked like it proved "edits are
 * blocked" when it proves "the predicate is correct" would be the worst kind
 * of green.
 */

import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getPlanTerm, isReadOnly, canAccessUltra, hasUltraAccess, PLAN_TERM_MONTHS } from '../../src/lib/trialStatus.js';
import { addMonths as giftAddMonths, TERM_MONTHS as GIFT_TERM_MONTHS } from '../../api/_lib/giftClaim.js';

const ROOT = resolve(new URL('../../', import.meta.url).pathname);
const read = (f) => readFileSync(resolve(ROOT, f), 'utf8');

const NOW = new Date('2026-10-15T10:00:00.000Z');
const ultra = (extra) => ({ plan: 'ultra', ...extra });

export async function runPlanTerm() {
  const r = [];
  const ok = (name, cond, note) => r.push(cond ? pass(name, note) : fail(name, 'see name', note));

  // ── RULING 1: which date, and in which order ─────────────────────────────
  const explicit = getPlanTerm(ultra({ planExpiresAt: '2027-01-01T00:00:00.000Z', planActivatedAt: '2020-01-01T00:00:00.000Z' }), NOW);
  ok('planExpiresAt is the expiry when it is present', explicit.source === 'planExpiresAt'
    && explicit.end.toISOString() === '2027-01-01T00:00:00.000Z', explicit.source);
  ok('  and it wins over planActivatedAt, which would have said 2022',
     !explicit.expired, 'the explicit date is not second-guessed');

  const fallback = getPlanTerm(ultra({ planActivatedAt: '2026-05-18T00:00:00.000Z' }), NOW);
  ok('with no planExpiresAt the term is planActivatedAt plus 24 months',
     fallback.source === 'planActivatedAt' && fallback.end.toISOString() === '2028-05-18T00:00:00.000Z',
     fallback.end?.toISOString());
  ok('  and 24 is read from one constant, not typed twice',
     PLAN_TERM_MONTHS === 24 && PLAN_TERM_MONTHS === GIFT_TERM_MONTHS,
     `trialStatus ${PLAN_TERM_MONTHS}, giftClaim ${GIFT_TERM_MONTHS}`);

  // THE FALLBACK AND THE GIFT MUST AGREE TO THE DAY. A gift writes the date
  // with api/_lib/giftClaim.js's addMonths; this computes it for an account
  // that has none. Two different month maths would land the same couple on two
  // different days depending on which branch happened to read it.
  const CLAMPS = ['2026-01-31T00:00:00.000Z', '2026-02-29T12:00:00.000Z', '2026-08-31T23:59:59.000Z', '2027-02-28T00:00:00.000Z'];
  const disagree = CLAMPS.filter((iso) => {
    const mine = getPlanTerm(ultra({ planActivatedAt: iso }), NOW).end.toISOString();
    return mine !== giftAddMonths(iso, PLAN_TERM_MONTHS);
  });
  ok('  the fallback agrees with the gift path to the day, month-end included',
     disagree.length === 0, disagree.length ? disagree.join(', ') : `${CLAMPS.length} month-end date(s)`);

  // ── THE FALLBACK IS NEVER WRITTEN BACK ──────────────────────────────────
  const src = read('src/lib/trialStatus.js');
  // NAMES THE WRITE CALLS, not the string "base44": the module imports
  // parseBase44Date from ./base44Date.js, which is a date parser, and a
  // substring match on "base44" read that import as a data client and reported
  // a pure module as writing to the backend.
  ok('the term module writes nothing anywhere',
     !/entities\.|\.update\(|\.create\(|\.save\(|fetch\(|localStorage|sessionStorage/.test(src),
     'pure: no entity client, no fetch, no storage');
  const subject = ultra({ planActivatedAt: '2026-05-18T00:00:00.000Z' });
  getPlanTerm(subject, NOW);
  ok('  and computing a term does not give the user a planExpiresAt',
     !('planExpiresAt' in subject), 'the fallback is a reading, not a migration');

  // ── RULING 3: missing data never locks anyone out ───────────────────────
  const noDates = getPlanTerm(ultra({}), NOW);
  ok('an account with neither date has no expiry',
     noDates.end === null && noDates.expired === false, 'no expiry, not an instant lockout');
  ok('  an unparseable planExpiresAt falls back rather than expiring in 1970',
     getPlanTerm(ultra({ planExpiresAt: 'not a date', planActivatedAt: '2026-05-18T00:00:00.000Z' }), NOW).source === 'planActivatedAt',
     'bad data is missing data');
  ok('  and an unparseable date with nothing to fall back to is still no expiry',
     getPlanTerm(ultra({ planExpiresAt: 'not a date' }), NOW).expired === false, 'never on bad data');
  ok('  a null user has no expiry', getPlanTerm(null, NOW).expired === false, 'and does not throw');
  ok('  a free account has no term at all',
     getPlanTerm({ plan: 'free', planActivatedAt: '2020-01-01T00:00:00.000Z' }, NOW).end === null,
     'the trial owns the free plan, and only one of them may answer');

  // ── RULING 2: what expiry does, and what it must not do ─────────────────
  const lapsed = ultra({ planExpiresAt: '2026-10-01T00:00:00.000Z' });
  const running = ultra({ planExpiresAt: '2027-10-01T00:00:00.000Z' });
  ok('a term in the past is expired', getPlanTerm(lapsed, NOW).expired === true, '2026-10-01 before 2026-10-15');
  ok('  a term still running is not', getPlanTerm(running, NOW).expired === false, `${getPlanTerm(running, NOW).daysLeft} days left`);
  ok('  expiry makes the account read only', isReadOnly(lapsed) === true, 'isReadOnly');
  ok('  and a running term does not', isReadOnly(running) === false, 'editing continues');

  // THE ONE THAT WOULD BREAK THE RULING IF IT WERE WRONG. If expiry revoked
  // the tier, the sidebar would badge the Guest Suite as an upgrade and
  // disable it, and a couple who paid could not LOOK at their own guest suite.
  ok('an expired Ultra account STILL HAS Ultra access, so it can be read',
     canAccessUltra(lapsed) === true, 'view and export always work');
  ok('  the tier and the term are two different questions',
     canAccessUltra(lapsed) === canAccessUltra(running), 'expiry changes writes, never the tier');

  // ── ONE EXPRESSION FOR THE TIER, NOT TWO COPIES ────────────────────────
  const journey = read('src/lib/journeySteps.js');
  ok('journeySteps reads the shared function', /hasUltraAccess\(\{ plan, trialActive \}\)/.test(journey), 'one call');
  ok('  and keeps no second copy of the rule',
     !/plan === 'ultra' \|\| trialActive/.test(journey), 'the expression lives in trialStatus.js only');
  ok('  which is the same answer the sidebar gets',
     hasUltraAccess({ plan: 'ultra', trialActive: false }) === canAccessUltra({ plan: 'ultra' }),
     'same function, same verdict');

  // ── THE TERM NEVER GOVERNS A GUEST ─────────────────────────────────────
  //
  // Asserted as an IMPORT BOUNDARY rather than by reading behaviour: the
  // published guest site reads no plan at all today, and the cheapest way to
  // keep it that way is to fail the moment a guest-facing module reaches for
  // the term.
  const GUEST_SURFACES = [
    'src/components/guest-website', 'src/pages/GuestMusic.jsx',
  ];
  const { readdirSync, statSync } = await import('node:fs');
  const walk = (p, out = []) => {
    const full = resolve(ROOT, p);
    if (statSync(full).isDirectory()) {
      for (const e of readdirSync(full)) walk(`${p}/${e}`, out);
    } else if (/\.(jsx?|mjs)$/.test(p)) out.push(p);
    return out;
  };
  const guestFiles = GUEST_SURFACES.flatMap((p) => walk(p));
  const reaching = guestFiles.filter((f) => /trialStatus|getPlanTerm|isReadOnly|planExpiresAt/.test(read(f)));
  ok('no guest-facing module reads the couple\'s term', reaching.length === 0,
     reaching.length ? reaching.join(', ') : `${guestFiles.length} guest file(s) checked`);
  ok('  and there are guest files to check', guestFiles.length > 5, `${guestFiles.length} file(s)`);

  // ── THE SURFACES THE RULING NAMED ──────────────────────────────────────
  const layout = read('src/Layout.jsx');
  ok('the banner explains an expired term', /kind: 'term', expired: true/.test(layout), 'Layout.jsx');
  ok('  in words that say what ended and what did not',
     /Your 24 months of access have ended\. Everything is still yours to read and export\./.test(layout),
     'no data-hostage language, and it asks for nothing');
  ok('  and it says nothing while the term is still running',
     /term\.expired \? \{ kind: 'term', expired: true, daysLeft: 0 \} : null/.test(layout),
     'a countdown on a 24-month window is noise for 23 of them');

  const account = read('src/pages/Account.jsx');
  ok('Account shows when the term ends', /Access until \$\{planEndsAt\}/.test(account), 'Account.jsx');
  ok('  and past it says so in the past tense, with reading still open',
     /Editing ended \$\{planEndsAt\}\. Reading and exporting stay open\./.test(account),
     '"Access until" a date that has gone reads as though it still applies');

  // ── RULING 5: the mirror carries the field ─────────────────────────────
  const user = JSON.parse(read('base44/entities/User.jsonc').replace(/^\s*\/\/.*$/gm, ''));
  const field = user.properties?.planExpiresAt;
  ok('the User mirror declares planExpiresAt', !!field, field ? 'declared' : 'MISSING');
  ok('  as a date-time string, as Base44 live has it',
     field?.type === 'string' && field?.format === 'date-time', `${field?.type} / ${field?.format}`);
  const generated = read('src/lib/entityFields.generated.js');
  ok('  and the generated field list was regenerated with it',
     /"planExpiresAt"/.test(generated), 'npm run generate:entity-fields');

  // ── THE CHECK CAN FAIL ────────────────────────────────────────────────
  ok('a date one second in the past is expired',
     getPlanTerm(ultra({ planExpiresAt: new Date(NOW.getTime() - 1000).toISOString() }), NOW).expired === true, 'caught');
  ok('  one second in the future is not',
     getPlanTerm(ultra({ planExpiresAt: new Date(NOW.getTime() + 1000).toISOString() }), NOW).expired === false, 'not caught');
  ok('  and the exact instant counts as expired',
     getPlanTerm(ultra({ planExpiresAt: NOW.toISOString() }), NOW).expired === true, 'inclusive');

  return r;
}
