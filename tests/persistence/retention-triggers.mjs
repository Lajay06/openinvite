/**
 * tests/persistence/retention-triggers.mjs
 *
 * WHO GETS A RETENTION EMAIL, AND WHO NEVER DOES.
 *
 * Item 2 of goals/2026-10-08-retention-emails.md, whose guard line reads:
 * "Triggers: a fixture account at 23h gets nothing, at 25h gets exactly one,
 * at 25h again gets nothing, after completing setup or adding a guest gets
 * nothing, with lifecycleEmails false gets nothing, older than 30 days at ship
 * gets nothing."
 *
 * Every one of those six is below, by name, plus the cases the goal did not
 * name and the owner ruled on afterwards.
 *
 * ── WHY THE DECISION IS A PURE FUNCTION ────────────────────────────────────
 *
 * Base44 stamps created_date server-side and refuses one on write, so an aged
 * fixture cannot be created. "At 23h" and "at 25h" are only expressible if the
 * clock is an argument, which is why api/_lib/retentionTriggers.js takes `now`
 * and `shipDate` and the cron passes neither.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';
import {
  dueRetentionEmail,
  retentionCondition,
  mergeRetentionFlag,
  suppressesDay3,
  retentionEligibleFrom,
  ageHours,
  RETENTION_SHIP_DATE,
  RETENTION_SENDS,
  RETENTION_SPACING_HOURS,
} from '../../api/_lib/retentionTriggers.js';
import { isExcludedAccount, EXCLUDED_ACCOUNT_ADDRESSES } from '../../api/_lib/excludedAccounts.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const HOUR = 3_600_000;
/** A "now" comfortably after the ship date, so the no-backfill rule is not what is being tested. */
const NOW = new Date('2026-10-20T09:00:00.000Z').getTime();
const signedUp = (hoursAgo) => new Date(NOW - hoursAgo * HOUR).toISOString();

const noSlugWedding = { id: 'w1', slug: null };
const liveWedding = { id: 'w1', slug: 'ada-and-alan' };

const account = (over = {}) => ({
  id: 'u1', email: 'ada@example.com', full_name: 'Ada Lovelace',
  created_date: signedUp(25), ...over,
});

const due = (p) => dueRetentionEmail({ now: NOW, ...p });

