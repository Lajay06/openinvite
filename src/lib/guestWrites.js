/**
 * src/lib/guestWrites.js
 *
 * Guest creates, updates and deletes via api/my-guests.js.
 *
 * Guest family, Track B2. The couple's browser wrote Guest rows directly until
 * now. From Track C those writes must produce an AES blob keyed by a
 * server-only secret, which a browser can never hold — so every write moves
 * server-side BEFORE any field is encrypted. Encrypt first and the browser
 * silently overwrites ciphertext with plaintext; the couple's edit appears to
 * work, the read prefers the stale blob, and the change vanishes with no error
 * anywhere.
 *
 * The read half already moved in Track A (getMyRecords -> /api/my-guests), so
 * after this PR neither half of Guest access touches base44.entities.Guest
 * from the browser.
 *
 * These deliberately THROW on failure rather than failing soft. Reads fail
 * soft because a missing list degrades to an empty page; a write that silently
 * does nothing is the failure mode this whole track exists to prevent, and the
 * calling surfaces already have try/catch with user-visible error toasts.
 */

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('base44_access_token')}`,
  };
}

async function send(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: authHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Guest ${method} failed (${res.status})`);
  }
  return res.json();
}

/** @returns {Promise<object>} the created guest, as base44.entities.Guest.create did. */
export async function createGuest(fields) {
  const { guest } = await send('POST', '/api/my-guests', { fields });
  return guest;
}

/** @returns {Promise<object>} the updated guest. */
export async function updateGuest(id, fields) {
  const { guest } = await send('PUT', `/api/my-guests?id=${encodeURIComponent(id)}`, { fields });
  return guest;
}

export async function deleteGuest(id) {
  await send('DELETE', `/api/my-guests?id=${encodeURIComponent(id)}`);
}
