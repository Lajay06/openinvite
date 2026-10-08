/**
 * src/lib/money.js
 *
 * ONE CURRENCY, THE ACCOUNT'S, AND NO CONVERSION ANYWHERE.
 *
 * Owner decision, 2026-10-09: "They select the currency and everything on
 * their dash is in that currency." Every money figure a couple types is in
 * the account's currency. It is stored as typed and shown as typed, with
 * thousands separators and that currency's symbol.
 *
 * ── WHAT THIS REPLACES, AND WHY IT WAS WRONG ───────────────────────────────
 *
 * CurrencyContext's formatCurrency took a parameter literally named
 * `amountUSD` and returned `Math.round(amountUSD * rate)` against a live
 * exchange rate fetched from /api/rates. The model was "store USD, display
 * local", and nothing in the product ever converted on the way IN: every
 * amount a couple typed was stored exactly as typed. So a couple on AUD typed
 * 50000, the record held 50000, and the dashboard showed them A$76,000,
 * because it treated their Australian dollars as US dollars and converted.
 * The number moved when the exchange rate moved, which is the clearest
 * symptom that it was never a conversion anyone asked for.
 *
 * Stored numbers do not change and there is no migration. What changes is
 * that the dashboard stops multiplying them.
 *
 * ── WHY THIS IS A PLAIN MODULE AND NOT PART OF THE CONTEXT ─────────────────
 *
 * The published guest site has no logged-in user and no CurrencyProvider, and
 * it shows money on the registry page. It needs the same symbol table and the
 * same formatting from a currency code it is handed, with no React in the way.
 * The context now wraps these functions rather than owning the logic.
 */

/**
 * Every currency the account picker offers. The symbol is what the product
 * prints; the code is what is stored on User.currency.
 */
export const CURRENCIES = [
  { code: 'USD', symbol: '$',    name: 'US Dollar' },
  { code: 'EUR', symbol: '€',    name: 'Euro' },
  { code: 'GBP', symbol: '£',    name: 'British Pound' },
  { code: 'AUD', symbol: 'A$',   name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$',   name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥',    name: 'Japanese Yen' },
  { code: 'NZD', symbol: 'NZ$',  name: 'New Zealand Dollar' },
  { code: 'SGD', symbol: 'S$',   name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'AED',  name: 'UAE Dirham' },
  { code: 'CHF', symbol: 'CHF',  name: 'Swiss Franc' },
  { code: 'ZAR', symbol: 'R',    name: 'South African Rand' },
  { code: 'INR', symbol: '₹',    name: 'Indian Rupee' },
  { code: 'MXN', symbol: 'MX$',  name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$',   name: 'Brazilian Real' },
  { code: 'HKD', symbol: 'HK$',  name: 'Hong Kong Dollar' },
  { code: 'SEK', symbol: 'kr',   name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr',   name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr',   name: 'Danish Krone' },
];

export const DEFAULT_CURRENCY = 'USD';

/**
 * The symbol for a code, falling back to the dollar sign.
 *
 * THE FALLBACK IS THE OLD BEHAVIOR ON PURPOSE. An account with no currency
 * set, and a guest payload that does not carry one, both render exactly what
 * they rendered before this change.
 */
export function currencySymbol(code) {
  const found = CURRENCIES.find(c => c.code === String(code || '').toUpperCase());
  return found ? found.symbol : '$';
}

/** The whole record for a code, or the USD one. */
export function currencyInfo(code) {
  return CURRENCIES.find(c => c.code === String(code || '').toUpperCase()) || CURRENCIES[0];
}

/**
 * A money figure, as typed, with separators and the account's symbol.
 *
 * NO CONVERSION. The amount is already in `code`; this only formats it.
 *
 * A NEGATIVE SIGN GOES OUTSIDE THE SYMBOL: -$54,000, never $-54,000.
 * Over-allocating a budget is exactly when a couple reads a number closely,
 * so it is the worst moment to render money oddly.
 *
 * 'en-US' is pinned rather than left to the runtime, for the same reason the
 * Budget planner pins it: a bare toLocaleString groups by the server's or the
 * browser's locale, so the same figure reads "50,000" on one machine and
 * "50.000" on another while the input beside it, which groups with an
 * explicit comma, disagrees.
 */
export function formatMoney(amount, code) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${currencySymbol(code)}0`;
  const sign = n < 0 ? '-' : '';
  return `${sign}${currencySymbol(code)}${Math.abs(n).toLocaleString('en-US')}`;
}
