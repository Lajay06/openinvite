/**
 * src/lib/weeklyDigestEmailTemplate.js
 *
 * Weekly wrap-up email — same on-brand internal-product-email style as
 * src/lib/collaboratorEmailTemplate.js/notificationEmailTemplate.js.
 * Isomorphic: imported server-side by api/cron/send-weekly-digest.js.
 */

const FONT = "'Plus Jakarta Sans', Helvetica, Arial, sans-serif";
const ACCENT = '#E03553';
const BLACK = '#0A0A0A';

// Native asset is 1434x331 (dark wordmark on a transparent background — see
// src/Layout.jsx's brightness(0)/invert(1) filter needed to show it on a
// dark bar). Email clients need an absolute, hosted URL, so this reuses the
// same wordmark AnimatedSidebar.jsx renders unfiltered on white. The header
// <td> below is given an explicit white background for the same reason —
// so the dark logo stays legible even in a mail client's dark mode, which
// can otherwise flip an implicit/inherited white to black.
const LOGO_URL = 'https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png';

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function statRow(label, value) {
  return `
    <tr>
      <td style="padding:10px 0;border-top:1px solid rgba(0,0,0,0.06);font-size:14px;color:rgba(0,0,0,0.68);font-family:${FONT};">${escapeHtml(label)}</td>
      <td style="padding:10px 0;border-top:1px solid rgba(0,0,0,0.06);font-size:14px;font-weight:700;color:${BLACK};font-family:${FONT};text-align:right;">${escapeHtml(String(value))}</td>
    </tr>`;
}

/**
 * @param {{
 *   coupleNames: string,
 *   daysUntil: number|null,
 *   newRsvpCount: number, newAttending: number, newDeclined: number,
 *   totals: { attending: number, declined: number, pending: number, maybe: number, responded: number, total: number },
 *   pollActivity: number, questionnaireActivity: number,
 *   recommendedActions?: Array<{ text: string, url: string }>,
 *   accountUrl: string,
 * }} params
 * @returns {{ subject: string, html: string }}
 */
export function renderWeeklyDigestEmail({
  coupleNames, daysUntil, newRsvpCount, newAttending, newDeclined,
  totals, pollActivity, questionnaireActivity, recommendedActions, accountUrl,
}) {
  const subject = daysUntil != null
    ? `Your week in review — ${daysUntil} day${daysUntil === 1 ? '' : 's'} to go`
    : 'Your week in review';

  const countdownLine = daysUntil == null
    ? ''
    : daysUntil > 0
      ? `<span style="color:${ACCENT};font-weight:700;">${daysUntil} day${daysUntil === 1 ? '' : 's'}</span> until the big day.`
      : daysUntil === 0
        ? `<span style="color:${ACCENT};font-weight:700;">Today's the day!</span>`
        : `Congratulations on your wedding!`;

  const newRsvpLine = newRsvpCount > 0
    ? `${newRsvpCount} new RSVP${newRsvpCount === 1 ? '' : 's'} this week — ${newAttending} attending, ${newDeclined} declined.`
    : 'No new RSVPs this week.';

  const activityHtml = (pollActivity > 0 || questionnaireActivity > 0) ? `
          <tr>
            <td style="padding:24px 40px 0;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:rgba(0,0,0,0.4);letter-spacing:0.04em;font-family:${FONT};">This week's activity</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                ${pollActivity > 0 ? `<tr><td style="padding:4px 0;font-size:14px;color:${BLACK};font-family:${FONT};"><span style="color:${ACCENT};">&bull;</span>&nbsp; ${pollActivity} poll response${pollActivity === 1 ? '' : 's'}</td></tr>` : ''}
                ${questionnaireActivity > 0 ? `<tr><td style="padding:4px 0;font-size:14px;color:${BLACK};font-family:${FONT};"><span style="color:${ACCENT};">&bull;</span>&nbsp; ${questionnaireActivity} questionnaire response${questionnaireActivity === 1 ? '' : 's'}</td></tr>` : ''}
              </table>
            </td>
          </tr>` : '';

  const actionsHtml = (recommendedActions && recommendedActions.length > 0) ? `
          <tr>
            <td style="padding:24px 40px 0;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:rgba(0,0,0,0.4);letter-spacing:0.04em;font-family:${FONT};">This week</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                ${recommendedActions.map(a => `
                <tr>
                  <td style="padding:10px 0;border-top:1px solid rgba(0,0,0,0.06);font-size:14px;line-height:1.5;color:${BLACK};font-family:${FONT};">
                    ${escapeHtml(a.text)} <a href="${escapeHtml(a.url)}" style="color:${ACCENT};font-weight:700;text-decoration:none;">Go &rarr;</a>
                  </td>
                </tr>`).join('')}
              </table>
            </td>
          </tr>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#FAFAFA;font-family:${FONT};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(subject)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAFA;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td bgcolor="#FFFFFF" style="background:#FFFFFF;padding:28px 40px;border-bottom:1px solid rgba(0,0,0,0.06);">
              <img src="${LOGO_URL}" width="140" height="32" alt="Openinvite" style="display:block;width:140px;height:32px;border:0;outline:none;" />
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td style="padding:32px 40px 0;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:${ACCENT};letter-spacing:0.08em;font-family:${FONT};">weekly wrap-up</p>
              <p style="margin:0;font-size:24px;font-weight:700;color:${BLACK};line-height:1.3;letter-spacing:-0.01em;font-family:${FONT};">
                Hi ${escapeHtml(coupleNames || 'there')}, here's your week
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 40px 0;">
              <p style="margin:0;font-size:15px;line-height:1.7;color:rgba(0,0,0,0.68);font-family:${FONT};">
                ${countdownLine} ${escapeHtml(newRsvpLine)}
              </p>
            </td>
          </tr>

          <!-- Running totals -->
          <tr>
            <td style="padding:24px 40px 0;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:rgba(0,0,0,0.4);letter-spacing:0.04em;font-family:${FONT};">Guest list totals</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                ${statRow('Attending', totals.attending)}
                ${statRow('Declined', totals.declined)}
                ${statRow('Awaiting response', totals.pending)}
                ${statRow('Total invited', totals.total)}
              </table>
            </td>
          </tr>

${actionsHtml}
${activityHtml}

          <!-- CTA -->
          <tr>
            <td style="padding:32px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${ACCENT};border-radius:999px;">
                    <a href="${escapeHtml(accountUrl.replace('/account', '/Guests'))}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px;font-family:${FONT};letter-spacing:0.01em;">
                      View your guest list
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:36px 40px 32px;">
              <div style="height:1px;background:rgba(0,0,0,0.06);margin-bottom:24px;"></div>
              <p style="margin:0;font-size:12px;color:rgba(0,0,0,0.35);font-family:${FONT};">
                You're receiving this because weekly digest emails are on for your Openinvite account. <a href="${escapeHtml(accountUrl)}" style="color:rgba(0,0,0,0.5);">Manage this in Account &rarr; Notifications</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
