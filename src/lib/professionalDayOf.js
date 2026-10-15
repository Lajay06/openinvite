/**
 * src/lib/professionalDayOf.js
 *
 * DAY-OF MODE, the rules. goals/2026-10-14-professional.md, What a
 * professional gets, 11: now, next and later from the run sheet, the
 * emergency kit, and a copy of the sheet and contacts kept on the phone so
 * the day still runs when the venue's signal does not.
 */
import { ordered } from './professionalRunSheet.js';

/** Minutes since midnight, on the phone's own clock. */
export function minuteOfDay(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * NOW is whatever is running at `minute` (several things can be); NEXT is the
 * next three to start; LATER is the rest. Done and skipped rows leave now and
 * next, so a ticked item steps aside. Before the first item, NOW is empty and
 * NEXT is the start of the day.
 */
export function nowNextLater(rows, minute) {
  const list = ordered(rows || []);
  const open = list.filter((r) => r.status !== 'done' && r.status !== 'skipped');
  const end = (r) => r.start_minute + Math.max(1, r.duration_minutes || 0);
  const now = open.filter((r) => r.start_minute <= minute && end(r) > minute);
  const nowIds = new Set(now.map((r) => r.id));
  const upcoming = open.filter((r) => !nowIds.has(r.id) && r.start_minute > minute);
  const overdue = open.filter((r) => !nowIds.has(r.id) && end(r) <= minute);
  return { now, overdue, next: upcoming.slice(0, 3), later: upcoming.slice(3), done: list.filter((r) => r.status === 'done') };
}

export const KIT_DEFAULT = [
  'Sewing kit and safety pins', 'Stain remover pen', 'Fashion tape', 'Pain relief and plasters', 'Phone chargers and a power bank',
  'Scissors, tape and cable ties', 'Spare vows and the order of service', 'Lighter for candles', 'Umbrellas', 'Tissues', 'Water and snacks for the couple', 'Vendor payment envelopes',
];

const KEY = (eventId) => `oi_pro_dayof_${eventId}`;

/** Keep a copy for offline: the sheet, the contacts and the guest total. Per phone, never shared. */
export function saveDayOfCopy(eventId, copy, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  try { storage?.setItem(KEY(eventId), JSON.stringify({ ...copy, saved_at: new Date().toISOString() })); return true; } catch { return false; }
}
export function readDayOfCopy(eventId, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  try { const raw = storage?.getItem(KEY(eventId)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

/** The kit's ticks live on the phone too: they are for whoever holds the kit. */
export function readKit(eventId, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  try { return JSON.parse(storage?.getItem(`${KEY(eventId)}_kit`) || '[]'); } catch { return []; }
}
export function saveKit(eventId, ticked, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  try { storage?.setItem(`${KEY(eventId)}_kit`, JSON.stringify(ticked)); } catch { /* a phone that refuses storage keeps the ticks for this visit only */ }
}

/** "tel:" and "sms:" links from a stored number, digits and a leading plus only. */
export function dialable(phone) {
  const d = String(phone || '').replace(/[^\d+]/g, '');
  return d.replace(/(?!^)\+/g, '') || null;
}
