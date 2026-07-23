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
export const MARKETING_ROUTES = [
  '/',
  '/features',
  '/ava',
  '/universes',
  '/pricing',
  '/contact',
  '/about',
  '/privacy-policy',
  '/terms-of-service',
  '/login',
  '/register',
  '/forgot-password',
];
