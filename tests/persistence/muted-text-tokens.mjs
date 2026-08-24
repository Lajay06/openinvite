/**
 * Muted text tokens (feel-pass 3).
 *
 * CLAUDE.md fixes the text ramp by ROLE, not by shade, and says plainly:
 * "Never #888 or gray-400/500". The reason is contrast, not taste -- the
 * blanket rgba(10,10,10,0.4)/0.3 pair this replaced only reached ~2.7:1 and
 * ~2.0:1 (AUDIT_2026-07.md S13/S14), well under the 4.5:1 that informational
 * text has to clear.
 *
 * Tailwind's grey ramp is the drift channel: `text-gray-600` (#4B5563) and
 * `text-gray-700` (#374151) read as "muted" to whoever typed them, but they
 * are a different hue family from the house ink and they bypass the token
 * roles entirely. 65 of them were live across 16 files.
 *
 * Every one was informational text on a light surface -- body copy, form
 * labels, link text -- so all 65 map to the one role that fits: textMuted,
 * rgba(10,10,10,0.6), which clears AA at ~5.25:1.
 *
 * STILL OPEN, deliberately not covered here: 53 `text-gray-900`, 1
 * `text-gray-800` and 6 `hover:text-gray-900`. gray-900 is #111827, a
 * blue-tinted near-black that is not the house #0A0A0A, so it is the same
 * class of drift -- but it is a 60-site change that was not in this item's
 * scope, and it is reported rather than absorbed.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dir, '../../src');

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(jsx?|css)$/.test(e)) out.push(p);
  }
  return out;
}

// ARTWORK IS NOT CHROME. The couple's published website layouts and the
// invitation/asset previews render DESIGNED objects -- a paper RSVP card, a
// per-universe masthead -- where a grey "declines with regrets" line or an
// uppercase section mark is the design, not UI drift. The house text rules
// govern product chrome. This boundary is shared with the uppercase pass and
// is pending an explicit ruling; if that ruling moves the line, this list is
// the single place to change.
const ARTWORK = /^components\/(guest-website|universe-studio|website-builder)\//;

const ALL = walk(SRC).map((p) => [p.replace(SRC + '/', ''), readFileSync(p, 'utf8')]);
const FILES = ALL.filter(([p]) => !ARTWORK.test(p));
const hits = (re) => FILES.flatMap(([p, s]) => [...s.matchAll(re)].map(() => p));

export async function runMutedTextTokens() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Muted text tokens — informational text uses the role, not the grey ramp:\n');

  const g600 = hits(/\btext-gray-600\b/g);
  const g700 = hits(/\btext-gray-700\b/g);
  check('no text-gray-600 remains', g600.length === 0, `${g600.length} found${g600.length ? ': ' + [...new Set(g600)].slice(0,4).join(', ') : ''}`);
  check('no text-gray-700 remains', g700.length === 0, `${g700.length} found${g700.length ? ': ' + [...new Set(g700)].slice(0,4).join(', ') : ''}`);

  // The banned shades CLAUDE.md names explicitly.
  const g45 = hits(/\btext-gray-(400|500)\b/g);
  check('  the explicitly banned gray-400/500 stay absent', g45.length === 0, `${g45.length} found`);
  // Scoped to chrome: the one live #888 is the greyed "declines with regrets"
  // line on a printed RSVP card preview, which is artwork.
  const hex888 = hits(/#888(?![0-9a-fA-F])/g);
  check('  #888 stays absent from product chrome', hex888.length === 0,
    `${hex888.length} found${hex888.length ? ': ' + [...new Set(hex888)].join(', ') : ''}`);

  // The replacement is the token value, not another arbitrary grey.
  const muted = hits(/text-\[rgba\(10,10,10,0\.6\)\]/g);
  check('informational text uses the textMuted token value', muted.length >= 60, `${muted.length} sites`);

  // Guard the roles against being collapsed into one another.
  const tokens = readFileSync(resolve(SRC, 'styles/tokens.js'), 'utf8');
  check('  the four text roles stay distinct in tokens.js',
    /textMuted:\s*'rgba\(10,10,10,0\.6\)'/.test(tokens)
      && /textPlaceholder:\s*'rgba\(10,10,10,0\.58\)'/.test(tokens)
      && /textDisabled:\s*'rgba\(10,10,10,0\.3\)'/.test(tokens)
      && /iconMuted:\s*'rgba\(10,10,10,0\.45\)'/.test(tokens),
    '0.6 / 0.58 / 0.3 / 0.45');

  return results;
}
