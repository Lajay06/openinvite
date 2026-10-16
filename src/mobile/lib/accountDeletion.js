/**
 * Account deletion, started in the app. App Store rule 5.1.1(v), ruling 2 of
 * goals/2026-10-15-app-store-launch.md: the owner authorized this one change
 * to the auth surface, and the app runs the same deletion the website runs.
 *
 * The website's deletion is a verified request, not an instant delete:
 * src/pages/Account.jsx handleDeleteRequest sends one email to the team
 * through base44.integrations.Core.SendEmail, then stamps the user with
 * deletionRequestedAt through base44.auth.updateMe. The team verifies and
 * deletes within 7 business days (src/pages/DataDeletion.jsx). That handler
 * lives inside the page and is not exported, so the two calls are repeated
 * here with the same recipient, subject, fields and stamp; lane A's finding
 * asks for it to move into src/lib so both sides import one function.
 */

export const DELETION_INBOX = 'hello@openinvite.com.au';
export const DELETION_SUBJECT = 'Account deletion request';

/** What is removed, as src/pages/DataDeletion.jsx lists it under "What gets deleted". */
export const WHAT_IS_DELETED = Object.freeze([
  'Your account and profile information',
  'All wedding details and planning data',
  'Your guest list, RSVP and guestbook data',
  'Budget, vendor, seating, checklist and schedule data',
  'Your published Guest Suite, if you created one',
  'Your conversations with Ava',
]);

/** The email the team receives, as Account.jsx writes it, marked as sent from the app. */
export function deletionRequestEmail(user) {
  return {
    to: DELETION_INBOX,
    subject: DELETION_SUBJECT,
    body: `Account deletion requested in-app (iPhone app).\n\nEmail: ${user?.email || 'unknown'}\nName: ${user?.full_name || 'unknown'}\nUser ID: ${user?.id || 'unknown'}\n\nPlease verify and process per the data deletion policy.`,
  };
}

/** The stamp Account.jsx writes, which also stops the retention emails (api/_lib/retentionTriggers.js). */
export function deletionStamp(now = new Date()) {
  return { deletionRequestedAt: now.toISOString() };
}
