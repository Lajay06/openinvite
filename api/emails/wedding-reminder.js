import { renderInvitationEmail } from '../../src/lib/emailTemplate.js';

/**
 * RSVP reminder email — same shared universe-styled template as the
 * invitation, just with reminder copy and isReminder: true (swaps the
 * kicker/preheader/footer wording).
 *
 * @param {{ guestName: string, coupleName: string, events?: Array, rsvpUrl: string, customBody?: string, universeId?: string }} opts
 * @returns {{ html: string, text: string }}
 */
export function weddingReminderEmail({ guestName, coupleName, events, rsvpUrl, customBody, universeId }) {
  const firstName = guestName ? guestName.split(' ')[0] : 'there';
  const personalMessage = customBody
    || `Hi ${firstName},\n\nJust a friendly nudge — ${coupleName || 'the couple'} would love to hear from you. It only takes a minute to RSVP.`;

  return renderInvitationEmail({
    universeId,
    coupleNames: coupleName,
    events: events || [],
    personalMessage,
    rsvpUrl,
    isReminder: true,
  });
}
