/**
 * api/gift-link.js
 *
 * THE GIFT LINKS' ENDPOINT. goals/2026-10-11-gifting-v2.md, item 8 (HELD).
 * One file for what a claim or edit link can do, flagged with the rest of
 * gifting v2 (404 with GIFTING_V2 off):
 *
 *   GET  ?kind=claim|edit&token=<t>   the gift the link opens, as the page may
 *                                     show it, or { status: 'used' }
 *   POST { action: 'claim', token }   claims it for the signed-in caller
 *                                     (Authorization: Bearer <Base44 token>)
 *   POST { action: 'edit', token, email, note }
 *                                     the giver changes the address or note
 *
 * The logic is api/_lib/giftClaim.js. A token that is not a real signature,
 * names no v2 gift, or is no longer that gift's current token reads as used,
 * never as "not found": the page says nothing about whether a link existed.
 */
import { Resend } from 'resend';
import { applyCors, checkRateLimit, getClientIp } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { findGiftByToken, giftView, claimGift, editGift } from './_lib/giftClaim.js';
import { giftingV2OnServer } from './gift-email-preview.js';
import { giftOrigin } from './_lib/giftTokens.js';

export default async function handler(req, res, deps = {}) {
  if (applyCors(req, res)) return;
  const env = deps.env || process.env;
  if (!giftingV2OnServer(env)) return res.status(404).json({ error: 'Not found' });
  const adminKey = env.BASE44_ADMIN_KEY;
  if (!adminKey) return res.status(500).json({ error: 'Not configured' });
  const fetchImpl = deps.fetch || fetch;

  const { limited } = checkRateLimit(getClientIp(req), 'gift-link', 30);
  if (limited) return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });

  if (req.method === 'GET') {
    const kind = req.query?.kind === 'edit' ? 'edit' : 'claim';
    const row = await findGiftByToken(kind, String(req.query?.token || ''), { adminKey, fetchImpl });
    if (!row) return res.status(200).json({ status: 'used' });
    const view = giftView(row, kind);
    if (kind === 'claim' && view.status === 'claimed') return res.status(200).json({ status: 'used' });
    return res.status(200).json(view);
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const body = req.body || {};

  if (body.action === 'claim') {
    const user = await (deps.verifyUser || verifyBase44User)(req);
    if (!user) return res.status(401).json({ reason: 'sign_in' });
    const resend = deps.resend || new Resend(env.RESEND_API_KEY);
    const out = await claimGift({
      token: String(body.token || ''), user, adminKey, fetchImpl, now: deps.now ? deps.now() : new Date(),
      sendEmail: (email, options) => resend.emails.send(email, options), origin: giftOrigin(env),
    });
    return res.status(out.status).json(out.body);
  }

  if (body.action === 'edit') {
    const resend = deps.resend || new Resend(env.RESEND_API_KEY);
    const out = await editGift({
      token: String(body.token || ''), email: body.email, note: body.note, adminKey, fetchImpl,
      sendEmail: (email, options) => resend.emails.send(email, options),
    });
    return res.status(out.status).json(out.body);
  }

  return res.status(400).json({ error: 'Unknown action' });
}
