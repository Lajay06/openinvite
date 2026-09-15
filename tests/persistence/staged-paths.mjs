/**
 * tests/persistence/staged-paths.mjs
 *
 * THE GATE THAT TURNS `git add -A` FROM A NEAR-MISS INTO A REFUSAL.
 *
 * Three times the same command has swept something unintended into a commit:
 * credentials (2026-08-25, despite .gitignore), another branch's files
 * (2026-09-08, which void ed a merge authorization), and the owner's own
 * working folder (2026-09-15, caught one command after the push by someone who
 * had read the rule against it earlier that day).
 *
 * A rule this easy to break needs an instrument. This asserts the instrument
 * exists, is wired in, and — the part that matters — that its logic actually
 * refuses, by running it against inputs rather than reading it.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

export async function runStagedPaths() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  // ── 1. it is installed where git will actually run it ─────────────────────
  const hook = 'githooks/pre-commit';
  check('the pre-commit hook exists', existsSync(join(ROOT, '.githooks/pre-commit')), `.${hook}`);
  const hookSrc = read('.githooks/pre-commit');
  check('  and it calls the checker', /node scripts\/check-staged-paths\.mjs/.test(hookSrc), 'one line, one job');
  // EXECUTABLE OR IT IS DECORATION. A hook without the bit set is silently
  // skipped by git, which is the same as not having one.
  const mode = statSync(join(ROOT, '.githooks/pre-commit')).mode;
  check('  and it is executable', (mode & 0o111) !== 0, `mode ${(mode & 0o777).toString(8)}`);
  check('  and hooks are pointed at .githooks on install',
    /core\.hooksPath \.githooks/.test(read('package.json')), 'package.json prepare');

  // ── 2. the other half is still in place ───────────────────────────────────
  // #760 added these. Asserted here because the two halves only work together:
  // the ignore stops the sweep at its source, and this hook covers the case
  // the ignore cannot — a branch standing on a commit that predates it, which
  // is exactly how the owner's file was taken a third time.
  const ignore = read('.gitignore');
  check('the owner\'s working folder is ignored', /^Claude outputs\/$/m.test(ignore), 'Claude outputs/ — #760');
  check('  and the local tool settings too', /^\.claude\/$/m.test(ignore), '.claude/ — #760');
  check('  and the declaration file never becomes a commit', /^\.stage-paths$/m.test(ignore), '.stage-paths');

  // ── 3. THE LOGIC, RUN RATHER THAN READ ────────────────────────────────────
  //
  // A guard that matched the source would pass on a checker whose branches had
  // been inverted. These call the exported functions with the shapes the hook
  // feeds them.
  const { addedPaths, declaredPaths, undeclared } = await import('../../scripts/check-staged-paths.mjs');

  const declared = declaredPaths({ file: 'src/one.jsx\n# a comment\nscripts/two.mjs\n', env: '' });
  check('a declaration is read from the file', declared.has('src/one.jsx') && declared.has('scripts/two.mjs'),
    `${declared.size} path(s), comments dropped`);
  check('  and from the environment', declaredPaths({ file: '', env: 'a.js,b.js' }).size === 2, 'comma separated');

  const added = addedPaths('src/one.jsx\nClaude outputs/notes.md\n');
  check('added paths are read one per line', added.length === 2, added.join(', '));

  const stray = undeclared(added, declared);
  check('an undeclared new file is refused', stray.length === 1 && stray[0] === 'Claude outputs/notes.md', stray.join(', '));
  check('  while the declared one passes', !stray.includes('src/one.jsx'), 'declared files are not the accident');

  // A directory declaration covers what is under it — a package adding a
  // folder of fixtures should not list every file, but must name the folder.
  const dirDecl = declaredPaths({ file: 'tests/fixtures/\n', env: '' });
  check('a declared directory covers its contents',
    undeclared(addedPaths('tests/fixtures/a.json\ntests/fixtures/b.json\n'), dirDecl).length === 0,
    'naming the folder is still a statement of intent');
  check('  but not a sibling outside it',
    undeclared(addedPaths('tests/other/a.json\n'), dirDecl).length === 1, 'tests/other/a.json still refused');

  // NOTHING STAGED IS NOT A FAILURE. A commit that only edits tracked files
  // must pass, or the gate blocks every ordinary commit in the repo.
  check('a commit that adds nothing is never refused', undeclared(addedPaths(''), declaredPaths({})).length === 0,
    'modifications and deletions are not this gate\'s business');

  return results;
}
