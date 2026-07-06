import { renderInvitationEmail } from '../../src/lib/emailTemplate.js';

/**
 * Wedding invitation email — thin wrapper around the shared universe-styled
 * template (src/lib/emailTemplate.js), the same renderer used for the
 * compose-step live preview client-side. What you preview is what's sent.
 *
 * @param {{ guestName: string, coupleName: string, events?: Array, rsvpUrl: string, customBody?: string, universeId?: string }} opts
 * @returns {{ html: string, text: string }}
 */
export function weddingInviteEmail({ guestName, coupleName, events, rsvpUrl, customBody, universeId }) {
  const firstName = guestName ? guestName.split(' ')[0] : 'there';
  const personalMessage = customBody || `Dear ${firstName},\n\nWe would love to have you join us to celebrate our wedding. Please let us know if you'll be able to make it.`;

  return renderInvitationEmail({
    universeId,
    coupleNames: coupleName,
    events: events || [],
    personalMessage,
    rsvpUrl,
    isReminder: false,
  });
}
