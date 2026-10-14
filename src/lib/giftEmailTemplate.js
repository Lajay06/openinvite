/**
 * src/lib/giftEmailTemplate.js
 *
 * THE COUPLE'S GIFT EMAIL (THE REVEAL), RENDERED ONCE FOR BOTH SIDES.
 * goals/2026-10-11-gifting-v2.md. The giver's pages show this exact HTML as
 * the live preview on steps 2 to 6, and item 2's api/_lib/giftEmails.js
 * sends it, so what the giver sees is what the couple get. It is pure: no
 * network, no React, no Node built-ins, the same arrangement as
 * src/lib/emailTemplate.js for invitations.
 *
 * Layout, top to bottom, 600px: a white header with the mark and a dark
 * wordmark; the chosen photo at 6:5; the headline; the body line; the note
 * card (the brand gray #F5F5F5, owner ruling 2026-10-14; 8px radius as the owner specified; a large #E03553 opening
 * quote, the note in its style, the giver's name in small caps); the red
 * button; the under line; a 40 by 2 red rule and the descriptor at 13px; the
 * footer.
 *
 * FONTS IN EMAIL: Gmail loads no web fonts. The plain note is live text in
 * Plus Jakarta Sans with Helvetica and Arial behind it. The serif (Cormorant
 * Garamond, upright) and handwriting (Caveat) notes are an image from
 * Cloudinary's text overlay at 2x, 520px wide, with the full note as alt
 * text (noteImageUrl below).
 */
import { EMAIL_FONT, EMAIL_ACCENT, EMAIL_BLACK, EMAIL_LOGO_MARK_URL, escapeHtml, emailShell, emailFooterRow } from './emailBrand.js';
import { REVEAL, CONFIRM, fill, headlineText, giftPhotoUrl, photoLabel, DEFAULT_PHOTO_ID, noteFaceSize } from './giftingV2.js';
import { PLAN_BADGE_LABEL, PLAN_BADGE_EMAIL_IMAGE } from './planBadge.js';

const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';
const NOTE_INK = '1C1916';
const NOTE_GROUND = 'F5F5F5';
// At 2x: each face set to look as large as the plain note's 17px, its
// lowercase as tall (noteFaceSize), the serif upright regular, never italic
// (owner ruling 2026-10-14).
const NOTE_FONTS = {
  serif: `Cormorant%20Garamond_${Math.round(noteFaceSize('serif', 34))}`,
};

// A base for the text layer: the default photo, shrunk to one pixel and
// colorized to the card's ground, so the text layer grows the canvas around
// it. Cloudinary caches each derived note, so the base costs one fetch.
const NOTE_BASE = DEFAULT_PHOTO_ID;

/**
 * THE HANDWRITTEN NOTE, SIZED FOR ITS BOX (owner ruling 2026-10-14, on the
 * receipt from the gift-test purchase: "far too big"). 30px on a wide screen
 * and 24px on a phone, line height 1.3. The note's box is 462px wide in the
 * 600px email and 220px on a 390px phone (measured), so each size is its own
 * image drawn at 2x for its box, and a media query shows the phone one; a
 * client that ignores the query shows the 30px one. An image cannot wrap a
 * word, so any word longer than a line is broken onto the next before it is
 * drawn: a long word wraps inside the box, never to its edge.
 */
export const HAND_NOTE = {
  wide: { box: 462, px: 30 },
  phone: { box: 220, px: 24 },
  lineHeight: 1.3,
};
// How many characters a line holds: Caveat's letters average about 0.35em
// (measured: "With love, Sam" at 60px is 296px wide); 0.42em is the
// conservative figure, so a line never runs past its box.
const handLineChars = ({ box, px }) => Math.floor(box / (px * 0.42));
/**
 * The note with every word longer than a line broken onto the next, by a
 * line break (never a space), so a long word wraps at the box's edge the way
 * overflow-wrap: anywhere does, and no gap opens inside it.
 */
export function breakLongWords(note, maxChars) {
  return String(note).split(/(\s+)/).map((w) => (/\s/.test(w) || w.length <= maxChars ? w : w.match(new RegExp(`.{1,${maxChars}}`, 'g')).join('\n'))).join('');
}
/**
 * The note's lines for one box: the writer's own line breaks kept, words
 * wrapped greedily at `maxChars`, a word longer than a line split across
 * lines. The image draws these lines exactly; nothing is stretched to fit.
 */
