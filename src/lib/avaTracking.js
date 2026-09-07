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
 * ── THREE POINTS, AND THAT IS CHECKABLE ────────────────────────────────────
 *
 * "Three key points should always be there" is only a rule if something can
 * count them. Each point is bolded, so `validateTracking` counts bold spans —
 * exactly three, no more and no fewer — and refuses a percentage outright
 * (spec 5.2). A paragraph that fails is not shown: the authored one is, which
 * is #648's rule in its original form. Ava does not speak when there is
 * nothing to read, and she does not speak badly rather than not at all.
 */
import { parseAvaText } from './avaMarkdown.js';

/** What Ava is asked for. Appended as the couple's turn by buildAvaPrompt. */
export const TRACKING_REQUEST = [
  'Write ONE short paragraph — four sentences at most — on how this wedding is tracking overall.',
  '',
  'It must contain EXACTLY THREE key points and no more. Bold each one with **double asterisks** and nothing else in the paragraph.',
  'Every point must be a real number or date from the wedding context above: how far out the date is, how many guests have not replied, how many things are overdue, when the next event is, or money in dollars.',
  '',
  'NEVER a percentage of anything. NEVER an exclamation mark. NEVER an emoji.',
  'Do not offer to do anything, do not name a vendor to hire, and do not mention heritage, culture or religion.',
  'If part of the wedding could not be read, say which part in the paragraph and still give three points from what you can see.',
].join('\n');

/**
 * @param {string} text
 * @returns {{ok: boolean, points: number, error: string|null}}
 */
export function validateTracking(text) {
  const raw = String(text || '').trim();
  if (!raw) return { ok: false, points: 0, error: 'empty' };
  if (/\d\s*%|\bper ?cent\b/i.test(raw)) return { ok: false, points: 0, error: 'a percentage' };
  if (/!/.test(raw)) return { ok: false, points: 0, error: 'an exclamation mark' };
  // The emoji rule is about PRESENTATION: U+FE0F is the tell, plus the
  // pictographic blocks. ✦ and ✓ are text-presentation marks and stay.
  if (/️|[\u{1F300}-\u{1FAFF}]/u.test(raw)) return { ok: false, points: 0, error: 'an emoji' };
  const points = parseAvaText(raw).filter((t) => t.bold).length;
  if (points !== 3) return { ok: false, points, error: `${points} key point${points === 1 ? '' : 's'}, not three` };
  return { ok: true, points, error: null };
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
export function authoredTracking({ countdown = null, unreplied = 0, overdue = 0, guests = 0, unseen = [] } = {}) {
  const missing = unseen.length
    ? `I could not read your ${unseen.join(' and ')}, so this is not the whole picture. `
    : '';
  const when = countdown ? `**${countdown}**` : '**Your date is not set yet**';
  const replies = guests
    ? `**${unreplied} of ${guests} guests** have not replied`
    : '**No guests on the list yet**';
  const behind = overdue
    ? `**${overdue} thing${overdue === 1 ? '' : 's'} overdue**`
    : '**Nothing overdue**';
  return `${missing}${when}. ${replies}, and ${behind}.`;
}
