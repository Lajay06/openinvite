/**
 * src/pagePreload.js
 *
 * Warms a page's lazy-loaded chunk (React.lazy in pages.config.js) ahead of
 * navigation — call from a nav link's onMouseEnter so most in-app
 * navigations resolve from an already-fetched module instead of suspending
 * on first click (fix/dashboard-round6: the white-flash bug). Deliberately
 * a separate file rather than an edit to pages.config.js — that file is
 * auto-generated ("Do not add imports or modify PAGES manually") and could
 * be overwritten wholesale by the page-registration tooling; this glob just
 * discovers the same ./pages/*.jsx files independently, so a hover-preload
 * for a chunk pages.config.js already lazy-imports resolves to the exact
 * same browser-cached module either way — no need for these two files to
 * reference each other.
 */

// import.meta.glob returns { [relativePath]: () => import(relativePath) }
// for every match, lazy by default — nothing is fetched until a returned
// function is actually called.
const pageModules = import.meta.glob('./pages/*.jsx');

// The sidebar links a handful of pages via a kebab-case URL that differs
// from the PascalCase page-component filename (see AUTO_ROUTE_EXCLUDE in
// App.jsx for why) — can't be derived from the URL string alone, so it's
// mapped explicitly. Every other page's URL is exactly "/" + its filename
// (the PAGES auto-loop's own convention), handled by the fallback below.
const KEBAB_URL_TO_PAGE_KEY = {
  '/transport': 'Transport',
  '/accommodation': 'Accommodation',
  '/ceremony-details': 'CeremonyDetails',
  '/honeymoon': 'Honeymoon',
  '/emergency-contact': 'EmergencyContact',
  '/event-details': 'EventDetails',
};

function pageKeyFromUrl(url) {
  const path = (url || '').split('?')[0];
  if (KEBAB_URL_TO_PAGE_KEY[path]) return KEBAB_URL_TO_PAGE_KEY[path];
  return path.replace(/^\//, '');
}

/**
 * Best-effort — a no-op for any URL that isn't a pages.config.js PAGES
 * entry (nested/studio routes, "/account", etc). Nothing to preload for
 * those, and calling this must never throw regardless of what's hovered.
 */
export function preloadPageChunk(url) {
  const key = pageKeyFromUrl(url);
  if (!key) return;
  const importFn = pageModules[`./pages/${key}.jsx`];
  importFn?.();
}
