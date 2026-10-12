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

import { emailShell, emailFooterRow, escapeHtml, EMAIL_FONT as FONT, EMAIL_ACCENT as ACCENT, EMAIL_BLACK as BLACK } from './emailBrand.js';
import { collaboratorPageLabels, COLLABORATOR_VIEW_ONLY_COPY } from './collaboratorPageMap.js';

/**
 * @param {{ collaboratorName: string, coupleNames: string, acceptUrl: string, permissions: object }} params
 * @returns {{ subject: string, html: string }}
 */
export function renderCollaboratorInviteEmail({ collaboratorName, coupleNames, acceptUrl, permissions = {} }) {
  const firstName = collaboratorName ? collaboratorName.split(' ')[0] : 'there';
  const subject = coupleNames
    ? `You've been invited to help plan ${coupleNames}'s wedding`
    : "You've been invited to help plan a wedding";

  // Item 5 (owner ruling 2026-10-12): the pages by their nav labels, then one
  // sentence. Every page is view only, so nothing here says edit.
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
              <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:rgba(0,0,0,0.68);font-family:${FONT};">${COLLABORATOR_VIEW_ONLY_COPY}</p>
            </td>
          </tr>` : '';

  const bodyRowsHtml = `
          <!-- Kicker + headline -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:${ACCENT};font-family:${FONT};">you're invited to collaborate</p>
              <p style="margin:0;font-size:24px;font-weight:700;color:${BLACK};line-height:1.3;font-family:${FONT};">
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
${emailFooterRow(`Sent by Openinvite on behalf of ${escapeHtml(coupleNames || 'a couple')}. If you weren't expecting this, you can safely ignore it.`)}`;

  return { subject, html: emailShell({ title: subject, bodyRowsHtml }) };
}
