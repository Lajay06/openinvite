/**
 * scripts/test-us-english-spelling.mjs
 *
 * Structural guard, not a reminder. D9 (dashboard round), 2026-08-04: a
 * British/Australian-spelling sweep across the dashboard + universe builder
 * (colour, favourite, organise, personalise, centre, honour, licence,
 * programme, etc.) found ~130 user-facing instances across 40+ files —
 * the same class of drift PR #277's marketing sweep found and fixed on the
 * marketing side. This is that same rule enforced in code for the
 * product surface, so it doesn't quietly reaccumulate.
 *
 * What this checks: diffs the current branch against its merge-base with
 * the PR's base branch (pull_request events) or against the immediately
 * prior commit (push events) — same resolution as
 * scripts/test-prerendered-freshness.mjs. For every ADDED line in a
 * in-scope product source file (src/pages/, src/components/
 * excluding marketing/home/public, src/lib/), flags any of the banned
 * British/Australian spellings below as a whole word.
 *
 * Deliberately conservative, same as the prerender guard: comment-only
 * added lines are skipped (spelling in a code comment isn't user-facing),
 * and a small ALLOWLIST covers known legitimate code identifiers that
 * happen to contain a banned word (BRAND_COLOURS, is_favourite, etc. —
 * renaming those is a much bigger refactor, tracked separately, not what
 * this guard is for). This is coarse, line-based text matching, not real
 * JSX-AST analysis — it will occasionally miss a JSX text-node instance
 * with no surrounding quotes, but it will never silently miss a quoted
 * string or template literal, which is the common case.
 *
 * Usage: node scripts/test-us-english-spelling.mjs
 * Exits 0 if clean (or nothing in-scope changed, or no diff base is
 * available), 1 if a banned spelling was introduced.
 */

import { execSync } from 'node:child_process';

// THE SCOPE, STATED. Three of this file's messages used to say
// "dashboard/universe-builder source", which described a NARROWER scope than
// the patterns below have. On 2026-08-25 that wording led the advisor to
// diagnose a coverage hole in guest-facing copy and the terminal to start
// implementing a fix for it — before a test showed guest-website was in scope
// the whole time. A tool that misdescribes itself produces wrong conclusions
// in everyone who reads it, however carefully they read.
//
// In scope: src/pages, src/components, src/lib — INCLUDING
// src/components/guest-website, which is guest-facing copy and precisely what
// the US-English rule exists for.
const SCOPE_PATTERNS = [
  /^src\/pages\//,
  /^src\/components\//,
  /^src\/lib\//,
];

const OUT_OF_SCOPE_PATTERNS = [
  /^src\/components\/marketing\//,
  /^src\/components\/home\//,
  /^src\/components\/public\//,
  // *.generated.js is machine-emitted from the Base44 schema mirror, so its
  // strings are stored ENUM VALUES ("cancelled" on VendorBooking.status), not
  // copy anyone wrote or a user ever reads. Allowlisting the word instead would
  // blunt the guard against that spelling in real prose everywhere else.
  /\.generated\.js$/,
];

// Exact inflected forms only — deliberately NOT open-ended prefix+wildcard
// (e.g. NOT /organis[a-z]*/), which would false-positive on unrelated words
// that merely share a prefix (e.g. "realistic" is not a spelling variant of
// "realise", but /realis[a-z]*/ would match it).
const BANNED_WORDS = [
  'colour', 'colours', 'coloured',
  'favourite', 'favourites',
  'organise', 'organised', 'organising', 'organises', 'organisation',
  'customise', 'customised', 'customising',
  'personalise', 'personalised', 'personalising', 'personalisation',
  'centre', 'centres', 'centrepiece', 'centrepieces',
  'theatre',
  'travelled', 'travelling',
  'cancelled',
  'fulfil', 'fulfilled',
  'grey',
  'catalogue',
  'programme',
  'licence', 'licences',
  'defence',
  'behaviour',
  'neighbour', 'neighbourhood',
  'honour', 'honours', 'honoured',
  'labour',
  'realise', 'realised', 'realising',
  'recognise', 'recognised',
  'analyse', 'analysed', 'analysing', 'analyses',
  'apologise', 'apologised',
  'initialise', 'initialised',
  'summarise', 'summarised',
  'utilise', 'utilised',
];

const BANNED_RE = new RegExp(`\\b(${BANNED_WORDS.join('|')})\\b`, 'i');

// Known legitimate code identifiers containing a banned word — renaming
// these is a separate, larger refactor (tracked, not silently allowed by
// omission from this list; it's just not what this guard checks).
const ALLOWLIST_SUBSTRINGS = [
  'BRAND_COLOURS', 'DIETARY_COLOURS', 'MUSIC_CAT_COLOURS', 'AVATAR_COLOURS',
  'CATEGORY_COLOURS', 'nameColour', 'is_favourite', 'favouriteVendors',
  'handleToggleFavourite', 'onToggleFavourite', 'FavouriteStar',
  'favourItems', 'setFavourItems', 'maidOfHonour', 'personalisationDetails',
  'data.personalised', 'personalised: v', 'personalised =', "personalised}",
  "status: 'cancelled'", 'cancelled:', 'let cancelled',
  'cancelled = false', 'cancelled = true', "'cancelled'",
  'value="favourites"',
];

