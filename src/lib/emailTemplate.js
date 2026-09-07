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
import { EMAIL_LOGO_MARK_URL } from './emailBrand.js';
import { emailPalette, normalizeVariant, normalizeButtonStyle } from './emailPalette.js';

const SANS_FALLBACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const TYPE_CONFIG = {
  // THE SAVE THE DATE IS THE ONE THAT ARRIVES FIRST, and it asks for nothing.
  //
  // Openinvite already has a save-the-date — SaveTheDatePreview.jsx, a
  // printable asset the couple downloads. What it did not have was a way to
  // SEND one, so the announcement went out as an "invitation" with the RSVP
  // link attached, months before there was anything to reply to.
  //
  // It carries the date and the doorway and stops there: no events, no RSVP,
  // because the answer is not being asked for yet. Nothing else in the send
  // path needed changing — `type` is passed straight through api/send-invites
  // to this table, and EMAIL_TYPES is derived from these keys, so the compose
  // pane and the gallery picked it up the moment the entry existed.
  save_the_date: {
    kicker: 'Save the date',
    showEvents: false,
    showDate: true,
    showRsvp: true,
    ctaLabel: 'See our website',
    footerNoun: 'announcement',
    defaultMessage: (firstName, coupleNames) =>
      `Dear ${firstName},\n\nWe're getting married, and we would love for you to be there. The full invitation will follow — for now, please keep the day free.\n\n${coupleNames || ''}`.trim(),
  },
  // THE INVITATION IS A DOORWAY, NOT A DOCUMENT. Every detail carried here is
  // a reason the guest does not need to open the website, and the website is
  // the product — the ceremony and reception blocks meant the entrance the
  // guest site opens with landed on information already read in Gmail.
  //
  // So the invitation shows the warm message and ONE date line, and its button
  // opens the site rather than jumping to the RSVP form. The date stays because
  // it is the one detail a guest acts on without clicking: it goes in a
  // calendar. Venue and schedule are the site's to reveal.
  //
  // `reminder` and `update` deliberately keep their event blocks. A reminder is
  // chasing a reply and an update EXISTS to say what changed, so stripping
  // detail from those would remove the reason they are sent.
  invite: {
    kicker: "You're invited",
    showEvents: false,
    showDate: true,
    showRsvp: true,
    ctaLabel: 'Open your invitation',
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
      `Hi ${firstName},\n\nJust a friendly nudge, ${coupleNames || 'the couple'} would love to hear from you. It only takes a minute to RSVP.`,
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
  save_the_date: {
    subject: '[Couple names] are getting married — save the date',
    body: "Hi [Guest name],\n\nWe're getting married on [Wedding date], and we would love for you to be there. The full invitation will follow — for now, please keep the day free.\n\n[Couple names]",
  },
  invite: {
    subject: "You're invited to [Couple names]'s wedding",
    body: "Hi [Guest name],\n\nWe'd love for you to celebrate with us on [Wedding date]. Click below to view your invitation and RSVP.\n\nWe can't wait to see you!\n\n[Couple names]",
  },
  reminder: {
    subject: 'Reminder: RSVP to [Couple names]\'s wedding',
    body: "Hi [Guest name],\n\nJust a friendly nudge, [Couple names] would love to hear from you. It only takes a minute to RSVP.\n\n[Couple names]",
  },
  update: {
    subject: "An update about [Couple names]'s wedding",
    body: "Hi [Guest name],\n\nWe wanted to share an important update regarding our upcoming celebration on [Wedding date]. Please review the details below and let us know if you have any questions.\n\n[Couple names]",
  },
  thank_you_attending: {
    subject: 'Thank you for celebrating with [Couple names]!',
    body: "Dear [Guest name],\n\nThank you so much for confirming you'll be celebrating with us! Your presence means the world to us and we can't wait to make beautiful memories together.\n\n[Couple names]",
  },
  thank_you_declined: {
    subject: "[Couple names] will miss you",
    body: "Dear [Guest name],\n\nThank you for letting us know. We completely understand, and while we'll miss celebrating with you on the day, we hope to see you again soon.\n\n[Couple names]",
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
export function isVideoUrl(url) {
  const u = String(url || '').trim().toLowerCase();
  if (!u) return false;
  if (/\.(mp4|webm|mov|m4v|ogv|avi)(\?|#|$)/.test(u)) return true;
  if (/\/video\/upload\//.test(u)) return true;                       // Cloudinary video delivery
  if (/youtube\.com|youtu\.be|vimeo\.com|player\.vimeo/.test(u)) return true;
  return false;
}

const CLOUDINARY_IMAGE_RE = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload)\/([^/]*)\/(.+)$/;

/**
 * THE BANNER IS A PORTRAIT, SO IT IS CROPPED TO THE FACES.
 *
 * A 600x220 email banner is a letterbox — one fifth the height of the photo it
 * comes from. Cloudinary's default center crop takes the middle fifth, which
 * on a wedding photograph is reliably the couple's waists. `g_faces:auto`
 * finds the faces and falls back to `g_auto` (subject detection) when there
 * are none, so a venue shot still crops sensibly.
 *
 * The transform is REPLACED, not appended: the stored URL already carries
 * `w_1400`, and a chained transform would crop pixels that had already been
 * thrown away. Anything that is not a Cloudinary image URL is returned
 * unchanged — an external photo still works, it simply is not re-cropped.
 *
 * @param {string} url
 * @param {{width?: number, height?: number}} [size]
 */
export function emailBannerUrl(url, { width = 1200, height = 440 } = {}) {
  const raw = String(url || '').trim();
  if (!raw || isVideoUrl(raw)) return null;
  const m = CLOUDINARY_IMAGE_RE.exec(raw);
  if (!m) return raw;
  const [, base, , publicId] = m;
  return `${base}/c_fill,g_faces:auto,f_auto,q_auto,w_${width},h_${height}/${publicId}`;
}

/**
 * A VIDEO IS NEVER AN EMAIL BANNER. Owner ruling, restated on review
 * 2026-09-07: "no video in any email".
 *
 * A wedding's `coverPhoto` is a URL, and nothing about the field stops it
 * being a .mp4, a Cloudinary /video/upload/ delivery, or a YouTube link — the
 * couple's hero can be any of those. Dropped into the banner's <img src>, that
 * is a broken image in every mail client on earth, and in the preview it was
 * the site's video playing inside an email.
 *
 * No email client plays video reliably; several strip the element outright.
 * So the banner refuses one rather than degrading into a broken picture, and
 * the email simply has no banner — which the renderer already handles, because
 * "none" has always been a valid choice.
 */
export function getBannerImageUrl({ coverPhoto, venuePhotoUrl } = {}, choice) {
  const picked = choice === 'venue' ? venuePhotoUrl
    : choice === 'wedding' ? coverPhoto
      : null;
  if (!picked || isVideoUrl(picked)) return null;
  return picked;
}

/** First available source, for initialising the compose pane's control. */
export function getDefaultBannerChoice({ coverPhoto, venuePhotoUrl } = {}) {
  // A video cover is not a default banner either — offering it would put a
  // broken image in front of the couple and call it their invitation.
  if (coverPhoto && !isVideoUrl(coverPhoto)) return 'wedding';
  if (venuePhotoUrl && !isVideoUrl(venuePhotoUrl)) return 'venue';
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
  siteUrl,
  weddingDate,
  bannerImageUrl,
  design,
}) {
  const cfg = getEmailTypeConfig(type);
  const style = getUniverseEmailStyle(universeId);
  // ── THE COUPLE'S CHOICE, MADE OF THEIR OWN UNIVERSE ────────────────────
  //
  // Owner ruling 2026-09-07, rejecting the four color buttons the first
  // attempt shipped: the couple picks a VARIANT and a BUTTON STYLE, never a
  // color. Both are rearrangements of colors the universe already owns —
  // see emailPalette.js for why that is the whole point.
  //
  // Unset falls through to `default` / `solid`, so a wedding that has never
  // opened the Emails section renders exactly as it did before.
  const variant = normalizeVariant(design?.paletteVariant);
  const buttonStyle = normalizeButtonStyle(design?.buttonStyle);
  const pal = emailPalette(style, variant);
  const { pageBg, cardBg, ink, inkMuted, inkFaint, hairline, accent, onAccent } = pal;
  const { fontDisplay, fontBody, divider } = style;
  // The old names, kept where the markup below reads better with them.
  const bgTint = pageBg;
  const textColor = ink;

  const firstName = guestName ? guestName.split(' ')[0] : 'there';
  const message = personalMessage || cfg.defaultMessage(firstName, coupleNames);

  const preheader = `${cfg.kicker}${coupleNames ? `: ${coupleNames}` : ''}.`;

  const eventBlocksHtml = cfg.showEvents ? events.map(ev => {
    const dateStr = formatEventDate(ev.date);
    const metaLine = [dateStr, ev.startTime].filter(Boolean).join(' · ');
    return `
          <tr>
            <td style="padding:20px 40px 0;">
              <p style="margin:0 0 3px;font-family:${fontDisplay};font-weight:400;font-size:19px;color:${textColor};">${escapeHtml(ev.name)}</p>
              ${metaLine ? `<p style="margin:0;font-size:14px;color:${inkMuted};font-family:${fontBody};">${escapeHtml(metaLine)}</p>` : ''}
              ${ev.venue ? `<p style="margin:2px 0 0;font-size:14px;color:${inkMuted};font-family:${fontBody};">${escapeHtml(ev.venue)}</p>` : ''}
            </td>
          </tr>`;
  }).join('') : '';

  // One line, in the display face, where the event blocks used to be.
  const inviteDateStr = cfg.showDate
    ? formatEventDate(weddingDate || events?.[0]?.date)
    : '';
  const dateHtml = inviteDateStr ? `
          <tr>
            <td style="padding:22px 40px 0;text-align:center;">
              <p style="margin:0;font-family:${fontDisplay};font-weight:400;font-size:19px;color:${textColor};">${escapeHtml(inviteDateStr)}</p>
            </td>
          </tr>` : '';

  // The button opens the site when we have its address, and falls back to the
  // RSVP link when we do not — an invitation is never sent without a button.
  const ctaUrl = (cfg.showDate && siteUrl) ? siteUrl : rsvpUrl;

  const messageHtml = message ? `
          <tr>
            <td style="padding:28px 40px 0;">
              <p style="margin:0;font-size:15px;line-height:1.7;color:${inkMuted};font-family:${fontBody};">${nl2br(message)}</p>
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

  // ── THE BUTTON ─────────────────────────────────────────────────────────
  //
  // SOLID fills with the accent and takes its label FROM the accent — never
  // fixed white, which is what the hard-coded `color:#FFFFFF` was. Measured
  // across the twenty universes, fourteen of them failed 4.5:1 that way and
  // paris rendered at 1.04:1: near-black text on a near-black button.
  //
  // OUTLINE is a hairline in the accent with the accent as the label, so it
  // reads on a light card and a dark one alike. The border lives on the <td>
  // rather than the <a> because Outlook drops border-radius from an inline
  // anchor and keeps it on a table cell.
  const ctaCellStyle = buttonStyle === 'outline'
    ? `border:1px solid ${accent};border-radius:999px;`
    : `background:${accent};border-radius:999px;`;
  const ctaLabelColor = buttonStyle === 'outline' ? accent : onAccent;

  const ctaHtml = (cfg.showRsvp && ctaUrl) ? `
          <tr>
            <td style="padding:32px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="${ctaCellStyle}">
                    <a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:${ctaLabelColor};text-decoration:none;border-radius:999px;font-family:${fontBody};">
                      ${escapeHtml(cfg.ctaLabel)}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:12px;color:${inkFaint};word-break:break-all;font-family:${fontBody};">
                Or copy this link: ${escapeHtml(ctaUrl)}
              </p>
            </td>
          </tr>` : '';

  // THE MARK IS A DARK PNG, so on a dark card it is a dark square at half
  // opacity — which is to say, nothing. `filter: invert()` is not reliable in
  // Outlook, and there is no light version of the file, so the dark variants
  // drop the glyph and keep the words: the attribution survives, an invisible
  // smudge does not.
  const markCellHtml = pal.isDarkCard ? '' : `                  <td style="padding:0 5px 0 0;vertical-align:middle;">
                    <img src="${EMAIL_LOGO_MARK_URL}" width="11" height="11" alt="" style="display:block;width:11px;height:11px;opacity:0.5;" />
                  </td>`;

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
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${cardBg};border:1px solid ${hairline};">
${bannerHtml}
          <!-- Kicker + headline (no Openinvite branding up top — this email is from
               the couple, not the platform; the couple's names are the focus) -->
          <tr>
            <td style="padding:${bannerImageUrl ? '36px' : '44px'} 40px 0;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:${accent};font-family:${fontBody};">${escapeHtml(cfg.kicker)}</p>
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
${dateHtml}
${messageHtml}
${ctaHtml}

          <!-- Footer -->
          <tr>
            <td style="padding:32px 40px 0;">
              <div style="height:1px;background:${hairline};"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 36px;">
              <p style="margin:0 0 14px;font-size:12px;line-height:1.6;color:${inkFaint};font-family:${fontBody};">
                You received this ${cfg.footerNoun} because someone added you to their guest list on openinvite.com.au.<br />
                If you think this was sent in error, you can ignore this email.
              </p>
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
${markCellHtml}
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-size:11px;color:${inkFaint};font-family:${fontBody};">Powered by Openinvite</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines = [
    `${cfg.kicker.toUpperCase()}: ${coupleNames || 'The Wedding'}`,
    '',
    ...(cfg.showEvents ? events.flatMap(ev => {
      const dateStr = formatEventDate(ev.date);
      const metaLine = [dateStr, ev.startTime].filter(Boolean).join(' · ');
      return [ev.name, metaLine, ev.venue, ''].filter(l => l !== undefined && l !== '');
    }) : []),
    message || '',
    '',
    ...(inviteDateStr ? [inviteDateStr, ''] : []),
    ...((cfg.showRsvp && ctaUrl) ? [`${cfg.ctaLabel}: ${ctaUrl}`, ''] : []),
    `You received this ${cfg.footerNoun} because someone added you to their guest list on openinvite.com.au.`,
    'If you think this was sent in error, you can ignore this email.',
  ];

  const text = textLines.join('\n');

  return { html, text };
}
