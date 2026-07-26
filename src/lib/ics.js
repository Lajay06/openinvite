/**
 * Minimal RFC 5545 ICS builder for Schedule entity records.
 *
 * Uses "floating" local time (no Z suffix, no TZID) rather than converting
 * to UTC — a wedding schedule is a single-location, single-timezone set of
 * events, and floating time is what every mainstream client (Google
 * Calendar, Apple Calendar, Outlook) renders as "whatever time is written
 * on the ticket," which is exactly what a run sheet means. Converting to
 * UTC would require knowing the venue's timezone, which isn't captured
 * anywhere on WeddingDetails/Schedule today.
 */

function pad(n) {
  return String(n).padStart(2, '0');
}

function parseDateTime(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = (timeStr || '00:00').split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

function toIcsLocal(dt) {
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

function escapeIcsText(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// RFC 5545 line folding: lines must be <=75 octets, continuations start with a space.
function foldLine(line) {
  if (line.length <= 75) return line;
  const parts = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ' ' + rest.slice(75);
  }
  parts.push(rest);
  return parts.join('\r\n');
}

function buildVEvent(item, dtstamp) {
  const uid = `schedule-${item.id}@openinvite.com.au`;
  const start = parseDateTime(item.event_date, item.start_time);
  const end = item.end_time
    ? parseDateTime(item.event_date, item.end_time)
    : new Date(start.getTime() + 60 * 60 * 1000); // default 1 hour when no end_time

  const lines = [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${toIcsLocal(start)}`,
    `DTEND:${toIcsLocal(end)}`,
    `SUMMARY:${escapeIcsText(item.event_name)}`,
  ];
  if (item.location) lines.push(`LOCATION:${escapeIcsText(item.location)}`);

  const descParts = [
    item.description,
    item.responsible_person ? `Responsible: ${item.responsible_person}` : '',
    item.notes,
  ].filter(Boolean);
  if (descParts.length) lines.push(`DESCRIPTION:${escapeIcsText(descParts.join('\n'))}`);

  lines.push('END:VEVENT');
  return lines.map(foldLine).join('\r\n');
}

/** Builds a full VCALENDAR (one or more VEVENTs) from Schedule records. */
export function buildIcsCalendar(items, calendarName = 'Wedding schedule') {
  const now = new Date();
  const dtstamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Openinvite//Wedding Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    foldLine(`X-WR-CALNAME:${escapeIcsText(calendarName)}`),
    ...items
      .filter(item => item.event_date && item.start_time)
      .map(item => buildVEvent(item, dtstamp)),
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}

/** Triggers a browser download of the given .ics content. */
export function downloadIcs(filename, icsContent) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Filesystem-safe filename fragment from an event name. */
export function slugifyForFilename(str) {
  return String(str || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'event';
}
