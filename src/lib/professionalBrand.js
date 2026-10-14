/**
 * src/lib/professionalBrand.js
 *
 * OPENINVITE PROFESSIONAL: THE NAMES AND THE FLAG, IN ONE PLACE.
 * goals/2026-10-14-professional.md. Everything is behind PROFESSIONAL=1, off
 * in production until the owner switches it on.
 *
 * Never shorten the product to "Pro": Pro is a couple plan. The short form in
 * the UI is "Professional".
 */

export const PRODUCT_NAME = 'Openinvite Professional';
export const PRODUCT_SHORT = 'Professional';

/** Route roots. The marketing page and the app. */
export const ROUTES = {
  marketing: '/professional',
  start: '/professional/start',
  app: '/professional/app',
};

/** The link between a couple and their planner, named once. */
export const LINK_NAMES = {
  couple: 'Link your planner',
  coupleSettings: 'My planner',
  professional: 'Linked couples',
  invite: 'Invite the couple',
};

export const CODE_NAME = 'partner code';

/** The account type a professional account carries (new User field). */
export const ACCOUNT_TYPE = { couple: 'couple', professional: 'professional' };

export const CONTACT_EMAIL = 'hello@openinvite.com.au';

/**
 * THE FLAG. On when the build sets VITE_PROFESSIONAL=1, in local development,
 * and on Vercel preview deploys (*.vercel.app), the same shape as GIFTING_V2,
 * so the owner can review on a preview while openinvite.com.au never sees it.
 * `env` and `host` are injectable for the guard.
 */
export function isProfessionalOn(env = import.meta.env, host = typeof window !== 'undefined' ? window.location.hostname : '') {
  if (env?.VITE_PROFESSIONAL === '1') return true;
  if (env?.DEV) return true;
  if (/\.vercel\.app$/.test(host || '')) return true;
  return false;
}

/** Where a signed-in account belongs after login. A professional goes to the app. */
export function homeForAccount(user) {
  return user?.accountType === ACCOUNT_TYPE.professional ? ROUTES.app : null;
}
