/**
 * src/lib/guidanceFlag.js — the guidance system is off until someone turns it on.
 *
 * ── WHY A FLAG AT ALL ──────────────────────────────────────────────────────
 *
 * Round two, item 17: "Build the panel, the tour, the content for every page,
 * and the control, behind a flag defaulting off."
 *
 * The reason is in the item itself. The tour is shown ONCE and the panels are
 * dismissed ONE AT A TIME, and both of those facts have to be remembered per
 * couple — which needs a `guidanceState` field on WeddingDetails that only the
 * owner can add. Until it exists, a tour that "shows once" would show on every
 * load, and a dismissed panel would come back on the next navigation. Shipping
 * that on is worse than shipping nothing.
 *
 * ── HOW IT IS TURNED ON ────────────────────────────────────────────────────
 *
 * `localStorage['oi_guidance']` set to 'on'. Per browser, not per couple, and
 * deliberately so: this is for the owner to look at what has been built, not a
 * setting a couple is meant to find. When the field exists, this file is the
 * one place to change — the flag becomes the stored state, and nothing that
 * reads isGuidanceEnabled() has to move.
 *
 * ── THE READ IS WRAPPED, BECAUSE localStorage THROWS ───────────────────────
 *
 * In a private window, with site data blocked, and inside the render harness,
 * the accessor itself can throw rather than return null. An exception here
 * would take out whatever page the control sits on, which is a much worse
 * failure than the flag reading false.
 */

export const GUIDANCE_FLAG_KEY = 'oi_guidance';

/**
 * ON BY DEFAULT SINCE 2026-09-26, because the field it was waiting for exists.
 *
 * The flag was off because the tour is shown ONCE and a panel is dismissed ONE
 * AT A TIME, and both facts have to be remembered per couple. Without
 * WeddingDetails.guidanceState a tour that "shows once" showed on every load.
 * The owner declared the field on 2026-09-25, so the guarantee is keepable and
 * the default flips.
 *
 * THE FLAG STAYS, as an off switch rather than an on switch: 'off' turns the
 * whole system back off in one browser without a deploy. Anything else — unset,
 * junk, a storage read that throws — is on, so the default does not depend on
 * storage being readable.
 */
export function isGuidanceEnabled() {
  try {
    return localStorage.getItem(GUIDANCE_FLAG_KEY) !== 'off';
  } catch {
    return true;
  }
}

/**
 * THE FIELD, DECLARED LIVE 2026-09-25 and mirrored under RULE 12:
 *
 *   WeddingDetails.guidanceState : object
 *     { tourSeenAt: string|null, dismissed: string[] }
 *
 * `tourSeenAt` is an ISO timestamp, so "has it been shown" and "when" are one
 * field rather than a boolean that loses the answer to the second question.
 * `dismissed` holds the paths whose panel the couple has closed for good.
 *
 * Base44 silently drops undeclared fields, which is why nothing wrote it until
 * it existed. src/lib/guidanceState.js owns the reads and the transitions;
 * src/hooks/useGuidanceState.js owns the round trip.
 */
export const GUIDANCE_STATE_FIELD = 'guidanceState';
