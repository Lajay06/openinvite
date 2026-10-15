/**
 * src/lib/professionalApi.js
 *
 * The client's one road to the Professional endpoints, with the signed-in
 * account's own token, the way giftLinks.js reads it. Never throws a server's
 * own words at a screen: a failure is { ok: false }.
 */
const bearer = () => {
  try { return localStorage.getItem('base44_access_token') || ''; } catch { return ''; }
};

export async function proPost(path, body) {
  try {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearer()}` }, body: JSON.stringify(body || {}) });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
  } catch {
    return { ok: false, status: 0, json: {} };
  }
}

export async function proGet(path) {
  try {
    const res = await fetch(path, { headers: { Authorization: `Bearer ${bearer()}` } });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
  } catch {
    return { ok: false, status: 0, json: {} };
  }
}

/** Off to a Stripe page the server made. Returns false when there is none. */
export async function goToStripe(path, body) {
  const r = await proPost(path, body);
  if (!r.ok || typeof r.json?.url !== 'string' || !/^https:\/\/(checkout|billing)\.stripe\.com\//.test(r.json.url)) return false;
  window.location.assign(r.json.url);
  return true;
}
