/**
 * src/lib/professionalPlans.js
 *
 * THE PROFESSIONAL PLANS, THE LIMITS AND THE RULES THAT FOLLOW FROM THEM.
 * goals/2026-10-14-professional.md, Pricing. USD on screen.
 *
 * An active event is one that is not archived. Events archive themselves 30
 * days after the date, then go read-only. A plan change never deletes
 * anything: the newest events beyond the limit go read-only until a slot
 * frees.
 */

export const PLANS = {
  solo: { key: 'solo', name: 'Solo', monthly: 29.95, yearly: 299, events: 10, seats: 1, branding: false },
  team: { key: 'team', name: 'Team', monthly: 79, yearly: 790, events: 30, seats: 5, branding: false },
  agency: { key: 'agency', name: 'Agency', monthly: 149, yearly: 1490, events: 75, seats: Infinity, branding: true },
};
export const PLAN_ORDER = ['solo', 'team', 'agency'];

export const TRIAL = { key: 'trial', name: 'Trial', days: 14, events: 2, seats: 1 };

export const ARCHIVE_AFTER_DAYS = 30;
export const KEEP_ARCHIVED_MONTHS = 24;
export const CANCEL_READ_ONLY_DAYS = 90;
export const MAX_NAMED_CODES = 10;

/** Over the top plan's limit: talk to us. */
export const TALK_TO_US = 'More than 75 events at once? Talk to us at hello@openinvite.com.au.';

export function limitsFor(plan) {
  if (plan === 'trial') return { events: TRIAL.events, seats: TRIAL.seats };
  const p = PLANS[plan];
  return p ? { events: p.events, seats: p.seats } : { events: 0, seats: 0 };
}

/** "US$29.95", "US$1,490". */
export function usd(amount) {
  const whole = Number.isInteger(amount);
  return 'US$' + amount.toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
}

const DAY = 86400000;
const toDay = (d) => { const x = new Date(d); return Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()); };

/** True once the event's date is more than 30 days past. */
export function isPastArchiveDate(eventDate, now = new Date()) {
  if (!eventDate) return false;
  return toDay(now) - toDay(eventDate) > ARCHIVE_AFTER_DAYS * DAY;
}

/**
 * Which events are read-only. Archived events always are. Of the active ones,
 * the oldest-created fill the plan's slots; the newest beyond the limit are
 * read-only until a slot frees. Never deletes, only marks.
 * Returns a Set of event ids.
 */
export function readOnlyEventIds(events, plan, { now = new Date(), canceled = false } = {}) {
  const out = new Set();
  if (canceled) { events.forEach((e) => out.add(e.id)); return out; }
  const { events: limit } = limitsFor(plan);
  const active = [];
  for (const e of events) {
    if (e.status === 'archived' || isPastArchiveDate(e.event_date, now)) out.add(e.id);
    else active.push(e);
  }
  active
    .slice()
    .sort((a, b) => String(a.created_date || '').localeCompare(String(b.created_date || '')) || String(a.id).localeCompare(String(b.id)))
    .forEach((e, i) => { if (i >= limit) out.add(e.id); });
  return out;
}

/** Can one more active event be added, or an archived one unarchived? */
export function hasFreeSlot(events, plan, now = new Date()) {
  const active = events.filter((e) => e.status !== 'archived' && !isPastArchiveDate(e.event_date, now));
  return active.length < limitsFor(plan).events;
}
