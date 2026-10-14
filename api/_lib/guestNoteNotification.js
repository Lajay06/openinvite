/**
 * api/_lib/guestNoteNotification.js
 *
 * THE ONE EMAIL A COUPLE GETS WHEN A GUEST LEAVES A NOTE.
 *
 * Item 4 of goals/2026-10-10-bounces-and-notes.md. One email per note, no
 * digest, no new preference switch: the owner's ruling, and it is the reason
 * the footer says so out loud rather than offering a setting that does not
 * exist.
 *
 * ── WHY ITS OWN FILE ───────────────────────────────────────────────────────
 *
 * The goal's territory says so, and src/lib/emailTemplate.js is the wrong
 * home for a second reason: that module renders the GUEST-facing invitation
 * family, themed per universe. This is a plain transactional email to the
 * couple's own account address.
 *
 * ── WHY THE SHELL IS LOCAL AND NOT retentionEmails.js's ────────────────────
 *
 * The layout is the retention emails' layout, minus the photo, exactly as the
 * item asks. It is still rendered here rather than by importing their private
 * shell, and the reason is the one that file used for not reaching into
 * emailShell: the retention pair are MARKETING, and a redesign of them is a
 * marketing decision. A note notification is transactional. Coupling the two
 * would mean the next retention restyle silently restyles an email that tells
 * a couple someone wrote to them, which nobody would have decided to do.
 *
 * What IS shared is what should be: the font, the brand red, the black, the
 * support address and escapeHtml, from src/lib/emailBrand.js, the same
 * tokens the retention file takes from the same place.
 *
 * ── NO SENDING HERE ────────────────────────────────────────────────────────
 *
 * This file renders. The caller sends. Keeping Resend out of it means a guard
 * can render the real email with no network, no env var and no key, which is
 * what the retention guard does and why that one is worth anything.
 *
 * ── THE NOTE'S TEXT TRAVELS IN THIS EMAIL, DELIBERATELY ────────────────────
 *
 * GuestMessage keeps the address and the message in an AES blob because
 * GuestMessage.read is open to any authenticated account. That protects the
 * sentence from other accounts, not from the couple it was written to: the
 * email is addressed to them and the item specifies the first 240 characters
 * in the body. The caller passes the plaintext it already holds from the
 * submission; nothing here reads the blob back.
 */

import {
  EMAIL_FONT,
  EMAIL_ACCENT,
  EMAIL_BLACK,
  EMAIL_SUPPORT_ADDRESS,
  escapeHtml,
} from '../../src/lib/emailBrand.js';
import { EMAIL_PHOTOS } from '../../src/lib/emailPhotos.js';

/**
 * The retention palette, by value rather than by import, for the same reason
 * the shell is local: these two emails must be able to move apart without a
 * shared constant deciding that they cannot.
 */
const BG = '#f6f4f1';
const PHOTO = EMAIL_PHOTOS.guestNote;
// A tone off this email's own palette, so a blocked image reads as a
// placeholder rather than a gap. Matches RETENTION_HAIRLINE.
const HAIRLINE_BG = '#e8e4df';
const CARD = '#ffffff';
const FOOTER_TEXT = '#8a8580';
const HAIRLINE = '#e8e4df';
const BODY_TEXT = 'rgba(10,10,10,0.72)';

const LOGO_URL = 'https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/v1785659181/email-assets/openinvite-icon-mark.png';

const APP_URL = process.env.VITE_APP_URL || 'https://openinvite.com.au';

/** Where "Read and reply" goes. The dashboard route, not a deep link to one note. */
export const MESSAGES_PATH = '/Messages';

/** The item's cap on how much of the note the email carries. */
export const NOTE_EXCERPT_LIMIT = 240;

/** Reply-To, named by the item. */
export const NOTE_REPLY_TO = EMAIL_SUPPORT_ADDRESS;

/**
 * WHEN THERE IS NO NAME. guest_name holds a FIRST name or an empty string:
 * api/guest-note-submit.js writes firstNameOrNull(name) || '', so a guest who
 * typed an address into the name field leaves nothing here rather than an
 * address. The bell notification already says "New note from a guest" in that
 * case, and these two follow it.
 *
 * The item's copy is "{Guest first name} left you a note" and "A note from
 * {guest name}", which assume a name exists. These are the fallbacks, not a
 * rewording: with a name, both strings are the item's, character for
 * character.
 */
export const NO_NAME_SUBJECT = 'A guest left you a note';
export const NO_NAME_HEADING = 'A note from a guest';

