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
 * seen emails already matched it) and, since then (email branding audit),
 * on the hosted logo image specifically, not plain text — see
 * EMAIL_LOGO_MARK_URL below for why a real image now renders reliably here.
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
export const EMAIL_MUTED_LIGHT = 'rgba(10,10,10,0.6)';
export const EMAIL_BODY_TEXT = 'rgba(10,10,10,0.65)';
export const EMAIL_SUPPORT_ADDRESS = 'hello@openinvite.com.au';

// The real brand mark (same "O" icon as public/favicon.svg), re-hosted on
// Cloudinary as a PNG for email-client compatibility (SVG support is
// unreliable in Outlook/older clients). This is the actual logo file — the
// header renders this image alone (with an "Openinvite" alt for clients
// that block remote images), not a separate plain-text wordmark next to it.
export const EMAIL_LOGO_MARK_URL = 'https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/v1785659181/email-assets/openinvite-icon-mark.png';

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** The one header row every brand email starts with — the logo mark, no separate text wordmark. */
export function emailHeaderRow() {
  return `
          <tr>
            <td style="padding:40px 40px 32px;border-bottom:1px solid ${EMAIL_DIVIDER};">
              <img src="${EMAIL_LOGO_MARK_URL}" width="28" height="28" alt="Openinvite" style="display:block;width:28px;height:28px;" />
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
 * Small muted "Powered by openinvite" line for guest-facing emails, which
 * omit the full brand header so the couple's names stay the visual focus.
 * Pass into emailFooterRow() alongside the email's own footer copy.
 */
export function poweredByRow() {
  return `
          <tr>
            <td style="padding:0 40px 40px;">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding:0 5px 0 0;vertical-align:middle;">
                    <img src="${EMAIL_LOGO_MARK_URL}" width="11" height="11" alt="" style="display:block;width:11px;height:11px;opacity:0.5;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-size:11px;color:${EMAIL_MUTED_LIGHT};font-family:${EMAIL_FONT};">Powered by Openinvite</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

/**
 * @param {{ title: string, bodyRowsHtml: string, showHeader?: boolean }} params
 *   — bodyRowsHtml is every `<tr>` between the header and the footer (the
 *   footer is not included automatically — call emailFooterRow() and
 *   append it yourself, since footer copy varies per email).
 *   showHeader defaults to true; set false for guest-facing emails (the
 *   couple's names should be the focus, not the Openinvite brand) — pair
 *   with poweredByRow() in the footer instead.
 */
export function emailShell({ title, bodyRowsHtml, showHeader = true }) {
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
${showHeader ? emailHeaderRow() : ''}
${bodyRowsHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
