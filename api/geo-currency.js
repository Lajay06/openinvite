/**
 * GET /api/geo-currency
 *
 * Tells the pricing page which currency to default an ANONYMOUS visitor
 * to, using Vercel's `x-vercel-ip-country` request header (populated
 * automatically for every request routed through Vercel's edge network —
 * no configuration needed, works on every plan). US visitors default to
 * USD; everyone else defaults to AUD, for now.
 *
 * This is a default only, never a lock-in: Pricing.jsx also renders a
 * manual AUD/USD switcher so a guessed-wrong geo-IP (VPN, corporate
 * proxy, etc.) never traps anyone. A logged-in user's own stored
 * currency preference (User.currency) takes priority over this entirely
 * and never calls this endpoint at all — see src/lib/currencyPricing.js.
 *
 * Response: 200 { currency: 'USD'|'AUD', country: string|null }
 */

import { applyCors, checkRateLimit, getClientIp } from './_lib/security.js';

export default function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Cheap, read-only, no external calls — a generous limit just to stop
  // anything hammering it directly.
  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'geo-currency', 60, 60_000);
  res.setHeader('X-RateLimit-Limit', '60');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
  }

  const country = req.headers['x-vercel-ip-country'] || null;
  const currency = country === 'US' ? 'USD' : 'AUD';

  // Per-request — the same visitor could plausibly be routed differently
  // (VPN toggled, different edge node), never cache a geo guess.
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ currency, country });
}
