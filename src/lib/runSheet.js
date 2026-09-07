/**
 * src/lib/runSheet.js — THE ORDER OF PROCEEDINGS WITHIN ONE EVENT.
 *
 * Owner: "run sheet is literally order of events for the specific event."
 *
 * ── NOTHING WAS RECOVERED, BECAUSE NOTHING EXISTED ─────────────────────────
 *
 * The brief expected the pre-#693 storage shape to be reused so existing
 * couples' moments would not be lost. There were none. The deleted
 * WeddingDayTimelineBuilder never stored moments: it moved SCHEDULE ROWS
 * around an hour grid, and its only write was
 * `Schedule.update(id, { start_time, end_time })` on the parent record
 * (Schedule.jsx:157 at 11baa9c). Searched for run_sheet, run sheet, moments,
 * proceedings and timeline_items across src/ and base44/ — the only hit was
 * `special_moments`, a Music category enum. Reported, and the owner ruled the
 * new shape below.
 *
 * ── THE FIELD DOES NOT EXIST ON THE LIVE ENTITY YET ────────────────────────
 *
 * Base44 accepts a write of an undeclared field with 200 and silently discards
 * it, so a run sheet saved today would vanish and report success. That is the
 * exact failure this codebase has paid for repeatedly. So every write PROBES
 * first — writes, reads back, compares — and the tab says "Run sheet isn't
 * switched on yet" rather than losing the couple's work behind a green toast.
 *
 * The probe is not paranoia about one field; it is the only way to tell an
 * unmigrated entity from a working one, because the platform's answer is 200
 * either way.
 */

/** The item shape the owner ruled. */
export const RUN_SHEET_FIELDS = ['id', 'time', 'item', 'who', 'notes', 'order'];

/** A blank item, ordered onto the end of a list. */
export function newRunSheetItem(existing = []) {
  return {
    id: `rs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time: '', item: '', who: '', notes: '',
    order: existing.length ? Math.max(...existing.map((r) => r.order ?? 0)) + 1 : 0,
  };
}

/** Only the declared fields, in the declared shape. */
export function normalizeRunSheet(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((r, i) => ({
      id: String(r?.id || `rs-${i}`),
      time: String(r?.time || ''),
      item: String(r?.item || ''),
      who: String(r?.who || ''),
      notes: String(r?.notes || ''),
      order: Number.isFinite(r?.order) ? r.order : i,
    }))
    .sort((a, b) => a.order - b.order)
    .map((r, i) => ({ ...r, order: i }));
}

/** Moves one item up or down, renumbering `order` so it stays 0..n-1. */
export function moveRunSheetItem(rows, id, direction) {
  const list = normalizeRunSheet(rows);
  const i = list.findIndex((r) => r.id === id);
  const j = i + (direction === 'up' ? -1 : 1);
  if (i < 0 || j < 0 || j >= list.length) return list;
  [list[i], list[j]] = [list[j], list[i]];
  return list.map((r, n) => ({ ...r, order: n }));
}

/**
 * DID THE WRITE SURVIVE? Compares what was sent with what came back.
 *
 * @returns {{ok: boolean, reason: string|null}}
 */
export function runSheetRoundTripped(written, readBack) {
  if (!Array.isArray(readBack)) return { ok: false, reason: 'the field is not on the record' };
  const a = JSON.stringify(normalizeRunSheet(written));
  const b = JSON.stringify(normalizeRunSheet(readBack));
  return a === b ? { ok: true, reason: null } : { ok: false, reason: 'the saved run sheet came back different' };
}
