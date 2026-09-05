/**
 * src/lib/calendarLinks.js — add-to-calendar for a guest who has just replied.
 *
 * NO LOCATION LEAKS. Everything here is built from what the guest page ALREADY
 * SHOWS THAT GUEST and nothing more: the events they were invited to, the venue
 * already printed beside those events, the date already on the page. A calendar
 * file is a copy of what is on screen, not a second, richer source. In
 * particular it never carries an address the page did not show, never carries
 * another guest's details, and never carries an event this guest was not
 * invited to.
 */

/** ICS wants YYYYMMDDTHHMMSS, floating local time — no Z, no timezone. */
function icsStamp(dateStr, timeStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const [h, m] = (timeStr || '').split(':');
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const time = `${pad(Number(h) || 0)}${pad(Number(m) || 0)}00`;
  return `${date}T${time}`;
}

/** Adds hours to an ICS stamp, so an event has an end and not just a start. */
function plusHours(stamp, hours) {
  if (!stamp) return null;
  const y = +stamp.slice(0, 4), mo = +stamp.slice(4, 6) - 1, da = +stamp.slice(6, 8);
  const h = +stamp.slice(9, 11), mi = +stamp.slice(11, 13);
  const d = new Date(y, mo, da, h + hours, mi);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

/** RFC 5545 escaping: commas, semicolons and backslashes are separators. */
const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => '\\' + c).replace(/\r?\n/g, '\\n');

/**
 * @param {Array<{event_id:string,name:string,date:string,startTime:string,venue?:string}>} events
 * @param {string} coupleName
 * @returns {string|null} ICS text, or null when nothing has a usable date
 */
export function buildIcs(events, coupleName) {
  const blocks = (events || []).map((ev) => {
    const start = icsStamp(ev.date, ev.startTime);
    if (!start) return null;
    // Two hours is a guess, and a guess is better than a zero-length event that
    // some calendars render as a bare point in the day.
    const end = plusHours(start, 2);
    const title = coupleName ? `${ev.name} — ${coupleName}` : ev.name;
    return [
      'BEGIN:VEVENT',
      `UID:${ev.event_id}-${start}@openinvite.com.au`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${esc(title)}`,
      ev.venue ? `LOCATION:${esc(ev.venue)}` : null,
      'END:VEVENT',
    ].filter(Boolean).join('\r\n');
  }).filter(Boolean);

  if (blocks.length === 0) return null;
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Openinvite//EN', ...blocks, 'END:VCALENDAR'].join('\r\n');
}

/**
 * Google Calendar takes ONE event, so this uses the first dated event — the
 * ceremony where there is one, since getWeddingEvents sorts by start time.
 */
export function buildGoogleCalendarUrl(events, coupleName) {
  const ev = (events || []).find((e) => icsStamp(e.date, e.startTime));
  if (!ev) return null;
  const start = icsStamp(ev.date, ev.startTime);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: coupleName ? `${ev.name} — ${coupleName}` : ev.name,
    dates: `${start}/${plusHours(start, 2)}`,
  });
  if (ev.venue) params.set('location', ev.venue);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
