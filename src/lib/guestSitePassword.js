/**
 * src/lib/guestSitePassword.js
 *
 * One place for the guest site's cached website password.
 *
 * MultiPageWeddingWebsite.jsx caches the password a guest successfully
 * unlocked with, per slug, in sessionStorage. Every guest-facing endpoint
 * that consults the website password gate needs to replay it, so reading that
 * cache belongs in one helper rather than being re-derived — the key name is
 * an implementation detail, and six endpoints hard-coding `'wb_pw_' + slug`
 * is how they drift apart.
 *
 * The cache itself is deliberate, not incidental: the client must submit
 * something the server can check on every navigation, so it has to hold the
 * plaintext somewhere. It is tab-scoped and cleared on close, an XSS able to
 * read it is already executing inside the content the gate protects, and it
 * is a shared event password with no reuse value elsewhere. Recorded with the
 * write site in MultiPageWeddingWebsite.jsx (advisor decision, 2026-08-17).
 */

const KEY_PREFIX = 'wb_pw_';

/**
 * @param {string} slug
 * @returns {string} the cached password, or '' when there is none. Never null,
 *   so callers can pass it straight into a request body without a guard.
 */
export function getCachedWeddingPassword(slug) {
  if (!slug || typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem(KEY_PREFIX + slug) || '';
  } catch {
    // Private-mode / storage-disabled browsers throw on access. A guest who
    // cannot cache simply re-enters the password; that is not an error worth
    // surfacing here.
    return '';
  }
}
