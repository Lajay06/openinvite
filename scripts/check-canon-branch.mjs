/**
 * scripts/check-canon-branch.mjs
 *
 * REFUSES a commit touching the canon files on any branch other than main.
 *
 * WHY. Canon has been destroyed twice by the same cause: written on a feature
 * branch, then reset away. Once by `git checkout <sha> -- FILE`, once by a
 * `git reset --hard <sha>` that was stripping an unrelated file. Four rules
 * lost the first time, three the second — and the second happened hours after
 * "canon lands on main, or it is not canon" was itself written down.
 *
 * That rule is a sentence in a document, which is precisely the thing today
 * taught us does not hold. This is the mechanism.
 *
 * It also enforces a workflow we already have: docs-only commits go straight
 * to main, no PR, no branch, nothing to lose.
 *
 * ── PRE-MORTEM: what gets canon onto a branch past this? ──────────────────
 *
 * CAUGHT:
 *   · Any commit touching a listed canon file while HEAD is not main.
 *   · A canon file DELETED or RENAMED on a branch — `--no-renames` again, for
 *     the reason the payments freeze learned the hard way: with rename
 *     detection on, only the NEW path is reported and the canon path never
 *     appears.
 *
 * NOT CAUGHT, stated rather than implied away:
 *   · A NEW canon-like document that is not on the list. The list is literal.
 *     If a fourth standing-rules file is created it must be added here, and
 *     nothing automatically notices that it was not.
 *   · Canon edited on main and later lost there. Main is not protected from
 *     itself; the whole premise is that main is the safe place.
 *   · An edit made through the GitHub UI on a branch — a pre-push hook is
 *     local, which is why this also runs in CI.
 *   · Content moved INTO a non-canon file. Someone writing a rule into
 *     scratchpad/NOTES.md is not touching a listed path.
 *
 * ── THE OVERRIDE ──────────────────────────────────────────────────────────
 * There is one, deliberately awkward, because a hard block with no escape
 * wedges a legitimate reorganisation:
 *
 *   local:  CANON_ON_BRANCH="I am deliberately moving canon" git push
 *   CI:     a `Canon-On-Branch: <why>` trailer on a commit in the range
 */
import { execSync } from 'node:child_process';

const CANON = [
  'scratchpad/STANDING-RULES.md',
  'scratchpad/DECISION-LOG.md',
  'BASE44_PLATFORM_NOTES.md',
];
const PASSPHRASE = 'I am deliberately moving canon';
const CI = process.argv.includes('--ci');
const base = process.argv.slice(2).find(a => !a.startsWith('-')) || 'origin/main';
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();

// COVERAGE REPORTING (2026-08-30). Every exit-0 below used to be silent, so a
// pass carried no information about whether anything was read. It still exits 0
// in exactly the same cases — verdicts are untouched — but now says which one,
// because "clean" and "did not look" must not print the same thing.
/**
 * THE BRANCH UNDER REVIEW, WHICH IS NOT THE CHECKOUT'S HEAD NAME.
 *
 * THIS GUARD HAD NEVER ONCE RUN IN CI. `actions/checkout` produces a DETACHED
 * HEAD, so `git rev-parse --abbrev-ref HEAD` returns the literal string "HEAD",
 * which hit the main-or-HEAD early exit and returned before reading a single
 * file. Every CI run of this guard since it was written checked nothing, and
 * its whole `--ci` mode was unreachable. Found 2026-08-30 by #616, the moment
 * guards began printing their coverage: "on HEAD, where canon belongs — 0
 * file(s) checked".
 *
 * The docstring above this function used to claim the opposite — "a pre-push
 * hook is local, which is why this also runs in CI". That sentence was false
 * from the day it was written. It is true as of this commit.
 *
 * In CI, ask the environment which branch is under review:
 *   GITHUB_HEAD_REF  — the SOURCE branch of a pull request (empty otherwise)
 *   GITHUB_REF_NAME  — the branch for a push event
 *
 * LOCALLY, a detached HEAD still passes, deliberately: the docs worktree
 * (`git worktree add --detach ../openinvite-docs origin/main`) is detached by
 * design and is the sanctioned route for writing canon to main. Refusing it
 * would break the very workflow that exists to stop canon being written on a
 * branch. CI is now the backstop for the case that route cannot cover — which
 * is exactly the division of labour the docstring always claimed.
 */
function resolveBranchUnderReview() {
  if (process.env.GITHUB_HEAD_REF) return process.env.GITHUB_HEAD_REF; // pull request
  if (process.env.GITHUB_REF_NAME) return process.env.GITHUB_REF_NAME; // push
  try { return sh('git rev-parse --abbrev-ref HEAD'); } catch { return null; }
}

const branch = resolveBranchUnderReview();
if (branch === null) {
  // Fallback POLICY (what to do when the input cannot be resolved at all) is
  // the strictness-ladder ticket's question, deliberately not decided here.
  // This prints rather than exiting silently, which is the part that is settled.
  console.log('  canon guard: could not resolve the branch under review — 0 file(s) checked');
  process.exit(0);
}
if (branch === 'main') {
  console.log('  canon guard: on main, where canon belongs — 0 file(s) checked');
  process.exit(0);
}
if (branch === 'HEAD') {
  // Local detached checkout only — in CI the env vars above answer first.
  console.log('  canon guard: local detached HEAD (the docs worktree) — 0 file(s) checked');
  process.exit(0);
}

let changed = [];
let source = `${base}...HEAD`;
try {
  changed = sh(`git diff --no-renames --name-only ${base}...HEAD`).split('\n').map(s => s.trim()).filter(Boolean);
} catch {
  console.log(`  canon guard: diff against ${base} failed — 0 file(s) checked`);
  process.exit(0);
}

const hits = changed.filter(f => CANON.includes(f));
if (!hits.length) {
  console.log(`  no canon files in ${source} (${changed.length} file(s) checked)`);
  process.exit(0);
}

if (CI) {
  let log = '';
  try { log = execSync(`git log ${base}..HEAD --format=%B`, { encoding: 'utf8' }); } catch { /* no range */ }
  if (log.split('\n').map(l => l.trim()).some(l => /^Canon-On-Branch:\s*\S/.test(l))) process.exit(0);
} else if (process.env.CANON_ON_BRANCH === PASSPHRASE) {
  process.exit(0);
}

console.error(`\n  CANON ON A BRANCH — REFUSING.\n`);
console.error(`  branch: ${branch}`);
console.error('  These files belong on main. Canon has been destroyed twice by being');
console.error('  written on a branch and then reset away:');
hits.forEach(f => console.error(`    ${f}`));
console.error('\n  Move it to main, where a docs-only commit needs no branch and no PR:');
console.error('    git checkout main && git pull');
console.error('    # write the rule, then:');
console.error('    git commit -am "docs: ..." && git push\n');
console.error(`  If you are genuinely reorganising these files:`);
console.error(CI ? '    add a `Canon-On-Branch: <why>` trailer to a commit\n'
                 : `    CANON_ON_BRANCH="${PASSPHRASE}" git push\n`);
process.exit(1);
