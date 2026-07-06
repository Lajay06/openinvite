/**
 * src/lib/emailTemplate.js
 *
 * The single invitation/reminder email template. Table-based layout, all CSS
 * inline, no <script>, no background-image, max-width 600px — renders
 * correctly in Gmail, Apple Mail, and Outlook without relying on anything
 * those clients strip or refuse to load.
 *
 * Pure JS, no DOM/Node APIs — importable both from api/emails/*.js (Node,
 * Vercel functions) and from src/ (Vite/browser, for the live compose-step
 * preview). Whatever calls this and gets `html` back is byte-for-byte what
 * Resend sends — there is no second, preview-only render path.
 */

import { getUniverseEmailStyle } from './universeEmailStyles.js';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function nl2br(str) {
  return escapeHtml(str).replace(/\n/g, '<br />');
}

function formatEventDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + (String(iso).length <= 10 ? 'T00:00:00' : ''));
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function dividerHtml(style, accent) {
  if (style === 'bold') {
    return `<div style="height:3px;width:56px;background:${accent};"></div>`;
  }
  if (style === 'dotted') {
    return `<div style="border-top:2px dotted ${accent};font-size:0;line-height:0;">&nbsp;</div>`;
  }
  // hairline (default)
  return `<div style="height:1px;background:${accent}33;"></div>`;
}

/**
 * @param {object} opts
 * @param {string} opts.universeId — one of UNIVERSE_EMAIL_STYLES' keys; falls back to 'aman'
 * @param {string} opts.coupleNames
 * @param {Array<{name:string, date?:string, startTime?:string, venue?:string}>} opts.events
 *   — the events THIS guest is invited to, in the wedding's own event shape
 *   (see getWeddingEvents/getEventVenueAndDate in weddingEvents.js)
 * @param {string} [opts.personalMessage] — free text, may contain newlines
 * @param {string} opts.rsvpUrl
 * @param {boolean} [opts.isReminder]
 * @returns {{ html: string, text: string }}
 */
export function renderInvitationEmail({
  universeId,
  coupleNames,
  events = [],
  personalMessage,
  rsvpUrl,
  isReminder = false,
}) {
  const style = getUniverseEmailStyle(universeId);
  const { bgTint, cardBg, textColor, accent, fontDisplay, fontBody, divider } = style;

  const kicker = isReminder ? 'RSVP reminder' : "You're invited";
  const preheader = isReminder
    ? `A reminder to RSVP${coupleNames ? ` to ${coupleNames}'s wedding` : ''}.`
    : `You're invited${coupleNames ? ` to ${coupleNames}'s wedding` : ''}. Please RSVP.`;

  const eventBlocksHtml = events.map(ev => {
    const dateStr = formatEventDate(ev.date);
    const metaLine = [dateStr, ev.startTime].filter(Boolean).join(' · ');
    return `
          <tr>
            <td style="padding:20px 40px 0;">
              <p style="margin:0 0 3px;font-family:${fontDisplay};font-weight:400;font-size:19px;color:${textColor};">${escapeHtml(ev.name)}</p>
              ${metaLine ? `<p style="margin:0;font-size:14px;color:rgba(0,0,0,0.55);font-family:${fontBody};">${escapeHtml(metaLine)}</p>` : ''}
              ${ev.venue ? `<p style="margin:2px 0 0;font-size:14px;color:rgba(0,0,0,0.55);font-family:${fontBody};">${escapeHtml(ev.venue)}</p>` : ''}
            </td>
          </tr>`;
  }).join('');

  const messageHtml = personalMessage ? `
          <tr>
            <td style="padding:28px 40px 0;">
              <p style="margin:0;font-size:15px;line-height:1.7;color:rgba(0,0,0,0.68);font-family:${fontBody};">${nl2br(personalMessage)}</p>
            </td>
          </tr>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(kicker)}</title>
</head>
<body style="margin:0;padding:0;background:${bgTint};font-family:${fontBody};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bgTint};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${cardBg};border:1px solid rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 24px;border-bottom:1px solid rgba(0,0,0,0.06);">
              <p style="margin:0;font-size:13px;font-weight:700;color:${textColor};letter-spacing:0.02em;font-family:${fontBody};">openinvite</p>
            </td>
          </tr>

          <!-- Kicker + headline -->
          <tr>
            <td style="padding:36px 40px 0;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:${accent};letter-spacing:0.14em;text-transform:uppercase;font-family:${fontBody};">${escapeHtml(kicker)}</p>
              <h1 style="margin:0;font-family:${fontDisplay};font-weight:400;font-size:32px;color:${textColor};line-height:1.15;">${escapeHtml(coupleNames || 'The Wedding')}</h1>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:20px 40px 0;">
              ${dividerHtml(divider, accent)}
            </td>
          </tr>
${eventBlocksHtml}
${messageHtml}

          <!-- CTA -->
          <tr>
            <td style="padding:32px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${accent};border-radius:999px;">
                    <a href="${rsvpUrl}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px;font-family:${fontBody};letter-spacing:0.01em;">
                      RSVP now
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:12px;color:rgba(0,0,0,0.4);word-break:break-all;font-family:${fontBody};">
                Or copy this link: ${escapeHtml(rsvpUrl)}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 40px 0;">
              <div style="height:1px;background:rgba(0,0,0,0.06);"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 36px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:rgba(0,0,0,0.35);font-family:${fontBody};">
                You received this ${isReminder ? 'reminder' : 'invitation'} because someone added you to their guest list on openinvite.com.au.<br />
                If you think this was sent in error, you can ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines = [
    `${kicker.toUpperCase()} — ${coupleNames || 'The Wedding'}`,
    '',
    ...events.flatMap(ev => {
      const dateStr = formatEventDate(ev.date);
      const metaLine = [dateStr, ev.startTime].filter(Boolean).join(' · ');
      return [ev.name, metaLine, ev.venue, ''].filter(l => l !== undefined && l !== '');
    }),
    personalMessage || '',
    personalMessage ? '' : null,
    `RSVP: ${rsvpUrl}`,
    '',
    `You received this ${isReminder ? 'reminder' : 'invitation'} because someone added you to their guest list on openinvite.com.au.`,
    'If you think this was sent in error, you can ignore this email.',
  ].filter(l => l !== null);

  const text = textLines.join('\n');

  return { html, text };
}
