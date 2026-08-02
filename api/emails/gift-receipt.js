import { emailShell, emailFooterRow, EMAIL_BLACK, EMAIL_MUTED, EMAIL_BODY_TEXT, EMAIL_SUPPORT_ADDRESS } from '../../src/lib/emailBrand.js';

/**
 * Gift receipt email — sent to the BUYER immediately after a gift-mode
 * checkout completes (PR G4, gifting v2 bridge). Standard emailBrand.js
 * shell, matching every other brand email.
 *
 * The code is shown here too, not just in the recipient's reveal email —
 * the buyer's fallback if the recipient address was mistyped or the reveal
 * email bounces/fails to send: the gift still arrives, the buyer can
 * forward it personally, nothing is stranded.
 *
 * @param {{ plan: 'pro'|'ultra', recipientEmail: string, code: string, recipientEmailSent: boolean }} opts
 */
export function giftReceiptEmail({ plan, recipientEmail, code, recipientEmailSent }) {
  const planLabel = plan === 'ultra' ? 'Ultra' : 'Pro';
  const planPrice = plan === 'ultra' ? 'US$99' : 'US$49';

  const bodyRowsHtml = `
          <!-- Hero -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.06em;color:${EMAIL_MUTED};">
                Gift purchased
              </p>
              <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:${EMAIL_BLACK};letter-spacing:-0.02em;line-height:1.2;">
                Your gift of Openinvite ${planLabel} is on its way.
              </h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:${EMAIL_BODY_TEXT};">
                ${recipientEmailSent
                  ? `We've sent a note to ${recipientEmail} letting them know a gift is waiting for them.`
                  : `We tried to email ${recipientEmail} but it didn't go through. Your gift hasn't gone anywhere — use the code below to send it to them yourself.`}
              </p>

              <!-- Code -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border:1px solid #E8E8E8;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:${EMAIL_MUTED};letter-spacing:0.04em;">
                      Your gift code (fallback — forward this if it doesn't arrive)
                    </p>
                    <p style="margin:0;font-size:22px;font-weight:700;color:${EMAIL_BLACK};letter-spacing:0.04em;font-family:monospace;">
                      ${code}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Receipt -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8E8E8;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #F0F0F0;">
                    <p style="margin:0;font-size:12px;font-weight:600;color:${EMAIL_MUTED};letter-spacing:0.04em;">Plan</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:${EMAIL_BLACK};">Openinvite ${planLabel}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:12px;font-weight:600;color:${EMAIL_MUTED};letter-spacing:0.04em;">Amount paid</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:${EMAIL_BLACK};">${planPrice}, one-time</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
${emailFooterRow(`
                Their 24 months of access starts the moment they redeem this code, not today.<br />
                Questions about this gift? Reply to this email or contact us at ${EMAIL_SUPPORT_ADDRESS}
              `)}`;

  return emailShell({ title: `Your Openinvite ${planLabel} gift is confirmed`, bodyRowsHtml });
}
