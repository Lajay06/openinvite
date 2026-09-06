/**
 * src/lib/notificationBadge.js
 *
 * The bell's two decisions, in a plain module rather than inside the component.
 *
 * NOT an .jsx file, and not a helper defined next to the JSX that uses it:
 * tests/persistence/notification-badge.mjs imports these directly under plain
 * Node, which cannot load .jsx at all. avaActionValidation.js sits here for the
 * same reason and says so. A rule that can only be tested through a rendered
 * page tends not to be tested.
 */

/**
 * What the badge says, or '' for no badge.
 *
 * CAPPED, NOT FORMATTED. "9+" is a wider number, never a wider bell: the badge
 * sits on a 16px icon in a fixed-width top bar, and a three-digit count would
 * push it into the avatar beside it.
 */
export function badgeLabel(count) {
  if (!count || count < 1) return '';
  return count > 9 ? '9+' : String(count);
}

/**
 * Unread notifications the couple has NOT yet had in front of them.
 *
 * `seen` holds the ids that were unread when the panel was last opened.
 * Opening the panel is seeing them, so the badge clears — while the row tint
 * and "Mark all read" stay exactly as they were, because reading a list and
 * dealing with it are different acts and only the first has happened.
 *
 * DELIBERATELY NOT A WRITE. Marking every row read on open would put a database
 * write behind a click that is often just a glance, and would erase the unread
 * tint the couple uses to find the row they have not handled yet.
 *
 * A notification that arrives after the panel closes is not in `seen`, so the
 * badge comes back for that one alone.
 */
export function unseenCount(notifications = [], seen = new Set()) {
  return notifications.filter((n) => !n.read && !seen.has(n.id)).length;
}
