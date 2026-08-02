/**
 * src/lib/notificationEmailTemplate.js
 *
 * Instant-notification email, built on the shared shell
 * (src/lib/emailBrand.js, PR B4 email audit). Isomorphic: imported
 * server-side by api/_lib/notify.js to actually send.
 */

import { emailShell, emailFooterRow, escapeHtml, EMAIL_FONT as FONT, EMAIL_ACCENT as ACCENT, EMAIL_BLACK as BLACK } from './emailBrand.js';

/**
 * @param {{ title: string, body?: string, link: string, ctaLabel?: string }} params
 * @returns {{ subject: string, html: string }}
 */
export function renderNotificationEmail({ title, body, link, ctaLabel = 'View in Openinvite' }) {
  const subject = title;

  const bodyRowsHtml = `
          <!-- Headline -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="margin:0;font-size:22px;font-weight:700;color:${BLACK};line-height:1.3;letter-spacing:-0.01em;font-family:${FONT};">
                ${escapeHtml(title)}
              </p>
            </td>
          </tr>

          ${body ? `
          <tr>
            <td style="padding:16px 40px 0;">
              <p style="margin:0;font-size:15px;line-height:1.7;color:rgba(0,0,0,0.68);font-family:${FONT};">
                ${escapeHtml(body)}
              </p>
            </td>
          </tr>` : ''}

          <!-- CTA -->
          <tr>
            <td style="padding:32px 40px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${ACCENT};border-radius:999px;">
                    <a href="${escapeHtml(link)}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px;font-family:${FONT};letter-spacing:0.01em;">
                      ${escapeHtml(ctaLabel)}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
${emailFooterRow('You\'re receiving this because instant email notifications are on for your Openinvite account. Manage this in Account &rarr; Notifications.')}`;

  return { subject, html: emailShell({ title: subject, bodyRowsHtml }) };
}
