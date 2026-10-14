/**
 * api/cron/send-gift-reveals.js
 *
 * THE SCHEDULED REVEAL: AN HOURLY RUN THAT SENDS THE GIFT EMAILS THAT ARE DUE.
 * goals/2026-10-11-gifting-v2.md, item 4, and the item 0 ruling: a new hourly
 * cron in vercel.json, idempotent on sent_at. HELD: it sends mail.
 *
 * A gift the giver set "On a date" carries send_at (9 am where the couple are,
 * as an instant). The webhook (item 7) sends a "Now" gift itself; this run
 * sends the rest: version 2, send_at in the past, sent_at empty, not claimed,
 * is_test not true. At most 50 per run, oldest first.
 *
 * DUE MEANS "send_at HAS PASSED", NOT "FELL DUE IN THE LAST HOUR". The item 0
 * ruling said each run sends what fell due in the last hour; read strictly, a
 * run that fails or is skipped would leave that hour's gifts unsent forever,
 * and they are paid for. sent_at already makes a later run skip what an
 * earlier one sent, so the window is everything not yet sent. Said in the PR
 * for the owner's ruling.
 *
 * IDEMPOTENT ON THE GIFT ID, twice over: Resend's idempotency key is
 * gift-reveal-<id>, so a gift sent but not stamped (the PUT failed) is not
 * sent again by the next run; and sent_at is stamped after a send succeeds.
 *
 * LOGS COUNTS, NEVER ADDRESSES OR NAMES. Off unless GIFTING_V2 is on for the
 * server (giftingV2OnServer): production stays silent until item 9.
 *
 * Env: CRON_SECRET (Vercel sends it as the bearer on its own invocations),
 * BASE44_ADMIN_KEY (PlanGift is read and updated through it, RLS null),
 * RESEND_API_KEY, APP_HASH_KEY (to rebuild each claim link, giftTokens.js),
 * APP_ENC_KEY (v2 rows' personal fields, giftCrypto.js).
 */
import { Resend } from 'resend';
import { decryptGiftField } from '../_lib/giftCrypto.js';
import { updatePlanGift } from '../_lib/planGift.js';
import { buildRevealEmail } from '../_lib/giftEmails.js';
import { currentToken, claimUrl } from '../_lib/giftTokens.js';
import { giftingV2OnServer } from '../gift-email-preview.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
export const MAX_PER_RUN = 50;
const TAG = '[cron/send-gift-reveals]';

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

/** The reveals due at `now`, oldest first, at most MAX_PER_RUN. */
export function dueReveals(rows, now = new Date()) {
  const t = now.getTime();
  return rows
    .filter((g) => g && g.version === 2 && g.send_at && !g.sent_at && !g.claimed_at && g.is_test !== true)
    .filter((g) => { const at = Date.parse(g.send_at); return Number.isFinite(at) && at <= t; })
    .sort((a, b) => Date.parse(a.send_at) - Date.parse(b.send_at))
    .slice(0, MAX_PER_RUN);
}

/** A PlanGift row as the email module reads a gift. Throws if a field will not decrypt. */
export function giftFromRow(row, decrypt = decryptGiftField) {
  return {
    plan: row.plan,
    giver: decrypt(row.buyer_name_enc) || '',
    names: decrypt(row.recipient_names_enc) || '',
    note: decrypt(row.recipient_note_enc) || '',
    noteStyle: row.note_style,
    headlineKey: row.headline_key,
    photoId: row.photo_key,
  };
}

/** Every version 2 PlanGift, in one large read (BASE44_PLATFORM_NOTES: skip pagination is not stable). */
async function listV2Gifts(adminKey, fetchImpl) {
  const q = encodeURIComponent(JSON.stringify({ version: 2 }));
  const res = await fetchImpl(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/PlanGift?q=${q}&limit=1000`, {
    headers: { Authorization: `Bearer ${adminKey}` },
  });
  if (!res.ok) throw new Error(`PlanGift read failed: ${res.status}`);
  return unwrapList(await res.json());
}

export default async function handler(req, res, deps = {}) {
  const env = deps.env || process.env;
  const fetchImpl = deps.fetch || fetch;
  const now = deps.now ? deps.now() : new Date();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // The same rule as send-onboarding-emails: the cron's bearer, and fail
  // closed in production without one.
  const cronSecret = env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers?.authorization || '';
    if ((auth.startsWith('Bearer ') ? auth.slice(7) : auth) !== cronSecret) return res.status(401).json({ error: 'Unauthorized' });
  } else if (env.VERCEL_ENV === 'production' || env.NODE_ENV === 'production') {
    console.error(`${TAG} refusing to run in production: CRON_SECRET is not set`);
    return res.status(500).json({ error: 'Not configured' });
  }

  if (!giftingV2OnServer(env)) return res.status(200).json({ skipped: 'gifting v2 is off' });
  if (!env.BASE44_ADMIN_KEY) {
    console.error(`${TAG} BASE44_ADMIN_KEY is not set`);
    return res.status(500).json({ error: 'Not configured' });
  }

  const counts = { due: 0, sent: 0, failed: 0, unstamped: 0, noToken: 0, unreadable: 0 };
  let due;
  try {
    due = dueReveals(await listV2Gifts(env.BASE44_ADMIN_KEY, fetchImpl), now);
  } catch (err) {
    console.error(`${TAG} ${err.message}`);
    return res.status(502).json({ error: 'Could not read gifts' });
  }
  counts.due = due.length;

  const resend = deps.resend || new Resend(env.RESEND_API_KEY);
  const decrypt = deps.decrypt || decryptGiftField;
  for (const row of due) {
    let to;
    let gift;
    try {
      to = decrypt(row.recipient_email_enc);
      gift = giftFromRow(row, decrypt);
    } catch {
      counts.unreadable += 1;
      continue;
    }
    if (!to) { counts.unreadable += 1; continue; }
    const token = currentToken('claim', row);
    if (!token) { counts.noToken += 1; continue; }

    const email = { ...buildRevealEmail(gift, { to, claimUrl: claimUrl(token) }), tags: [{ name: 'kind', value: 'gift_reveal' }] };
    const { error } = await resend.emails.send(email, { idempotencyKey: `gift-reveal-${row.id}` });
    if (error) { counts.failed += 1; continue; }
    counts.sent += 1;
    const stamped = await updatePlanGift(row.id, { sent_at: now.toISOString() }, env.BASE44_ADMIN_KEY, fetchImpl);
    if (!stamped.ok) counts.unstamped += 1;
  }

  console.log(`${TAG} ${JSON.stringify(counts)}`);
  return res.status(200).json(counts);
}
