/**
 * src/lib/guestRecognition.js
 *
 * One place for the recognised guest's RSVP token on the guest site.
 *
 * WHY IT EXISTS. The couple's site is the invitation: a guest arrives from
 * their emailed link, replies on the RSVP tab, and keeps using the site for
 * months — travel, timings, playlist, photos. Recognition is what lets the RSVP
 * tab be *their* form instead of an email box asking who they are.
 *
 * ── localStorage, DELIBERATELY NOT sessionStorage ───────────────────────────
 * The website password next door uses sessionStorage and should keep doing so:
 * it is the COUPLE'S shared secret, short-lived by design, and a tab-scoped
 * cache is the right lifetime for it.
 *
 * This is a different thing with a different lifetime. It is the GUEST'S OWN
 * identity, and they will come back days or weeks after replying. sessionStorage
 * dies with the tab, so every return visit would show a recognised guest the
 * stranger's email bridge — reintroducing the exact defect this work exists to
 * fix, just later in the timeline.
 *
 * Do not "harmonise" these two. Different things, different lifetimes.
 *
 * ── The token still travels in a URL once ───────────────────────────────────
 * Recognition is seeded from `?rsvp=<token>`, consumed on arrival and stripped
 * from the address bar with history.replaceState before any navigation or
 * subresource fetch, so it cannot leak through a Referer header.
 *
 * The honest limitation: that ONE request still carries the token in its URL,
 * so it reaches server access logs. This is not a regression — /rsvp/:token has
 * always been URL-borne, and there the token PERSISTS in the address bar, in
 * history, and in the Referer of everything the page loads. Consume-and-strip
 * is strictly better than the status quo it replaces.
 *
 * The upgrade is an HttpOnly cookie, POST-LAUNCH, and its true cost is recorded
 * here so nobody half-builds it: a cookie is only a real gain if the seven
 * endpoints sharing resolveGuestByToken read the token SERVER-SIDE from the
 * cookie instead of receiving it from the client. A non-HttpOnly cookie buys
 * nothing over localStorage — same reachability from script, same XSS exposure.
 */

const KEY_PREFIX = 'oi_rsvp_';
const PARAM = 'rsvp';

const keyFor = (slug) => KEY_PREFIX + slug;

/**
 * @param {string} slug
 * @returns {string} the recognised guest's token, or '' when nobody is
 *   recognised. Never null, so callers can branch on truthiness alone.
 */
export function getRecognisedToken(slug) {
  if (!slug || typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(keyFor(slug)) || '';
  } catch {
    // Private mode and storage-disabled browsers throw on access. A guest who
    // cannot be remembered simply uses the email bridge; that is a supported
    // state, not an error worth surfacing.
    return '';
  }
}

/**
 * Consume `?rsvp=<token>` from the current URL: store it, then remove it from
 * the address bar BEFORE anything else can navigate or fetch a subresource.
 *
 * Call this as early as the guest site mounts. Returns the token when one was
 * consumed so the caller can react on the same tick, or '' when there was none.
 */
export function consumeTokenFromUrl(slug) {
  if (!slug || typeof window === 'undefined') return '';
  let token = '';
  try {
    const url = new URL(window.location.href);
    token = url.searchParams.get(PARAM) || '';
    if (!token) return '';

    localStorage.setItem(keyFor(slug), token);

    // Strip FIRST, and synchronously. Anything that navigates or loads a
    // subresource after this point sends a Referer without the token in it.
    url.searchParams.delete(PARAM);
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  } catch {
    // Storage refused, or an exotic URL. The token is still returned so the
    // visit works; it simply will not be remembered for the next one.
  }
  return token;
}

/**
 * Forget the recognised guest. This is the shared-phone and family-computer
 * answer, and it does more work now that the key outlives the tab — so the
 * control that calls it has to be genuinely visible, not buried in a footer.
 *
 * Clearing must be COMPLETE: there is exactly one copy of the token, this key,
 * and nothing else caches it. If a second copy is ever introduced, it clears
 * here or "not you?" becomes a lie.
 */
export function forgetRecognisedGuest(slug) {
  if (!slug || typeof window === 'undefined') return;
  try {
    localStorage.removeItem(keyFor(slug));
  } catch { /* nothing to clear if storage is unavailable */ }
}
