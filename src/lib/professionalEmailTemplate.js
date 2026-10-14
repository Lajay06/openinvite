/**
 * src/lib/professionalEmailTemplate.js
 *
 * PROFESSIONAL EMAILS, in the collaborator invite's look: the full logo on a
 * #F5F5F5 ground, a white card, one red pill. An Agency workspace's own name
 * leads the card; Openinvite stays in the footer. No eyebrow line above a
 * heading. US English, no dashes.
 */
import { escapeHtml, EMAIL_FONT as FONT, EMAIL_ACCENT as ACCENT, EMAIL_BLACK as BLACK } from './emailBrand.js';
import { INVITE_GROUND, INVITE_LOGO_URL } from './collaboratorEmailTemplate.js';
import { ROLES } from './professionalAccess.js';

const MUTED = 'rgba(0,0,0,0.68)';
const QUIET = 'rgba(0,0,0,0.45)';

export function proShell({ title, preheader, brandName = '', rows }) {
  const brand = brandName
    ? `<p style="margin:0;font-size:16px;font-weight:700;color:${BLACK};font-family:${FONT};">${escapeHtml(brandName)}</p>`
    : `<img src="${INVITE_LOGO_URL}" width="160" height="37" alt="Openinvite" style="display:block;width:160px;height:37px;border:0;" />`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <title>${escapeHtml(title)}</title>
  <style>@media only screen and (max-width: 600px) { .card { width: 100% !important; } }</style>
</head>
<body style="margin:0;padding:0;background:${INVITE_GROUND};font-family:${FONT};">
  <div style="display:none;font-size:1px;color:${INVITE_GROUND};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${INVITE_GROUND};padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="card" style="width:600px;max-width:600px;background:#ffffff;">
        <tr><td style="padding:32px 40px 8px;">${brand}</td></tr>
${rows}
        <tr><td style="padding:0 40px 32px;">
          <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:${QUIET};font-family:${FONT};">${brandName ? `${escapeHtml(brandName)} plans with ` : ''}Openinvite Professional. Questions, reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

const heading = (text) => `
        <tr><td style="padding:24px 40px 0;"><p style="margin:0;font-size:24px;font-weight:700;color:${BLACK};line-height:1.3;font-family:${FONT};">${text}</p></td></tr>`;
const para = (text) => `
        <tr><td style="padding:16px 40px 0;"><p style="margin:0;font-size:15px;line-height:1.7;color:${MUTED};font-family:${FONT};">${text}</p></td></tr>`;
const button = (label, url) => `
        <tr><td style="padding:28px 40px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${ACCENT};border-radius:999px;">
            <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px;font-family:${FONT};">${escapeHtml(label)}</a>
          </td></tr></table>
          <p style="margin:14px 0 0;font-size:12px;color:${QUIET};word-break:break-all;font-family:${FONT};">${escapeHtml(url)}</p>
        </td></tr>`;

/** A seat on the team. The role's line is the same words the Team page shows. */
export function renderTeamInviteEmail({ workspaceName, inviterName, role, acceptUrl, brandName = '' }) {
  const r = ROLES[role] || ROLES.assistant;
  const ws = workspaceName || 'a planning team';
  const who = inviterName || 'Your team';
  return {
    subject: `${who} added you to ${ws} on Openinvite Professional`,
    html: proShell({
      title: `Join ${ws}`,
      preheader: `You're joining as ${r.label.toLowerCase()}.`,
      brandName,
      rows: heading(`${escapeHtml(who)} added you to ${escapeHtml(ws)}.`)
        + para(`You're joining as <strong style="color:${BLACK};">${escapeHtml(r.label)}</strong>: ${escapeHtml(r.line.charAt(0).toLowerCase() + r.line.slice(1))}`)
        + para('Accept below to sign in, or make a free account with this email address.')
        + button('Join the team', acceptUrl),
    }),
  };
}
