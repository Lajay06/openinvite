/**
 * tests/persistence/mobile-spm-pin.mjs
 *
 * THE iOS PROJECT PINS THE CAPACITOR RUNTIME THE LOCKFILE INSTALLS.
 *
 * Item 10 of lane D's scout on goals/2026-10-10-mobile-pass.md.
 * ios/App/CapApp-SPM/Package.swift is written by `npx cap sync ios`, which
 * pins capacitor-swift-pm to the exact version of the installed @capacitor/ios.
 * The import (#960) committed it at 8.5.2 while package-lock.json resolves
 * 8.5.3, so every sync on every machine rewrote a tracked file, and a dirty
 * tree after a routine command is how a real change gets committed by
 * accident or discarded with the noise.
 *
 * The check reads both files as committed text. It does not run the CLI: CI
 * has no Xcode, and what matters is that the two files agree, whichever one
 * moves first. A dependency bump that changes the lockfile without a sync
 * goes red here, which is the reminder to run `npm run mobile:build` and
 * commit what it writes.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const SWIFT = 'ios/App/CapApp-SPM/Package.swift';
const LOCK = 'package-lock.json';

const readOrNull = (p) => {
  try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return null; }
};

/** The exact pin on capacitor-swift-pm, or null. */
export function swiftPin(swift) {
  const m = /capacitor-swift-pm\.git",\s*exact:\s*"([^"]+)"/.exec(swift || '');
  return m ? m[1] : null;
}

/** The installed version of a package per the lockfile, or null. */
export function lockVersion(lockText, name) {
  try {
    return JSON.parse(lockText)?.packages?.[`node_modules/${name}`]?.version || null;
  } catch { return null; }
}

/** Every local plugin package the Swift manifest points into node_modules. */
export function swiftPluginPaths(swift) {
  return [...(swift || '').matchAll(/path:\s*"\.\.\/\.\.\/\.\.\/node_modules\/([^"]+)"/g)].map((m) => m[1]);
}

export async function runMobileSpmPin({ swift = readOrNull(SWIFT), lock = readOrNull(LOCK) } = {}) {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  ok('the Swift manifest and the lockfile are both readable', !!swift && !!lock, `${SWIFT}, ${LOCK}`);

  const pin = swiftPin(swift);
  const ios = lockVersion(lock, '@capacitor/ios');
  ok('the manifest pins capacitor-swift-pm exactly', !!pin, `exact: "${pin}"`);
  ok('  to the @capacitor/ios version the lockfile installs',
     !!pin && pin === ios, `Package.swift ${pin}, package-lock.json ${ios}`);

  // A plugin the manifest names but the lockfile does not install breaks the
  // Xcode build with a missing path, which is a worse place to find it.
  const plugins = swiftPluginPaths(swift);
  const missing = plugins.filter((p) => !lockVersion(lock, p));
  ok('every plugin the manifest names is in the lockfile',
     plugins.length > 0 && missing.length === 0,
     missing.length ? `missing: ${missing.join(', ')}` : `${plugins.length} plugins`);

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runMobileSpmPin();
  process.exit(r.every(Boolean) ? 0 : 1);
}
