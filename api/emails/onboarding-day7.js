/**
 * Onboarding day-7 email — trial ending nudge.
 * Sent ~7 days after signup (trial has 7 days remaining).
 *
 * Returns a plain HTML string (no JSX).
 * @param {{ name?: string, email: string }} opts
 */
export function onboardingDay7Email({ name, email }) {
  const firstName = name ? name.split(' ')[0] : 'there';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your free trial has 7 days left</title>
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
            <td style="padding:40px 40px 8px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;color:#E03553;">
                7 days left on your trial
              </p>
              <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#0A0A0A;letter-spacing:-0.02em;line-height:1.2;">
                Don't lose your progress, ${firstName}.
              </h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:rgba(10,10,10,0.65);">
                Your 14-day free trial ends in 7 days. If you're loving Openinvite —
                or you know you'll need it to plan your wedding — now is a great time to upgrade.
                No pressure, just a heads-up.
              </p>
            </td>
          </tr>

          <!-- Plan comparison -->
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="margin:0 0 16px;font-size:12px;font-weight:700;letter-spacing:0.06em;color:rgba(10,10,10,0.6);">
                Choose the plan that fits you
              </p>

              <!-- Pro -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8E8E8;margin-bottom:12px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin:0 0 2px;font-size:15px;font-weight:700;color:#0A0A0A;">Pro</p>
                          <p style="margin:0;font-size:22px;font-weight:700;color:#0A0A0A;">$79 <span style="font-size:13px;font-weight:400;color:rgba(10,10,10,0.6);">AUD one-time</span></p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:12px;">
                          ${[
                            'Unlimited guests',
                            'Design studio and wedding website',
                            'Ava AI assistant (unlimited)',
                            'Advanced seating planner',
                            'Budget tracker and vendor tools',
                            'Document storage and music manager',
                          ].map(f => `<p style="margin:0 0 6px;font-size:13px;color:rgba(10,10,10,0.65);line-height:1.4;">
                            <span style="color:#E03553;font-weight:700;margin-right:8px;">—</span>${f}
                          </p>`).join('')}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Ultra -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8E8E8;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin:0 0 2px;font-size:15px;font-weight:700;color:#0A0A0A;">Ultra</p>
                          <p style="margin:0;font-size:22px;font-weight:700;color:#0A0A0A;">$149 <span style="font-size:13px;font-weight:400;color:rgba(10,10,10,0.6);">AUD one-time</span></p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:12px;">
                          ${[
                            'Everything in Pro',
                            'Custom domain for your wedding website',
                            'White-glove onboarding call',
                            'Dedicated account manager',
                            'Multiple weddings and events',
                            'API access',
                          ].map(f => `<p style="margin:0 0 6px;font-size:13px;color:rgba(10,10,10,0.65);line-height:1.4;">
                            <span style="color:#7c3aed;font-weight:700;margin-right:8px;">—</span>${f}
                          </p>`).join('')}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 16px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#E03553;border-radius:999px;">
                    <a href="https://openinvite.com.au/pricing"
                       style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:999px;font-family:'Plus Jakarta Sans',Helvetica,Arial,sans-serif;">
                      Upgrade now →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 40px;">
              <p style="margin:0;font-size:13px;color:rgba(10,10,10,0.45);line-height:1.6;">
                Both plans are a one-time payment — no monthly fees, no surprises.
                If you have questions before upgrading, just reply to this email.
              </p>
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
                You're receiving this because your Openinvite free trial is ending.<br />
                If you decide not to upgrade, your account stays read-only after the trial — your data is safe.
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
