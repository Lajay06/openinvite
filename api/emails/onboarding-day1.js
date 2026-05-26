/**
 * Onboarding day-0 welcome email.
 * Sent immediately when a new user completes signup / onboarding.
 *
 * Returns a plain HTML string (no JSX).
 * @param {{ name?: string, email: string }} opts
 */
export function onboardingDay1Email({ name, email }) {
  const firstName = name ? name.split(' ')[0] : 'there';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Openinvite</title>
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
              <h1 style="margin:0 0 12px;font-size:28px;font-weight:700;color:#0A0A0A;letter-spacing:-0.02em;line-height:1.2;">
                Welcome, ${firstName}. 🎉
              </h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:rgba(10,10,10,0.65);">
                You're in. Your 14-day free trial has started — no credit card required.
                We've built Openinvite so you can plan your entire wedding in one place,
                without the overwhelm.
              </p>
            </td>
          </tr>

          <!-- 3 things to do first -->
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="margin:0 0 16px;font-size:12px;font-weight:700;letter-spacing:0.06em;color:rgba(10,10,10,0.4);">
                3 things to do first
              </p>

              <!-- Step 1 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                <tr>
                  <td width="32" valign="top" style="padding-top:2px;">
                    <div style="width:24px;height:24px;background:#0A0A0A;border-radius:999px;text-align:center;line-height:24px;font-size:11px;font-weight:700;color:#FFFFFF;">1</div>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="margin:0;font-size:14px;font-weight:600;color:#0A0A0A;line-height:1.4;">Add your wedding date</p>
                    <p style="margin:4px 0 0;font-size:13px;color:rgba(10,10,10,0.55);line-height:1.5;">
                      Lock in the date so your countdown and checklist sync up automatically.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Step 2 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                <tr>
                  <td width="32" valign="top" style="padding-top:2px;">
                    <div style="width:24px;height:24px;background:#0A0A0A;border-radius:999px;text-align:center;line-height:24px;font-size:11px;font-weight:700;color:#FFFFFF;">2</div>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="margin:0;font-size:14px;font-weight:600;color:#0A0A0A;line-height:1.4;">Invite your partner</p>
                    <p style="margin:4px 0 0;font-size:13px;color:rgba(10,10,10,0.55);line-height:1.5;">
                      Planning together is better. Share access so you're both across everything.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Step 3 -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="32" valign="top" style="padding-top:2px;">
                    <div style="width:24px;height:24px;background:#0A0A0A;border-radius:999px;text-align:center;line-height:24px;font-size:11px;font-weight:700;color:#FFFFFF;">3</div>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="margin:0;font-size:14px;font-weight:600;color:#0A0A0A;line-height:1.4;">Add your first guest</p>
                    <p style="margin:4px 0 0;font-size:13px;color:rgba(10,10,10,0.55);line-height:1.5;">
                      Start your guest list now — you can import from CSV or add them one by one.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 40px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#E03553;border-radius:999px;">
                    <a href="https://openinvite.com.au/Dashboard"
                       style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:999px;font-family:'Plus Jakarta Sans',Helvetica,Arial,sans-serif;">
                      Go to my dashboard →
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
                You're receiving this because you signed up at openinvite.com.au.<br />
                Questions? Reply to this email — we read every one.
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
