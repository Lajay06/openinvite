/**
 * src/lib/todoSort.js
 *
 * The To do table's priority model and sort comparators, kept out of the
 * page component so they can be exercised directly against real records
 * rather than only through a rendered page that needs an authenticated
 * base44 client to mount.
 *
 * Priority is keyed by the value actually stored, which is LOWERCASE —
 * Note.jsonc's enum is ['low','medium','high','urgent'] and every live row
 * uses it. TodoList.jsx's own map used to be keyed 'High'/'Medium'/'Low', so
 * every lookup missed and every task rendered with the Medium swatch
 * whatever its real priority. The colour coding was not wrong, it was
 * absent.
 *
 * Three levels are rendered and three are settable. 'urgent' is neither a
 * fourth colour nor a fourth rank: it normalises to high, so an existing
 * urgent row keeps its meaning and its place in the order without anything
 * being written to it.
 *
 * Contrast is measured against each swatch's own tint over white, not
 * against plain white:
 *   high   #c42d47 on rgb(253,239,241) -> 4.93:1  PASS (AA 4.5)
 *   medium #803D81 on rgb(245,239,245) -> 6.39:1  PASS
 *   low    #444444 on rgb(243,243,243) -> 8.78:1  PASS
 * High was #E03553 and measured 3.91:1 — it failed. #c42d47 is the app's
 * existing .btn-primary:hover rose, so the fix reuses a token already in the
 * system rather than inventing a red. The text label always renders
 * alongside, so colour reinforces the level rather than carrying it.
 */

export const PRIORITY = {
  high:   { label: 'High',   rank: 3, bg: 'rgba(224,53,83,0.08)',  color: '#c42d47', border: 'rgba(224,53,83,0.25)' },
  medium: { label: 'Medium', rank: 2, bg: 'rgba(128,61,129,0.08)', color: '#803D81', border: 'rgba(128,61,129,0.25)' },
  low:    { label: 'Low',    rank: 1, bg: 'rgba(10,10,10,0.05)',   color: '#444444', border: 'rgba(10,10,10,0.12)' },
};

/** Only these can be set. 'urgent' is deliberately absent. */
export const SETTABLE_PRIORITIES = ['high', 'medium', 'low'];

export const SORT_KEYS = ['due_date', 'title', 'priority'];

/** Due date ascending — a to-do list's job is answering "what is next". */
export const DEFAULT_SORT = { key: 'due_date', dir: 'asc' };

/** Stored value -> one of the three we render. 'urgent' folds into high. */
export function normalisePriority(value) {
  const key = String(value || '').toLowerCase();
  if (key === 'urgent') return 'high';
  return PRIORITY[key] ? key : 'medium';
}

/** First click on a column uses that column's natural direction. */
export function nextSort(prev, key) {
  if (prev.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
  return { key, dir: key === 'title' ? 'asc' : key === 'priority' ? 'desc' : 'asc' };
}

/**
 * Completed tasks sink to the bottom under EVERY sort key, before the key is
 * consulted at all. A to-do list answers "what is next", and interleaving
 * finished work by due date buries the live work among it.
 *
 * Undated tasks sort last in BOTH directions rather than being treated as
 * the epoch, which would park them permanently at the top of the default
 * ascending view.
 */
export function sortTasks(tasks, sort) {
  const dir = sort.dir === 'asc' ? 1 : -1;
  const byKey = {
    due_date: (a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0) * dir;
    },
    title: (a, b) => (a.title || '').localeCompare(b.title || '') * dir,
    // a - b, so 'asc' really means Low -> High and 'desc' means High -> Low.
    // This was written b - a, which inverted both directions: clicking
    // Priority (whose natural first direction is desc) surfaced the Low rows
    // at the top. Caught by asserting rank order on the real 16 records.
    priority: (a, b) =>
      (PRIORITY[normalisePriority(a.priority)].rank - PRIORITY[normalisePriority(b.priority)].rank) * dir,
  };
  const cmp = byKey[sort.key] || byKey.due_date;
  return [...tasks].sort((a, b) =>
    (a.completed === b.completed ? 0 : a.completed ? 1 : -1) || cmp(a, b)
  );
}
