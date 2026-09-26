/**
 * src/lib/dressCode.js — what to wear, per event, in one vocabulary.
 *
 * ── THE RULING ─────────────────────────────────────────────────────────────
 *
 * Goal 2026-09-25, item 3. New on mainCeremony, reception and each custom
 * event: `dressCodePills` (string[]) and `dressCodeNotes` (string). The
 * existing `dressCode` string STAYS as the fallback — no backfill, no
 * migration, because every wedding that has already answered answered in it.
 *
 * ── ONE RESOLVER, SO THE EDITOR AND THE GUEST SITE CANNOT DISAGREE ─────────
 *
 * "Editors show what guests see: no pill or note appears in an editor that
 * does not appear on the guest site." The only way to keep that true as both
 * surfaces change is for both to ask the same function what this event's dress
 * code IS, rather than each reading three fields and deciding for itself.
 *
 * Precedence, and it is the same everywhere: pills if there are any, otherwise
 * the legacy string as a single pill. A wedding that never touches the new
 * editor keeps exactly the page it has today.
 *
 * ── ON CUSTOM EVENTS THESE FIELDS ARE UNDECLARED, AND THAT IS DELIBERATE ───
 *
 * `preWeddingEvents[]` and `postWeddingEvents[]` items are bare
 * `{ "type": "object" }` in the schema — no property list at all. That is what
 * lets a custom event carry the twenty-one fields EventDetails writes into it,
 * and it means these two fields are undeclared there like every other one.
 *
 * Declaring them was tried on 2026-09-25 and reverted the same day: giving
 * those items a property list of two would have left the other twenty-one
 * undeclared, and a custom entity silently drops what it does not declare.
 * So there is no schema dependency on the custom-event side, and nothing here
 * should ever add one.
 */

/**
 * The vocabulary, as the owner wrote it.
 *
 * TWELVE, IN THE ORDER GIVEN — formal to practical, not alphabetical. A couple
 * scanning for "how dressy" reads down a scale; alphabetising it would put
 * Beach formal between Black tie optional and Casual.
 */
export const DRESS_CODE_PILLS = [
  'Black tie',
  'Black tie optional',
  'Cocktail',
  'Formal',
  'Semi-formal',
  'Smart casual',
  'Casual',
  'Garden party',
  'Beach formal',
  'Festive',
  'Traditional dress welcome',
  'Comfortable shoes',
];

/** Up to six per event. Past that it stops being guidance and becomes a list. */
export const MAX_DRESS_CODE_PILLS = 6;

/** One line, and a real limit rather than a scroll bar. */
export const DRESS_CODE_NOTES_MAX = 160;

export const DRESS_CODE_NOTES_PLACEHOLDER =
  "Anything guests should know — heels and grass, a chilly courtyard, a color you'd love to see.";

/**
 * This event's dress code, however it was recorded.
 *
 * NEVER THROWS, and never invents. An event is a plain object off a record
 * that may have been written by any version of this app: the array may be
 * absent, null, full of junk, or longer than the cap because an older client
 * wrote it. All of those resolve to something renderable.
 *
 * @param {object} event  mainCeremony / reception / a custom event
 * @returns {{pills: string[], notes: string, fromLegacy: boolean}}
 */
export function resolveDressCode(event) {
  const e = event && typeof event === 'object' ? event : {};
  const raw = Array.isArray(e.dressCodePills) ? e.dressCodePills : [];
  const pills = [...new Set(raw.filter((p) => typeof p === 'string' && p.trim()).map((p) => p.trim()))]
    .slice(0, MAX_DRESS_CODE_PILLS);
  const notes = typeof e.dressCodeNotes === 'string' ? e.dressCodeNotes.trim().slice(0, DRESS_CODE_NOTES_MAX) : '';

  if (pills.length) return { pills, notes, fromLegacy: false };

  // THE FALLBACK. A wedding that answered before pills existed shows exactly
  // what it shows today: its one string, rendered as one pill.
  const legacy = typeof e.dressCode === 'string' ? e.dressCode.trim() : '';
  return { pills: legacy ? [legacy] : [], notes, fromLegacy: !!legacy };
}

/**
 * Toggle one pill, honouring the cap.
 *
 * Returns the array unchanged when the cap would be exceeded, so the caller
 * can tell nothing happened without comparing lengths itself — and so a rapid
 * double-tap cannot sneak a seventh in.
 */
export function togglePill(pills, pill) {
  const list = Array.isArray(pills) ? pills : [];
  if (!pill) return list;
  if (list.includes(pill)) return list.filter((p) => p !== pill);
  if (list.length >= MAX_DRESS_CODE_PILLS) return list;
  return [...list, pill];
}

/**
 * A pill the couple typed themselves.
 *
 * "Add your own" is in the ruling, and it is the reason the vocabulary is a
 * starting point rather than a closed set: the wedding that needs "sarong and
 * shoes off" is exactly the wedding twelve English options cannot describe.
 *
 * Trimmed, deduplicated case-insensitively against what is already there —
 * "Cocktail" typed by hand should not sit beside the pill of the same name —
 * and capped like any other.
 */
export function addCustomPill(pills, text) {
  const list = Array.isArray(pills) ? pills : [];
  const value = String(text || '').trim().slice(0, 40);
  if (!value) return list;
  if (list.some((p) => p.toLowerCase() === value.toLowerCase())) return list;
  if (list.length >= MAX_DRESS_CODE_PILLS) return list;
  return [...list, value];
}
