/**
 * A guest page wears the couple's universe, never a font we picked for them.
 *
 * The owner reported "the font combinations seem inconsistent, some pages have
 * the right blend, some are just one font". Two distinct faults produced it,
 * and a guard for either alone would have missed the other:
 *
 *   NO PLUMBING AT ALL — GuestAccommodation.jsx and GuestMusic.jsx hard-coded
 *   Cormorant Garamond + Plus Jakarta Sans. That is LONDON's pairing frozen in
 *   place, which is why london weddings looked right and every other universe
 *   got london's faces. GuestAccommodation had 36 declarations and no
 *   resolveTypography call of any kind.
 *
 *   HALF-AND-HALF — WeddingPollsPage.jsx read typography.headingFont for its
 *   headings and hard-coded the body face in fifteen places, so the blend was
 *   half the couple's and half ours.
 *
 *   And the sneakiest: WeddingWebsiteNav.jsx hard-coded one line — but the nav
 *   is on EVERY page, so even correct pages carried a wrong one.
 *
 * THE GUARD IS THE DELIVERABLE, not the four fixes. GuestAccommodation was NEW
 * when it shipped with no plumbing, so the next new guest page can do exactly
 * the same and nobody would notice. A font literal in a guest-facing file is a
 * failure unless it is on the allowlist below with a stated reason.
 *
 * `typography.headingFont || "'Plus Jakarta Sans', sans-serif"` is NOT a
 * violation and does not need listing — the literal is a fallback after a real
 * read, and the pattern below only matches a literal directly after
 * `fontFamily:`. Generic CSS keywords are always fine.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '../../');

/** Matches a literal used directly as the value, in either nesting form. */
const LITERAL_RE = /fontFamily:\s*(['"`])((?:(?!\1).)*)\1/g;

/** Always acceptable — these name no typeface. */
const GENERIC = new Set(['inherit', 'monospace', 'monospace, monospace', 'initial', 'unset', 'revert']);

/**
 * Explicit exemptions. Each needs a reason, and the reason has to survive
 * being read aloud. Anything not listed here is a failure.
 */
const ALLOWLIST = [
];

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.jsx?$/.test(e)) out.push(p);
  }
  return out;
}

/** Guest-facing by SURFACE, not by folder — the rule CLAUDE.md insists on. */
function guestFacingFiles() {
  const all = [
    ...walk(resolve(ROOT, 'src/components/guest-website')),
    ...walk(resolve(ROOT, 'src/pages')).filter((p) =>
      /\/GuestMusic\.jsx$/.test(p)),
  ];
  return all.map((p) => relative(ROOT, p)).sort();
}

const strip = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function literalsIn(rel) {
  const src = strip(readFileSync(resolve(ROOT, rel), 'utf8'));
  const out = [];
  for (const m of src.matchAll(LITERAL_RE)) {
    const v = m[2].trim();
    if (!GENERIC.has(v)) out.push(v);
  }
  return out;
}

