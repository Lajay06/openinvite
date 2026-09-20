/**
 * src/mobile/notifications/copy.ts
 *
 * The notification copy catalog. One template per type. Plain, warm,
 * specific. Titles under 40 characters, bodies under 90. No exclamation
 * marks, no em dashes, no emoji.
 *
 * Each template takes the data the feed already has and returns
 * { title, body }. Keep the wording here, not in the screens, so push
 * notifications and the in-app center say the same thing.
 */

export type NotificationType =
  | 'rsvp_attending'
  | 'rsvp_declined'
  | 'rsvp_maybe'
  | 'message'
  | 'guestbook'
  | 'song_request'
  | 'poll_vote'
  | 'gift'
  | 'task_due'
  | 'task_overdue'
  | 'payment_due'
  | 'briefing';

export interface CopyInput {
  name?: string;
  names?: string[];
  count?: number;
  replied?: number;
  invited?: number;
  preview?: string;
  song?: string;
  artist?: string;
  poll?: string;
  option?: string;
  item?: string;
  amount?: string;
  vendor?: string;
  due?: string;
  task?: string;
  days?: number;
  sentence?: string;
}

const two = (names: string[] = []): string => {
  const list = names.filter(Boolean);
  if (list.length === 0) return 'A guest';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list[0]} and ${list.length - 1} others`;
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Cut at a word boundary, never mid-word. */
const clip = (s: string, n: number): string => {
  const str = (s || '').trim();
  if (str.length <= n) return str;
  const cut = str.slice(0, n - 1);
  const at = cut.lastIndexOf(' ');
  return `${(at > n * 0.6 ? cut.slice(0, at) : cut).replace(/[,;:]$/, '')}…`;
};

export const COPY: Record<NotificationType, (d: CopyInput) => { title: string; body: string }> = {
  rsvp_attending: (d) => ({
    title: `${two(d.names || [d.name || ''])} ${((d.names || [d.name]).filter(Boolean).length > 1) ? 'are' : 'is'} coming`,
    body: `${d.count ?? 1} ${plural(d.count ?? 1, 'guest', 'guests')} attending. ${d.replied ?? 0} of ${d.invited ?? 0} have replied.`,
  }),
  rsvp_declined: (d) => ({
    title: `${two(d.names || [d.name || ''])} can't make it`,
    body: `${d.replied ?? 0} of ${d.invited ?? 0} have replied so far.`,
  }),
  rsvp_maybe: (d) => ({
    title: `${d.name || 'A guest'} isn't sure yet`,
    body: `They said maybe. ${d.replied ?? 0} of ${d.invited ?? 0} have replied.`,
  }),
  message: (d) => ({
    title: `New message from ${d.name || 'a guest'}`,
    body: clip(d.preview || '', 88),
  }),
  guestbook: (d) => ({
    title: `${d.name || 'A guest'} signed your guestbook`,
    body: clip(d.preview || 'Open it to read what they wrote.', 88),
  }),
  song_request: (d) => ({
    title: `Song request from ${d.name || 'a guest'}`,
    body: clip([d.song, d.artist].filter(Boolean).join(' by '), 88) || 'Tap to review it.',
  }),
  poll_vote: (d) => ({
    title: `${d.count ?? 1} new ${plural(d.count ?? 1, 'vote', 'votes')} on ${clip(d.poll || 'your poll', 22)}`,
    body: d.option ? `${d.option} is ahead.` : 'Tap to see how it is going.',
  }),
  gift: (d) => ({
    title: `A gift from ${d.name || 'a guest'}`,
    body: d.item ? `${d.item}${d.amount ? `, ${d.amount}` : ''}.` : 'Open your registry to see it.',
  }),
  task_due: (d) => ({
    title: clip(d.task || 'A task', 38),
    body: d.due ? `Due ${d.due}.` : 'Due soon.',
  }),
  task_overdue: (d) => ({
    title: `Overdue: ${clip(d.task || 'a task', 30)}`,
    body: d.days ? `${d.days} ${plural(d.days, 'day', 'days')} past its date. Still doable.` : 'Past its date. Still doable.',
  }),
  payment_due: (d) => ({
    title: `${clip((d.item || '').length > 24 && d.vendor ? d.vendor : d.item || d.vendor || 'Payment', 26)} due ${d.due || 'soon'}`,
    body: `${d.amount || ''}${d.vendor ? ` to ${d.vendor}` : ''}.`.replace(/^\s*\./, 'Tap to see the details.'),
  }),
  briefing: (d) => ({
    title: d.days != null ? `${d.days} days to go` : 'Your day at a glance',
    body: clip(d.sentence || 'Ava has a short update for you.', 88),
  }),
};

export function notificationCopy(type: NotificationType, data: CopyInput = {}): { title: string; body: string } {
  const fn = COPY[type] || COPY.briefing;
  const out = fn(data);
  return { title: clip(out.title, 40), body: clip(out.body, 90) };
}

/** The types the settings screen offers, with the label the couple sees. */
export const NOTIFICATION_GROUPS: { key: string; label: string; types: NotificationType[]; sub: string }[] = [
  { key: 'rsvps', label: 'Replies', types: ['rsvp_attending', 'rsvp_declined', 'rsvp_maybe'], sub: 'When a guest replies to the invitation' },
  { key: 'messages', label: 'Messages', types: ['message', 'guestbook'], sub: 'New guest messages and guestbook entries' },
  { key: 'requests', label: 'Song requests and polls', types: ['song_request', 'poll_vote'], sub: 'Requests to review and votes as they land' },
  { key: 'gifts', label: 'Gifts', types: ['gift'], sub: 'When something arrives from your registry' },
  { key: 'tasks', label: 'Tasks and payments', types: ['task_due', 'task_overdue', 'payment_due'], sub: 'Things due in the next few days' },
  { key: 'briefing', label: 'Daily briefing', types: ['briefing'], sub: 'One short update from Ava each morning' },
];