export function wrapNote(note, maxChars) {
  const lines = [];
  for (const para of String(note).split(/\n/)) {
    let line = '';
    for (let word of para.trim().split(/\s+/).filter(Boolean)) {
      if (line && line.length + 1 + word.length <= maxChars) { line += ` ${word}`; continue; }
      if (word.length <= maxChars) { if (line) lines.push(line); line = word; continue; }
      // Longer than a line: like overflow-wrap: anywhere, it starts where it
      // stands and breaks at the box's edge, as many times as it needs.
      if (line) {
        const room = maxChars - line.length - 1;
        if (room > 0) { line += ` ${word.slice(0, room)}`; word = word.slice(room); }
        lines.push(line);
      }
      while (word.length > maxChars) { lines.push(word.slice(0, maxChars)); word = word.slice(maxChars); }
      line = word;
    }
    lines.push(line);
  }
  return lines;
}
/**
 * A handwritten note drawn for one box size, at 2x: the text at exactly the
 * size asked for, its lines wrapped here, then padded out to the box width
 * without scaling. Cloudinary's own wrapping box (w + c_fit) stretches text
 * shorter than a line to fill it, which is what made a short note "far too
 * big"; it is not used.
 */
export function handNoteImageUrl(note, size, { ground = NOTE_GROUND } = {}) {
  if (!note) return '';
  const w = size.box * 2;
  const fontPx = size.px * 2;
  const lines = wrapNote(note, handLineChars(size));
  // Cloudinary's own leading for Caveat is about 1.27 of the font size
  // (measured on the rendered note); the spacing tops it up to the ruled 1.3.
  const spacing = Math.max(0, Math.round(fontPx * (HAND_NOTE.lineHeight - 1.27)));
  // The drawn lines' own height (the last line is a glyph tall, not a line
  // tall), with a little room; the text sits at the top of the box.
  const h = Math.ceil((lines.length - 1) * fontPx * HAND_NOTE.lineHeight + fontPx * 1.15);
  const text = encodeURIComponent(lines.join('\n')).replace(/%2C/g, '%252C').replace(/%2F/g, '%252F');
  return `${CLOUD}/c_scale,w_1,h_1/e_colorize:100,co_rgb:${ground}/l_text:Caveat_${fontPx}_line_spacing_${spacing}:${text},co_rgb:${NOTE_INK}/fl_layer_apply/c_lpad,w_${w},h_${h},g_north_west,b_rgb:${ground}/f_png/${NOTE_BASE}.jpg`;
}
/** The head style that shows the phone note on a phone. */
export const HAND_NOTE_STYLE = `@media only screen and (max-width: 600px) { .oi-note-wide { display: none !important; max-height: 0 !important; } .oi-note-phone { display: block !important; max-height: none !important; width: 100% !important; } }`;

/**
 * The note as an image, for the serif and handwriting styles. Commas and
 * slashes in the text are double-encoded, because Cloudinary reads a bare
 * comma as the start of the next parameter.
 */
export function noteImageUrl(note, style, { ground = NOTE_GROUND } = {}) {
  if (style === 'hand') return handNoteImageUrl(note, HAND_NOTE.wide, { ground });
  const font = NOTE_FONTS[style];
  if (!font || !note) return '';
  const text = encodeURIComponent(note).replace(/%2C/g, '%252C').replace(/%2F/g, '%252F');
  return `${CLOUD}/c_scale,w_1,h_1/e_colorize:100,co_rgb:${ground}/l_text:${font}:${text},co_rgb:${NOTE_INK},w_1040,c_fit/fl_layer_apply/c_pad,w_1040,b_rgb:${ground}/f_png/${NOTE_BASE}.jpg`;
}

/**
 * THE PLAN BADGE, AS AN IMAGE (owner ruling 2026-10-11: wherever Pro or Ultra
 * is named, the dashboard's badge; in an email, as a picture of itself). The
 * picture is PlanBadge's own values rendered at 3x (scripts/gift-assets/
 * plan-badges.mjs), so no client has to draw a gradient or load a font, and
 * the alt text is the plan's name for anyone with images off.
 */
export function planBadgeHtml(plan) {
  const img = PLAN_BADGE_EMAIL_IMAGE[plan] || PLAN_BADGE_EMAIL_IMAGE.ultra;
  return `<img src="${img.url}" alt="${PLAN_BADGE_LABEL[plan] || 'Ultra'}" width="${img.width}" height="${img.height}" style="display:inline-block;width:${img.width}px;height:${img.height}px;vertical-align:-4px;border:0;" />`;
}
/** Escape a line, then set each plan name in it as its badge. */
const withBadges = (text) => escapeHtml(text).replace(/\b(Ultra|Pro)\b/g, (m) => planBadgeHtml(m.toLowerCase()));

