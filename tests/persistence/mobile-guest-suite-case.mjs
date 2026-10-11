/**
 * tests/persistence/mobile-guest-suite-case.mjs
 *
 * "GUEST SUITE", WITH CAPITALS, EVERYWHERE THE SHELL NAMES THE PRODUCT.
 *
 * Advisor ruling of 2026-10-12 (goals/2026-10-10-mobile-pass.md, ruling 6):
 * the guest-facing product is the Guest Suite, capitalized, and the shell's
 * lower-case uses were made consistent in one PR. Guarded by elimination:
 * any spelling of the name in src/mobile other than "Guest Suite" turns this
 * red, in copy, comments and docs alike, so a phrase lifted from a comment
 * into a label carries the right case with it.
 *
 * ONE EXEMPTION. src/mobile/features/avaPages.generated.js is generated from
 * the desktop pages' Ava starters and says "Regenerate rather than edit"; its
 * one lower-case use is copied from src/pages/UniverseStudio.jsx, which is
 * lane A's file. It is pinned to that one line, so a second one is caught.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const GENERATED = 'src/mobile/features/avaPages.generated.js';
const GENERATED_LINE = '"What should go on my guest suite?",';
const WRONG = /\b(?!Guest Suite\b)[Gg]uest[ -][Ss]uite\b/g;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel, out);
    else if (/\.(jsx?|tsx?|css|md)$/.test(e.name)) out.push(rel);
  }
  return out;
}

export async function runMobileGuestSuiteCase() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const hits = [];
  let generatedHits = [];
  for (const f of walk('src/mobile')) {
    const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (!WRONG.test(line)) return;
      WRONG.lastIndex = 0;
      if (f === GENERATED) generatedHits.push(line.trim());
      else hits.push(`${f}:${i + 1}`);
    });
  }
  ok('every name of the product in src/mobile is "Guest Suite"', hits.length === 0, hits.slice(0, 6).join(', ') || 'none');
  ok('  the generated Ava file holds only its one copied starter',
     generatedHits.length <= 1 && generatedHits.every((l) => l === GENERATED_LINE), generatedHits.join(' | ') || 'none');
  ok('the tab is named with capitals', /\{ key: 'site', label: 'Guest Suite',/.test(fs.readFileSync(path.join(ROOT, 'src/mobile/shell/TabBar.jsx'), 'utf8')), 'TabBar.jsx');
  ok('the pattern still catches the wrong cases',
     ['guest suite', 'Guest suite', 'guest-suite', 'GUEST SUITE'].every((s) => { WRONG.lastIndex = 0; const r = s.match(WRONG); return s === 'GUEST SUITE' ? !r : !!r; }), 'self-check');

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runMobileGuestSuiteCase();
  process.exit(r.every(Boolean) ? 0 : 1);
}
