/**
 * tests/persistence/universe-picker-integrity.mjs
 *
 * Covers fix/universe-picker-integrity (WEBSITE_BUILDER_GAP_MAP.md items
 * 1-3): every universe id offered by every reachable picker must resolve a
 * real UNIVERSE_CONFIGS entry, so a couple's choice can never silently
 * fail (the 'cape-town' vs 'capetown' bug, and the 5-of-11 non-existent
 * StudioUniverse.jsx ids, both fixed on this branch — the latter's file
 * was deleted entirely, consolidating onto this one canonical picker).
 *
 * Reads each picker's UNIVERSES array directly out of its source text via
 * regex rather than importing the .jsx file (these are React component
 * files with JSX syntax the plain-Node harness can't parse) — this is
 * exactly the failure mode being tested (a stale/mismatched id string),
 * so reading the literal source is the right level for this check.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UNIVERSE_CONFIGS, normalizeUniverseKey } from '../../src/lib/websiteThemes.js';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dir, '..', '..');

function extractIds(relativePath) {
  const src = readFileSync(resolve(repoRoot, relativePath), 'utf8');
  const ids = [];
  for (const match of src.matchAll(/id:\s*'([a-zA-Z0-9-]+)'/g)) {
    ids.push(match[1]);
  }
  return ids;
}

export async function runUniversePickerIntegrity() {
  const results = [];

  console.log('\n  Universe picker integrity — every offered id resolves real styling:\n');

  const pickers = [
    { name: 'OnboardingStepUniverse.jsx', path: 'src/components/onboarding/OnboardingStepUniverse.jsx' },
    { name: 'UniverseSelector.jsx',       path: 'src/components/universe-studio/UniverseSelector.jsx' },
  ];

  for (const picker of pickers) {
    const ids = extractIds(picker.path);
    results.push(ids.length > 0
      ? pass(`${picker.name} — declares at least one universe id`, ids.join(', '))
      : fail(`${picker.name} — declares at least one universe id`, 'non-empty list', 'none found'));

    const unresolved = ids.filter(id => !UNIVERSE_CONFIGS[normalizeUniverseKey(id)]);
    results.push(unresolved.length === 0
      ? pass(`${picker.name} — every id resolves a real UNIVERSE_CONFIGS entry`, ids.join(', '))
      : fail(`${picker.name} — every id resolves a real UNIVERSE_CONFIGS entry`, 'none unresolved', unresolved.join(', ')));
  }

  console.log('\n  Universe picker integrity — coverage of the 10 canonical universes:\n');

  {
    // UniverseSelector.jsx is the one canonical, reachable picker as of
    // this fix — it alone should offer the full set of 10.
    const ids = extractIds('src/components/universe-studio/UniverseSelector.jsx');
    const canonical = Object.keys(UNIVERSE_CONFIGS);
    const missing = canonical.filter(id => !ids.includes(id));
    results.push(missing.length === 0
      ? pass('UniverseSelector.jsx — offers all 10 canonical universes', ids.join(', '))
      : fail('UniverseSelector.jsx — offers all 10 canonical universes', canonical.join(', '), `missing: ${missing.join(', ')}`));
  }

  {
    // OnboardingStepUniverse.jsx previously missed mykonos entirely.
    const ids = extractIds('src/components/onboarding/OnboardingStepUniverse.jsx');
    results.push(ids.includes('mykonos')
      ? pass('OnboardingStepUniverse.jsx — includes mykonos (was missing entirely)', ids.join(', '))
      : fail('OnboardingStepUniverse.jsx — includes mykonos (was missing entirely)', 'mykonos present', ids.join(', ')));
    results.push(!ids.includes('cape-town')
      ? pass('OnboardingStepUniverse.jsx — no longer uses the hyphenated \'cape-town\' id', 'capetown')
      : fail('OnboardingStepUniverse.jsx — no longer uses the hyphenated \'cape-town\' id', 'capetown', 'cape-town'));
  }

  console.log('\n  StudioUniverse.jsx retirement — confirmed removed, not just unlinked:\n');

  {
    let existsAndReferenced = false;
    try {
      readFileSync(resolve(repoRoot, 'src/pages/StudioUniverse.jsx'), 'utf8');
      existsAndReferenced = true;
    } catch {
      existsAndReferenced = false;
    }
    results.push(!existsAndReferenced
      ? pass('src/pages/StudioUniverse.jsx — deleted (retired picker, 5 of 11 ids had no real universe behind them)', 'deleted')
      : fail('src/pages/StudioUniverse.jsx — deleted (retired picker, 5 of 11 ids had no real universe behind them)', 'deleted', 'still exists'));
  }

  return results;
}
