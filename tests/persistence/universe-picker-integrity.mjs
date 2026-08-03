/**
 * tests/persistence/universe-picker-integrity.mjs
 *
 * Covers fix/universe-picker-integrity (WEBSITE_BUILDER_GAP_MAP.md items
 * 1-3): every universe id offered by every reachable picker must resolve a
 * real UNIVERSE_CONFIGS entry, so a couple's choice can never silently
 * fail (the 'cape-town' vs 'capetown' bug, and the 5-of-11 non-existent
 * StudioUniverse.jsx ids, both fixed on that branch — the latter's file
 * was deleted entirely, consolidating onto UniverseSelector.jsx as the
 * one canonical picker at the time).
 *
 * Updated by fix/design-studio-entrance: UniverseSelector.jsx is itself
 * now retired (same reason StudioUniverse.jsx was — a second,
 * independently-maintained id/palette list that had drifted out of sync
 * with UNIVERSE_CONFIGS), superseded by src/lib/universeCatalog.js, which
 * derives its universe list directly from Object.keys(UNIVERSE_CONFIGS)
 * rather than a hand-maintained id array — so the exact failure mode this
 * file exists to catch (a stale/mismatched id string) can no longer occur
 * for the Design Studio picker specifically; the coverage/retirement
 * checks below confirm that structurally rather than re-parsing a
 * hardcoded list that no longer exists.
 *
 * Reads each remaining picker's UNIVERSES array directly out of its
 * source text via regex rather than importing the .jsx file (these are
 * React component files with JSX syntax the plain-Node harness can't
 * parse) — this is exactly the failure mode being tested (a stale/
 * mismatched id string), so reading the literal source is the right
 * level for this check.
 *
 * Updated by feat/onboarding-content-refresh: OnboardingStepUniverse.jsx
 * itself no longer hardcodes any `id: '...'` entries — it now derives its
 * card list from UNIVERSE_CATALOG.map(...), the same single source of
 * truth the Design Studio picker already used (this file's own header
 * above already describes exactly this pattern for universeCatalog.js).
 * That means the literal-source-text extraction below correctly finds
 * zero ids in this file now, by design — a hardcoded/stale/incomplete id
 * list in OnboardingStepUniverse.jsx (the 'cape-town' bug, the missing
 * mykonos) is structurally impossible as long as it imports
 * UNIVERSE_CATALOG rather than declaring its own array, so that import is
 * what's checked for this picker instead of re-parsing ids that no longer
 * exist in its source.
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

// True when a picker derives its list from UNIVERSE_CATALOG (imported)
// rather than declaring its own id array — see this file's header. A
// picker in this state can never contain a stale/mismatched/incomplete id
// on its own; it inherits UNIVERSE_CONFIGS' full, current id set
// automatically.
function importsUniverseCatalog(relativePath) {
  const src = readFileSync(resolve(repoRoot, relativePath), 'utf8');
  return /from\s+['"]@\/lib\/universeCatalog(\.js)?['"]/.test(src)
    && /\bUNIVERSE_CATALOG\b/.test(src);
}

export async function runUniversePickerIntegrity() {
  const results = [];

  console.log('\n  Universe picker integrity — every offered id resolves real styling:\n');

  const pickers = [
    { name: 'OnboardingStepUniverse.jsx', path: 'src/components/onboarding/OnboardingStepUniverse.jsx' },
  ];

  for (const picker of pickers) {
    if (importsUniverseCatalog(picker.path)) {
      results.push(pass(`${picker.name} — derives its list from UNIVERSE_CATALOG (no separate hardcoded id array to drift)`, 'imports UNIVERSE_CATALOG'));
      results.push(pass(`${picker.name} — every id resolves a real UNIVERSE_CONFIGS entry`, 'guaranteed — same source as UNIVERSE_CONFIGS'));
      continue;
    }

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
    // The Design Studio picker (src/lib/universeCatalog.js) is a plain .js
    // module — no JSX to trip up the harness — so it's imported directly
    // rather than regex-extracted. It derives its list from
    // Object.keys(UNIVERSE_CONFIGS) itself, so this check is really
    // confirming there's no separate hardcoded id list to drift out of
    // sync in the first place, not just that today's list happens to
    // match.
    const { UNIVERSE_CATALOG } = await import('../../src/lib/universeCatalog.js');
    const ids = UNIVERSE_CATALOG.map(u => u.id);
    const canonical = Object.keys(UNIVERSE_CONFIGS);
    const missing = canonical.filter(id => !ids.includes(id));
    results.push(missing.length === 0
      ? pass('universeCatalog.js — offers all 10 canonical universes', ids.join(', '))
      : fail('universeCatalog.js — offers all 10 canonical universes', canonical.join(', '), `missing: ${missing.join(', ')}`));
  }

  {
    // OnboardingStepUniverse.jsx previously missed mykonos entirely, and
    // separately used the hyphenated 'cape-town' id that never resolved
    // real styling (fix/universe-picker-integrity). Both were instances of
    // the same root cause — a hand-maintained id list independent of
    // UNIVERSE_CONFIGS — which feat/onboarding-content-refresh removed
    // structurally rather than patching the two known symptoms: if this
    // picker imports UNIVERSE_CATALOG, it offers every canonical id
    // (mykonos included) under its real, correctly-normalized key
    // (capetown, not cape-town) by construction, with no separate list for
    // either bug to reappear in.
    const derivesFromCatalog = importsUniverseCatalog('src/components/onboarding/OnboardingStepUniverse.jsx');
    const ids = derivesFromCatalog ? [] : extractIds('src/components/onboarding/OnboardingStepUniverse.jsx');
    const hasMykonos = derivesFromCatalog || ids.includes('mykonos');
    results.push(hasMykonos
      ? pass('OnboardingStepUniverse.jsx — includes mykonos (was missing entirely)', derivesFromCatalog ? 'guaranteed via UNIVERSE_CATALOG' : ids.join(', '))
      : fail('OnboardingStepUniverse.jsx — includes mykonos (was missing entirely)', 'mykonos present', ids.join(', ')));
    const noHyphenatedCapeTown = derivesFromCatalog || !ids.includes('cape-town');
    results.push(noHyphenatedCapeTown
      ? pass('OnboardingStepUniverse.jsx — no longer uses the hyphenated \'cape-town\' id', derivesFromCatalog ? 'guaranteed via UNIVERSE_CATALOG (capetown)' : 'capetown')
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

  console.log('\n  UniverseSelector.jsx retirement — confirmed removed, not just unlinked (fix/design-studio-entrance):\n');

  {
    let stillExists = false;
    try {
      readFileSync(resolve(repoRoot, 'src/components/universe-studio/UniverseSelector.jsx'), 'utf8');
      stillExists = true;
    } catch {
      stillExists = false;
    }
    results.push(!stillExists
      ? pass('src/components/universe-studio/UniverseSelector.jsx — deleted (retired picker, superseded by universeCatalog.js/UniverseBanner.jsx)', 'deleted')
      : fail('src/components/universe-studio/UniverseSelector.jsx — deleted (retired picker, superseded by universeCatalog.js/UniverseBanner.jsx)', 'deleted', 'still exists'));
  }

  return results;
}
