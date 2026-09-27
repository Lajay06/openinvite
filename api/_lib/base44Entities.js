/**
 * api/_lib/base44Entities.js
 *
 * The admin-key entity fetch, in one place.
 *
 * WHY THIS EXISTS. Nineteen endpoints under api/ each carry their own copy of
 * the same four lines — a BASE44_API constant, an app id, a bearer header and
 * an unwrapList for the three envelope shapes Base44 returns lists in. Every
 * copy is an independent chance to get the envelope wrong or to forget the
 * !res.ok branch, and a forgotten !res.ok branch reads a JSON parse error as
 * an empty list, which is the shape of every "the page rendered its no-data
 * state and we called it clean" defect in this repo.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not change how the key is
 * obtained: the same `process.env.BASE44_ADMIN_KEY` read at module scope and
 * the same `Authorization: Bearer` header the existing senders use, moved
 * only in WHERE the fetch lives. The key is never logged, never returned,
 * never accepted as an argument and never included in a thrown message — an
 * error carries the method, the path and the status, because a key pasted
 * into a Vercel log is a key that has to be rotated.
 *
 * SCOPE OF THIS PR. Used by the three guest-note endpoints only. The other
 * senders keep their local copies until a later pass retrofits them; see the
 * PR body for the list.
 */

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY; // server-side only, no VITE_ prefix

/**
 * Whether the server is configured to talk to Base44 at all.
 *
 * A boolean, never the key — a caller that needs to answer "can I do this"
 * must not have to hold the secret to ask.
 */
export function hasAdminKey() {
  return !!BASE44_ADMIN_KEY;
}

/**
 * The three envelope shapes Base44 returns a list in. A bare array, `{data}`
 * and `{results}` have all been seen from the same API, so every list read in
 * this repo unwraps all three.
 */
export function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

/** `${path}` with the app prefix, so callers name an entity, not a URL. */
function entityPath(entity, suffix = '') {
  return `/apps/${BASE44_APP_ID}/entities/${entity}${suffix}`;
}

async function adminFetch(method, path, body) {
  const res = await fetch(`${BASE44_API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // The PATH, not the URL: the URL would be fine today, but a query string
    // built from user input does not belong in a log line either.
    throw new Error(`Base44 ${method} ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.status === 204 ? null : res.json();
}

/**
 * Every row of `entity` matching `query`, already unwrapped.
 *
 * `limit` is passed through because Base44's default page size is not
 * documented and a wedding with more notes than that page would silently
 * lose the rest.
 */
export async function adminList(entity, query, { limit = 1000 } = {}) {
  const q = encodeURIComponent(JSON.stringify(query || {}));
  return unwrapList(await adminFetch('GET', entityPath(entity, `?q=${q}&limit=${limit}`)));
}

/**
 * One row by id, or null if it is not there.
 *
 * Null rather than a throw, because "no such row" is an ordinary answer for
 * every caller of this — and a caller that cannot tell a missing row from a
 * network failure would report both as a 404.
 */
export async function adminGetOne(entity, id) {
  return adminFetch('GET', entityPath(entity, `/${encodeURIComponent(id)}`)).catch(() => null);
}

/** Creates one row. Base44 stamps created_by_id itself; see BASE44_PLATFORM_NOTES.md. */
export async function adminCreate(entity, payload) {
  return adminFetch('POST', entityPath(entity), payload);
}

/**
 * Patches one row.
 *
 * PUT, not PATCH — Base44's entity update verb, as every other update in this
 * repo uses it (api/song-request-review.js:152). A partial body is a partial
 * update; the row's other fields are left alone.
 */
export async function adminUpdate(entity, id, patch) {
  return adminFetch('PUT', entityPath(entity, `/${encodeURIComponent(id)}`), patch);
}
