/**
 * src/lib/notificationEmailTemplate.js
 *
 * Instant-notification email — same on-brand internal-product-email style
 * as src/lib/collaboratorEmailTemplate.js (not the couple's chosen
 * wedding-website universe). Isomorphic: imported server-side by
 * api/_lib/notify.js to actually send.
 */

const FONT = "'Plus Jakarta Sans', Helvetica, Arial, sans-serif";
const ACCENT = '#E03553';
const BLACK = '#0A0A0A';

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * @param {{ title: string, body?: string, link: string, ctaLabel?: string }} params
 * @returns {{ subject: string, html: string }}
 */
export function renderNotificationEmail({ title, body, link, ctaLabel = 'View in Openinvite' }) {
  const subject = title;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#FAFAFA;font-family:${FONT};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(subject)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAFA;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 24px;border-bottom:1px solid rgba(0,0,0,0.06);">
              <p style="margin:0;font-size:13px;font-weight:700;color:${BLACK};letter-spacing:0.02em;font-family:${FONT};">openinvite</p>
            </td>
          </tr>

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
            <td style="padding:32px 40px 0;">
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

          <!-- Footer -->
          <tr>
            <td style="padding:36px 40px 32px;">
              <div style="height:1px;background:rgba(0,0,0,0.06);margin-bottom:24px;"></div>
              <p style="margin:0;font-size:12px;color:rgba(0,0,0,0.35);font-family:${FONT};">
                You're receiving this because instant email notifications are on for your Openinvite account. Manage this in Account &rarr; Notifications.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
