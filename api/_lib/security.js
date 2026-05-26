/**
 * /api/_lib/security.js
 *
 * Shared security utilities for all Openinvite API endpoints.
 * Files inside api/_lib/ are NOT exposed as Vercel routes.
 *
 * Exports:
 *   applyCors(req, res)                        → bool (true = OPTIONS preflight, return early)
 *   checkRateLimit(ip, bucket, limit, windowMs) → { limited, remaining }
 *   getClientIp(req)                           → string
 *   sanitizeString(str)                        → string
 *   isValidEmail(email)                        → bool
 *   isValidPriceId(priceId)                    → bool
 */

// ─── CORS ────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = new Set([
  'https://openinvite.com.au',
  'https://www.openinvite.com.au',
  'https://openinvite-pearl.vercel.app',
]);

/**
 * Set CORS headers on the response.
 *
 * - If the request Origin is in ALLOWED_ORIGINS, reflects it in
 *   Access-Control-Allow-Origin (more secure than wildcard).
 * - For OPTIONS preflight requests, ends the response immediately with 200
 *   and returns true so the caller can short-circuit.
 * - For all other requests, returns false (caller continues normally).
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse}  res
 * @returns {boolean}  true if the request was a handled OPTIONS preflight
 */
export function applyCors(req, res) {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  // Unlisted origins get no ACAO header — browsers will block the request.
  // Server-to-server calls (cron, webhooks) send no Origin and are unaffected.

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // cache preflight for 24 h

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true; // caller must return immediately
  }

  return false;
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

/**
 * In-memory rate limit store.
 *
 * NOTE: Vercel runs multiple parallel function instances, so this store is
 * per-instance, not global. It provides meaningful protection against bursty
 * single-source abuse (e.g. rapid repeated submits from one browser tab) but
 * is not a substitute for a Redis-backed global rate limiter for high-traffic
 * APIs. For Openinvite's current scale this is sufficient.
 *
 * Entries expire naturally when the instance is recycled. A lazy GC pass runs
 * whenever the store exceeds 500 entries to guard against long-lived instances.
 *
 * Shape: Map<`${bucket}:${ip}`, { count: number, resetAt: number }>
 */
const rateLimitStore = new Map();

function gcRateLimitStore() {
  if (rateLimitStore.size < 500) return;
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now >= entry.resetAt) rateLimitStore.delete(key);
  }
}

/**
 * Check whether a request from `ip` in `bucket` has exceeded `limit` within
 * the rolling `windowMs` window. Mutates the store.
 *
 * Rate limit buckets:
 *   'checkout'  — 10 req/min  (create-checkout-session)
 *   'email'     — 5 req/min   (send-email)
 *
 * @param {string} ip
 * @param {string} bucket
 * @param {number} limit      max requests allowed per window
 * @param {number} windowMs   window duration in milliseconds (default 60 000)
 * @returns {{ limited: boolean, remaining: number }}
 */
export function checkRateLimit(ip, bucket, limit, windowMs = 60_000) {
  gcRateLimitStore();

  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now >= entry.resetAt) {
    // First request in this window
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: limit - 1 };
  }

  entry.count += 1;

  if (entry.count > limit) {
    return { limited: true, remaining: 0 };
  }

  return { limited: false, remaining: limit - entry.count };
}

// ─── Client IP ───────────────────────────────────────────────────────────────

/**
 * Extract the real client IP from the request.
 * Vercel populates x-forwarded-for; the first address is the originating client.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {string}
 */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// ─── Input sanitization ───────────────────────────────────────────────────────

/**
 * Strip HTML / script injection patterns from a string.
 * Removes tags, javascript: URIs, and inline event handlers.
 *
 * @param {unknown} str
 * @returns {string|unknown}  sanitized string, or the original value if not a string
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<[^>]*>/g, '')        // strip all HTML tags
    .replace(/javascript:/gi, '')   // strip javascript: protocol
    .replace(/on\w+\s*=/gi, '')     // strip inline event handlers (onclick=, etc.)
    .trim();
}

// ─── Validators ──────────────────────────────────────────────────────────────

/**
 * Validate an email address.
 * Accepts anything with the shape local@domain.tld and length ≤ 320 chars.
 *
 * @param {unknown} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  if (email.length > 320) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate a Stripe price ID.
 * Stripe price IDs always begin with 'price_' followed by alphanumeric chars.
 *
 * @param {unknown} priceId
 * @returns {boolean}
 */
export function isValidPriceId(priceId) {
  if (typeof priceId !== 'string') return false;
  return /^price_[A-Za-z0-9]+$/.test(priceId);
}
