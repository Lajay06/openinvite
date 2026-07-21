/**
 * src/lib/emailTemplate.js
 *
 * The single invitation/reminder/update/thank-you email template — the only
 * place in the codebase that produces this HTML. Table-based layout, all CSS
 * inline, no <script>, no background-image, max-width 600px — renders
 * correctly in Gmail, Apple Mail, and Outlook without relying on anything
 * those clients strip or refuse to load.
 *
 * Pure JS, no DOM/Node APIs — importable both from api/*.js (Node, Vercel
 * functions) and from src/ (Vite/browser, for the live compose-pane
 * preview). Whatever calls this and gets `html` back is byte-for-byte what
 * Resend sends — there is no second, preview-only render path.
 *
 * Five email types share this one template, differing only in kicker,
 * whether events/RSVP are shown, the CTA label, the footer's noun, and the
 * default personal message when the caller doesn't supply one:
 *   invite               — the original invitation, events shown, RSVP CTA
 *   reminder             — nudge to RSVP, events shown, RSVP CTA
 *   update                — event details changed, events shown, RSVP CTA
 *                            (guest may need to re-confirm)
 *   thank_you_attending   — sent after RSVP; no events/RSVP CTA, already answered
 *   thank_you_declined    — sent after RSVP; no events/RSVP CTA, already answered
 */

import { getUniverseEmailStyle } from './universeEmailStyles.js';

const SANS_FALLBACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const TYPE_CONFIG = {
  invite: {
    kicker: "You're invited",
    showEvents: true,
    showRsvp: true,
    ctaLabel: 'RSVP now',
    footerNoun: 'invitation',
    defaultMessage: (firstName) =>
      `Dear ${firstName},\n\nWe would love to have you join us to celebrate our wedding. Please let us know if you'll be able to make it.`,
  },
  reminder: {
    kicker: 'RSVP reminder',
    showEvents: true,
    showRsvp: true,
    ctaLabel: 'RSVP now',
    footerNoun: 'reminder',
    defaultMessage: (firstName, coupleNames) =>
      `Hi ${firstName},\n\nJust a friendly nudge — ${coupleNames || 'the couple'} would love to hear from you. It only takes a minute to RSVP.`,
  },
  update: {
    kicker: 'Event update',
    showEvents: true,
    showRsvp: true,
    ctaLabel: 'View details & RSVP',
    footerNoun: 'update',
    defaultMessage: (firstName) =>
      `Dear ${firstName},\n\nWe wanted to share an important update regarding our upcoming celebration. Please review the details below and let us know if you have any questions.`,
  },
  thank_you_attending: {
    kicker: 'Thank you',
    showEvents: false,
    showRsvp: false,
    footerNoun: 'note',
    defaultMessage: (firstName) =>
      `Dear ${firstName},\n\nThank you so much for confirming you'll be celebrating with us! Your presence means the world to us and we can't wait to make beautiful memories together.`,
  },
  thank_you_declined: {
    kicker: "We'll miss you",
    showEvents: false,
    showRsvp: false,
    footerNoun: 'note',
    defaultMessage: (firstName) =>
      `Dear ${firstName},\n\nThank you for letting us know. We completely understand, and while we'll miss celebrating with you on the day, we hope to see you again soon.`,
  },
};

export const EMAIL_TYPES = Object.keys(TYPE_CONFIG);

export function getEmailTypeConfig(type) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.invite;
}

/**
 * Per-type default subject/body for the SendInvitesModal compose textboxes
 * (and the gallery, for consistency) — written with the modal's own
 * [Bracket] merge-tag convention (resolved live by its replaceMergeTags,
 * not by this file) rather than TYPE_CONFIG's defaultMessage() above, which
 * is a plain-text fallback used only when a send has no customBody at all.
 * One place owns "each type's copy block set" so switching type in the
 * drawer always has somewhere correct to load from.
 */
const TYPE_COMPOSE_DEFAULTS = {
  invite: {
    subject: "You're invited to [Couple names]'s wedding 💍",
    body: "Hi [Guest name],\n\nWe'd love for you to celebrate with us on [Wedding date]. Click below to view your invitation and RSVP.\n\nWe can't wait to see you!\n\n— [Couple names]",
  },
  reminder: {
    subject: 'Reminder: RSVP to [Couple names]\'s wedding',
    body: "Hi [Guest name],\n\nJust a friendly nudge — [Couple names] would love to hear from you. It only takes a minute to RSVP.\n\n— [Couple names]",
  },
  update: {
    subject: "An update about [Couple names]'s wedding",
    body: "Hi [Guest name],\n\nWe wanted to share an important update regarding our upcoming celebration on [Wedding date]. Please review the details below and let us know if you have any questions.\n\n— [Couple names]",
  },
  thank_you_attending: {
    subject: 'Thank you for celebrating with [Couple names]!',
    body: "Dear [Guest name],\n\nThank you so much for confirming you'll be celebrating with us! Your presence means the world to us and we can't wait to make beautiful memories together.\n\n— [Couple names]",
  },
  thank_you_declined: {
    subject: "We'll miss you — from [Couple names]",
    body: "Dear [Guest name],\n\nThank you for letting us know. We completely understand, and while we'll miss celebrating with you on the day, we hope to see you again soon.\n\n— [Couple names]",
  },
};

export function getTypeComposeDefaults(type) {
  return TYPE_COMPOSE_DEFAULTS[type] || TYPE_COMPOSE_DEFAULTS.invite;
}

/**
 * Resolves the banner image URL for the email's banner slot. `choice` is
 * the compose pane's explicit selection — 'wedding' (the wedding's own
 * cover photo), 'venue' (the main ceremony venue's Places photo), or
 * 'none'. No silent fallback to a different source than what's selected —
 * if the chosen source has no photo, the banner is simply omitted rather
 * than substituting a different (surprising) image.
 */
