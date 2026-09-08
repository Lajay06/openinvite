/**
 * src/lib/vowPinLock.js
 *
 * The client half of the per-item vows lock. Everything secret happens on the
 * server (api/vow-pin.js); this holds one piece of state and three calls.
 *
 * ── THE REVEAL LIVES IN MEMORY, ON PURPOSE ─────────────────────────────────
 *
 * A Set in a module, not localStorage and not sessionStorage. The lock exists
 * for someone leaning over the couple's laptop, and a reveal that survives a
 * reload — or that another tab can read — defeats exactly that. Closing the
 * tab must re-lock it, so the state has to die with the page.
 *
 * It is deliberately NOT React state at module scope either: the page can
 * remount as the couple moves between tabs, and a reveal should survive that
 * within one visit while still dying with the page.
 */
/** Item ids the couple has opened during this page visit. */
const revealed = new Set();

export function isRevealed(id) {
  return revealed.has(id);
}

/** True when the item carries a lock. Absent or empty means unlocked. */
export function isItemLocked(item) {
  return typeof item?.pin_hash === 'string' && item.pin_hash.trim().length > 0;
}

/** Locked AND not yet opened this visit — the state that hides the text. */
export function isHidden(item) {
  return isItemLocked(item) && !revealed.has(item?.id);
}

/** Forget every reveal — used when the couple signs out of the view. */
export function forgetReveals() {
  revealed.clear();
}

async function post(body) {
  // The same token every other authenticated client call uses
  // (src/lib/guestLinks.js:39) — the SDK stores it here.
  const token = localStorage.getItem('base44_access_token');
  const res = await fetch('/api/vow-pin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, ok: res.ok, json };
}

/**
 * Locks an item with a new PIN. The plaintext goes to the server and is
 * never written to the entity from here — the browser has no business
 * holding a credential it could also store by accident.
 */
export async function setPin(id, pin) {
  const { ok, json } = await post({ id, action: 'set', pin });
  if (ok) revealed.add(id);     // the couple who just set it is looking at it
  return ok ? { ok: true } : { ok: false, error: json?.error || 'That did not save.' };
}

/** Opens an item for this visit. A wrong PIN reveals nothing. */
export async function unlock(id, pin) {
  const { status, json } = await post({ id, action: 'unlock', pin });
  if (status === 200 && json?.ok !== false) { revealed.add(id); return { ok: true }; }
  if (status === 401) return { ok: false, error: 'That PIN does not match.' };
  return { ok: false, error: json?.error || 'Could not check that PIN.' };
}

/**
 * Removes the lock. No PIN required, and that is the ruling rather than an
 * oversight: there is no recovery flow, so removing the lock from the
 * couple's own dashboard IS the recovery. Demanding the forgotten PIN in
 * order to forget it would strand them out of their own vows for good.
 */
export async function clearPin(id) {
  const { ok, json } = await post({ id, action: 'clear' });
  if (ok) revealed.add(id);
  return ok ? { ok: true } : { ok: false, error: json?.error || 'That did not save.' };
}
