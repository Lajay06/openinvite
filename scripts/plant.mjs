/**
 * scripts/plant.mjs — run one plant, and put the file back.
 *
 * R19: a guard that has never seen a failure has never been tested. Plant the
 * defect, watch the guard go red, revert, watch it go green. This runs that
 * cycle so the two ways it keeps going wrong cannot happen again.
 *
 * ── WHY IT REFUSES A DIRTY TREE ────────────────────────────────────────────
 *
 * Twice in Run 5 a plant was reverted with `git checkout -- <file>` against a
 * tree holding uncommitted work, and `git checkout --` does not undo a plant:
 * it restores the file to HEAD, discarding every uncommitted change in it. The
 * first time it took four files, including a whole guard; the second time it
 * took a package that had to be rebuilt from memory. Nothing errored either
 * time — the file simply stopped being listed as modified.
 *
 * So: this refuses to start unless `git status --porcelain` is empty (which
 * already excludes everything .gitignore excludes), and it restores from a
 * snapshot it took itself rather than from git. Two independent reasons the
 * failure cannot repeat.
 *
 * ── WHY IT ASSERTS THE EDIT LANDED ─────────────────────────────────────────
 *
 * A plant whose edit silently did not apply reports a green guard, which reads
 * exactly like a guard that cannot fail. Several plants in Run 5 did this: the
 * anchor had moved, the assertion was written against a string that appears
 * more than once, and the run printed "PLANT DID NOT SHOW RED" for a plant that
 * was never planted. The search string must appear EXACTLY ONCE, and the file
 * must differ afterwards, or nothing runs.
 *
 * Usage:
 *   node scripts/plant.mjs <file> <search> <replace> -- <command…>
 *
 * Exit code 0 means the plant behaved: the command failed while planted (RED)
 * and the file was restored. Exit 1 means the guard stayed green — the thing
 * this exists to catch.
 */
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
if (sep < 0 || sep < 3) {
  console.error('Usage: node scripts/plant.mjs <file> <search> <replace> -- <command…>');
  process.exit(2);
}
const [file, search, replace] = argv.slice(0, 3);
const command = argv.slice(sep + 1);

const dirty = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
if (dirty) {
  console.error('\n  ✗ REFUSING: the working tree is not clean, and a plant edits a file in place.\n');
  for (const l of dirty.split('\n').slice(0, 20)) console.error(`      ${l}`);
  console.error('\n  Commit the package first. A plant reverts to what was committed, so uncommitted');
  console.error('  work in the tree is work the revert would destroy — it has happened twice.\n');
  process.exit(1);
}

const before = readFileSync(file, 'utf8');
const hits = before.split(search).length - 1;
if (hits !== 1) {
  console.error(`\n  ✗ REFUSING: the search string appears ${hits} time(s) in ${file}; a plant needs exactly one.`);
  console.error('    An anchor that matches twice plants somewhere you did not mean, and one that');
  console.error('    matches nothing plants nothing while the guard reports green.\n');
  process.exit(2);
}

const after = before.replace(search, replace);
if (after === before) {
  console.error('\n  ✗ REFUSING: the replacement leaves the file unchanged.\n');
  process.exit(2);
}

console.log(`\n  PLANT  ${file}`);
console.log(`    - ${search.split('\n')[0].trim().slice(0, 72)}`);
console.log(`    + ${replace.split('\n')[0].trim().slice(0, 72)}`);

let red = false;
try {
  writeFileSync(file, after);
  const readBack = readFileSync(file, 'utf8');
  if (readBack !== after) throw new Error('the edit did not land on disk');
  const r = spawnSync(command[0], command.slice(1), { encoding: 'utf8', shell: false });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  red = r.status !== 0;
  const failing = out.split('\n').filter((l) => /FAIL|✗|❌/.test(l)).slice(0, 4);
  console.log(red ? '\n  RED — the guard caught it:' : '\n  GREEN — THE GUARD DID NOT CATCH IT:');
  for (const l of failing) console.log(`      ${l.trim().slice(0, 110)}`);
  if (!red) console.log('      (the command exited 0 with the defect in place)');
} finally {
  // FROM THE SNAPSHOT, NOT FROM GIT. This is the whole point of the file.
  writeFileSync(file, before);
  const restored = readFileSync(file, 'utf8') === before;
  console.log(`  restored ${file}: ${restored ? 'yes' : 'NO — RESTORE FAILED'}`);
  if (!restored) process.exit(3);
}
process.exit(red ? 0 : 1);
