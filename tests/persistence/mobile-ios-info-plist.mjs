/**
 * tests/persistence/mobile-ios-info-plist.mjs
 *
 * WHAT THE IPHONE APP DECLARES ABOUT ITSELF, for the store.
 * goals/2026-10-15-app-store-launch.md, item 1.
 *
 * Export compliance. The app uses only standard HTTPS, through the system's
 * own networking and WebKit, and no encryption of its own, so
 * ITSAppUsesNonExemptEncryption is false. Without the key, App Store Connect
 * asks the export question again on every build uploaded to TestFlight.
 *
 * Location. "Use my location" on the Marketplace and in every place search
 * (MarketplaceScreen.jsx, ui/PlaceField.jsx) calls navigator.geolocation.
 * Inside WKWebView that is the app's own Core Location permission, which iOS
 * refuses outright when the Info.plist has no purpose string, so the button
 * could only ever fail. The string says when it is used and what for.
 *
 * Read as text, not with plutil: the suite also runs on Linux.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const PLIST = 'ios/App/App/Info.plist';
const read = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };

/** The value element that follows <key>name</key>, or null. */
export function plistValue(src, name) {
  const m = String(src).match(new RegExp(`<key>${name}</key>\\s*(<true\\s*/>|<false\\s*/>|<string>[\\s\\S]*?</string>)`));
  if (!m) return null;
  const v = m[1];
  return v.startsWith('<string>') ? v.slice(8, -9) : v.replace(/\s+/g, '');
}

export async function runMobileIosInfoPlist() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));
  const plist = read(PLIST);
  ok('the Info.plist is there', plist.includes('<plist'), PLIST);

  ok('export compliance: the app uses no non-exempt encryption', plistValue(plist, 'ITSAppUsesNonExemptEncryption') === '<false/>', String(plistValue(plist, 'ITSAppUsesNonExemptEncryption')));

  const shell = ['src/mobile/screens/plan/MarketplaceScreen.jsx', 'src/mobile/ui/PlaceField.jsx'].filter((f) => /navigator\.geolocation\.getCurrentPosition/.test(read(f)));
  const why = plistValue(plist, 'NSLocationWhenInUseUsageDescription') || '';
  ok('the app asks for location, so the Info.plist says when and why',
     shell.length === 0 || (/Use my location/.test(why) && /only when you tap/.test(why)), shell.length ? why || 'missing' : 'the app no longer asks');
  ok('  and asks only while in use, never always', plistValue(plist, 'NSLocationAlwaysAndWhenInUseUsageDescription') === null && plistValue(plist, 'NSLocationAlwaysUsageDescription') === null, 'no Always key');

  const probe = [
    plistValue('<key>A</key>\n\t<false/>', 'A'),
    plistValue('<key>A</key><true/>', 'A'),
    plistValue('<key>B</key><false/>', 'A'),
  ];
  ok('  and the reader tells false, true and missing apart', probe.map(String).join('|') === '<false/>|<true/>|null', probe.map(String).join('|'));
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runMobileIosInfoPlist();
  process.exit(r.every(Boolean) ? 0 : 1);
}
