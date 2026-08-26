/**
 * scripts/checkpoint.mjs — pin a SHA before mutating the tree, restore to it.
 *
 * THREE INCIDENTS IN ONE DAY, one shape. `git checkout <sha> -- FILE` took
 * main's implicit current copy and overwrote four canon rules. `git stash pop`
 * took the implicit top of a stack that held another branch's work and put
 * eight conflicted paths on disk, including the frozen payments files.
 * `git reset --hard HEAD~1` took a relative position on a tree whose state had
 * not been pinned and discarded an entire unfinished implementation.
 *
 * THE COMMAND WAS NEVER THE PROBLEM. THE TARGET WAS. Every one aimed at
 * something COMPUTED AT THE MOMENT OF FIRING — the current branch, the top of
 * a stack, one-before-wherever-I-am — rather than at something named in
 * advance.
 *
 *   node scripts/checkpoint.mjs save     # prints and stores the current SHA
 *   node scripts/checkpoint.mjs restore  # hard-resets to THAT SHA, not HEAD~n
 *
 * The rebuild that survived did exactly this by hand. This is that, named.
 *
 * NOTE FOR WHOEVER READS THIS NEXT: the fix that closed a live hole in the
 * payments guard was itself destroyed by the third of those resets, on the
 * branch that did not yet have this helper. That is not irony, it is the
 * ordinary shape of building a safeguard — THE PERSON WHO NEEDS IT MOST IS THE
 * ONE BUILDING IT, AND THEY ARE THE LAST TO GET IT. Use it from the start of
 * any loop that mutates the tree, including the loop that is testing this.
 */
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const FILE = '.git/CHECKPOINT_SHA';
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const cmd = process.argv[2];

if (cmd === 'save') {
  const sha = sh('git rev-parse HEAD');
  writeFileSync(FILE, sha);
  const dirty = sh('git status --porcelain');
  console.log(`  checkpoint ${sha.slice(0, 8)}  ${sh('git log -1 --format=%s')}`);
  if (dirty) {
    console.log('\n  UNCOMMITTED WORK IS PRESENT and a restore will destroy it:');
    dirty.split('\n').slice(0, 8).forEach(l => console.log(`    ${l}`));
    console.log('  Commit it first if it matters — that is the exact mistake this exists for.\n');
  }
  process.exit(0);
}

if (cmd === 'restore') {
  if (!existsSync(FILE)) {
    console.error('  no checkpoint saved. Run `node scripts/checkpoint.mjs save` first.');
    process.exit(1);
  }
  const sha = readFileSync(FILE, 'utf8').trim();
  console.log(`  restoring to ${sha.slice(0, 8)} (absolute, not HEAD~n)`);
  execSync(`git reset --hard ${sha}`, { stdio: 'inherit' });
  process.exit(0);
}

console.error('  usage: node scripts/checkpoint.mjs save|restore');
process.exit(1);
