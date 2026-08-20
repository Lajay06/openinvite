/**
 * useSoundPreference — the parts that are pure and therefore provable here.
 *
 * The hook itself is React, but its two load-bearing decisions are not:
 * which sessionStorage key a given path maps to, and that the module never
 * touches `window` at import time (the marketing prerender runs it in Node,
 * where a top-level window read would break the BUILD, not just the feature).
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';
import { storageKey } from '../../src/lib/useSoundPreference.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(__dir, '../../src/lib/useSoundPreference.js'), 'utf8');

export async function runSoundPreference() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Sound preference — per visit, per wedding:\n');

  check('a guest-site path keys by its wedding slug',
    storageKey('/w/john-suzanne') === 'oi_sound_john-suzanne', storageKey('/w/john-suzanne'));
  check('  a deeper page of the same wedding keys IDENTICALLY (this is the fix)',
    storageKey('/w/john-suzanne/our-story') === storageKey('/w/john-suzanne'),
    storageKey('/w/john-suzanne/our-story'));
  check('  a DIFFERENT wedding gets a different key',
    storageKey('/w/other-couple') !== storageKey('/w/john-suzanne'), storageKey('/w/other-couple'));
  check('a non-guest path falls back to a preview key, never a throw',
    storageKey('/dashboard') === 'oi_sound_preview', storageKey('/dashboard'));
  check('a null path (Node/prerender) falls back rather than throwing',
    storageKey(null) === 'oi_sound_preview', storageKey(null));

  // The prerender guard: no top-level window/sessionStorage access.
  const body = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const topLevel = body
    .split('\n')
    .filter(l => /^\s{0,2}\S/.test(l))            // column-0-ish lines only
    .join('\n');
  check('module never reads window at import time (prerender-safe)',
    !/^\s{0,2}(const|let|var)\s+\w+\s*=\s*window/m.test(topLevel), 'no top-level window read');
  check('sessionStorage access is wrapped in try/catch (Safari private mode throws)',
    /try\s*\{[\s\S]{0,200}sessionStorage/.test(body), 'guarded');
  check('sessionStorage, never localStorage — the preference ends with the visit',
    body.includes('sessionStorage') && !body.includes('localStorage'), 'sessionStorage only');

  return results;
}
