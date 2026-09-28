/**
 * src/lib/guestReplyEmailTemplate.js
 *
 * Delivers a couple's reply (Messages page) to the guest who wrote in,
 * built on the shared shell (src/lib/emailBrand.js, PR B4 email audit).
 * Isomorphic: imported server-side by api/send-guest-reply.js.
 *
 * THE NAMES ARE THE SERVER'S, NOT THE CALLER'S. api/send-guest-reply.js resolves
 * them with coupleDisplayName() from the wedding it has just authenticated the
 * caller against, the same way api/rsvp-submit.js does. The page used to send
 * Invitation.couple_names, which is a different record from the wedding — a
 * couple with names on WeddingDetails and no Invitation row sent nothing, and
 * every one of the five places below printed the 'The couple' fallback. Owner
 * live pass, 2026-09-28.
 *
 * `coupleNames` is still the parameter name, because that is what it is; it is
 * the resolution that moved, not the shape.
 */

import { emailShell, emailFooterRow, poweredByRow, escapeHtml, EMAIL_FONT as FONT, EMAIL_ACCENT as ACCENT, EMAIL_BLACK as BLACK } from './emailBrand.js';

function nl2br(str) {
  return escapeHtml(str).replace(/\n/g, '<br />');
}

/**
 * @param {{ guestName: string, coupleNames: string, originalMessage: string, replyText: string }} params
 * @returns {{ subject: string, html: string }}
 */
export function renderGuestReplyEmail({ guestName, coupleNames, originalMessage, replyText }) {
  const firstName = (guestName || 'there').split(' ')[0];
  const couple = coupleNames || 'The couple';
  const subject = `${couple} replied to your note`;

  const originalHtml = originalMessage ? `
          <tr>
            <td style="padding:24px 40px 0;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:rgba(0,0,0,0.4);font-family:${FONT};">Your note</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#FAFAFA;border:1px solid rgba(0,0,0,0.06);">
                <tr>
                  <td style="padding:14px 16px;font-size:14px;line-height:1.6;color:rgba(0,0,0,0.6);font-family:${FONT};font-style:italic;">
                    ${nl2br(originalMessage)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : '';

  const bodyRowsHtml = `
          <!-- Headline -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:${ACCENT};font-family:${FONT};">A reply from ${escapeHtml(couple)}</p>
              <p style="margin:0;font-size:24px;font-weight:700;color:${BLACK};line-height:1.3;font-family:${FONT};">
                Hi ${escapeHtml(firstName)},
              </p>
            </td>
          </tr>

          <!-- Reply body -->
          <tr>
            <td style="padding:16px 40px 0;">
              <p style="margin:0;font-size:15px;line-height:1.7;color:${BLACK};font-family:${FONT};white-space:pre-wrap;">${nl2br(replyText)}</p>
            </td>
          </tr>

${originalHtml}
          <tr><td style="padding:24px 0 0;"></td></tr>
${emailFooterRow(`This is a reply to the note you sent ${escapeHtml(couple)} from their wedding site. Replying to this email goes straight to them.`)}
${poweredByRow()}`;

  return { subject, html: emailShell({ title: subject, bodyRowsHtml, showHeader: false }) };
}
