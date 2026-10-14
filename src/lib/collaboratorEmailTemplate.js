/**
 * src/lib/collaboratorEmailTemplate.js
 *
 * On-brand (Openinvite, not the couple's chosen wedding-website universe —
 * this is an internal product email) HTML for the "you've been invited to
 * help plan a wedding" email, built on the shared shell (src/lib/emailBrand.js,
 * PR B4 email audit). Isomorphic: imported server-side by
 * api/send-collaborator-invite.js to actually send, and by the Design
 * Studio-adjacent preview tooling / this task's sign-off artifact to render
 * the exact same markup for review.
 */

import { emailFooterRow, escapeHtml, EMAIL_FONT as FONT, EMAIL_ACCENT as ACCENT, EMAIL_BLACK as BLACK, EMAIL_MUTED_LIGHT, EMAIL_SUPPORT_ADDRESS } from './emailBrand.js';
import { collaboratorPageLabels, collaboratorClosingCopy } from './collaboratorPageMap.js';

/**
 * THE CODE EMAIL'S LAYOUT (owner, 2026-10-13), not the shared emailShell: the
 * onboarding page's gray behind a white card, the full Openinvite logo top
 * left, one full-width header photo, then the invite. The pieces are the
 * verification email's (base44/emails/EmailVerification.html):
 *   - the gray is the app's --background token (src/index.css, hsl 0 0% 96%,
 *     #F5F5F5; color.bgSubtle in src/styles/tokens.js);
 *   - the logo is the site header's lockup with its wordmark recolored for a
 *     light ground, a 2x PNG at /email-assets/openinvite-logo-on-light-2x.png;
 *   - the photo is DTS_QUIET_GLAMOUR_DTS_Studio_Photos_ID8370_coshvz, cropped
 *     c_fill, ar_2:1, g_north, w_1200, f_jpg, q_auto and shown at 600x300,
 *     alt "Openinvite" (owner, 2026-10-13). It is referenced by URL only.
 * emailShell itself is untouched: every other brand email keeps it.
 */
export const INVITE_GROUND = '#F5F5F5';
export const INVITE_LOGO_URL = 'https://res.cloudinary.com/dsr84xknv/image/upload/v1791969939/email-assets/openinvite-logo-on-light-2x.png';
export const INVITE_PHOTO_URL = 'https://res.cloudinary.com/dsr84xknv/image/upload/c_fill,ar_2:1,g_north,w_1200,f_jpg,q_auto/DTS_QUIET_GLAMOUR_DTS_Studio_Photos_ID8370_coshvz';

function inviteShell({ title, preheader, bodyRowsHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${escapeHtml(title)}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .card { width: 100% !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${INVITE_GROUND};font-family:${FONT};">
  <div style="display:none;font-size:1px;color:${INVITE_GROUND};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${INVITE_GROUND};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="card" style="width:600px;max-width:600px;background:#ffffff;">
          <tr>
            <td style="padding:32px 40px 24px;">
              <img src="${INVITE_LOGO_URL}" width="160" height="37" alt="Openinvite" style="display:block;width:160px;height:37px;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:0;">
              <img src="${INVITE_PHOTO_URL}" width="600" height="300" alt="Openinvite" style="display:block;width:100%;max-width:600px;height:auto;border:0;background:#e8e4df;" />
            </td>
          </tr>
${bodyRowsHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
  // Owner copy, 2026-10-12.
  const preheader = coupleNames
    ? `${coupleNames} have shared their plans with you.`
    : 'Someone has shared their wedding plans with you.';

  // Item 5 (owner ruling 2026-10-12): the pages by their nav labels, then one
  // sentence. A page they can change is marked, and the sentence says so.
  const grantedPages = collaboratorPageLabels(permissions).map(escapeHtml);

  const permissionsHtml = grantedPages.length > 0 ? `
          <tr>
            <td style="padding:24px 40px 0;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:rgba(0,0,0,0.4);font-family:${FONT};">The pages you can view</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                ${grantedPages.map(label => `
                <tr>
                  <td style="padding:4px 0;font-size:14px;color:${BLACK};font-family:${FONT};">
                    <span style="color:${ACCENT};">•</span>&nbsp; ${label}
                  </td>
                </tr>`).join('')}
              </table>
              <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:rgba(0,0,0,0.68);font-family:${FONT};">${collaboratorClosingCopy(permissions)}</p>
            </td>
          </tr>` : '';

  const bodyRowsHtml = `
          <!-- Heading: no eyebrow line above it, in any email (owner, 2026-10-13) -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="margin:0;font-size:24px;font-weight:700;color:${BLACK};line-height:1.3;font-family:${FONT};">
                ${escapeHtml(coupleNames || 'A couple')} would love your help planning their wedding.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 40px 0;">
              <p style="margin:0;font-size:15px;line-height:1.7;color:rgba(0,0,0,0.68);font-family:${FONT};">
                Hi ${escapeHtml(firstName)}, they've added you as a collaborator on their Openinvite wedding planning dashboard. Accept the invite below to sign in (or create a free account) and get started.
              </p>
            </td>
          </tr>

${permissionsHtml}

          <!-- CTA -->
          <tr>
            <td style="padding:32px 40px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${ACCENT};border-radius:999px;">
                    <a href="${escapeHtml(acceptUrl)}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px;font-family:${FONT};">
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
${emailFooterRow(`Sent by Openinvite on behalf of ${escapeHtml(coupleNames || 'a couple')}. If you weren't expecting this, you can safely ignore it. Openinvite, Australia. <a href="mailto:${EMAIL_SUPPORT_ADDRESS}" style="color:${EMAIL_MUTED_LIGHT};text-decoration:underline;">${EMAIL_SUPPORT_ADDRESS}</a>`)}`;

  return { subject, preheader, html: inviteShell({ title: subject, preheader, bodyRowsHtml }) };
}
