import { isNative, openExternal, PROD_ORIGIN } from '../native';

/** Inside the shell window.location.origin is capacitor://localhost, which is not a link anyone can open, so links use PROD_ORIGIN. */
export { PROD_ORIGIN };

export function siteOrigin() {
  if (isNative()) return PROD_ORIGIN;
  if (typeof window === 'undefined') return PROD_ORIGIN;
  return window.location.origin;
}

/** The couple's published site address, or '' when they have no slug yet. */
export function siteUrlFor(details) {
  return details?.slug ? `${siteOrigin()}/w/${details.slug}` : '';
}

/**
 * Hand off to a desktop page. On the web that is a normal in-app navigation
 * (the dashboard is right there); natively it opens the live site in the
 * system browser, because the desktop dashboard is not bundled for a phone.
 */
export function openDesktop(navigate, path) {
  if (isNative()) return openExternal(`${PROD_ORIGIN}${path}`);
  return navigate(path);
}