export async function runGuestTypographyParity() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Guest typography — the couple\'s faces, not ours:\n');

  const files = guestFacingFiles();
  check('the sweep actually found guest-facing files', files.length > 20, `${files.length} scanned`);

  const allowed = new Map(ALLOWLIST.map((a) => [`${a.file}::${a.literal}`, a]));
  const offenders = [];
  for (const rel of files) {
    for (const lit of literalsIn(rel)) {
      if (!allowed.has(`${rel}::${lit}`)) offenders.push(`${rel}: ${lit}`);
    }
  }
  check('no guest-facing file hard-codes a typeface',
    offenders.length === 0,
    offenders.join(' | ') || `clean across ${files.length} files`);

  // An allowlist that drifts out of date is worse than none: it would silently
  // permit a literal that is no longer there, hiding the next one behind it.
  const stale = ALLOWLIST.filter((a) => !literalsIn(a.file).includes(a.literal));
  check('  every allowlist entry still describes something real',
    stale.length === 0,
    stale.map((a) => a.file).join(', ') || `${ALLOWLIST.length} entr${ALLOWLIST.length === 1 ? 'y' : 'ies'}, all live`);

  check('  and every entry states a reason',
    ALLOWLIST.every((a) => a.reason && a.reason.length > 30), `${ALLOWLIST.length} reasoned`);

  // CONTROL: the detector must see BOTH nesting forms used in this codebase,
  // or the sweep above passes for a scan that matched almost nothing. The
  // first version of this check used [^'"]+ and could not see the second form,
  // which is the form most of the offenders were written in.
  const sample = `a fontFamily: 'Jost, sans-serif' b fontFamily: "'Plus Jakarta Sans', sans-serif" c`;
  const seen = [...sample.matchAll(LITERAL_RE)].map((m) => m[2]);
  check('  control: both quoting forms are detected', seen.length === 2,
    JSON.stringify(seen));

  // A fallback after a real read must NOT be flagged, or the guard punishes
  // defensive code and gets weakened to shut it up.
  const fallback = `fontFamily: typography.headingFont || "'Plus Jakarta Sans', sans-serif"`;
  check('  control: a || fallback after a typography read is not flagged',
    [...fallback.matchAll(LITERAL_RE)].length === 0, 'defensive code is fine');

  // ── DECLARING A FACE IS NOT LOADING IT ─────────────────────────────────
  // #547 wired typography into two STANDALONE guest routes — pages outside
  // MultiPageWeddingWebsite's tree — and did not add the font-loading effect
  // those pages need. The inline styles correctly asked for the universe's
  // faces, the faces were never fetched, and the browser fell back to the
  // inherited Plus Jakarta Sans on every element.
  //
  // It presents EXACTLY like a broken resolver, which is why it cost a whole
  // investigation: measured on production, /stay registered
  // [Plus Jakarta Sans, Cormorant Garamond, Jost] and /accommodation
  // registered [Plus Jakarta Sans] alone, while both had correct inline
  // font-family declarations.
  // GuestAccommodation.jsx was retired in Wave 2 — the duplicate accommodation
  // page. Its URL redirects to /w/:slug/stay, which lives inside the guest
  // shell and takes its faces from the shell, so it is not a standalone surface
  // and has nothing to check here.
  const STANDALONE = ['src/pages/GuestMusic.jsx', 'src/components/rsvp/RSVPPage.jsx'];
  for (const rel of STANDALONE) {
    const src = strip(readFileSync(resolve(ROOT, rel), 'utf8'));
    const consumes = /resolveTypography\(/.test(src);
    const loads = /loadFontFamilies\(familiesFromGoogleSpec\(/.test(src);
    check(`${rel.split('/').pop()}: a standalone route loads the faces it declares`,
      !consumes || loads,
      loads ? 'loadFontFamilies present' : 'DECLARES BUT NEVER LOADS');
  }

  // CONTROL: the detector must be able to see a page that consumes without
  // loading, or the assertions above pass for a test that matched nothing.
  const consumesOnly = 'const t = resolveTypography(details); return <div style={{fontFamily: t.bodyFont}} />;';
  check('  control: consume-without-load IS detectable',
    /resolveTypography\(/.test(consumesOnly) && !/loadFontFamilies\(familiesFromGoogleSpec\(/.test(consumesOnly),
    'detector works');

  // The nav is the one that makes correct pages look wrong, and it is rendered
  // by two components — the live site and the builder preview. Parity or the
  // couple sees one thing while their guests see another.
  for (const rel of ['src/components/guest-website/MultiPageWeddingWebsite.jsx',
                     'src/components/website-builder/RealWebsitePreview.jsx']) {
    const src = strip(readFileSync(resolve(ROOT, rel), 'utf8'));
    const nav = src.slice(src.indexOf('<WeddingWebsiteNav'));
    check(`${rel.split('/').pop()} passes typography to the nav`,
      /typography=\{typography\}/.test(nav.slice(0, nav.indexOf('/>'))), 'builder/publish parity');
  }

  return results;
}
