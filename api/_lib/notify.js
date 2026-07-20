/**
 * api/_lib/notify.js
 *
 * Shared server-side notification helper for every event-wiring endpoint
 * (RSVP submit, collaborator accept, questionnaire answer submit). Always
 * creates the in-app Notification row (create RLS is null, same
 * create:null + recipient_user_id-scoped-read pattern as RsvpResponse/
 * PollVote — see BASE44_PLATFORM_NOTES.md and Notifications Part 1's
 * design note). Sends an instant email via Resend only when the
 * recipient's own notification_prefs allow it for this notification type.
 *
 * Required env vars: BASE44_ADMIN_KEY, RESEND_API_KEY (email step degrades
 * to a console.warn and skips, same convention as send-collaborator-invite.js,
 * if RESEND_API_KEY is unset — never blocks the in-app notification).
 */

import { Resend } from 'resend';
import { getBase44User } from './base44Admin.js';
import { renderNotificationEmail } from '../../src/lib/notificationEmailTemplate.js';
import { DEFAULT_NOTIFICATION_PREFS } from '../../src/lib/notificationPrefs.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;
// Same convention as api/create-checkout-session.js.
const APP_URL = process.env.VITE_APP_URL || 'https://openinvite.com.au';
const FROM = 'Openinvite <hello@openinvite.com.au>';

const resend = new Resend(process.env.RESEND_API_KEY);

// Only these two types have a dedicated instant-email preference
// (Notifications Part 2) — questionnaire_answered/task_due/system are
// in-app (bell) only, no instant-email path.
const EMAIL_PREF_BY_TYPE = {
  rsvp_received: 'instant_email_rsvp',
  collaborator_joined: 'instant_email_collaborator',
};

/**
 * @param {{ recipientUserId: string, type: string, title: string, body?: string, link: string, emailCta?: string }} params
 */
export async function notify({ recipientUserId, type, title, body = '', link, emailCta }) {
  if (!recipientUserId) {
    console.error('[notify] Missing recipientUserId — skipping', { type, title });
    return;
  }
  if (!BASE44_ADMIN_KEY) {
    console.error('[notify] BASE44_ADMIN_KEY not set — notification not created', { type });
    return;
  }

  try {
    const res = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/Notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
      body: JSON.stringify({ recipient_user_id: recipientUserId, type, title, body, link }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[notify] Notification create failed (${res.status}):`, text.slice(0, 200));
    }
  } catch (err) {
    console.error('[notify] Notification create threw:', err.message);
  }

  const prefKey = EMAIL_PREF_BY_TYPE[type];
  if (!prefKey) return;

  try {
    const user = await getBase44User(recipientUserId, BASE44_ADMIN_KEY);
    if (!user?.email) {
      console.warn('[notify] Could not resolve recipient email — skipping instant email', { type, recipientUserId });
      return;
    }
    const prefs = { ...DEFAULT_NOTIFICATION_PREFS, ...(user.notification_prefs || {}) };
    if (prefs.in_app_only || !prefs[prefKey]) return;

    if (!process.env.RESEND_API_KEY) {
      console.warn('[notify] RESEND_API_KEY not set — instant email not sent', { type });
      return;
    }
    const { subject, html } = renderNotificationEmail({
      title,
      body,
      link: `${APP_URL}${link}`,
      ctaLabel: emailCta,
    });
    const { error } = await resend.emails.send({ from: FROM, to: user.email, subject, html });
    if (error) console.error('[notify] Resend error:', error.message || error);
  } catch (err) {
    console.error('[notify] Instant email threw:', err.message);
  }
}
