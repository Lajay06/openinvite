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

function userUrl(userId, adminKey) {
  return `${BASE44_API}/apps/${BASE44_APP_ID}/entities/User/${userId}?api_key=${adminKey}`;
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
    const res = await fetchImpl(userUrl(userId, adminKey));
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * @returns {Promise<{ok: boolean, status?: number, body?: string, error?: string}>}
 */
export async function writeBase44UserPlan({ userId, plan, planActivatedAt, adminKey, fetchImpl = fetch }) {
  try {
    const res = await fetchImpl(userUrl(userId, adminKey), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, planActivatedAt }),
    });
    if (res.ok) return { ok: true, status: res.status };
    const body = await res.text().catch(() => '');
    return { ok: false, status: res.status, body: body.slice(0, 200) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
