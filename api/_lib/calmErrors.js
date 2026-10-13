/**
 * api/_lib/calmErrors.js
 *
 * THE TWO SENTENCES 65 ENDPOINTS USED TO REPEAT, WORDED ONCE.
 *
 * ── WHY THEY ARE HERE AND NOT TYPED OUT ───────────────────────────────────
 *
 * The rate-limit refusal and the catch-all 500 appeared 73 times across api/,
 * and not identically: the rate limiter had TWO wordings, one with "and try
 * again" and one without, split along no line anyone had drawn. A sentence
 * repeated 37 times is a sentence nobody can reword, which is how both carried
 * an em dash long after the ruling barring them.
 *
 * Owner wording 2026-10-13, and the one decision worth recording: the two
 * rate-limit variants become ONE, with no deliberate difference between a guest
 * hitting a limit and a service being busy. The person reading it is in the same
 * position either way.
 *
 * ── WHAT THESE ARE NOT ────────────────────────────────────────────────────
 *
 * Not a catalogue of every api/ message. A refusal that tells the person
 * something specific (no address yet, that email will not reach you, this
 * invitation is not ours) belongs at its own call site, where the condition is
 * visible. These two are here because they say nothing specific by design, and
 * because saying nothing specific 73 times in 73 different ways is worse than
 * saying it once.
 *
 * ── AND NO EXCEPTION TEXT ─────────────────────────────────────────────────
 *
 * DID_NOT_GO_THROUGH is what a caught exception turns into. The exception
 * itself is logged, never returned: owner ruling the same day, after a giver was
 * shown "APP_ENC_KEY is not set..." because an endpoint echoed err.message.
 * scripts/test-api-response-safety.mjs holds that rule for every endpoint.
 */

/** Rate limited. One wording for every caller, by owner ruling. */
export const TOO_MANY_TRIES = 'Too many tries in a row. Wait a moment and try again.';

/** The catch-all 500. Matches the gift flow's line exactly. */
export const DID_NOT_GO_THROUGH = 'That did not go through. Try again in a moment.';
