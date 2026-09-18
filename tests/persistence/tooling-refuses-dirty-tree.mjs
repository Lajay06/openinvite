/**
 * THE TOOLS THAT MOVE FILES REFUSE TO START AGAINST A DIRTY TREE.
 *
 * Canon: never switch branches with a dirty tree; a plant reverts from a
 * snapshot, never with `git checkout --`. Both rules were written because both
 * were broken, and both were broken BY A TOOL doing it on the session's behalf:
 *
 *   pr:merge      merged a PR, then took the checkout to main with another
 *                 package's uncommitted work in it. The pull aborted and the
 *                 session was left on main holding a branch's edits.
 *   the plants    reverted with `git checkout -- <file>` against uncommitted
 *                 work, twice. That does not undo a plant; it restores the file
 *                 to HEAD and discards everything not committed. The first time
 *                 it took four files including a whole guard, the second time a
 *                 package that had to be rebuilt from memory. Neither errored.
 *
 * A rule a person must remember is a rule that gets forgotten at 2am. These
 * checks hold both tools to the refusal, and hold the plant runner to the two
 * things that make its revert safe: a snapshot taken in-process, and an anchor
 * that must match exactly once.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8');

export async function runToolingRefusesDirtyTree() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));

  console.log('\n  The tools refuse a dirty tree:\n');

  const merge = code('scripts/pr-merge.mjs');
  check('pr:merge asks git whether the tree is clean',
    /git status --porcelain/.test(merge), 'porcelain, which already excludes ignored files');
  check('  and refuses rather than warning',
    /REFUSING[\s\S]{0,900}?process\.exit\(1\)/.test(merge), 'exit 1, before anything moves');
  // PRESENCE BEFORE ORDER. `indexOf` returns -1 when the call is gone, and
  // -1 < anything is true — so this check passed with the refusal DELETED,
  // which is what the plant runner caught the first time it was pointed at
  // this file. The call must exist, and then come first.
  check('  before it reads the PR at all',
    // THE CALL, NOT THE DEFINITION. `refuseIfDirty(` matches
    // `function refuseIfDirty(what)` too, so this passed with the call site
    // deleted — the plant runner caught that on its second outing.
    merge.includes("refuseIfDirty('a merge')")
    && merge.indexOf("refuseIfDirty('a merge')") < merge.indexOf('gh pr view'),
    'the refusal runs first, so nothing has happened yet when it fires');
  check('  and it names what is dirty',
    /for \(const l of dirty\.split/.test(merge), 'the lines are printed, not just a count');

  const plant = code('scripts/plant.mjs');
  check('the plant runner refuses a dirty tree too',
    /git status --porcelain/.test(plant) && /REFUSING[\s\S]{0,800}?process\.exit\(1\)/.test(plant),
    'the same rule, at the tool that edits files in place');
  check('  and restores from its own snapshot, never from git',
    /const before = readFileSync\(file, 'utf8'\)/.test(plant)
    && /finally \{[\s\S]{0,400}?writeFileSync\(file, before\)/.test(plant)
    // THE COMMENT NAMES `git checkout --`, because it explains why this file
    // exists. What must be absent is a CALL, not the words.
    && !/(execSync|spawnSync)\([^)]*checkout/.test(plant),
    'the file it read at the start is the file it writes back');
  check('  and refuses an anchor that is not unique',
    /appears \$\{hits\} time\(s\)/.test(plant) && /hits !== 1/.test(plant),
    'exactly one occurrence, or nothing runs');
  check('  and proves its own edit landed before running anything',
    /readBack !== after[\s\S]{0,120}?did not land/.test(plant),
    'a plant that did not apply reports a green guard');
  check('  and a guard that stays green is a failure, not a pass',
    /process\.exit\(red \? 0 : 1\)/.test(plant), 'exit 1 when the defect went uncaught');

  return results;
}
