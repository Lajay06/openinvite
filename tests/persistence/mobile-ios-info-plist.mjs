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
