/**
 * tests/persistence/universe-styling.mjs
 *
 * Covers the feat/universe-styling-system goal: each of the 10 universes
 * resolves a distinct font pairing, texture token, and motion config through
 * src/lib/universeStyling.js's pure resolvers — the same functions the
 * published site (MultiPageWeddingWebsite.jsx) and the builder preview
 * (StudioWebsite.jsx) both call, so this also proves builder/publish parity
 * at the resolution-logic level (no per-universe forked CSS: one function,
 * ten data-driven configs).
 *
 * Pure-function tests — no Base44 API calls, no auth needed.
 */

import {
  resolveTypography,
  resolveTexture,
  resolveMotion,
  googleFontsHref,
  isMotionEnabled,
} from '../../src/lib/universeStyling.js';
import { UNIVERSE_CONFIGS } from '../../src/lib/websiteThemes.js';
import { pass, fail } from './_shared.mjs';

const UNIVERSES = ['aman', 'tulum', 'kyoto', 'capri', 'marrakech', 'brooklyn', 'bali', 'paris', 'capetown', 'mykonos'];

export async function runUniverseStyling() {
  const results = [];

  console.log('\n  Universe styling — all 10 universes declared:\n');

  results.push(UNIVERSES.every(id => !!UNIVERSE_CONFIGS[id])
    ? pass('UNIVERSE_CONFIGS declares all 10 canonical universes', UNIVERSES.join(', '))
    : fail('UNIVERSE_CONFIGS declares all 10 canonical universes', UNIVERSES.join(', '), Object.keys(UNIVERSE_CONFIGS).join(', ')));

  results.push(Object.keys(UNIVERSE_CONFIGS).length === 10
    ? pass('UNIVERSE_CONFIGS has exactly 10 entries (no stray/leftover keys)', '10')
    : fail('UNIVERSE_CONFIGS has exactly 10 entries (no stray/leftover keys)', '10', Object.keys(UNIVERSE_CONFIGS).length));

  console.log('\n  Font resolution — resolved font family differs per universe:\n');

  const resolvedHeadingFonts = UNIVERSES.map(id => resolveTypography({ activeUniverse: id }).headingFont);
  const resolvedBodyFonts = UNIVERSES.map(id => resolveTypography({ activeUniverse: id }).bodyFont);

  results.push(new Set(resolvedHeadingFonts).size === 10
    ? pass('resolveTypography — heading font is distinct across all 10 universes', resolvedHeadingFonts.join(' | '))
    : fail('resolveTypography — heading font is distinct across all 10 universes', '10 distinct', `${new Set(resolvedHeadingFonts).size} distinct: ${resolvedHeadingFonts.join(', ')}`));

  results.push(new Set(resolvedBodyFonts).size === 10
    ? pass('resolveTypography — body font is distinct across all 10 universes', resolvedBodyFonts.join(' | '))
    : fail('resolveTypography — body font is distinct across all 10 universes', '10 distinct', `${new Set(resolvedBodyFonts).size} distinct: ${resolvedBodyFonts.join(', ')}`));

  // Every universe must declare its own googleFonts query — otherwise its
  // fonts silently never load on the published site.
  for (const id of UNIVERSES) {
    const typo = resolveTypography({ activeUniverse: id });
    results.push(!!typo.googleFonts
      ? pass(`resolveTypography('${id}') — declares a googleFonts query`, typo.googleFonts)
      : fail(`resolveTypography('${id}') — declares a googleFonts query`, 'non-empty string', typo.googleFonts));
  }

  console.log('\n  Font resolution — case-insensitive, whitespace-tolerant, and falls back correctly:\n');

  {
    const lower = resolveTypography({ activeUniverse: 'aman' });
    const upper = resolveTypography({ activeUniverse: 'AMAN' });
    const padded = resolveTypography({ activeUniverse: '  Aman  ' });
    results.push(lower.headingFont === upper.headingFont && upper.headingFont === padded.headingFont
      ? pass('resolveTypography — case/whitespace-insensitive universe lookup', lower.headingFont)
      : fail('resolveTypography — case/whitespace-insensitive universe lookup', lower.headingFont, `${upper.headingFont} / ${padded.headingFont}`));
  }

  {
    // No universe set at all → falls back to the generic TYPOGRAPHY_PAIRINGS
    // system (activeTypography), not a crash or an undefined font.
    const fallback = resolveTypography({ activeUniverse: null, activeTypography: 'modern' });
    results.push(fallback.headingFont === '"DM Serif Display", serif'
      ? pass('resolveTypography — falls back to activeTypography when no universe is set', fallback.headingFont)
      : fail('resolveTypography — falls back to activeTypography when no universe is set', '"DM Serif Display", serif', fallback.headingFont));
  }

  {
    // Unknown universe id (typo, stale value) → same safe fallback, not a crash.
    const unknown = resolveTypography({ activeUniverse: 'nonexistent-universe-xyz' });
    results.push(!!unknown.headingFont
      ? pass('resolveTypography — unknown universe id falls back safely', unknown.headingFont)
      : fail('resolveTypography — unknown universe id falls back safely', 'a valid font string', unknown.headingFont));
  }

  console.log('\n  Texture resolution — switches with the universe, calibrated barely-there:\n');

  const resolvedTextures = UNIVERSES.map(id => resolveTexture({ activeUniverse: id }));

  results.push(resolvedTextures.every(t => t != null)
    ? pass('resolveTexture — every universe declares a texture token', resolvedTextures.map(t => t.type).join(', '))
    : fail('resolveTexture — every universe declares a texture token', 'all non-null', resolvedTextures.map(t => t?.type ?? 'MISSING').join(', ')));

  results.push(resolvedTextures.every(t => t.opacity > 0 && t.opacity <= 0.04)
    ? pass('resolveTexture — every opacity is calibrated barely-there (0 < opacity <= 0.04)', resolvedTextures.map(t => t.opacity).join(', '))
    : fail('resolveTexture — every opacity is calibrated barely-there (0 < opacity <= 0.04)', '0 < x <= 0.04', resolvedTextures.map(t => t.opacity).join(', ')));

  results.push(resolveTexture({}) === null
    ? pass('resolveTexture — no universe set → null (no texture rendered)', 'null')
    : fail('resolveTexture — no universe set → null (no texture rendered)', 'null', JSON.stringify(resolveTexture({}))));

  console.log('\n  Motion resolution — one consistent reveal type, calibrated per universe:\n');

  const resolvedMotions = UNIVERSES.map(id => resolveMotion({ activeUniverse: id }));

  results.push(resolvedMotions.every(m => m?.sectionReveal === 'fade')
    ? pass('resolveMotion — every universe uses the same reveal type (fade — opacity+translate)', 'fade × 10')
    : fail('resolveMotion — every universe uses the same reveal type (fade — opacity+translate)', 'fade × 10', resolvedMotions.map(m => m?.sectionReveal).join(', ')));

  results.push(new Set(resolvedMotions.map(m => `${m.duration}-${m.yOffset}`)).size > 1
    ? pass('resolveMotion — calibration (duration/yOffset) varies per universe personality', resolvedMotions.map(m => `${m.duration}s/${m.yOffset}px`).join(', '))
    : fail('resolveMotion — calibration (duration/yOffset) varies per universe personality', 'not all identical', 'all identical'));

  console.log('\n  Google Fonts URL construction:\n');

  {
    const href = googleFontsHref({ googleFonts: 'Test+Font:wght@400' });
    const isValid = href === 'https://fonts.googleapis.com/css2?family=Test+Font:wght@400&display=swap';
    results.push(isValid
      ? pass('googleFontsHref — builds a valid CSS2 URL with display=swap', href)
      : fail('googleFontsHref — builds a valid CSS2 URL with display=swap', 'https://fonts.googleapis.com/css2?family=Test+Font:wght@400&display=swap', href));
  }

  results.push(googleFontsHref({}) === null
    ? pass('googleFontsHref — no googleFonts declared → null (nothing injected)', 'null')
    : fail('googleFontsHref — no googleFonts declared → null (nothing injected)', 'null', googleFontsHref({})));

  console.log('\n  Motion enable/disable (builder control):\n');

  results.push(isMotionEnabled({ scrollAnimation: 'none' }) === false
    ? pass('isMotionEnabled — scrollAnimation:"none" disables motion', 'false')
    : fail('isMotionEnabled — scrollAnimation:"none" disables motion', 'false', isMotionEnabled({ scrollAnimation: 'none' })));

  results.push(isMotionEnabled({ scrollAnimation: 'subtle' }) === true
    ? pass('isMotionEnabled — scrollAnimation:"subtle" enables motion', 'true')
    : fail('isMotionEnabled — scrollAnimation:"subtle" enables motion', 'true', isMotionEnabled({ scrollAnimation: 'subtle' })));

  results.push(isMotionEnabled({}) === true
    ? pass('isMotionEnabled — unset scrollAnimation defaults to enabled', 'true')
    : fail('isMotionEnabled — unset scrollAnimation defaults to enabled', 'true', isMotionEnabled({})));

  return results;
}
