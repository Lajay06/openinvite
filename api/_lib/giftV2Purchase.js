/**
 * api/_lib/giftV2Purchase.js
 *
 * A PAID VERSION 2 GIFT, FROM STRIPE'S CONFIRMATION TO THE COUPLE'S INBOX.
 * goals/2026-10-11-gifting-v2.md, item 7 (HELD, Payments-Change). Called by
 * api/webhooks/stripe.js for a checkout.session.completed whose metadata is
 * purchaseType gift AND gift_version 2; every other session, v1 gifts
 * included, takes the webhook's existing branches unchanged.
 *
 * No coupon and no promotion code. The PlanGift row is written from the
 * giver's draft (GiftDraft, item 6), its personal fields encrypted under
 * APP_ENC_KEY (api/_lib/giftCrypto.js); the claim and edit tokens are minted
 * from the row's id (api/_lib/giftTokens.js) and only their hashes stored.
 * The giver gets their confirmation; the couple get the reveal now, or the
 * row is stamped with send_at and the hourly cron sends it (item 4).
 *
 * IDEMPOTENT ON stripe_session_id, AND RESUMABLE. Stripe redelivers. The row
 * is found by its session before anything is written, and each later step
 * checks what is already done (the token hashes, sent_at) before doing it, so
 * a delivery that died halfway is finished by the next one rather than
 * stranded. The two emails carry Resend idempotency keys (gift-reveal-<id>,
 * the cron's own; gift-confirm-<id>), so a replay inside Resend's window
 * never sends either twice.
 *
 * AN EXPIRED, MISSING OR UNREADABLE DRAFT IS REFUSED, never guessed at. A
 * draft that is merely not found yet answers 502 so Stripe retries; one that
 * expired or will not decrypt answers 200 (a retry cannot fix it) and alerts
 * the support inbox, because a giver has paid for it.
 */
import { resolvePlanFromPriceId } from './planPricing.js';
import { createPlanGift, findPlanGiftBySessionId, updatePlanGift } from './planGift.js';
import { readGiftDraft } from './giftDrafts.js';
import { encryptGiftField } from './giftCrypto.js';
import { giftToken, giftTokenHash, claimUrl, editUrl } from './giftTokens.js';
import { buildRevealEmail, buildConfirmationEmail, GIFT_FROM } from './giftEmails.js';
import { hmacHex } from './appKeys.js';

const TAG = '[stripe-webhook gift v2]';
const ALERT_TO = 'hello@openinvite.com.au';

/** Is this session a version 2 gift? */
export const isGiftV2Session = (session) => session?.metadata?.purchaseType === 'gift' && session?.metadata?.gift_version === '2';

/**
 * 9 am on `date` (YYYY-MM-DD) where the couple are (`timeZone`, IANA), as an
 * ISO instant. Converges on the zone's offset for that morning, so daylight
 * saving is the zone's own.
 */
