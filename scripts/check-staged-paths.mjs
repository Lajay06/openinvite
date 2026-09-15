#!/usr/bin/env node
/**
 * scripts/check-staged-paths.mjs — a NEW file reaches a commit only if it was
 * declared.
 *
 * ── WHY THIS EXISTS, THREE TIMES OVER ──────────────────────────────────────
 *
 * 2026-08-25  A session storage-state and a live RSVP token were staged by
 *             `git add -A` and committed, DESPITE both being in .gitignore —
 *             the branch stood on a base whose .gitignore predated the rules.
 *             scripts/check-no-credentials.mjs was written for that, and it
 *             covers credentials only.
 * 2026-09-08  `git add -A` swept two files belonging to another branch into
 *             #724. The authorized file list said five paths, the PR carried
 *             seven, and the merge was refused. DECISION-LOG: "stage by path,
 *             never git add -A, on any branch."
 * 2026-09-15  `git add -A` swept the owner's own untracked working folder into
 *             a feature commit. Caught while reading the numstat, one command
 *             after the push — and then the file was DELETED from disk by the
 *             next branch switch, because a staged path follows the index. It
 *             was recovered from a dangling commit via `git fsck`. The same
 *             file was taken a THIRD time an hour later by `git stash -u`,
 *             which is the same act under a different name.
 *
 * Three times, one command class, and the third happened to someone who had
 * read and cited the rule that forbids it earlier the same day. A rule this
 * easy to break needs an instrument, not another reminder.
 *
 * #760 ignores the owner's paths, which stops the sweep at its source. This is
 * the other half, and both are needed: .gitignore protection is only as old as
 * the commit you stand on, and the branch where the third taking happened
 * proved exactly that.
 *
 * ── WHAT IT CHECKS ─────────────────────────────────────────────────────────
 *
 * Every path the commit ADDS — a file not in HEAD, which is exactly the class
 * `git add -A` picks up by accident — must be named in the declared list.
 * Modifications and deletions are untouched: the accident being prevented is
 * a file arriving unnoticed, not an edit to one already tracked.
 *
 * Declare with either:
 *   .stage-paths   one path per line, # for comments (gitignored)
 *   STAGE_PATHS    env var, comma or newline separated
 *
 * Declaring is one line and is the point: it makes "which new files am I
 * adding" a thing the author states rather than a thing the tool guesses.
 *
 * `--no-verify` skips this, as it skips every hook. That is deliberate and it
 * is why the file-list mark in a merge authorization still exists: this gate
 * is for the honest slip, and the mark is for everything else.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const sh = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

/** Paths the commit ADDS: in the index, absent from HEAD. */
export function addedPaths(diffOutput) {
  return diffOutput.split('\n').map((l) => l.trim()).filter(Boolean);
}

/** The declared list, from either source, normalised. */
export function declaredPaths({ file, env }) {
  const fromFile = (file || '').split('\n');
  const fromEnv = (env || '').split(/[,\n]/);
  return new Set([...fromFile, ...fromEnv]
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#')));
}

/**
 * A declaration may name a directory, because a package that adds a folder of
 * fixtures should not have to list every file in it — but it must name that
 * folder, which is still a statement of intent.
 */
export function undeclared(added, declared) {
  return added.filter((p) => {
    if (declared.has(p)) return false;
    for (const d of declared) {
      if (d.endsWith('/') && p.startsWith(d)) return false;
      if (p.startsWith(`${d}/`)) return false;
    }
    return true;
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let added = [];
  try {
    added = addedPaths(sh('git diff --cached --name-only --diff-filter=A'));
  } catch {
    process.exit(0);   // not a git repo, or no index — not this gate's business
  }
  if (added.length === 0) process.exit(0);

  const declared = declaredPaths({
    file: existsSync('.stage-paths') ? readFileSync('.stage-paths', 'utf8') : '',
    env: process.env.STAGE_PATHS || '',
  });
  const stray = undeclared(added, declared);

  if (stray.length === 0) {
    console.log(`  staged paths: ${added.length} new file(s), all declared`);
    process.exit(0);
  }

  console.error('\n  REFUSING THE COMMIT — new files that were never declared:\n');
  for (const p of stray) console.error(`    ${p}`);
  console.error(`\n  ${added.length} file(s) added, ${stray.length} undeclared.`);
  console.error('\n  This is what `git add -A` does when something else is in the tree.');
  console.error('  Declare them, or stage by path:\n');
  console.error(`    printf '%s\\n' ${stray.map((p) => `'${p}'`).join(' ')} > .stage-paths`);
  console.error(`    STAGE_PATHS='${stray.join(',')}' git commit …\n`);
  process.exit(1);
}
