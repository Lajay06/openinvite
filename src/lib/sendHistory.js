/**
 * src/lib/sendHistory.js
 *
 * WHAT HAS BEEN EMAILED TO THIS GUEST, AND WHEN.
 *
 * Item 5 of goals/2026-10-09-reply-lifecycle.md. The guest row showed one
 * date, the last invitation, and nothing else: a couple could not tell whether
 * a guest had been reminded, or how many times, or when.
 *
 * ── TWO SOURCES, AND THE OLD ONE IS NOT THROWN AWAY ──────────────────────
 *
 * Guest.send_history is the new field (owner added it 2026-10-09, mirrored in
 * #934): one entry per send, appended by the send path, never rewritten.
 *
 * But every existing guest has none, and the record already holds two
 * timestamps that each mean a send happened: invite_sent_at and
 * reminder_sent_at. Owner ruling, same date: DERIVE the first lines from
 * those. So a couple who has been using the product for months sees their
 * real history immediately rather than an empty cell that implies nothing
 * was ever sent.
 *
 * The two sources are not merged. send_history, once it exists, is the whole
 * answer: it is append-only and complete from the moment the send path starts
 * writing it, and splicing the two would double-count the send that
 * transitioned between them.
 *
 * ── CHANNEL IS EMAIL, AND THE LEGACY VALUES ARE HISTORY ──────────────────
 *
 * invite_channel can still read 'whatsapp' or 'email+whatsapp' on old
 * records. Those are a true statement about how that guest was invited at the
 * time, and #924 removed WhatsApp sending, so there is one channel now. Owner
 * ruling: they DISPLAY as email. The stored value is left exactly as it is;
 * nothing sweeps it.
 */

/** The words for each send type, in the owner's sentence case. */
const TYPE_LABELS = {
  invite: 'Invitation',
  invitation: 'Invitation',
  reminder: 'Reminder',
  update: 'Update',
  save_the_date: 'Save the date',
  thank_you_attending: 'Thank you',
  thank_you_declined: 'Thank you',
};

/** A send type's label, falling back to the raw value rather than hiding it. */
export function sendTypeLabel(type) {
  const key = String(type || '').trim();
  return TYPE_LABELS[key] || (key ? key.replace(/_/g, ' ') : 'Sent');
}

/**
 * Every send known for this guest, newest first.
 *
 * @param {object} guest
 * @returns {Array<{type: string, label: string, sent_at: string|null}>}
 */
export function sendHistoryFor(guest) {
  const stored = Array.isArray(guest?.send_history) ? guest.send_history : [];
  if (stored.length > 0) {
    return stored
      .filter((e) => e && e.type)
      .map((e) => ({ type: e.type, label: sendTypeLabel(e.type), sent_at: e.sent_at || null }))
      // NEWEST FIRST, and an entry with no timestamp sorts last rather than
      // being dropped: it still says a send happened.
      .sort((a, b) => {
        if (!a.sent_at) return 1;
        if (!b.sent_at) return -1;
        return new Date(b.sent_at) - new Date(a.sent_at);
      });
  }

  // DERIVED, for every guest who predates the field.
  const out = [];
  if (guest?.invite_sent_at) out.push({ type: 'invite', label: 'Invitation', sent_at: guest.invite_sent_at });
  if (guest?.reminder_sent_at) out.push({ type: 'reminder', label: 'Reminder', sent_at: guest.reminder_sent_at });
  // THE FLAG WITHOUT A DATE. invitation_sent is a boolean the send path never
  // writes, but some records carry it, and the goal says to show "Invitation
  // sent" with no date rather than nothing at all.
  if (out.length === 0 && guest?.invitation_sent) {
    out.push({ type: 'invite', label: 'Invitation', sent_at: null });
  }
  return out.sort((a, b) => {
    if (!a.sent_at) return 1;
    if (!b.sent_at) return -1;
    return new Date(b.sent_at) - new Date(a.sent_at);
  });
}

/**
 * A hash of the address a send went to, for Guest.send_history's to_hash.
 *
 * NOT THE ADDRESS, which is the field's whole point: every other guest
 * address in that entity is encrypted or hashed, and the reason the owner gave
 * for keeping a hash at all is that a later send can tell whether the address
 * CHANGED since last time. An unkeyed digest answers exactly that question and
 * nothing else, so there is no key to manage and nothing to rotate.
 *
 * Lower-cased and trimmed first, because "Ada@Example.com" and
 * "ada@example.com " are the same mailbox and a hash that said otherwise
 * would report a change that did not happen.
 *
 * @returns {Promise<string>} a hex digest, or '' when there is no address or
 *   no crypto to hash it with. An absent hash is a missing answer, never a
 *   wrong one, so the caller stores the entry without it.
 */
export async function hashRecipient(address) {
  const clean = String(address || '').trim().toLowerCase();
  if (!clean) return '';
  const subtle = typeof globalThis !== 'undefined'
    && globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle) return '';
  try {
    const bytes = new TextEncoder().encode(clean);
    const digest = await subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return '';
  }
}

/**
 * One send_history entry, ready to append.
 *
 * APPENDED, NEVER REWRITTEN, which is the field's contract. The caller spreads
 * it onto the guest's existing array; this builds the entry and nothing else,
 * so there is no path here that could replace a history.
 */
export async function newSendEntry(type, address, now = new Date()) {
  return {
    type: String(type || '').trim() || 'invite',
    sent_at: (now instanceof Date ? now : new Date(now)).toISOString(),
    to_hash: await hashRecipient(address),
  };
}
