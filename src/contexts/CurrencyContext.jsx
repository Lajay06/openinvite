import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { CURRENCIES, currencyInfo, formatMoney, DEFAULT_CURRENCY } from '@/lib/money';

// THE TABLE AND THE FORMATTER LIVE IN src/lib/money.js NOW, because the
// published guest site shows money on its registry page and has no React
// context to read. Re-exported here so every existing importer of CURRENCIES
// from this file keeps working.
export { CURRENCIES };

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [currencyCode, setCurrencyCode] = useState(DEFAULT_CURRENCY);

  // THE ACCOUNT'S OWN CHOICE, which is the whole point of the feature. This
  // sits beside the rates fetch that was removed with the conversion, and is
  // not part of it: without this the provider would hold DEFAULT_CURRENCY
  // forever and every couple would see dollars whatever they picked.
  useEffect(() => {
    base44.auth.me().then(user => {
      if (user?.currency) setCurrencyCode(user.currency);
    }).catch(() => {});
  }, []);

  const info = currencyInfo(currencyCode);

  // ── NO CONVERSION. IT FORMATS. ──────────────────────────────────────────
  //
  // This took a parameter named amountUSD and multiplied it by a live
  // exchange rate. Nothing ever converted on the way IN: an amount a couple
  // typed was stored exactly as typed. So a couple on AUD typed 50000, the
  // record held 50000, and this showed them A$76,000. The figure moved when
  // the rate moved, which is the clearest sign it was never a conversion
  // anyone asked for. Owner decision 2026-10-09: the amount is already in the
  // account's currency, so it is formatted and not touched.
  //
  // The /api/rates fetch and its localStorage cache went with the rate. That
  // endpoint now has no caller in the app; it is left in place rather than
  // deleted, and flagged, because removing a route is a bigger call than this
  // goal's territory.
  const formatCurrency = useCallback((amount) => formatMoney(amount, currencyCode), [currencyCode]);

  const updateCurrency = useCallback(async (code) => {
    setCurrencyCode(code);
    try { await base44.auth.updateMe({ currency: code }); } catch {}
  }, []);

  return (
    <CurrencyContext.Provider value={{ currencyCode, symbol: info.symbol, formatCurrency, updateCurrency, currencies: CURRENCIES }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
