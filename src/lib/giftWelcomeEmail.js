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
 * THE SHAPE IS THE OTHER GIFT EMAILS' (owner ruling 2026-10-16, after the first
 * live claim): the same white logo header (headerRow, shared with the reveal
 * and the confirmation), then the photograph the giver chose for this gift,
 * full width at 6:5 exactly as the couple's reveal shows it, then the
 * headline, the body and the red button in the reveal's type, then the shared
 * footer. A gift with no chosen photo shows onboarding's "you're all set"
 * photograph, WELCOME_FALLBACK_PHOTO_ID. The copy is the owner's, word for
 * word, in src/lib/giftingV2.js (GIFT_WELCOME).
 */
import { GIFT_WELCOME, fill, giftPhotoUrl, photoLabel } from './giftingV2.js';
import { firstNameOrNull } from './emailGreeting.js';
import { EMAIL_FONT, EMAIL_ACCENT, EMAIL_BLACK, emailShell, emailFooterRow } from './emailBrand.js';
import { headerRow } from './giftEmailTemplate.js';

/** Onboarding's completion photograph, for a gift with no photo of its own. */
export const WELCOME_FALLBACK_PHOTO_ID = 'DTS_BANDITS_PALI_MENDEZ_Photos_ID14218_hxqxw0';
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
 * @param {{ plan: 'pro'|'ultra', giver: string, fullName?: string, email?: string, photoId?: string, dashboardUrl: string }} p
 * @returns {{ subject: string, html: string, text: string }}
 */
export function renderGiftWelcome({ plan = 'ultra', giver = '', fullName = '', email = '', photoId = '', dashboardUrl }) {
  const key = plan === 'pro' ? 'pro' : 'ultra';
  const first = welcomeFirstName(fullName, email);
  const heading = first ? GIFT_WELCOME.heading.replace('{name}', first) : GIFT_WELCOME.headingBare;
  const body = fill(GIFT_WELCOME.body[key], { giver: giver || 'Someone', plan: key });
  const subject = fill(GIFT_WELCOME.subject, { plan: key });
  const photo = photoId || WELCOME_FALLBACK_PHOTO_ID;
  const rows = `
          <tr>
            <td style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#FFFFFF;">${esc(GIFT_WELCOME.preheader)}</td>
          </tr>${headerRow()}
          <tr>
            <td style="padding:0;">
              <img src="${giftPhotoUrl(photo)}" alt="${esc(photoLabel(photo))}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 0;">
              <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:700;color:${EMAIL_BLACK};font-family:${EMAIL_FONT};">${esc(heading)}</h1>
              <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:rgba(10,10,10,0.75);font-family:${EMAIL_FONT};">${esc(body)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 36px;">
              <a href="${esc(dashboardUrl)}" style="display:inline-block;padding:14px 32px;border-radius:999px;background:${EMAIL_ACCENT};color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;font-family:${EMAIL_FONT};">${esc(GIFT_WELCOME.button)}</a>
            </td>
          </tr>
${emailFooterRow(`${esc(GIFT_WELCOME.footer)} <a href="mailto:hello@openinvite.com.au" style="color:inherit;text-decoration:underline;">hello@openinvite.com.au</a>`)}`;
  const html = emailShell({ title: subject, bodyRowsHtml: rows, showHeader: false, width: 600 });
  const text = `${heading}\n\n${body}\n\n${GIFT_WELCOME.button}: ${dashboardUrl}\n\n${GIFT_WELCOME.footer} hello@openinvite.com.au`;
  return { subject, html, text };
}
