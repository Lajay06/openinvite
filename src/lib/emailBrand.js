/**
 * src/lib/emailBrand.js
 *
 * Single shared shell for every "brand" transactional email (from
 * Openinvite the business to a user — welcome, purchase confirmation,
 * collaborator invite, guest reply, weekly digest, in-app notification
 * email). Replaces two near-identical hand-authored lineages that had
 * drifted from each other (PR B4 email audit):
 *
 *   - onboarding-day1/day3/day7 + purchase-confirmation: #F7F7F7 background,
 *     plain-text "openinvite" wordmark (15px/800), #E8E8E8/#F0F0F0 borders.
 *   - collaborator-invite/guest-reply/weekly-digest/notification: #FAFAFA
 *     background, either a smaller text wordmark (13px/700) or a hosted PNG
 *     image wordmark, rgba(0,0,0,…) borders.
 *
 * Standardised on the first lineage's tokens (more of the live, frequently-
 * seen emails already matched it) and on the plain-text wordmark
 * specifically — a hosted image can render as a broken-image icon in any
 * client that blocks remote images by default, and this asset never can.
 *
 * NOT used by the wedding-invitation family (src/lib/emailTemplate.js,
 * RSVP reminders, thank-you cards) — those are deliberately themed per the
 * couple's own chosen universe, not the flat Openinvite brand look, and
 * that distinction is correct, not drift.
 */

export const EMAIL_FONT = "'Plus Jakarta Sans', Helvetica, Arial, sans-serif";
export const EMAIL_ACCENT = '#E03553';
export const EMAIL_BLACK = '#0A0A0A';
export const EMAIL_BG = '#F7F7F7';
export const EMAIL_CARD_BORDER = '#E8E8E8';
export const EMAIL_DIVIDER = '#F0F0F0';
export const EMAIL_MUTED = 'rgba(10,10,10,0.6)';
export const EMAIL_MUTED_LIGHT = 'rgba(10,10,10,0.35)';
export const EMAIL_BODY_TEXT = 'rgba(10,10,10,0.65)';
export const EMAIL_SUPPORT_ADDRESS = 'hello@openinvite.com.au';

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** The one header row every brand email starts with. */
export function emailHeaderRow() {
  return `
          <tr>
            <td style="padding:40px 40px 32px;border-bottom:1px solid ${EMAIL_DIVIDER};">
              <p style="margin:0;font-size:15px;font-weight:800;color:${EMAIL_BLACK};letter-spacing:-0.02em;font-family:${EMAIL_FONT};">openinvite</p>
            </td>
          </tr>`;
}

/** @param {string} footerHtml — inline HTML for the small muted footer paragraph. */
export function emailFooterRow(footerHtml) {
  return `
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:${EMAIL_DIVIDER};"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 40px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:${EMAIL_MUTED_LIGHT};font-family:${EMAIL_FONT};">
                ${footerHtml}
              </p>
            </td>
          </tr>`;
}

/**
 * @param {{ title: string, bodyRowsHtml: string }} params — bodyRowsHtml is
 *   every `<tr>` between the header and the footer (the footer is not
 *   included automatically — call emailFooterRow() and append it yourself,
 *   since footer copy varies per email).
 */
export function emailShell({ title, bodyRowsHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL_BG};font-family:${EMAIL_FONT};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_BG};padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid ${EMAIL_CARD_BORDER};">
${emailHeaderRow()}
${bodyRowsHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
