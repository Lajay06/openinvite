/**
 * tests/persistence/budget-units.mjs
 *
 * A FIGURE A COUPLE TYPED IS THE FIGURE THEY SEE.
 *
 * Owner decision, 2026-10-09: "They select the currency and everything on
 * their dash is in that currency." Stored as typed, shown as typed, with the
 * account's symbol and thousands separators. No conversion anywhere.
 *
 * ── THE BUG THIS EXISTS TO KEEP OUT ────────────────────────────────────────
 *
 * CurrencyContext's formatCurrency took a parameter named `amountUSD` and
 * returned `Math.round(amountUSD * rate)` against a live exchange rate.
 * Nothing ever converted on the way IN: an amount a couple typed was stored
 * exactly as typed. So a couple on AUD typed 50000, the record held 50000, and
 * the dashboard showed A$76,000. The figure moved when the rate moved.
 *
 * The guard's shape follows from that: the SAME stored number is formatted
 * under several currencies and the digits must not change, only the symbol.
 * A conversion of any kind makes the digits differ and fails every one.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';
import { formatMoney, currencySymbol, CURRENCIES, DEFAULT_CURRENCY } from '../../src/lib/money.js';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (p) => stripComments(read(p));

/** One stored figure, as a couple would have typed it. */
const TYPED = 50000;

