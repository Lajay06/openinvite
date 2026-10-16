/**
 * tests/persistence/mobile-web-paths.mjs
 *
 * WEB PATHS STAY OUT OF THE APP. Ruling 3 of
 * goals/2026-10-15-app-store-launch.md: any path that is not a phone screen
 * opens in the external browser (Safari), never inside the app. It closes
 * lane A's finding 2 of goals/2026-10-10-mobile-pass.md: inside the shell,
 * src/App.jsx sends only "/" and "/DailyUpdate" to /m, so every other web
 * path would render the web page, its calls to buy included, in the app.
 *
 * Two halves. The decision is src/mobile/lib/webPaths.js, pure, and it is
 * run here on the paths the ruling names: pricing, checkout, /gift and
 * /professional. The enforcement is src/mobile/native.ts, read for its shape:
 * history.pushState and history.replaceState both go through the decision,
 * the page the webview first loaded does too, a web path is handed to Safari
 * itself, and all of it is installed when the module is evaluated.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };
const code = (rel) => stripComments(read(rel), { line: true });

/** The paths the ruling names, in every spelling src/App.jsx routes. */
export const NAMED_WEB_PATHS = Object.freeze([
  '/pricing', '/Pricing',
  '/checkout',
  '/gift', '/gift/success', '/gift/claim/abc', '/gift/edit/abc', '/gifting',
  '/professional', '/professional/events',
]);

export async function runMobileWebPaths() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  let mod = {};
  try { mod = await import(path.join(ROOT, 'src/mobile/lib/webPaths.js')); } catch { mod = {}; }
  const act = (p) => mod.webPathAction?.(p) || {};

  const leaked = NAMED_WEB_PATHS.filter((p) => act(p).kind !== 'external');
  ok('pricing, checkout, /gift and /professional open on the website, never in the app', !!mod.webPathAction && leaked.length === 0, leaked.join(', ') || `${NAMED_WEB_PATHS.length} paths`);
  const others = ['/DailyUpdate/x', '/Guests', '/account', '/studio/website', '/w/ana-and-ben', '/register', '/contact', '/privacy-policy'];
  const leakedOthers = others.filter((p) => act(p).kind !== 'external');
  ok('  and so does every other web page, dashboard or public', leakedOthers.length === 0, leakedOthers.join(', ') || `${others.length} probes`);
  const phone = ['/m', '/m/plan', '/m/plan/budget', '/m/login', '/m/welcome', '/m/preview/guests', '/', '/DailyUpdate'];
  const blocked = phone.filter((p) => act(p).kind !== 'phone');
  ok('phone screens and the two entry points stay in the app', blocked.length === 0, blocked.join(', ') || `${phone.length} paths`);
  ok('  and a look-alike is not a phone screen', act('/mx').kind === 'external' && act('/mobile').kind === 'external', `${act('/mx').kind}, ${act('/mobile').kind}`);
  ok('the web sign-in becomes the phone sign-in', act('/login').kind === 'swap' && act('/login').path === '/m/login', JSON.stringify(act('/login')));

  // The enforcement in native.ts.
  const native = code('src/mobile/native.ts');
  const guard = (native.match(/export function installWebPathGuard\(\): void \{([\s\S]*?)\n\}/) || [])[1] || '';
  ok('native.ts imports the decision rather than repeating it', /import \{ webPathAction \} from '\.\/lib\/webPaths';/.test(native), 'native.ts');
  ok('  and the guard runs only natively, once', /if \(typeof window === 'undefined' \|\| !isNative\(\)\) return;/.test(guard) && /__oiWebPathGuard/.test(guard), 'installWebPathGuard');
  ok('  and wraps both pushState and replaceState through it',
     /history\.pushState = wrap\(history\.pushState\)/.test(guard) && /history\.replaceState = wrap\(history\.replaceState\)/.test(guard) && /webPathAction\(next\.pathname\)/.test(guard), 'installWebPathGuard');
  ok('  and compares protocol and host, since a capacitor:// URL has an opaque origin',
     /next\.protocol !== window\.location\.protocol \|\| next\.host !== window\.location\.host/.test(guard) && !/next\.origin/.test(guard), 'installWebPathGuard');
  ok('  and refuses the navigation when the path is a web page', /if \(!r\.allow\) return undefined;/.test(guard), 'installWebPathGuard');
  ok('  and reads the page the webview first loaded', /const first = webPathAction\(window\.location\.pathname\)/.test(guard), 'installWebPathGuard');
  ok('  and sends a web page to the website in Safari', (guard.match(/openInSafari\(/g) || []).length >= 2 && /\$\{PROD_ORIGIN\}\$\{next\.pathname\}/.test(guard), 'installWebPathGuard');
  ok('  and is installed when the module is evaluated', /^installWebPathGuard\(\);$/m.test(native), 'native.ts');

  const safari = (native.match(/export function openInSafari\(url: string\): void \{([\s\S]*?)\n\}/) || [])[1] || '';
  ok('openInSafari is a top-level navigation natively, which Capacitor gives to Safari',
     /if \(!isNative\(\)\) \{ window\.open\(/.test(safari) && /window\.location\.assign\(url\);/.test(safari) && !/Browser\.open/.test(safari), 'openInSafari');
  ok('  and a link to the website from any screen goes there, not to the in-app browser',
     /export async function openExternal\(url: string\): Promise<void> \{\s*if \(isNative\(\) && isOwnSite\(url\)\) \{ openInSafari\(url\); return; \}/.test(native), 'openExternal');

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runMobileWebPaths();
  process.exit(r.every(Boolean) ? 0 : 1);
}
