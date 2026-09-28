/**
 * scripts/test-calm-copy.mjs
 *
 * THE CALM COPY GUARD. Owner ruling, 2026-09-28, at the start of the studio
 * tour goal: "for all user-facing copy and all docs: no em dashes or en dashes.
 * Use a comma, a colon, or a full stop. Add it to the calm-copy guard for new
 * strings."
 *
 * No guard by that name existed. The nearest relatives are no-emoji.mjs and
 * sentence-case-chrome.mjs, which enforce presentation rules over the whole
 * tree, and test-us-english-spelling.mjs, which is diff based. The ruling says
 * "for new strings", which is exactly the spelling guard's mechanic, so this is
 * built on that shape and given the owner's own name for it.
 *
 * WHY DIFF BASED, AND WHY THAT IS THE WHOLE POINT. The rule postdates the code.
 * Thousands of existing lines carry these characters, this file's own ancestors
 * among them, and a whole tree sweep would report a backlog rather than a
 * regression. Every check below reads ADDED lines in the range only, so what it
 * reports is always something this branch introduced.
 *
 * SCOPE: product source, which is where user-facing copy lives, plus every
 * markdown document. Comments in source are OUT of scope, and that is a
 * decision worth stating because the US-English guard made the opposite one.
 * Its reason was that comments become strings: someone lifts a phrase out of a
 * comment into a label and the spelling travels with it. That reason is about
 * WORDS. A dash in a sentence about code is punctuation in prose, and a phrase
 * lifted out of a comment into a label would be caught at the label it becomes.
 * If the owner wants comments in scope, one line below does it.
 *
 * IT READS origin/main...HEAD, SO COMMIT BEFORE YOU RUN IT. The working tree is
 * invisible to it. Fix a flagged line, run it again without committing, and it
 * reports the same line, because the fix is in no commit yet.
 *
 * Usage: node scripts/test-calm-copy.mjs   (after committing)
 * Exits 0 when clean, when nothing in scope changed, or when no diff base
 * exists; 1 when a banned character was introduced.
 */

import { execSync } from 'node:child_process';

// BY CODE POINT, NOT BY LITERAL, AND NOT BY ESCAPE EITHER. A \u escape written
// into this file through a shell heredoc arrived as the character itself, which
// is how the first version of this line ended up holding the two glyphs it
// exists to ban. fromCharCode survives any pipeline.
//
// scripts/ is NOT in this guard's own scope, so a literal here would not have
// been flagged. That is the reason to avoid one rather than a reason to relax:
// a file about a rule should be readable, and copyable, without carrying the
// thing it forbids.
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const BANNED = [
  [EM_DASH, 'em dash'],
  [EN_DASH, 'en dash'],
];

/** Where user-facing copy lives. Same three roots the US-English guard uses. */
const SOURCE_SCOPE = [
  /^src\/pages\//,
  /^src\/components\//,
  /^src\/lib\//,
];

const SOURCE_OUT_OF_SCOPE = [
  // Machine emitted from the Base44 schema mirror: stored enum values, not copy.
  /\.generated\.js$/,
];

/** Every markdown document in the repository, which is what "all docs" means. */
const DOC_SCOPE = [/\.md$/];

const DOC_OUT_OF_SCOPE = [
  /^node_modules\//,
];

/**
 * Comments are out of scope in source. ONE LINE, so the owner can reverse the
 * decision by deleting it rather than by rewriting the walk.
 */
const SKIP_COMMENTS_IN_SOURCE = true;

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
    } catch {
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

const isSource = (f) => SOURCE_SCOPE.some((re) => re.test(f)) && !SOURCE_OUT_OF_SCOPE.some((re) => re.test(f));
const isDoc = (f) => DOC_SCOPE.some((re) => re.test(f)) && !DOC_OUT_OF_SCOPE.some((re) => re.test(f));

function isCommentLine(line) {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('/*') || t.startsWith('*') || t.startsWith('{/*');
}

const base = resolveDiffBase();
if (base === null) {
  console.log('[calm-copy] No diff base available, skipping (nothing to compare against).');
  process.exit(0);
}

const range = process.env.GITHUB_EVENT_NAME === 'push' ? `${base}..HEAD` : `${base}...HEAD`;

let changedFiles;
try {
  changedFiles = git(`diff --name-only ${range}`).split('\n').filter(Boolean);
} catch (err) {
  console.warn(`[calm-copy] Diff against ${base} failed: ${err.message.split('\n')[0]}, skipping.`);
  process.exit(0);
}

const scoped = changedFiles.filter((f) => isSource(f) || isDoc(f));

console.log('\n═══════════════════════════════════════════════════════');
console.log('  Calm copy guard: no em dashes, no en dashes');
console.log('═══════════════════════════════════════════════════════\n');

if (scoped.length === 0) {
  console.log(`  ✓ No copy or docs in ${range} (${changedFiles.length} file(s) changed overall), nothing to check.`);
  console.log('───────────────────────────────────────────────────────\n');
  process.exit(0);
}

const findings = [];
for (const file of scoped) {
  let patch;
  try { patch = git(`diff ${range} -- "${file}"`); } catch { continue; }

  let lineNo = 0;
  for (const raw of patch.split('\n')) {
    // Track the new-file line number from each hunk header.
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
    if (hunk) { lineNo = Number(hunk[1]) - 1; continue; }
    if (raw.startsWith('-')) continue;
    if (!raw.startsWith('+')) { lineNo += 1; continue; }
    if (raw.startsWith('+++')) continue;
    lineNo += 1;

    const line = raw.slice(1);
    if (isSource(file) && SKIP_COMMENTS_IN_SOURCE && isCommentLine(line)) continue;

    for (const [ch, name] of BANNED) {
      if (line.includes(ch)) {
        findings.push({ file, lineNo, name, text: line.trim().slice(0, 100) });
        break;
      }
    }
  }
}

if (findings.length === 0) {
  console.log(`  ✓ ${scoped.length} file(s) of copy or docs in ${range}, no em or en dashes introduced.`);
  console.log('───────────────────────────────────────────────────────\n');
  process.exit(0);
}

console.log(`  ✗ Found ${findings.length} em or en dash(es) in copy or docs added on this branch:\n`);
for (const f of findings) {
  console.log(`      ${f.file}:${f.lineNo}  ${f.name}`);
  console.log(`          ${f.text}`);
}
console.log('\n  Use a comma, a colon, or a full stop (owner ruling, 2026-09-28).');
console.log('  Comments in source are out of scope; copy and docs are not.');
console.log('───────────────────────────────────────────────────────\n');
process.exit(1);
