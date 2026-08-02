import { emailShell, emailFooterRow, EMAIL_ACCENT, EMAIL_BLACK, EMAIL_FONT, EMAIL_MUTED, EMAIL_DIVIDER, EMAIL_BODY_TEXT, EMAIL_SUPPORT_ADDRESS } from '../../src/lib/emailBrand.js';

/**
 * Purchase confirmation email — sent after a successful Stripe checkout.
 * Returns a plain HTML string (no JSX).
 * @param {{ plan: 'pro' | 'ultra', email: string, name?: string }} opts
 */
export function purchaseConfirmationEmail({ plan, email, name }) {
  const firstName = name ? name.split(' ')[0] : 'there';
  const planLabel = plan === 'ultra' ? 'Ultra' : 'Pro';
  const planPrice = plan === 'ultra' ? 'US$99' : 'US$49';
  const planExtras = plan === 'ultra'
    ? 'Everything in Pro, plus the wedding website builder, premium universe themes, digital invitations, and online RSVP for guests.'
    : 'Complete wedding planning: guest and RSVP management, budget tracking, vendor tools, seating planner, Ava AI, and more.';

  const bodyRowsHtml = `
          <!-- Hero -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.06em;color:${EMAIL_MUTED};">
                Payment confirmed
              </p>
              <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:${EMAIL_BLACK};letter-spacing:-0.02em;line-height:1.2;">
                You're on Openinvite ${planLabel}.
              </h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:${EMAIL_BODY_TEXT};">
                Hi ${firstName}, your ${planLabel} plan is active. ${planExtras}
              </p>

              <!-- Plan receipt -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border:1px solid #E8E8E8;margin-bottom:32px;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid ${EMAIL_DIVIDER};">
                    <p style="margin:0;font-size:12px;font-weight:600;color:${EMAIL_MUTED};letter-spacing:0.04em;">Plan</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:${EMAIL_BLACK};">Openinvite ${planLabel}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid ${EMAIL_DIVIDER};">
                    <p style="margin:0;font-size:12px;font-weight:600;color:${EMAIL_MUTED};letter-spacing:0.04em;">Amount paid</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:${EMAIL_BLACK};">${planPrice}, one-time</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:12px;font-weight:600;color:${EMAIL_MUTED};letter-spacing:0.04em;">Access</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:${EMAIL_BLACK};">24 months from today</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${EMAIL_ACCENT};border-radius:999px;">
                    <a href="https://openinvite.com.au/Dashboard"
                       style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:999px;font-family:${EMAIL_FONT};">
                      Go to dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
${emailFooterRow(`
                This is your payment confirmation for Openinvite ${planLabel} (${planPrice}).<br />
                Questions about your purchase? Reply to this email or contact us at ${EMAIL_SUPPORT_ADDRESS}
              `)}`;

  return emailShell({ title: `Your Openinvite ${planLabel} plan is confirmed`, bodyRowsHtml });
}
