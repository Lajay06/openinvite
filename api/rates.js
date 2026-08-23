/**
 * GET /api/rates?base=<ISO-4217>
 *
 * open.er-api.com proxy. Mirrors api/weather.js, which mirrors api/places.js,
 * the shape CLAUDE.md mandates for third-party lookups.
 *
 * WHY (L3, leak batch): CurrencyContext fetched open.er-api.com directly from
 * the browser. CurrencyProvider wraps the ENTIRE Router in src/App.jsx, so this
 * fired on first mount for every visitor on every route -- including guests on
 * /w/ links, who never asked for an account and are the population the guest-
 * scope work was about. Each of those visits disclosed the guest's IP, user
 * agent and Referer to a third party we have no relationship with, to fetch a
 * table of numbers that is identical for everyone. Nothing about the request
 * was per-user, yet it was made per-user from per-user devices.
 *
 * Like the Open-Meteo proxy this hides no credential: er-api's free tier needs
 * no key. It exists solely to stop that disclosure.
 *
 * NOT AN OPEN PROXY. The caller sends a currency CODE, never a URL. The
 * upstream is a hard-coded constant and the base is checked against the same
 * allowlist the UI offers. Forwarding a caller-supplied URL would be an SSRF
 * hole pointed at our own network.
 *
 * Caching stays where it was. CurrencyContext keeps its localStorage cache and
 * 1h TTL; this endpoint changes only who makes the outbound request and returns
 * upstream JSON unchanged, so every caller-side branch keeps working untouched.
 */
import { applyCors, checkRateLimit, getClientIp } from './_lib/security.js';

const UPSTREAM = 'https://open.er-api.com/v6/latest';

// Mirrors CURRENCIES in src/contexts/CurrencyContext.jsx. Duplicated rather
// than imported because that module pulls in the browser Base44 client.
const SUPPORTED = new Set([
  'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'NZD', 'SGD', 'AED',
  'CHF', 'ZAR', 'INR', 'MXN', 'BRL', 'HKD', 'SEK', 'NOK', 'DKK',
]);

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // checkRateLimit returns { limited, remaining } -- NOT a boolean. Treating
  // it as one silently disables the limit, because an object is always truthy.
  const { limited, remaining } = checkRateLimit(getClientIp(req), 'rates', 60);
  res.setHeader('X-RateLimit-Limit', '60');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
  }

  const base = String(req.query?.base || 'USD').toUpperCase();
  if (!SUPPORTED.has(base)) {
    return res.status(400).json({ error: 'Unsupported currency' });
  }

  try {
    const r = await fetch(`${UPSTREAM}/${base}`, { headers: { Accept: 'application/json' } });
    const data = await r.json();
    // Shape passed through unchanged: CurrencyContext owns the
    // `result === 'success'` check and decides what is cacheable.
    return res.status(r.ok ? 200 : 502).json(data);
  } catch (err) {
    console.error('[rates] upstream fetch failed:', err?.message);
    return res.status(502).json({ error: 'Exchange rate lookup failed' });
  }
}
