/**
 * Ava's briefing opens with the day state, and never with a day count.
 *
 * ── THE RULING ─────────────────────────────────────────────────────────────
 *
 * Owner, 2026-10-18: "Ava briefing: lead with the day state, not the
 * countdown. Remove 'how far out the date is' as a lead fact in the prompt and
 * the authored fallback; use the same state words as DayStateHeadline
 * (Overdue, Today, Waiting, Clear). The countdown may appear later in the
 * briefing, never as the headline. Keep the no-percentage rule and its
 * validator."
 *
 * What the briefing used to open with was "99 days until the wedding", which
 * tells a couple the one thing they already know and buries what is actually
 * on them today.
 *
 * ── WHY THE COUNTDOWN IS IN A SENTENCE AND NOT A LEAD ──────────────────────
 *
 * "Never as the headline" would allow a day count as the lead of the third
 * block. It is kept out of every lead instead, because a lead is a heading and
 * a heading that counts days is the same thing the owner objected to, one
 * block further down. The count itself is not lost: the third block prints it.
 *
 * ── WHY THE VALIDATOR IS NARROWER THAN THE PROMPT ──────────────────────────
 *
 * The prompt asks for one of the four words. The validator only refuses a day
 * count in the first lead. Requiring one of the four would force the authored
 * stand-in to name a state when a store did not load, and dayState.js is
 * explicit that a day with a store missing is not a clear day. So the
 * stand-in says what it could not read, and that reply must still pass.
 *
 * ── ONE SOURCE FOR THE FOUR WORDS ──────────────────────────────────────────
 *
 * STATE_BADGE lives in dayState.js and the badge on the page reads from it.
 * avaTracking imports it rather than repeating the strings, so the headline and
 * the badge cannot drift apart.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';
import { authoredTracking, validateTracking, parseTrackingBlocks, TRACKING_REQUEST } from '../../src/lib/avaTracking.js';
import { STATE_BADGE } from '../../src/lib/dayState.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const code = (rel) => stripComments(read(rel));

const FACTS = { countdown: '115 days to go', invitations: 61, invitationsPending: 20, peopleAttending: 40, overdue: 2 };

export async function runBriefingLeadsWithTheState() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  console.log('\n  The briefing opens with the day state, not a countdown:\n');

  // ── THE FOUR WORDS ARE THE BADGE'S OWN ───────────────────────────────────
  ok('the four state words come from dayState, not a second copy',
     /import \{ STATE_BADGE \} from '\.\/dayState\.js'/.test(code('src/lib/avaTracking.js')),
     'imported');
  ok('  and they are the four the owner named',
     JSON.stringify(STATE_BADGE) === JSON.stringify({ overdue: 'Overdue', today: 'Today', waiting: 'Waiting', clear: 'Clear' }),
     JSON.stringify(STATE_BADGE));

  // ── EVERY STATE LEADS WITH ITS OWN WORD ──────────────────────────────────
  for (const state of ['overdue', 'today', 'waiting', 'clear']) {
    const blocks = parseTrackingBlocks(authoredTracking({ ...FACTS, state }));
    ok(`${state} leads with "${STATE_BADGE[state]}"`,
       blocks[0]?.lead === STATE_BADGE[state], blocks[0]?.lead);
    ok(`  and ${state} still passes its own validator`,
       validateTracking(authoredTracking({ ...FACTS, state })).ok,
       validateTracking(authoredTracking({ ...FACTS, state })).error || 'ok');
  }

  // ── NO LEAD ANYWHERE COUNTS DAYS ─────────────────────────────────────────
  const dayCount = (lead) => /\d/.test(lead) && /\bdays?\b/i.test(lead);
  for (const state of ['overdue', 'today', 'waiting', 'clear']) {
    const leads = parseTrackingBlocks(authoredTracking({ ...FACTS, state })).map((b) => b.lead);
    ok(`no lead in the ${state} briefing is a day count`,
       leads.every((l) => !dayCount(l)), leads.join(' | '));
  }

  // ── THE COUNTDOWN IS STILL THERE, IN A SENTENCE ──────────────────────────
  const clear = authoredTracking({ ...FACTS, state: 'clear' });
  ok('the countdown still appears in the briefing',
     clear.includes('115 days to go'), '115 days to go');
  ok('  in a sentence, under a lead that does not count days',
     parseTrackingBlocks(clear).some((b) => b.body.includes('115 days to go') && !dayCount(b.lead)),
     'in the body');

  // ── A STORE THAT DID NOT LOAD IS NOT A STATE ─────────────────────────────
  const unseen = authoredTracking({ unseen: ['the guest list'] });
  ok('nothing read claims no state at all',
     !Object.values(STATE_BADGE).includes(parseTrackingBlocks(unseen)[0]?.lead),
     parseTrackingBlocks(unseen)[0]?.lead);
  ok('  and that reply is still valid, so the stand-in is never worse',
     validateTracking(unseen).ok, validateTracking(unseen).error || 'ok');

  // ── THE BACKSTOP, PROVED RED ON A PLANT ──────────────────────────────────
  const planted = '**115 days to go** That is the horizon.\n**20 of 61 invitations** are still to reply.\n**Clear** Your list is clear.';
  const plantedVerdict = validateTracking(planted);
  ok('PLANT: a day-count headline is refused',
     plantedVerdict.ok === false && plantedVerdict.error === 'a day count as the headline',
     plantedVerdict.error || 'accepted, which is the defect');
  const fixed = planted.replace('**115 days to go** That is the horizon.', '**Clear** Your list is clear for today.');
  ok('  and the same reply with a state headline is accepted',
     validateTracking(fixed).ok, validateTracking(fixed).error || 'ok');

  // ── THE PROMPT ASKS, SO THE BACKSTOP IS NOT THE MECHANISM ────────────────
  ok('the prompt names the four words for the first block',
     /The FIRST block is the day state/.test(TRACKING_REQUEST)
       && /Overdue, Today, Waiting, Clear/.test(TRACKING_REQUEST),
     'TRACKING_REQUEST');
  ok('  and forbids a day count as a lead',
     /NEVER lead a block with a number of days/.test(TRACKING_REQUEST), 'TRACKING_REQUEST');
  ok('  and no longer offers the date as a lead fact',
     !/how far out the date is/.test(TRACKING_REQUEST), 'removed');

  // ── THE HEADLINE AND THE BADGE CANNOT DISAGREE ───────────────────────────
  ok('the page passes resolveDayState its own state, rather than deriving a second one',
     /state: d\.state/.test(code('src/pages/DailyUpdate.jsx')), 'state: d.state');

  // ── WHAT THE OWNER ASKED TO KEEP ─────────────────────────────────────────
  ok('the no-percentage rule is still in the prompt',
     /NEVER a percentage of anything/.test(TRACKING_REQUEST), 'TRACKING_REQUEST');
  ok('  and its validator still refuses one',
     validateTracking('**Clear** 40% are in.\n**A** b.\n**C** d.').error === 'a percentage',
     'a percentage');

  return results;
}
