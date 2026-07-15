/**
 * tests/persistence/design-studio-entrance.mjs
 *
 * Covers fix/design-studio-entrance: the Design Studio rebuild around
 * direction C (entrance). Structural checks against source text (same
 * convention as seating-polish.mjs/dashboard-structure.mjs — these are
 * .jsx files with real render logic, and this suite runs as a plain Node
 * script with no JSX transform) plus a couple of live/data checks.
 *
 * What this file actually proves:
 *  1. Tiles are sourced from UNIVERSE_CONFIGS, not a second hardcoded
 *     palette (the exact bug UniverseSelector.jsx had — its Capri swatch
 *     was the old flagged navy/lemon palette, out of sync with the real
 *     config). Confirms the retired file is actually gone, the new
 *     catalog/tile files reference UNIVERSE_CONFIGS, and — a live,
 *     content-level regression guard — that Capri's accent really is the
 *     corrected value, not the old flagged one.
 *  2. The entrance overlay's reduced-motion gate exists (useReducedMotion
 *     imported and actually branched on, not just imported and ignored).
 *  3. The Ultra badge renders conditionally on isUltra in the tile
 *     component, and the Ultra id set matches the two gated universes.
 *  4. "Your design assets" is actually gone from the page (no AssetGrid/
 *     AssetEditorModal import left on UniverseStudio.jsx).
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(resolve(__dir, '..', '..', p), 'utf8');
const exists = (p) => { try { readFileSync(resolve(__dir, '..', '..', p)); return true; } catch { return false; } };

export async function runDesignStudioEntrance() {
  const results = [];

  console.log('\n  Design Studio entrance — tiles sourced from UNIVERSE_CONFIGS, no hardcoded palette (fix/design-studio-entrance):\n');

  results.push(!exists('src/components/universe-studio/UniverseSelector.jsx')
    ? pass('UniverseSelector.jsx (the stale-swatch picker) is deleted', 'not found')
    : fail('UniverseSelector.jsx (the stale-swatch picker) is deleted', 'not found', 'file still present'));

  const catalogSource = read('src/lib/universeCatalog.js');
  results.push(/import \{ UNIVERSE_CONFIGS \} from '\.\/websiteThemes\.js'/.test(catalogSource)
    ? pass('universeCatalog.js imports UNIVERSE_CONFIGS as its source', 'found')
    : fail('universeCatalog.js imports UNIVERSE_CONFIGS as its source', 'found', 'not found'));

  const tileSource = read('src/components/universe-studio/UniverseTile.jsx');
  results.push(/colors\.darkBg/.test(tileSource) && /typography\.headingFont/.test(tileSource)
    ? pass('UniverseTile.jsx reads colour/type from the universe prop, not a local hardcoded map', 'found')
    : fail('UniverseTile.jsx reads colour/type from the universe prop, not a local hardcoded map', 'found', 'not found'));

  // The two old flagged hex values (Capri's pre-fix navy/lemon palette,
  // still hardcoded in the now-deleted UniverseSelector.jsx) must not
  // appear anywhere in the new tile/catalog/world-view files.
  const worldViewSource = read('src/components/universe-studio/UniverseWorldView.jsx');
  const newFilesCombined = tileSource + catalogSource + worldViewSource;
  results.push(!/#1A6EBD|#FFE566|#E8C547/.test(newFilesCombined)
    ? pass('New tile/catalog/world-view files contain none of the old flagged Capri hex values', 'not found')
    : fail('New tile/catalog/world-view files contain none of the old flagged Capri hex values', 'not found', 'stale hex value found'));

  const websiteThemesSource = read('src/lib/websiteThemes.js');
  const capriMatch = websiteThemesSource.match(/capri: \{[\s\S]*?\n  \},/);
  const capriAccentOk = capriMatch && /accent: '#C4A130'/.test(capriMatch[0]);
  results.push(capriAccentOk
    ? pass("UNIVERSE_CONFIGS.capri.accent is the corrected muted gold, not the old flagged neon lemon", '#C4A130')
    : fail("UNIVERSE_CONFIGS.capri.accent is the corrected muted gold, not the old flagged neon lemon", '#C4A130', 'not found / regressed'));

  console.log('\n  Design Studio entrance — every universe has real tile metadata (tagline/tags/description/motif):\n');

  const UNIVERSE_IDS = ['aman', 'tulum', 'kyoto', 'capri', 'marrakech', 'brooklyn', 'bali', 'paris', 'capetown', 'mykonos'];
  const missingMeta = UNIVERSE_IDS.filter(id => {
    const m = websiteThemesSource.match(new RegExp(`${id}: \\{[\\s\\S]*?\\n  \\},`));
    const block = m ? m[0] : '';
    return !/tagline: '/.test(block) || !/tileDescription: /.test(block) || !/motifNote: /.test(block) || !/tags: \[/.test(block);
  });
  results.push(missingMeta.length === 0
    ? pass('All 10 universes have tagline + tags + tileDescription + motifNote', 'found on all 10')
    : fail('All 10 universes have tagline + tags + tileDescription + motifNote', 'found on all 10', `missing on: ${missingMeta.join(', ')}`));

  console.log('\n  Design Studio entrance — reduced-motion gate on the entrance overlay:\n');

  const overlaySource = read('src/components/universe-studio/UniverseEntranceOverlay.jsx');
  results.push(/import \{ motion, AnimatePresence \} from 'framer-motion'/.test(overlaySource)
    ? pass('UniverseEntranceOverlay.jsx uses framer-motion (same library the real EntranceMoment.jsx uses)', 'found')
    : fail('UniverseEntranceOverlay.jsx uses framer-motion (same library the real EntranceMoment.jsx uses)', 'found', 'not found'));
  results.push(/prefersReducedMotion \? 0\.08 : /.test(overlaySource)
    ? pass('Reduced motion collapses the wash duration to a near-instant value', 'found')
    : fail('Reduced motion collapses the wash duration to a near-instant value', 'found', 'not found'));
  results.push(/\{!prefersReducedMotion && \(/.test(overlaySource)
    ? pass('The travelling headline is skipped entirely under reduced motion, not just shortened', 'found')
    : fail('The travelling headline is skipped entirely under reduced motion, not just shortened', 'found', 'not found'));

  const studioSource = read('src/pages/UniverseStudio.jsx');
  results.push(/const prefersReducedMotion = useReducedMotion\(\)/.test(studioSource) && /prefersReducedMotion={prefersReducedMotion}/.test(studioSource)
    ? pass('UniverseStudio.jsx resolves prefersReducedMotion and passes it into the entrance overlay', 'found')
    : fail('UniverseStudio.jsx resolves prefersReducedMotion and passes it into the entrance overlay', 'found', 'not found'));

  console.log('\n  Design Studio entrance — Ultra badge presence for gated universes:\n');

  results.push(/\{isUltra && \(/.test(tileSource) && /<Crown size=\{10\} \/> Ultra/.test(tileSource)
    ? pass('UniverseTile.jsx renders the Ultra badge conditionally on isUltra', 'found')
    : fail('UniverseTile.jsx renders the Ultra badge conditionally on isUltra', 'found', 'not found'));
  results.push(/ULTRA_UNIVERSE_IDS = new Set\(\['marrakech', 'paris'\]\)/.test(catalogSource)
    ? pass('universeCatalog.js gates exactly marrakech + paris behind Ultra', "['marrakech', 'paris']")
    : fail('universeCatalog.js gates exactly marrakech + paris behind Ultra', "['marrakech', 'paris']", 'not found / different set'));
  results.push(/showUpgrade = universe\.isUltra && !canAccessUltra && !isCurrent/.test(worldViewSource)
    ? pass('UniverseWorldView.jsx shows the upgrade path (not a locked-out door) for gated worlds', 'found')
    : fail('UniverseWorldView.jsx shows the upgrade path (not a locked-out door) for gated worlds', 'found', 'not found'));

  console.log('\n  Design Studio entrance — "Your design assets" removed from the page:\n');

  results.push(!/AssetGrid|AssetEditorModal/.test(studioSource)
    ? pass('UniverseStudio.jsx no longer imports AssetGrid or AssetEditorModal', 'not found')
    : fail('UniverseStudio.jsx no longer imports AssetGrid or AssetEditorModal', 'not found', 'still referenced'));
  results.push(/import UniverseTile from/.test(studioSource) && /import UniverseWorldView from/.test(studioSource)
    ? pass('UniverseStudio.jsx renders the new tile wall + world view instead', 'found')
    : fail('UniverseStudio.jsx renders the new tile wall + world view instead', 'found', 'not found'));

  return results;
}
