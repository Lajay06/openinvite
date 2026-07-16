/**
 * src/lib/collaboratorEmailTemplate.js
 *
 * On-brand (Openinvite, not the couple's chosen wedding-website universe —
 * this is an internal product email) HTML for the "you've been invited to
 * help plan a wedding" email. Isomorphic: imported server-side by
 * api/send-collaborator-invite.js to actually send, and by the Design
 * Studio-adjacent preview tooling / this task's sign-off artifact to render
 * the exact same markup for review.
 *
 * Font stack degrades safely in email clients that don't load @font-face —
 * same convention as src/lib/emailTemplate.js's per-universe styles.
 */

const FONT = "'Plus Jakarta Sans', Helvetica, Arial, sans-serif";
const ACCENT = '#E03553';
const BLACK = '#0A0A0A';

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * @param {{ collaboratorName: string, coupleNames: string, acceptUrl: string, permissions: object }} params
 * @returns {{ subject: string, html: string }}
 */
export function renderCollaboratorInviteEmail({ collaboratorName, coupleNames, acceptUrl, permissions = {} }) {
  const firstName = collaboratorName ? collaboratorName.split(' ')[0] : 'there';
  const subject = coupleNames
    ? `You've been invited to help plan ${coupleNames}'s wedding`
    : "You've been invited to help plan a wedding";

  const grantedPages = Object.entries(permissions)
    .filter(([, p]) => p?.view || p?.edit)
    .map(([page, p]) => `${escapeHtml(page)} (${p.edit ? 'view & edit' : 'view only'})`);

  const permissionsHtml = grantedPages.length > 0 ? `
          <tr>
            <td style="padding:24px 40px 0;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:rgba(0,0,0,0.4);letter-spacing:0.04em;font-family:${FONT};">What you'll be able to help with</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                ${grantedPages.map(label => `
                <tr>
                  <td style="padding:4px 0;font-size:14px;color:${BLACK};font-family:${FONT};">
                    <span style="color:${ACCENT};">•</span>&nbsp; ${label}
                  </td>
                </tr>`).join('')}
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
            <td style="padding:36px 40px 24px;border-bottom:1px solid rgba(0,0,0,0.06);">
              <p style="margin:0;font-size:13px;font-weight:700;color:${BLACK};letter-spacing:0.02em;font-family:${FONT};">openinvite</p>
            </td>
          </tr>

          <!-- Kicker + headline -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:${ACCENT};letter-spacing:0.08em;font-family:${FONT};">you're invited to collaborate</p>
              <p style="margin:0;font-size:24px;font-weight:700;color:${BLACK};line-height:1.3;letter-spacing:-0.01em;font-family:${FONT};">
                Hi ${escapeHtml(firstName)}, ${escapeHtml(coupleNames || 'a couple')} would love your help planning their wedding
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 40px 0;">
              <p style="margin:0;font-size:15px;line-height:1.7;color:rgba(0,0,0,0.68);font-family:${FONT};">
                They've added you as a collaborator on their Openinvite wedding planning dashboard. Accept the invite below to sign in (or create a free account) and get started.
              </p>
            </td>
          </tr>

${permissionsHtml}

          <!-- CTA -->
          <tr>
            <td style="padding:32px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${ACCENT};border-radius:999px;">
                    <a href="${escapeHtml(acceptUrl)}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px;font-family:${FONT};letter-spacing:0.01em;">
                      Accept invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:12px;color:rgba(0,0,0,0.4);word-break:break-all;font-family:${FONT};">
                Or copy this link: ${escapeHtml(acceptUrl)}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:36px 40px 32px;">
              <div style="height:1px;background:rgba(0,0,0,0.06);margin-bottom:24px;"></div>
              <p style="margin:0;font-size:12px;color:rgba(0,0,0,0.35);font-family:${FONT};">
                Sent by Openinvite on behalf of ${escapeHtml(coupleNames || 'a couple')}. If you weren't expecting this, you can safely ignore it.
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
