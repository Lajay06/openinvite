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

/** What Ava is asked for. Appended as the couple's turn by buildAvaPrompt. */
export const TRACKING_REQUEST = [
  'Write a short briefing on how this wedding is tracking overall.',
  '',
  'Write EXACTLY THREE separate blocks, one per line, and no more.',
  'Each block is a bold lead phrase of at most six words in **double asterisks**, then ONE plain sentence after it on the same line.',
  'Every block must be built on a real number or date from the wedding context above: how far out the date is, how many guests have not replied, how many things are overdue, when the next event is, or money in dollars.',
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
      return m ? { lead: m[1].trim(), body: m[2].trim() } : { lead: '', body: line };
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
 * @param {string|null} facts.countdown  e.g. "115 days to go"
 * @param {number} facts.unreplied
 * @param {number} facts.overdue
 * @param {number} facts.guests
 * @param {string[]} facts.unseen
 */
export function authoredTracking({ countdown = null, invitationsPending = 0, invitations = 0, peopleAttending = 0, overdue = 0, unseen = [] } = {}) {
  const missing = unseen.length ? ` I could not read your ${unseen.join(' and ')}, so this is not the whole picture.` : '';
  const when = countdown
    ? `**${countdown}** That is the horizon everything else is measured against.${missing}`
    : `**Your date is not set yet** Everything else is easier to judge once it is.${missing}`;
  // INVITATIONS for replies, PEOPLE for attendance — never the other way round.
  const replies = invitations
    ? `**${invitationsPending} of ${invitations} invitations** are still to reply, and ${peopleAttending} ${peopleAttending === 1 ? 'guest is' : 'guests are'} confirmed as coming.`
    : '**No invitations sent yet** Adding your guest list is what starts the replies.';
  const work = overdue
    ? `**${overdue} thing${overdue === 1 ? '' : 's'} to pick up** They are at the top of This week, in order.`
    : '**Nothing waiting on you** Your list is clear for today.';
  return [when, replies, work].join('\n');
}
