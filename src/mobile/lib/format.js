/** Small formatters shared by the mobile screens. */

export function money(n, symbol = '$') {
  const v = Number(n) || 0;
  return `${symbol}${Math.round(v).toLocaleString('en-US')}`;
}

/** "Saturday 20 March 2027" */
export function dateLong(iso) {
  if (!iso) return '';
  const d = new Date(String(iso).length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** "20 Mar" */
export function dateShort(iso) {
  if (!iso) return '';
  const d = new Date(String(iso).length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
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

export const RSVP_LABEL = { pending: 'Awaiting', attending: 'Attending', declined: 'Declined', maybe: 'Maybe' };
export const RSVP_TONE = { pending: 'warn', attending: 'ok', declined: 'no', maybe: 'neutral' };

export const VENDOR_STATUS_LABEL = { booked: 'Booked', quoted: 'Quoted', contacted: 'Contacted', researching: 'Researching', rejected: 'Not going ahead' };
export const VENDOR_STATUS_TONE = { booked: 'ok', quoted: 'warn', contacted: 'warn', researching: 'neutral', rejected: 'no' };
