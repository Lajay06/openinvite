/**
 * src/lib/guestReplyEmailTemplate.js
 *
 * Delivers a couple's reply (Messages page) to the guest who wrote in,
 * styled like src/lib/weeklyDigestEmailTemplate.js — same on-brand
 * internal-product-email chrome (logo header, accent kicker, footer note).
 * Isomorphic: imported server-side by api/send-guest-reply.js.
 */

const FONT = "'Plus Jakarta Sans', Helvetica, Arial, sans-serif";
const ACCENT = '#E03553';
const BLACK = '#0A0A0A';

// Same hosted wordmark weeklyDigestEmailTemplate.js uses — email clients
// need an absolute URL, and this asset is already proven to render
// correctly (including dark mode) across mail clients.
const LOGO_URL = 'https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png';

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

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
  const subject = `${couple} replied to your message`;

  const originalHtml = originalMessage ? `
          <tr>
            <td style="padding:24px 40px 0;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:rgba(0,0,0,0.4);letter-spacing:0.04em;font-family:${FONT};">Your message</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:#FAFAFA;border:1px solid rgba(0,0,0,0.06);">
                <tr>
                  <td style="padding:14px 16px;font-size:14px;line-height:1.6;color:rgba(0,0,0,0.6);font-family:${FONT};font-style:italic;">
                    ${nl2br(originalMessage)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : '';

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
            <td bgcolor="#FFFFFF" style="background:#FFFFFF;padding:28px 40px;border-bottom:1px solid rgba(0,0,0,0.06);">
              <img src="${LOGO_URL}" width="140" height="32" alt="Openinvite" style="display:block;width:140px;height:32px;border:0;outline:none;" />
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:${ACCENT};letter-spacing:0.08em;font-family:${FONT};">new reply</p>
              <p style="margin:0;font-size:24px;font-weight:700;color:${BLACK};line-height:1.3;letter-spacing:-0.01em;font-family:${FONT};">
                Hi ${escapeHtml(firstName)}, ${escapeHtml(couple)} replied
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

          <!-- Footer -->
          <tr>
            <td style="padding:36px 40px 32px;">
              <div style="height:1px;background:rgba(0,0,0,0.06);margin-bottom:24px;"></div>
              <p style="margin:0;font-size:12px;color:rgba(0,0,0,0.35);font-family:${FONT};">
                This is a reply to a message you sent through ${escapeHtml(couple)}'s wedding website.
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