export function getBannerImageUrl({ coverPhoto, venuePhotoUrl } = {}, choice) {
  if (choice === 'venue') return venuePhotoUrl || null;
  if (choice === 'wedding') return coverPhoto || null;
  return null;
}

/** First available source, for initialising the compose pane's control. */
export function getDefaultBannerChoice({ coverPhoto, venuePhotoUrl } = {}) {
  if (coverPhoto) return 'wedding';
  if (venuePhotoUrl) return 'venue';
  return 'none';
}

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
 * @param {string} opts.universeId — one of UNIVERSE_EMAIL_STYLES' keys; falls back to 'london'
 * @param {'invite'|'reminder'|'update'|'thank_you_attending'|'thank_you_declined'} [opts.type='invite']
 * @param {string} [opts.guestName] — used only to build the default personalMessage when omitted
 * @param {string} opts.coupleNames
 * @param {Array<{name:string, date?:string, startTime?:string, venue?:string}>} [opts.events]
 *   — the events THIS guest is invited to (ignored when the type doesn't show events)
 * @param {string} [opts.personalMessage] — free text, may contain newlines; defaults per type when omitted
 * @param {string} [opts.rsvpUrl] — required when the type shows an RSVP CTA
 * @param {string} [opts.bannerImageUrl] — resolved via getBannerImageUrl(); omitted entirely when falsy, never a broken image or stock placeholder
 * @returns {{ html: string, text: string }}
 */
export function renderInvitationEmail({
  universeId,
  type = 'invite',
  guestName,
  coupleNames,
  events = [],
  personalMessage,
  rsvpUrl,
  bannerImageUrl,
}) {
  const cfg = getEmailTypeConfig(type);
  const style = getUniverseEmailStyle(universeId);
  const { bgTint, cardBg, textColor, accent, fontDisplay, fontBody, divider } = style;

  const firstName = guestName ? guestName.split(' ')[0] : 'there';
  const message = personalMessage || cfg.defaultMessage(firstName, coupleNames);

  const preheader = `${cfg.kicker}${coupleNames ? ` — ${coupleNames}` : ''}.`;

  const eventBlocksHtml = cfg.showEvents ? events.map(ev => {
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
  }).join('') : '';

  const messageHtml = message ? `
          <tr>
            <td style="padding:28px 40px 0;">
              <p style="margin:0;font-size:15px;line-height:1.7;color:rgba(0,0,0,0.68);font-family:${fontBody};">${nl2br(message)}</p>
            </td>
          </tr>` : '';

  // Single <img>, full-width, fixed height — no background-image (Outlook
  // doesn't render CSS background-image reliably), no broken-image risk:
  // simply omitted when there's no resolved URL.
  const bannerHtml = bannerImageUrl ? `
          <tr>
            <td style="padding:0;line-height:0;font-size:0;">
              <img src="${escapeHtml(bannerImageUrl)}" alt="${escapeHtml(coupleNames ? `${coupleNames}'s wedding` : 'Wedding banner')}" width="600" height="220" style="width:100%;max-width:600px;height:220px;object-fit:cover;display:block;border:0;" />
            </td>
          </tr>` : '';

  const ctaHtml = (cfg.showRsvp && rsvpUrl) ? `
          <tr>
            <td style="padding:32px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${accent};border-radius:999px;">
                    <a href="${rsvpUrl}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px;font-family:${fontBody};letter-spacing:0.01em;">
                      ${escapeHtml(cfg.ctaLabel)}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:12px;color:rgba(0,0,0,0.4);word-break:break-all;font-family:${fontBody};">
                Or copy this link: ${escapeHtml(rsvpUrl)}
              </p>
            </td>
          </tr>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(cfg.kicker)}</title>
</head>
<body style="margin:0;padding:0;background:${bgTint};font-family:${fontBody};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bgTint};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${cardBg};border:1px solid rgba(0,0,0,0.08);">
${bannerHtml}
          <!-- Header -->
          <tr>
            <td style="padding:36px 40px 24px;border-bottom:1px solid rgba(0,0,0,0.06);">
              <p style="margin:0;font-size:13px;font-weight:700;color:${textColor};letter-spacing:0.02em;font-family:${fontBody};">openinvite</p>
            </td>
          </tr>

          <!-- Kicker + headline -->
          <tr>
            <td style="padding:36px 40px 0;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:${accent};letter-spacing:0.14em;text-transform:uppercase;font-family:${fontBody};">${escapeHtml(cfg.kicker)}</p>
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
${ctaHtml}

          <!-- Footer -->
          <tr>
            <td style="padding:32px 40px 0;">
              <div style="height:1px;background:rgba(0,0,0,0.06);"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 36px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:rgba(0,0,0,0.35);font-family:${fontBody};">
                You received this ${cfg.footerNoun} because someone added you to their guest list on openinvite.com.au.<br />
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
    `${cfg.kicker.toUpperCase()} — ${coupleNames || 'The Wedding'}`,
    '',
    ...(cfg.showEvents ? events.flatMap(ev => {
      const dateStr = formatEventDate(ev.date);
      const metaLine = [dateStr, ev.startTime].filter(Boolean).join(' · ');
      return [ev.name, metaLine, ev.venue, ''].filter(l => l !== undefined && l !== '');
    }) : []),
    message || '',
    '',
    ...((cfg.showRsvp && rsvpUrl) ? [`${cfg.ctaLabel}: ${rsvpUrl}`, ''] : []),
    `You received this ${cfg.footerNoun} because someone added you to their guest list on openinvite.com.au.`,
    'If you think this was sent in error, you can ignore this email.',
  ];

  const text = textLines.join('\n');

  return { html, text };
}
