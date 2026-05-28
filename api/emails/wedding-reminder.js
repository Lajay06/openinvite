/**
 * RSVP reminder email template.
 * @param {{ guestName: string, coupleName: string, weddingDate: string, rsvpUrl: string }} opts
 */
export function weddingReminderEmail({ guestName, coupleName, weddingDate, rsvpUrl }) {
  const firstName = guestName ? guestName.split(' ')[0] : 'there';
  const dateStr = weddingDate
    ? new Date(weddingDate).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RSVP reminder</title>
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
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#E03553;letter-spacing:0.1em;">REMINDER</p>
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#0A0A0A;letter-spacing:-0.03em;line-height:1.2;">
                Have you got a moment to RSVP?
              </h1>

              <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:rgba(10,10,10,0.75);">
                Hi ${firstName},
              </p>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:rgba(10,10,10,0.65);">
                Just a friendly nudge — ${coupleName || 'the couple'} would love to hear from you. ${dateStr ? `The wedding is on ${dateStr}` : 'The big day is coming up'} and they're finalising numbers.
              </p>
              <p style="margin:0 0 32px;font-size:15px;line-height:1.7;color:rgba(10,10,10,0.65);">
                It only takes a minute to RSVP.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#E03553;border-radius:999px;">
                    <a href="${rsvpUrl}"
                       style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px;font-family:'Plus Jakarta Sans',Helvetica,Arial,sans-serif;letter-spacing:0.01em;">
                      RSVP now
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:12px;color:rgba(10,10,10,0.4);word-break:break-all;">
                Or copy this link: ${rsvpUrl}
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
                You received this because you were invited to a wedding via openinvite.com.au.<br />
                If you've already responded, you can ignore this email.
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
