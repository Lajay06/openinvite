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
 * THE FLAG. On only when the build sets VITE_PROFESSIONAL=1, previews
 * included (owner ruling 2026-10-14): the browser follows the server, whose
 * professionalOnServer() needs PROFESSIONAL=1. A *.vercel.app host alone, or a
 * local dev server, is not enough. `env` is injectable for the guard; the
 * second argument is ignored and kept only so old callers still read.
 */
export function isProfessionalOn(env = import.meta.env) {
  return env?.VITE_PROFESSIONAL === '1';
}

/** Where a signed-in account belongs after login. A professional goes to the app. */
export function homeForAccount(user) {
  return user?.accountType === ACCOUNT_TYPE.professional ? ROUTES.app : null;
}
