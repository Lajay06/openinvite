/**
 * scripts/test-marketing-hero-consistency.mjs
 *
 * Structural guard for the marketing hero pattern (PR2 of the
 * marketing/auth/pricing batch) — the hero has drifted per-page repeatedly
 * (font size, scale, subtext, gradient, scroll cue all independently
 * reinvented on Features/Ava/Universes/Pricing). The fix: one shared
 * component, src/components/marketing/MarketingHero.jsx, that every
 * required marketing page renders through instead of hand-rolling its own
 * full-viewport hero section. Same static-source-scan approach as
 * scripts/test-vendor-contact-consistency.mjs.
 *
 * Home.jsx is deliberately excluded — its hero (HeroCollage.jsx) is a
 * distinct collage treatment by design, not a drifted copy of this pattern.
 *
 * Usage: node scripts/test-marketing-hero-consistency.mjs
 * Exits 0 if all pass, 1 if any fail.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dir, '..');

let failures = 0;
function fail(msg) { console.error(`  ✗ ${msg}`); failures++; }
function pass(msg) { console.log(`  ✓ ${msg}`); }

console.log('\n═══════════════════════════════════════════════════════');
console.log('  Marketing hero consistency guard');
console.log('═══════════════════════════════════════════════════════\n');

function importsFrom(src, componentPath) {
  const re = new RegExp(`from\\s+['"][^'"]*${componentPath}['"]`);
  return re.test(src);
}

function readSrc(relPath) {
  try {
    return readFileSync(resolve(repoRoot, relPath), 'utf8');
  } catch {
    return null;
  }
}

// ── Check 1: every required marketing page imports MarketingHero ─────────
console.log('Pages that must render MarketingHero:');
const PAGES_REQUIRING_MARKETING_HERO = [
  'src/pages/Features.jsx',
  'src/pages/Ava.jsx',
  'src/pages/Universes.jsx',
  'src/pages/Pricing.jsx',
  'src/pages/Gifting.jsx',
];
for (const relPath of PAGES_REQUIRING_MARKETING_HERO) {
  const src = readSrc(relPath);
  if (src === null) { fail(`${relPath} — file not found (has it been renamed or deleted?)`); continue; }
  if (importsFrom(src, 'marketing/MarketingHero')) pass(`${relPath} imports MarketingHero`);
  else fail(`${relPath} does NOT import MarketingHero — is it hand-rolling its own hero section again?`);
}

// ── Check 2: no required page still hand-rolls a second full-viewport
// hero-shaped section (height:100vh + an <h1) alongside the import — a page
// could import MarketingHero and still leave (or add back) a raw one ──────
console.log('\nNo leftover hand-rolled hero markup alongside the import:');
const HERO_SHAPE_RE = /height:\s*["']100vh["'][\s\S]{0,400}?<h1[\s>]/;
for (const relPath of PAGES_REQUIRING_MARKETING_HERO) {
  const src = readSrc(relPath);
  if (src === null) continue; // already failed above
  if (HERO_SHAPE_RE.test(src)) {
    fail(`${relPath} still contains a raw height:100vh + <h1 block outside MarketingHero — leftover hand-rolled hero not fully removed.`);
  } else {
    pass(`${relPath} has no leftover raw hero markup`);
  }
}

console.log('\n───────────────────────────────────────────────────────');
if (failures > 0) {
  console.error(`  FAILED — ${failures} issue(s) found`);
  console.log('───────────────────────────────────────────────────────\n');
  process.exit(1);
} else {
  console.log('  PASSED — every required marketing page uses MarketingHero');
  console.log('───────────────────────────────────────────────────────\n');
}