/** The white header with the mark and the dark wordmark, shared by both emails. */
function headerRow() {
  return `
          <tr>
            <td style="padding:28px 40px;background:#FFFFFF;">
              <table cellpadding="0" cellspacing="0" role="presentation"><tr>
                <td style="vertical-align:middle;padding-right:8px;"><img src="${EMAIL_LOGO_MARK_URL}" width="24" height="24" alt="" style="display:block;width:24px;height:24px;" /></td>
                <td style="vertical-align:middle;font-size:18px;font-weight:700;color:${EMAIL_BLACK};font-family:${EMAIL_FONT};">Openinvite</td>
              </tr></table>
            </td>
          </tr>`;
}
const preheaderRow = (text) => `
          <tr>
            <td style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#FFFFFF;">${escapeHtml(text)}</td>
          </tr>`;

/** The note card, shared by both emails: the brand gray #F5F5F5, 8px radius, a red opening quote, the giver in small caps. */
function noteCardRow(note, noteStyle, giver) {
  return `
          <tr>
            <td style="padding:28px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#${NOTE_GROUND};border-radius:8px;">
                <tr><td style="padding:24px 28px 26px;">
                  <p style="margin:0 0 6px;font-size:56px;line-height:0.8;font-weight:700;color:${EMAIL_ACCENT};font-family:Georgia,serif;">&ldquo;</p>
                  ${noteBody(note, noteStyle)}
                  <p style="margin:16px 0 0;font-size:13px;font-variant:small-caps;color:rgba(28,25,22,0.75);font-family:${EMAIL_FONT};">${escapeHtml(giver)}</p>
                </td></tr>
              </table>
            </td>
          </tr>`;
}

function noteBody(note, style) {
  if (style === 'hand') {
    const alt = escapeHtml(note);
    return `<img class="oi-note-wide" src="${handNoteImageUrl(note, HAND_NOTE.wide)}" alt="${alt}" width="${HAND_NOTE.wide.box}" style="display:block;width:100%;max-width:${HAND_NOTE.wide.box}px;height:auto;border:0;" />`
      + `<!--[if !mso]><!--><img class="oi-note-phone" src="${handNoteImageUrl(note, HAND_NOTE.phone)}" alt="" width="${HAND_NOTE.phone.box}" style="display:none;max-height:0;overflow:hidden;width:${HAND_NOTE.phone.box}px;height:auto;border:0;" /><!--<![endif]-->`;
  }
  if (style === 'serif') {
    const src = noteImageUrl(note, style);
    return `<img src="${src}" alt="${escapeHtml(note)}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;" />`;
  }
  return `<p style="margin:0;font-size:17px;line-height:1.6;color:#${NOTE_INK};font-family:${EMAIL_FONT};white-space:pre-wrap;">${escapeHtml(note)}</p>`;
}

/**
 * @param {{ plan: 'pro'|'ultra', giver: string, names: string, note: string,
 *   noteStyle: 'plain'|'serif'|'hand', headlineKey: string, photoId: string,
 *   claimUrl?: string }} gift
 * @returns {{ subject: string, preheader: string, html: string }}
 */
export function renderGiftReveal({ plan = 'ultra', giver = '', names = '', note = '', noteStyle = 'plain', headlineKey, photoId, claimUrl = '#' }) {
  const vars = { giver, names, plan };
  const photo = photoId || DEFAULT_PHOTO_ID;
  const subject = fill(REVEAL.subject, vars);
  const rows = `${preheaderRow(REVEAL.preheader)}${headerRow()}
          <tr>
            <td style="padding:0;">
              <img src="${giftPhotoUrl(photo)}" alt="${escapeHtml(photoLabel(photo))}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 0;">
              <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:700;color:${EMAIL_BLACK};font-family:${EMAIL_FONT};">${escapeHtml(headlineText(headlineKey, names))}</h1>
              <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:rgba(10,10,10,0.75);font-family:${EMAIL_FONT};">${withBadges(fill(REVEAL.body[plan] || REVEAL.body.ultra, vars))}</p>
            </td>
          </tr>
${noteCardRow(note, noteStyle, giver)}
          <tr>
            <td style="padding:32px 40px 0;">
              <a href="${escapeHtml(claimUrl)}" style="display:inline-block;padding:14px 32px;border-radius:999px;background:${EMAIL_ACCENT};color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;font-family:${EMAIL_FONT};">${escapeHtml(REVEAL.button)}</a>
              <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:rgba(10,10,10,0.6);font-family:${EMAIL_FONT};">${escapeHtml(REVEAL.under)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 32px;">
              <div style="width:40px;height:2px;background:${EMAIL_ACCENT};margin:0 0 16px;"></div>
              <p style="margin:0;font-size:13px;line-height:1.6;color:rgba(10,10,10,0.6);font-family:${EMAIL_FONT};">${withBadges(REVEAL.descriptor[plan] || REVEAL.descriptor.ultra)}</p>
            </td>
          </tr>
${emailFooterRow(escapeHtml(fill(REVEAL.footer, vars)))}`;
  return { subject, preheader: REVEAL.preheader, html: emailShell({ title: subject, bodyRowsHtml: rows, showHeader: false, width: 600, headStyle: HAND_NOTE_STYLE }) };
}

