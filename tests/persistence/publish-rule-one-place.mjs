/**
 * tests/persistence/publish-rule-one-place.mjs
 *
 * THE PUBLISHED / ADDRESS RESERVED / NOT SET UP RULE LIVES IN ONE FILE.
 *
 * Owner ruling 2026-10-13, extended 2026-10-15. src/lib/publishState.js owns
 * it: a wedding with no slug is NO_ADDRESS, a wedding with a slug and
 * websiteEnabled true is LIVE, anything else is HIDDEN. Nothing else may
 * decide that question by hand.
 *
 * ── WHY THIS KEEPS NEEDING A GUARD ────────────────────────────────────────
 *
 * The rule looks trivial, which is exactly why it gets retyped. Six copies
 * existed when the module was written; the send modal and the send endpoint
 * adopted it in #1034 and #1036, and a seventh was still sitting in
 * src/lib/avaContextFormat.js nine days later, found only because a sweep for
 * something else walked past it.
 *
 * That one mattered more than the UI copies. A wrong label on a screen looks
 * wrong; a wrong line in Ava's context gets spoken to the couple as fact.
 *
 * ── WHAT COUNTS AS A COPY, AND WHAT DOES NOT ──────────────────────────────
 *
 * A copy reads BOTH fields as values in one expression: `w.websiteEnabled &&
 * w.slug`, or a ternary chain on the two. Passing both fields through in a
 * payload is not a copy, and neither is
 * `filter(k => k !== 'slug' && k !== 'websiteEnabled')`, which names them as
 * strings rather than reading them. The check therefore ignores any occurrence
 * that is quoted, which is what separates naming a field from asking it.
 */

import { pass, fail, stripComments } from './_shared.mjs';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(new URL('../../', import.meta.url).pathname);

/** The one file allowed to decide it. */
const OWNER = 'src/lib/publishState.js';

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules') continue;
    const f = join(dir, e);
    if (statSync(f).isDirectory()) walk(f, out);
    else if (/\.(js|jsx)$/.test(e)) out.push(f);
  }
  return out;
}

/** Strips quoted strings so a field NAMED as text is not read as a field USED. */
function withoutStringLiterals(line) {
  return line.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""');
}

/** Lines that decide the rule rather than merely mentioning the fields. */
export function inlinePublishRule(source) {
  const code = stripComments(String(source || ''));
  const out = [];
  for (const raw of code.split('\n')) {
    const line = withoutStringLiterals(raw);
    if (!/websiteEnabled/.test(line) || !/\bslug\b/.test(line)) continue;
    // Both fields read in one decision: a conjunction or a ternary.
    // A REAL TERNARY, NOT OPTIONAL CHAINING. `slug: wedding?.slug` is a payload
    // line and carries a question mark; three of them were flagged before this
    // distinction existed.
    if (!/&&|\?(?!\.)/.test(line)) continue;
    out.push(raw.trim());
  }
  return out;
}

export async function runPublishRuleOnePlace() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  console.log('\n  The publish rule is decided in one file:\n');

  const files = [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'api'))];
  ok('there are source files to scan', files.length > 100, `${files.length} file(s)`);

  const offenders = [];
  for (const f of files) {
    const rel = relative(ROOT, f);
    if (rel === OWNER) continue;
    for (const line of inlinePublishRule(readFileSync(f, 'utf8'))) {
      offenders.push(`${rel}: ${line.slice(0, 80)}`);
    }
  }

  ok('no file outside publishState.js decides published / reserved / not set up',
     offenders.length === 0,
     offenders.length ? offenders.join(' | ') : `${files.length} files scanned`);

  // AND THE OWNER STILL OWNS IT, so the scan is not passing because the rule
  // moved somewhere this check does not look.
  const owner = readFileSync(join(ROOT, OWNER), 'utf8');
  ok('  and publishState.js still decides it',
     /websiteEnabled/.test(owner) && /slug/.test(owner) && /PUBLISH_STATE\.(LIVE|HIDDEN|NO_ADDRESS)/.test(owner),
     'the rule is still there');

  // ── THE CHECK CAN FAIL ───────────────────────────────────────────────────
  //
  // The first case is the exact line this guard was written for, as it stood
  // in src/lib/avaContextFormat.js before 2026-10-15.
  ok('the line this guard was written for is caught',
     inlinePublishRule('const s = wd.websiteEnabled && wd.slug ? "published" : wd.slug ? "reserved" : "none";').length === 1,
     'caught');
  ok('  a conjunction of the two values is caught',
     inlinePublishRule('if (w.websiteEnabled && w.slug) go();').length === 1, 'caught');
  ok('  naming them as strings is NOT a copy',
     inlinePublishRule("const rest = keys.filter(k => k !== 'slug' && k !== 'websiteEnabled');").length === 0,
     'a key filter is not the rule');
  ok('  passing both through a payload is NOT a copy',
     inlinePublishRule('const body = { slug: w?.slug, websiteEnabled: w?.websiteEnabled };').length === 0,
     'a payload is not a decision');
  ok('  and a comment describing the rule is NOT a copy',
     inlinePublishRule('// live is websiteEnabled && slug, see publishState.js').length === 0,
     'prose is not code');

  return results;
}
