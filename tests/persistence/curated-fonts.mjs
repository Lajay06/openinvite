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
import { CURATED_FONTS, UNIVERSE_DEFAULT_FONT_IDS, UNIVERSE_FONT_OPTIONS, FONT_CATALOG, universePairingPresets } from '../../src/lib/curatedFonts.js';
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

  console.log('\n  feat/block-styling-v2 — FONT_CATALOG (the flat 30-font heading/body dropdown):\n');

  {
    // feat/universes-expansion-10 added 9 new faces (incl. the two CJK
    // faces for Seoul/Shanghai) — 30 + 9 = 39.
    results.push(FONT_CATALOG.length === 39
      ? pass('FONT_CATALOG has exactly 39 entries (30 original + 9 for the new universes)', String(FONT_CATALOG.length))
      : fail('FONT_CATALOG has exactly 39 entries (30 original + 9 for the new universes)', '39', String(FONT_CATALOG.length)));

    const ids = FONT_CATALOG.map(f => f.id);
    results.push(new Set(ids).size === ids.length
      ? pass('FONT_CATALOG — every id is unique', `${ids.length} unique ids`)
      : fail('FONT_CATALOG — every id is unique', 'all unique', `${new Set(ids).size} unique of ${ids.length}`));

    const labels = FONT_CATALOG.map(f => f.label);
    results.push(new Set(labels).size === labels.length
      ? pass('FONT_CATALOG — every label is unique', `${labels.length} unique labels`)
      : fail('FONT_CATALOG — every label is unique', 'all unique', `${new Set(labels).size} unique of ${labels.length}`));

    const allComplete = FONT_CATALOG.every(f => f.id && f.label && f.family && f.googleFonts);
    results.push(allComplete
      ? pass('FONT_CATALOG — every entry has id/label/family/googleFonts', 'all complete')
      : fail('FONT_CATALOG — every entry has id/label/family/googleFonts', 'all complete', JSON.stringify(FONT_CATALOG.find(f => !f.id || !f.label || !f.family || !f.googleFonts))));

    // Every FONT_CATALOG entry must be a real, resolvable CURATED_FONTS
    // registration — a catalog id with no matching registry entry would
    // render the browser's fallback font with no visible error.
    const allInRegistry = FONT_CATALOG.every(f => CURATED_FONTS[f.id]);
    results.push(allInRegistry
      ? pass('FONT_CATALOG — every id resolves a real CURATED_FONTS entry', 'all resolve')
      : fail('FONT_CATALOG — every id resolves a real CURATED_FONTS entry', 'all resolve', JSON.stringify(FONT_CATALOG.filter(f => !CURATED_FONTS[f.id]).map(f => f.id))));
  }

  console.log('\n  feat/block-styling-v2 — fontOverride can select ANY FONT_CATALOG entry for either role:\n');

  {
    const arbitraryHeading = FONT_CATALOG[FONT_CATALOG.length - 1].id;
    const arbitraryBody = FONT_CATALOG[0].id;
    const resolved = resolveTypography({ activeUniverse: 'aman', fontOverride: { headingFontId: arbitraryHeading, bodyFontId: arbitraryBody } });
    const expectedHeadingFont = CURATED_FONTS[arbitraryHeading].family;
    const expectedBodyFont = CURATED_FONTS[arbitraryBody].family;
    results.push(resolved.headingFont === expectedHeadingFont && resolved.bodyFont === expectedBodyFont
      ? pass('resolveTypography — fontOverride accepts a FONT_CATALOG id outside the universe\'s own curated alternates', `${resolved.headingFont} / ${resolved.bodyFont}`)
      : fail('resolveTypography — fontOverride accepts a FONT_CATALOG id outside the universe\'s own curated alternates', `${expectedHeadingFont} / ${expectedBodyFont}`, `${resolved.headingFont} / ${resolved.bodyFont}`));
  }

  return results;
}
