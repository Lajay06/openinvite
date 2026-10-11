/**
 * tests/persistence/mobile-no-website-word.mjs
 *
 * "WEBSITE" NEVER APPEARS IN ANYTHING A COUPLE READS IN THE APP.
 *
 * Mobile parity 7 of goals/2026-10-10-mobile-pass.md, under the advisor's
 * ruling of 2026-10-11: the guest-facing product is the Guest Suite,
 * described as the guest experience, and the word "website" never reaches a
 * couple in the app. "Website builder" and "The website builder" became
 * "Guest Suite". The other cases the ruling reaches, and what they became:
 *
 *   the web app ("Upgrade on the website")       -> "at openinvite.com.au"
 *   a vendor's, hotel's or place's own link      -> "Web address", "Visit"
 *   an Ava starter copied from the web           -> "for the Guest Suite"
 *
 * BY ELIMINATION. Every source file under src/mobile is read, and every
 * string literal, template literal and JSX text in it that contains the word
 * is a failure unless it cannot be read by a couple. What a couple cannot read
 * is decided by shape, not by a list of files:
 *
 *   - code, not text: identifiers and keys are never strings, and a string
 *     with no space that starts lower case is a key, a field name or a path
 *     ('website', 'websiteEnabled', '/studio/website');
 *   - an import specifier;
 *   - text only the model reads: the "systemPrompt" values Ava is given.
 *
 * Comments are stripped first, so a comment explaining the ruling cannot
 * satisfy or break it.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const SHELL = 'src/mobile';
const read = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };
const code = (rel) => stripComments(read(rel), { line: true });

function walk(dir) {
  let out = [];
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (/\.(jsx?|tsx?|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

const WORD = /web\s?site/i;
/** A string that is a key, a field name or a path, never prose. */
const isCodeLike = (s) => !/\s/.test(s) && !/^[A-Z]/.test(s);

/** Every couple-readable piece of text in a source file that contains the word. */
export function readableWebsiteText(src) {
  const hits = [];
  const text = String(src ?? '');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (/^\s*import\b/.test(line) || /\bfrom\s+['"]/.test(line)) return;
    if (/"systemPrompt"\s*:/.test(line)) return;
    const pieces = [];
    for (const m of line.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)) pieces.push(m[1] ?? m[2] ?? m[3] ?? '');
    for (const m of line.matchAll(/>([^<>{}]+)</g)) pieces.push(m[1]);
    for (const p of pieces) {
      if (!WORD.test(p)) continue;
      if (isCodeLike(p.trim())) continue;
      hits.push({ line: i + 1, text: p.trim().slice(0, 90) });
    }
  });
  return hits;
}

export async function runMobileNoWebsiteWord() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const files = walk(path.join(ROOT, SHELL));
  ok('the sweep reads the whole shell', files.length > 100, `${files.length} files`);
  const offenders = [];
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    for (const h of readableWebsiteText(code(rel))) offenders.push(`${rel}: "${h.text}"`);
  }
  ok('no text a couple reads in the app says website', offenders.length === 0, offenders.slice(0, 6).join(' | ') || 'none');

  // The sweep is satisfied by deleting the rows, so the two named strings must
  // have BECOME something, and the builder must still be reachable.
  const site = code('src/mobile/screens/site/SiteScreen.jsx');
  ok('the Site screen row is the Guest Suite, and still opens the builder',
     /label="Guest Suite" sub="Best on desktop" onClick=\{\(\) => onOpenDesktop\('\/studio\/website'\)\}/.test(site), 'SiteScreen.jsx');
  const plan = code('src/mobile/screens/plan/PlanContainer.jsx');
  ok('the Plan hub says the Guest Suite needs a bigger screen',
     /body="The Guest Suite and Ava studio need a bigger screen\."/.test(plan), 'PlanContainer.jsx');

  // The shape rules must not be what lets text through. A sentence and a
  // capitalized label are both caught, and a key and a path are both not.
  const probe = [
    readableWebsiteText(`<Row label="Website builder" />`).length,
    readableWebsiteText(`body: 'Upgrade on the website.'`).length,
    readableWebsiteText(`<p>Edit your website</p>`).length,
    readableWebsiteText(`t('website', 'Web address')`).length,
    readableWebsiteText(`onOpenDesktop('/studio/website')`).length,
  ];
  ok('  and the sweep catches labels, sentences and JSX text, not keys or paths',
     probe.join(',') === '1,1,1,0,0', probe.join(','));

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runMobileNoWebsiteWord();
  process.exit(r.every(Boolean) ? 0 : 1);
}
