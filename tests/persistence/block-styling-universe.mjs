/**
 * tests/persistence/block-styling-universe.mjs
 *
 * Covers fix/builder-published-sync's per-block-colour bug: the swatch
 * grid for a block's Text colour/Background must reflect the ACTIVE
 * UNIVERSE's own palette (Brooklyn = concrete/rust, Aman = warm paper/
 * espresso, Marrakech = terracotta/brass, ...), not a fixed set.
 *
 * The actual bug was a prop-plumbing mistake: WBRightPanel.jsx's
 * BlockStylePanel was resolving swatches against `universeTheme` — a
 * separate, legacy-shaped object StudioWebsite.jsx builds for its own
 * font-preview needs, with fields renamed to text/secondary/background/
 * primary — instead of `theme`, the resolveColors() output that
 * TEXT_COLOR_OPTIONS/BACKGROUND_OPTIONS's resolvers actually read
 * (lightText/accent/accentSecondary). Fixed by threading a `theme` prop
 * through StudioWebsite.jsx -> WBRightPanel.jsx -> BlockStylePanel.
 *
 * UniverseBlocks.jsx is a .jsx file (real render logic, imports React) —
 * this suite runs as a plain Node script with no JSX transform, so (same
 * convention as component-library.mjs) this reads its source text rather
 * than importing it, to confirm TEXT_COLOR_OPTIONS/BACKGROUND_OPTIONS
 * genuinely resolve against per-universe theme fields (t.lightText/
 * t.accent/t.accentSecondary), not a hardcoded literal — and separately
 * exercises resolveColors() to confirm those fields really do differ
 * across universes, so a swatch grid built from them can't be universe-
 * blind at the data layer.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveColors } from '../../src/lib/universeStyling.js';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const SAMPLE_UNIVERSES = ['aman', 'brooklyn', 'marrakech'];

export async function runBlockStylingUniverse() {
  const results = [];

  console.log('\n  Block styling — TEXT_COLOR_OPTIONS/BACKGROUND_OPTIONS resolve from theme, not a hardcoded literal:\n');

  const source = readFileSync(resolve(__dir, '..', '..', 'src/components/guest-website/blocks/UniverseBlocks.jsx'), 'utf8');
  const optionsBlockMatch = source.match(/export const TEXT_COLOR_OPTIONS = \[[\s\S]*?export const BACKGROUND_OPTIONS = \[[\s\S]*?\n\];/);
  const optionsBlock = optionsBlockMatch ? optionsBlockMatch[0] : '';

  results.push(/resolve:\s*\(t\)\s*=>\s*t\.lightText/.test(optionsBlock)
    ? pass('TEXT_COLOR_OPTIONS reads t.lightText (theme shape), not a fixed hex', 'found')
    : fail('TEXT_COLOR_OPTIONS reads t.lightText (theme shape), not a fixed hex', 'found', 'not found — may have regressed to a hardcoded value'));
  results.push(/resolve:\s*\(t\)\s*=>\s*t\.accent\b/.test(optionsBlock)
    ? pass('TEXT_COLOR_OPTIONS reads t.accent (theme shape), not a fixed hex', 'found')
    : fail('TEXT_COLOR_OPTIONS reads t.accent (theme shape), not a fixed hex', 'found', 'not found — may have regressed to a hardcoded value'));
  results.push(/resolve:\s*\(t\)\s*=>\s*t\.accentSecondary/.test(optionsBlock)
    ? pass('TEXT_COLOR_OPTIONS reads t.accentSecondary (theme shape), not a fixed hex', 'found')
    : fail('TEXT_COLOR_OPTIONS reads t.accentSecondary (theme shape), not a fixed hex', 'found', 'not found — may have regressed to a hardcoded value'));

  // The actual bug: BlockStylePanel resolving swatches against
  // `universeTheme` (legacy text/secondary/background/primary keys)
  // instead of `theme` (lightText/accent/accentSecondary). Confirm the
  // fixed call site and that the panel now accepts a `theme` prop.
  const panelSource = readFileSync(resolve(__dir, '..', '..', 'src/components/website-builder/WBRightPanel.jsx'), 'utf8');
  results.push(/opt\.resolve\(theme \|\| \{\}\)/.test(panelSource)
    ? pass('BlockStylePanel resolves swatches against `theme` (resolveColors shape)', 'found')
    : fail('BlockStylePanel resolves swatches against `theme` (resolveColors shape)', 'found', 'not found — may have regressed to universeTheme'));
  results.push(/function BlockStylePanel\(\{ block, theme, universeTheme, updateStyle \}\)/.test(panelSource)
    ? pass('BlockStylePanel accepts a `theme` prop distinct from `universeTheme`', 'found')
    : fail('BlockStylePanel accepts a `theme` prop distinct from `universeTheme`', 'found', 'not found'));

  const studioSource = readFileSync(resolve(__dir, '..', '..', 'src/pages/StudioWebsite.jsx'), 'utf8');
  results.push(/<WBRightPanel[\s\S]*?theme=\{theme\}/.test(studioSource)
    ? pass('StudioWebsite.jsx passes theme={theme} into WBRightPanel', 'found')
    : fail('StudioWebsite.jsx passes theme={theme} into WBRightPanel', 'found', 'not found — swatches would silently go universe-blind again'));

  console.log('\n  Block styling — resolveColors() genuinely differs across universes (the data a swatch grid is built from):\n');

  const themesByUniverse = Object.fromEntries(
    SAMPLE_UNIVERSES.map(key => [key, resolveColors({ activeUniverse: key })])
  );

  for (let i = 0; i < SAMPLE_UNIVERSES.length; i++) {
    for (let j = i + 1; j < SAMPLE_UNIVERSES.length; j++) {
      const a = SAMPLE_UNIVERSES[i], b = SAMPLE_UNIVERSES[j];
      const distinct = themesByUniverse[a].accent !== themesByUniverse[b].accent
        && themesByUniverse[a].lightText !== themesByUniverse[b].lightText;
      results.push(distinct
        ? pass(`resolveColors('${a}') vs resolveColors('${b}') — accent/lightText differ`, `${themesByUniverse[a].accent} vs ${themesByUniverse[b].accent}`)
        : fail(`resolveColors('${a}') vs resolveColors('${b}') — accent/lightText differ`, 'different values', 'identical'));
    }
  }

  for (const key of SAMPLE_UNIVERSES) {
    const theme = themesByUniverse[key];
    const hasAllFields = theme.lightText && theme.accent && theme.accentSecondary;
    results.push(hasAllFields
      ? pass(`resolveColors('${key}') has lightText/accent/accentSecondary defined`, `${theme.lightText} / ${theme.accent} / ${theme.accentSecondary}`)
      : fail(`resolveColors('${key}') has lightText/accent/accentSecondary defined`, 'all defined', JSON.stringify(theme)));
  }

  return results;
}
