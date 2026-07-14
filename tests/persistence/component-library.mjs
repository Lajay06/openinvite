/**
 * tests/persistence/component-library.mjs
 *
 * Covers feat/component-library's block catalog: catalogId uniqueness,
 * backward compatibility with the renderType values pre-existing weddings
 * already have stored (from feat/block-builder, PR #97 — heading,
 * paragraph, photo, gallery, quote, spacer must keep resolving exactly as
 * before), and that every catalog entry has a real renderer registered in
 * UniverseBlocks.jsx.
 *
 * UniverseBlocks.jsx is a .jsx file (real render logic, imports React/
 * framer-motion) — this suite runs as a plain Node script with no JSX
 * transform, so rather than importing and executing it, the renderer-
 * coverage check reads its source text and confirms each renderType
 * literal appears as a RENDERERS map key. That's a static, string-level
 * check, not a behavioural one — it can't catch a renderer that's
 * registered but broken, only a renderType with no renderer at all.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLOCK_TYPES, CATEGORIES, blockLabel, newBlock } from '../../src/components/guest-website/blocks/blockTypes.js';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));

// Pre-existing renderType values a real wedding's stored blocks may already
// use (from PR #97, before this catalog expansion) — these must still
// resolve to a real renderer with the same dispatch key, or existing
// content silently stops rendering.
const LEGACY_RENDER_TYPES = ['heading', 'paragraph', 'photo', 'gallery', 'quote', 'spacer'];

export async function runComponentLibrary() {
  const results = [];

  console.log('\n  Component library — catalog integrity:\n');

  const catalogIds = BLOCK_TYPES.map(t => t.catalogId);
  results.push(new Set(catalogIds).size === catalogIds.length
    ? pass('BLOCK_TYPES — every catalogId is unique', `${catalogIds.length} entries`)
    : fail('BLOCK_TYPES — every catalogId is unique', 'all unique', `${new Set(catalogIds).size} unique of ${catalogIds.length}`));

  const badCategory = BLOCK_TYPES.find(t => !CATEGORIES.includes(t.category));
  results.push(!badCategory
    ? pass('BLOCK_TYPES — every entry has a valid category', CATEGORIES.join(', '))
    : fail('BLOCK_TYPES — every entry has a valid category', CATEGORIES.join(', '), `${badCategory.catalogId} → ${badCategory.category}`));

  const missingLabel = BLOCK_TYPES.find(t => !t.label || typeof t.label !== 'string');
  results.push(!missingLabel
    ? pass('BLOCK_TYPES — every entry has a non-empty label', `${BLOCK_TYPES.length} labels`)
    : fail('BLOCK_TYPES — every entry has a non-empty label', 'all present', missingLabel?.catalogId));

  console.log('\n  Component library — backward compatibility (PR #97 renderTypes):\n');

  const catalogRenderTypes = new Set(BLOCK_TYPES.map(t => t.renderType));
  for (const rt of LEGACY_RENDER_TYPES) {
    results.push(catalogRenderTypes.has(rt)
      ? pass(`BLOCK_TYPES — legacy renderType '${rt}' still present`, rt)
      : fail(`BLOCK_TYPES — legacy renderType '${rt}' still present`, rt, 'missing — existing weddings’ blocks of this type would stop resolving'));
  }

  console.log('\n  Component library — newBlock() produces the right renderType:\n');

  results.push(newBlock('heading').type === 'heading'
    ? pass('newBlock(\'heading\') — type matches catalogId (1:1 entry)', 'heading')
    : fail('newBlock(\'heading\') — type matches catalogId (1:1 entry)', 'heading', newBlock('heading').type));

  results.push(newBlock('divider').type === 'spacer'
    ? pass('newBlock(\'divider\') — resolves to the shared \'spacer\' renderType', 'spacer')
    : fail('newBlock(\'divider\') — resolves to the shared \'spacer\' renderType', 'spacer', newBlock('divider').type));

  results.push(newBlock('divider').content.variant === 'rule' && newBlock('spacer').content.variant === 'space'
    ? pass('newBlock — Divider vs Spacer start with different content.variant despite sharing a renderType', 'rule / space')
    : fail('newBlock — Divider vs Spacer start with different content.variant despite sharing a renderType', 'rule / space', `${newBlock('divider').content.variant} / ${newBlock('spacer').content.variant}`));

  results.push(blockLabel('photo') === 'Image'
    ? pass('blockLabel(\'photo\') — internal renderType \'photo\' displays as \'Image\'', 'Image')
    : fail('blockLabel(\'photo\') — internal renderType \'photo\' displays as \'Image\'', 'Image', blockLabel('photo')));

  console.log('\n  Component library — every catalog renderType has a registered renderer:\n');

  const universeBlocksSource = readFileSync(resolve(__dir, '..', '..', 'src/components/guest-website/blocks/UniverseBlocks.jsx'), 'utf8');
  const renderersMatch = universeBlocksSource.match(/export const RENDERERS = \{([\s\S]*?)\n\};/);
  const renderersBlock = renderersMatch ? renderersMatch[1] : '';

  const uniqueRenderTypes = [...new Set(BLOCK_TYPES.map(t => t.renderType))];
  const missingRenderer = uniqueRenderTypes.filter(rt => {
    const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(rt) ? rt : `'${rt}'`;
    return !renderersBlock.includes(`${key}:`);
  });

  results.push(missingRenderer.length === 0
    ? pass('UniverseBlocks.jsx RENDERERS — every catalog renderType has a matching key', `${uniqueRenderTypes.length} renderTypes`)
    : fail('UniverseBlocks.jsx RENDERERS — every catalog renderType has a matching key', 'all present', `missing: ${missingRenderer.join(', ')}`));

  return results;
}
