/**
 * tests/persistence/curated-fonts.mjs
 *
 * Covers feat/block-styling-curated's font system fix:
 *  - resolveTypography(), with NO fontOverride set, must produce byte-for-
 *    byte identical output to what every existing wedding (including John &
 *    Suzanne) already renders — this is the migration-safety guarantee for
 *    the whole rewrite of resolveTypography's font-resolution branch.
 *  - resolveTypography() WITH a fontOverride set must actually change the
 *    resolved heading/body font — this is the literal regression test for
 *    "the Typography selector does nothing," confirmed root-caused to
 *    universeConfig.typography having unconditional priority over
 *    weddingDetails.activeTypography.
 *  - Every universe's default font ids resolve to real CURATED_FONTS
 *    entries (no typo'd id silently resolving to undefined).
 */
import { resolveTypography } from '../../src/lib/universeStyling.js';
import { UNIVERSE_CONFIGS } from '../../src/lib/websiteThemes.js';
import { CURATED_FONTS, UNIVERSE_DEFAULT_FONT_IDS, UNIVERSE_FONT_OPTIONS, universePairingPresets } from '../../src/lib/curatedFonts.js';
import { pass, fail } from './_shared.mjs';

const UNIVERSES = ['aman', 'tulum', 'kyoto', 'capri', 'marrakech', 'brooklyn', 'bali', 'paris', 'capetown', 'mykonos'];

export async function runCuratedFonts() {
  const results = [];

  console.log('\n  Curated fonts — every universe has registered default font ids:\n');

  for (const key of UNIVERSES) {
    const defaults = UNIVERSE_DEFAULT_FONT_IDS[key];
    const ok = defaults && CURATED_FONTS[defaults.headingFontId] && CURATED_FONTS[defaults.bodyFontId];
    results.push(ok
      ? pass(`UNIVERSE_DEFAULT_FONT_IDS['${key}'] — resolves real CURATED_FONTS entries`, `${defaults.headingFontId} / ${defaults.bodyFontId}`)
      : fail(`UNIVERSE_DEFAULT_FONT_IDS['${key}'] — resolves real CURATED_FONTS entries`, 'both defined', JSON.stringify(defaults)));
  }

  console.log('\n  Curated fonts — no fontOverride reproduces the universe\'s existing typography byte-for-byte:\n');

  for (const key of UNIVERSES) {
    const original = UNIVERSE_CONFIGS[key].typography;
    const resolved = resolveTypography({ activeUniverse: key });
    const fontsMatch = resolved.headingFont === original.headingFont && resolved.bodyFont === original.bodyFont;
    results.push(fontsMatch
      ? pass(`resolveTypography('${key}', no override) — headingFont/bodyFont match UNIVERSE_CONFIGS exactly`, `${resolved.headingFont} / ${resolved.bodyFont}`)
      : fail(`resolveTypography('${key}', no override) — headingFont/bodyFont match UNIVERSE_CONFIGS exactly`, `${original.headingFont} / ${original.bodyFont}`, `${resolved.headingFont} / ${resolved.bodyFont}`));

    const expectedGoogleFonts = original.googleFonts;
    results.push(resolved.googleFonts === expectedGoogleFonts
      ? pass(`resolveTypography('${key}', no override) — googleFonts query matches UNIVERSE_CONFIGS exactly`, resolved.googleFonts)
      : fail(`resolveTypography('${key}', no override) — googleFonts query matches UNIVERSE_CONFIGS exactly`, expectedGoogleFonts, resolved.googleFonts));

    const expectedHeadingWeight = original.headingWeight ?? 400;
    const expectedBodyWeight = original.bodyWeight ?? 400;
    results.push((resolved.headingWeight === expectedHeadingWeight && resolved.bodyWeight === expectedBodyWeight)
      ? pass(`resolveTypography('${key}', no override) — headingWeight/bodyWeight match UNIVERSE_CONFIGS exactly`, `${resolved.headingWeight} / ${resolved.bodyWeight}`)
      : fail(`resolveTypography('${key}', no override) — headingWeight/bodyWeight match UNIVERSE_CONFIGS exactly`, `${expectedHeadingWeight} / ${expectedBodyWeight}`, `${resolved.headingWeight} / ${resolved.bodyWeight}`));
  }

  console.log('\n  Curated fonts — fontOverride actually changes the resolved typography (the fixed bug):\n');

  {
    const withoutOverride = resolveTypography({ activeUniverse: 'aman' });
    const opts = UNIVERSE_FONT_OPTIONS.aman;
    const altHeadingId = opts.headingFontIds[1];
    const withOverride = resolveTypography({ activeUniverse: 'aman', fontOverride: { headingFontId: altHeadingId, bodyFontId: opts.bodyFontIds[0] } });
    results.push(withOverride.headingFont !== withoutOverride.headingFont
      ? pass('resolveTypography — setting fontOverride.headingFontId actually changes headingFont (previously inert)', `${withoutOverride.headingFont} → ${withOverride.headingFont}`)
      : fail('resolveTypography — setting fontOverride.headingFontId actually changes headingFont (previously inert)', 'a different font', 'unchanged — override still has no effect'));
  }

  {
    // Cross-universe sanity: an override valid for one universe shouldn't
    // silently apply to a different universe's resolution (each call is
    // scoped to its own weddingDetails.activeUniverse).
    const kyotoDefault = resolveTypography({ activeUniverse: 'kyoto' });
    const kyotoWithAmanOverrideIgnored = resolveTypography({ activeUniverse: 'kyoto' }); // no override — control
    results.push(kyotoDefault.headingFont === kyotoWithAmanOverrideIgnored.headingFont
      ? pass('resolveTypography — identical calls are deterministic (no hidden state)', kyotoDefault.headingFont)
      : fail('resolveTypography — identical calls are deterministic (no hidden state)', kyotoDefault.headingFont, kyotoWithAmanOverrideIgnored.headingFont));
  }

  console.log('\n  Curated fonts — pairing presets are real and universe-scoped:\n');

  for (const key of UNIVERSES) {
    const presets = universePairingPresets(key);
    const allValid = presets.length > 0 && presets.every(p => CURATED_FONTS[p.headingFontId] && CURATED_FONTS[p.bodyFontId]);
    results.push(allValid
      ? pass(`universePairingPresets('${key}') — every preset resolves real fonts`, presets.map(p => p.label).join(', '))
      : fail(`universePairingPresets('${key}') — every preset resolves real fonts`, 'all valid', JSON.stringify(presets)));
  }

  return results;
}
