/**
 * Builds the notification feed from data the app already has. Pure: takes
 * records, returns items. The hook wraps it; the preview calls it with
 * fixtures. A real backend table can replace the derived parts later
 * without touching the screens, because the screens only see `items`.
 *
 * item: { id, type, ts (ms), title, body, link, group, data }
 */
import { notificationCopy } from './copy';
import { isAttending, isDeclined, isMaybe, isAwaitingPrimary } from '@/lib/guestRsvpTally';
import { budgetCategoryLabel } from '@/lib/budgetCategories';

const DAY = 86400000;

export function buildFeed({ entity = [], guests = [], messages = [], songRequests = [], pollVotes = [], polls = [], gifts = [], tasks = [], budget = [], guestbook = [], briefing = null, now = Date.now(), symbol = '$', base = '/m' } = {}) {
  const items = [];
  const push = (it) => { if (it && it.ts) items.push(it); };
  const t = (s) => { const d = s ? new Date(s).getTime() : NaN; return Number.isNaN(d) ? 0 : d; };

  const invited = guests.filter((g) => !!g.invite_sent_at).length;
  const replied = guests.filter((g) => g.invite_sent_at && !isAwaitingPrimary(g)).length;

  // Server-written Notification rows (rsvp_received, collaborator_joined, questionnaire_answered).
  for (const n of entity) {
    push({ id: `n:${n.id}`, type: n.type === 'rsvp_received' ? 'rsvp_attending' : 'briefing', raw: n.type, ts: t(n.created_date), title: (n.title || '').slice(0, 40), body: (n.body || '').slice(0, 90), link: mapLink(n.link, base), group: 'rsvps', readOnServer: !!n.read, entityId: n.id });
  }

  // Replies, derived from the guest list when the server rows do not cover them.
  const covered = new Set(entity.filter((n) => n.type === 'rsvp_received').map((n) => (n.title || '').toLowerCase()));
  for (const g of guests) {
    const when = t(g.rsvp_date || g.responded_at);
    if (!when || !g.invite_sent_at) continue;
    if ([...covered].some((c) => c.includes((g.name || '').toLowerCase()) && g.name)) continue;
    const type = isAttending(g) ? 'rsvp_attending' : isDeclined(g) ? 'rsvp_declined' : isMaybe(g) ? 'rsvp_maybe' : null;
    if (!type) continue;
    const { title, body } = notificationCopy(type, { name: g.name, count: 1 + (g.plus_one && g.plus_one_rsvp === 'attending' ? 1 : 0), replied, invited });
    push({ id: `rsvp:${g.id}:${g.rsvp_status}`, type, ts: when, title, body, link: `${base}/guests/${g.id}`, group: 'rsvps', data: g });
  }

  for (const m of messages) {
    const { title, body } = notificationCopy('message', { name: m.guest_name, preview: m.message });
    push({ id: `msg:${m.id}`, type: 'message', ts: t(m.created_date), title, body, link: `${base}/plan/messages/${m.id}`, group: 'messages', readOnServer: !!m.read, data: m });
  }

  for (const e of guestbook) {
    const { title, body } = notificationCopy('guestbook', { name: e.guest_name, preview: e.message });
    push({ id: `gb:${e.id}`, type: 'guestbook', ts: t(e.created_date), title, body, link: `${base}/plan/guestbook`, group: 'messages', data: e });
  }

  for (const r of songRequests) {
    if (r.status && r.status !== 'pending') continue;
    const { title, body } = notificationCopy('song_request', { name: r.submittedBy, song: r.title, artist: r.artist });
    push({ id: `song:${r.id}`, type: 'song_request', ts: t(r.created_date), title, body, link: `${base}/plan/music?segment=requests`, group: 'requests', data: r });
  }

  // Poll votes, grouped per poll per day.
  const byPoll = new Map();
  for (const v of pollVotes) {
    const day = Math.floor(t(v.created_date) / DAY);
    const k = `${v.poll_id}:${day}`;
    const cur = byPoll.get(k) || { poll_id: v.poll_id, ts: 0, count: 0, options: {} };
    cur.count += 1;
    cur.ts = Math.max(cur.ts, t(v.created_date));
    cur.options[v.option_id] = (cur.options[v.option_id] || 0) + 1;
    byPoll.set(k, cur);
  }
  for (const [k, v] of byPoll) {
    const poll = polls.find((p) => p.id === v.poll_id);
    const top = Object.entries(v.options).sort((a, b) => b[1] - a[1])[0]?.[0];
    const option = poll?.options?.find((o) => o.id === top)?.label;
    const { title, body } = notificationCopy('poll_vote', { count: v.count, poll: poll?.title, option });
    push({ id: `poll:${k}`, type: 'poll_vote', ts: v.ts, title, body, link: `${base}/plan/polls`, group: 'requests', data: v });
  }

  for (const g of gifts) {
    const { title, body } = notificationCopy('gift', { name: g.giver_name, item: g.item_name, amount: g.estimated_value ? `${symbol}${Number(g.estimated_value).toLocaleString('en-US')}` : '' });
    push({ id: `gift:${g.id}`, type: 'gift', ts: t(g.received_date || g.created_date), title, body, link: `${base}/plan/registry?segment=received`, group: 'gifts', data: g });
  }

  const today = Math.floor(now / DAY) * DAY;
  for (const task of tasks) {
    if (task.completed || !task.due_date) continue;
    const due = t(`${String(task.due_date).slice(0, 10)}T00:00:00`);
    if (!due) continue;
    const days = Math.round((due - today) / DAY);
    if (days < 0 && days >= -30) {
      const { title, body } = notificationCopy('task_overdue', { task: task.title, days: -days });
      push({ id: `task:${task.id}:overdue`, type: 'task_overdue', ts: due, title, body, link: `${base}/plan/checklist`, group: 'tasks', data: task });
    } else if (days >= 0 && days <= 3) {
      const { title, body } = notificationCopy('task_due', { task: task.title, due: days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days` });
      push({ id: `task:${task.id}:due`, type: 'task_due', ts: now - days * 60000, title, body, link: `${base}/plan/checklist`, group: 'tasks', data: task });
    }
  }

  for (const b of budget) {
    if (b.paid || !b.payment_date) continue;
    const due = t(`${String(b.payment_date).slice(0, 10)}T00:00:00`);
    const days = Math.round((due - today) / DAY);
    if (days < -30 || days > 7) continue;
    const { title, body } = notificationCopy('payment_due', { item: b.item_name, vendor: b.vendor, amount: `${symbol}${Number(b.actual_amount || b.budgeted_amount || 0).toLocaleString('en-US')}`, due: days < 0 ? 'now' : days === 0 ? 'today' : days === 1 ? 'tomorrow' : new Date(due).toLocaleDateString('en-AU', { weekday: 'long' }) });
    push({ id: `pay:${b.id}`, type: 'payment_due', ts: now - Math.max(0, days) * 60000 - 1, title, body, link: `${base}/plan/budget/${b.category}`, group: 'tasks', data: { ...b, categoryLabel: budgetCategoryLabel(b.category) } });
  }

  if (briefing?.sentence) {
    const { title, body } = notificationCopy('briefing', { days: briefing.days, sentence: briefing.sentence });
    push({ id: `brief:${Math.floor(now / DAY)}`, type: 'briefing', ts: today + 7 * 3600000, title, body, link: base, group: 'briefing' });
  }

  // Keep the centre to the last 30 days and a sane length; the derived feed
  // is not a history, it is what is worth knowing now.
  const floor = now - 30 * DAY;
  items.sort((a, b) => b.ts - a.ts);
  return items.filter((i) => i.ts >= floor).slice(0, 60);
}

function mapLink(link, base) {
  if (!link) return base;
  if (link.startsWith('/Guests')) return `${base}/guests`;
  if (link.startsWith('/Polls')) return `${base}/plan/polls`;
  if (link.startsWith('/Dashboard') || link.startsWith('/DailyUpdate')) return base;
  return base;
}

export function groupByTime(items, now = Date.now()) {
  const today = Math.floor(now / DAY) * DAY;
  const week = today - 6 * DAY;
  const groups = [{ key: 'today', title: 'Today', items: [] }, { key: 'week', title: 'This week', items: [] }, { key: 'earlier', title: 'Earlier', items: [] }];
  for (const it of items) {
    if (it.ts >= today) groups[0].items.push(it);
    else if (it.ts >= week) groups[1].items.push(it);
    else groups[2].items.push(it);
  }
  return groups.filter((g) => g.items.length);
}

export function relativeTime(ts, now = Date.now()) {
  const diff = Math.max(0, now - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}
