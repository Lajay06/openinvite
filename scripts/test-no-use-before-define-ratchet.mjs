/**
 * scripts/test-no-use-before-define-ratchet.mjs
 *
 * The carve-out in eslint.config.js may only ever SHRINK.
 *
 * WHY THIS EXISTS
 * ---------------
 * `no-use-before-define` is `error` across the repo, with 56 files carved out
 * because they violated it on the day the rule was enabled. The rule was enabled
 * after #429 put /Seating into a full-page ErrorBoundary in production: a
 * `useMemo` that runs during render read a `const` declared ~60 lines below it.
 * `no-undef` cannot catch that — the identifier is defined, just not yet
 * initialised — so nothing did, until the page crashed.
 *
 * An exclusions list with no ratchet is a list that grows. In three months it is
 * ninety files and nobody remembers why. This makes the direction one-way:
 *
 *   removing a path  — free, no change here needed
 *   adding a path    — fails, until someone deliberately edits BASELINE below
 *
 * That friction is the feature. A new violation should be fixed, not excused;
 * and if it genuinely must be excused, that should be a visible decision in a
 * diff rather than a quiet line in a config.
 *
 * The 56 will go to zero via an AST codemod (jscodeshift), scheduled as its own
 * work. Do NOT attempt it with a text transformation — see the handoff for why,
 * and the note in eslint.config.js.
 */

import { readFileSync } from 'node:fs';

const results = [];
const check = (label, pass, detail = '') => {
  results.push(pass);
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}${pass || !detail ? '' : `\n        ${detail}`}`);
};

/**
 * The paths carved out when the rule was enabled. This list is the ratchet.
 * It may shrink. It may not grow without editing this array on purpose.
 */
const BASELINE = readFileSync('scripts/no-use-before-define-baseline.txt', 'utf8')
  .split('\n').map(s => s.trim()).filter(Boolean).filter(l => !l.startsWith('#'));

// Parse the live carve-out out of the config rather than trusting a duplicate.
const cfg = readFileSync('eslint.config.js', 'utf8');
const marker = 'no-use-before-define": "off"';
const offIdx = cfg.indexOf(marker);
const blockStart = cfg.lastIndexOf('files: [', offIdx);
const current = offIdx > 0 && blockStart > 0
  ? [...cfg.slice(blockStart, offIdx).matchAll(/"([^"]+\.(?:jsx?|mjs))"/g)].map(m => m[1])
  : [];

check('found the carve-out block in eslint.config.js', current.length > 0, `${current.length} entries`);
check('the rule is enabled somewhere (guard is not vacuous)',
  /"no-use-before-define":\s*\[\s*"error"/.test(cfg));
check('functions: false — hoisting is a language guarantee, not an accident',
  /"functions":\s*false/.test(cfg));

const baseSet = new Set(BASELINE);
const added = current.filter(f => !baseSet.has(f));

check('NO FILE HAS BEEN ADDED to the carve-out', added.length === 0,
  `new exclusion(s) — fix the violation instead, or edit the baseline deliberately:\n        ${added.join('\n        ')}`);
check(`the carve-out has not grown (baseline ${BASELINE.length})`,
  current.length <= BASELINE.length, `now ${current.length}`);

const removed = BASELINE.filter(f => !current.includes(f));
if (removed.length) {
  console.log(`\n  ${removed.length} file(s) fixed since the baseline — trim them from`);
  console.log('  scripts/no-use-before-define-baseline.txt to tighten the ratchet:');
  removed.forEach(f => console.log(`      ${f}`));
}

const passed = results.filter(Boolean).length;
console.log(`\n  ${passed}/${results.length} ${results.every(Boolean) ? 'ALL PASS' : 'FAILURES PRESENT'}  (carve-out: ${current.length})`);
process.exit(results.every(Boolean) ? 0 : 1);