export async function runRetentionTriggers() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── THE SIX THE GOAL NAMES ──────────────────────────────────────────────

  ok('at 23h, nothing',
     due({ user: account({ created_date: signedUp(23) }), wedding: noSlugWedding, guestCount: 0 }) === null, 'null');

  const at25 = due({ user: account(), wedding: noSlugWedding, guestCount: 0 });
  ok('at 25h, exactly one, and it is the setup nudge',
     at25 !== null && at25.flag === 'setup24h' && at25.email === 'setup', JSON.stringify(at25));

  ok('at 25h again, having sent it, nothing',
     due({ user: account({ retentionEmails: { setup24h: signedUp(1) } }), wedding: noSlugWedding, guestCount: 0 }) === null,
     'the flag is what stops it');

  ok('after completing setup, nothing',
     due({ user: account(), wedding: liveWedding, guestCount: 5 }) === null, 'slug and guests');

  ok('after adding a guest, nothing',
     due({ user: account(), wedding: liveWedding, guestCount: 1 }) === null, 'one guest is enough');

  ok('with lifecycleEmails false, nothing',
     due({ user: account({ lifecycleEmails: false }), wedding: noSlugWedding, guestCount: 0 }) === null, 'the switch holds');

  const old = new Date(new Date(RETENTION_SHIP_DATE).getTime() - 31 * 24 * HOUR).toISOString();
  ok('older than 30 days at ship, nothing, ever',
     due({ user: account({ created_date: old }), wedding: noSlugWedding, guestCount: 0 }) === null, 'no backfill');
  const justInside = new Date(new Date(RETENTION_SHIP_DATE).getTime() - 29 * 24 * HOUR).toISOString();
  ok('  while 29 days before ship is still eligible',
     due({ user: account({ created_date: justInside }), wedding: noSlugWedding, guestCount: 0 })?.flag === 'setup24h',
     'the cutoff is a boundary, not a blanket');

  // ── THE SECOND NUDGE OF EACH TRIGGER ────────────────────────────────────

  const day4 = due({
    user: account({ created_date: signedUp(97), retentionEmails: { setup24h: signedUp(72) } }),
    wedding: noSlugWedding, guestCount: 0,
  });
  ok('the setup nudge comes again at day 4', day4?.flag === 'setupDay4', JSON.stringify(day4));
  ok('  but not at day 3 and a half',
     due({ user: account({ created_date: signedUp(84), retentionEmails: { setup24h: signedUp(60) } }),
           wedding: noSlugWedding, guestCount: 0 }) === null, '96h is the threshold');
  ok('  and not a third time',
     due({ user: account({ created_date: signedUp(400), retentionEmails: { setup24h: signedUp(1), setupDay4: signedUp(1) } }),
           wedding: noSlugWedding, guestCount: 0 }) === null, 'two is all there is');

  const guests24 = due({ user: account(), wedding: liveWedding, guestCount: 0 });
  ok('an empty guest list gets its own nudge at 24h', guests24?.flag === 'guests24h', JSON.stringify(guests24));
  const day5 = due({
    user: account({ created_date: signedUp(121), retentionEmails: { guests24h: signedUp(96) } }),
    wedding: liveWedding, guestCount: 0,
  });
  ok('  and again at day 5', day5?.flag === 'guestsDay5', JSON.stringify(day5));
  ok('  but not at day 4, which belongs to the other trigger',
     due({ user: account({ created_date: signedUp(100), retentionEmails: { guests24h: signedUp(76) } }),
           wedding: liveWedding, guestCount: 0 }) === null, '120h is the threshold');

  // ── THE CONDITION IS RE-CHECKED, NOT REMEMBERED ─────────────────────────
  //
  // "Never send when the condition no longer holds at send time." A couple who
  // finished setup after the 24h flag was set must not receive the day-4
  // nudge, and the flags do not encode which state they were set in.
  ok('finishing setup between nudges stops the second one',
     due({ user: account({ created_date: signedUp(97), retentionEmails: { setup24h: signedUp(72) } }),
           wedding: liveWedding, guestCount: 3 }) === null, 'condition re-read');
  ok('  and adding a guest between nudges stops the other second one',
     due({ user: account({ created_date: signedUp(121), retentionEmails: { guests24h: signedUp(96) } }),
           wedding: liveWedding, guestCount: 2 }) === null, 'condition re-read');
  // AND THE TWO TRIGGERS DO NOT BLEED. An account with no slug is in the setup
  // condition even with zero guests, and must not receive the guests nudge.
  ok('a no-slug account never gets the guests nudge',
     due({ user: account({ retentionEmails: { setup24h: signedUp(1), setupDay4: signedUp(1) } }),
           wedding: noSlugWedding, guestCount: 0 }) === null, 'setup condition only');

  // ── DELETED AND DELETION-REQUESTED ──────────────────────────────────────
  ok('a deletion-requested account gets nothing',
     due({ user: account({ deletionRequestedAt: '2026-10-01T00:00:00Z' }), wedding: noSlugWedding, guestCount: 0 }) === null, 'stops');
  ok('  and a soft-deleted one gets nothing',
     due({ user: account({ is_deleted: true }), wedding: noSlugWedding, guestCount: 0 }) === null, 'stops');

  // ── THE EDGES THAT WOULD OTHERWISE MAIL SOMEBODY BY ACCIDENT ────────────
  ok('no wedding row is not a condition', retentionCondition({ wedding: null, guestCount: 0 }) === null, 'out of reach');
  ok('  and no user is no decision', due({ user: null, wedding: noSlugWedding, guestCount: 0 }) === null, 'null');
  ok('an unusable created_date sends nothing',
     due({ user: account({ created_date: 'not a date' }), wedding: noSlugWedding, guestCount: 0 }) === null
     && due({ user: account({ created_date: null }), wedding: noSlugWedding, guestCount: 0 }) === null, 'both');
  ok('a created_date in the future sends nothing',
     due({ user: account({ created_date: signedUp(-5) }), wedding: noSlugWedding, guestCount: 0 }) === null, 'negative age');
  ok('lifecycleEmails absent reads as eligible',
     due({ user: account(), wedding: noSlugWedding, guestCount: 0 })?.flag === 'setup24h', 'default true');
  ok('  and an explicit true is eligible too',
     due({ user: account({ lifecycleEmails: true }), wedding: noSlugWedding, guestCount: 0 })?.flag === 'setup24h', 'true');

  // ── ONE PER RUN ─────────────────────────────────────────────────────────
  //
  // The function returns a single send by construction, so the cron cannot
  // send two even if several are due.
  const manyDue = due({ user: account({ created_date: signedUp(500) }), wedding: noSlugWedding, guestCount: 0 });
  ok('with several nudges due, exactly one is returned',
     manyDue !== null && typeof manyDue.flag === 'string', JSON.stringify(manyDue));
  ok('  and it is the earliest unsent one', manyDue.flag === 'setup24h', 'setup24h before setupDay4');

  // ── THE SPACING RULE, WALKED RUN BY RUN ─────────────────────────────────
  //
  // The owner's case, verbatim: "an account 10 days old at ship with nothing
  // sent gets setup24h on run one, nothing on runs two and three, setupDay4 on
  // run four."
  //
  // Walked as four real daily runs against one record that carries forward
  // what the previous run wrote, because the whole question is what the SECOND
  // run sees after the first one has written. Four independent assertions with
  // hand-built state would not have tested the carry-forward at all.
  {
    const DAY = 24 * HOUR;
    // Ten days old at ship, and the cron's first run is the ship date itself.
    const createdAt = new Date(new Date(RETENTION_SHIP_DATE).getTime() - 10 * DAY);
    const user = { ...account({ created_date: createdAt.toISOString() }), retentionEmails: undefined };
    const walked = [];
    for (let run = 0; run < 4; run += 1) {
      const runAt = new Date(RETENTION_SHIP_DATE).getTime() + run * DAY;
      const d = dueRetentionEmail({ user, wedding: noSlugWedding, guestCount: 0, now: runAt });
      walked.push(d ? d.flag : null);
      // The cron records the flag before sending, and only on a send, so the
      // record only moves on a run that produced an email.
      if (d) user.retentionEmails = mergeRetentionFlag(user.retentionEmails, d.flag, new Date(runAt).toISOString());
    }
    ok('ten days old at ship: run one sends the first nudge', walked[0] === 'setup24h', String(walked[0]));
    ok('  run two sends nothing', walked[1] === null, String(walked[1]));
    ok('  run three sends nothing', walked[2] === null, String(walked[2]));
    ok('  run four sends the second nudge', walked[3] === 'setupDay4', String(walked[3]));
    ok('  and the record holds two stamps and no others',
       Object.keys(user.retentionEmails).sort().join(',') === 'setupDay4,setup24h'.split(',').sort().join(','),
       JSON.stringify(user.retentionEmails));
  }

  // THE SPACING IS 72 HOURS, AND BOTH CONDITIONS MUST HOLD.
  ok('the second nudge waits 72 hours after the first, not 48',
     due({ user: account({ created_date: signedUp(200), retentionEmails: { setup24h: signedUp(48) } }),
           wedding: noSlugWedding, guestCount: 0 }) === null, '48h is not enough');
  ok('  and goes at 72', due({ user: account({ created_date: signedUp(200), retentionEmails: { setup24h: signedUp(72) } }),
           wedding: noSlugWedding, guestCount: 0 })?.flag === 'setupDay4', '72h');
  ok('  while the age threshold still has to be met as well',
     due({ user: account({ created_date: signedUp(90), retentionEmails: { setup24h: signedUp(80) } }),
           wedding: noSlugWedding, guestCount: 0 }) === null, '90h old is short of day 4');
  ok('  the same two conditions govern the guests nudge',
     due({ user: account({ created_date: signedUp(200), retentionEmails: { guests24h: signedUp(48) } }),
           wedding: liveWedding, guestCount: 0 }) === null
     && due({ user: account({ created_date: signedUp(200), retentionEmails: { guests24h: signedUp(72) } }),
           wedding: liveWedding, guestCount: 0 })?.flag === 'guestsDay5', '48 no, 72 yes');

  // A SECOND NUDGE CANNOT PRECEDE A FIRST, which the spacing rule makes
  // structural rather than a property of this array's order.
  ok('without the first nudge recorded, the second never fires',
     due({ user: account({ created_date: signedUp(500) }), wedding: noSlugWedding, guestCount: 0 })?.flag === 'setup24h',
     'the first one is what is offered');
  ok('  and an unreadable first stamp holds the second rather than sending it',
     due({ user: account({ created_date: signedUp(500), retentionEmails: { setup24h: 'not a date' } }),
           wedding: noSlugWedding, guestCount: 0 }) === null, 'unknown is not long enough');

  // NO STAMP IS EVER WRITTEN FOR AN EMAIL THAT WAS NOT SENT. The cron writes
  // only inside sendRetention, which is only called for a due send.
  ok('the only writer of a retention stamp is the sender',
     (stripComments(read('api/cron/send-onboarding-emails.js')).match(/retentionEmails \}\)/g) || []).length === 1,
     'one write, inside sendRetention');

  // ── THE MERGE, WHICH IS THE WHOLE REASON retentionEmails IS AN OBJECT ───
  const merged = mergeRetentionFlag({ setup24h: 'A' }, 'setupDay4', 'B');
  ok('recording a flag keeps the ones already there',
     merged.setup24h === 'A' && merged.setupDay4 === 'B', JSON.stringify(merged));
  ok('  and it works from nothing',
     mergeRetentionFlag(undefined, 'guests24h', 'C').guests24h === 'C', 'from undefined');
  ok('  and ignores a non-object',
     mergeRetentionFlag('garbage', 'guests24h', 'C').guests24h === 'C', 'no throw');

  // ── THE CADENCE RULING ──────────────────────────────────────────────────
  ok('an account with no slug is denied the day-3 Ava email',
     suppressesDay3({ wedding: noSlugWedding }) === true && suppressesDay3({ wedding: null }) === true,
     'it cannot try Ava before setup');
  ok('  and one with a slug still gets it', suppressesDay3({ wedding: liveWedding }) === false, 'unchanged');

  const cron = stripComments(read('api/cron/send-onboarding-emails.js'));
  ok('the cron suppresses day 3 on that signal', /suppressesDay3\(\{ wedding \}\)/.test(cron), 'wired');
  ok('  and does NOT suppress day 7', /inDay7 = isInWindow\(user\.created_date, DAY7_MIN_H, DAY7_MAX_H\)/.test(cron)
     && !/inDay7[^\n]*suppressesDay3/.test(cron), 'the trial clock runs regardless');
  // NEVER TWO IN ONE RUN, and the trial email is the one that cannot wait.
  ok('  and offers a retention email only when neither trial email is due',
     /if \(!inDay3 && !inDay7\) \{/.test(cron), 'one email per account per run');

  // ── THE ORDER OF THE WRITE AND THE SEND ─────────────────────────────────
  //
  // "Record the timestamp before sending so a crash cannot double-send."
  const sender = cron.slice(cron.indexOf('async function sendRetention'));
  const body = sender.slice(0, sender.indexOf('\n}'));
  const iWrite = body.indexOf('method: \'PUT\'');
  const iSend = body.indexOf('resend.emails.send');
  ok('the flag is recorded before the email is sent',
     iWrite > -1 && iSend > -1 && iWrite < iSend, `write@${iWrite} < send@${iSend}`);
  ok('  and nothing is sent if the record did not move',
     /if \(!write\.ok\)[\s\S]{0,400}return \{ ok: false/.test(body), 'returns before sending');
  ok('  and the flag is merged, not replaced',
     /mergeRetentionFlag\(user\.retentionEmails, flag, sentAt\)/.test(body), 'merge');

  // ── EXCLUSIONS, IN ONE PLACE, USED BY THE CRON ──────────────────────────
  ok('the exclusion list covers the owner\'s gmail account',
     isExcludedAccount('la.jay06@gmail.com'), 'excluded');
  ok('  every alias of it, so smoke01 and notiftest01 need no naming',
     isExcludedAccount('la.jay06+smoke01@gmail.com') && isExcludedAccount('la.jay06+notiftest01@gmail.com')
     && isExcludedAccount('la.jay06+anything-at-all@gmail.com'), 'all three');
  ok('  gmail\'s dots, which are not significant',
     isExcludedAccount('lajay06@gmail.com') && isExcludedAccount('LA.JAY06@GMAIL.COM'), 'normalized');
  ok('  and the openinvite address', isExcludedAccount('lajay@openinvite.com.au'), 'excluded');
  // THE TRAP THE NAIVE VERSION WOULD HAVE FALLEN INTO. Plus-addressing is
  // common; "contains a plus" would exclude real couples.
  ok('a real couple using plus-addressing is NOT excluded',
     !isExcludedAccount('jay+smoke01@gmail.com') && !isExcludedAccount('ada+la.jay06@gmail.com')
     && !isExcludedAccount('ada+anything@example.com'), 'the base must match exactly');
  ok('  nor a similar address on another domain', !isExcludedAccount('la.jay06@other.com'), 'domain matters');
  ok('  nor a longer local part', !isExcludedAccount('la.jay061@gmail.com'), 'not a prefix match');
  ok('  and an unreadable address is not excluded',
     !isExcludedAccount('') && !isExcludedAccount(null) && !isExcludedAccount('notanemail')
     && !isExcludedAccount('+smoke01@gmail.com'), 'the cron skips those for having nowhere to send');
  ok('the list lives in one place and the cron uses it',
     /import \{ isExcludedAccount \} from '\.\.\/_lib\/excludedAccounts\.js'/.test(cron)
     && /if \(isExcludedAccount\(email\)\) \{/.test(cron), 'imported and applied');
  ok('  before either trial email, not only before the retention ones',
     cron.indexOf('isExcludedAccount(email)') < cron.indexOf('inDay3 ='), 'guards every send');
  ok('  and it is only the two addresses the owner named',
     EXCLUDED_ACCOUNT_ADDRESSES.length === 2, EXCLUDED_ACCOUNT_ADDRESSES.join(', '));

  // ── A FAILED GUEST COUNT IS NOT AN EMPTY GUEST LIST ─────────────────────
  //
  // Treating a failed read as zero would mail a couple who has a hundred
  // guests, which is the worst mistake available here.
  ok('a failed guest count skips the account instead of assuming zero',
     /guestCount = -1/.test(cron) && /if \(guestCount >= 0\)/.test(cron), 'skipped, retried tomorrow');

  // ── THE SHIP DATE IS A CONSTANT, NOT A FIELD, AND NOT RELATIVE TO NOW ───
  ok('the ship date is hardcoded', /^2026-/.test(RETENTION_SHIP_DATE), RETENTION_SHIP_DATE);
  const from = retentionEligibleFrom();
  ok('  and the cutoff is 30 days before it',
     Math.round((new Date(RETENTION_SHIP_DATE) - from) / (24 * HOUR)) === 30, '30 days');
  // IF IT WERE RELATIVE TO NOW the rule would become "older than 30 days"
  // forever, which never stops excluding people. Two different "now"s must
  // give the same verdict for the same account.
  const sameOld = { user: account({ created_date: justInside }), wedding: noSlugWedding, guestCount: 0 };
  ok('  and the verdict does not drift with the clock',
     !!dueRetentionEmail({ ...sameOld, now: NOW }) === !!dueRetentionEmail({ ...sameOld, now: NOW + 200 * 24 * HOUR }),
     'fixed cutoff');

  // ── FOUR SENDS, AND THE FLAG NAMES MATCH THE SCHEMA ─────────────────────
  const declared = JSON.parse(read('base44/entities/User.jsonc').replace(/^\s*\/\/.*$/gm, ''))
    .properties.retentionEmails.properties;
  ok('every send records a flag the User schema declares',
     RETENTION_SENDS.every(s => s.flag in declared), RETENTION_SENDS.map(s => s.flag).join(', '));
  ok('  and the schema declares no flag nothing sends',
     Object.keys(declared).every(k => RETENTION_SENDS.some(s => s.flag === k)), Object.keys(declared).join(', '));

  ok('ageHours reads a date, and refuses what is not one',
     ageHours(signedUp(10), NOW) === 10 && ageHours(null) === null && ageHours('x') === null, '10h');

  return results;
}
