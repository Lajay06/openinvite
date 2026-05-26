/**
 * Onboarding day-3 email — introduce Ava.
 * Sent ~3 days after signup to users who haven't yet used Ava.
 *
 * Returns a plain HTML string (no JSX).
 * @param {{ name?: string, email: string }} opts
 */
export function onboardingDay3Email({ name, email }) {
  const firstName = name ? name.split(' ')[0] : 'there';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Have you tried Ava yet?</title>
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

          <!-- Ava intro -->
          <tr>
            <td style="padding:40px 40px 8px;">
              <!-- Ava avatar -->
              <div style="width:48px;height:48px;border-radius:999px;background:linear-gradient(135deg,#ec4899,#9333ea);display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
                <span style="font-size:20px;line-height:1;">✦</span>
              </div>
              <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;color:#0A0A0A;letter-spacing:-0.02em;line-height:1.2;">
                Have you met Ava yet, ${firstName}? 👋
              </h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:rgba(10,10,10,0.65);">
                Ava is your AI wedding assistant — built into your dashboard and available any time.
                She knows your date, your venue, your budget, and your guest list,
                so she can give you advice that's actually relevant to your wedding.
              </p>
            </td>
          </tr>

          <!-- What Ava can do -->
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="margin:0 0 16px;font-size:12px;font-weight:700;letter-spacing:0.06em;color:rgba(10,10,10,0.4);">
                What you can ask Ava
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                ${[
                  { q: '"How much should I budget for florals for 80 guests?"' },
                  { q: '"Draft a wedding website welcome message in our style."' },
                  { q: '"What questions should I ask a photographer?"' },
                  { q: '"Write a thank-you note for our venue deposit."' },
                  { q: '"How do we handle dietary restrictions on our RSVP?"' },
                ].map(({ q }) => `
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #F5F5F5;">
                    <p style="margin:0;font-size:13px;color:rgba(10,10,10,0.7);font-style:italic;line-height:1.5;">${q}</p>
                  </td>
                </tr>`).join('')}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 40px;">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:rgba(10,10,10,0.65);">
                Tap the sparkle ✦ in your dashboard to open Ava and ask her anything.
                She's ready when you are.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#E03553;border-radius:999px;">
                    <a href="https://openinvite.com.au/Dashboard"
                       style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:999px;font-family:'Plus Jakarta Sans',Helvetica,Arial,sans-serif;">
                      Ask Ava anything →
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
                You're receiving this as part of your Openinvite onboarding.<br />
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
