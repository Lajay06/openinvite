/**
 * tests/persistence/mobile-money.mjs
 *
 * NO DOLLAR SIGN IN THE PHONE APP THAT THE CODE DID NOT EARN.
 *
 * Mobile parity 3 of goals/2026-10-10-mobile-pass.md. The advisor's ruling:
 * money through src/lib/money.js everywhere, no hardcoded $ left in
 * src/mobile, and the guard works BY ELIMINATION, NOT A LIST.
 *
 * So this does not name the files that used to print dollars. It reads every
 * source file under src/mobile, whatever it is called and whenever it was
 * added, and requires every `$` character to be explained by one of three
 * reasons. Anything left over is a failure that names the file and line:
 *
 *   1. `${`, a template interpolation. Code, not a symbol.
 *   2. A regular expression's end anchor: `$` followed by `/`, `)`, `|` or a
 *      backtick (the one RegExp built from a template). An amount is never
 *      written that way.
 *   3. THE ONE NAMED EXEMPTION: the PRICE_TIER_KEYS declaration in
 *      src/mobile/features/vendorFields.js. Those four strings are the values
 *      the desktop VendorForm stores in Vendor.price_range, so they are data
 *      and cannot change without a migration. They are never displayed: the
 *      labels are words. The exemption is the declaration line itself, so a
 *      '$$' anywhere else is still caught.
 *
 * The rest are positive checks, because a sweep is satisfied by deleting the
 * amounts: the shell's own formatter is gone, every amount goes through
 * formatMoney with a currency argument, and the currency comes from the
 * account.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const SHELL = 'src/mobile';
const EXEMPT_FILE = 'src/mobile/features/vendorFields.js';
const EXEMPT_LINE = /^export const PRICE_TIER_KEYS = \['\$', '\$\$', '\$\$\$', '\$\$\$\$'\];$/;

function walk(dir) {
  let out = [];
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (/\.(jsx?|tsx?|mjs|css)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** Every `$` in a source text that none of the three reasons explains, as { line, text }. */
export function unexplainedDollars(src, rel = '') {
  const found = [];
  // Comments go, line count kept, so a reported line number is the real one.
  const text = stripComments(String(src ?? ''), { line: true }).replace(/[^\n]*/g, (l) => l);
  const lines = text.split('\n');
  // stripComments drops whole comment blocks; re-anchor numbers on the original.
  const original = String(src ?? '').split('\n');
  let cursor = 0;
  for (const raw of lines) {
    if (!raw.includes('$')) continue;
    const at = original.findIndex((o, i) => i >= cursor && o === raw);
    const lineNo = at >= 0 ? at + 1 : null;
    if (at >= 0) cursor = at + 1;
    if (rel === EXEMPT_FILE && EXEMPT_LINE.test(raw.trim())) continue;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] !== '$') continue;
      const next = raw[i + 1];
      if (next === '{') continue;
      if (next === '/' || next === ')' || next === '|' || next === '`') continue;
      found.push({ line: lineNo, text: raw.trim().slice(0, 120) });
      break;
    }
  }
  return found;
}

const read = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };
const code = (rel) => stripComments(read(rel), { line: true });

export async function runMobileMoney() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── ELIMINATION ──────────────────────────────────────────────────────────
  const files = walk(path.join(ROOT, SHELL));
  ok('the sweep reads the whole shell', files.length > 100, `${files.length} files under ${SHELL}`);
  const offenders = [];
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    for (const hit of unexplainedDollars(read(rel), rel)) offenders.push(`${rel}:${hit.line} ${hit.text}`);
  }
  ok('no dollar sign in src/mobile that is not code or the stored price tiers',
     offenders.length === 0, offenders.length ? offenders.slice(0, 8).join(' | ') : 'every $ explained');
  ok('  and the one exemption is still the declaration it names',
     read(EXEMPT_FILE).split('\n').some((l) => EXEMPT_LINE.test(l.trim())), 'PRICE_TIER_KEYS in vendorFields.js');

  // ── POSITIVE: ONE FORMATTER, THE ACCOUNT'S CURRENCY ──────────────────────
  const format = code('src/mobile/lib/format.js');
  ok("the shell's own money formatter is gone", !/export function money\b/.test(format), 'lib/format.js');

  const api = code('src/mobile/data/api.js');
  ok('the currency is the account code from CurrencyContext',
     /export function useCurrencyCode\(\)/.test(api) && /const \{ currencyCode \} = useCurrency\(\);/.test(api)
       && /return api\.currency \|\| currencyCode;/.test(api) && !/useSymbol/.test(api), 'useCurrencyCode, no useSymbol');

  let calls = 0;
  const oneArg = [];
  let importsMissing = [];
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    const src = code(rel);
    const n = (src.match(/\bformatMoney\(/g) || []).length;
    if (!n) continue;
    calls += n;
    if (!/import \{[^}]*\bformatMoney\b[^}]*\} from '@\/lib\/money'/.test(src)) importsMissing.push(rel);
    // A call with no second argument formats in the default currency, which is
    // the bug this goal removes by another route.
    for (const m of src.matchAll(/\bformatMoney\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)) {
      if (!/,\s*\S/.test(m[1])) oneArg.push(`${rel}: formatMoney(${m[1].slice(0, 40)})`);
    }
  }
  ok('amounts on the phone go through formatMoney', calls >= 30, `${calls} calls`);
  ok('  each one imported from src/lib/money.js', importsMissing.length === 0, importsMissing.join(', ') || 'all imported');
  ok('  and each one passes a currency', oneArg.length === 0, oneArg.slice(0, 4).join(' | ') || 'two arguments everywhere');

  const useSymbolLeft = files.map((f) => path.relative(ROOT, f)).filter((rel) => /\buseSymbol\b/.test(code(rel)));
  ok('nothing in the shell reads a symbol hook any more', useSymbolLeft.length === 0, useSymbolLeft.join(', ') || 'useSymbol gone');

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runMobileMoney();
  process.exit(r.every(Boolean) ? 0 : 1);
}
