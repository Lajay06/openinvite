/**
 * Welcome email — sent when a user creates an account.
 * Returns a plain HTML string (no JSX).
 * @param {{ name?: string, email: string }} opts
 */
export function welcomeEmail({ name, email }) {
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

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#0A0A0A;letter-spacing:-0.02em;line-height:1.2;">
                Welcome, ${firstName}.
              </h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:rgba(10,10,10,0.65);">
                You're in. Your 14-day free trial has started — no credit card required.
              </p>
              <p style="margin:0 0 32px;font-size:15px;line-height:1.7;color:rgba(10,10,10,0.65);">
                Openinvite gives you everything you need to plan your wedding in one place:
                guest management, budget tracking, vendor tools, your own wedding website, and Ava — your AI wedding planner.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#0A0A0A;border-radius:999px;">
                    <a href="https://openinvite.com.au/Dashboard"
                       style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:999px;font-family:'Plus Jakarta Sans',Helvetica,Arial,sans-serif;">
                      Go to your dashboard
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
