/**
 * The pages a wedding site always has, whatever the couple's stored settings say.
 *
 * A guest must be able to find the DATE and a WAY TO REPLY. That is what makes
 * the thing an invitation rather than a webpage, and it is the one guarantee
 * the site makes on the guest's behalf rather than the couple's.
 *
 * ENFORCED IN TWO PLACES ON PURPOSE, because they cover different failures:
 *   · The builder refuses to switch them off — stops it happening again.
 *   · The guest site unions them into enabledPages when it renders — covers
 *     every record that ALREADY has them off, which the builder guard cannot
 *     reach retroactively.
 *
 * Removing the date and the RSVP from the hero is what made this load-bearing:
 * before that, the hero itself carried both, so a couple who disabled the pages
 * still had them somewhere.
 */
export const ALWAYS_ON_PAGES = ['home', 'rsvp', 'celebration'];

/** The couple's page list, with the guarantee applied and original order kept. */
export function withAlwaysOnPages(enabledPages, allSlugs) {
  const enabled = new Set(enabledPages || []);
  for (const slug of ALWAYS_ON_PAGES) enabled.add(slug);
  // Order follows the canonical page order, not insertion order, so a page
  // added back by the guarantee does not jump to the end of the nav.
  return (allSlugs || []).filter(s => enabled.has(s));
}
