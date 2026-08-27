/**
 * api/_lib/planGift.js
 *
 * Admin-key REST helpers for the PlanGift entity (PR G4, gifting v2
 * bridge) — create:null/read:null/update:null, so every read/write here
 * goes through BASE44_ADMIN_KEY, same pattern as
 * api/collect-guest-contact.js and api/send-collaborator-invite.js's
 * Collaborator calls. fetchImpl is injectable so the webhook's own unit
 * tests can stub network calls.
 */

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

/** @returns {Promise<object|null>} the existing PlanGift for this Stripe session, or null. */
export async function findPlanGiftBySessionId(stripeSessionId, adminKey, fetchImpl = fetch) {
  const q = encodeURIComponent(JSON.stringify({ stripe_session_id: stripeSessionId }));
  const res = await fetchImpl(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/PlanGift?q=${q}&limit=1`, {
    headers: { Authorization: `Bearer ${adminKey}` },
  });
  if (!res.ok) return null;
  const list = unwrapList(await res.json());
  return list[0] || null;
}

/** @returns {Promise<object|null>} the PlanGift a given Stripe Promotion Code id belongs to, or null. */
export async function findPlanGiftByPromotionCodeId(promotionCodeId, adminKey, fetchImpl = fetch) {
  const q = encodeURIComponent(JSON.stringify({ promotion_code_id: promotionCodeId }));
  const res = await fetchImpl(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/PlanGift?q=${q}&limit=1`, {
    headers: { Authorization: `Bearer ${adminKey}` },
  });
  if (!res.ok) return null;
  const list = unwrapList(await res.json());
  return list[0] || null;
}

/** @returns {Promise<{ok: boolean, id?: string, status?: number, body?: string}>} */
export async function createPlanGift(record, adminKey, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/PlanGift`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, status: res.status, body: body.slice(0, 200) };
    }
    const created = await res.json();
    return { ok: true, id: created?.id };
  } catch (err) {
    return { ok: false, body: err.message };
  }
}

/**
 * Read-merge-write, not a bare PUT of `patch` alone — unlike
 * base44Admin.js's writeBase44UserPlan (the built-in User entity, confirmed
 * to persist arbitrary/partial fields fine), there is no equivalent
 * confirmation for a *custom* entity's record-level PUT semantics. Fetching
 * the current record and sending the full merged object back is the same
 * "never assume partial-update semantics, always resend the complete
 * object" discipline this codebase already applies to schema updates —
 * applied here to avoid a PUT silently wiping recipient_email_enc/
 * promotion_code_display/etc. if it turns out to be a full replace.
 *
 * @returns {Promise<{ok: boolean, status?: number, body?: string}>}
 */
export async function updatePlanGift(id, patch, adminKey, fetchImpl = fetch) {
  try {
    const getRes = await fetchImpl(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/PlanGift/${id}`, {
      headers: { Authorization: `Bearer ${adminKey}` },
    });
    if (!getRes.ok) {
      const body = await getRes.text().catch(() => '');
      return { ok: false, status: getRes.status, body: `fetch-before-update failed: ${body.slice(0, 200)}` };
    }
    const current = await getRes.json();
    const merged = { ...current, ...patch };

    const putRes = await fetchImpl(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/PlanGift/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
      body: JSON.stringify(merged),
    });
    if (!putRes.ok) {
      const body = await putRes.text().catch(() => '');
      return { ok: false, status: putRes.status, body: body.slice(0, 200) };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, body: err.message };
  }
}
