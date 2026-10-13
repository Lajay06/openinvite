/**
 * src/lib/giftLinks.js
 *
 * WHAT A GIFT LINK OPENS: the couple's claim link and the giver's edit link.
 * goals/2026-10-11-gifting-v2.md, items 3 and 8. Live since item 8: the pages
 * read and act through api/gift-link.js, which checks the token's signature
 * and that it is still the gift's current token, and answers a used, replaced
 * or unknown link with { status: 'used' }.
 *
 * The reserved sample tokens stay, for review on a preview deploy: they never
 * reach the server and cannot claim or change anything.
 */
import { isGiftingV2On, DEFAULT_PHOTO_ID } from './giftingV2.js';

/** True since item 8: Open your gift and Save changes act. */
export const GIFT_LINKS_LIVE = true;

const SAM = 'You two found each other, and now the planning finds its place too. Enjoy every bit of it. With love, Sam';

/**
 * The owner's sample (giver Sam, couple Isla and Theo, Ultra, The boxes, a
 * plain note), and a Pro one in the serif style to show the other plan and a
 * rendered note. Reserved names, never the shape of a token.
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
export const isSampleToken = (token) => Object.prototype.hasOwnProperty.call(SAMPLE_GIFTS, token);

const bearer = () => {
  try { return localStorage.getItem('base44_access_token') || ''; } catch { return ''; }
};

/**
 * The gift a link opens, or `{ status: 'used' }`. Null with the flag off, so
 * the pages send the visitor to /gifting as /gift does.
 * @param {string} token
 * @param {'claim'|'edit'} kind
 */
export async function loadGiftByToken(token, kind = 'claim', { doFetch = (...a) => fetch(...a) } = {}) {
  if (!isGiftingV2On()) return null;
  if (isSampleToken(token)) return SAMPLE_GIFTS[token];
  try {
    const res = await doFetch(`/api/gift-link?kind=${kind}&token=${encodeURIComponent(token)}`);
    if (!res.ok) return { status: 'used' };
    return await res.json();
  } catch {
    return { status: 'used' };
  }
}

/**
 * Claims the gift for whoever is signed in.
 * @returns {Promise<{ ok?: true, next?: string, giver?: string, plan?: string, reason?: string, status: number }>}
 */
export async function claimGiftLink(token, { doFetch = (...a) => fetch(...a) } = {}) {
  try {
    const res = await doFetch('/api/gift-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearer()}` },
      body: JSON.stringify({ action: 'claim', token }),
    });
    return { status: res.status, ...(await res.json().catch(() => ({}))) };
  } catch {
    return { status: 0, reason: 'network' };
  }
}

/** Saves the giver's change of address or note. */
export async function saveGiftEdit(token, { email, note }, { doFetch = (...a) => fetch(...a) } = {}) {
  try {
    const res = await doFetch('/api/gift-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit', token, email, note }),
    });
    return { status: res.status, ...(await res.json().catch(() => ({}))) };
  } catch {
    return { status: 0, reason: 'network' };
  }
}

/** The one line onboarding shows after a claim, kept for the next page in this tab only. */
export const GIFT_LANDING_KEY = 'oi_gift_landing';