function git(cmd) {
  return execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function resolveDiffBase() {
  const eventName = process.env.GITHUB_EVENT_NAME;

  if (eventName === 'pull_request') {
    const baseRef = process.env.GITHUB_BASE_REF;
    if (!baseRef) return null;
    try {
      git(`fetch origin ${baseRef} --depth=100`);
      return `origin/${baseRef}`;
    } catch (err) {
      console.warn(`[us-english] Could not fetch origin/${baseRef}: ${err.message.split('\n')[0]}`);
      return null;
    }
  }

  if (eventName === 'push') {
    const before = process.env.GH_EVENT_BEFORE;
    if (before && !/^0+$/.test(before)) return before;
    return null;
  }

  try {
    git('fetch origin main --depth=100');
    return 'origin/main';
  } catch {
    return null;
  }
}

function inScope(file) {
  if (!SCOPE_PATTERNS.some((re) => re.test(file))) return false;
  if (OUT_OF_SCOPE_PATTERNS.some((re) => re.test(file))) return false;
  return true;
}

function isCommentLine(line) {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('{/*');
}

function isAllowlisted(line) {
  return ALLOWLIST_SUBSTRINGS.some((s) => line.includes(s));
}

const base = resolveDiffBase();
if (base === null) {
  console.log('[us-english] No diff base available — skipping (nothing to compare against).');
  process.exit(0);
}

let changedFiles;
// COVERAGE REPORTING (2026-08-30): the resolved range is kept so the success
// line can state WHAT was compared, not merely how many files came back. A
// count alone still cannot distinguish a clean branch from an empty range.
let resolvedRange = null;
try {
  const range = process.env.GITHUB_EVENT_NAME === 'push' ? `${base}..HEAD` : `${base}...HEAD`;
  resolvedRange = range;
  changedFiles = git(`diff --name-only ${range}`).split('\n').filter(Boolean);
} catch (err) {
  console.warn(`[us-english] Diff against ${base} failed: ${err.message.split('\n')[0]} — skipping.`);
  process.exit(0);
}

const scopedFiles = changedFiles.filter(inScope);

console.log('\n═══════════════════════════════════════════════════════');
console.log('  US-English spelling guard (dashboard + universe builder)');
console.log('═══════════════════════════════════════════════════════\n');

if (scopedFiles.length === 0) {
  console.log(`  ✓ No in-scope product source in ${resolvedRange} (${changedFiles.length} file(s) changed overall) — nothing to check.`);
  console.log('───────────────────────────────────────────────────────\n');
  process.exit(0);
}

const range = process.env.GITHUB_EVENT_NAME === 'push' ? `${base}..HEAD` : `${base}...HEAD`;
const findings = [];

for (const file of scopedFiles) {
  let patch;
  try {
    patch = git(`diff ${range} -- "${file}"`);
  } catch {
    continue;
  }
  const lines = patch.split('\n');
  let lineNo = 0;
  for (const raw of lines) {
    if (raw.startsWith('@@')) {
      const m = /\+(\d+)/.exec(raw);
      lineNo = m ? parseInt(m[1], 10) - 1 : 0;
      continue;
    }
    if (raw.startsWith('+++') || raw.startsWith('---')) continue;
    if (!raw.startsWith('+')) continue;
    lineNo += 1;
    const content = raw.slice(1);
    if (isCommentLine(content)) continue;
    if (isAllowlisted(content)) continue;
    const match = BANNED_RE.exec(content);
    if (match) {
      findings.push({ file, line: lineNo, word: match[0], text: content.trim().slice(0, 140) });
    }
  }
}

if (findings.length === 0) {
  console.log(`  ✓ ${scopedFiles.length} in-scope file(s) in ${resolvedRange} (${changedFiles.length} changed overall), no banned spellings introduced.`);
  console.log('───────────────────────────────────────────────────────\n');
  process.exit(0);
}

console.error(`  ✗ Found ${findings.length} British/Australian spelling(s) in changed product source:\n`);
findings.forEach((f) => console.error(`      ${f.file}:${f.line}  "${f.word}"  →  ${f.text}`));
console.error('');
console.error('  Use US English in user-facing strings (color, favorite, organize,');
console.error('  personalize, center, honor, license, program, ...). If this is a');
console.error('  code identifier or comment the guard mis-flagged, add it to');
console.error('  ALLOWLIST_SUBSTRINGS in scripts/test-us-english-spelling.mjs.\n');
console.log('───────────────────────────────────────────────────────\n');
process.exit(1);
