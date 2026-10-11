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
 * card (#F6F2EC, 8px radius as the owner specified, a large #E03553 opening
 * quote, the note in its style, the giver's name in small caps); the red
 * button; the under line; a 40 by 2 red rule and the descriptor at 13px; the
 * footer.
 *
 * FONTS IN EMAIL: Gmail loads no web fonts. The plain note is live text in
 * Plus Jakarta Sans with Helvetica and Arial behind it. The serif (Cormorant
 * Garamond italic) and handwriting (Caveat) notes are an image from
 * Cloudinary's text overlay at 2x, 520px wide, with the full note as alt
 * text (noteImageUrl below).
 */
import { EMAIL_FONT, EMAIL_ACCENT, EMAIL_BLACK, EMAIL_LOGO_MARK_URL, escapeHtml, emailShell, emailFooterRow } from './emailBrand.js';
import { REVEAL, fill, headlineText, giftPhotoUrl, photoLabel, DEFAULT_PHOTO_ID } from './giftingV2.js';
import { PLAN_BADGE_BACKGROUND, PLAN_BADGE_LABEL } from './planBadge.js';

const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';
const NOTE_INK = '1C1916';
const NOTE_GROUND = 'F6F2EC';
const NOTE_FONTS = { serif: 'Cormorant%20Garamond_56_italic', hand: 'Caveat_56' };
// A base for the text layer. Item 2 replaces this with a dedicated 1 by 1
// asset at a new path; until then the default photo is shrunk to one pixel
// and colorized to the card's ground, and the text layer grows the canvas.
const NOTE_BASE = DEFAULT_PHOTO_ID;

/**
 * The note as an image, for the serif and handwriting styles. Commas and
 * slashes in the text are double-encoded, because Cloudinary reads a bare
 * comma as the start of the next parameter.
 */
export function noteImageUrl(note, style, { ground = NOTE_GROUND } = {}) {
  const font = NOTE_FONTS[style];
  if (!font || !note) return '';
  const text = encodeURIComponent(note).replace(/%2C/g, '%252C').replace(/%2F/g, '%252F');
  return `${CLOUD}/c_scale,w_1,h_1/e_colorize:100,co_rgb:${ground}/l_text:${font}:${text},co_rgb:${NOTE_INK},w_1040,c_fit/fl_layer_apply/c_pad,w_1040,b_rgb:${ground}/f_png/${NOTE_BASE}.jpg`;
}

/**
 * THE PLAN BADGE, IN HTML (owner ruling 2026-10-11: wherever Pro or Ultra is
 * named, the dashboard's badge). The same colors as PlanBadge.jsx, from
 * src/lib/planBadge.js; a solid color first, because Outlook and some Gmail
 * views drop a gradient background.
 */
const BADGE_SOLID = { ultra: '#F59E0B', pro: '#E03553' };
export function planBadgeHtml(plan) {
  return `<span style="display:inline-block;font-size:12px;line-height:1.4;font-weight:800;color:#FFFFFF;background-color:${BADGE_SOLID[plan]};background:${PLAN_BADGE_BACKGROUND[plan]};padding:1px 6px;border-radius:3px;font-family:${EMAIL_FONT};vertical-align:baseline;">${PLAN_BADGE_LABEL[plan]}</span>`;
}
/** Escape a line, then set each plan name in it as its badge. */
const withBadges = (text) => escapeHtml(text).replace(/\b(Ultra|Pro)\b/g, (m) => planBadgeHtml(m.toLowerCase()));

function noteBody(note, style) {
  if (style === 'serif' || style === 'hand') {
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
  const rows = `
          <tr>
            <td style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#FFFFFF;">${escapeHtml(REVEAL.preheader)}</td>
          </tr>
          <tr>
            <td style="padding:28px 40px;background:#FFFFFF;">
              <table cellpadding="0" cellspacing="0" role="presentation"><tr>
                <td style="vertical-align:middle;padding-right:8px;"><img src="${EMAIL_LOGO_MARK_URL}" width="24" height="24" alt="" style="display:block;width:24px;height:24px;" /></td>
                <td style="vertical-align:middle;font-size:18px;font-weight:700;color:${EMAIL_BLACK};font-family:${EMAIL_FONT};">Openinvite</td>
              </tr></table>
            </td>
          </tr>
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
          </tr>
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
  return { subject, preheader: REVEAL.preheader, html: emailShell({ title: subject, bodyRowsHtml: rows, showHeader: false, width: 600 }) };
}
