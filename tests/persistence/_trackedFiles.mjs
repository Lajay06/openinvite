/**
 * tests/persistence/_trackedFiles.mjs
 *
 * "THE REPO" MEANS THE TRACKED FILES, NOT WHATEVER IS ON DISK.
 *
 * ── WHY ────────────────────────────────────────────────────────────────────
 *
 * guest-suite-vocabulary walked from the repo root with `readdirSync` and a
 * hand-written SKIP_DIRS set, and counted everything it found. On 2026-09-15
 * that meant it read the OWNER'S OWN untracked working notes — a file nobody
 * had committed, that CI has never seen, and that is none of the guard's
 * business — found a retired phrase in it, and failed the suite.
 *
 * The cost is not one red run. It is that every developer's scratch file, note
 * or half-finished component can fail a suite that passes in CI, which teaches
 * people the suite is unreliable and to be re-run until it goes green. A guard
 * that cries wolf on a file the repo does not contain is worse than one that
 * misses something, because it spends the credibility the real findings need.
 *
 * ── AND SKIP_DIRS COULD NEVER HAVE WORKED ──────────────────────────────────
 *
 * It listed node_modules, .git, dist, coverage, scratchpad — the untracked
 * directories somebody had thought of. It could not list the ones nobody had
 * thought of yet, which is every directory a person will ever create. A
 * denylist of the known cannot express "only what the repo actually holds";
 * `git ls-files` is that sentence, and it is already maintained by the thing
 * that defines the answer.
 *
 * .gitignore is NOT the fix either, and the difference matters: ignoring a
 * path stops git staging it, and does nothing at all to a readdirSync walk.
 * That was tried first and reported as the fix; it was not.
 */
import { execSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

let cache = null;

/**
 * Every file git tracks, repo-relative, sorted.
 *
 * -z and a NUL split, because a path may contain a space — "Claude outputs/"
 * is one, and splitting on newlines would also mangle any path containing one.
 * Cached: the list cannot change during a run, and fourteen guards asking for
 * it is fourteen git processes otherwise.
 */
export function trackedFiles() {
  if (cache) return cache;
  const out = execSync('git ls-files -z', { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  cache = out.split('\0')
    .filter(Boolean)
    // A file can be tracked and absent — a deletion staged but not committed.
    // Reading it would throw; it is also genuinely not there to check.
    .filter((p) => existsSync(join(ROOT, p)) && statSync(join(ROOT, p)).isFile())
    .sort();
  return cache;
}

/**
 * Tracked files under `prefix` whose name matches `ext`.
 *
 * @param {string} prefix  '' for the whole repo, or 'src', 'prerendered', …
 * @param {RegExp} ext     tested against the full path
 */
export function trackedUnder(prefix, ext) {
  const p = prefix ? (prefix.endsWith('/') ? prefix : `${prefix}/`) : '';
  return trackedFiles().filter((f) => f.startsWith(p) && ext.test(f));
}
