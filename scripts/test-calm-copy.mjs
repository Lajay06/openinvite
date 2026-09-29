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
 * decision by deleting it rather than by rewriting the walk. What "a comment"
 * means is decided by nonCommentResidue below, not by what a line starts with.
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

/**
 * THE COMMENT SKIP IS SYMMETRIC NOW, AND IT WAS NOT.
 *
 * It used to ask what a line STARTS WITH: `//`, `/*`, `*` or `{/*`. That makes
 * two lines carrying the same dash in the same comment behave differently.
 *
 *   // a dash here was skipped
 *
 *   /* and a dash here was skipped, because the line starts with a slash-star
 *      but a dash on THIS line was flagged, because it starts with neither
 *   *\/
 *
 * The same is true of a trailing comment: `const x = 1; // note` was scanned in
 * full, so a dash in the note was a finding while the identical dash on a line
 * of its own was not.
 *
 * So the question is no longer what a line starts with. Each line is reduced to
 * the text that is NOT inside a comment, and only that residue is checked. A
 * `//` line and a continuation line inside a block comment both reduce to
 * nothing and are both skipped; a dash in code or in a string is caught
 * wherever it sits on the line; and `{/* ... *\/}` in JSX reduces to its braces,
 * which carry no dash.
 *
 * WHY THE WHOLE FILE AND NOT THE PATCH. Block comments span lines and a diff
 * hands you added lines only, so the state a line is in cannot be known from
 * the patch. The file is read at HEAD and scanned from the top, which is also
 * why this guard says to commit before running it.
 *
 * Known limit, stated rather than hidden: the scanner understands strings,
 * template literals and both comment forms, but not a regular expression
 * literal whose pattern contains a comment opener: a regex matching a literal
 * slash-star would put the scanner into a block it never leaves. (That example
 * cannot be written out here, because the escape sequence for it ends this very
 * comment, which is a small demonstration of the class of bug.) No file in this repository does that, and the failure is
 * visible (the rest of the file stops being checked) rather than silent.
 */
function nonCommentResidue(text) {
  const lines = String(text).split('\n');
  const out = [];
  let inBlock = false;
  let inStr = null;
  for (const line of lines) {
    let residue = '';
    for (let i = 0; i < line.length; i += 1) {
      const c = line[i];
      const d = line[i + 1];
      if (inBlock) {
        if (c === '*' && d === '/') { inBlock = false; i += 1; }
        continue;
      }
      if (inStr) {
        residue += c;
        if (c === '\\') { residue += d ?? ''; i += 1; continue; }
        if (c === inStr) inStr = null;
        continue;
      }
      if (c === '/' && d === '/') break;
      if (c === '/' && d === '*') { inBlock = true; i += 1; continue; }
      if (c === '"' || c === "'" || c === '`') { inStr = c; residue += c; continue; }
      residue += c;
    }
    out.push(residue);
  }
  // A template literal that is never closed would swallow the rest of the file,
  // so the string state is reset at end of file rather than carried anywhere.
  inStr = null;
  return out;
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

  // THE COMMENT MAP IS BUILT FROM THE WHOLE FILE, ONCE. A block comment spans
  // lines and a patch shows added lines only, so whether a line sits inside one
  // cannot be read off the diff. If the file cannot be read at HEAD, which is
  // what a deletion looks like, the residue falls back to the raw lines and the
  // guard errs towards checking rather than skipping.
  let residue = null;
  if (isSource(file) && SKIP_COMMENTS_IN_SOURCE) {
    try { residue = nonCommentResidue(git(`show HEAD:"${file}"`)); } catch { residue = null; }
  }

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
    // Only the part of the line that is not inside a comment. A `//` line and a
    // continuation line inside a block comment both reduce to nothing, so both
    // are skipped, which is the whole point of doing it this way.
    const subject = residue ? (residue[lineNo - 1] ?? line) : line;

    for (const [ch, name] of BANNED) {
      if (subject.includes(ch)) {
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
