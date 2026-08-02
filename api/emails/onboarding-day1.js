import { emailShell, emailFooterRow, EMAIL_ACCENT, EMAIL_BLACK, EMAIL_FONT, EMAIL_MUTED, EMAIL_BODY_TEXT } from '../../src/lib/emailBrand.js';

/**
 * Onboarding day-0 welcome email.
 * Sent immediately when a new user completes signup / onboarding.
 *
 * Returns a plain HTML string (no JSX).
 * @param {{ name?: string, email: string }} opts
 */
export function onboardingDay1Email({ name, email }) {
  const firstName = name ? name.split(' ')[0] : 'there';

  const bodyRowsHtml = `
          <!-- Hero -->
          <tr>
            <td style="padding:40px 40px 8px;">
              <h1 style="margin:0 0 12px;font-size:28px;font-weight:700;color:${EMAIL_BLACK};letter-spacing:-0.02em;line-height:1.2;">
                Welcome, ${firstName}.
              </h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:${EMAIL_BODY_TEXT};">
                You're in. Your 14-day free trial has started, no credit card required.
                We've built Openinvite so you can plan your entire wedding in one place,
                without the overwhelm.
              </p>
            </td>
          </tr>

          <!-- 3 things to do first -->
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="margin:0 0 16px;font-size:12px;font-weight:700;letter-spacing:0.06em;color:${EMAIL_MUTED};">
                3 things to do first
              </p>

              <!-- Step 1 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                <tr>
                  <td width="32" valign="top" style="padding-top:2px;">
                    <div style="width:24px;height:24px;background:${EMAIL_BLACK};border-radius:999px;text-align:center;line-height:24px;font-size:11px;font-weight:700;color:#FFFFFF;">1</div>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="margin:0;font-size:14px;font-weight:600;color:${EMAIL_BLACK};line-height:1.4;">Add your wedding date</p>
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
                    <div style="width:24px;height:24px;background:${EMAIL_BLACK};border-radius:999px;text-align:center;line-height:24px;font-size:11px;font-weight:700;color:#FFFFFF;">2</div>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="margin:0;font-size:14px;font-weight:600;color:${EMAIL_BLACK};line-height:1.4;">Invite your partner</p>
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
                    <div style="width:24px;height:24px;background:${EMAIL_BLACK};border-radius:999px;text-align:center;line-height:24px;font-size:11px;font-weight:700;color:#FFFFFF;">3</div>
                  </td>
                  <td style="padding-left:12px;">
                    <p style="margin:0;font-size:14px;font-weight:600;color:${EMAIL_BLACK};line-height:1.4;">Add your first guest</p>
                    <p style="margin:4px 0 0;font-size:13px;color:rgba(10,10,10,0.55);line-height:1.5;">
                      Start your guest list now. Import from CSV or add guests one by one.
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
                  <td style="background:${EMAIL_ACCENT};border-radius:999px;">
                    <a href="https://openinvite.com.au/Dashboard"
                       style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:999px;font-family:${EMAIL_FONT};">
                      Go to my dashboard →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
${emailFooterRow(`
                You're receiving this because you signed up at openinvite.com.au.<br />
                Questions? Reply to this email, we read every one.
              `)}`;

  return emailShell({ title: 'Welcome to Openinvite', bodyRowsHtml });
}
