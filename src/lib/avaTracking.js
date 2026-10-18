/**
 * src/lib/avaTracking.js — THE "HOW ARE WE TRACKING" PARAGRAPH.
 *
 * Owner: "The second pillar with Ava's briefing used to have really good
 * information about how we are tracking overall but as a paragraph. Three key
 * points should always be there."
 *
 * ── THIS IS THE ONE PLACE ON THE PAGE A MODEL WRITES ───────────────────────
 *
 * The topic sentence at the top is arithmetic, because Overall renders the
 * same string and two pages cannot share a sentence a model rewrites on every
 * load. This paragraph is different: it is prose about a whole wedding, it
 * appears once, and nothing else depends on its exact words.
 *
 * It goes through buildAvaPrompt like every other Ava request, so the voice
 * prohibitions, the wedding context and the mirror all apply without a second
 * copy of any of them.
 *
 * ── THREE BLOCKS, NOT THREE POINTS IN A PARAGRAPH ──────────────────────────
 *
 * Owner: "The briefing is better however you have three points in one
 * paragraph. They should be their own points." So each is its own block — a
 * bold lead phrase of at most six words, then one plain sentence — and the
 * validator requires exactly that shape, three times.
 *
 * "Always" is only a rule if something can count them. A block that is a bare
 * sentence, a fourth block, a lead of nine words, a percentage, a person count
 * paired with the word "replied" — each fails, and a reply that fails is not
 * shown. The authored fallback is in the same shape, so the stand-in can never
 * be worse than what it stands in for. That is #648 in its original form: Ava
 * does not speak when there is nothing to read, and she does not speak badly
 * rather than not at all.
 */

import { STATE_BADGE } from './dayState.js';

/** What Ava is asked for. Appended as the couple's turn by buildAvaPrompt. */
export const TRACKING_REQUEST = [
  'Write a short briefing on how this wedding is tracking overall.',
  '',
  'Write EXACTLY THREE separate blocks, one per line, and no more.',
  'Each block is a bold lead phrase of at most six words in **double asterisks**, then ONE plain sentence after it on the same line.',
  'The lead phrase is a heading. It ends with no punctuation at all — no colon, no dash, no full stop.',
  'Every block must be built on a real number or date from the wedding context above: how many guests have not replied, how many things are overdue, when the next event is, or money in dollars.',
  '',
  'The FIRST block is the day state, and its lead phrase is exactly one of these four words: Overdue, Today, Waiting, Clear. It is the same word the badge on the page shows.',
  'NEVER lead a block with a number of days. The day count may appear inside a sentence, never as a lead phrase.',
  '',
  'NEVER a percentage of anything. NEVER an exclamation mark. NEVER an emoji.',
  'Do not offer to do anything, do not name a vendor to hire, and do not mention heritage, culture or religion.',
  'REPLIES ARE COUNTED PER INVITATION and ATTENDANCE PER PERSON. Never say that a number of guests or people "have not replied" — that count is invitations.',
  'If part of the wedding could not be read, say which part and still give three blocks from what you can see.',
].join('\n');

const LEAD_WORD_CAP = 6;

/**
 * Split a reply into blocks. One block per non-empty line, each expected to be
 * `**Lead phrase** Then one sentence.`
 *
 * @param {string} text
 * @returns {Array<{lead:string, body:string}>}
 */
/**
 * A LEAD IS A HEADING, AND A HEADING DOES NOT END IN A COLON.
 *
 * The owner's walk-through: "99 days until the wedding:" and "61 invitations:"
 * — a colon dangling off a bold line with the sentence on the line below it.
 *
 * It is stripped here rather than only asked for in the prompt because the
 * prompt cannot enforce anything. A model handed "a bold lead phrase, then one
 * plain sentence" punctuates the lead the way it would in prose, and it is
 * right to in prose; the page is what makes it a heading. The instruction is
 * added too, so the usual case never needs the strip, but the page is correct
 * even on the reply that ignores it.
 *
 * Only a colon, and only a trailing one. A lead that reads "Two weeks: the
 * caterer" is not a shape the prompt asks for, and nothing here rewrites the
 * middle of a sentence.
 */
function dropColon(s) {
  return String(s || '').trim().replace(/\s*:+$/, '');
}

/**
 * The same colon, on the other side of the asterisks. A model writing
 * `**99 days until the wedding**: you are on track.` puts it at the head of
 * the body instead, where it reads as a stray mark opening the sentence.
 */
function dropLeadingColon(s) {
  return String(s || '').trim().replace(/^:+\s*/, '');
}

export function parseTrackingBlocks(text) {
  return String(text || '')
    .split(/\n+/)
    // A LIST MARKER, BUT NEVER THE BOLD. `[-*\u2022]` ate the first asterisk of
    // `**Lead**`, so every well-formed block parsed as a bare sentence and the
    // authored fallback failed its own validator. A single `*` is a bullet; a
    // doubled one is the lead.
    .map((line) => line.trim().replace(/^(?:[-\u2022]|\*(?!\*))\s*/, ''))
    .filter(Boolean)
    .map((line) => {
      const m = /^\*\*(.+?)\*\*\s*(.*)$/.exec(line);
      return m ? { lead: dropColon(m[1]), body: dropLeadingColon(m[2]) } : { lead: '', body: line.trim() };
    });
}

/**
 * @param {string} text
 * @returns {{ok: boolean, blocks: Array, error: string|null}}
 */
