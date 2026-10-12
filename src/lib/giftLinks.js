/**
 * src/lib/giftLinks.js
 *
 * WHAT A GIFT LINK OPENS: the couple's claim link and the giver's edit link.
 * goals/2026-10-11-gifting-v2.md, item 3. Both pages are flagged and
 * READ-ONLY UNTIL ITEM 8: nothing here reaches the server, because nothing
 * there can answer yet. A v2 PlanGift row is first written by the webhook
 * (item 7), and the token is resolved by the claim endpoint (item 8), which
 * stores and compares only its HMAC. Until then the one seam below,
 * loadGiftByToken, knows only the reserved sample tokens, so the pages can be
 * built, reviewed and guarded; item 8 replaces its body with the endpoint call
 * and flips GIFT_LINKS_LIVE.
 *
 * An unknown token reads as a used one, as the goal asks: a plain page, never
 * a hint about whether a link ever existed.
 */
import { isGiftingV2On, DEFAULT_PHOTO_ID } from './giftingV2.js';

/** True once item 8's endpoint answers: the claim button and the save button work. */
export const GIFT_LINKS_LIVE = false;

const SAM = 'You two found each other, and now the planning finds its place too. Enjoy every bit of it. With love, Sam';

/**
 * The owner's sample (giver Sam, couple Isla and Theo, Ultra, The boxes, a
 * plain note), and a Pro one in the serif style to show the other plan and a
 * rendered note. Reserved names, never the shape of a real token.
 */
export const SAMPLE_GIFTS = {
  sample: {
    status: 'open', plan: 'ultra', giver: 'Sam', names: 'Isla and Theo', email: 'isla.and.theo@example.com',
    note: SAM, noteStyle: 'plain', headlineKey: 'nice_start', photoId: DEFAULT_PHOTO_ID,
  },
  'sample-pro': {
    status: 'open', plan: 'pro', giver: 'Sam', names: 'Isla and Theo', email: 'isla.and.theo@example.com',
    note: SAM, noteStyle: 'serif', headlineKey: 'for_you', photoId: 'DTS_NU_NUPTIALS_Shauna_Summers_Photos_ID10294_qw316r',
  },
  'sample-claimed': {
    status: 'claimed', plan: 'ultra', giver: 'Sam', names: 'Isla and Theo', email: 'isla.and.theo@example.com',
    note: SAM, noteStyle: 'plain', headlineKey: 'nice_start', photoId: DEFAULT_PHOTO_ID,
  },
  'sample-used': { status: 'used' },
};

/**
 * The gift a link opens, or `{ status: 'used' }`. Null with the flag off, so
 * the pages send the visitor to /gifting as /gift does.
 * @returns {Promise<null | { status: 'open'|'claimed'|'used', plan?: 'pro'|'ultra', giver?: string,
 *   names?: string, email?: string, note?: string, noteStyle?: string, headlineKey?: string, photoId?: string }>}
 */
export async function loadGiftByToken(token) {
  if (!isGiftingV2On()) return null;
  return SAMPLE_GIFTS[token] || { status: 'used' };
}
