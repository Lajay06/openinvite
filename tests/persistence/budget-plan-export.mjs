/**
 * Budget PLAN export (E2) — Store A.
 *
 * #501 separated two stores that were both called "budget": the couple's typed
 * plan (WeddingDetails.budget, AES ciphertext at rest) and the expenses ledger
 * (the Budget entity). Only the ledger had an export, so a couple who exported
 * "their budget" got the ledger and not the plan they had actually typed.
 *
 * Two hazards this pins:
 *   1. The plan is CIPHERTEXT. It must be read through the decrypting server
 *      path (getMyWeddingDetails -> /api/my-wedding-details). Exporting the raw
 *      column would write a base64 blob into a couple's spreadsheet.
 *   2. A plan saved before the 8 -> 13 category widening has no key for the
 *      newer five. Without an explicit zero those cells export as "NaN".
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(__dir, '../../src/pages/Budget.jsx'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

export async function runBudgetPlanExport() {
  const results = [];
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));
  console.log('\n  Budget plan export — Store A, kept separate from Store B:\n');

  check('a plan export exists', /const exportBudgetPlan = \(\) =>/.test(CODE), 'exportBudgetPlan');
  check('it is a DIFFERENT file from the expenses CSV',
    /wedding-budget-plan\.csv/.test(CODE) && /wedding-expenses\.csv/.test(CODE),
    'wedding-budget-plan.csv vs wedding-expenses.csv');
  // The rename was deliberate and pre-launch. If the old name comes back, the
  // two downloads become indistinguishable again.
  check('  the expenses export is no longer called "budget"',
    !/'wedding-budget\.csv'/.test(CODE), 'wedding-budget.csv gone');
  check('  its headers are distinct from the expenses headers',
    /\['Plan item', 'Planned amount'\]/.test(CODE) && /'Category', 'Item Name'/.test(CODE),
    "Plan item/Planned amount vs Category/Item Name");

  // ciphertext hazard
  check('reads the plan from savedBudget (the decrypted server path)',
    /exportBudgetPlan[\s\S]{0,400}savedBudget/.test(CODE), 'savedBudget');
  check('  savedBudget itself comes from getMyWeddingDetails',
    /getMyWeddingDetails/.test(CODE) && /setSavedBudget\(/.test(CODE), 'decrypting endpoint');
  check('  the raw ciphertext column is never exported',
    !/exportBudgetPlan[\s\S]{0,400}weddingDetails\.budget/.test(CODE), 'no raw column read');

  // mixed-shape hazard
  const fn = CODE.match(/const exportBudgetPlan = \(\) => \{([\s\S]*?)\n  \};/);
  check('absent category keys read as an explicit 0 (no NaN for legacy 8-key plans)',
    !!fn && /=== undefined \|\| stored === null \|\| stored === ''\) return 0/.test(fn[1]), 'explicit zero');
  check('  every one of the 13 categories is emitted, not just stored keys',
    !!fn && /BUDGET_CATEGORIES\.map\(/.test(fn[1]), 'maps the full list');
  check('  the export states Allocated and Unallocated, matching the UI',
    !!fn && /Allocated to categories/.test(fn[1]) && /Unallocated/.test(fn[1]), 'both rows');

  check('the button is disabled when there is no saved plan',
    /disabled=\{!savedBudget\}/.test(CODE), 'guarded');

  return results;
}
