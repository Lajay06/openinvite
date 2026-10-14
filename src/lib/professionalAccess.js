/**
 * src/lib/professionalAccess.js
 *
 * WHO MAY DO WHAT INSIDE A WORKSPACE, AND WHERE AN ACCOUNT ENTERS.
 * goals/2026-10-14-professional.md, Team and access, and Accounts and sign-in.
 *
 * The same table is enforced server-side on every endpoint (api/_lib/
 * professionalAuth.js imports this file); the client uses it only to hide
 * what a role cannot do. Hiding is a courtesy; the server is the check.
 */

export const ROLES = {
  owner: { key: 'owner', label: 'Owner', line: 'Billing, partner codes, everything.' },
  planner: { key: 'planner', label: 'Planner', line: 'Full access to the events assigned to them.' },
  assistant: { key: 'assistant', label: 'Assistant', line: 'Tasks, run sheet and standalone guest lists on assigned events. No money.' },
  dayof: { key: 'dayof', label: 'Day-of', line: 'The run sheet and contacts for one event on the day, and can tick items done.' },
};
export const ROLE_ORDER = ['owner', 'planner', 'assistant', 'dayof'];

/** Areas of an event, and of the workspace. */
export const AREAS = [
  'event.view', 'event.edit', 'runsheet.view', 'runsheet.edit', 'runsheet.tick', 'contacts.view',
  'guests.view', 'guests.edit', 'tasks.view', 'tasks.edit', 'vendors.view', 'vendors.edit',
  'money.view', 'money.edit', 'documents.view', 'documents.edit', 'notes.view', 'notes.edit',
  'questionnaires.edit', 'link.invite', 'workspace.events.create', 'workspace.team', 'workspace.codes',
  'workspace.billing', 'workspace.templates', 'workspace.branding',
];

const ALL = new Set(AREAS);
const PLANNER = new Set(AREAS.filter((a) => !a.startsWith('workspace.') || a === 'workspace.templates' || a === 'workspace.events.create'));
const ASSISTANT = new Set([
  'event.view', 'runsheet.view', 'runsheet.edit', 'runsheet.tick', 'contacts.view', 'guests.view', 'guests.edit',
  'tasks.view', 'tasks.edit', 'vendors.view', 'documents.view', 'notes.view', 'notes.edit',
]);
const DAYOF = new Set(['event.view', 'runsheet.view', 'runsheet.tick', 'contacts.view', 'guests.view']);
const GRANTS = { owner: ALL, planner: PLANNER, assistant: ASSISTANT, dayof: DAYOF };

/**
 * Can this member do `area` on this event? The owner can do everything on
 * every event. Everyone else only on events assigned to them. Workspace areas
 * ignore the event. Linked guest data follows the event: any seat on the event
 * sees what the couple shared, and nothing more (the feed decides "more").
 */
export function can(member, area, event = null) {
  if (!member || !GRANTS[member.role]) return false;
  if (!GRANTS[member.role].has(area)) return false;
  if (member.role === 'owner' || area.startsWith('workspace.')) return true;
  if (!event) return false;
  return (member.assigned_event_ids || []).includes(event.id) || (event.assigned_member_ids || []).includes(member.id);
}

/** Events this member can open at all. */
export function visibleEvents(member, events) {
  return (events || []).filter((e) => can(member, 'event.view', e));
}

/**
 * Where a visitor to /professional/app belongs.
 *   'demo'    the entities do not exist yet; the adapter's test data shows, and says so
 *   'signin'  not signed in
 *   'start'   signed in, no account type yet: choose a path at /professional/start
 *   'couple'  a couple's account: one email cannot be both, use a second email
 *   'app'     a professional account
 */
export function resolveEntry({ user, live }) {
  if (!live) return 'demo';
  if (!user) return 'signin';
  if (user.accountType === 'professional') return 'app';
  if (user.accountType === 'couple' || isCoupleAccount(user)) return 'couple';
  return 'start';
}

/** An account that already holds a couple's Openinvite. */
export function isCoupleAccount(user) {
  return !!(user && (user.onboardingCompleted || user.plan_step_completed || user.plan === 'pro' || user.plan === 'ultra'));
}

export const ONE_EMAIL_LINE = 'This email already has a couple’s Openinvite, and one email can’t be both. Sign up for Professional with a second email address.';
