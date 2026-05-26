/**
 * Purchase confirmation email — sent after a successful Stripe checkout.
 * Returns a plain HTML string (no JSX).
 * @param {{ plan: 'pro' | 'ultra', email: string, name?: string }} opts
 */
export function purchaseConfirmationEmail({ plan, email, name }) {
  const firstName = name ? name.split(' ')[0] : 'there';
  const planLabel = plan === 'ultra' ? 'Ultra' : 'Pro';
  const planPrice = plan === 'ultra' ? '$149' : '$79';
  const planExtras = plan === 'ultra'
    ? 'Full planning suite + invitation design, save the dates, thank you cards, and a complete guest portal with digital invitations.'
    : 'Complete wedding planning — guest management, budget tracking, vendor tools, seating planner, wedding website, Ava AI, and more.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Openinvite ${planLabel} plan is confirmed</title>
</head>
<body style="margin:0;padding:0;background:#F7F7F7;font-family:'Plus Jakarta Sans',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F7;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E8E8E8;">

          <!-- Header -->
          <tr>
            <td style="padding:40px 40px 32px;border-bottom:1px solid #F0F0F0;">
              <p style="margin:0;font-size:15px;font-weight:800;color:#0A0A0A;letter-spacing:-0.02em;">openinvite</p>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.06em;color:rgba(10,10,10,0.4);">
                Payment confirmed
              </p>
              <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#0A0A0A;letter-spacing:-0.02em;line-height:1.2;">
                You're on Openinvite ${planLabel}.
              </h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:rgba(10,10,10,0.65);">
                Hi ${firstName} — your ${planLabel} plan is active. ${planExtras}
              </p>

              <!-- Plan receipt -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border:1px solid #E8E8E8;margin-bottom:32px;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #F0F0F0;">
                    <p style="margin:0;font-size:12px;font-weight:600;color:rgba(10,10,10,0.4);letter-spacing:0.04em;">Plan</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0A0A0A;">Openinvite ${planLabel}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #F0F0F0;">
                    <p style="margin:0;font-size:12px;font-weight:600;color:rgba(10,10,10,0.4);letter-spacing:0.04em;">Amount paid</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0A0A0A;">${planPrice} AUD — one-time</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:12px;font-weight:600;color:rgba(10,10,10,0.4);letter-spacing:0.04em;">Access</p>
                    <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#0A0A0A;">24 months from today</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#E03553;border-radius:999px;">
                    <a href="https://openinvite.com.au/Dashboard"
                       style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:999px;font-family:'Plus Jakarta Sans',Helvetica,Arial,sans-serif;">
                      Go to dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:#F0F0F0;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 40px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:rgba(10,10,10,0.35);">
                This is your payment confirmation for Openinvite ${planLabel} (${planPrice} AUD).<br />
                Questions about your purchase? Reply to this email or contact us at lajay@openinvite.com.au
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
