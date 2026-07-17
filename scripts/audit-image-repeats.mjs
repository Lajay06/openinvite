/**
 * scripts/audit-image-repeats.mjs
 *
 * Marketing-site image audit. IMAGE_MANIFEST.md is a hand-maintained
 * record of "which photo got assigned where" — useful as a decision log,
 * but nothing ever checked it against what the page actually renders. That
 * gap is exactly how FeatureGuests.jsx shipped a 2x2 "photo grid" that was
 * really one photo shown four times: the component mapped over 4 distinct
 * URLs, but the <img> inside the map had a hardcoded fifth URL instead of
 * referencing the loop variable — a rendering bug, invisible to a manifest
 * that only tracks which URL strings exist in a file, not which one the
 * DOM actually ends up with.
 *
 * This script closes that gap with two checks that don't require a manual
 * log:
 *
 * 1. Cross-file repeats — the same image URL literal used in more than one
 *    marketing component/page. This is the actual "no repeats" rule,
 *    enforced automatically instead of by memory. Local per-universe
 *    photos (`/universes/*.jpg`) are allowlisted — the app's own canonical
 *    image per universe, deliberately reused (see IMAGE_MANIFEST.md).
 *
 * 2. Hardcoded src inside a .map() — finds `array.map((param) => ...)`
 *    blocks that render an <img src="..."> or backgroundImage: url(...)
 *    with a literal URL instead of referencing `param`. This is the exact
 *    defect class the FeatureGuests.jsx bug belongs to: it means every
 *    iteration paints the same fixed image regardless of what's being
 *    mapped over.
 *
 * Check 1 also resolves `PHOTOS.key` references against src/lib/photos.js
 * — round 3 found a real duplicate (Features.jsx's Quick Start photo and
 * FeatureBudget.jsx's cocktail-glass photo were the exact same image) that
 * this script missed on its first version, because it only matched literal
 * URL strings and `PHOTOS.photoM` isn't one. Without this resolution step,
 * any duplicate reached through the photo dictionary is invisible again.
 *
 * Usage: npm run audit:images
 * Exits non-zero if either check finds something, so it can gate CI later.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..');

// Marketing-facing surface only — dashboard/app UI images are out of scope
// (the "no repeats" rule is a marketing-site rule, per IMAGE_MANIFEST.md).
const TARGET_FILES = [
  'src/pages/Home.jsx',
  'src/pages/Features.jsx',
  'src/pages/Ava.jsx',
  'src/pages/About.jsx',
  'src/pages/Contact.jsx',
  'src/pages/Pricing.jsx',
  'src/pages/Universes.jsx',
  'src/components/public',
  'src/components/home',
];

const IMAGE_URL_RE = /(https?:\/\/[^\s"'`)]+\.(?:jpg|jpeg|png|webp|avif|gif)|\/universes\/[^\s"'`)]+\.(?:jpg|jpeg|png|webp))/gi;

// Legitimate, deliberate reuse:
// - the app's own canonical per-universe photography, already excluded
//   from the no-repeat pool in IMAGE_MANIFEST.md.
// - site chrome (the Openinvite wordmark logo) — brand asset, not the
//   marketing photography the no-repeat rule is about.
const ALLOWLISTED_EXACT = new Set([
  'https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png',
]);
const isAllowlisted = (url) => url.startsWith('/universes/') || ALLOWLISTED_EXACT.has(url);

// Extracts the array literal a `.map(` call is iterating over, whether
// it's an inline `[...].map(...)` or `SOME_CONST.map(...)` referencing an
// earlier `const SOME_CONST = [...]`. Returns the array's source text, or
// null if it can't be resolved (in which case the map-hardcode check is
// skipped for that call — no source array, no false positive).
function resolveMappedArraySource(text, mapIndex) {
  // Walk backward from `.map(` past whitespace/identifier chars to see what precedes it.
  let i = mapIndex;
  while (i > 0 && /[\s]/.test(text[i - 1])) i--;
  if (text[i - 1] === ']') {
    // Inline array literal — walk backward to its matching '['.
    let depth = 0;
    let j = i - 1;
    for (; j >= 0; j--) {
      if (text[j] === ']') depth++;
      else if (text[j] === '[') { depth--; if (depth === 0) break; }
    }
    return j >= 0 ? text.slice(j, i) : null;
  }
  // Otherwise expect `IDENTIFIER.map(` — grab the identifier and look up its declaration.
  let end = i;
  let start = end;
  while (start > 0 && /[\w$]/.test(text[start - 1])) start--;
  const identifier = text.slice(start, end);
  if (!identifier) return null;
  const declRe = new RegExp(`const\\s+${identifier}\\s*=\\s*\\[`);
  const declMatch = declRe.exec(text);
  if (!declMatch) return null;
  const arrStart = declMatch.index + declMatch[0].length - 1; // position of '['
  let depth = 0;
  for (let k = arrStart; k < text.length; k++) {
    if (text[k] === '[') depth++;
    else if (text[k] === ']') { depth--; if (depth === 0) return text.slice(arrStart, k + 1); }
  }
  return null;
}

function walk(relPath, out) {
  const abs = join(ROOT, relPath);
  const st = statSync(abs, { throwIfNoEntry: false });
  if (!st) return;
  if (st.isDirectory()) {
    for (const entry of readdirSync(abs)) {
      if (entry.endsWith('.jsx') || entry.endsWith('.js')) out.push(join(relPath, entry));
      else if (statSync(join(abs, entry)).isDirectory()) walk(join(relPath, entry), out);
    }
  } else {
    out.push(relPath);
  }
}

const files = [];
for (const t of TARGET_FILES) walk(t, files);

// Resolve src/lib/photos.js's PHOTOS dictionary so `PHOTOS.photoX` references
// count as their actual URL for duplicate-checking — see header comment.
const PHOTOS_MAP = new Map();
try {
  const photosSrc = readFileSync(join(ROOT, 'src/lib/photos.js'), 'utf8');
  const keyRe = /(\w+):\s*["'`](https?:\/\/[^"'`]+)["'`]/g;
  let km;
  while ((km = keyRe.exec(photosSrc))) PHOTOS_MAP.set(km[1], km[2]);
} catch { /* photos.js missing or moved — resolution just skipped */ }

