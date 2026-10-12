/**
 * api/_lib/giftEmails.js
 *
 * THE TWO GIFT EMAILS, AS RESEND PAYLOADS. Gifting v2, item 2
 * (goals/2026-10-11-gifting-v2.md). The couple's reveal and the giver's
 * confirmation, Pro and Ultra, in the three note styles the goal rules
 * (plain as live text, serif and handwriting as Cloudinary text images with
 * the note as alt text), with the plan named by its badge as an image.
 *
 * The HTML comes from src/lib/giftEmailTemplate.js, the same module the
 * giver's pages render as their live preview, so what the giver saw is what
 * is sent. This file adds what only a sent email needs: the sender, the
 * Reply-To, the recipient, and a plain-text part.
 *
 * Nothing here sends. The preview endpoint (api/gift-email-preview.js) sends
 * the samples to the owner's test address; item 7's webhook branch will send
 * the real ones. No tracking beyond what Resend adds by default.
 */
import { renderGiftReveal, renderGiftConfirmation } from '../../src/lib/giftEmailTemplate.js';
import { REVEAL, CONFIRM, fill, headlineText, PLAN_NAMES } from '../../src/lib/giftingV2.js';

export const GIFT_FROM = 'Openinvite <hello@openinvite.com.au>';
export const GIFT_REPLY_TO = 'hello@openinvite.com.au';

const PLANS = new Set(['pro', 'ultra']);
const STYLES = new Set(['plain', 'serif', 'hand']);

/** The gift, with the plan and note style held to the goal's values. */
function normalize(gift) {
  return {
    ...gift,
    plan: PLANS.has(gift.plan) ? gift.plan : 'ultra',
    noteStyle: STYLES.has(gift.noteStyle) ? gift.noteStyle : 'plain',
  };
}

/** The couple's email. */
export function buildRevealEmail(gift, { to, claimUrl }) {
  const g = normalize(gift);
  const { subject, html } = renderGiftReveal({ ...g, claimUrl });
  const vars = { giver: g.giver, names: g.names, plan: g.plan };
  const text = [
    headlineText(g.headlineKey, g.names),
    '',
    fill(REVEAL.body[g.plan], vars),
    '',
    g.note,
    `${g.giver}`,
    '',
    `${REVEAL.button}: ${claimUrl}`,
    REVEAL.under,
    '',
    REVEAL.descriptor[g.plan],
    '',
    fill(REVEAL.footer, vars),
  ].join('\n');
  return { from: GIFT_FROM, to, replyTo: GIFT_REPLY_TO, subject, html, text };
}

/** The giver's email. `sendDate`, when set, is the written date the reveal is scheduled for. */
export function buildConfirmationEmail(gift, { to, claimUrl, editUrl, sendDate = '' }) {
  const g = normalize(gift);
  const { subject, html } = renderGiftConfirmation({ ...g, claimUrl, editUrl, sendDate });
  const vars = { giver: g.giver, names: g.names, email: g.email, plan: g.plan };
  const text = [
    CONFIRM.heading,
    '',
    sendDate ? fill(CONFIRM.scheduled, vars).replace('{date}', sendDate) : fill(CONFIRM.body, vars),
    '',
    g.note,
    `${g.giver}`,
    '',
    `${CONFIRM.linkBox}: ${claimUrl}`,
    '',
    CONFIRM.forward,
    CONFIRM.receipt,
    '',
    `${CONFIRM.button}: ${editUrl}`,
    '',
    CONFIRM.footer,
  ].join('\n');
  return { from: GIFT_FROM, to, replyTo: GIFT_REPLY_TO, subject, html, text };
}

export { PLAN_NAMES };