export function nineAmIn(date, timeZone) {
  const [y, m, d] = date.split('-').map(Number);
  const target = Date.UTC(y, m - 1, d, 9, 0, 0);
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  let guess = target;
  for (let i = 0; i < 3; i += 1) {
    const parts = Object.fromEntries(fmt.formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
    const local = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    guess -= local - target;
  }
  return new Date(guess).toISOString();
}

/** The scheduled date in words for the giver's email, US English: "December 1, 2026". */
export const writtenDate = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

async function alertSupport(sendEmail, sessionId, reason) {
  try {
    await sendEmail({
      from: GIFT_FROM, to: ALERT_TO,
      subject: '[Action needed] A paid v2 gift could not be created',
      html: `<p>A paid gift (session ${sessionId}) could not be created: ${reason}.</p><p>The giver has paid. Find the session in Stripe and follow up.</p>`,
    });
  } catch (err) {
    console.error(`${TAG} support alert failed:`, err.message);
  }
}

/** @returns {Promise<{ status: number, body: object }>} */
export async function handleGiftV2CheckoutSessionCompleted(session, {
  adminKey = process.env.BASE44_ADMIN_KEY,
  fetchImpl = fetch,
  sendEmail,
  now = () => new Date(),
  readDraft = readGiftDraft,
} = {}) {
  const sessionId = session.id;
  const priceId = session.line_items?.data?.[0]?.price?.id;
  const plan = resolvePlanFromPriceId(priceId) || (['pro', 'ultra'].includes(session.metadata?.plan) ? session.metadata.plan : null);
  if (!plan) {
    console.error(`${TAG} paid session with no resolvable plan, needs manual review:`, { sessionId });
    await alertSupport(sendEmail, sessionId, 'no plan could be resolved from the price');
    return { status: 200, body: { received: true } };
  }
  if (!adminKey) {
    console.error(`${TAG} BASE44_ADMIN_KEY is not set`);
    return { status: 500, body: { error: 'Server misconfiguration' } };
  }

  // ── 1. the row: found by its session, or written from the draft ─────────
  let row = await findPlanGiftBySessionId(sessionId, adminKey, fetchImpl);
  let draft = null;
  if (!row || !row.sent_at || !row.claim_token_hash) {
    const read = await readDraft(session.metadata?.gift_draft_id, { adminKey, now: now(), fetchImpl });
    if (!read.ok) {
      if (read.reason === 'missing' && !row) return { status: 502, body: { error: 'Gift draft not found, will retry' } };
      if (!row) {
        console.error(`${TAG} draft ${read.reason}, gift NOT created:`, { sessionId });
        await alertSupport(sendEmail, sessionId, `the giver's draft ${read.reason === 'expired' ? 'had expired' : read.reason === 'unreadable' ? 'could not be read' : 'was not found'}`);
        return { status: 200, body: { received: true } };
      }
    } else {
      draft = read.draft;
    }
  }

  if (!row) {
    const t = now();
    const scheduled = draft.when === 'date' ? nineAmIn(draft.date, draft.timezone) : null;
    const record = {
      stripe_session_id: sessionId,
      plan,
      version: 2,
      currency: session.currency || '',
      amount_cents: session.amount_total ?? 0,
      buyer_user_id_hash: session.client_reference_id ? hmacHex(session.client_reference_id) : null,
      buyer_email_enc: encryptGiftField(session.customer_details?.email || session.customer_email || ''),
      buyer_name_enc: encryptGiftField(draft.giver),
      recipient_email_enc: encryptGiftField(draft.email),
      recipient_names_enc: encryptGiftField(draft.names),
      recipient_note_enc: encryptGiftField(draft.note),
      headline_key: draft.headlineKey,
      photo_key: draft.photoId,
      note_style: draft.noteStyle,
      // A morning already past by the time the payment lands goes now.
      ...(scheduled && Date.parse(scheduled) > t.getTime() ? { send_at: scheduled } : {}),
      status: 'purchased',
      purchased_at: t.toISOString(),
      is_test: session.livemode === false,
    };
    const created = await createPlanGift(record, adminKey, fetchImpl);
    if (!created.ok) {
      console.error(`${TAG} PlanGift create failed, will retry:`, { sessionId, status: created.status });
      return { status: 502, body: { error: 'Failed to record gift, will retry' } };
    }
    row = { ...record, id: created.id };
  }

  // ── 2. the tokens: minted from the id, only their hashes stored ─────────
  const claim = giftToken('claim', row.id, 1);
  const edit = giftToken('edit', row.id, 1);
  if (!row.claim_token_hash) {
    const patch = { claim_token_hash: giftTokenHash(claim), edit_token_hash: giftTokenHash(edit) };
    const stamped = await updatePlanGift(row.id, patch, adminKey, fetchImpl);
    if (!stamped.ok) {
      console.error(`${TAG} token hashes not stored, will retry:`, { sessionId, status: stamped.status });
      return { status: 502, body: { error: 'Failed to finish gift, will retry' } };
    }
    Object.assign(row, patch);
  }
  // From here the row's own current tokens: a replay after an address change
  // must not resurrect version 1.
  if (row.claim_token_hash !== giftTokenHash(claim)) return { status: 200, body: { received: true } };

  if (!draft) return { status: 200, body: { received: true } };
  const gift = { plan, giver: draft.giver, names: draft.names, email: draft.email, note: draft.note, noteStyle: draft.noteStyle, headlineKey: draft.headlineKey, photoId: draft.photoId };
  const tags = (kind) => [{ name: 'kind', value: kind }];

  // ── 3. the couple's reveal, now, unless it is scheduled ─────────────────
  if (!row.send_at && !row.sent_at) {
    const { error } = await sendEmail({ ...buildRevealEmail(gift, { to: draft.email, claimUrl: claimUrl(claim) }), tags: tags('gift_reveal') }, { idempotencyKey: `gift-reveal-${row.id}` });
    if (error) {
      // The row stays unsent; the next delivery tries again.
      console.error(`${TAG} reveal send failed, will retry`);
      return { status: 502, body: { error: 'Reveal not sent, will retry' } };
    }
    const sentAt = now().toISOString();
    const stamped = await updatePlanGift(row.id, { sent_at: sentAt }, adminKey, fetchImpl);
    if (stamped.ok) row.sent_at = sentAt;
  }

  // ── 4. the giver's confirmation ─────────────────────────────────────────
  const buyerEmail = session.customer_details?.email || session.customer_email || '';
  if (buyerEmail) {
    const sendDate = row.send_at ? writtenDate(draft.date) : '';
    const { error } = await sendEmail({ ...buildConfirmationEmail(gift, { to: buyerEmail, claimUrl: claimUrl(claim), editUrl: editUrl(edit), sendDate }), tags: tags('gift_confirmation') }, { idempotencyKey: `gift-confirm-${row.id}` });
    if (error) console.error(`${TAG} confirmation send failed (gift recorded; not retried for this)`);
  }

  console.log(`${TAG} gift recorded:`, { sessionId, plan, scheduled: !!row.send_at, revealSent: !!row.sent_at });
  return { status: 200, body: { received: true } };
}
