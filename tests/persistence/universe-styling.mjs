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
  resolveColors,
  googleFontsHref,
  isMotionEnabled,
} from '../../src/lib/universeStyling.js';
import { UNIVERSE_CONFIGS, WEBSITE_THEMES } from '../../src/lib/websiteThemes.js';
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

  // fix/universe-cleanup: tulum/bali previously resolved the identical
  // (type, opacity) pair (canvas/0.02), making the two indistinguishable.
  results.push(new Set(resolvedTextures.map(t => `${t.type}-${t.opacity}`)).size === 10
    ? pass('resolveTexture — (type, opacity) pair is distinct across all 10 universes', resolvedTextures.map(t => `${t.type}/${t.opacity}`).join(', '))
    : fail('resolveTexture — (type, opacity) pair is distinct across all 10 universes', '10 distinct', `${new Set(resolvedTextures.map(t => `${t.type}-${t.opacity}`)).size} distinct: ${resolvedTextures.map(t => `${t.type}/${t.opacity}`).join(', ')}`));

  console.log('\n  Motion resolution — one consistent reveal type, calibrated per universe:\n');

  const resolvedMotions = UNIVERSES.map(id => resolveMotion({ activeUniverse: id }));

  results.push(resolvedMotions.every(m => m?.sectionReveal === 'fade')
    ? pass('resolveMotion — every universe uses the same reveal type (fade — opacity+translate)', 'fade × 10')
    : fail('resolveMotion — every universe uses the same reveal type (fade — opacity+translate)', 'fade × 10', resolvedMotions.map(m => m?.sectionReveal).join(', ')));

  // fix/universe-cleanup: tulum/paris/capetown previously all resolved the
  // identical (duration, yOffset) pair (0.7/16), a 3-way collision.
  results.push(new Set(resolvedMotions.map(m => `${m.duration}-${m.yOffset}`)).size === 10
    ? pass('resolveMotion — (duration, yOffset) pair is distinct across all 10 universes', resolvedMotions.map(m => `${m.duration}s/${m.yOffset}px`).join(', '))
    : fail('resolveMotion — (duration, yOffset) pair is distinct across all 10 universes', '10 distinct', `${new Set(resolvedMotions.map(m => `${m.duration}-${m.yOffset}`)).size} distinct: ${resolvedMotions.map(m => `${m.duration}s/${m.yOffset}px`).join(', ')}`));

  console.log('\n  Page transition resolution — every universe declares one, distinct calibration:\n');

  const resolvedTransitions = UNIVERSES.map(id => UNIVERSE_CONFIGS[id]?.pageTransition);

  results.push(resolvedTransitions.every(t => t != null)
    ? pass('UNIVERSE_CONFIGS — every universe declares a pageTransition (fix/universe-cleanup, was aman-only)', resolvedTransitions.map(t => t.type).join(', '))
    : fail('UNIVERSE_CONFIGS — every universe declares a pageTransition (fix/universe-cleanup, was aman-only)', 'all non-null', resolvedTransitions.map(t => t?.type ?? 'MISSING').join(', ')));

  results.push(new Set(resolvedTransitions.map(t => `${t.type}-${t.duration}`)).size === 10
    ? pass('UNIVERSE_CONFIGS — pageTransition (type, duration) is distinct across all 10 universes', resolvedTransitions.map(t => `${t.type}/${t.duration}`).join(', '))
    : fail('UNIVERSE_CONFIGS — pageTransition (type, duration) is distinct across all 10 universes', '10 distinct', `${new Set(resolvedTransitions.map(t => `${t.type}-${t.duration}`)).size} distinct: ${resolvedTransitions.map(t => `${t.type}/${t.duration}`).join(', ')}`));

  console.log('\n  Colour resolution — distinct per universe, no fallback to Aman (fix/universe-palettes):\n');

  const resolvedColors = UNIVERSES.map(id => resolveColors({ activeUniverse: id }));

  results.push(resolvedColors.every(c => c != null && c.darkBg && c.accent)
    ? pass('resolveColors — every universe declares a full palette', resolvedColors.map(c => c.darkBg).join(', '))
    : fail('resolveColors — every universe declares a full palette', 'all non-null with darkBg/accent', JSON.stringify(resolvedColors)));

  results.push(new Set(resolvedColors.map(c => c.darkBg)).size === 10
    ? pass('resolveColors — darkBg is distinct across all 10 universes (none fall back to Aman)', resolvedColors.map(c => c.darkBg).join(', '))
    : fail('resolveColors — darkBg is distinct across all 10 universes (none fall back to Aman)', '10 distinct', `${new Set(resolvedColors.map(c => c.darkBg)).size} distinct: ${resolvedColors.map(c => c.darkBg).join(', ')}`));

  results.push(new Set(resolvedColors.map(c => c.accent)).size === 10
    ? pass('resolveColors — accent is distinct across all 10 universes', resolvedColors.map(c => c.accent).join(', '))
    : fail('resolveColors — accent is distinct across all 10 universes', '10 distinct', `${new Set(resolvedColors.map(c => c.accent)).size} distinct: ${resolvedColors.map(c => c.accent).join(', ')}`));

  {
    const amanColors = resolveColors({ activeUniverse: 'aman' });
    const amanLegacyTheme = WEBSITE_THEMES.find(t => t.id === 'aman');
    results.push(amanColors.darkBg === amanLegacyTheme.darkBg && amanColors.accent === amanLegacyTheme.accent
      ? pass('resolveColors(\'aman\') — matches the legacy WEBSITE_THEMES aman entry exactly (already-correct universe unchanged)', amanColors.accent)
      : fail('resolveColors(\'aman\') — matches the legacy WEBSITE_THEMES aman entry exactly (already-correct universe unchanged)', amanLegacyTheme.accent, amanColors.accent));
  }

  {
    // No universe set → falls back to the legacy activeTheme/WEBSITE_THEMES
    // lookup, same precedence pattern as resolveTypography's activeTypography
    // fallback — a pre-universe wedding record must be unaffected.
    const fallback = resolveColors({ activeUniverse: null, activeTheme: 'dusk' });
    const duskTheme = WEBSITE_THEMES.find(t => t.id === 'dusk');
    results.push(fallback.darkBg === duskTheme.darkBg
      ? pass('resolveColors — falls back to activeTheme/WEBSITE_THEMES when no universe is set', fallback.darkBg)
      : fail('resolveColors — falls back to activeTheme/WEBSITE_THEMES when no universe is set', duskTheme.darkBg, fallback.darkBg));
  }

  {
    // No universe AND no activeTheme → WEBSITE_THEMES[0] (aman), not a crash.
    const noSettings = resolveColors({});
    results.push(noSettings.darkBg === WEBSITE_THEMES[0].darkBg
      ? pass('resolveColors — no universe or activeTheme set → WEBSITE_THEMES[0] default, not a crash', noSettings.darkBg)
      : fail('resolveColors — no universe or activeTheme set → WEBSITE_THEMES[0] default, not a crash', WEBSITE_THEMES[0].darkBg, noSettings.darkBg));
  }

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
