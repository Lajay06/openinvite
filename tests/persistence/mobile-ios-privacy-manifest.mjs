/**
 * tests/persistence/mobile-ios-privacy-manifest.mjs
 *
 * THE IPHONE APP'S OWN PRIVACY MANIFEST. Item 1 of
 * goals/2026-10-15-app-store-launch.md: ios/App/App/PrivacyInfo.xcprivacy
 * covers the data the app collects and the required-reason APIs it uses, and
 * it ships inside the app (the App target's Resources phase), where App Store
 * Connect reads it at upload.
 *
 * Required-reason APIs. Capacitor's own two manifests (Capacitor, Cordova)
 * declare none, and of the native plugins only @capacitor/preferences touches
 * one: UserDefaults, read and written by this app only (reason CA92.1). The
 * plugin list is pinned below as REVIEWED: a plugin added to the iOS project
 * fails this guard until someone has read it for required-reason APIs and
 * added it here, with whatever the manifest then needs.
 *
 * Data collected. Every type is linked to the couple's account, used for app
 * functionality only, and never for tracking; NSPrivacyTracking is false with
 * no tracking domains. A type is required here when the shell has the code
 * that collects it: the phone's contacts when contacts are read, photos when a
 * photo is picked or taken.
 *
 * Not declared, on purpose, and recorded so a change is a decision:
 *   - location: "Use my location" sends coordinates to the place search for
 *     that request only, which Apple's definition does not count as collected;
 *   - crash and usage data: the native bundle built on 2026-10-15 carried no
 *     Sentry DSN and no PostHog key. If a release is ever built with
 *     VITE_SENTRY_DSN or VITE_POSTHOG_KEY set, Crash Data and Product
 *     Interaction must be added here and on the App Store label.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };

const MANIFEST = 'ios/App/App/PrivacyInfo.xcprivacy';
const PBX = 'ios/App/App.xcodeproj/project.pbxproj';
const SPM = 'ios/App/CapApp-SPM/Package.swift';

/** Every native plugin read for required-reason APIs on 2026-10-15, and what it needs. */
export const REVIEWED = Object.freeze({
  AparajitaCapacitorBiometricAuth: [],
  CapacitorCommunityContacts: [],
  CapacitorApp: [],
  CapacitorBrowser: [],
  CapacitorCamera: [],
  CapacitorHaptics: [],
  CapacitorKeyboard: [],
  CapacitorLocalNotifications: [],
  CapacitorNetwork: [],
  CapacitorPreferences: ['NSPrivacyAccessedAPICategoryUserDefaults:CA92.1'],
  CapacitorShare: [],
  CapacitorSplashScreen: [],
  CapacitorStatusBar: [],
});

/** The collected types, each as { type, linked, tracking, purposes[] }. */
export function collectedTypes(xml) {
  const block = (String(xml).match(/<key>NSPrivacyCollectedDataTypes<\/key>\s*<array>([\s\S]*?)<\/array>\s*<key>NSPrivacyAccessedAPITypes/) || [])[1] || '';
  return [...block.matchAll(/<dict>([\s\S]*?)<\/dict>/g)].map(([, d]) => ({
    type: (d.match(/<key>NSPrivacyCollectedDataType<\/key>\s*<string>([^<]+)<\/string>/) || [])[1],
    linked: /<key>NSPrivacyCollectedDataTypeLinked<\/key>\s*<true\/>/.test(d),
    tracking: /<key>NSPrivacyCollectedDataTypeTracking<\/key>\s*<true\/>/.test(d),
    purposes: [...d.matchAll(/<string>(NSPrivacyCollectedDataTypePurpose[^<]+)<\/string>/g)].map((m) => m[1]),
  }));
}

/** The accessed API declarations, as 'Category:REASON' strings. */
export function accessedApis(xml) {
  const block = (String(xml).match(/<key>NSPrivacyAccessedAPITypes<\/key>\s*<array>([\s\S]*?)<\/array>\s*<\/dict>\s*<\/plist>/) || [])[1] || '';
  return [...block.matchAll(/<dict>([\s\S]*?)<\/dict>/g)].flatMap(([, d]) => {
    const cat = (d.match(/<key>NSPrivacyAccessedAPIType<\/key>\s*<string>([^<]+)<\/string>/) || [])[1];
    return [...d.matchAll(/<string>([A-Z0-9]{4}\.\d)<\/string>/g)].map((m) => `${cat}:${m[1]}`);
  });
}

