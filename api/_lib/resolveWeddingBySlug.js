/**
 * The single place a slug becomes a wedding.
 *
 * WHY THIS EXISTS. Seven endpoints each resolved a slug with
 * `list.find(w => w.slug === s)` — FIRST MATCH WINS, on a list whose order
 * nobody controls. Production holds two records on "tulum-test", two on "",
 * and one null. So a guest's contact details, RSVP link request, song request,
 * poll vote, poll comment and poll results could each land on a DIFFERENT
 * couple's record than their invitation page did, silently, with nothing
 * anywhere reporting a problem.
 *
 * A resolver that picks arbitrarily converts a data defect into quiet
 * cross-contamination. One that refuses converts it into a visible failure we
 * can see and fix — which is strictly better even before anything is cleaned
 * up, because the existing duplicates start announcing themselves.
 *
 * ── AMBIGUOUS AND INVALID ARE NOT THE SAME CASE ───────────────────────────
 * Both refuse, for different reasons, and say so differently:
 *
 *   INVALID    an empty, whitespace or null slug is not a wedding at all.
 *              It must never resolve to anything. Today `find` will happily
 *              hand it whichever record sorts first — and two production rows
 *              carry "" with a third carrying null, so this is not theoretical.
 *   AMBIGUOUS  two or more records share a slug. Exactly one couple can own a
 *              URL. Refuse, and name every id in the server log so the rows can
 *              be found.
 *   NOT FOUND  no record matches. Ordinary, and not a fault.
 *
 * ── LOUD FOR US, NEVER FOR THE GUEST ──────────────────────────────────────
 * The server logs the ambiguity unmistakably, with the ids. The CALLER decides
 * what the guest sees, and for guest-facing surfaces that is the warm
 * universe-neutral "this invitation isn't available" page — never a stack
 * trace, never a message about database rows. A loud failure that reaches a
 * guest as a fault has traded one defect for a worse one.
 */

/** @returns {{ok: true, wedding: object} | {ok: false, reason: 'invalid'|'ambiguous'|'not-found', ids?: string[]}} */
export function resolveWeddingBySlug(list, slug, { context = 'wedding-by-slug' } = {}) {
  // An empty slug is not a wedding. Checked BEFORE any matching, so a blank
  // value can never be handed the first row that happens to share its blankness.
  if (typeof slug !== 'string' || slug.trim() === '') {
    console.error(`[${context}] REFUSED: empty or non-string slug (${JSON.stringify(slug)}). ` +
                  'An absent slug is not a wedding and must never resolve.');
    return { ok: false, reason: 'invalid' };
  }

  const rows = (Array.isArray(list) ? list : []).filter(w => w && w.slug === slug && !w.is_test);

  if (rows.length === 0) return { ok: false, reason: 'not-found' };

  if (rows.length > 1) {
    const ids = rows.map(w => w.id).filter(Boolean);
    console.error(
      `[${context}] REFUSED: slug ${JSON.stringify(slug)} resolves to ${rows.length} records. ` +
      `Exactly one couple can own a URL. ids: ${ids.join(', ')}. ` +
      'Nothing has been served — refusing is deliberate, because picking one silently ' +
      'routes a guest onto the wrong couple\'s wedding.');
    return { ok: false, reason: 'ambiguous', ids };
  }

  return { ok: true, wedding: rows[0] };
}
