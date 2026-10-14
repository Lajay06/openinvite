/**
 * tests/persistence/professional-exports.mjs
 *
 * Openinvite Professional: CSV for every table. goals/2026-10-14-professional.md,
 * What a professional gets, 14. Every screen that renders a ProTable (or the
 * run sheet's own table) offers a CSV; cells a spreadsheet would run as a
 * formula are written as text.
 *
 * PLANT (R19): a CSV writer without the formula guard is told apart.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pass, fail } from './_shared.mjs';
import { toCsv } from '../../src/components/professional/proExport.js';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const walk = (d, out = []) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p, out); else if (/\.jsx$/.test(e)) out.push(p); } return out; };
// Tables that are not data a planner keeps: the template list (its rows are templates themselves).
const NOT_DATA = new Set(['src/pages/professional/TemplatesPage.jsx']);

export function runProfessionalExports(csv = toCsv) {
  const r = [];
  const check = (name, ok, detail) => r.push(ok ? pass(name, detail) : fail(name, 'see name', detail));
  console.log('\n  Professional, exports:\n');
  const files = [...walk(join(ROOT, 'src/pages/professional')), ...walk(join(ROOT, 'src/components/professional'))];
  const tables = files.filter((f) => /<ProTable\b|<table\b/.test(readFileSync(f, 'utf8'))).map((f) => relative(ROOT, f)).filter((f) => !NOT_DATA.has(f) && !/ProPage\.jsx$/.test(f));
  const noCsv = tables.filter((f) => !/downloadCsv\(|PaymentRows|<Caterer\b/.test(readFileSync(join(ROOT, f), 'utf8')));
  check('professional exports: every table a planner keeps has a CSV', noCsv.length === 0, noCsv.join(', ') || `${tables.length} tables`);
  const out = csv(['A', 'B'], [['=SUM(1)', 'plain, with comma'], ['+1', '@cmd'], ['-2', 'line\nbreak']]);
  check('professional exports: formula-looking cells are written as text, commas and newlines quoted', out.includes(`"'=SUM(1)"`) && out.includes('"plain, with comma"') && out.includes(`"'+1"`) && out.includes(`"'@cmd"`) && out.includes(`"'-2"`) && out.includes('"line\nbreak"'), out.replace(/\r\n/g, ' | '));
  if (csv === toCsv) {
    const naive = (h, rows) => [h, ...rows].map((x) => x.join(',')).join('\r\n');
    check('PLANT: a writer without the formula guard is told apart', !naive(['A'], [['=SUM(1)']]).includes(`'=SUM`), 'planted writes a live formula');
  }
  return r;
}
