/**
 * tests/persistence/mobile-demo-currency.mjs
 *
 * THE DEMO COUPLE PAYS IN US DOLLARS. The demo build (npm run mobile:demo,
 * Priya and Tom) is what the App Store screenshots are taken from, and the
 * product sells to the US in USD (CLAUDE.md). The fixture used AUD, so every
 * amount in the screenshots read A$.
 *
 * Every amount the preview prints comes from DEMO_CURRENCY in
 * src/mobile/fixtures/previewApi.js through src/lib/money.js, so the guard
 * pins that constant to USD, checks the demo user carries it, and checks that
 * no source file in src/mobile names AUD or writes A$ for itself (comments
 * stripped). A couple's real currency still comes from their account.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const SHELL = path.join(ROOT, 'src/mobile');
const code = (abs) => stripComments(fs.readFileSync(abs, 'utf8'), { line: true });

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

export async function runMobileDemoCurrency() {
  const results = [];
  const ok = (name, cond, note) => results.push(cond ? pass(name, note) : fail(name, 'true', note));

  const api = code(path.join(SHELL, 'fixtures/previewApi.js'));
  const constant = api.match(/export const DEMO_CURRENCY = '([A-Z]{3})';/)?.[1] || 'missing';
  ok('the demo couple\'s currency is USD', constant === 'USD', constant);
  ok('  and the demo user carries it', /currency: DEMO_CURRENCY,/.test(api), 'previewApi.js user');

  const offenders = walk(SHELL)
    .filter((f) => /['"`]AUD['"`]|A\$/.test(code(f)))
    .map((f) => path.relative(ROOT, f));
  ok('no file in src/mobile names AUD or writes A$', offenders.length === 0, offenders.join(', ') || 'none');

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runMobileDemoCurrency();
  process.exit(r.every(Boolean) ? 0 : 1);
}
