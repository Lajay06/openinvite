/**
 * tests/persistence/design-studio-entrance.mjs
 *
 * Covers fix/design-studio-entrance (the Design Studio rebuild around
 * direction C) and fix/design-studio-banners (full-width photographic
 * banners + the scroll-driven world view). Structural checks against
 * source text (same convention as seating-polish.mjs/dashboard-
 * structure.mjs — these are .jsx files with real render logic, and this
 * suite runs as a plain Node script with no JSX transform) plus a few
 * live/data checks and a real file-size check on the shipped images.
 *
 * What this file actually proves:
 *  1. Banners/tiles are sourced from UNIVERSE_CONFIGS, not a second
 *     hardcoded palette (the exact bug UniverseSelector.jsx had — its
 *     Capri swatch was the old flagged navy/lemon palette, out of sync
 *     with the real config). Confirms the retired files are actually
 *     gone, the new catalog/banner/world-view files reference
 *     UNIVERSE_CONFIGS, and — a live, content-level regression guard —
 *     that Capri's accent really is the corrected value, not the old
 *     flagged one.
 *  2. Real photography is wired for exactly the 3 universes it exists
 *     for (marrakech/bali/capetown), the shipped files are actually
 *     optimised (not multi-MB originals), and every universe's tile
 *     metadata (including the new worldStory copy) is present.
 *  3. Reduced-motion gates exist and are actually branched on (not just
 *     imported and ignored) in the entrance overlay, the banner's hover/
 *     scroll-reveal, and the world view's parallax hero.
 *  4. The Ultra badge renders conditionally on isUltra, the Ultra id set
 *     matches the two gated universes, and locked worlds get an upgrade
 *     path rather than a locked door.
 *  5. "Your design assets" is actually gone from the page (no AssetGrid/
 *     AssetEditorModal import left on UniverseStudio.jsx).
 */
import { readFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dir, '..', '..');
const read = (p) => readFileSync(resolve(repoRoot, p), 'utf8');
const exists = (p) => { try { readFileSync(resolve(repoRoot, p)); return true; } catch { return false; } };

