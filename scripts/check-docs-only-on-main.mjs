/**
 * scripts/check-docs-only-on-main.mjs
 *
 * REFUSES a direct push to main that carries anything other than documentation.
 *
 * ── WHY ────────────────────────────────────────────────────────────────────
 *
 * main takes commits by two routes and only one of them is gated.
 *
 *   through a PR   — CI, the pr:green gate, a body describing the change
 *   straight to main — a docs-only commit, which needs no branch and no PR
 *
 * The second route existed because canon must land on main (see
 * check-canon-branch.mjs, and the two rules it was written after). But it was
 * only ever named for what it carries; nothing checked that it carried it.
 *
 * On 2026-09-05 a `git add -A` staged the whole working tree into a commit
 * titled "docs: D-READ". It pushed six files: the decision-log entry it meant
 * to ship, four scratch probe scripts, and `src/lib/sampleContent/havana.js` —
 * product code onto main with no PR, no review and no gate, under a title that
 * said documentation.
 *
 * A CHANNEL NAMED FOR WHAT IT CARRIES MUST REFUSE WHAT IT DOES NOT.
 *
 * This is the second half of a pair. `ship.sh` (R24) stops the working tree
 * being staged in the first place; this stops the result reaching main if it
 * is. Either alone leaves the other end of the hole open: R24 does not govern
 * a hand-written `git add` and `git commit -am`, and this does not govern what
 * goes onto a branch.
 *
 * ── WHAT COUNTS AS DOCUMENTATION ───────────────────────────────────────────
 *
 * Deliberately narrow, and by PATH rather than by intent. `.md` anywhere, plus
 * the scratchpad — which holds one `.html` mockup, so it is listed as a
 * directory rather than assumed to be markdown.
 *
 * A file type that is genuinely documentation and is not here should be added
 * here, in a commit that says why. That is a smaller cost than the alternative,
 * which is a rule broad enough to let `havana.js` through again.
 *
 * ── PRE-MORTEM ─────────────────────────────────────────────────────────────
 *
 * CAUGHT:
 *   · Any non-docs file in the commits a local push would add to main, from a
 *     main checkout or from the detached docs worktree.
 *   · A deleted or renamed non-docs file — `--no-renames`, for the reason the
 *     payments freeze learned: with rename detection on, only the new path is
 *     reported.
 *
 * NOT CAUGHT, stated rather than implied away:
 *   · THIS IS LOCAL-ONLY, AND UNLIKE THE CANON GUARD IT CANNOT SIMPLY ALSO RUN
 *     IN CI. Every squash-merge from a PR lands on main carrying code, exactly
 *     as it should, and CI on a push to main cannot tell that apart from a
 *     hand-pushed commit without reconstructing the merge's provenance. The
 *     canon guard's docstring once claimed a CI backstop it did not have for a
 *     year; this one claims none.
 *   · `--no-verify`, which skips every pre-push gate. That is the same switch
 *     the lint check sits behind, deliberately: see the hook's own note on not
 *     putting a critical guard behind a convenience bypass.
 *   · A commit made through the GitHub UI directly on main.
 *
 * ── THE OVERRIDE ───────────────────────────────────────────────────────────
 * Deliberately awkward, because a legitimate one exists — reverting a bad
 * commit on main, or a hotfix the owner has decided to push by hand:
 *
 *   DOCS_ONLY_ON_MAIN="I am deliberately pushing code to main" git push
 */
import { execSync } from 'node:child_process';

const DOCS_DIRS = ['scratchpad/'];
const PASSPHRASE = 'I am deliberately pushing code to main';
const base = process.argv.slice(2).find((a) => !a.startsWith('-')) || 'origin/main';
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();

const isDocs = (f) => f.endsWith('.md') || DOCS_DIRS.some((d) => f.startsWith(d));

/**
 * Is this push aimed at main?
 *
 * A main checkout, or the detached docs worktree — which is the SANCTIONED
 * route for writing canon to main (`git worktree add --detach`), and therefore
 * exactly the channel this guard exists to police. The canon guard lets
 * detached HEAD through for that reason; this one must not.
 */
function targetsMain() {
  let branch;
  try { branch = sh('git rev-parse --abbrev-ref HEAD'); } catch { return false; }
  if (branch === 'main') return true;
  if (branch !== 'HEAD') return false;                 // a named feature branch
  // Detached: only if it is sitting on main's tip, which is what the docs
  // worktree does. A detached checkout of an old SHA is not pushing to main.
  try { return sh('git rev-parse HEAD') === sh(`git rev-parse ${base}`); } catch { return false; }
}

if (!targetsMain()) {
  console.log('  docs-channel guard: not a push to main — 0 file(s) checked');
  process.exit(0);
}

let changed = [];
try {
  changed = sh(`git diff --no-renames --name-only ${base}..HEAD`)
    .split('\n').map((s) => s.trim()).filter(Boolean);
} catch {
  console.log(`  docs-channel guard: diff against ${base} failed — 0 file(s) checked`);
  process.exit(0);
}

if (changed.length === 0) {
  console.log('  docs-channel guard: nothing new for main — 0 file(s) checked');
  process.exit(0);
}

const offenders = changed.filter((f) => !isDocs(f));
if (offenders.length === 0) {
  console.log(`  docs-channel guard: docs only, straight to main (${changed.length} file(s) checked)`);
  process.exit(0);
}

if (process.env.DOCS_ONLY_ON_MAIN === PASSPHRASE) {
  // An override that engages silently cannot be audited for rarity, and the
  // value of an override is its rarity.
  console.log(`  docs-channel guard: OVERRIDDEN by DOCS_ONLY_ON_MAIN — ${offenders.length} non-docs file(s) allowed onto main`);
  offenders.forEach((f) => console.log(`    ${f}`));
  process.exit(0);
}

console.error('\n  NON-DOCS FILES ON THE DOCS CHANNEL — REFUSING.\n');
console.error('  These are going straight to main, with no PR, no CI and no review:');
offenders.forEach((f) => console.error(`    ${f}`));
console.error('\n  On 2026-09-05 a `git add -A` put src/lib/sampleContent/havana.js on main');
console.error('  under a commit titled "docs: D-READ". A channel named for what it');
console.error('  carries must refuse what it does not.\n');
console.error('  Product code goes through a branch and a PR:');
console.error('    git reset --soft HEAD~1        # keep the work, drop the commit');
console.error('    ./scripts/new-feature.sh <name>');
console.error('    ./scripts/ship.sh "..."\n');
console.error('  If you are genuinely pushing code to main by hand:');
console.error(`    DOCS_ONLY_ON_MAIN="${PASSPHRASE}" git push\n`);
process.exit(1);
