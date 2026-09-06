/**
 * src/lib/customPages.js
 *
 * A CUSTOM PAGE IS A PAGE. The one place that fact is written down.
 *
 * ── THE DEFECT ─────────────────────────────────────────────────────────────
 *
 * Owner report: "New page" creates a page that connects to nothing, gets a
 * random identity, and does not appear in navigation.
 *
 * The creation half is fine and was never the problem. NewPageModal derives a
 * slug from the title (`toSlug`, NewPageModal.jsx:14) and hands over
 * `{ id: slug, name, slug, template, sections: [] }` (:36) — the id IS the
 * slug, not a random one. WBLeftPanel then appends to BOTH `customPages` and
 * `enabledPages` (:93-97). The page is created correctly and stored correctly.
 *
 * IT IS THE READING SIDE THAT DROPS IT, in two places, for one reason:
 * WEDDING_PAGES is treated as the complete set of page slugs, and `customPages`
 * is a second list nothing reconciles with it.
 *
 *   WeddingWebsiteNav.jsx:75-82  looks the LABEL up in WEDDING_PAGES and then
 *                                `.filter(link => !!link.label)`. A custom slug
 *                                has no entry, so it has no label, so it is
 *                                filtered out. That filter was added to drop
 *                                RETIRED slugs (Guestbook) and cannot tell a
 *                                retired page from a new one.
 *
 *   MultiPageWeddingWebsite.jsx:218-221  passes WEDDING_PAGES.map(p => p.slug)
 *                                as the universe of real slugs to
 *                                withAlwaysOnPages, which FILTERS to it
 *                                (guestPages.js:26). The custom slug is dropped
 *                                from `enabledPages`, so `pageIsAvailable` is
 *                                false, so the route serves
 *                                <InvitationNotAvailable /> — the same screen a
 *                                guest gets for a site that was never
 *                                published.
 *
 * So "connects to nothing" is exact: the couple's own new page tells their
 * guests the invitation is not available.
 *
 * ── WHAT THIS DOES NOT DO ──────────────────────────────────────────────────
 *
 * It does not build a custom-page CONTENT editor. NewPageModal offers five
 * templates and stores `sections: []`, and no renderer for `sections` exists
 * anywhere in the tree. A custom page renders its title and its blocks, and a
 * blank one renders blank — which is what "Blank Page" means. Wiring the five
 * templates to real layouts is a feature, and it is filed rather than smuggled
 * into a fix for reachability.
 */
import { WEDDING_PAGES } from './websiteThemes.js';

/** The couple's own custom pages, always an array. */
export function customPagesOf(weddingDetails) {
  const pages = weddingDetails?.customPages;
  return Array.isArray(pages) ? pages.filter(p => p && p.slug) : [];
}

/**
 * Every slug that is a real page for THIS wedding — the twelve built-ins plus
 * the couple's own. This is the list every "is that a page?" question must be
 * asked against; asking WEDDING_PAGES alone is the defect above.
 */
export function allPageSlugs(weddingDetails) {
  return [...WEDDING_PAGES.map(p => p.slug), ...customPagesOf(weddingDetails).map(p => p.slug)];
}

/** The label a guest reads for a slug, built-in or custom, or null. */
export function pageLabel(weddingDetails, slug) {
  const builtIn = WEDDING_PAGES.find(p => p.slug === slug);
  if (builtIn) return builtIn.label;
  const custom = customPagesOf(weddingDetails).find(p => p.slug === slug);
  return custom ? (custom.name || custom.slug) : null;
}

/** The custom page record for a slug, or null if it is a built-in or unknown. */
export function customPageFor(weddingDetails, slug) {
  if (WEDDING_PAGES.some(p => p.slug === slug)) return null;
  return customPagesOf(weddingDetails).find(p => p.slug === slug) || null;
}
