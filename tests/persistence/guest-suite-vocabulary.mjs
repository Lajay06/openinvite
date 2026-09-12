/**
 * tests/persistence/guest-suite-vocabulary.mjs
 *
 * ONE NAME FOR THE THING GUESTS SEE.
 *
 * It was called a "wedding website" in sixty-seven places and a "guest suite"
 * in the sidebar a couple clicks to reach it. Owner ruling: it is the guest
 * suite, everywhere — in the planner, the studio, the guest-facing pages, the
 * emails, the marketing and the prerendered HTML.
 *
 * ── THE FORBIDDEN PHRASE IS THE POINT ───────────────────────────────────────
 *
 * "Never 'guest suite website'." That is not a hypothetical: `Help.jsx` said
 * "Your guest suite website is built from blocks" BEFORE this sweep ran — the
 * two names had already been welded together by someone doing half of this
 * rename by hand. It is the sentence a careless pass produces, so it is
 * checked across the whole repo including prerendered HTML, and it is checked
 * FIRST, because a sweep that introduces it has made things worse.
 *
 * ── THE EXEMPTIONS ARE NAMED, WITH REASONS ──────────────────────────────────
 *
 * A blanket sweep did real damage on its first pass and the exemptions below
 * are what it damaged:
 *
 *   · MARKETING_AUDIT.md quotes a list broker verbatim — "bridal & wedding
 *     websites, wedding surveys…". Rewriting that falsifies a quotation.
 *   · VISUAL_CONTENT_STRATEGY.md quotes a phrase people actually say on
 *     TikTok ("building my wedding website" POV). Renaming it breaks the
 *     reference to a real thing.
 *   · useOrganizationStructuredData.js is SEO. "Wedding website builder" is
 *     what people type into Google; the product's vocabulary does not govern
 *     the words we are found by. This is the one exemption a future ruling is
 *     most likely to revisit, so it is separate from the rest.
 *   · Account.jsx's PLAN_FEATURES is plan copy — a pricing promise, ring-
 *     fenced by the run's own rules, and carrying two errors of its own that
 *     need a ruling rather than a rename.
 *   · help-and-tips-truthful.mjs states the rule, so it has to say both names.
 *     The first sweep rewrote it into `not says "guest suite", not "guest
 *     suite"` — a check asserting the opposite of the rule it was written for.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** file → why it may still say "wedding website". */
const EXEMPT = {
  'MARKETING_AUDIT.md': 'quotes a list broker verbatim',
  'VISUAL_CONTENT_STRATEGY.md': 'quotes a phrase people say on TikTok',
  'claude/homepage-copy.md': 'the owner’s marketing copy, held for the marketing lane',
  'src/hooks/useOrganizationStructuredData.js': 'SEO: the words we are found by',
  'src/pages/Account.jsx': 'plan copy, ring-fenced and awaiting its own ruling',
  'tests/persistence/guest-suite-vocabulary.mjs': 'states the rule',
  'tests/persistence/help-and-tips-truthful.mjs': 'states the rule',
};

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'scratchpad', 'coverage']);
const EXT = /\.(jsx?|mjs|md|html)$/;

function files(dir = '.', out = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    if (SKIP_DIRS.has(name)) continue;
    const rel = dir === '.' ? name : `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) files(rel, out);
    else if (EXT.test(name)) out.push(rel);
  }
  return out;
}

export async function runGuestSuiteVocabulary() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  const all = files();
  // PRESENCE BEFORE PROPERTIES: an empty file list says nothing says anything.
  check('the repo was walked', all.length > 300, `${all.length} files`);

  // ── the phrase the ruling forbids, checked first and everywhere ───────────
  const welded = [];
  for (const f of all) {
    if (f === 'tests/persistence/guest-suite-vocabulary.mjs') continue;
    const s = readFileSync(join(ROOT, f), 'utf8').toLowerCase();
    if (s.includes('guest suite website')) welded.push(f);
  }
  check('nothing says "guest suite website"', welded.length === 0,
    welded.length ? welded.join(', ') : `${all.length} files checked`);

  // ── and the old name is gone, outside the named exemptions ────────────────
  //
  // PRERENDERED HTML IS AN ARTEFACT, so it is not exempt — it is CHECKED
  // AGAINST ITS SOURCE. Every occurrence in prerendered/ has to be the
  // structured-data description, which is exempt where it is authored. An
  // occurrence there that is anything else means a swept string did not reach
  // the build, and "run the prerender" is the fix.
  const SEO = 'A wedding planning app and wedding website builder';
  const stray = [];
  for (const f of all.filter((x) => x.startsWith('prerendered/'))) {
    const s = readFileSync(join(ROOT, f), 'utf8');
    const n = (s.match(/wedding website/gi) || []).length;
    const seo = (s.match(new RegExp(SEO, 'gi')) || []).length;
    if (n !== seo) stray.push(`${f}: ${n} occurrence(s), ${seo} of them the SEO description`);
  }
  check('prerendered HTML says it only where its source does', stray.length === 0,
    stray.length ? stray.slice(0, 4).join('; ') : `${all.filter((x) => x.startsWith('prerendered/')).length} pages, one exempt string each`);

  const stale = [];
  for (const f of all) {
    if (EXEMPT[f] || f.startsWith('prerendered/')) continue;
    const s = readFileSync(join(ROOT, f), 'utf8');
    const n = (s.match(/wedding website/gi) || []).length;
    if (n) stale.push(`${f} (${n})`);
  }
  check('nothing outside the exemptions says "wedding website"', stale.length === 0,
    stale.length ? stale.slice(0, 8).join(', ') : `${all.length - Object.keys(EXEMPT).length} files clean`);

  // ── an exemption that has stopped being needed is drift too ───────────────
  for (const [f, why] of Object.entries(EXEMPT)) {
    if (f.startsWith('tests/persistence/')) continue;      // these state the rule
    let s;
    try { s = readFileSync(join(ROOT, f), 'utf8'); } catch { s = null; }
    check(`  ${f} is still exempt for a reason`, s !== null && /wedding website/i.test(s),
      s === null ? 'the file is gone — drop the exemption' : why);
  }

  // ── the new name is actually in use ───────────────────────────────────────
  // "No wedding website anywhere" is true of a repo that says nothing at all.
  const users = all.filter((f) => f.startsWith('src/') && /guest suite/i.test(readFileSync(join(ROOT, f), 'utf8')));
  check('and the product says "guest suite"', users.length >= 15, `${users.length} files in src/`);

  return results;
}
