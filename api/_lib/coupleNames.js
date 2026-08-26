/**
 * api/_lib/coupleNames.js — THE ONE OWNER OF THE COUPLE'S DISPLAYED NAMES.
 *
 * WHY THIS EXISTS
 * ---------------
 * A wedding carried the couple's names in two places that could disagree:
 *
 *   couple1Name / couple2Name   the truth — what EventDetails edits
 *   coupleNames                 a derived copy, written ONCE at onboarding
 *                               (onboardingSave.js) and never re-derived
 *
 * EventDetails.jsx edits the partner fields and contains no reference to
 * coupleNames at all, so correcting a name misspelled at signup left the
 * copy saying the old thing forever. Twenty-six sites read that copy —
 * emails, the guest site, Ava's prompts, share text, the website preview.
 *
 * Worse, every fallback in the codebase had the precedence BACKWARDS:
 *
 *   wedding.coupleNames || [couple1Name, couple2Name].join(' & ')
 *
 * That prefers the stale copy and only consults the truth when the copy is
 * missing — so the one case the fallback existed for was the only case it
 * ever handled correctly. Nine sites shared that shape.
 *
 * THE RULE: the partner fields are the truth. The stored copy is a legacy
 * fallback for records written before those fields existed, and nothing
 * more. Never read `.coupleNames` directly — call this.
 *
 * This module is also where the wedding address derives its name root
 * (see api/_lib/slugCanon.js). Giving the names one owner is what made a
 * derived address possible: there is now exactly one place to hook.
 */

/**
 * The couple's names as a person should see them.
 *
 * @param {object} wedding - a WeddingDetails record (or anything shaped like one)
 * @param {string} [fallback=''] - returned when the wedding names nobody
 * @returns {string} e.g. "Jay & Ella", or "Jay" if only one name is known
 */
export function coupleDisplayName(wedding, fallback = '') {
  if (!wedding || typeof wedding !== 'object') return fallback;

  // The truth first. A cleared second name means one name, not the two the
  // stale copy remembers — so ANY partner field present wins over the copy.
  const parts = [wedding.couple1Name, wedding.couple2Name]
    .map(n => (typeof n === 'string' ? n.trim() : ''))
    .filter(Boolean);
  if (parts.length > 0) return parts.join(' & ');

  // Legacy records only: written before the partner fields, or by one of the
  // fragment creates that make a wedding out of { polls } and nothing else.
  const stored = typeof wedding.coupleNames === 'string' ? wedding.coupleNames.trim() : '';
  return stored || fallback;
}

/**
 * The two names as separate values, for surfaces that lay them out
 * individually (the guest site's hero stacks them; PublishModal's preview
 * needs them apart). Same precedence as coupleDisplayName — and the split
 * on ' & ' is a LEGACY read, never a way to store two names in one string.
 *
 * @returns {[string, string]} either may be '' when unknown
 */
export function coupleNameParts(wedding, f1 = '', f2 = '') {
  if (!wedding || typeof wedding !== 'object') return [f1, f2];
  const a = typeof wedding.couple1Name === 'string' ? wedding.couple1Name.trim() : '';
  const b = typeof wedding.couple2Name === 'string' ? wedding.couple2Name.trim() : '';
  if (a || b) return [a || f1, b || f2];
  const stored = typeof wedding.coupleNames === 'string' ? wedding.coupleNames : '';
  const [s1 = '', s2 = ''] = stored.split(' & ').map(s => s.trim());
  return [s1 || f1, s2 || f2];
}
