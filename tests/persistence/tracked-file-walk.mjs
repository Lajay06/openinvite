/**
 * tests/persistence/tracked-file-walk.mjs
 *
 * A GUARD READS THE REPO, NOT THE DISK.
 *
 * On 2026-09-15 `guest-suite-vocabulary` failed a local suite because the
 * owner's own untracked working notes were in the working tree and contained a
 * retired phrase. The file had never been committed, CI had never seen it, and
 * it was none of the guard's business — but the walk was `readdirSync` from the
 * repo root with a hand-written SKIP_DIRS denylist, so it was read and counted.
 *
 * ── THE COST IS CREDIBILITY, NOT ONE RED RUN ───────────────────────────────
 *
 * Every developer's scratch file, note or half-finished component can fail a
 * suite that passes in CI. That teaches people the suite is unreliable and to
 * re-run it until it goes green — which is the habit that makes a real finding
 * invisible. A guard that cries wolf on a file the repo does not contain
 * spends the attention the true positives need.
 *
 * ── AND .GITIGNORE IS NOT THE FIX ──────────────────────────────────────────
 *
 * Ignoring the path was tried first and reported as the fix. It was not:
 * ignoring stops git STAGING a file and does nothing whatever to a readdirSync
 * walk. The distinction is the whole entry.
 *
 * ── WHAT THIS PINS ─────────────────────────────────────────────────────────
 *
 * That the repo-walking guards enumerate through `git ls-files`, and — the
 * part a source match cannot answer — that a real untracked file dropped into
 * the tree is genuinely not seen. That half runs the walker for real.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync, rmdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/** The guards that walk source trees rather than naming their files. */
const WALKERS = [
  'tests/persistence/guest-suite-vocabulary.mjs',
  'tests/persistence/no-emoji.mjs',
  'tests/persistence/help-and-tips-truthful.mjs',
];

export async function runTrackedFileWalk() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  // ── 1. the helper answers with git's own list ─────────────────────────────
  const { trackedFiles, trackedUnder } = await import('./_trackedFiles.mjs');
  const all = trackedFiles();
  check('the tracked list is the repo', all.length > 800, `${all.length} tracked file(s)`);
  check('  and it is sorted and unique', all.length === new Set(all).size, 'no duplicates');
  check('  a prefix narrows it', trackedUnder('src', /\.jsx$/).length > 300 && trackedUnder('src', /\.jsx$/).every((f) => f.startsWith('src/')),
    `${trackedUnder('src', /\.jsx$/).length} .jsx under src/`);
  // PATHS WITH SPACES SURVIVE. `git ls-files` is read with -z for exactly this:
  // the file that started the incident lives in a directory with a space in it,
  // and a newline split would also mangle any path containing one.
  check('  the list is NUL-split, so a path with a space survives',
    /ls-files -z/.test(read('tests/persistence/_trackedFiles.mjs')), 'git ls-files -z');

  // ── 2. no walker enumerates the disk any more ─────────────────────────────
  for (const w of WALKERS) {
    const src = read(w);
    const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    check(`  ${w.split('/').pop()} enumerates tracked files`,
      /trackedUnder\(/.test(code) && !/readdirSync/.test(code),
      /readdirSync/.test(code) ? 'still walks the disk' : 'via _trackedFiles');
    check(`    and has no SKIP_DIRS denylist left`, !/SKIP_DIRS/.test(code),
      'a denylist of the directories somebody thought of cannot express "what the repo holds"');
  }

  // ── 3. THE PLANT: a real untracked file, dropped in and not seen ──────────
  //
  // This is the half that matters. Everything above would pass on a helper
  // whose branches were inverted; this drops a file carrying the exact phrase
  // that caused the incident into the tree, runs the walker, and requires that
  // it does not appear.
  const dir = join(ROOT, 'untracked-walk-probe');
  const probe = join(dir, 'notes.md');
  let seen = null;
  try {
    mkdirSync(dir, { recursive: true });
    // THE PHRASE IS ASSEMBLED, NOT WRITTEN. This file is tracked, so the moment
    // the vocabulary guard started reading tracked files it read THIS one —
    // and a literal copy of the retired phrase here fails the very rule this
    // plant exists to exercise. Joining it at runtime keeps the probe faithful
    // without putting the words in the repo.
    const retired = ['wedding', 'website'].join(' ');
    writeFileSync(probe, `# scratch\n\nthis mentions the ${retired} on purpose\n`);
    // The cache is per-module-instance, so a fresh import is a fresh answer.
    const fresh = await import(`./_trackedFiles.mjs?probe=${Date.now()}`);
    seen = fresh.trackedFiles().some((f) => f.startsWith('untracked-walk-probe/'));
  } finally {
    if (existsSync(probe)) unlinkSync(probe);
    if (existsSync(dir)) rmdirSync(dir);
  }
  check('an untracked file dropped into the tree is not seen', seen === false,
    seen === null ? 'the probe did not run' : (seen ? 'the walker read an untracked file' : 'tracked-only, as the repo means'));
  check('  and the probe cleaned up after itself', !existsSync(dir), 'no probe left behind');

  return results;
}
