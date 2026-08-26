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
export function suggestSlug(base, taken, weddingDate) {
  const root = canonicalSlug(base);
  if (!root) return '';
  const has = (s) => taken.has(canonicalSlug(s));

  const year = weddingDate ? new Date(weddingDate).getFullYear() : NaN;
  if (Number.isFinite(year) && !has(`${root}-${year}`)) return `${root}-${year}`;

  for (let n = 2; n < 50; n++) if (!has(`${root}-${n}`)) return `${root}-${n}`;
  return '';
}
