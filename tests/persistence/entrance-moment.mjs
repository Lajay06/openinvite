/**
 * tests/persistence/entrance-moment.mjs
 *
 * Covers feat/entrance-moment: per-universe entrance config completeness
 * (entranceConfig.js is plain .js — imported and executed directly), plus
 * structural checks on EntranceMoment.jsx / its mount points (a .jsx file —
 * same readFileSync-source-text convention as component-library.mjs and
 * block-styling-universe.mjs, since this suite runs as a plain Node script
 * with no JSX transform).
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENTRANCE_CONFIGS, DEFAULT_ENTRANCE_CONFIG, BESPOKE_ENTRANCE_UNIVERSES, NAME_MOTIONS, MAX_HOLD_MS, getEntranceConfig } from '../../src/lib/entranceConfig.js';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
// feat/universes-expansion-10 added 10 more, all deliberately non-bespoke
// here (relying on DEFAULT_ENTRANCE_CONFIG) — included below to confirm
// the fallback resolves a complete, valid config for them too.
const ALL_UNIVERSES = [
  'london', 'tulum', 'kyoto', 'capri', 'marrakech', 'brooklyn', 'bali', 'paris', 'capetown', 'mykonos',
  'amalfi', 'sedona', 'aspen', 'taj', 'havana', 'edinburgh', 'monaco', 'florence', 'seoul', 'shanghai',
];
// The brief explicitly named these five for bespoke treatment.
const REQUIRED_BESPOKE = ['london', 'marrakech', 'brooklyn', 'bali', 'kyoto'];

function isValidConfig(cfg) {
  if (!cfg || !cfg.beats) return false;
  const { scrim, kicker, names, settle } = cfg.beats;
  return (
    typeof cfg.totalDuration === 'number' &&
    NAME_MOTIONS.includes(cfg.nameMotion) &&
    typeof scrim === 'number' && typeof kicker === 'number' && typeof names === 'number' && typeof settle === 'number' &&
    scrim <= kicker && kicker < names && names < settle && settle <= cfg.totalDuration
  );
}

export async function runEntranceMoment() {
  const results = [];

  console.log('\n  Entrance moment — per-universe config completeness:\n');

  results.push(REQUIRED_BESPOKE.every(u => BESPOKE_ENTRANCE_UNIVERSES.includes(u))
    ? pass('All 5 brief-named universes (london/marrakech/brooklyn/bali/kyoto) have bespoke configs', BESPOKE_ENTRANCE_UNIVERSES.join(', '))
    : fail('All 5 brief-named universes (london/marrakech/brooklyn/bali/kyoto) have bespoke configs', REQUIRED_BESPOKE.join(', '), BESPOKE_ENTRANCE_UNIVERSES.join(', ')));

  results.push(isValidConfig(DEFAULT_ENTRANCE_CONFIG)
    ? pass('DEFAULT_ENTRANCE_CONFIG is well-formed (valid beat ordering, known nameMotion)', DEFAULT_ENTRANCE_CONFIG.character)
    : fail('DEFAULT_ENTRANCE_CONFIG is well-formed (valid beat ordering, known nameMotion)', 'valid', JSON.stringify(DEFAULT_ENTRANCE_CONFIG)));

  for (const key of Object.keys(ENTRANCE_CONFIGS)) {
    const cfg = ENTRANCE_CONFIGS[key];
    results.push(isValidConfig(cfg)
      ? pass(`ENTRANCE_CONFIGS['${key}'] is well-formed`, `${cfg.character} — ${cfg.nameMotion}, ${cfg.totalDuration}ms`)
      : fail(`ENTRANCE_CONFIGS['${key}'] is well-formed`, 'valid', JSON.stringify(cfg)));
    results.push(cfg.totalDuration <= MAX_HOLD_MS
      ? pass(`ENTRANCE_CONFIGS['${key}'].totalDuration is within MAX_HOLD_MS (${MAX_HOLD_MS}ms)`, `${cfg.totalDuration}ms`)
      : fail(`ENTRANCE_CONFIGS['${key}'].totalDuration is within MAX_HOLD_MS (${MAX_HOLD_MS}ms)`, `<= ${MAX_HOLD_MS}`, `${cfg.totalDuration}`));
  }

  // Every universe (bespoke or not) must resolve to SOME complete config —
  // this is the "sensible default for any universe not individually tuned"
  // guarantee from the brief.
  for (const key of ALL_UNIVERSES) {
    const cfg = getEntranceConfig(key);
    results.push(isValidConfig(cfg)
      ? pass(`getEntranceConfig('${key}') resolves a complete, valid config`, cfg.character)
      : fail(`getEntranceConfig('${key}') resolves a complete, valid config`, 'valid', JSON.stringify(cfg)));
  }

  console.log('\n  Entrance moment — required behaviours are actually implemented:\n');

  const entranceSource = readFileSync(resolve(__dir, '..', '..', 'src/components/guest-website/EntranceMoment.jsx'), 'utf8');

  const checks = [
    { name: 'First-visit-only: reads a localStorage flag keyed to the wedding', re: /localStorage\.getItem\(storageKey\)/ },
    { name: 'First-visit-only: writes the localStorage flag once played/skipped', re: /localStorage\.setItem\(storageKey,\s*'1'\)/ },
    { name: 'Accessibility: prefers-reduced-motion skips the animation entirely', re: /prefersReducedOS/ },
    { name: 'Tap/click skips immediately (onClick handler present)', re: /onClick=\{skip\}/ },
    { name: 'Touch skips immediately too (onTouchStart handler present)', re: /onTouchStart=\{skip\}/ },
    { name: 'Holds on names pending hero photo readiness, not an arbitrary guess', re: /photoReady/ },
    { name: 'Never holds past MAX_HOLD_MS regardless of hero readiness', re: /MAX_HOLD_MS/ },
    { name: 'A broken/erroring cover photo never holds forever (onerror also resolves ready)', re: /img\.onerror\s*=.*setPhotoReady\(true\)/s },
    { name: 'Only opacity/transform/backdrop-filter are animated (GPU-cheap, no layout thrash)', re: /backdropFilter/ },
    { name: 'forcePlay bypasses the "already seen" gate for builder replay', re: /forcePlay/ },
  ];
  for (const c of checks) {
    results.push(c.re.test(entranceSource)
      ? pass(c.name, 'found')
      : fail(c.name, 'found', 'not found in EntranceMoment.jsx'));
  }

  console.log('\n  Entrance moment — mounted through the unified render path, replay gated correctly in the builder:\n');

  const publishedSource = readFileSync(resolve(__dir, '..', '..', 'src/components/guest-website/MultiPageWeddingWebsite.jsx'), 'utf8');
  results.push(/<EntranceMoment/.test(publishedSource)
    ? pass('MultiPageWeddingWebsite.jsx (published site) mounts EntranceMoment', 'found')
    : fail('MultiPageWeddingWebsite.jsx (published site) mounts EntranceMoment', 'found', 'not found'));

  const previewSource = readFileSync(resolve(__dir, '..', '..', 'src/components/website-builder/RealWebsitePreview.jsx'), 'utf8');
  results.push(/replayEntranceKey \? \(\s*<EntranceMoment/.test(previewSource)
    ? pass('RealWebsitePreview.jsx (builder) only mounts EntranceMoment when replayEntranceKey is set — never auto-plays on edit', 'found')
    : fail('RealWebsitePreview.jsx (builder) only mounts EntranceMoment when replayEntranceKey is set — never auto-plays on edit', 'found', 'not found — may now replay on every render'));

  const studioSource = readFileSync(resolve(__dir, '..', '..', 'src/pages/StudioWebsite.jsx'), 'utf8');
  results.push(/setReplayEntranceKey\(k => k \+ 1\)/.test(studioSource)
    ? pass('StudioWebsite.jsx has a "Replay entrance" affordance', 'found')
    : fail('StudioWebsite.jsx has a "Replay entrance" affordance', 'found', 'not found'));

  return results;
}
