/**
 * src/lib/professionalAva.js
 *
 * AVA FOR PROFESSIONALS. goals/2026-10-14-professional.md, What a
 * professional gets, 16: "draft the vendor email", "find gaps in this run
 * sheet", "what's due this week across my events".
 *
 * The facts are worked out here, by the same rules the screens use (the run
 * sheet's clash and gap finder, the payment and task filters), and Ava is
 * asked only to put them into words. She never sees a guest's name or any
 * contact detail: the context carries counts, items, vendors and dates.
 * She drafts; she does not send or change anything.
 */
import { findIssues, fmtTime, ordered } from './professionalRunSheet.js';
import { dueThisWeek, money } from './professionalMoney.js';
import { dueThisWeek as tasksThisWeek } from './professionalTasks.js';
import { shortDate } from './professionalEvents.js';

export const PROMPTS = [
  { key: 'week', label: 'What’s due this week across my events' },
  { key: 'gaps', label: 'Find gaps in this run sheet', needsEvent: true },
  { key: 'vendor', label: 'Draft the vendor email', needsEvent: true },
];

export const SYSTEM = [
  'You are Ava, the assistant inside Openinvite Professional, for wedding planners who run many weddings at once.',
  'Be brief and practical. US English. No dashes as punctuation; use commas, colons or full stops. No emoji. No exclamation marks.',
  'Use only the facts given. If something is not in the facts, say you do not have it. Never invent names, times or amounts.',
  'You draft and suggest. You never claim to have sent, booked, paid or changed anything.',
].join(' ');

/** The facts for a question, as plain lines. No guest names, no contact details. */
export function factsFor(key, { store, event = null, vendorId = null, now = new Date() }) {
  const lines = [];
  const eventName = (id) => store.ProEvent.find((e) => e.id === id)?.couple_names || 'an event';
  if (key === 'week') {
    const pays = dueThisWeek(store.PaymentDue || [], now);
    const tasks = tasksThisWeek(store.ProTask || [], now);
    lines.push(`Today is ${shortDate(now.toISOString().slice(0, 10))}.`);
    lines.push(pays.length ? 'Payments due this week or overdue:' : 'No payments due this week.');
    pays.forEach((p) => lines.push(`- ${eventName(p.event_id)}: ${p.label}, ${money(p.amount)}, due ${shortDate(p.due_date, { weekday: false })}`));
    lines.push(tasks.length ? 'Open tasks due this week or overdue:' : 'No tasks due this week.');
    tasks.forEach((t) => lines.push(`- ${eventName(t.event_id)}: ${t.title}, due ${shortDate(t.due_date, { weekday: false })}${t.owner_id ? `, owner ${store.ProMember.find((m) => m.id === t.owner_id)?.name || 'unassigned'}` : ''}`));
  }
  if (key === 'gaps' && event) {
    const rows = ordered((store.RunSheetRow || []).filter((r) => r.event_id === event.id));
    const nameOf = (ref) => store.ProMember.find((m) => m.id === ref)?.name || store.VendorContact.find((v) => v.id === ref)?.company || '';
    lines.push(`Run sheet for ${event.couple_names}, ${shortDate(event.event_date)}.`);
    rows.forEach((r) => lines.push(`- ${r.sheet}, ${fmtTime(r.start_minute)} for ${r.duration_minutes} min: ${r.item}${r.owner_ref ? `, ${nameOf(r.owner_ref)}` : ', nobody responsible'}`));
    const issues = findIssues(rows, nameOf);
    lines.push(issues.length ? 'Found by the run sheet checks:' : 'The run sheet checks found no clashes or gaps.');
    issues.forEach((i) => lines.push(`- ${i.text}`));
  }
  if (key === 'vendor' && event) {
    const bookings = (store.ProVendorBooking || []).filter((b) => b.event_id === event.id && (!vendorId || b.vendor_id === vendorId));
    lines.push(`Event: ${event.couple_names}, ${shortDate(event.event_date)}, ${event.venue || 'venue not set'}.`);
    bookings.forEach((b) => {
      const v = store.VendorContact.find((x) => x.id === b.vendor_id);
      const items = ordered((store.RunSheetRow || []).filter((r) => r.event_id === event.id && r.owner_ref === b.vendor_id));
      lines.push(`Vendor: ${v?.company || 'a vendor'} (${b.role || v?.role || ''}), contact ${v?.contact || 'not set'}, arrive ${fmtTime(b.arrive) || 'not set'}, finish ${fmtTime(b.finish) || 'not set'}.`);
      items.forEach((r) => lines.push(`  - ${fmtTime(r.start_minute)}: ${r.item}${r.location ? `, ${r.location}` : ''}${r.cue ? `, cue: ${r.cue}` : ''}`));
    });
  }
  return lines;
}

export const ASKS = {
  week: 'Summarize what is due this week across my events, most urgent first, in a short list.',
  gaps: 'Look at this run sheet and tell me where the gaps, clashes or missing owners are, and what I might be missing, in a short list.',
  vendor: 'Draft a short, friendly confirmation email to each vendor below with their arrival and finish times and their items on the day. One email per vendor.',
};

export function buildProPrompt(key, facts, userText = '') {
  return `${SYSTEM}\n\nFacts:\n${facts.join('\n')}\n\nRequest: ${userText.trim() || ASKS[key] || ''}`;
}

/** A forbidden-content check for the facts: no guest names (from the feed or a list) and no email or phone. */
export function factsAreClean(facts, guestNames = []) {
  const text = facts.join('\n');
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(text)) return false;
  return !guestNames.some((n) => n && text.includes(n));
}
