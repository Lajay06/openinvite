/**
 * Direct Base44 REST admin calls for writing to the built-in User entity.
 *
 * This is a DIFFERENT path from the Base44 client SDK (base44.entities.*)
 * used everywhere else in this app: the User entity cannot be bulk-updated
 * through the standard entities client, by design ("Users are managed
 * through the app's authentication system") — but a service-level REST call
 * authenticated with an app admin API key (BASE44_ADMIN_KEY, server-only,
 * never exposed to the browser) can write it. That's exactly the trust
 * boundary a payment webhook needs: a server-to-server credential, not a
 * user's own session.
 *
 * fetchImpl is injectable so tests can stub network calls without touching
 * a real Base44 app.
 */

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';

function userPath(userId) {
  return `/apps/${BASE44_APP_ID}/entities/User/${encodeURIComponent(userId)}`;
}

/**
 * THE ONE ADMIN REQUEST. BEARER FIRST, `?api_key=` ONLY AS A FALLBACK.
 *
 * ── WHY THIS EXISTS, 2026-10-11 ───────────────────────────────────────────
 *
 * The admin key was rotated to a Base44 PERSONAL ACCESS TOKEN, and a personal
 * access token is BEARER ONLY: it answers 401 to the `?api_key=` query form on
 * every entity, built-in and custom alike. Measured four ways against the live
 * app that day, including the raw unencoded interpolation this file used to
 * build, so it is the token type and not an encoding artifact.
 *
 * That took out every User-entity admin call in production for roughly an hour:
 * plan activation after a purchase, both email opt-out writes, the retention
 * stamps, the owner notification on an RSVP. None of them threw. getBase44User
 * returns null on any failure by design, so a 401 read as "current state
 * unknown" and the fault was silent.
 *
 * The fallback is not decoration. The previous app-level key could not be
 * restored (Vercel's history lists edits, not values, and the old value was
 * marked Sensitive), but other clones, preview environments and any key issued
 * before that day may still be app-level, and for those `?api_key=` is the form
 * that works. Bearer first, fall back on 401 or 403, so BOTH kinds authenticate
 * and neither needs a redeploy to switch.
 *
 * WHAT THIS DOES NOT DO: it does not make `GET /entities/User` (the LIST)
 * work. That still answers `200 []` whichever form carries the key. See the
 * note on listBase44Users below, which is still true and still the reason every
 * "for every user" cron reads WeddingDetails first.
 *
 * @param {string} path  everything after the API root, e.g. /apps/x/entities/User/y
 * @returns {Promise<Response>} the response, unread, for the caller to handle
 */
export async function adminFetch(path, {
  method = 'GET', body, adminKey = process.env.BASE44_ADMIN_KEY, fetchImpl = fetch,
} = {}) {
  const url = `${BASE44_API}${path}`;
  const headers = { Authorization: `Bearer ${adminKey}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const init = { method, headers };
  if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body);

  const res = await fetchImpl(url, init);
  if (res.status !== 401 && res.status !== 403) return res;

  // RELEASE THE REJECTED BODY before asking again, so the socket is not held.
  try { await res.body?.cancel?.(); } catch { /* a stub, or already drained */ }

  const legacyInit = { method };
  if (body !== undefined) {
    legacyInit.headers = { 'Content-Type': 'application/json' };
    legacyInit.body = init.body;
  }
  const sep = path.includes('?') ? '&' : '?';
  return fetchImpl(`${url}${sep}api_key=${encodeURIComponent(adminKey)}`, legacyInit);
}

/**
 * There is deliberately no listBase44Users() here. `GET /entities/User`
 * with `Authorization: Bearer <ADMIN_KEY>` 401s (matches every other
 * entity's LIST behavior being blocked for User specifically); switching
 * to `?api_key=` avoids the 401 but returns `200 []` — an empty array —
 * even with real users in the app. Confirmed empirically 2026-07 while
 * building the weekly digest cron. Single-record GET (below) works fine
 * either way. See BASE44_PLATFORM_NOTES.md's "User entity bulk-listing"
 * section for the full story and the WeddingDetails-first workaround
 * every cron needing "for every user" should use instead.
 */

/**
 * @returns {Promise<object|null>} the user record, or null if the fetch
 *   failed for any reason (not found, bad key, network error) — callers
 *   should treat null as "current state unknown," not "user has no plan."
 */
export async function getBase44User(userId, adminKey, fetchImpl = fetch) {
  try {
    const res = await adminFetch(userPath(userId), { adminKey, fetchImpl });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * @returns {Promise<{ok: boolean, status?: number, body?: string, error?: string}>}
 */
export async function writeBase44UserPlan({
  userId, plan, planActivatedAt, planExpiresAt, stripeCustomerId, planSource, adminKey, fetchImpl = fetch,
}) {
  try {
    // OMITTED, NEVER NULLED. A PUT replaces the whole value of each field it
    // names, so sending stripeCustomerId: undefined on a renewal would erase
    // the customer id this account already has. Each of the two is in the body
    // only when the caller actually has it.
    const payload = { plan, planActivatedAt };
    if (planExpiresAt) payload.planExpiresAt = planExpiresAt;
    if (stripeCustomerId) payload.stripeCustomerId = stripeCustomerId;
    if (planSource) payload.planSource = planSource;
    const res = await adminFetch(userPath(userId), {
      method: 'PUT',
      body: payload,
      adminKey,
      fetchImpl,
    });
    if (res.ok) return { ok: true, status: res.status };
    const body = await res.text().catch(() => '');
    return { ok: false, status: res.status, body: body.slice(0, 200) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