export async function runMobileIosPrivacyManifest() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const xml = read(MANIFEST);
  ok('the app has its own privacy manifest', xml.includes('<plist'), MANIFEST);

  // Shipped: a file reference, a build file, and that build file in the App target's Resources phase.
  const pbx = read(PBX);
  const ref = (pbx.match(/(\w{24}) \/\* PrivacyInfo\.xcprivacy \*\/ = \{isa = PBXFileReference;[^}]*path = PrivacyInfo\.xcprivacy;/) || [])[1];
  const bf = ref && (pbx.match(new RegExp(`(\\w{24}) \\/\\* PrivacyInfo\\.xcprivacy in Resources \\*\\/ = \\{isa = PBXBuildFile; fileRef = ${ref} `)) || [])[1];
  const resources = (pbx.match(/\/\* Begin PBXResourcesBuildPhase section \*\/([\s\S]*?)\/\* End PBXResourcesBuildPhase section \*\//) || [])[1] || '';
  ok('  and it ships inside the app, in the App target\'s Resources phase', !!bf && resources.includes(`${bf} /* PrivacyInfo.xcprivacy in Resources */`), bf ? `build file ${bf}` : 'not in the project');

  ok('the app does not track', /<key>NSPrivacyTracking<\/key>\s*<false\/>/.test(xml) && /<key>NSPrivacyTrackingDomains<\/key>\s*<array\/>/.test(xml), 'NSPrivacyTracking false, no domains');

  const types = collectedTypes(xml);
  const bad = types.filter((t) => !t.type || !t.linked || t.tracking || t.purposes.join() !== 'NSPrivacyCollectedDataTypePurposeAppFunctionality');
  ok('every collected type is linked, for app functionality only, never tracking', types.length > 0 && bad.length === 0, bad.map((t) => t.type).join(', ') || `${types.length} types`);
  const has = (t) => types.some((x) => x.type === `NSPrivacyCollectedDataType${t}`);
  const base = ['Name', 'EmailAddress', 'PhoneNumber', 'PhysicalAddress', 'OtherUserContent', 'UserID', 'EmailsOrTextMessages'];
  ok('  and it names the account, the guest list and the planning content', base.every(has), base.filter((t) => !has(t)).join(', ') || base.join(', '));

  const shellReads = (re, files) => files.some((f) => re.test(read(f)));
  const readsContacts = shellReads(/readContacts|@capacitor-community\/contacts/, ['src/mobile/native.ts']);
  ok('  and the phone\'s contacts, because the shell reads them', !readsContacts || has('Contacts'), readsContacts ? 'readContacts in native.ts' : 'no longer read');
  const picksPhotos = shellReads(/pickPhoto|@capacitor\/camera/, ['src/mobile/native.ts']);
  ok('  and photos, because the shell picks and takes them', !picksPhotos || has('PhotosorVideos'), picksPhotos ? 'pickPhoto in native.ts' : 'no longer picked');

  // Required-reason APIs: exactly what the reviewed plugins need, and every plugin reviewed.
  const plugins = [...read(SPM).matchAll(/\.package\(name: "([^"]+)"/g)].map((m) => m[1]);
  const unreviewed = plugins.filter((p) => !(p in REVIEWED));
  ok('every native plugin in the iOS project was read for required-reason APIs', plugins.length > 0 && unreviewed.length === 0, unreviewed.join(', ') || `${plugins.length} plugins`);
  const need = [...new Set(plugins.flatMap((p) => REVIEWED[p] || []))].sort();
  const declared = [...new Set(accessedApis(xml))].sort();
  ok('  and the manifest declares exactly what they need', need.join(',') === declared.join(','), `needs ${need.join(', ') || 'none'}; declares ${declared.join(', ') || 'none'}`);

  const probe = collectedTypes('<key>NSPrivacyCollectedDataTypes</key><array><dict><key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataTypeName</string><key>NSPrivacyCollectedDataTypeLinked</key><true/><key>NSPrivacyCollectedDataTypeTracking</key><true/><key>NSPrivacyCollectedDataTypePurposes</key><array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array></dict></array><key>NSPrivacyAccessedAPITypes</key>');
  ok('  and the reader sees a tracking flag when one is set', probe.length === 1 && probe[0].tracking === true, JSON.stringify(probe[0] || {}));

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runMobileIosPrivacyManifest();
  process.exit(r.every(Boolean) ? 0 : 1);
}
