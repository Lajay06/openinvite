/**
 * api/_lib/professionalFlag.js
 *
 * THE SERVER FLAG FOR OPENINVITE PROFESSIONAL. On only where PROFESSIONAL=1 is
 * set, previews included (owner ruling 2026-10-14): a Vercel preview alone is
 * not enough. Every api/professional/*.js handler answers 404 while this is
 * false.
 */
export function professionalOnServer(env = process.env) {
  return env.PROFESSIONAL === '1';
}