export async function runDesignStudioEntrance() {
  const results = [];

  console.log('\n  Design Studio — banners sourced from UNIVERSE_CONFIGS, no hardcoded palette:\n');

  results.push(!exists('src/components/universe-studio/UniverseSelector.jsx')
    ? pass('UniverseSelector.jsx (the stale-swatch picker) is deleted', 'not found')
    : fail('UniverseSelector.jsx (the stale-swatch picker) is deleted', 'not found', 'file still present'));
  results.push(!exists('src/components/universe-studio/UniverseTile.jsx')
    ? pass('UniverseTile.jsx (superseded by the full-width UniverseBanner.jsx) is deleted', 'not found')
    : fail('UniverseTile.jsx (superseded by the full-width UniverseBanner.jsx) is deleted', 'not found', 'file still present'));

  const catalogSource = read('src/lib/universeCatalog.js');
  results.push(/import \{ UNIVERSE_CONFIGS \} from '\.\/websiteThemes\.js'/.test(catalogSource)
    ? pass('universeCatalog.js imports UNIVERSE_CONFIGS as its source', 'found')
    : fail('universeCatalog.js imports UNIVERSE_CONFIGS as its source', 'found', 'not found'));

  const bannerSource = read('src/components/universe-studio/UniverseBanner.jsx');
  results.push(/colors\.darkBg/.test(bannerSource) && /typography\.headingFont/.test(bannerSource)
    ? pass('UniverseBanner.jsx reads colour/type from the universe prop, not a local hardcoded map', 'found')
    : fail('UniverseBanner.jsx reads colour/type from the universe prop, not a local hardcoded map', 'found', 'not found'));

  const worldViewSource = read('src/components/universe-studio/UniverseWorldView.jsx');
  const newFilesCombined = bannerSource + catalogSource + worldViewSource;
  results.push(!/#1A6EBD|#FFE566|#E8C547/.test(newFilesCombined)
    ? pass('New banner/catalog/world-view files contain none of the old flagged Capri hex values', 'not found')
    : fail('New banner/catalog/world-view files contain none of the old flagged Capri hex values', 'not found', 'stale hex value found'));

  const websiteThemesSource = read('src/lib/websiteThemes.js');
  const capriMatch = websiteThemesSource.match(/capri: \{[\s\S]*?\n  \},/);
  const capriAccentOk = capriMatch && /accent: '#C4A130'/.test(capriMatch[0]);
  results.push(capriAccentOk
    ? pass("UNIVERSE_CONFIGS.capri.accent is the corrected muted gold, not the old flagged neon lemon", '#C4A130')
    : fail("UNIVERSE_CONFIGS.capri.accent is the corrected muted gold, not the old flagged neon lemon", '#C4A130', 'not found / regressed'));

  console.log('\n  Design Studio — real photography wired for 19 of 20 universes, optimised:\n');

  // feat/universe-experience-fixes — real photography now covers every
  // universe except Aman (no source photo exists for it yet). Marrakech/
  // Bali/Capetown were already wired in an earlier PR; this round added
  // photos for the remaining 16.
  const PHOTO_UNIVERSES = {
    marrakech: '/universes/marrakech.jpg', bali: '/universes/bali.jpg', capetown: '/universes/cape-town.jpg',
    tulum: '/universes/tulum.jpg', kyoto: '/universes/kyoto.jpg', capri: '/universes/capri.jpg',
    brooklyn: '/universes/brooklyn.jpg', paris: '/universes/paris.jpg', mykonos: '/universes/mykonos.jpg',
    amalfi: '/universes/amalfi.jpg', sedona: '/universes/sedona.jpg', aspen: '/universes/aspen.jpg',
    taj: '/universes/taj.jpg', havana: '/universes/havana.jpg', edinburgh: '/universes/edinburgh.jpg',
    monaco: '/universes/monaco.jpg', florence: '/universes/florence.jpg', seoul: '/universes/seoul.jpg',
    shanghai: '/universes/shanghai.jpg',
  };
  const NO_PHOTO_UNIVERSES = ['aman'];

  for (const [id, expectedPath] of Object.entries(PHOTO_UNIVERSES)) {
    const m = websiteThemesSource.match(new RegExp(`${id}: \\{[\\s\\S]*?\\n  \\},`));
    const block = m ? m[0] : '';
    const hasImage = block.includes(`imageUrl: '${expectedPath}'`);
    results.push(hasImage
      ? pass(`UNIVERSE_CONFIGS.${id}.imageUrl points at the real photo`, expectedPath)
      : fail(`UNIVERSE_CONFIGS.${id}.imageUrl points at the real photo`, expectedPath, 'not found'));
  }
  for (const id of NO_PHOTO_UNIVERSES) {
    const m = websiteThemesSource.match(new RegExp(`${id}: \\{[\\s\\S]*?\\n  \\},`));
    const block = m ? m[0] : '';
    results.push(/imageUrl: null/.test(block)
      ? pass(`UNIVERSE_CONFIGS.${id}.imageUrl stays null — no faked image`, 'null')
      : fail(`UNIVERSE_CONFIGS.${id}.imageUrl stays null — no faked image`, 'null', 'a value was set'));
  }

  // Real file-size guard, not just a path check — this is the actual
  // "don't ship multi-MB originals" requirement, checked against the
  // files that will really be served.
  const MAX_FULL_BYTES = 700 * 1024; // 700KB — generous ceiling for a 2400px-wide hero photo at web quality
  const MAX_SMALL_BYTES = 150 * 1024; // 150KB — the 800w responsive variant
  for (const file of [
    'marrakech.jpg', 'bali.jpg', 'cape-town.jpg',
    'tulum.jpg', 'kyoto.jpg', 'capri.jpg', 'brooklyn.jpg', 'paris.jpg', 'mykonos.jpg',
    'amalfi.jpg', 'sedona.jpg', 'aspen.jpg', 'taj.jpg', 'havana.jpg', 'edinburgh.jpg',
    'monaco.jpg', 'florence.jpg', 'seoul.jpg', 'shanghai.jpg',
  ]) {
    const fullPath = resolve(repoRoot, 'public/universes', file);
    const smallPath = resolve(repoRoot, 'public/universes', file.replace(/\.jpg$/, '-800.jpg'));
    try {
      const fullSize = statSync(fullPath).size;
      results.push(fullSize <= MAX_FULL_BYTES
        ? pass(`public/universes/${file} is optimised (≤${Math.round(MAX_FULL_BYTES / 1024)}KB)`, `${Math.round(fullSize / 1024)}KB`)
        : fail(`public/universes/${file} is optimised (≤${Math.round(MAX_FULL_BYTES / 1024)}KB)`, `≤${Math.round(MAX_FULL_BYTES / 1024)}KB`, `${Math.round(fullSize / 1024)}KB — still multi-hundred-KB or larger`));
    } catch {
      results.push(fail(`public/universes/${file} exists`, 'file present', 'not found'));
    }
    try {
      const smallSize = statSync(smallPath).size;
      results.push(smallSize <= MAX_SMALL_BYTES
        ? pass(`public/universes/${file.replace(/\.jpg$/, '-800.jpg')} responsive variant is optimised (≤${Math.round(MAX_SMALL_BYTES / 1024)}KB)`, `${Math.round(smallSize / 1024)}KB`)
        : fail(`public/universes/${file.replace(/\.jpg$/, '-800.jpg')} responsive variant is optimised (≤${Math.round(MAX_SMALL_BYTES / 1024)}KB)`, `≤${Math.round(MAX_SMALL_BYTES / 1024)}KB`, `${Math.round(smallSize / 1024)}KB`));
    } catch {
      results.push(fail(`public/universes/${file.replace(/\.jpg$/, '-800.jpg')} responsive variant exists`, 'file present', 'not found'));
    }
  }

  console.log('\n  Design Studio — every universe has complete tile metadata (tagline/tags/description/motif/story):\n');

  const UNIVERSE_IDS = ['aman', 'tulum', 'kyoto', 'capri', 'marrakech', 'brooklyn', 'bali', 'paris', 'capetown', 'mykonos'];
  const missingMeta = UNIVERSE_IDS.filter(id => {
    const m = websiteThemesSource.match(new RegExp(`${id}: \\{[\\s\\S]*?\\n  \\},`));
    const block = m ? m[0] : '';
    return !/tagline: '/.test(block) || !/tileDescription: /.test(block) || !/motifNote: /.test(block) || !/tags: \[/.test(block) || !/worldStory: /.test(block);
  });
  results.push(missingMeta.length === 0
    ? pass('All 10 universes have tagline + tags + tileDescription + motifNote + worldStory', 'found on all 10')
    : fail('All 10 universes have tagline + tags + tileDescription + motifNote + worldStory', 'found on all 10', `missing on: ${missingMeta.join(', ')}`));

  // feat/universes-expansion-10 — a real runtime completeness gate, not a
  // hardcoded id list: derives the universe list from
  // Object.keys(UNIVERSE_CONFIGS) itself, so a *future* 21st universe is
  // checked automatically the moment it's added to config, with no test
  // file to remember to update. Covers exactly the fields the brief named
  // as required: palette, type, motif, description, tags, tier.
  console.log('\n  Design Studio — every universe in UNIVERSE_CONFIGS has all required fields (future-proof, no hardcoded id list):\n');

  {
    const { UNIVERSE_CONFIGS } = await import('../../src/lib/websiteThemes.js');
    const REQUIRED_FIELD_CHECKS = {
      'palette (colors.darkBg/lightBg/accent/accentSecondary)': (cfg) =>
        !!cfg.colors?.darkBg && !!cfg.colors?.lightBg && !!cfg.colors?.accent && !!cfg.colors?.accentSecondary,
      'type (typography.headingFont/bodyFont/googleFonts)': (cfg) =>
        !!cfg.typography?.headingFont && !!cfg.typography?.bodyFont && !!cfg.typography?.googleFonts,
      'motif (motifNote)': (cfg) => !!cfg.motifNote && cfg.motifNote.length > 0,
      'description (tileDescription + worldStory)': (cfg) => !!cfg.tileDescription && !!cfg.worldStory,
      'tags (non-empty array)': (cfg) => Array.isArray(cfg.tags) && cfg.tags.length > 0,
      'tier (\'free\' or \'ultra\')': (cfg) => cfg.tier === 'free' || cfg.tier === 'ultra',
    };

    const allIds = Object.keys(UNIVERSE_CONFIGS);
    results.push(allIds.length >= 20
      ? pass(`UNIVERSE_CONFIGS has at least the 20 expected universes`, String(allIds.length))
      : fail(`UNIVERSE_CONFIGS has at least the 20 expected universes`, '>= 20', String(allIds.length)));

    for (const [label, check] of Object.entries(REQUIRED_FIELD_CHECKS)) {
      const missing = allIds.filter(id => !check(UNIVERSE_CONFIGS[id]));
      results.push(missing.length === 0
        ? pass(`Every universe declares ${label}`, `found on all ${allIds.length}`)
        : fail(`Every universe declares ${label}`, `found on all ${allIds.length}`, `missing on: ${missing.join(', ')}`));
    }

    // MOTIF_LARGE (the world page's Motifs chapter) is a hand-maintained
    // map keyed by universe id with a graceful "no dedicated motif yet"
    // fallback (see UniverseWorldView.jsx) — exactly the kind of map that
    // let Tulum/Marrakech silently ship with no motif earlier this
    // project. Checking every id has a real entry here catches that class
    // of gap for any future universe too, not just missing config fields.
    const missingMotifLarge = allIds.filter(id => !new RegExp(`\\b${id}: \\(color\\) =>`).test(worldViewSource));
    results.push(missingMotifLarge.length === 0
      ? pass('Every universe has a MOTIF_LARGE entry in UniverseWorldView.jsx (no silent "no motif yet" fallback)', `found on all ${allIds.length}`)
      : fail('Every universe has a MOTIF_LARGE entry in UniverseWorldView.jsx (no silent "no motif yet" fallback)', `found on all ${allIds.length}`, `missing on: ${missingMotifLarge.join(', ')}`));

    // MASTHEAD_BY_LAYOUT is keyed by `layout`, not universe id directly —
    // every universe that declares a `layout` should have a real masthead
    // wired, or its world-page hero silently falls back to GenericMasthead.
    const idsWithLayout = allIds.filter(id => !!UNIVERSE_CONFIGS[id]?.layout);
    const missingMasthead = idsWithLayout.filter(id => !new RegExp(`'${UNIVERSE_CONFIGS[id].layout}':`).test(worldViewSource.slice(0, worldViewSource.indexOf('MOTIF_LARGE'))));
    results.push(missingMasthead.length === 0
      ? pass('Every universe with a layout id has a MASTHEAD_BY_LAYOUT entry', `found on all ${idsWithLayout.length}`)
      : fail('Every universe with a layout id has a MASTHEAD_BY_LAYOUT entry', `found on all ${idsWithLayout.length}`, `missing on: ${missingMasthead.join(', ')}`));
  }

  console.log('\n  Design Studio — reduced-motion gates (entrance overlay, banner, world view hero):\n');

  const overlaySource = read('src/components/universe-studio/UniverseEntranceOverlay.jsx');
  results.push(/import \{ motion, AnimatePresence \} from 'framer-motion'/.test(overlaySource)
    ? pass('UniverseEntranceOverlay.jsx uses framer-motion (same library the real EntranceMoment.jsx uses)', 'found')
    : fail('UniverseEntranceOverlay.jsx uses framer-motion (same library the real EntranceMoment.jsx uses)', 'found', 'not found'));
  // feat/universe-experience-fixes — real root cause of the transition-name
  // centring bug: .page-content's forwards-filled opacity animation
  // creates a stacking context that trapped this overlay's zIndex below
  // the sibling TopBar, visually cropping the top of the dark canvas.
  // Portalling to document.body escapes it entirely — confirmed with a
  // real browser measurement (getBoundingClientRect), not just a source
  // check, but this guards the source-level fix from regressing.
  results.push(/import \{ createPortal \} from 'react-dom'/.test(overlaySource) && /createPortal\(/.test(overlaySource) && /document\.body/.test(overlaySource)
    ? pass('UniverseEntranceOverlay.jsx portals to document.body, escaping .page-content\'s stacking context', 'found')
    : fail('UniverseEntranceOverlay.jsx portals to document.body, escaping .page-content\'s stacking context', 'found', 'not found'));
  results.push(/prefersReducedMotion \? 0\.08 : /.test(overlaySource)
    ? pass('Reduced motion collapses the wash duration to a near-instant value', 'found')
    : fail('Reduced motion collapses the wash duration to a near-instant value', 'found', 'not found'));
  results.push(/prefersReducedMotion \? \(/.test(overlaySource) && /\/\/ Reduced motion still needs the name to appear/.test(overlaySource)
    ? pass('The travelling headline swaps for a static, fully-visible name under reduced motion (not silently skipped)', 'found')
    : fail('The travelling headline swaps for a static, fully-visible name under reduced motion (not silently skipped)', 'found', 'not found'));

  results.push(/whileHover={prefersReducedMotion \? undefined : \{ scale: 1\.045 \}}/.test(bannerSource)
    ? pass('UniverseBanner.jsx skips the hover scale entirely under reduced motion', 'found')
    : fail('UniverseBanner.jsx skips the hover scale entirely under reduced motion', 'found', 'not found'));
  results.push(/initial={prefersReducedMotion \? false : \{ opacity: 0, y: 24 \}}/.test(bannerSource)
    ? pass('UniverseBanner.jsx skips the scroll-reveal entirely under reduced motion', 'found')
    : fail('UniverseBanner.jsx skips the scroll-reveal entirely under reduced motion', 'found', 'not found'));

  results.push(/useScroll\(\{ target: ref, offset: \['start start', 'end start'\] \}\)/.test(worldViewSource)
    ? pass('UniverseWorldView.jsx hero uses scroll-linked parallax (useScroll/useTransform)', 'found')
    : fail('UniverseWorldView.jsx hero uses scroll-linked parallax (useScroll/useTransform)', 'found', 'not found'));
  results.push(/y: prefersReducedMotion \? 0 : parallaxY/.test(worldViewSource)
    ? pass('UniverseWorldView.jsx hero parallax is disabled entirely under reduced motion (static image)', 'found')
    : fail('UniverseWorldView.jsx hero parallax is disabled entirely under reduced motion (static image)', 'found', 'not found'));
  results.push(/new IntersectionObserver\(/.test(worldViewSource)
    ? pass('UniverseWorldView.jsx chapters reveal via IntersectionObserver, not a scroll-linked calculation', 'found')
    : fail('UniverseWorldView.jsx chapters reveal via IntersectionObserver, not a scroll-linked calculation', 'found', 'not found'));
  results.push(/if \(prefersReducedMotion \|\| visible\) return;/.test(worldViewSource)
    ? pass('UniverseWorldView.jsx chapters skip the observer entirely under reduced motion (immediately visible)', 'found')
    : fail('UniverseWorldView.jsx chapters skip the observer entirely under reduced motion (immediately visible)', 'found', 'not found'));
  results.push(/observer\.disconnect\(\);\s*\n\s*\}\s*\n\s*\},\s*\n\s*\{ threshold: 0\.15 \}/.test(worldViewSource)
    ? pass('UniverseWorldView.jsx chapters reveal once and stop observing (never re-hide on scroll-up)', 'found')
    : fail('UniverseWorldView.jsx chapters reveal once and stop observing (never re-hide on scroll-up)', 'found', 'not found'));
  results.push(/transition: prefersReducedMotion \? 'none' : 'opacity 0\.6s ease-out, transform 0\.6s ease-out'/.test(worldViewSource)
    ? pass('UniverseWorldView.jsx chapter reveal is a plain opacity/transform CSS transition', 'found')
    : fail('UniverseWorldView.jsx chapter reveal is a plain opacity/transform CSS transition', 'found', 'not found'));

  console.log('\n  Design Studio — entering/leaving a world resets/restores scroll position correctly:\n');

  results.push(/useLayoutEffect\(\(\) => \{\s*\n\s*window\.scrollTo\(0, 0\);\s*\n\s*\}, \[\]\);/.test(worldViewSource)
    ? pass('UniverseWorldView.jsx resets scroll to 0 synchronously on mount (useLayoutEffect, before paint)', 'found')
    : fail('UniverseWorldView.jsx resets scroll to 0 synchronously on mount (useLayoutEffect, before paint)', 'found', 'not found'));

  const studioSource = read('src/pages/UniverseStudio.jsx');
  results.push(/wallScrollRef\.current = window\.scrollY;/.test(studioSource)
    ? pass('UniverseStudio.jsx saves the wall\'s scroll position before entering a world', 'found')
    : fail('UniverseStudio.jsx saves the wall\'s scroll position before entering a world', 'found', 'not found'));
  results.push(/window\.scrollTo\(0, wallScrollRef\.current\);/.test(studioSource)
    ? pass('UniverseStudio.jsx restores the saved scroll position when returning to the wall', 'found')
    : fail('UniverseStudio.jsx restores the saved scroll position when returning to the wall', 'found', 'not found'));

  console.log('\n  Design Studio — banner wall is flush, no gaps between rows:\n');

  results.push(/gap: 0/.test(studioSource)
    ? pass('UniverseStudio.jsx stacks banners with zero gap between rows', 'found')
    : fail('UniverseStudio.jsx stacks banners with zero gap between rows', 'found', 'not found — a gap may still exist'));
  results.push(!/gap: 48/.test(studioSource)
    ? pass('UniverseStudio.jsx no longer has the old 48px inter-banner gap', 'not found')
    : fail('UniverseStudio.jsx no longer has the old 48px inter-banner gap', 'not found', 'still present'));
  results.push(/const prefersReducedMotion = useReducedMotion\(\)/.test(studioSource) && /prefersReducedMotion={prefersReducedMotion}/.test(studioSource)
    ? pass('UniverseStudio.jsx resolves prefersReducedMotion and passes it into the entrance overlay', 'found')
    : fail('UniverseStudio.jsx resolves prefersReducedMotion and passes it into the entrance overlay', 'found', 'not found'));

  console.log('\n  Design Studio — Ultra badge presence for gated universes:\n');

  results.push(/\{isUltra && \(/.test(bannerSource) && /<Crown size=\{10\} \/> Ultra/.test(bannerSource)
    ? pass('UniverseBanner.jsx renders the Ultra badge conditionally on isUltra', 'found')
    : fail('UniverseBanner.jsx renders the Ultra badge conditionally on isUltra', 'found', 'not found'));
  // Gating is config-driven (feat/universes-expansion-10) — verify the
  // mechanism (every tier:'ultra' config entry is gated, and only those)
  // rather than a hardcoded id list, which is exactly the anti-pattern
  // this replaced.
  {
    const { UNIVERSE_CONFIGS } = await import('../../src/lib/websiteThemes.js');
    const { ULTRA_UNIVERSE_IDS } = await import('../../src/lib/universeCatalog.js');
    const expectedUltra = new Set(Object.keys(UNIVERSE_CONFIGS).filter(id => UNIVERSE_CONFIGS[id]?.tier === 'ultra'));
    const setsMatch = expectedUltra.size === ULTRA_UNIVERSE_IDS.size
      && [...expectedUltra].every(id => ULTRA_UNIVERSE_IDS.has(id));
    results.push(setsMatch
      ? pass('universeCatalog.js ULTRA_UNIVERSE_IDS derives exactly from tier: \'ultra\' configs, no hardcoded list', [...ULTRA_UNIVERSE_IDS].join(', '))
      : fail('universeCatalog.js ULTRA_UNIVERSE_IDS derives exactly from tier: \'ultra\' configs, no hardcoded list', [...expectedUltra].join(', '), [...ULTRA_UNIVERSE_IDS].join(', ')));
    results.push(!/new Set\(\[.*'marrakech'.*\]\)/.test(catalogSource)
      ? pass('universeCatalog.js no longer hardcodes the Ultra id list as a literal array', 'not found')
      : fail('universeCatalog.js no longer hardcodes the Ultra id list as a literal array', 'not found', 'still present'));
  }
  results.push(/showUpgrade = universe\.isUltra && !canAccessUltra && !isCurrent/.test(worldViewSource)
    ? pass('UniverseWorldView.jsx shows the upgrade path (not a locked-out door) for gated worlds', 'found')
    : fail('UniverseWorldView.jsx shows the upgrade path (not a locked-out door) for gated worlds', 'found', 'not found'));

  console.log('\n  Design Studio — "Your design assets" removed from the page:\n');

  results.push(!/AssetGrid|AssetEditorModal/.test(studioSource)
    ? pass('UniverseStudio.jsx no longer imports AssetGrid or AssetEditorModal', 'not found')
    : fail('UniverseStudio.jsx no longer imports AssetGrid or AssetEditorModal', 'not found', 'still referenced'));
  results.push(/import UniverseBanner from/.test(studioSource) && /import UniverseWorldView from/.test(studioSource)
    ? pass('UniverseStudio.jsx renders the new banner wall + world view instead', 'found')
    : fail('UniverseStudio.jsx renders the new banner wall + world view instead', 'found', 'not found'));

  console.log('\n  Design Studio — every universe has a rendered motif (tulum + marrakech gaps filled):\n');

  results.push(exists('src/components/guest-website/layouts/SunRayArc.jsx')
    ? pass('SunRayArc.jsx (Tulum\'s new sun-ray motif primitive) exists', 'found')
    : fail('SunRayArc.jsx (Tulum\'s new sun-ray motif primitive) exists', 'found', 'not found'));
  results.push(/tulum: \(color\) => <SunRayArc/.test(bannerSource)
    ? pass('UniverseBanner.jsx MOTIF_ACCENT now includes tulum', 'found')
    : fail('UniverseBanner.jsx MOTIF_ACCENT now includes tulum', 'found', 'not found'));
  results.push(/tulum: \(color\) => <SunRayArc/.test(worldViewSource)
    ? pass('UniverseWorldView.jsx MOTIF_LARGE now includes tulum', 'found')
    : fail('UniverseWorldView.jsx MOTIF_LARGE now includes tulum', 'found', 'not found'));
  results.push(/marrakech: \(color\) => <ZelligeDivider/.test(worldViewSource)
    ? pass('UniverseWorldView.jsx MOTIF_LARGE now includes marrakech (reusing ZelligeDivider)', 'found')
    : fail('UniverseWorldView.jsx MOTIF_LARGE now includes marrakech (reusing ZelligeDivider)', 'found', 'not found'));
  const tulumMatch = websiteThemesSource.match(/tulum: \{[\s\S]*?\n  \},/);
  results.push(tulumMatch && /motifNote: 'Concentric sun-ray arcs/.test(tulumMatch[0])
    ? pass('UNIVERSE_CONFIGS.tulum.motifNote describes the new sun-ray motif, not the old generic texture line', 'found')
    : fail('UNIVERSE_CONFIGS.tulum.motifNote describes the new sun-ray motif, not the old generic texture line', 'found', 'not found'));

  console.log('\n  Design Studio — entrance transition name is grid-centred on every viewport, incl. reduced motion:\n');

  results.push(/display: 'grid', placeItems: 'center'/.test(overlaySource)
    ? pass('UniverseEntranceOverlay.jsx centres via CSS grid placeItems, not margin guesses', 'found')
    : fail('UniverseEntranceOverlay.jsx centres via CSS grid placeItems, not margin guesses', 'found', 'not found'));
  results.push((overlaySource.match(/textAlign: 'center', maxWidth: '90vw'/g) || []).length >= 2
    ? pass('Both the animated and reduced-motion name variants are text-centred with a maxWidth safety for long names', 'found on both')
    : fail('Both the animated and reduced-motion name variants are text-centred with a maxWidth safety for long names', 'found on both', 'missing on at least one variant'));

  console.log('\n  Design Studio — world page has a persistent, keyboard-accessible way back:\n');

  results.push(/← All universes/.test(worldViewSource)
    ? pass('World page back button reads "All universes" (was "All worlds")', 'found')
    : fail('World page back button reads "All universes" (was "All worlds")', 'found', 'not found'));
  results.push(/top: 96, left: 32, zIndex: 60/.test(worldViewSource)
    ? pass('World page back button sits below the app top bar/trial banner, above default chrome z-index', 'found')
    : fail('World page back button sits below the app top bar/trial banner, above default chrome z-index', 'found', 'not found'));
  results.push(/background: 'rgba\(10,10,10,0\.55\)', backdropFilter: 'blur\(8px\)'/.test(worldViewSource)
    ? pass('World page back button has a dark scrim + blur, legible over any chapter background', 'found')
    : fail('World page back button has a dark scrim + blur, legible over any chapter background', 'found', 'not found'));
  results.push(/if \(e\.key === 'Escape'\) onBack\(\);/.test(worldViewSource)
    ? pass('World page listens for Escape to go back, in addition to the button', 'found')
    : fail('World page listens for Escape to go back, in addition to the button', 'found', 'not found'));
  // feat/universe-experience-fixes — real root cause of the button
  // rendering invisible: it lived inside .page-content, whose forwards-
  // filled opacity animation traps it in a stacking context that loses
  // to the sidebar (zIndex:40, its own stacking context via `contain:
  // layout`) — confirmed with a real browser: elementFromPoint at the
  // button's centre returned the sidebar div, not the button, before
  // this fix. Portalling to document.body escapes it, same as the
  // entrance overlay fix just above.
  results.push(/createPortal\(\s*\n\s*<button/.test(worldViewSource) && /<\/button>,\s*\n\s*document\.body\s*\n\s*\)\}/.test(worldViewSource)
    ? pass('World page back button portals to document.body, escaping .page-content\'s stacking context (was invisible behind the sidebar)', 'found')
    : fail('World page back button portals to document.body, escaping .page-content\'s stacking context (was invisible behind the sidebar)', 'found', 'not found'));

  return results;
}
