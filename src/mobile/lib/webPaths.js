/**
 * Which paths the app's webview may show, and where every other one goes.
 * Ruling 3 of goals/2026-10-15-app-store-launch.md: any path that is not a
 * phone screen opens in the external browser (Safari), never inside the app.
 * It closes lane A's finding 2 of goals/2026-10-10-mobile-pass.md: inside the
 * shell, src/App.jsx sends only "/" and "/DailyUpdate" to /m, so any other
 * public path (pricing, checkout, /gift, /professional and the rest) would
 * have rendered the web page, its calls to buy included, inside the app.
 *
 * Pure, so the guard runs it as it is: src/mobile/native.ts installs it.
 */

/** The web's own entry points, which src/App.jsx sends to /m in the shell. */
export const PHONE_ENTRY_PATHS = Object.freeze(['/', '/DailyUpdate']);

/**
 * Web paths that have a phone screen of their own. AuthContext sends a
 * signed-out session to /login (logout, an expired token); in the app that is
 * the phone's sign-in, not the web's.
 */
export const PHONE_EQUIVALENTS = Object.freeze({ '/login': '/m/login' });

/** True for a path the app shows itself. */
export function isPhonePath(pathname) {
  const p = String(pathname || '/');
  return p === '/m' || p.startsWith('/m/') || PHONE_ENTRY_PATHS.includes(p);
}

/**
 * What to do with a path inside the app:
 *   { kind: 'phone' }                  show it
 *   { kind: 'swap', path }             show the phone's own screen instead
 *   { kind: 'external', path }         open it on the website, in Safari
 */
export function webPathAction(pathname) {
  const p = String(pathname || '/');
  if (isPhonePath(p)) return { kind: 'phone' };
  if (PHONE_EQUIVALENTS[p]) return { kind: 'swap', path: PHONE_EQUIVALENTS[p] };
  return { kind: 'external', path: p };
}
