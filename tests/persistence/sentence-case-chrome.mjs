/**
 * Sentence case in product chrome (feel-pass 6).
 *
 * CLAUDE.md: "Sentence case everywhere -- no ALL CAPS, no Uppercase Every
 * Word" and "No text-transform: uppercase anywhere in CSS or JSX". The
 * codebase had 99 uppercase declarations against that rule, so the rule and
 * the code disagreed and the code was winning.
 *
 * THE RULING that resolved it: the rule governs PRODUCT CHROME. Guest-facing
 * ARTWORK is the couple's chosen design and is permanently exempt --
 * per-universe mastheads, footers and section marks, and the invitation and
 * asset previews. "ACCEPTS WITH PLEASURE" on a printed RSVP card is
 * typography, not drift; converting it would damage the product. CLAUDE.md's
 * wording was amended to say "product chrome" so the two stop disagreeing.
 *
 * WHY THIS PROBE LOOKS FOR TWO SHAPES. The first sweep used a single-line
 * regex (`>TEXT<`) and reported the chrome clean. It was structurally blind to
 * ALL-CAPS text nodes that sit on their own line, and there were twelve --
 * including the five ULTRA badges in the sidebar. It also carried a 5-char
 * floor that hid `BALI`, which would have left one universe name shouting
 * among nine that no longer did. An instrument blind to a shape proves nothing
 * about that shape (the dividerSweep lesson, #503).
 *
 * ACRONYMS are not shouting: FAQ, BYO, OK, RSVP stay as they are.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dir, '../../src');

// THE EXEMPTION IS SURFACE-BASED, NOT DIRECTORY-BASED.
//
// Exempt: anything rendered on the couple's PUBLISHED GUEST SITE as part of
// its designed presentation. The whole guest site is the couple's chosen
// design. Product chrome means the dashboard, the studio, emails and the
// marketing surfaces.
//
// Stating it as a surface rather than a folder is what makes the next
// boundary case answer itself. A directory rule got this wrong once already:
// GuestSuiteRegistry.jsx and GuestSuiteLiveStream.jsx READ guest-facing from
// their filenames, but both use DashboardPageHeader, are reached from the
// dashboard sidebar, and have no guest-site markers at all -- they are studio
// pages the couple uses, so they are chrome. GuestMusic.jsx is the opposite:
// it serves /w/:slug/music, so it is the published site and is exempt.
//
// The test for a new file is "does a GUEST see this as part of the wedding
// site the couple designed?", not "what folder is it in".
const ARTWORK = new RegExp([
  // The published site itself, and the studio previews OF that site.
  '^components/(guest-website|universe-studio|website-builder)/',
  // Pages served on /w/:weddingSlug/* -- the published site, outside those folders.
  '^pages/(GuestMusic|GuestAccommodation|GuestCollect)\\.jsx$',
].join('|'));

// Genuine acronyms and initialisms, plus units. Not sentence-case violations.
const ACRONYMS = new Set(['FAQ', 'BYO', 'OK', 'RSVP', 'AI', 'URL', 'CSV', 'PDF', 'ID', 'US', 'UK', 'AU', 'QR', 'DJ', 'VIP', 'Q', 'A']);

// Nothing is held any more: the surface ruling resolved every boundary case.
// components/rsvp/RSVPPage.jsx stays GUARDED even though a guest sees it,
// because "Invitation not found" is an error state, not designed
// presentation -- a broken link is our failure to report, not the couple's
// typography.
const HELD = new Set();

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(jsx?|css)$/.test(e)) out.push(p);
  }
  return out;
}

const ALL = walk(SRC).map((p) => [p.replace(SRC + '/', ''), readFileSync(p, 'utf8')]);
const CHROME = ALL.filter(([p]) => !ARTWORK.test(p));
const SCOPED = CHROME.filter(([p]) => !HELD.has(p));

const shouty = (t) => {
  const w = t.trim();
  if (w.length < 2) return false;
  if (!/^[A-Z][A-Z0-9 &/-]*$/.test(w)) return false;
  return !w.split(/[\s&/-]+/).every((x) => !x || ACRONYMS.has(x));
};

export async function runSentenceCaseChrome() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Sentence case in product chrome — artwork stays exempt:\n');

  const decls = CHROME.flatMap(([p, s]) =>
    [...s.matchAll(/textTransform:\s*['"]uppercase|text-transform:\s*uppercase/g)].map(() => p));
  check('no uppercase transform in product chrome', decls.length === 0,
    `${decls.length} found${decls.length ? ': ' + [...new Set(decls)].join(', ') : ''}`);

  // Shape 1: >TEXT< on one line.  Shape 2: text alone on its own line.
  const inline = SCOPED.flatMap(([p, s]) =>
    [...s.matchAll(/>\s*([A-Za-z][A-Za-z0-9 &/-]*)\s*</g)].filter((m) => shouty(m[1])).map((m) => `${p}: ${m[1].trim()}`));
  check('no shouting text nodes on one line', inline.length === 0,
    `${inline.length}${inline.length ? ': ' + inline.slice(0, 4).join(', ') : ''}`);

  const block = SCOPED.flatMap(([p, s]) =>
    [...s.matchAll(/>\s*\n\s*([A-Za-z][A-Za-z0-9 &/-]*)\s*\n\s*</g)].filter((m) => shouty(m[1])).map((m) => `${p}: ${m[1].trim()}`));
  check('  no shouting text nodes on their own line', block.length === 0,
    `${block.length}${block.length ? ': ' + block.slice(0, 4).join(', ') : ''}`);

  // The exemption must stay real: artwork keeps its typography.
  const art = ALL.filter(([p]) => ARTWORK.test(p)).flatMap(([p, s]) =>
    [...s.matchAll(/textTransform:\s*['"]uppercase|text-transform:\s*uppercase/g)].map(() => p));
  // 80 is the count at the time of the ruling. A LOOSE threshold here passed
  // while a control stripped an artwork declaration, so it is pinned: the
  // exemption is only real if nothing quietly erodes it.
  check('artwork keeps its uppercase treatment', art.length >= 80, `${art.length} declarations preserved (baseline 80)`);

  // Product names match the sidebar rather than drifting into Title Case.
  const gate = CHROME.find(([p]) => p === 'pages/UniverseStudio.jsx')?.[1] || '';
  const suite = CHROME.find(([p]) => p === 'pages/StudioGuestSuite.jsx')?.[1] || '';
  check('  product names are not Title Cased',
    /Design studio is an Ultra feature/.test(gate) && /Guest suite is an Ultra feature/.test(suite),
    'match the sidebar labels');

  // CLAUDE.md must say what the codebase does.
  // Assert the RULE LINE, not merely that the phrase appears somewhere: the
  // first version passed while a control reverted the rule to "everywhere",
  // because the phrase still occurred further down.
  const claude = readFileSync(resolve(__dir, '../../CLAUDE.md'), 'utf8');
  check('CLAUDE.md scopes the rule to product chrome',
    /^- Sentence case in PRODUCT CHROME/m.test(claude) && !/^- Sentence case everywhere/m.test(claude),
    'rule line amended');
  check('  and states the exemption in SURFACE terms',
    /THE ARTWORK EXEMPTION IS SURFACE-BASED/.test(claude)
      && /PUBLISHED GUEST SITE/.test(claude), 'surface wording, not a folder list');

  return results;
}