/**
 * THE GIVER'S EMAIL (THE CONFIRMATION). The same header, note card and footer
 * shape as the reveal; the chosen photo at 2:1; the claim link in a box of its
 * own so the giver can hand it over themselves; an outlined button to the edit
 * page, which works until the gift is claimed. When the reveal is scheduled
 * (sendDate set), the body says when it will go instead.
 *
 * @param {{ plan: 'pro'|'ultra', giver: string, names: string, email: string,
 *   note: string, noteStyle: 'plain'|'serif'|'hand', photoId: string,
 *   claimUrl: string, editUrl: string, sendDate?: string }} gift
 * @returns {{ subject: string, preheader: string, html: string }}
 */
export function renderGiftConfirmation({ plan = 'ultra', giver = '', names = '', email = '', note = '', noteStyle = 'plain', photoId, claimUrl = '#', editUrl = '#', sendDate = '' }) {
  const vars = { giver, names, email, plan };
  const photo = photoId || DEFAULT_PHOTO_ID;
  const subject = fill(CONFIRM.subject, vars);
  const bodyLine = sendDate ? fill(CONFIRM.scheduled, vars).replace('{date}', sendDate) : fill(CONFIRM.body, vars);
  const rows = `${preheaderRow(CONFIRM.preheader)}${headerRow()}
          <tr>
            <td style="padding:0;">
              <img src="${giftPhotoUrl(photo, { ratio: '2:1' })}" alt="${escapeHtml(photoLabel(photo))}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 0;">
              <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:700;color:${EMAIL_BLACK};font-family:${EMAIL_FONT};">${escapeHtml(CONFIRM.heading)}</h1>
              <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:rgba(10,10,10,0.75);font-family:${EMAIL_FONT};">${withBadges(bodyLine)}</p>
            </td>
          </tr>
${noteCardRow(note, noteStyle, giver)}
          <tr>
            <td style="padding:28px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid rgba(10,10,10,0.18);">
                <tr><td style="padding:18px 20px;">
                  <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:${EMAIL_BLACK};font-family:${EMAIL_FONT};">${escapeHtml(CONFIRM.linkBox)}</p>
                  <a href="${escapeHtml(claimUrl)}" style="font-size:14px;line-height:1.5;color:${EMAIL_ACCENT};word-break:break-all;font-family:${EMAIL_FONT};">${escapeHtml(claimUrl)}</a>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 0;">
              <p style="margin:0;font-size:14px;line-height:1.6;color:rgba(10,10,10,0.6);font-family:${EMAIL_FONT};">${escapeHtml(CONFIRM.forward)}</p>
              <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:rgba(10,10,10,0.6);font-family:${EMAIL_FONT};">${escapeHtml(CONFIRM.receipt)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 36px;">
              <a href="${escapeHtml(editUrl)}" style="display:inline-block;padding:12px 28px;border-radius:999px;border:1.5px solid ${EMAIL_BLACK};color:${EMAIL_BLACK};font-size:14px;font-weight:700;text-decoration:none;font-family:${EMAIL_FONT};">${escapeHtml(CONFIRM.button)}</a>
            </td>
          </tr>
${emailFooterRow(escapeHtml(CONFIRM.footer))}`;
  return { subject, preheader: CONFIRM.preheader, html: emailShell({ title: subject, bodyRowsHtml: rows, showHeader: false, width: 600, headStyle: HAND_NOTE_STYLE }) };
}
