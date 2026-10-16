/** Small formatters shared by the mobile screens. */

import { isChild } from '@/lib/household';
import { formatAppDate } from './dates';

/**
 * GuestList.jsx's child label, word for word: "Child, 6" when an age is
 * recorded, "Child" when it is not, nothing for an adult. Shown to the couple
 * only (mobile parity 4).
 */
export function childLabel(guest) {
  if (!isChild(guest)) return '';
  const a = guest.child_age;
  return a !== null && a !== undefined && String(a) !== '' && Number.isFinite(Number(a)) ? `Child, ${Number(a)}` : 'Child';
}

// MONEY IS NOT FORMATTED HERE. It goes through src/lib/money.js formatMoney
// with the account currency code (mobile parity 3), as the desktop formats it.

/**
 * EVERY DATE A COUPLE READS ON THE PHONE IS NUMERIC, in the format their
 * account chose or, if they never chose, in the phone's order, through
 * src/mobile/lib/dates.js (#917, #941, mobile parity 6). There was a long written form with the weekday and a short one without
 * the year; the web dropped both, and a weekday in front of a numeric date
 * reads as a sentence that lost its words (ScheduleTable.jsx). Guest-facing
 * text keeps its written date and does not come through here.
 */
export function dateShort(iso) {
  return formatAppDate(iso);
}

/** "Due 20 Mar", "Due today", "Overdue by 3 days" */
export function dueLabel(iso, now = new Date()) {
  if (!iso) return '';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((d - today) / 86400000);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days < 0) return `Overdue by ${-days} day${-days === 1 ? '' : 's'}`;
  return `Due ${dateShort(iso)}`;
}

/** "15:00" to "3:00 pm" */
export function timeLabel(hhmm) {
  if (!hhmm) return '';
  const [h, m] = String(hhmm).split(':').map(Number);
  if (Number.isNaN(h)) return hhmm;
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m || 0).padStart(2, '0')} ${suffix}`;
}

export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
}

export const GUEST_CATEGORY_LABEL = {
  family: 'Family',
  friends: 'Friends',
  colleagues: 'Colleagues',
  partners_family: "Partner's family",
  partners_friends: "Partner's friends",
};

/** A guest who used the stop-emails link (#951), as GuestList.jsx says it. */
export const OPTED_OUT_LABEL = 'Asked not to be emailed';

export const RSVP_LABEL = { pending: 'Awaiting reply', attending: 'Attending', declined: 'Declined', maybe: 'Maybe' };
export const RSVP_TONE = { pending: 'warn', attending: 'ok', declined: 'no', maybe: 'neutral' };

export const VENDOR_STATUS_LABEL = { booked: 'Booked', quoted: 'Quoted', meeting_scheduled: 'Meeting scheduled', contacted: 'Contacted', researching: 'Researching', rejected: 'Not going ahead' };
export const VENDOR_STATUS_TONE = { booked: 'ok', quoted: 'warn', meeting_scheduled: 'warn', contacted: 'warn', researching: 'neutral', rejected: 'no' };
