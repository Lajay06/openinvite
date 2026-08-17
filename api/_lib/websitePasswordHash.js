/**
 * api/_lib/websitePasswordHash.js
 *
 * One-way hashing for WeddingDetails.websitePassword — the guest-site gate
 * credential. Step 2b stage (iii).
 *
 * A HASH, not encryption, and deliberately so. Every other sensitive field on
 * this entity (budget, contactPerson, emergencyContacts, dayVendorContacts,
 * celebrant, license) is AES-256-GCM ciphertext because the couple has to
 * read those values back. Nobody ever needs to read this one back — the only
 * question ever asked of it is "does this candidate match?" — so it should
 * never be recoverable, not even by us with the admin key.
 *
 * FORMAT: `scrypt$<saltHex>$<digestHex>`
 *
 * The `scrypt$` prefix is load-bearing, not decoration. Every other encrypted
 * field on this entity uses `typeof value === 'string'` as its
 * migrated-vs-legacy discriminator, which works only because their legacy
 * plaintext was object- or array-shaped. websitePassword's legacy plaintext
 * is ITSELF a string, so that discriminator is useless here — the exact
 * hazard recorded in scratchpad/DECISION-LOG.md when Step 2a closed. The
 * prefix is the discriminator instead: a stored value that starts with
 * `scrypt$` is hashed, anything else is legacy plaintext. It is also a
 * version marker, so a future algorithm change can be told apart from this
 * one rather than silently reinterpreting old rows.
 *
 * Per-value random salt: two couples who pick the same obvious password
 * ("wedding") must not produce the same stored digest, or the store leaks
 * which weddings share a password and becomes worth precomputing against.
 *
 * scrypt over a bare SHA/HMAC because this is a human-chosen, low-entropy
 * secret. hashId() in questionnaireCrypto.js is HMAC-SHA256, which is right
 * for the high-entropy identifiers it digests and wrong here: it is fast, so
 * it is cheap to brute-force a guessable wedding password against. scrypt is
 * deliberately slow and memory-hard.
 *
 * Unlike questionnaireCrypto.js, nothing here is keyed on BASE44_ADMIN_KEY.
 * A hash needs no secret, and not depending on one means rotating the admin
 * key can never strand every couple out of their own gate.
 */

import crypto from 'crypto';

const PREFIX = 'scrypt';
const SALT_BYTES = 16;
const KEY_BYTES = 64;
/** Node's defaults (N=16384, r=8, p=1). Pinned explicitly so a future Node
 *  default change can't silently alter what a stored digest means. */
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

const scrypt = (password, salt) => new Promise((resolve, reject) => {
  crypto.scrypt(password, salt, KEY_BYTES, SCRYPT_PARAMS, (err, dk) => (err ? reject(err) : resolve(dk)));
});

/** True if `stored` is one of our hashes rather than legacy plaintext. */
export function isHashedPassword(stored) {
  return typeof stored === 'string' && stored.startsWith(`${PREFIX}$`);
}

/**
 * @param {string} plain
 * @returns {Promise<string>} `scrypt$<saltHex>$<digestHex>`
 */
export async function hashWebsitePassword(plain) {
  if (typeof plain !== 'string' || !plain.trim()) {
    throw new Error('hashWebsitePassword: refusing to hash an empty password');
  }
  const salt = crypto.randomBytes(SALT_BYTES);
  const digest = await scrypt(plain.trim(), salt);
  return `${PREFIX}$${salt.toString('hex')}$${digest.toString('hex')}`;
}

/**
 * Constant-time comparison against a stored value.
 *
 * Handles legacy plaintext rows too: if `stored` has no `scrypt$` prefix it
 * is compared as plaintext, still in constant time. That path exists only so
 * a row written before this shipped keeps working; there are none today (the
 * 21-row audit found zero real passwords), and it costs nothing to keep the
 * reader honest about mixed state.
 *
 * @param {string} stored
 * @param {string} candidate
 * @returns {Promise<boolean>}
 */
export async function verifyWebsitePassword(stored, candidate) {
  if (typeof stored !== 'string' || !stored.trim()) return false;
  if (typeof candidate !== 'string') return false;
  const supplied = candidate.trim();
  if (!supplied) return false;

  if (!isHashedPassword(stored)) {
    // Legacy plaintext. Compare via fixed-length digests so the comparison
    // is constant-time regardless of the two strings' lengths — timingSafeEqual
    // throws on a length mismatch, which would itself leak the length.
    return timingSafeStringEqual(stored.trim(), supplied);
  }

  const [, saltHex, digestHex] = stored.split('$');
  if (!saltHex || !digestHex) return false;

  let expected;
  let actual;
  try {
    expected = Buffer.from(digestHex, 'hex');
    actual = await scrypt(supplied, Buffer.from(saltHex, 'hex'));
  } catch {
    return false; // malformed stored value — never throws into the request path
  }
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

/** Constant-time string compare via equal-length SHA-256 digests. */
function timingSafeStringEqual(a, b) {
  const da = crypto.createHash('sha256').update(a).digest();
  const db = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(da, db);
}
