/**
 * api/_lib/giftTokens.js
 *
 * THE GIFT LINKS' TOKENS: SIGNED, DERIVABLE, NEVER STORED.
 * goals/2026-10-11-gifting-v2.md: "The claim link carries a signed single-use
 * token. The token is never stored; its HMAC-SHA256 is."
 *
 * WHY DERIVABLE. Three things need the same claim link: the giver's
 * confirmation (sent at purchase, item 7), the reveal when it goes now (item
 * 7), and the reveal when it is scheduled, sent hours or days later by the
 * hourly cron (item 4). A random token that is never stored cannot be put
 * back together by the cron. So the token is a signature over the gift's id:
 *
 *   <giftId>.<version>.<HMAC-SHA256(APP_HASH_KEY, "gift-<kind>:<giftId>:<version>"), base64url>
 *
 * Only a holder of APP_HASH_KEY can make one, so the server can rebuild the
 * link whenever it sends, and nothing that would open the gift sits in the
 * database. The row keeps claim_token_hash and edit_token_hash, the hex HMAC
 * of the CURRENT token, which is what makes a token single-use and revocable:
 * claiming (item 8) stamps claimed_at, and changing the address (the edit
 * page, item 8) moves the version on and stores the new hash, so the old link
 * stops matching. The version is in the token itself, so no new field is
 * needed; currentToken finds it by matching the stored hash.
 *
 * KEY: APP_HASH_KEY through api/_lib/appKeys.js, the construction every
 * non-collaborator hash in api/ shares since the owner ruled (2026-10-12)
 * that BASE44_ADMIN_KEY is never a hashing key. The goal named
 * collaboratorAuth's hashId, which was the admin key when it was written;
 * that is now COLLAB_HASH_KEY, kept for collaborators alone.
 */
import crypto from 'crypto';
import { hmacB64Url, hmacHex } from './appKeys.js';

export const GIFT_ORIGIN = 'https://www.openinvite.com.au';
/** How far currentToken looks for the version a stored hash belongs to. */
export const MAX_VERSION = 16;
const KINDS = new Set(['claim', 'edit']);
const ID = /^[A-Za-z0-9_-]{6,64}$/;

/** The token for one gift, one kind, one version. */
export function giftToken(kind, giftId, version = 1) {
  if (!KINDS.has(kind)) throw new Error(`unknown gift token kind: ${kind}`);
  if (!ID.test(String(giftId))) throw new Error('a gift token needs a gift id');
  if (!Number.isInteger(version) || version < 1 || version > MAX_VERSION) throw new Error('gift token version out of range');
  return `${giftId}.${version}.${hmacB64Url(`gift-${kind}:${giftId}:${version}`)}`;
}

/** What the row stores for a token: its hex HMAC, never the token. */
export function giftTokenHash(token) {
  return hmacHex(token);
}

/**
 * The gift id a token was made for, or null: right shape, right kind, right
 * signature, compared in constant time. Whether it is still the CURRENT token
 * is the caller's check against the stored hash.
 */
export function verifyGiftToken(kind, token) {
  const m = /^([A-Za-z0-9_-]{6,64})\.(\d{1,2})\.([A-Za-z0-9_-]{43})$/.exec(String(token || ''));
  if (!m || !KINDS.has(kind)) return null;
  const version = Number(m[2]);
  if (version < 1 || version > MAX_VERSION) return null;
  const expected = Buffer.from(giftToken(kind, m[1], version));
  const given = Buffer.from(String(token));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given) ? m[1] : null;
}

/**
 * The gift's current token of a kind, rebuilt from its id and the stored hash,
 * or null when the row has no hash or none of the versions match it.
 */
export function currentToken(kind, gift) {
  const stored = gift?.[`${kind}_token_hash`];
  if (!stored || !gift?.id) return null;
  for (let v = 1; v <= MAX_VERSION; v += 1) {
    const token = giftToken(kind, gift.id, v);
    if (giftTokenHash(token) === stored) return token;
  }
  return null;
}

export const claimUrl = (token) => `${GIFT_ORIGIN}/gift/claim/${token}`;
export const editUrl = (token) => `${GIFT_ORIGIN}/gift/edit/${token}`;
