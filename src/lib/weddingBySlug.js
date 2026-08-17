/**
 * src/lib/weddingBySlug.js
 *
 * Shared client-side helper for the anonymous guest site's wedding lookup.
 * Replaces every direct client-side base44.entities.WeddingDetails.list()/
 * .filter({slug}) call in the guest-facing tree with a call to
 * /api/wedding-by-slug, which resolves the wedding using the server-side
 * admin key and returns only an explicit allowlist of guest-safe fields
 * (see api/_lib/guestSafeWedding.js) — never websitePassword,
 * emergencyContacts, dayVendorContacts, or any other couple-private field.
 */

/**
 * @param {string} slug
 * @param {string} [password] — candidate password, if the caller already
 *   has one cached from a prior successful unlock this session. Supplying it
 *   switches the request to POST so the credential never appears in a URL.
 * @param {boolean} [preview] — true for the couple's own dashboard preview
 *   links (?preview=true), which skip the password gate. The server honors
 *   this ONLY for an authenticated caller who owns the wedding, so the
 *   couple's bearer token is sent alongside it. A guest has no token; for
 *   them the flag is ignored server-side and the gate stays up.
 * @returns {Promise<{passwordProtected: boolean, [field: string]: any} | null>}
 *   null if the wedding doesn't exist or the request failed.
 */
export async function fetchWeddingBySlug(slug, password, preview) {
  try {
    // Only sent for preview requests. The ordinary guest path stays a plain
    // anonymous request — a guest has no token, and sending one where it
    // isn't needed would widen what this endpoint sees for no benefit.
    const headers = {};
    if (preview) {
      const token = localStorage.getItem('base44_access_token');
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    // A password goes in a POST body, never the query string: a URL-borne
    // credential lands in Vercel access logs, browser history, the Referer
    // header, and the shared-cache key. Without one we keep the plain GET, so
    // the common unprotected-site path is unchanged.
    const res = password
      ? await fetch('/api/wedding-by-slug', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, password, ...(preview ? { preview: true } : {}) }),
        })
      : await fetch(`/api/wedding-by-slug?${new URLSearchParams({ slug, ...(preview ? { preview: 'true' } : {}) })}`, { headers });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
