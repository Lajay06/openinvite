/**
 * src/lib/giftClaimReturn.js
 *
 * GETTING A COUPLE BACK TO THEIR GIFT AFTER THEY SIGN IN OR SIGN UP.
 * Gifting v2. The owner's live run on gift-test (2026-10-13) found the claim
 * never happened for a new account: Open your gift sent them to
 * /login?next=/gift/claim/<token>?go=1, the "Create one" link on that page
 * went to a bare /register (src/pages/Login.jsx), the code was verified, and
 * Register sent them to /choose-plan with no next, so ChoosePlan had no gift
 * to return to and showed the plan picker.
 *
 * Two things now carry the gift through every route in, so that a new account
 * by email code, a new account by Google, an existing account logging in, and
 * an account already signed in all land on the claim:
 *
 *   1. ?next= travels on every link between the two auth pages, both ways,
 *      and the claim page sends a signed-out couple to Create account.
 *   2. A pending claim is remembered in this browser for an hour, so a route
 *      that drops the query (a provider round trip, the couple wandering off
 *      to another page and back to sign in) still returns to the gift.
 *      ChoosePlan reads it; the claim page clears it once the gift is claimed
 *      or found used.
 */

export const PENDING_GIFT_CLAIM_KEY = 'oi_pending_gift_claim';
const TTL_MS = 60 * 60 * 1000;

/** Is this path a gift claim link (with or without its ?go=1)? */
export const isGiftClaimPath = (path) => /^\/gift\/claim\/[A-Za-z0-9_.-]+(\?go=1)?$/.test(String(path || ''));

/** The claim to come back to, with ?go=1 so the claim page claims on return. */
export const claimReturnPath = (token) => `/gift/claim/${token}?go=1`;

export function rememberPendingClaim(path, now = Date.now()) {
  if (!isGiftClaimPath(path)) return;
  try { localStorage.setItem(PENDING_GIFT_CLAIM_KEY, JSON.stringify({ path, at: now })); } catch { /* the query still carries it */ }
}

/** The remembered claim, if one is pending and under an hour old. */
export function pendingClaimPath(now = Date.now()) {
  try {
    const raw = localStorage.getItem(PENDING_GIFT_CLAIM_KEY);
    if (!raw) return null;
    const { path, at } = JSON.parse(raw);
    if (!isGiftClaimPath(path) || !(now - at < TTL_MS)) { localStorage.removeItem(PENDING_GIFT_CLAIM_KEY); return null; }
    return path;
  } catch {
    return null;
  }
}

export function clearPendingClaim() {
  try { localStorage.removeItem(PENDING_GIFT_CLAIM_KEY); } catch { /* nothing to clear */ }
}

/**
 * The words on Create account when a gift is waiting (owner ruling
 * 2026-10-13), verbatim. "Log in" in `line` is the link that switches to the
 * log-in form, keeping the gift.
 */
export const GIFT_AUTH = {
  heading: 'Your gift is waiting.',
  lineBefore: 'Create your account to open it. Already have one? ',
  linkText: 'Log in',
  lineAfter: ' instead.',
};
