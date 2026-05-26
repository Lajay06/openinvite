/**
 * POST /api/verify-signup
 *
 * Pre-registration gate — called by the frontend BEFORE base44.auth.register().
 * Runs three independent spam-protection checks server-side and returns quickly
 * on every code path; no path hangs indefinitely.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CHECKS (in order)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  1. Rate limit     — max 5 signup attempts per IP per hour.
 *
 *  2. Turnstile      — Cloudflare invisible CAPTCHA.
 *                      5-second AbortController timeout on the Cloudflare fetch
 *                      so a slow/unreachable Cloudflare API never hangs the fn.
 *                      If TURNSTILE_SECRET_KEY is unset, the check is skipped
 *                      (dev / preview) with a console warning.
 *
 *  3. Disposable email — domain checked against ~120 k disposable-email-domains.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY import … with { type: 'json' } — NOT createRequire
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Vercel bundles serverless functions with esbuild / nft (Node File Tracing).
 *  After bundling, import.meta.url resolves to the Lambda sandbox path
 *  (/var/task/verify-signup.js) which has no node_modules/ beside it.
 *  createRequire(import.meta.url) therefore throws "Cannot find module" at
 *  cold-start, causing the function to hang instead of fast-failing.
 *
 *  Static JSON import assertions ('with { type: "json" }') are understood by
 *  esbuild and nft — the file is included in the bundle automatically.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * REQUIRED ENV VARS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   TURNSTILE_SECRET_KEY  — Cloudflare Turnstile secret key.
 *                           Get from dash.cloudflare.com → Turnstile.
 *                           Server-side only (no VITE_ prefix).
 *                           If absent: Turnstile check is skipped (dev/preview).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * REQUEST / RESPONSE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   POST /api/verify-signup
 *   Body: { email: string, turnstileToken: string }
 *
 *   200  { ok: true }
 *   400  { error: string }   — validation / disposable email / CAPTCHA failed
 *   429  { error: string }   — rate limited
 *   405  { error: string }   — wrong method
 *   500  { error: string }   — unexpected server error
 */

// ─── Disposable email list ────────────────────────────────────────────────────
//
// Static JSON import with assertion — statically analysable by esbuild/nft so
// the file is bundled correctly in Vercel's Lambda environment.
// Node.js 20+ (Vercel's default runtime) supports 'with { type: "json" }'.
//
// DO NOT replace this with createRequire(import.meta.url) — that breaks after
// Vercel bundles the function (import.meta.url resolves to /var/task/ which has
// no node_modules/).

import disposableDomainsArray from 'disposable-email-domains/index.json' with { type: 'json' };
const DISPOSABLE_SET = new Set(disposableDomainsArray);

import {
  applyCors,
  checkRateLimit,
  getClientIp,
  isValidEmail,
} from './_lib/security.js';

// ─── Turnstile ────────────────────────────────────────────────────────────────

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const CF_TIMEOUT_MS        = 5_000; // abort the Cloudflare fetch after 5 s

/**
 * Verify a Turnstile token with Cloudflare's siteverify API.
 *
 * - Uses an AbortController so a slow/unreachable Cloudflare API times out in
 *   5 seconds instead of hanging the entire Vercel function.
 * - If TURNSTILE_SECRET_KEY is unset, skips the check and returns success
 *   (allows dev / Vercel preview deployments without the env var).
 *
 * @param {string} token   — cf-turnstile-response token from the client
 * @param {string} ip      — client IP forwarded to Cloudflare for extra signal
 * @returns {Promise<{ success: boolean, 'error-codes'?: string[] }>}
 */
async function verifyTurnstileToken(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.warn(
      '[verify-signup] TURNSTILE_SECRET_KEY is not set — ' +
      'skipping Turnstile check (dev/preview only). ' +
      'Add this env var to Vercel project settings before going to production.'
    );
    return { success: true };
  }

  const controller = new AbortController();
  const timerId    = setTimeout(() => controller.abort(), CF_TIMEOUT_MS);

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
      console.error('[verify-signup] Cloudflare siteverify returned HTTP', res.status);
      return { success: false, 'error-codes': ['cf-http-error'] };
    }

    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[verify-signup] Cloudflare siteverify timed out after', CF_TIMEOUT_MS, 'ms');
      return { success: false, 'error-codes': ['cf-timeout'] };
    }
    throw err; // re-throw unexpected network errors
  } finally {
    clearTimeout(timerId);
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // ── Top-level safety net ───────────────────────────────────────────────────
  // Catches anything unexpected (import errors surfacing at call time, etc.)
  // and ensures the function always returns a response — never hangs.
  try {
    return await run(req, res);
  } catch (err) {
    console.error('[verify-signup] Unhandled error:', err?.message, err?.stack);
    return res.status(500).json({
      error: 'An unexpected error occurred. Please try again.',
    });
  }
}

async function run(req, res) {
  // ── CORS ───────────────────────────────────────────────────────────────────
  if (applyCors(req, res)) return; // handled OPTIONS preflight

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  console.log('[verify-signup] Request from IP:', ip);

  // ── 1. Rate limiting: 5 signup attempts per IP per hour ───────────────────
  const { limited, remaining } = checkRateLimit(ip, 'signup', 5, 3_600_000);
  res.setHeader('X-RateLimit-Limit',     '5');
  res.setHeader('X-RateLimit-Remaining', String(remaining));

  if (limited) {
    console.warn('[verify-signup] Rate limited:', ip);
    return res.status(429).json({
      error: 'Too many signup attempts from your connection. Please wait an hour and try again.',
    });
  }
  console.log('[verify-signup] Rate limit OK — remaining:', remaining);

  // ── Basic input validation ─────────────────────────────────────────────────
  const { email, turnstileToken } = req.body || {};

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  if (!turnstileToken) {
    return res.status(400).json({ error: 'Security verification token is missing.' });
  }

  // ── 2. Cloudflare Turnstile verification ───────────────────────────────────
  console.log('[verify-signup] Running Turnstile check...');
  let turnstileResult;
  try {
    turnstileResult = await verifyTurnstileToken(turnstileToken, ip);
  } catch (err) {
    console.error('[verify-signup] Turnstile network error:', err.message);
    return res.status(500).json({ error: 'Security check unavailable. Please try again.' });
  }

  if (!turnstileResult.success) {
    console.warn('[verify-signup] Turnstile failed — codes:', turnstileResult['error-codes'], '| IP:', ip);
    return res.status(400).json({
      error: 'Security verification failed. Please refresh the page and try again.',
    });
  }
  console.log('[verify-signup] Turnstile OK');

  // ── 3. Disposable email check ──────────────────────────────────────────────
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  console.log('[verify-signup] Checking domain:', domain, '| Set size:', DISPOSABLE_SET.size);

  if (DISPOSABLE_SET.has(domain)) {
    console.warn('[verify-signup] Disposable email rejected:', domain, '| IP:', ip);
    return res.status(400).json({
      error: 'Disposable email addresses are not allowed. Please sign up with your real email address.',
    });
  }
  console.log('[verify-signup] Disposable check OK');

  // ── All checks passed ──────────────────────────────────────────────────────
  console.log('[verify-signup] All checks passed for domain:', domain, '| IP:', ip);
  return res.status(200).json({ ok: true });
}
