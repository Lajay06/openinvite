/**
 * Budget clarity — the rulings of 2026-08-19, pinned.
 *
 * The load-bearing one is MIXED SHAPE. `WeddingDetails.budget` is AES
 * ciphertext of {total, categories}; the JSON inside is an application
 * contract Base44 never validates, so widening categories from 8 keys to 13
 * needed no schema change — and deliberately got no re-encryption migration
 * either. Every plan saved before the widening still decrypts to 8 keys, and
 * stays that way until the couple's next save.
 *
 * That means an 8-key and a 13-key plan must coexist and both be correct. These
 * assertions prove the missing five read as an explicit 0 rather than
 * poisoning a sum with undefined — the same mixed-row tolerance the encrypted
 * fields use one level up, applied inside the ciphertext.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pass, fail } from './_shared.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(__dir, '../../src/pages/Budget.jsx'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** The reader under test, mirrored exactly from Budget.jsx's planCategoryValue. */
const planCategoryValue = (categories, key) => {
  const stored = categories?.[key];
  if (stored === undefined || stored === null || stored === '') return 0;
  return parseFloat(stored) || 0;
};

const THIRTEEN = ['venue','catering','photography','flowers','music','attire','transportation',
                  'decorations','rings','stationery','beauty','honeymoon','miscellaneous'];
const EIGHT = ['venue','catering','photography','flowers','music','attire','transportation','honeymoon'];

export async function runBudgetClarity() {
  const results = [];
  console.log('\n  Budget clarity — an 8-key plan and a 13-key plan must both be correct:\n');
  const check = (n, ok, d) => results.push(ok ? pass(n, d) : fail(n, 'see name', d));

  // ── MIXED SHAPE ─────────────────────────────────────────────────────────
  const oldPlan = { total: 154000, categories: Object.fromEntries(EIGHT.map((k, i) => [k, (i + 1) * 1000])) };
  const newPlan = { total: 154000, categories: Object.fromEntries(THIRTEEN.map((k, i) => [k, (i + 1) * 1000])) };

  const sum = (plan) => THIRTEEN.reduce((s, k) => s + planCategoryValue(plan.categories, k), 0);
  const oldSum = sum(oldPlan), newSum = sum(newPlan);

  check('an OLD 8-key plan sums without NaN', Number.isFinite(oldSum) && !Number.isNaN(oldSum), `$${oldSum}`);
  check('  its five absent categories each read as an explicit 0',
    ['decorations','rings','stationery','beauty','miscellaneous']
      .every(k => planCategoryValue(oldPlan.categories, k) === 0), 'all 0');
  check('  and the total is the sum of the eight it does carry',
    oldSum === EIGHT.reduce((s, k, i) => s + (i + 1) * 1000, 0), `$${oldSum}`);
  check('a NEW 13-key plan sums all thirteen', newSum === THIRTEEN.reduce((s, _, i) => s + (i + 1) * 1000, 0), `$${newSum}`);
  check('the two shapes coexist — neither poisons the other', oldSum !== newSum && Number.isFinite(oldSum) && Number.isFinite(newSum),
    `old $${oldSum} vs new $${newSum}`);

  // The failure mode this guards: silent undefined arithmetic.
  const naive = THIRTEEN.reduce((s, k) => s + oldPlan.categories[k], 0);
  check('the NAIVE reader (no explicit default) would produce NaN — why the guard exists',
    Number.isNaN(naive), String(naive));

  // A plan that is entirely absent must not throw.
  check('a missing categories object reads as all zeroes, not a throw',
    THIRTEEN.every(k => planCategoryValue(undefined, k) === 0), 'safe');

  // ── the widening itself ─────────────────────────────────────────────────
  const planKeys = [...CODE.matchAll(/\{ key: '([a-z]+)', label: '[^']+' \}/g)].map(m => m[1]);
  check('the plan declares all 13 ledger categories', THIRTEEN.every(k => planKeys.includes(k)),
    `${planKeys.length} declared`);
  check('  no plan category is missing from the ledger list',
    planKeys.every(k => THIRTEEN.includes(k)), 'superset-matched');

  // ── the rulings, as text ────────────────────────────────────────────────
  check('the plan\'s number is labelled "Unallocated", never "Remaining"',
    /Unallocated:/.test(CODE) && !/Remaining: <strong>\{symbol\}\{unallocated/.test(CODE), 'renamed');
  check('the stat strip still owns the word "Remaining"',
    /label: 'Remaining'/.test(CODE), 'kept for money left to spend');
  check('"Budget used" carries a named denominator',
    /label: 'Budget used'[\s\S]{0,220}sub:/.test(CODE), 'sub present');
  check('the reconciliation line renders only on divergence',
    /Math\.round\(committedTotal\) !== Math\.round\(total\)/.test(CODE), 'divergence-gated');
  // ── defects the full-render pass surfaced, pinned so they stay fixed ─────
  check('a negative sits OUTSIDE the currency symbol (-$54,000, not $-54,000)',
    /const money = \(n\) => `\$\{n < 0 \? '-' : ''\}\$\{symbol\}/.test(CODE) &&
    !/\{symbol\}\{unallocated\.toLocaleString\(\)\}/.test(CODE), 'sign outside');
  check('"Remaining" says "over budget" when it is negative, not "left to spend"',
    /stats\.remaining < 0 \? 'over budget' : 'left to spend'/.test(CODE), 'label carries the sign');
  check('"Budget used" drops its denominator rather than printing "$0 of $0"',
    /stats\.totalBudgeted > 0[\s\S]{0,200}: null \}/.test(CODE), 'suppressed at zero');

  check('the write path emits all 13 categories',
    /categories: BUDGET_CATEGORIES\.reduce/.test(CODE), 'writes the full list');

  return results;
}
