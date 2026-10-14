/**
 * api/_lib/giftClaim.js
 *
 * WHAT A GIFT LINK CAN DO: SHOW THE GIFT, CLAIM IT, OR CHANGE IT.
 * goals/2026-10-11-gifting-v2.md, item 8 (HELD). The logic behind
 * api/gift-link.js, injectable so tests drive it with no network.
 *
 * A token is checked three ways before anything is shown or done: it is a
 * real signature for its kind (verifyGiftToken), the row it names is a
 * version 2 gift, and its hash is the row's CURRENT hash for that kind, so a
 * link replaced by an address change no longer opens anything.
 *
 * THE PLAN RULES (the goal's claim page section, and the owner's ruling of
 * 2026-10-13 on the term): a gift sets or keeps the plan and moves
 * User.planExpiresAt to the later of now and the current expiry, plus 24
 * months. Pro to Pro and Ultra to Ultra extend; Ultra to a Pro account
 * upgrades and extends; Pro to an Ultra account is refused and the gift stays
 * unclaimed. Nothing in the product enforces planExpiresAt yet; it is the
 * record the term promise rests on.
 *
 * SINGLE USE: claimed_at and claimed_user_id_hash are stamped before the plan
 * is written, and cleared again if the plan write fails, so two taps cannot
 * both claim and a failed claim does not burn the gift.
 */
import { updatePlanGift } from './planGift.js';
import { adminFetch } from './base44Admin.js';
import { verifyGiftToken, giftToken, giftTokenHash, currentToken, claimUrl, MAX_VERSION, giftOrigin } from './giftTokens.js';
import { decryptGiftField, encryptGiftField } from './giftCrypto.js';
import { buildRevealEmail, GIFT_FROM, GIFT_REPLY_TO } from './giftEmails.js';
import { renderGiftWelcome } from '../../src/lib/giftWelcomeEmail.js';
import { hmacHex } from './appKeys.js';
import { NOTE_MAX } from '../../src/lib/giftingV2.js';
import { isValidGiftEmail } from '../../src/lib/giftInput.js';

const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
export const TERM_MONTHS = 24;
const RANK = { free: 0, pro: 1, ultra: 2 };

