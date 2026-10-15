/**
 * src/lib/professionalNotes.js
 *
 * Documents and notes per event. goals/2026-10-14-professional.md, What a
 * professional gets, 12 and 13.
 */
export const DOC_KINDS = [
  { key: 'contract', label: 'Contract' },
  { key: 'floorplan', label: 'Floor plan' },
  { key: 'license', label: 'License' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'other', label: 'Other' },
];
export const NOTE_KINDS = [
  { key: 'note', label: 'Note' },
  { key: 'meeting', label: 'Meeting' },
];

/** A document link must be https; anything else (javascript:, data:, http:) is refused. */
export function isSafeFileUrl(u) {
  try { const url = new URL(String(u || '').trim()); return url.protocol === 'https:' && !!url.hostname; } catch { return false; }
}