const urlLocations = new Map(); // url -> [{file, line}]
const mapWarnings = [];

for (const relFile of files) {
  const abs = join(ROOT, relFile);
  const text = readFileSync(abs, 'utf8');
  const lines = text.split('\n');

  // Check 1: collect every image URL literal + its line number
  lines.forEach((line, i) => {
    let m;
    const re = new RegExp(IMAGE_URL_RE);
    while ((m = re.exec(line))) {
      const url = m[0];
      if (!urlLocations.has(url)) urlLocations.set(url, []);
      urlLocations.get(url).push({ file: relFile, line: i + 1 });
    }
    // PHOTOS.key references — resolve to the actual URL, same tracking.
    const photosRe = /PHOTOS\.(\w+)/g;
    let pm;
    while ((pm = photosRe.exec(line))) {
      const url = PHOTOS_MAP.get(pm[1]);
      if (!url) continue;
      if (!urlLocations.has(url)) urlLocations.set(url, []);
      urlLocations.get(url).push({ file: relFile, line: i + 1 });
    }
  });

  // Check 2: find `.map((param...) => ( ... ))` blocks and check whether
  // an <img src="LITERAL"> or backgroundImage: url(LITERAL) inside ignores
  // the loop param entirely.
  const mapCallRe = /\.\s*map\(\s*\(?\s*([A-Za-z_$][\w$]*)/g;
  let mm;
  while ((mm = mapCallRe.exec(text))) {
    const param = mm[1];
    if (['i', 'index', 'idx', 'key'].includes(param)) continue; // second-arg-only maps, skip

    // Only a candidate if the array actually being mapped is itself a list
    // of 2+ image URLs — otherwise an unrelated hardcoded image elsewhere
    // in the callback (e.g. a shared background behind a staggered-delay
    // map) reads as a false positive.
    const arraySource = resolveMappedArraySource(text, mm.index);
    if (!arraySource) continue;
    const imageUrlsInArray = arraySource.match(new RegExp(IMAGE_URL_RE)) || [];
    if (imageUrlsInArray.length < 2) continue;

    // Grab a bounded window after the match to inspect (avoids a full parser).
    const windowText = text.slice(mm.index, mm.index + 1500);
    const hardcoded = windowText.match(/(?:src=|backgroundImage:\s*[`'"]url\()\s*["'`]([^"'`]+\.(?:jpg|jpeg|png|webp|avif|gif))["'`]/);
    if (hardcoded) {
      const usesParamAsSrc = new RegExp(`(?:src=\\{|url\\(\\$\\{)\\s*${param}\\b`).test(windowText);
      const paramReferenced = new RegExp(`\\b${param}\\.[\\w]+\\b|\\{${param}\\}`).test(windowText);
      if (!usesParamAsSrc && !paramReferenced) {
        const line = text.slice(0, mm.index).split('\n').length;
        mapWarnings.push({ file: relFile, line, param, hardcoded: hardcoded[1] });
      }
    }
  }
}

let hasError = false;

console.log('── Cross-component image repeats ──────────────────────────');
let repeatCount = 0;
for (const [url, locs] of urlLocations) {
  if (isAllowlisted(url)) continue;
  const distinctFiles = new Set(locs.map((l) => l.file));
  if (distinctFiles.size > 1 || locs.length > 1) {
    repeatCount++;
    hasError = true;
    console.log(`✗ ${url}`);
    for (const l of locs) console.log(`    ${l.file}:${l.line}`);
  }
}
if (repeatCount === 0) console.log('✓ no repeated image URLs across marketing files');

console.log('\n── Hardcoded src inside .map() ─────────────────────────────');
if (mapWarnings.length === 0) {
  console.log('✓ no .map() callbacks found rendering a hardcoded image src');
} else {
  hasError = true;
  for (const w of mapWarnings) {
    console.log(`✗ ${w.file}:${w.line} — .map((${w.param}) => ...) renders a hardcoded image ("${w.hardcoded}") instead of using "${w.param}"`);
  }
}

console.log('\n' + '='.repeat(60));
console.log(hasError ? 'Image audit FAILED — see above.' : 'Image audit passed.');
process.exit(hasError ? 1 : 0);
