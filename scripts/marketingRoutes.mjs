/**
 * scripts/marketingRoutes.mjs
 *
 * Single source of truth for "every public marketing/auth route" — pure
 * data, no side effects on import (unlike test-marketing-routes.mjs, which
 * runs its whole smoke test at module load time and can't safely be
 * imported from elsewhere). Shared by test-marketing-routes.mjs,
 * scripts/prerender.mjs, and scripts/generate-sitemap.mjs so this list
 * only needs updating in one place.
 *
 * Deliberately no authenticated/dashboard routes here — those are covered
 * by test:persistence; this list is the public-facing surface anyone
 * (including Google, including a first-time visitor) can hit unauthenticated.
 */
/**
 * Prerendered and routed, but out of sitemap.xml and noindexed (vercel.json
 * sends X-Robots-Tag on them). /tour, site fixes batch 3, item 5: the page
 * stays live at its URL while it is rebuilt, and comes back to the sitemap
 * and the nav when it reads like the rest of the site.
 */
export const UNLISTED_ROUTES = ['/tour'];

/**
 * Listed in sitemap.xml but NOT prerendered (owner ruling 2026-10-16). /gift
 * is the gift flow: its on switch is a build variable (VITE_GIFTING_V2) set in
 * production only, so a local prerender would capture the redirect to
 * /gifting. It renders in the browser, under its own title and canonical.
 */
export const SITEMAP_ONLY_ROUTES = ['/gift'];

export const MARKETING_ROUTES = [
  '/',
  '/features',
  '/ava',
  '/faq',
  '/universes',
  '/gifting',
  '/pricing',
  '/contact',
  '/about',
  '/tour',
  '/app',
  '/privacy-policy',
  '/terms-of-service',
  '/login',
  '/register',
  '/forgot-password',
];
