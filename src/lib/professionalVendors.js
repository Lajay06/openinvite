/**
 * src/lib/professionalVendors.js
 *
 * THE VENDOR BOOK AND VENDOR LINKS. goals/2026-10-14-professional.md, What a
 * professional gets, 5, and Team and access: vendors get no account, only a
 * private link to a run sheet filtered to their own items, revocable,
 * expiring 7 days after the event.
 *
 * The token is shown once, in the link. Live, only its hash is stored
 * (APP_HASH_KEY, server-side); the adapter keeps the token itself, because it
 * has no server.
 */

export const VENDOR_ROLES = ['Venue', 'Caterer', 'Photographer', 'Videographer', 'Florist', 'DJ', 'Band', 'Officiant', 'Hair and makeup', 'Cake', 'Rentals', 'Lighting', 'Transport', 'Stationery', 'Other'];
export const LINK_DAYS_AFTER = 7;
const DAY = 86400000;

/** Insurance: expired, due within 30 days, fine, or not on file. */
export function insuranceState(date, now = new Date()) {
  if (!date) return 'none';
  const t = Date.parse(`${String(date).slice(0, 10)}T23:59:59Z`);
  if (Number.isNaN(t)) return 'none';
  if (t < now.getTime()) return 'expired';
  if (t - now.getTime() < 30 * DAY) return 'soon';
  return 'ok';
}
export const INSURANCE_TEXT = { expired: 'Expired', soon: 'Expires soon', ok: 'On file', none: 'Not on file' };

/** A vendor link stops working at the end of the seventh day after the event. */
export function linkExpiresAt(eventDate) {
  if (!eventDate) return null;
  const d = new Date(`${String(eventDate).slice(0, 10)}T23:59:59Z`);
  d.setUTCDate(d.getUTCDate() + LINK_DAYS_AFTER);
  return d.toISOString();
}

/** Is this booking's link usable now? Revoked, expired or never made is no. */
export function isVendorLinkLive(booking, now = new Date()) {
  if (!booking || booking.link_revoked || !(booking.link_token || booking.link_token_hash)) return false;
  if (!booking.link_expires_at) return false;
  return Date.parse(booking.link_expires_at) > now.getTime();
}

/** 32 random bytes, base64url. Never derived from anything. */
export function newLinkToken() {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  let s = '';
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

/**
 * What a vendor's page may show, written key by key: the event's couple
 * names, date and venue, the vendor's own rows, their arrive and finish
 * times, and the planner's name and phone for the day. No guest data, no
 * money, no other vendor.
 */
export function vendorSheetView({ event, booking, vendor, rows, planner }) {
  return {
    couple: event?.couple_names || '',
    date: event?.event_date || null,
    venue: event?.venue || '',
    vendor: vendor?.company || '',
    role: booking?.role || vendor?.role || '',
    arrive_minute: booking?.arrive ?? booking?.arrive_minute ?? null,
    finish_minute: booking?.finish ?? booking?.finish_minute ?? null,
    planner: planner ? { name: planner.name || '', phone: planner.phone || '' } : null,
    rows: (rows || []).map((r) => ({ sheet: r.sheet, start_minute: r.start_minute, duration_minutes: r.duration_minutes, item: r.item, location: r.location || '', cue: r.cue || '' })),
  };
}
