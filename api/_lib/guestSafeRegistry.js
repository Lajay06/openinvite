/**
 * api/_lib/guestSafeRegistry.js
 *
 * Guest-safe field allowlists for CustomGift (cash funds) and
 * RegistryProduct (wishlist items) — the public /w/:slug registry section
 * (cash fund + registry public-site wiring, Option A: couples link their
 * own external payment page, no money moves through Openinvite).
 *
 * Same shape as guestSafeWedding.js: an explicit allowlist, never a
 * denylist-only approach, so a private field added to either entity later
 * doesn't silently leak to anonymous guests by default.
 *
 * RegistryProduct.purchased_by (guest names/emails) and .notes (the
 * couple's own private planning note) are the two fields this file exists
 * to keep off the public site — neither has any guest-facing purpose, and
 * purchased_by specifically is guest PII.
 */

/**
 * https:// only — this guards CustomGift.payment_link_url specifically,
 * which the public site renders as a raw href on an anonymous, unauthenticated
 * page. A stored javascript:/data:/http: value (bad input, or any future
 * edit path that skips the owner-form's own validation) must never reach
 * the browser as a clickable link — this is the server-side half of the
 * https check; the owner form validates on entry, this validates on output,
 * so the two can never disagree about what "safe" means.
 */
export function isSafeHttpsUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

const CUSTOM_GIFT_FIELDS = ['id', 'title', 'description', 'category', 'requested_amount', 'image_url'];

/**
 * @param {object} gift — a full CustomGift record from Base44
 * @returns {object} guest-safe fields; payment_link_url is present ONLY if
 *   it passes isSafeHttpsUrl — omitted entirely (not nulled) otherwise, so
 *   the guest card's "show a Contribute button only if this key exists"
 *   check can't be fooled by a falsy-but-present value.
 */
export function pickGuestSafeCustomGift(gift) {
  const out = {};
  for (const field of CUSTOM_GIFT_FIELDS) {
    if (field in gift) out[field] = gift[field];
  }
  if (isSafeHttpsUrl(gift.payment_link_url)) {
    out.payment_link_url = gift.payment_link_url.trim();
  }
  return out;
}

const REGISTRY_PRODUCT_FIELDS = [
  'id', 'name', 'description', 'price', 'image_url', 'product_url',
  'category', 'quantity_requested', 'quantity_purchased',
];

/**
 * @param {object} product — a full RegistryProduct record from Base44
 * @returns {object} guest-safe fields — purchased_by and notes are never
 *   included (not in the allowlist above).
 */
export function pickGuestSafeRegistryProduct(product) {
  const out = {};
  for (const field of REGISTRY_PRODUCT_FIELDS) {
    if (field in product) out[field] = product[field];
  }
  return out;
}
