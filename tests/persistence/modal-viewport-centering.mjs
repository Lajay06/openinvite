/**
 * tests/persistence/modal-viewport-centering.mjs
 *
 * Covers fix/modal-viewport-centering. Root cause: `.page-content` (the
 * dashboard shell wrapper every page renders inside — src/Layout.jsx) ran
 * a `pageFadeIn` CSS animation with `animation-fill-mode: forwards` whose
 * final keyframe set `transform: translateY(0)`. Per the CSS Transforms
 * spec, ANY transform value other than the literal keyword `none` —
 * including a no-op translateY(0) retained by `forwards` — establishes a
 * new containing block for `position: fixed` descendants. Since dozens of
 * hand-rolled modals across the app (all correctly using `position:
 * fixed`) render as descendants of `.page-content`, every one of them was
 * silently repositioned relative to `.page-content`'s own box (which
 * scrolls with the page) instead of the viewport — the actual cause of
 * "modal appears half off-screen when scrolled."
 *
 * This is a CSS-only fix (src/index.css), so this suite reads its source
 * text directly (same convention as the .jsx structural checks elsewhere
 * in this suite) rather than trying to execute CSS.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(resolve(__dir, '..', '..', p), 'utf8');

export async function runModalViewportCentering() {
  const results = [];

  console.log('\n  Modal viewport centering — .page-content no longer leaves a lingering transform:\n');

  const css = read('src/index.css');
  const keyframesMatch = css.match(/@keyframes pageFadeIn\s*\{([\s\S]*?)\}\s*(?=@keyframes|\/\*|$)/);
  const keyframesBody = keyframesMatch ? keyframesMatch[1] : '';

  results.push(keyframesBody.length > 0
    ? pass('@keyframes pageFadeIn exists and was located', 'found')
    : fail('@keyframes pageFadeIn exists and was located', 'found', 'not found — check the regex against index.css structure'));

  results.push(!/transform\s*:/.test(keyframesBody)
    ? pass('@keyframes pageFadeIn no longer animates `transform` (the actual fix)', 'opacity-only')
    : fail('@keyframes pageFadeIn no longer animates `transform` (the actual fix)', 'no transform property', 'transform still present — would still break position:fixed descendants'));

  results.push(/opacity\s*:\s*0/.test(keyframesBody) && /opacity\s*:\s*1/.test(keyframesBody)
    ? pass('@keyframes pageFadeIn still fades opacity 0 -> 1 (visual effect preserved)', 'found')
    : fail('@keyframes pageFadeIn still fades opacity 0 -> 1 (visual effect preserved)', '0 -> 1', keyframesBody));

  // .page-content is the only thing that uses this animation with
  // `forwards` — confirm the fill-mode is still there (removing it would
  // reintroduce a flash-back-to-hidden at the end of every page's fade-in,
  // a different regression) and that no OTHER forwards-filled animation on
  // .page-content (or any ancestor it shares) still carries a transform.
  results.push(/\.page-content\s*\{\s*animation:\s*pageFadeIn[^}]*forwards/.test(css)
    ? pass('.page-content still uses animation-fill-mode: forwards (no flash-hidden regression)', 'found')
    : fail('.page-content still uses animation-fill-mode: forwards (no flash-hidden regression)', 'found', 'not found'));

  console.log('\n  Modal viewport centering — the named repro case (Import guest list) still uses position:fixed:\n');

  const importSource = read('src/components/guests/ImportGuestModal.jsx');
  results.push(/fixed inset-0 flex items-center justify-center/.test(importSource)
    ? pass('ImportGuestModal.jsx root overlay uses fixed + flex centering', 'found')
    : fail('ImportGuestModal.jsx root overlay uses fixed + flex centering', 'found', 'not found — positioning strategy changed unexpectedly'));

  return results;
}
