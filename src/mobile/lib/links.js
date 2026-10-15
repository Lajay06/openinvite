import { isNative, openExternal, PROD_ORIGIN } from '../native';

/** Inside the shell window.location.origin is capacitor://localhost, which is not a link anyone can open, so links use PROD_ORIGIN. */
export { PROD_ORIGIN };

export function siteOrigin() {
  if (isNative()) return PROD_ORIGIN;
  if (typeof window === 'undefined') return PROD_ORIGIN;
  return window.location.origin;
}

/** The couple's published Guest Suite address, or '' when they have no slug yet. */
export function siteUrlFor(details) {
  return details?.slug ? `${siteOrigin()}/w/${details.slug}` : '';
}

/**
 * A hand-off to a desktop page, or undefined. On the web it is a normal in-app
 * navigation (the dashboard is right there). Natively there is none: App Store
 * rule 3.1.1 (goals/2026-10-15-app-store-launch.md, ruling 1), so the app never
 * opens the website except for the pages in WEB_PAGES. Callers render the
 * hand-off as plain text when this is undefined.
 */
export function desktopHandoff(navigate, path) {
  return isNative() ? undefined : () => navigate(path);
}

/**
 * The only pages of the website the app may open: the privacy policy, the
 * terms, support, and account recovery. Never pricing, a plan or a checkout.
 */
export const WEB_PAGES = Object.freeze({
  privacy: '/privacy-policy',
  terms: '/terms-of-service',
  support: '/contact',
  forgotPassword: '/forgot-password',
});

/** Opens one of WEB_PAGES: the system browser natively, an in-app navigation on the web. */
export function openWebPage(navigate, key) {
  const path = WEB_PAGES[key];
  if (!path) return undefined;
  if (isNative()) return openExternal(`${PROD_ORIGIN}${path}`);
  return navigate(path);
}
