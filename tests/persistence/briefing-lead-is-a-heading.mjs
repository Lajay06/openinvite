/**
 * Ava's briefing: a lead is a heading, and a heading does not end in a colon.
 *
 * ── WHAT THE OWNER SAW ─────────────────────────────────────────────────────
 *
 * On Daily update, under "Ava's briefing", the bold lines read
 * "99 days until the wedding:" and "61 invitations:" — a colon left hanging
 * at the end of a heading with its sentence on the line below.
 *
 * ── WHY IT WAS NOT IN ANY STRING ───────────────────────────────────────────
 *
 * Nothing in the repository writes those words. The briefing is a model reply
 * shaped by TRACKING_REQUEST and split by parseTrackingBlocks into
 * `{ lead, body }`, and DailyUpdate renders the lead as its own bold line. A
 * model asked for "a bold lead phrase, then one plain sentence" punctuates the
 * lead the way prose punctuates a lead-in — with a colon — because nothing told
 * it the two halves would be on separate lines. The authored fallback
 * (authoredTracking) never had one, which is why the colon only appeared on
 * the weddings Ava actually spoke about.
 *
 * ── WHY THE FIX IS IN THE PARSER, NOT ONLY THE PROMPT ──────────────────────
 *
 * A prompt is a request. This guard asserts the prompt asks, AND that the
 * parser is correct on a reply that did not listen — including the variant
 * where the model puts the colon outside the asterisks, where it lands at the
 * head of the body instead.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';
import { parseTrackingBlocks, validateTracking, authoredTracking, TRACKING_REQUEST } from '../../src/lib/avaTracking.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = (p) => resolve(__dir, '../../', p);
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const DAILY = strip(readFileSync(root('src/pages/DailyUpdate.jsx'), 'utf8'));

export async function runBriefingLeadIsAHeading() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Ava’s briefing — a lead is a heading, not a lead-in:\n');

  // ── The exact two the owner quoted ────────────────────────────────────────
  const owner = parseTrackingBlocks([
    '**99 days until the wedding:** That is the horizon everything else is measured against.',
    '**61 invitations:** are still to reply, and 40 guests are confirmed as coming.',
    '**Nothing waiting on you:** Your list is clear for today.',
  ].join('\n'));
  check('"99 days until the wedding:" loses its colon', owner[0].lead === '99 days until the wedding', owner[0].lead);
  check('"61 invitations:" loses its colon', owner[1].lead === '61 invitations', owner[1].lead);
  check('  and so does the third', owner[2].lead === 'Nothing waiting on you', owner[2].lead);
  check('  the sentences under them are untouched',
    owner[0].body === 'That is the horizon everything else is measured against.', owner[0].body);

  // ── The colon outside the asterisks ───────────────────────────────────────
  const outside = parseTrackingBlocks('**Two weeks out**: the caterer needs numbers.');
  check('a colon outside the bold does not open the sentence instead',
    outside[0].lead === 'Two weeks out' && outside[0].body === 'the caterer needs numbers.',
    `${outside[0].lead} / ${outside[0].body}`);

  // ── Only the trailing one, and only a colon ───────────────────────────────
  const mid = parseTrackingBlocks('**Two weeks: the caterer** Numbers are due.');
  check('a colon inside the phrase is left where it is', mid[0].lead === 'Two weeks: the caterer', mid[0].lead);
  const dash = parseTrackingBlocks('**Two weeks out —** Numbers are due.');
  check('nothing else is stripped — an em dash is the model’s business, not the parser’s',
    dash[0].lead === 'Two weeks out —', dash[0].lead);
  const many = parseTrackingBlocks('**Ready::** Everything is booked.');
  check('a doubled colon goes too', many[0].lead === 'Ready', many[0].lead);

  // ── Nothing that was already right changes ────────────────────────────────
  const clean = parseTrackingBlocks('**115 days to go** That is the horizon.');
  check('a lead with no colon is passed through unchanged', clean[0].lead === '115 days to go', clean[0].lead);
  const authored = parseTrackingBlocks(authoredTracking({ countdown: '115 days to go', invitations: 61, invitationsPending: 20, peopleAttending: 40, overdue: 2 }));
  check('the authored fallback still parses into three leads with no colons',
    authored.length === 3 && authored.every((b) => b.lead && !/:$/.test(b.lead)),
    authored.map((b) => b.lead).join(' | '));
  check('  and still passes its own validator',
    validateTracking(authoredTracking({ countdown: '115 days to go', invitations: 61, invitationsPending: 20, peopleAttending: 40, overdue: 2 })).ok,
    'ok');

  // ── The prompt asks, so the strip is the backstop and not the mechanism ───
  check('the prompt tells the model the lead is a heading with no punctuation',
    /The lead phrase is a heading\. It ends with no punctuation at all/.test(TRACKING_REQUEST), 'TRACKING_REQUEST');

  // ── The lead really is rendered as its own line ───────────────────────────
  check('DailyUpdate renders the lead on its own line above the sentence',
    /\{b\.lead\}/.test(DAILY) && /\{b\.body\}/.test(DAILY), 'two paragraphs');

  return results;
}
