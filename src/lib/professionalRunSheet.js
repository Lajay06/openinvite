/**
 * src/lib/professionalRunSheet.js
 *
 * THE RUN SHEET'S RULES, PURE. goals/2026-10-14-professional.md, What a
 * professional gets, 3: 15-minute rows from 7:00 to 24:00 by default,
 * switchable to 5 or 30; several sheets per event; shift everything after a
 * row by N minutes; reorder; clash and gap warnings; vendor-filtered sheets;
 * CSV. The PDF is drawn by src/components/professional/runSheetPdf.js from
 * the same rows.
 */

export const DEFAULT_SHEETS = ['Setup', 'Ceremony', 'Reception', 'Pack-down', 'Rehearsal'];
export const STEPS = [5, 15, 30];
export const DAY_START = 7 * 60;
export const DAY_END = 24 * 60;
/** A pause longer than this inside one sheet is a gap worth a look. */
export const GAP_MINUTES = 30;

export const STATUS = [
  { key: 'todo', label: 'To do' },
  { key: 'done', label: 'Done' },
  { key: 'skipped', label: 'Skipped' },
];

/** 16:30 reads "4:30 pm"; 24:00 reads "midnight". */
export function fmtTime(min) {
  if (min === null || min === undefined || Number.isNaN(Number(min))) return '';
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  if (min >= 1440 && m === 0) return 'midnight';
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm} ${suffix}`;
}

/** Accepts "16:30", "4:30 pm", "4pm", "1630". Returns minutes or null. */
export function parseTime(text) {
  const t = String(text || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!t) return null;
  if (t === 'midnight') return 1440;
  if (t === 'noon') return 720;
  let m = t.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const mins = Number(m[2] || 0);
  if (mins > 59 || h > 24) return null;
  if (m[3] === 'pm' && h < 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  return h * 60 + mins;
}

export const fmtDuration = (d) => (d >= 60 ? `${Math.floor(d / 60)} h${d % 60 ? ` ${d % 60} min` : ''}` : `${d} min`);

/** Rows of one sheet in running order: by start, then by sort. */
export function ordered(rows) {
  return (rows || []).slice().sort((a, b) => a.start_minute - b.start_minute || (a.sort ?? 0) - (b.sort ?? 0));
}

/** The sheets an event has, defaults first, then any custom ones, in first-use order. */
export function sheetsOf(rows) {
  const used = [...new Set((rows || []).map((r) => r.sheet))];
  return [...DEFAULT_SHEETS.filter((s) => used.includes(s)), ...used.filter((s) => !DEFAULT_SHEETS.includes(s))];
}

/**
 * THE GRID. Every slot from `from` to `to` at `step` minutes, each holding
 * the rows that start inside it. Rows outside the day still show: the grid
 * stretches to hold them, so nothing is ever hidden by the view.
 */
export function grid(rows, { step = 15, from = DAY_START, to = DAY_END } = {}) {
  const list = ordered(rows);
  const first = Math.min(from, ...list.map((r) => r.start_minute));
  const last = Math.max(to - step, ...list.map((r) => r.start_minute));
  const start = Math.floor(first / step) * step;
  const slots = [];
  for (let t = start; t <= last; t += step) {
    slots.push({ minute: t, rows: list.filter((r) => r.start_minute >= t && r.start_minute < t + step) });
  }
  return slots;
}

/**
 * SHIFT EVERYTHING AFTER A ROW by N minutes, in that row's sheet. "After"
 * means rows that run after it: a later start, or the same start further
 * down. The row itself stays. Returns [{ id, start_minute }] to write.
 */
export function shiftAfter(rows, rowId, minutes) {
  const sheetRows = ordered(rows);
  const at = sheetRows.findIndex((r) => r.id === rowId);
  if (at < 0 || !minutes) return [];
  const sheet = sheetRows[at].sheet;
  return sheetRows.slice(at + 1).filter((r) => r.sheet === sheet).map((r) => ({ id: r.id, start_minute: Math.max(0, r.start_minute + minutes) }));
}

/** Move a row to sit where another one is, taking its start time. Returns the patches. */
export function moveTo(rows, rowId, targetId) {
  const list = ordered(rows);
  const row = list.find((r) => r.id === rowId);
  const target = list.find((r) => r.id === targetId);
  if (!row || !target || row.id === target.id) return [];
  const without = list.filter((r) => r.id !== rowId);
  const idx = without.findIndex((r) => r.id === targetId);
  without.splice(idx, 0, { ...row, start_minute: target.start_minute, sheet: target.sheet });
  return without.map((r, i) => ({ id: r.id, sort: i, ...(r.id === rowId ? { start_minute: target.start_minute, sheet: target.sheet } : {}) }));
}

/** A copy of a row, just after it. */
export function duplicateOf(row) {
  const { id, created_date, updated_date, ...rest } = row;
  return { ...rest, sort: (row.sort ?? 0) + 0.5, status: 'todo' };
}

/**
 * CLASH AND GAP WARNINGS.
 * A clash: one person or vendor on two rows that overlap, across every sheet.
 * A gap: more than 30 minutes with nothing running, inside one sheet.
 * Returns [{ kind, rowIds, text }].
 */
export function findIssues(rows, nameOf = (ref) => ref) {
  const out = [];
  const list = ordered(rows);
  const end = (r) => r.start_minute + (r.duration_minutes || 0);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (!a.owner_ref || a.owner_ref !== b.owner_ref) continue;
      if (b.start_minute < end(a) && a.start_minute < end(b)) {
        out.push({ kind: 'clash', rowIds: [a.id, b.id], text: `${nameOf(a.owner_ref)} is on "${a.item}" and "${b.item}" at ${fmtTime(b.start_minute)}.` });
      }
    }
  }
  for (const sheet of sheetsOf(list)) {
    const rs = list.filter((r) => r.sheet === sheet);
    let reach = rs.length ? end(rs[0]) : 0;
    for (let i = 1; i < rs.length; i++) {
      if (rs[i].start_minute - reach > GAP_MINUTES) {
        out.push({ kind: 'gap', rowIds: [rs[i].id], text: `${sheet}: nothing runs from ${fmtTime(reach)} to ${fmtTime(rs[i].start_minute)}.` });
      }
      reach = Math.max(reach, end(rs[i]));
    }
  }
  return out;
}

/** A vendor's own sheet: their rows, every sheet, in running order. */
export function vendorRows(rows, vendorId) {
  return ordered((rows || []).filter((r) => r.owner_ref === vendorId));
}

/** CSV, laid out the way planners keep run sheets in a spreadsheet. */
export const CSV_HEADERS = ['Sheet', 'Start', 'End', 'Duration', 'Item', 'Location', 'Responsible', 'Cue', 'Notes', 'Status'];
const cell = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"` : s;
};
export function toCsv(rows, nameOf = (ref) => ref || '') {
  const lines = [CSV_HEADERS.join(',')];
  for (const sheet of sheetsOf(rows)) {
    for (const r of ordered(rows.filter((x) => x.sheet === sheet))) {
      lines.push([
        r.sheet, fmtTime(r.start_minute), fmtTime(r.start_minute + (r.duration_minutes || 0)), fmtDuration(r.duration_minutes || 0),
        r.item, r.location, nameOf(r.owner_ref), r.cue, r.notes, (STATUS.find((s) => s.key === r.status) || STATUS[0]).label,
      ].map(cell).join(','));
    }
  }
  return lines.join('\r\n');
}