/** An ISO instant `months` calendar months after `iso`. */
export function addMonths(iso, months) {
  const d = new Date(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString();
}

/**
 * What a gift does to an account: the plan it leaves and the new expiry, or a
 * refusal when the account already has more than the gift.
 */
export function applyGiftToAccount({ currentPlan, currentExpiresAt, giftPlan, now = new Date() }) {
  const current = RANK[currentPlan] != null ? currentPlan : 'free';
  if (RANK[current] > RANK[giftPlan]) return { ok: false, reason: 'more_than_gift' };
  const from = currentExpiresAt && Date.parse(currentExpiresAt) > now.getTime() ? currentExpiresAt : now.toISOString();
  return { ok: true, plan: giftPlan, changed: current !== giftPlan, planExpiresAt: addMonths(from, TERM_MONTHS) };
}

/** The v2 gift a token opens, with its state, or null. */
export async function findGiftByToken(kind, token, { adminKey, fetchImpl = fetch }) {
  const id = verifyGiftToken(kind, token);
  if (!id) return null;
  const res = await adminFetch(`/apps/${BASE44_APP_ID}/entities/PlanGift/${encodeURIComponent(id)}`, { adminKey, fetchImpl }).catch(() => null);
  if (!res || !res.ok) return null;
  const row = await res.json().catch(() => null);
  if (!row || row.version !== 2 || row[`${kind}_token_hash`] !== giftTokenHash(token)) return null;
  return row;
}

/** What a page may show for a gift. The couple's address only to the giver's edit link. */
export function giftView(row, kind) {
  const view = {
    status: row.claimed_at ? 'claimed' : 'open',
    plan: row.plan,
    giver: decryptGiftField(row.buyer_name_enc) || '',
    names: decryptGiftField(row.recipient_names_enc) || '',
    note: decryptGiftField(row.recipient_note_enc) || '',
    noteStyle: row.note_style,
    headlineKey: row.headline_key,
    photoId: row.photo_key,
  };
  if (kind === 'edit') view.email = decryptGiftField(row.recipient_email_enc) || '';
  return view;
}

async function writeUserPlan(userId, fields, { adminKey, fetchImpl }) {
  const res = await adminFetch(`/apps/${BASE44_APP_ID}/entities/User/${encodeURIComponent(userId)}`, { method: 'PUT', body: fields, adminKey, fetchImpl }).catch(() => null);
  return !!res?.ok;
}

/**
 * Claims a gift for the signed-in `user`.
 * @returns {Promise<{ status: number, body: object }>}
 */
export async function claimGift({ token, user, adminKey, fetchImpl = fetch, now = new Date(), sendEmail = null, origin = giftOrigin() }) {
  const row = await findGiftByToken('claim', token, { adminKey, fetchImpl });
  if (!row || row.claimed_at) return { status: 410, body: { reason: 'used' } };
  const giver = decryptGiftField(row.buyer_name_enc) || '';
  const outcome = applyGiftToAccount({ currentPlan: user.plan, currentExpiresAt: user.planExpiresAt, giftPlan: row.plan, now });
  if (!outcome.ok) return { status: 409, body: { reason: outcome.reason, giver } };

  const claimedAt = now.toISOString();
  const stamped = await updatePlanGift(row.id, { claimed_at: claimedAt, claimed_user_id_hash: hmacHex(user.id) }, adminKey, fetchImpl);
  if (!stamped.ok) return { status: 502, body: { reason: 'retry' } };

  // planSource (owner ruling 2026-10-13): "gift" only when the gift changes
  // the plan, in this same write. A gift that only moves the expiry leaves the
  // account's planSource as it was, so a purchased Pro extended by a Pro gift
  // still reads "purchase", and an account with no value keeps none.
  const fields = { plan: outcome.plan, planExpiresAt: outcome.planExpiresAt, ...(outcome.changed ? { planActivatedAt: claimedAt, planSource: 'gift' } : {}) };
  if (!(await writeUserPlan(user.id, fields, { adminKey, fetchImpl }))) {
    await updatePlanGift(row.id, { claimed_at: null, claimed_user_id_hash: null }, adminKey, fetchImpl);
    return { status: 502, body: { reason: 'retry' } };
  }
  // THE GIFT WELCOME (owner ruling 2026-10-14): a claimer is never on a
  // trial, so an account new to Openinvite gets this welcome after the claim,
  // in place of the trial one api/on-signup.js sends. An account already
  // onboarded is not new, and is not welcomed. Idempotent on the gift; a
  // failed send is logged and never fails the claim.
  if (sendEmail && !user.onboardingCompleted && user.email) {
    try {
      const mail = renderGiftWelcome({ plan: outcome.plan, giver, fullName: user.full_name, email: user.email, dashboardUrl: `${origin}/DailyUpdate` });
      const { error } = await sendEmail({ from: GIFT_FROM, to: user.email, replyTo: GIFT_REPLY_TO, ...mail, tags: [{ name: 'category', value: 'gift_welcome' }] }, { idempotencyKey: `gift-welcome-${row.id}` }) || {};
      if (error) console.error('[gift-link] gift welcome send failed (claim kept)');
    } catch {
      console.error('[gift-link] gift welcome send failed (claim kept)');
    }
  }
  const next = user.onboardingCompleted ? '/DailyUpdate' : '/onboarding';
  return { status: 200, body: { ok: true, next, giver, plan: outcome.plan } };
}

/**
 * The giver changes the address or the note until the couple claim. A new
 * address moves the claim token to a new version, so the old link stops
 * opening anything; if the reveal already went, it goes again to the new
 * address with the new link.
 * @returns {Promise<{ status: number, body: object }>}
 */
export async function editGift({ token, email, note, adminKey, fetchImpl = fetch, sendEmail }) {
  const row = await findGiftByToken('edit', token, { adminKey, fetchImpl });
  if (!row) return { status: 410, body: { reason: 'gone' } };
  if (row.claimed_at) return { status: 409, body: { reason: 'claimed' } };
  const nextEmail = typeof email === 'string' ? email.trim() : '';
  const nextNote = typeof note === 'string' ? note.trim() : '';
  if (!isValidGiftEmail(nextEmail)) return { status: 400, body: { reason: 'email' } };
  if (!nextNote || nextNote.length > NOTE_MAX) return { status: 400, body: { reason: 'note' } };

  const patch = {};
  const emailChanged = nextEmail !== (decryptGiftField(row.recipient_email_enc) || '');
  if (nextNote !== (decryptGiftField(row.recipient_note_enc) || '')) patch.recipient_note_enc = encryptGiftField(nextNote);
  let newClaim = null;
  if (emailChanged) {
    const current = currentToken('claim', row);
    const version = current ? Number(current.split('.')[1]) + 1 : 2;
    if (version > MAX_VERSION) return { status: 409, body: { reason: 'too_many_changes' } };
    newClaim = giftToken('claim', row.id, version);
    Object.assign(patch, { recipient_email_enc: encryptGiftField(nextEmail), claim_token_hash: giftTokenHash(newClaim) });
  }
  if (!Object.keys(patch).length) return { status: 200, body: { ok: true, changed: false } };

  const saved = await updatePlanGift(row.id, patch, adminKey, fetchImpl);
  if (!saved.ok) return { status: 502, body: { reason: 'retry' } };

  if (emailChanged && row.sent_at) {
    const gift = {
      plan: row.plan, giver: decryptGiftField(row.buyer_name_enc) || '', names: decryptGiftField(row.recipient_names_enc) || '',
      note: nextNote, noteStyle: row.note_style, headlineKey: row.headline_key, photoId: row.photo_key,
    };
    const version = newClaim.split('.')[1];
    const { error } = await sendEmail({ ...buildRevealEmail(gift, { to: nextEmail, claimUrl: claimUrl(newClaim) }), tags: [{ name: 'kind', value: 'gift_reveal' }] }, { idempotencyKey: `gift-reveal-${row.id}-v${version}` });
    if (error) return { status: 200, body: { ok: true, changed: true, resent: false } };
    return { status: 200, body: { ok: true, changed: true, resent: true } };
  }
  return { status: 200, body: { ok: true, changed: true } };
}