export async function runBudgetUnits() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── THE SAME NUMBER, EVERY CURRENCY ─────────────────────────────────────
  //
  // AUD and EUR are the two the goal names. USD is here because it is the one
  // currency where a conversion is invisible (the rate is 1), so a guard that
  // only checked USD would pass on the bug.
  const digitsOf = (s) => s.replace(/[^\d]/g, '');
  const shown = Object.fromEntries(['USD', 'AUD', 'EUR', 'GBP', 'JPY'].map(c => [c, formatMoney(TYPED, c)]));
  const allDigits = [...new Set(Object.values(shown).map(digitsOf))];
  ok('the same stored figure shows the same digits in every currency',
     allDigits.length === 1 && allDigits[0] === '50000',
     Object.entries(shown).map(([c, v]) => `${c} ${v}`).join(', '));

  ok('  and AUD carries its own symbol', shown.AUD === 'A$50,000', shown.AUD);
  ok('  and EUR carries its own symbol', shown.EUR === '€50,000', shown.EUR);
  ok('  and USD is unchanged from before', shown.USD === '$50,000', shown.USD);

  // SEPARATORS, which the figure must keep whatever the symbol is.
  ok('every currency groups in thousands',
     Object.values(shown).every(v => v.includes('50,000')), 'comma grouped');

  // ── NOTHING MULTIPLIES ──────────────────────────────────────────────────
  const ctx = code('src/contexts/CurrencyContext.jsx');
  ok('the currency context multiplies nothing',
     !/\*\s*rate|rate\s*\*/.test(ctx) && !/amountUSD/.test(ctx), 'no rate, no amountUSD');
  ok('  and fetches no exchange rate',
     !/\/api\/rates/.test(ctx) && !/oi_exchange_rates/.test(ctx), 'no rates fetch, no cache');
  ok('  and exposes neither rate nor rates',
     !/\brate,/.test(ctx) && !/\brates,/.test(ctx), 'gone from the provider value');
  // THE ACCOUNT'S CHOICE STILL LOADS. Removing the rates block next door is
  // how this effect nearly went with it; without it every couple sees the
  // default currency whatever they picked.
  ok('  while the account\'s own currency is still read',
     /base44\.auth\.me\(\)/.test(ctx) && /setCurrencyCode\(user\.currency\)/.test(ctx), 'loaded from User.currency');

  const money = code('src/lib/money.js');
  ok('the shared formatter multiplies nothing',
     !/\*\s*rate|exchange|convert/i.test(money), 'formats only');

  // ── NO HARDCODED DOLLAR SIGN IS LEFT ON A DASHBOARD FIGURE ──────────────
  //
  // Checked per file, because a repo-wide ban would catch things that are not
  // currency at all: Google Places price levels ('$'.repeat(level)), the
  // vendor and hotel price BANDS, and the US$49 and US$99 plan prices, which
  // are genuinely billed in USD.
  const DASHBOARD = [
    'src/components/budget/BudgetChart.jsx',
    'src/components/budget/BudgetList.jsx',
    'src/components/budget/BudgetForecasting.jsx',
    'src/components/dashboard/BudgetSummary.jsx',
    'src/components/dashboard/RecentActivity.jsx',
    'src/components/vendors/VendorList.jsx',
  ];
  /**
   * A hardcoded dollar sign, found by elimination rather than by guessing at
   * the shapes it takes.
   *
   * `${` is ambiguous in a .jsx file: inside backticks it is a template
   * interpolation, and in JSX text it is a literal dollar followed by an
   * expression. They are the same two characters and no regex can tell them
   * apart. So every backtick string is removed first, and any `${` left over
   * is necessarily JSX text printing a dollar. `$${` inside a template is
   * checked separately, since that one is unambiguous.
   *
   * THE FIRST VERSION LOOKED FOR `>$among a short list of shapes` and missed a
   * real one: `{symbol}{spent.toLocaleString()} / ${budgeted.toLocaleString()}`
   * in BudgetSummary, where the dollar sits after a space rather than after a
   * tag. A check written as a list of the shapes you thought of only finds
   * the shapes you thought of.
   */
  //
  // AND IT ASKS ABOUT MONEY, not about every `${` left standing. Stripping
  // backtick strings with a regex cannot survive a NESTED template, and
  // VendorList has one holding a contract date: the strip leaves its inner
  // `${` exposed and a bare test flags a date as currency. What this guard
  // actually cares about is a dollar printed before an amount, so the
  // expression has to look like money.
  const MONEYISH = 'toLocaleString|toFixed|amount|price|total|spent|budgeted|remaining|value';
  const withoutTemplates = (s) => s.replace(/`(?:[^`\\]|\\.)*`/g, '``');
  for (const f of DASHBOARD) {
    const src = code(f);
    const name = f.split('/').pop();
    const inTemplate = new RegExp(`\\$\\$\\{[^}]*(?:${MONEYISH})`).test(src);
    const inJsx = new RegExp(`\\$\\{[^}]*(?:${MONEYISH})`).test(withoutTemplates(src));
    const concat = /["']\$["']\s*\+/.test(src);
    const hard = inTemplate || inJsx || concat;
    ok(`${name} prints no hardcoded dollar sign`, !hard,
       hard ? `${inTemplate ? 'in a template ' : ''}${inJsx ? 'in JSX text ' : ''}${concat ? 'concatenated' : ''}`.trim() : 'uses the symbol');
    ok(`  and reads the account's symbol`, /useCurrency\(\)/.test(src) && /\bsymbol\b/.test(src), 'useCurrency');
  }

  // ── AVA QUOTES THE SAME FIGURES ─────────────────────────────────────────
  const ava = code('src/lib/avaContextFormat.js');
  ok('Ava\'s tally uses the account currency',
     /formatMoney\(n, user\?\.currency\)/.test(ava), 'from the User record it already receives');
  ok('  and no longer hardcodes a dollar sign',
     !/\$\$\{Number\(n \|\| 0\)/.test(ava), 'gone');

  // ── THE FALLBACK IS THE OLD BEHAVIOR ────────────────────────────────────
  //
  // An account with no currency set must render exactly what it rendered
  // before this change, or this becomes a visible change for every account
  // that never opened the currency picker.
  ok('no currency set renders as it did before',
     formatMoney(TYPED, undefined) === '$50,000' && formatMoney(TYPED, null) === '$50,000'
     && formatMoney(TYPED, '') === '$50,000', '$50,000');
  ok('  and an unknown code does too', formatMoney(TYPED, 'ZZZ') === '$50,000', 'falls back to $');
  ok('  and the default is USD', DEFAULT_CURRENCY === 'USD', DEFAULT_CURRENCY);

  // ── THE SIGN GOES OUTSIDE THE SYMBOL ────────────────────────────────────
  ok('a negative reads -A$54,000, not A$-54,000',
     formatMoney(-54000, 'AUD') === '-A$54,000', formatMoney(-54000, 'AUD'));

  // ── EVERY CURRENCY THE PICKER OFFERS HAS A SYMBOL ───────────────────────
  const missing = CURRENCIES.filter(c => !c.code || !c.symbol || !c.name);
  ok('every currency in the picker is complete', missing.length === 0,
     missing.length ? missing.map(c => c.code).join(', ') : `${CURRENCIES.length} currencies`);
  ok('  and each resolves to its own symbol',
     CURRENCIES.every(c => currencySymbol(c.code) === c.symbol), 'round trip');

  // ── THE PLAN PRICES AND THE PRICE GLYPHS ARE UNTOUCHED ──────────────────
  //
  // Asserted positively, because the obvious way to "fix the dollar signs" is
  // a sweep, and a sweep takes these with it. US$49 and US$99 are billed in
  // USD by Stripe whatever currency the dashboard shows.
  ok('the plan prices are still US$49 and US$99',
     /US\$49/.test(read('src/pages/Pricing.jsx')) && /US\$99/.test(read('src/pages/Pricing.jsx')), 'unchanged');
  ok('  and the Places price-level glyph survives',
     /'\$'\.repeat/.test(read('src/pages/GuestSuiteAccommodation.jsx')), "'$'.repeat(level)");
  ok('  and the vendor price bands survive',
     /value: "\$"/.test(read('src/components/vendors/VendorForm.jsx')), 'the band labels');

  return results;
}
