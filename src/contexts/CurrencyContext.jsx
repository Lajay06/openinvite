import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

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

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [rates, setRates] = useState({ USD: 1 });

  useEffect(() => {
    base44.auth.me().then(user => {
      if (user?.currency) setCurrencyCode(user.currency);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const CACHE_KEY = 'oi_exchange_rates';
    const TTL = 60 * 60 * 1000;
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && Date.now() - cached.ts < TTL) { setRates(cached.rates); return; }
    } catch {}
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(data => {
        if (data.result === 'success') {
          setRates(data.rates);
          localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: data.rates, ts: Date.now() }));
        }
      })
      .catch(() => {});
  }, []);

  const info = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
  const rate = rates[currencyCode] ?? 1;

  const formatCurrency = useCallback((amountUSD) => {
    const converted = Math.round(amountUSD * rate);
    return `${info.symbol}${converted.toLocaleString()}`;
  }, [rate, info.symbol]);

  const updateCurrency = useCallback(async (code) => {
    setCurrencyCode(code);
    try { await base44.auth.updateMe({ currency: code }); } catch {}
  }, []);

  return (
    <CurrencyContext.Provider value={{ currencyCode, symbol: info.symbol, rate, rates, formatCurrency, updateCurrency, currencies: CURRENCIES }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