export const NOTE_PREHEADER = 'It is on your Messages page, with a reply button.';
export const NOTE_BUTTON_LABEL = 'Read and reply';
export const NOTE_FOOTER_LINE = 'You get one email for each note. Reply from Messages, not from this email.';

/**
 * The subject.
 *
 * @param {string} [guestName] the guest's first name, as stored
 * @returns {string}
 */
export function noteSubject(guestName) {
  const name = String(guestName ?? '').trim();
  return name ? `${name} left you a note` : NO_NAME_SUBJECT;
}

/**
 * The heading.
 *
 * @param {string} [guestName]
 * @returns {string}
 */
export function noteHeading(guestName) {
  const name = String(guestName ?? '').trim();
  return name ? `A note from ${name}` : NO_NAME_HEADING;
}

/**
 * The first 240 characters, then "..." if it was cut.
 *
 * CUT AT 240 AND SAY SO. The three dots are the item's, and they are the
 * difference between a note that ends mid-sentence by design and one that
 * looks like it arrived broken. A note of exactly 240 characters is not cut,
 * so it gets no dots: the marker means "there is more", and printing it when
 * there is not would send a couple to the page for nothing.
 *
 * Whitespace is collapsed first. A guest who typed six blank lines would
 * otherwise spend the whole excerpt on them, and the HTML would render them
 * as one space anyway, so the cap would be measured on characters the couple
 * never sees.
 *
 * @param {string} [message]
 * @returns {string}
 */
export function noteExcerpt(message) {
  const text = String(message ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= NOTE_EXCERPT_LIMIT) return text;
  return `${text.slice(0, NOTE_EXCERPT_LIMIT)}...`;
}

/** Hidden from the body, read by the inbox list. */
function preheaderHtml(text) {
  return `<div style="display:none;font-size:1px;color:${BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(text)}</div>`;
}

/**
 * Renders the email.
 *
 * role="presentation" on every layout table, so a screen reader does not
 * announce "table with 1 column" before each paragraph.
 *
 * @param {object} opts
 * @param {string} [opts.guestName] the guest's first name, as stored
 * @param {string} [opts.message]   the note's plaintext, from the submission
 * @returns {{ subject: string, html: string, text: string, replyTo: string }}
 */
export function guestNoteEmail({ guestName, message } = {}) {
  const subject = noteSubject(guestName);
  const heading = noteHeading(guestName);
  const excerpt = noteExcerpt(message);
  const href = `${APP_URL}${MESSAGES_PATH}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:${EMAIL_FONT};">
  ${preheaderHtml(NOTE_PREHEADER)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:${CARD};">
          <!-- The header photo, where the retention emails put theirs. Its own
               height reserves the right box while images are still off. -->
          <tr>
            <td style="padding:0;">
              <img src="${PHOTO.url}" width="${PHOTO.width}" height="${PHOTO.height}" alt="${escapeHtml(PHOTO.alt)}" style="display:block;width:100%;max-width:${PHOTO.width}px;height:auto;border:0;background:${HAIRLINE_BG};" />
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 24px;">
              <img src="${LOGO_URL}" width="28" height="28" alt="Openinvite" style="display:block;width:28px;height:28px;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 18px;">
              <h1 style="margin:0;font-family:${EMAIL_FONT};font-size:26px;font-weight:700;line-height:1.25;letter-spacing:-0.02em;color:${EMAIL_BLACK};">${escapeHtml(heading)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 24px;">
              <p style="margin:0;font-family:${EMAIL_FONT};font-size:16px;line-height:1.65;color:${BODY_TEXT};">${escapeHtml(excerpt)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 32px;">
              <a href="${href}" style="display:inline-block;background:${EMAIL_ACCENT};color:#ffffff;font-family:${EMAIL_FONT};font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:6px;">${escapeHtml(NOTE_BUTTON_LABEL)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:${HAIRLINE};line-height:1px;font-size:0;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 36px;">
              <p style="margin:0;font-family:${EMAIL_FONT};font-size:12px;line-height:1.7;color:${FOOTER_TEXT};">
                ${escapeHtml(NOTE_FOOTER_LINE)} <a href="mailto:${EMAIL_SUPPORT_ADDRESS}" style="color:${FOOTER_TEXT};text-decoration:underline;">${EMAIL_SUPPORT_ADDRESS}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Same copy, same order, the button as a labelled URL.
  const text = [
    heading,
    '',
    excerpt,
    '',
    `${NOTE_BUTTON_LABEL}: ${href}`,
    '',
    '---',
    NOTE_FOOTER_LINE,
    `Openinvite, Australia. ${EMAIL_SUPPORT_ADDRESS}`,
  ].join('\n');

  return { subject, html, text, replyTo: NOTE_REPLY_TO };
}
