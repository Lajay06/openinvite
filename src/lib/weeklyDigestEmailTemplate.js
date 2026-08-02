/**
 * src/lib/weeklyDigestEmailTemplate.js
 *
 * Weekly wrap-up email, built on the shared shell (src/lib/emailBrand.js,
 * PR B4 email audit). Isomorphic: imported server-side by
 * api/cron/send-weekly-digest.js.
 */

import { emailShell, emailFooterRow, escapeHtml, EMAIL_FONT as FONT, EMAIL_ACCENT as ACCENT, EMAIL_BLACK as BLACK } from './emailBrand.js';

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
    ? `Your week in review: ${daysUntil} day${daysUntil === 1 ? '' : 's'} to go`
    : 'Your week in review';

  const countdownLine = daysUntil == null
    ? ''
    : daysUntil > 0
      ? `<span style="color:${ACCENT};font-weight:700;">${daysUntil} day${daysUntil === 1 ? '' : 's'}</span> until the big day.`
      : daysUntil === 0
        ? `<span style="color:${ACCENT};font-weight:700;">Today's the day!</span>`
        : `Congratulations on your wedding!`;

  const newRsvpLine = newRsvpCount > 0
    ? `${newRsvpCount} new RSVP${newRsvpCount === 1 ? '' : 's'} this week: ${newAttending} attending, ${newDeclined} declined.`
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

  const bodyRowsHtml = `
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
            <td style="padding:32px 40px 40px;">
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
${emailFooterRow(`You're receiving this because weekly digest emails are on for your Openinvite account. <a href="${escapeHtml(accountUrl)}" style="color:rgba(0,0,0,0.5);">Manage this in Account &rarr; Notifications</a>.`)}`;

  return { subject, html: emailShell({ title: subject, bodyRowsHtml }) };
}
