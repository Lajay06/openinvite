/**
 * THE canonical form of a wedding address, and the only place it is computed.
 *
 * WHY ONE PLACE. Three surfaces normalized three different ways —
 * StudioShareTab did `toLowerCase().replace(/[^a-z0-9-]/g,'-')`, PublishModal
 * lowercased in its input handler, onboardingSave collapsed whitespace only,
 * and WBRightPanel wrote raw keystrokes straight onto the record. So
 * "Jay Ella", "jay-ella" and "jay--ella" were all reachable, depending on which
 * screen the couple happened to use — three different addresses that a guest
 * would read as the same one.
 *
 * NORMALIZE BEFORE YOU COMPARE. Two couples must never hold addresses that
 * differ only in case, padding or separator runs. Comparison happens on the
 * canonical form, and the canonical form is what gets stored.
 */

import { coupleNameParts } from './coupleNames.js';

/** lowercase · trimmed · non-alphanumeric runs collapsed to one hyphen · bounded */
export function canonicalSlug(input) {
  if (typeof input !== 'string') return '';
  return input
    .normalize('NFKD')                 // "Renée" and "Renee" must not be two addresses
    .replace(/[̀-ͯ]/g, '')   // strip the accents NFKD just separated
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')       // ANY run of non-alphanumerics becomes one hyphen
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Addresses a couple may not claim.
 *
 * NOT FOR ROUTE COLLISION — measured, and there is none: wedding addresses live
 * under /w/<slug>, so /w/admin is not /admin and no slug can shadow any of the
 * 52 top-level routes. This list exists for IMPERSONATION. A guest who trusts
 * the name on an invitation is exactly who cannot afford to be misled, and
 * /w/openinvite reads as ours.
 *
 * Compared canonically, so "Open Invite", "open_invite" and "OPENINVITE" are
 * all the same reserved string.
 */
export const RESERVED_SLUGS = new Set([
  'openinvite', 'open-invite',
  'admin', 'support', 'help', 'help-center', 'helpcenter',
  'api', 'www', 'app', 'billing', 'security', 'legal',
].map(canonicalSlug));

export function isReservedSlug(input) {
  return RESERVED_SLUGS.has(canonicalSlug(input));
}

/**
 * The next address to offer when one is taken.
 *
 * THE YEAR, NOT A NUMBER. "jay-and-ella-2" is the address of a spare account;
 * "jay-and-ella-2027" is the address of a wedding. A bare counter is only ever
 * a fallback for when the year is taken too, and is never the first offer.
 */
/**
 * The address root: the couple's names joined by the WORD "and".
 *
 * canonicalSlug turns any run of non-alphanumerics into one hyphen, so
 * "Jay & Ella" alone gives `jay-ella` — which reads as a hyphenated surname,
 * not two people. The ampersand has to become a word BEFORE normalization.
 *
 *     Jay & Ella      ->  jay-and-ella
 *     O'Brien & Zoe   ->  o-brien-and-zoe
 *     Jay (alone)     ->  jay
 *
 * Names come from the one owner (api/_lib/coupleNames.js), never from the
 * stale derived copy — an address frozen on a printed card must not be built
 * from a field that stopped tracking the truth.
 */
export function slugRootFromNames(wedding) {
  const [a, b] = coupleNameParts(wedding);
  return canonicalSlug([a, b].filter(Boolean).join(' and '));
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june',
                'july', 'august', 'september', 'october', 'november', 'december'];

/**
 * The parts of a wedding date, read WITHOUT a timezone.
 *
 * `new Date('2027-01-01').getFullYear()` parses as UTC midnight and reads back
 * in LOCAL time. West of Greenwich that is 31 December 2026 — so a US couple
 * marrying on New Year's Day derived `-2026`. Measured, Pacific/Midway:
 *
 *     new Date('2027-01-01').getFullYear()  ->  2026
 *     new Date('2027-01-01').getDate()      ->  31
 *
 * Australia (UTC+8..+11) never shows it, which is why it survived. The product
 * sells to the US in USD, where every zone is negative, so it is not an edge
 * case — it is every couple near a month boundary in the target market.
 *
 * And under the derived address it stops being a suggestion someone declines:
 * it is derived in silence and frozen on a printed card.
 *
 * A stored wedding date is a CALENDAR date, not an instant. It has no timezone
 * and must never be given one. This reads the string.
 */
export function weddingDateParts(weddingDate) {
  if (typeof weddingDate !== 'string') return null;
  const m = weddingDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const year = Number(y), month = Number(mo), day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day, monthName: MONTHS[month - 1] };
}


/**
 * THE LADDER. Each rung adds a REAL FACT about the wedding, never a random
 * token — this address goes on printed cards and gets read aloud, and
 * `bskg8405` reads as a tracking code on a product people pay for.
 *
 *     jay-and-ella
 *     jay-and-ella-2027
 *     jay-and-ella-june-2027
 *     jay-and-ella-14-june-2027
 *     jay-and-ella-14-june-2027-2      only when everything above is taken
 *
 * The year appears ONLY ON A CLASH, so most couples get the short form. Two
 * couples with the same first names marrying on the same day is where a number
 * finally appears, and that is rare enough that the ugly rung almost never
 * ships.
 *
 * A dateless record simply has fewer rungs and falls to the number. An address
 * is never held hostage to a missing date.
 *
 * @param {string} base - the couple's names, e.g. "Jay & Ella"
 * @param {Set<string>} taken - every address already in use
 * @param {string} [weddingDate] - ISO calendar date
 * @returns {string} '' only when the names yield nothing
 */
export function deriveSlug(base, taken, weddingDate) {
  const root = canonicalSlug(base);
  if (!root) return '';
  const has = (s) => taken.has(canonicalSlug(s));
  if (!has(root) && !isReservedSlug(root)) return root;

  const d = weddingDateParts(weddingDate);
  const rungs = d
    ? [`${root}-${d.year}`,
       `${root}-${d.monthName}-${d.year}`,
       `${root}-${d.day}-${d.monthName}-${d.year}`]
    : [];
  for (const rung of rungs) if (!has(rung) && !isReservedSlug(rung)) return rung;

  // Only now, and counted from the longest rung we have.
  const stem = rungs.length ? rungs[rungs.length - 1] : root;
  for (let n = 2; n < 200; n++) {
    const c = `${stem}-${n}`;
    if (!has(c) && !isReservedSlug(c)) return c;
  }
  return '';
}

/**
 * Kept as the old name so nothing breaks mid-migration; the ladder is the
 * implementation now.
 * @deprecated call deriveSlug
 */
export function suggestSlug(base, taken, weddingDate) {
  return deriveSlug(base, taken, weddingDate);
}

