/**
 * src/lib/avaOfferFilter.js
 *
 * AVA HAS NO PRIVATE POWERS, ENFORCED ON THE OUTPUT AND NOT ONLY IN THE PROMPT.
 *
 * The owner's report: Ava offers to do things she cannot do. "Want me to add
 * this person?" — and there is no adding. Reproduced on a running build: the
 * pod's prompt contains no action mirror at all (no "ACTION:{" anywhere in
 * 2775 characters), it has no ACTION parser and no confirm card, so EVERY offer
 * it makes is unbacked by construction. The modal has the mirror but will still
 * write an offer in prose without emitting an ACTION block, and prose is what
 * the couple reads.
 *
 * A PROMPT INSTRUCTION IS A REQUEST, NOT A GUARANTEE. `mirrorInstructions()`
 * tells Ava what she can do and that is worth doing; it is not worth trusting.
 * The same reasoning that put `validateAvaAction` between the model and the
 * database puts this between the model and the couple's eyes: model output is
 * never trusted onto a surface unchecked.
 *
 * WHAT THIS DOES, AND THE ONE THING IT DELIBERATELY DOES NOT.
 *
 * It removes offer sentences whose action does not resolve to a mirror action,
 * and it replaces them with NOTHING. Not with an apology, not with "I cannot do
 * that" — the couple did not ask for the offer, so an explanation of why the
 * offer is gone is noise about our internals. The rest of the answer stands.
 *
 * It does NOT try to verify that a KEPT offer will succeed. That is
 * validateAvaAction's job at confirm time, and duplicating it here would put
 * two half-copies of the schema in two files.
 *
 * FALSE POSITIVES ARE THE COST AND THEY ARE THE RIGHT COST. A sentence like
 * "I can see nine guests without an email" reads as an offer to a regex; it is
 * excluded explicitly (see PERCEPTION below) because "I can see" is perception,
 * not proposal. Beyond that, an over-eager filter drops a sentence Ava was
 * allowed to say. An under-eager one promises the couple something that will
 * never happen. The first is a worse answer; the second is a lie.
 */
import { ACTION_MIRROR } from './avaRequest.js';

/**
 * Sentence openings that PROPOSE. Deliberately a list of forms rather than a
 * clever general rule: each of these was written down because it is a way Ava
 * actually opens an offer.
 */
const OFFER_RE = /\b(want me to|shall i|should i|would you like me to|do you want me to|i can|i could|let me|i'?ll|i will|happy to)\b/i;

/**
 * THE OTHER WAY AVA OPENS AN OFFER, and the one that got through.
 *
 * Owner report: "Set the flowers allocation to $3,500" produced "here is the
 * proposal to update that allocation" and no card. Two things were wrong and
 * this is the first — the sentence proposes an action in every sense that
 * matters to a reader, and OFFER_RE did not contain a single one of its words,
 * so isOffer() said false, the filter never looked for a backing action, and
 * the prose promised something with no button under it.
 *
 * Kept separate from OFFER_RE rather than bolted onto it because these are
 * NOUN forms — the offer is the sentence's subject, not its verb — and the
 * next one to bite will be a noun too.
 *
 * IT OVER-REACHES, KNOWINGLY. "The proposal to move the ceremony came from
 * your planner" reads as an offer to this pattern and is not one, so it would
 * be dropped. That is this file's stated trade already: an over-eager filter
 * loses a sentence Ava was allowed to say; an under-eager one promises the
 * couple something that will never happen. The first is a worse answer, the
 * second is a lie. Written down here so the next reader knows the cost was
 * counted rather than missed.
 */
const PROPOSAL_RE = /\b(here (?:is|are)|here'?s) (?:the |a |my |an )?(?:proposal|suggestion|change|update|draft)\b|\bproposal to\b|\bmy proposal\b/i;

/**
 * PERCEPTION, NOT PROPOSAL. "I can see", "I can tell" and friends open a
 * sentence about what Ava reads, which she is not only allowed but required to
 * do. Without this the filter eats her best sentences.
 */
const PERCEPTION_RE = /\bi can (see|tell|find|read|show you|confirm)\b/i;

/** Split into sentences, keeping the delimiter so the text reassembles exactly. */
export function splitSentences(text) {
  const out = [];
  let buf = '';
  for (const ch of String(text ?? '')) {
    buf += ch;
    if (ch === '.' || ch === '?' || ch === '!' || ch === '\n') { out.push(buf); buf = ''; }
  }
  if (buf) out.push(buf);
  return out;
}

/** True if this sentence proposes to DO something rather than to report something. */
export function isOffer(sentence) {
  const s = String(sentence);
  if (PERCEPTION_RE.test(s)) return false;
  return OFFER_RE.test(s) || PROPOSAL_RE.test(s);
}

/** The mirror action an offer sentence resolves to, or null if it resolves to none. */
export function resolveOffer(sentence, mirror = ACTION_MIRROR) {
  for (const action of mirror) {
    if (action.offer && action.offer.test(sentence)) return action;
  }
  return null;
}

/**
 * Remove every offer sentence that no mirror action backs.
 *
 * @param {string} text    Ava's answer, after ACTION blocks have been parsed out
 * @param {Array}  mirror  the action mirror in force for this frame
 * @returns {{ text: string, removed: string[], kept: string[] }}
 */
export function filterUnbackedOffers(text, mirror = ACTION_MIRROR) {
  const removed = [];
  const kept = [];
  const out = splitSentences(text).filter((sentence) => {
    if (!isOffer(sentence)) return true;
    const action = resolveOffer(sentence, mirror);
    if (action) { kept.push(sentence.trim()); return true; }
    removed.push(sentence.trim());
    return false;
  }).join('');

  // Removing a sentence from the middle leaves two spaces, and removing the
  // last one leaves a trailing space before a newline. Tidy, but never reflow:
  // the sentences that survive are exactly the sentences Ava wrote.
  const tidied = out.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return { text: tidied, removed, kept };
}
