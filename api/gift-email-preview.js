/**
 * api/gift-email-preview.js
 *
 * SENDS BOTH GIFT EMAILS, WITH SAMPLE DATA, TO THE OWNER'S TEST ADDRESS AND
 * NOWHERE ELSE. Gifting v2, item 2 (goals/2026-10-11-gifting-v2.md): the
 * owner reads the couple's reveal and the giver's confirmation in a real
 * inbox before any gift can send them.
 *
 * Behind GIFTING_V2: it answers only where GIFTING_V2=1 is set or on a Vercel
 * preview deploy, and is a 404 in production until the flag flips. POST only.
 *
 * THE RECIPIENT IS FIXED. Nothing in the request can change who receives the
 * mail: the body may choose the plan and the note style of the samples, and
 * that is all it can choose. A caller who reaches this can fill one test inbox
 * and nobody else's.
 */
import { Resend } from 'resend';
import { buildRevealEmail, buildConfirmationEmail } from './_lib/giftEmails.js';
import { DEFAULT_PHOTO_ID } from '../src/lib/giftingV2.js';

export const PREVIEW_RECIPIENT = 'la.jay06+notiftest01@gmail.com';

/** The flag, server side: on with GIFTING_V2=1, or on a Vercel preview deploy. */
export function giftingV2OnServer(env = process.env) {
  return env.GIFTING_V2 === '1' || env.VERCEL_ENV === 'preview';
}

/** The owner's sample: giver Sam, couple Isla and Theo, The boxes. */
export function sampleGift({ plan = 'ultra', noteStyle = 'plain' } = {}) {
  return {
    plan: plan === 'pro' ? 'pro' : 'ultra',
    noteStyle: ['plain', 'serif', 'hand'].includes(noteStyle) ? noteStyle : 'plain',
    giver: 'Sam',
    names: 'Isla and Theo',
    email: 'isla.and.theo@example.com',
    note: 'You two found each other, and now the planning finds its place too. Enjoy every bit of it. With love, Sam',
    headlineKey: 'nice_start',
    photoId: DEFAULT_PHOTO_ID,
  };
}

export default async function handler(req, res, deps = {}) {
  const env = deps.env || process.env;
  if (!giftingV2OnServer(env)) return res.status(404).json({ error: 'Not found' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const gift = sampleGift(req.body || {});
  const origin = 'https://www.openinvite.com.au';
  // Sample links: the claim and edit pages are item 3, and a sample token
  // claims nothing.
  const claimUrl = `${origin}/gift/claim/sample-token`;
  const editUrl = `${origin}/gift/edit/sample-token`;
  const tags = [{ name: 'kind', value: 'gift_preview' }];

  const reveal = { ...buildRevealEmail(gift, { to: PREVIEW_RECIPIENT, claimUrl }), tags };
  const confirmation = { ...buildConfirmationEmail(gift, { to: PREVIEW_RECIPIENT, claimUrl, editUrl }), tags };

  const resend = deps.resend || new Resend(env.RESEND_API_KEY);
  try {
    const sent = [];
    for (const email of [reveal, confirmation]) {
      const { error } = await resend.emails.send(email);
      if (error) throw new Error(error.message || 'Resend refused the email');
      sent.push(email.subject);
    }
    return res.status(200).json({ sent: sent.length, to: PREVIEW_RECIPIENT, subjects: sent });
  } catch (err) {
    console.error('[gift-email-preview] send failed:', err.message);
    return res.status(502).json({ error: 'The preview emails could not be sent.' });
  }
}
