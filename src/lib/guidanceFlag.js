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

/** True only when the flag has been deliberately set. Anything else is off. */
export function isGuidanceEnabled() {
  try {
    return localStorage.getItem(GUIDANCE_FLAG_KEY) === 'on';
  } catch {
    return false;
  }
}

/**
 * THE FIELD THE OWNER MUST ADD, named here so it is findable from the code
 * rather than only from a report:
 *
 *   WeddingDetails.guidanceState : object
 *     { tourSeenAt: string|null, dismissed: string[] }
 *
 * `tourSeenAt` is an ISO timestamp, so "has it been shown" and "when" are one
 * field rather than a boolean that loses the answer to the second question.
 * `dismissed` holds the paths whose panel the couple has closed for good.
 *
 * Base44 silently drops undeclared fields, so writing this before the field
 * exists would look like it worked and persist nothing — which is exactly the
 * failure this flag exists to avoid.
 */
export const GUIDANCE_STATE_FIELD = 'guidanceState';
