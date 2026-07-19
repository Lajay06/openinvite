// Shared defaults for User.notification_prefs — read by the Account
// preferences UI, the bell/event-wiring paths, and the digest cron, so a
// pre-existing account with no prefs object yet behaves identically to one
// that explicitly saved these values.
export const DEFAULT_NOTIFICATION_PREFS = {
  instant_email_rsvp: true,
  instant_email_collaborator: true,
  weekly_digest: true,
  in_app_only: false,
};

export function getNotificationPrefs(user) {
  return { ...DEFAULT_NOTIFICATION_PREFS, ...(user?.notification_prefs || {}) };
}
