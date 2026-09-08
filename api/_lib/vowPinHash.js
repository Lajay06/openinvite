/**
 * api/_lib/vowPinHash.js
 *
 * The PIN that locks one vow or speech, hashed, never stored in clear.
 *
 * ── IT DELEGATES RATHER THAN REIMPLEMENTS ──────────────────────────────────
 *
 * The hashing is api/_lib/websitePasswordHash.js's: scrypt with pinned
 * parameters, a fresh 16-byte salt per value, a `scrypt$<salt>$<digest>`
 * format, and constant-time verification. That module's own docstring argues
 * every one of those choices for a human-chosen low-entropy secret, which is
 * exactly what a 4-6 digit PIN is — more so, since a PIN has at most a
 * million candidates.
 *
 * A second copy of a hashing routine is a second thing to audit and a second
 * thing to get wrong, so there is one implementation and this file adds only
 * what is specific to a PIN: what counts as one.
 *
 * ── WHY THE SHAPE IS ENFORCED SERVER-SIDE ──────────────────────────────────
 *
 * The UI asks for 4-6 digits, and a UI rule is a suggestion — the endpoint is
 * reachable without it. Refusing anything else here means the stored digest is
 * always of a value the unlock screen can actually produce; a PIN of "" or of
 * a 200-character paste would lock an item that no keypad could ever open,
 * and the only way out would be clearing the lock.
 */
import { hashWebsitePassword, verifyWebsitePassword, isHashedPassword } from './websitePasswordHash.js';

/** 4 to 6 digits, nothing else. */
export const PIN_RE = /^\d{4,6}$/;

export function isValidPin(pin) {
  return typeof pin === 'string' && PIN_RE.test(pin);
}

/** True when this item carries a lock. Absent/empty means unlocked. */
export function isLocked(stored) {
  return typeof stored === 'string' && stored.trim().length > 0;
}

/**
 * @param {string} pin  4-6 digits
 * @returns {Promise<string>} `scrypt$<saltHex>$<digestHex>`
 */
export async function hashPin(pin) {
  if (!isValidPin(pin)) throw new Error('hashPin: a PIN is 4 to 6 digits');
  return hashWebsitePassword(pin);
}

/**
 * Constant-time check of a candidate against the stored hash.
 *
 * A malformed or absent stored value is `false`, never a throw and never a
 * pass: an item whose hash got corrupted must stay shut, not fall open.
 */
export async function verifyPin(stored, candidate) {
  if (!isLocked(stored)) return false;
  if (!isValidPin(candidate)) return false;
  // Refuse anything that is not one of our hashes. websitePasswordHash's
  // verify falls back to a plaintext comparison for its own legacy rows;
  // pin_hash was declared 2026-09-08 and has never held plaintext, so that
  // path must not be reachable here — a stored PIN in clear would otherwise
  // verify successfully and look like the feature working.
  if (!isHashedPassword(stored)) return false;
  return verifyWebsitePassword(stored, candidate);
}
