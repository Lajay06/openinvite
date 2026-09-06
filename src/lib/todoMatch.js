/**
 * src/lib/todoMatch.js — FINDING THE TO-DO THE COUPLE MEANT.
 *
 * ── WHY A MATCHER EXISTS AT ALL ────────────────────────────────────────────
 *
 * `update_todo` writes `Note.update(id, …)`, and the prompt asked the model for
 * an id (avaRequest.js:90). The context never gave it one: the to-do block
 * sends title, due date and priority and nothing else (avaContextFormat.js:185).
 * So every id Ava has ever put in a tick-off action was invented, and every
 * tick-off failed — reproduced against the real executor, three plausible
 * shapes and a control:
 *
 *   no id at all                 → HTTP 404: Object not found
 *   an invented id ("todo_1")    → HTTP 404: Object not found
 *   the title in the id slot     → HTTP 404: Object not found
 *   a real id                    → ok  (and unreachable, because nothing sends one)
 *
 * The couple saw "Could not do that", which named neither the to-do nor the
 * problem.
 *
 * ── WHY BY TITLE, AND NOT BY GIVING THE MODEL THE ID ───────────────────────
 *
 * The id could be added to the context and the model asked to copy a
 * twenty-four character hex string back. It would mostly work. But the couple
 * does not say "tick off 6a5371d7c1b2", they say "tick off ordering the
 * invitations", and a matcher that reads what they said is the thing that has
 * to be right either way. An id is still accepted first when one is supplied,
 * so a future context that carries ids costs nothing here.
 *
 * ── WHAT COUNTS AS THE SAME TO-DO ──────────────────────────────────────────
 *
 * "order invitations" must find "Order the invitations". Case, punctuation,
 * and the small words a person drops when speaking are noise. Three passes,
 * most exact first, and the FIRST pass that produces exactly ONE row wins:
 *
 *   1. the normalized titles are equal
 *   2. one normalized title contains the other
 *   3. every word of the request appears in the title
 *
 * AMBIGUITY REFUSES RATHER THAN GUESSES. Two open to-dos reading "Book the
 * florist" and "Book the florist deposit" both contain "book florist"; ticking
 * off the wrong one is a silent error the couple finds weeks later. A pass that
 * matches more than one row falls through to the next, and running out of
 * passes means no match — which the caller reports by name.
 */

/** Words that carry no identity in a to-do title. */
const NOISE = new Set(['the', 'a', 'an', 'my', 'our', 'to', 'for', 'of', 'and', 'off', 'up']);

/** Lowercase, punctuation out, noise words out, single-spaced. */
export function normalizeTitle(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !NOISE.has(w))
    .join(' ');
}

/**
 * @param {Array<{id: string, title: string, completed: boolean}>} todos
 * @param {string} title  what the couple called it
 * @returns {{todo: object|null, ambiguous: Array<object>}}
 */
export function matchTodoByTitle(todos, title) {
  const want = normalizeTitle(title);
  if (!want) return { todo: null, ambiguous: [] };

  // An already-ticked to-do is not a candidate for ticking off — and leaving
  // it in would make "book the florist" ambiguous the second time it is asked,
  // against a row that is already done.
  const open = (todos || []).filter((t) => !t.completed);
  const rows = open.map((t) => ({ t, norm: normalizeTitle(t.title) })).filter((r) => r.norm);

  const passes = [
    (r) => r.norm === want,
    (r) => r.norm.includes(want) || want.includes(r.norm),
    (r) => want.split(' ').every((w) => r.norm.includes(w)),
  ];
  for (const pass of passes) {
    const hits = rows.filter(pass);
    if (hits.length === 1) return { todo: hits[0].t, ambiguous: [] };
    if (hits.length > 1) return { todo: null, ambiguous: hits.map((h) => h.t) };
  }
  return { todo: null, ambiguous: [] };
}
