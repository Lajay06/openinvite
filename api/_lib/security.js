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
 *   verifyTurnstileToken(token, ip)             → Promise<{ success, 'error-codes'? }>
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
 *   'checkout'        — 10 req/min  (create-checkout-session)
 *   'email'           — 5 req/min   (send-email)
 *   'signup'          — 5 req/hour  (verify-signup)
 *   'places'          — 20 req/min  (places.js — text search)
 *   'places-search'   — 20 req/min  (places-search.js — text search)
 *   'place-details'   — 40 req/min  (place-details.js — one call per selection)
 *   'places-photo'    — 60 req/min  (places-photo.js — several photos per page load)
 *   'spotify-search'  — 20 req/min  (spotify-search.js — search-as-you-type)
 *   'spotify-refresh' — 10 req/min  (spotify-refresh.js — infrequent, security-sensitive)
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

// ─── Turnstile ────────────────────────────────────────────────────────────────

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_TIMEOUT_MS = 5_000; // abort the Cloudflare fetch after 5 s

/**
 * Verify a Turnstile token with Cloudflare's siteverify API.
 * Shared by every endpoint gating a public write behind Turnstile
 * (originally implemented in api/verify-signup.js; factored out here so
 * new Turnstile-gated endpoints — e.g. the guestbook — reuse the exact
 * same verification behaviour rather than re-implementing it).
 *
 * - Uses an AbortController so a slow/unreachable Cloudflare API times out in
 *   5 seconds instead of hanging the entire Vercel function.
 * - If TURNSTILE_SECRET_KEY is unset, FAILS CLOSED — returns success:false
 *   rather than skipping the check. A misconfigured environment must never
 *   silently accept unverified submissions; set TURNSTILE_SECRET_KEY (even
 *   to a Cloudflare test key) in every environment that exposes a
 *   Turnstile-gated form, including local dev and preview deployments.
 *
 * @param {string} token   — cf-turnstile-response token from the client
 * @param {string} ip      — client IP forwarded to Cloudflare for extra signal
 * @param {string} [logPrefix] — e.g. '[guestbook-submit]', used in console output
 * @returns {Promise<{ success: boolean, 'error-codes'?: string[] }>}
 */
export async function verifyTurnstileToken(token, ip, logPrefix = '[turnstile]') {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.error(
      `${logPrefix} TURNSTILE_SECRET_KEY is not set — failing closed. ` +
      'Add this env var (a Cloudflare test key is fine for local dev/preview) ' +
      'before this endpoint can accept submissions.'
    );
    return { success: false, 'error-codes': ['config-missing'] };
  }

  const controller = new AbortController();
  const timerId    = setTimeout(() => controller.abort(), TURNSTILE_TIMEOUT_MS);

  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== 'unknown') body.set('remoteip', ip);

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
      signal:  controller.signal,
    });

    if (!res.ok) {
      console.error(`${logPrefix} Cloudflare siteverify returned HTTP`, res.status);
      return { success: false, 'error-codes': ['cf-http-error'] };
    }

    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error(`${logPrefix} Cloudflare siteverify timed out after`, TURNSTILE_TIMEOUT_MS, 'ms');
      return { success: false, 'error-codes': ['cf-timeout'] };
    }
    throw err; // re-throw unexpected network errors
  } finally {
    clearTimeout(timerId);
  }
}

// ─── Cookies ─────────────────────────────────────────────────────────────────

/**
 * Parses the request's raw Cookie header into a plain object. Used for OAuth
 * state validation (api/spotify-callback.js) and short-lived server-to-
 * browser handoffs, since Vercel functions are stateless across invocations
 * — an in-memory store (like the rate-limit Map) can't reliably survive
 * from one request in a multi-step flow to the next, but a browser-held
 * cookie can.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {Record<string, string>}
 */
export function parseCookies(req) {
  const header = req.headers?.cookie;
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map(pair => {
      const eq = pair.indexOf('=');
      if (eq < 0) return [pair.trim(), ''];
      return [pair.slice(0, eq).trim(), decodeURIComponent(pair.slice(eq + 1).trim())];
    }).filter(([k]) => k)
  );
}

/**
 * Serializes a Set-Cookie header value. Defaults are appropriate for a
 * short-lived, first-party-only value (OAuth state nonce, a pending-token
 * handoff) — HttpOnly by default so client JS can never read it, Secure so
 * it's never sent over plain HTTP, SameSite=Lax so it survives the
 * cross-site redirect back from Spotify's authorize page (Strict would be
 * dropped on that redirect).
 *
 * @param {string} name
 * @param {string} value
 * @param {{ maxAge?: number, httpOnly?: boolean }} [options]
 * @returns {string}
 */
export function serializeCookie(name, value, { maxAge = 600, httpOnly = true } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Lax', 'Secure', `Max-Age=${maxAge}`];
  if (httpOnly) parts.push('HttpOnly');
  return parts.join('; ');
}

/** Serializes a Set-Cookie header that immediately expires a cookie. */
export function expireCookie(name) {
  return `${name}=; Path=/; SameSite=Lax; Secure; HttpOnly; Max-Age=0`;
}