export function validateTracking(text) {
  const raw = String(text || '').trim();
  if (!raw) return { ok: false, blocks: [], error: 'empty' };
  if (/\d\s*%|\bper ?cent\b/i.test(raw)) return { ok: false, blocks: [], error: 'a percentage' };
  if (/!/.test(raw)) return { ok: false, blocks: [], error: 'an exclamation mark' };
  // The emoji rule is about PRESENTATION: U+FE0F is the tell, plus the
  // pictographic blocks. ✦ and ✓ are text-presentation marks and stay.
  if (/️|[\u{1F300}-\u{1FAFF}]/u.test(raw)) return { ok: false, blocks: [], error: 'an emoji' };

  const blocks = parseTrackingBlocks(raw);
  if (blocks.length !== 3) {
    return { ok: false, blocks, error: `${blocks.length} block${blocks.length === 1 ? '' : 's'}, not three` };
  }
  const bare = blocks.find((b) => !b.lead);
  if (bare) return { ok: false, blocks, error: 'a block with no bold lead' };
  const longLead = blocks.find((b) => b.lead.split(/\s+/).length > LEAD_WORD_CAP);
  if (longLead) return { ok: false, blocks, error: `a lead of ${longLead.lead.split(/\s+/).length} words` };
  const noBody = blocks.find((b) => !b.body);
  if (noBody) return { ok: false, blocks, error: 'a lead with no sentence under it' };

  // THE HEADLINE IS A STATE, NOT A COUNTDOWN (owner ruling 2026-10-18). The
  // briefing used to open with "99 days until the wedding", which tells a
  // couple the one thing they already know and buries what is actually on
  // them today. The prompt asks for the state word; this is the backstop, and
  // it is deliberately narrower than the prompt: it rejects a day count in
  // the FIRST lead rather than requiring one of the four words, because when
  // a store could not be read there is no honest state to name and the
  // authored stand-in says so instead.
  const headline = blocks[0].lead;
  if (/\d/.test(headline) && /\bdays?\b/i.test(headline)) {
    return { ok: false, blocks, error: 'a day count as the headline' };
  }

  // THE NUMBERS RULING, enforced in the copy: replies are per INVITATION.
  // A sentence that pairs a person count with "replied" is the 94-vs-61 defect
  // said out loud, and it is the one thing a model is most likely to get wrong
  // because both numbers are in its context.
  const mixed = blocks.find((b) => /\b(guests?|people|attending|coming)\b[^.]*\b(replied|reply|rsvp)/i.test(`${b.lead} ${b.body}`));
  if (mixed) return { ok: false, blocks, error: 'a person count paired with "replied" — replies are per invitation' };

  return { ok: true, blocks, error: null };
}

/**
 * THE PARAGRAPH WHEN THERE IS NOTHING TO ASK ABOUT, or when what came back
 * failed the check. Authored, three points, from the same numbers.
 *
 * @param {object} facts
 * @param {string|null} facts.state      resolveDayState's own state, when the caller has it
 * @param {string|null} facts.countdown  e.g. "115 days to go"
 * @param {number} facts.unreplied
 * @param {number} facts.overdue
 * @param {number} facts.guests
 * @param {string[]} facts.unseen
 */
export function authoredTracking({ state = null, countdown = null, invitationsPending = 0, invitations = 0, peopleAttending = 0, overdue = 0, unseen = [] } = {}) {
  const missing = unseen.length ? ` I could not read your ${unseen.join(' and ')}, so this is not the whole picture.` : '';

  // THE FIRST BLOCK IS THE DAY STATE. `state` is resolveDayState's own answer
  // when the caller has it, so the headline and the badge on the page cannot
  // disagree. When it is absent the state is derived from the same counts this
  // function already receives, which is why mobile leads with a state too
  // without passing anything new. A derived state can never be 'today':
  // that needs the due-today and events-today counts, which are not facts
  // here, so only the authoritative value produces it.
  //
  // A STORE THAT DID NOT LOAD IS NOT A CLEAR DAY (dayState.js says the same
  // about the badge). When anything is unseen there is no state to claim, so
  // the headline says that rather than naming one.
  const resolved = state || (overdue > 0 ? 'overdue' : invitationsPending > 0 ? 'waiting' : 'clear');
  const STATE_SENTENCE = {
    overdue: `${overdue} thing${overdue === 1 ? '' : 's'} ${overdue === 1 ? 'is' : 'are'} past ${overdue === 1 ? 'its' : 'their'} date, at the top of This week.`,
    today: 'What is due today is at the top of This week.',
    // The count itself belongs to the replies block below, which already
    // prints it. Saying it twice is the briefing repeating itself.
    waiting: 'Nothing is on you today, and the replies are what the list is waiting on.',
    clear: 'Your list is clear for today.',
  };
  const when = unseen.length
    ? `**One part is missing**${missing}`
    : `**${STATE_BADGE[resolved]}** ${STATE_SENTENCE[resolved]}`;
  // INVITATIONS for replies, PEOPLE for attendance — never the other way round.
  const replies = invitations
    ? `**${invitationsPending} of ${invitations} invitations** are still to reply, and ${peopleAttending} ${peopleAttending === 1 ? 'guest is' : 'guests are'} confirmed as coming.`
    : '**No invitations sent yet** Adding your guest list is what starts the replies.';
  // The countdown still appears, and never as a heading (owner ruling
  // 2026-10-18). A couple knows how far out their date is; the headline is
  // for what is on them today.
  const date = countdown
    ? `**The date** ${countdown}, and everything else is measured against it.`
    : '**Your date is not set yet** Everything else is easier to judge once it is.';
  return [when, replies, date].join('\n');
}
