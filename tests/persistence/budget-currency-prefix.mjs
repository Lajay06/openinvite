/**
 * tests/persistence/budget-currency-prefix.mjs
 *
 * AN AMOUNT FIELD ALWAYS SHOWS ITS CURRENCY.
 *
 * Owner, 2026-09-07: the money fields showed no symbol once you started
 * typing. The planner put it in the LABEL ("Total wedding budget ($)") and in
 * the PLACEHOLDER ("$0"); the item form showed "0.00" and no symbol at all.
 * Both of those vanish the moment a couple types — which is exactly when
 * knowing the currency matters.
 *
 * THE SYMBOL COMES FROM THE COUPLE'S CURRENCY, not a hardcoded dollar. A
 * wedding priced in euros should not be labelled in dollars anywhere, and
 * CurrencyContext is the one place that decision lives.
 */
import { pass, fail } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8');

/** Every field that holds money, and the file it lives in. */
const MONEY_FIELDS = [
  ['src/components/budget/BudgetForm.jsx', 'budgeted_amount'],
  ['src/components/budget/BudgetForm.jsx', 'actual_amount'],
  ['src/components/vendors/VendorForm.jsx', 'quoted_price'],
  ['src/components/vendors/VendorForm.jsx', 'starting_price'],
  ['src/components/vendors/VendorForm.jsx', 'deposit_amount'],
  ['src/components/vendors/VendorForm.jsx', 'travel_fee'],
];

/** Numeric fields that are NOT money and must keep their plain input. */
const NOT_MONEY = ['rating', 'reviews_count', 'hours_booked', 'image_count'];

export async function runBudgetCurrencyPrefix() {
  const results = [];
  const check = (name, cond, detail) => results.push(cond ? pass(name, detail) : fail(name, 'see name', detail));

  console.log('\n  Every amount field carries its currency:\n');

  const comp = code('src/components/shared/AmountInput.jsx');

  // ── THE COMPONENT ───────────────────────────────────────────────────────
  check('PLANT: the symbol is rendered as a fixed prefix, not as text in the input',
    />\s*\{symbol\}\s*<\/span>/.test(comp) && !/value=\{`\$\{symbol\}/.test(comp),
    'a value the user can delete is not a currency indicator');
  check('  it comes from the couple’s currency, not a hardcoded dollar',
    /useCurrency\(\)/.test(comp) && !/'\$'/.test(comp.replace(/\/\*[\s\S]*?\*\//g, '')),
    'CurrencyContext owns the symbol');
  check('  and the field is still a number, so nothing parses between key and record',
    /type="number"/.test(comp), 'no string coercion introduced');
  check('  the unit reaches a screen reader through the input, not the prefix',
    /aria-hidden="true"/.test(comp) && /aria-label=\{ariaLabel \? `\$\{ariaLabel\} in \$\{symbol\}`/.test(comp),
    '"Budgeted amount in $", once, not "dollar" before every digit');

  // ── EVERY FIELD USES IT ─────────────────────────────────────────────────
  for (const [file, field] of MONEY_FIELDS) {
    const s = code(file);
    check(`PLANT: ${field} uses AmountInput`,
      new RegExp(`<AmountInput[\\s\\S]{0,200}id="${field}"`).test(s)
        || new RegExp(`id="${field}"[\\s\\S]{0,200}ariaLabel`).test(s),
      file.split('/').pop());
    check(`  and no bare number input is left on ${field}`,
      !new RegExp(`<Input\\s+id="${field}"\\s+type="number"`).test(s), 'one control');
  }

  // ── THE PLANNER ─────────────────────────────────────────────────────────
  {
    const b = code('src/pages/Budget.jsx');
    check('PLANT: the planner’s total and every category allocation carry the prefix',
      /<AmountInput\s+ariaLabel="Total wedding budget"/.test(b) && /<AmountInput\s+ariaLabel=\{cat\.label\}/.test(b),
      'nine fields, one component');
    check('  and the symbol is out of the label, where it disappeared behind typing',
      !/Total wedding budget \(\{symbol\}\)/.test(b), 'it is in the field now');
    check('  and out of the placeholder, for the same reason',
      !/placeholder=\{`\$\{symbol\}0`\}/.test(b), 'a placeholder is not a label');
  }

  // ── AND NOTHING THAT IS NOT MONEY GAINED A CURRENCY ─────────────────────
  {
    const v = code('src/components/vendors/VendorForm.jsx');
    const wrong = NOT_MONEY.filter((f) => new RegExp(`<AmountInput[^>]*id="${f}"`).test(v));
    check('PLANT: a rating is not an amount',
      wrong.length === 0, wrong.join(' · ') || 'rating, reviews, hours and image count keep plain inputs');
  }

  return results;
}
