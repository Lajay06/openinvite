/**
 * src/lib/giftWelcomeEmail.js
 *
 * THE WELCOME A GIFT CLAIMER GETS, INSTEAD OF THE TRIAL ONE. Owner ruling
 * 2026-10-14, after the giftclaim02 test: a new account that came in through a
 * gift claim was sent the standard welcome, "Your 14-day free trial has
 * started", greeted by its own address. A claimer is never on a trial, so
 * after a successful claim (api/_lib/giftClaim.js) this one goes instead, from
 * the same sender as the standard welcome.
 *
 * The layout is the code email's (base44/emails/EmailVerification.html): the
 * #F5F5F5 ground, a white 600px card, the full logo top left, the copy, the
 * red button, and the footer over a hairline. The copy is the owner's, word
 * for word, in src/lib/giftingV2.js (GIFT_WELCOME).
 */
import { GIFT_WELCOME, fill } from './giftingV2.js';
import { firstNameOrNull } from './emailGreeting.js';

const FONT = "'Plus Jakarta Sans', Helvetica, Arial, sans-serif";
const LOGO = 'https://www.openinvite.com.au/email-assets/openinvite-logo-on-light-2x.png';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The first name to greet by, or null. Never the address, and never the
 * address's local part either: Base44 fills a new account's full_name with it
 * ("la.jay06+giftclaim02"), which has no @ for firstNameOrNull to catch.
 */
export function welcomeFirstName(fullName, email = '') {
  const first = firstNameOrNull(fullName);
  if (!first) return null;
  const local = String(email || '').split('@')[0].toLowerCase();
  // The whole stored name being the local part is Base44's default, not a
  // name; a first name that merely matches it ("Isla" at isla@) is kept.
  if (local && String(fullName).trim().toLowerCase() === local) return null;
  return first;
}

/**
 * @param {{ plan: 'pro'|'ultra', giver: string, fullName?: string, email?: string, dashboardUrl: string }} p
 * @returns {{ subject: string, html: string, text: string }}
 */
export function renderGiftWelcome({ plan = 'ultra', giver = '', fullName = '', email = '', dashboardUrl }) {
  const key = plan === 'pro' ? 'pro' : 'ultra';
  const first = welcomeFirstName(fullName, email);
  const heading = first ? GIFT_WELCOME.heading.replace('{name}', first) : GIFT_WELCOME.headingBare;
  const body = fill(GIFT_WELCOME.body[key], { giver: giver || 'Someone', plan: key });
  const subject = fill(GIFT_WELCOME.subject, { plan: key });
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${esc(subject)}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .card { width: 100% !important; }
      .pad { padding-left: 24px !important; padding-right: 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:${FONT};">
  <div style="display:none;font-size:1px;color:#F5F5F5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(GIFT_WELCOME.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="card" style="width:600px;max-width:600px;background:#ffffff;">
          <tr>
            <td class="pad" style="padding:32px 40px 24px;">
              <img src="${LOGO}" width="160" height="37" alt="Openinvite" style="display:block;width:160px;height:37px;border:0;" />
            </td>
          </tr>
          <tr>
            <td class="pad" style="padding:16px 40px 18px;">
              <h1 style="margin:0;font-family:${FONT};font-size:26px;font-weight:700;line-height:1.25;color:#0A0A0A;">${esc(heading)}</h1>
            </td>
          </tr>
          <tr>
            <td class="pad" style="padding:0 40px 28px;">
              <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.7;color:rgba(10,10,10,0.72);">${esc(body)}</p>
            </td>
          </tr>
          <tr>
            <td class="pad" style="padding:0 40px 32px;">
              <a href="${esc(dashboardUrl)}" style="display:inline-block;padding:14px 32px;border-radius:999px;background:#E03553;color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;font-family:${FONT};">${esc(GIFT_WELCOME.button)}</a>
            </td>
          </tr>
          <tr>
            <td class="pad" style="padding:0 40px;">
              <div style="height:1px;background:#e8e4df;line-height:1px;font-size:0;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td class="pad" style="padding:20px 40px 36px;">
              <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.7;color:#8a8580;">${esc(GIFT_WELCOME.footer)} <a href="mailto:hello@openinvite.com.au" style="color:#8a8580;text-decoration:underline;">hello@openinvite.com.au</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  const text = `${heading}\n\n${body}\n\n${GIFT_WELCOME.button}: ${dashboardUrl}\n\n${GIFT_WELCOME.footer} hello@openinvite.com.au`;
  return { subject, html, text };
}
