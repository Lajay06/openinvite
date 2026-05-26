/**
 * POST /api/verify-signup
 *
 * Pre-registration gate — called by the frontend BEFORE base44.auth.register().
 * Runs three independent spam-protection checks server-side.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CHECKS (in order)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  1. Rate limit     — max 5 signup attempts per IP per hour.
 *                      Uses the shared in-memory store from _lib/security.js.
 *                      Same caveat: per-Vercel-instance, not globally shared.
 *
 *  2. Turnstile      — Cloudflare invisible CAPTCHA.
 *                      Token generated client-side, verified here against
 *                      https://challenges.cloudflare.com/turnstile/v0/siteverify
 *                      If TURNSTILE_SECRET_KEY is unset the check is skipped
 *                      (dev / preview environments) with a console warning.
 *
 *  3. Disposable email — domain is checked against the ~100 k-entry
 *                      disposable-email-domains package. Rejects known
 *                      throwaway providers (mailinator, guerrillamail, etc.).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * REQUIRED ENV VARS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   TURNSTILE_SECRET_KEY  — Cloudflare Turnstile secret key.
 *                           Get from dash.cloudflare.com → Turnstile.
 *                           Server-side only (no VITE_ prefix).
 *                           If absent: Turnstile check is skipped (dev).
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
 */

// CJS interop — disposable-email-domains uses module.exports in a package
// with no "type": "module". createRequire is the standard Node.js pattern.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const disposableDomains = require('disposable-email-domains');

// Build a Set once at module load time for O(1) lookups instead of O(n).
const DISPOSABLE_SET = new Set(disposableDomains);

import {
  applyCors,
  checkRateLimit,
  getClientIp,
  isValidEmail,
} from './_lib/security.js';

// ─── Turnstile ────────────────────────────────────────────────────────────────

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_SECRET     = process.env.TURNSTILE_SECRET_KEY;

/**
 * Verify a Turnstile token with Cloudflare's siteverify API.
 * Returns the full Cloudflare response object.
 * If TURNSTILE_SECRET_KEY is not set, skips the check and returns success.
 *
 * @param {string} token   — cf-turnstile-response token from the client
 * @param {string} ip      — client IP (passed to Cloudflare for extra signal)
 * @returns {Promise<{ success: boolean, 'error-codes'?: string[] }>}
 */
async function verifyTurnstileToken(token, ip) {
  if (!TURNSTILE_SECRET) {
    console.warn(
      '[verify-signup] TURNSTILE_SECRET_KEY is not set — ' +
      'skipping Turnstile check (dev/preview only). ' +
      'Add this env var to Vercel project settings before going to production.'
    );
    return { success: true };
  }

  const body = new URLSearchParams({ secret: TURNSTILE_SECRET, response: token });
  if (ip && ip !== 'unknown') body.set('remoteip', ip);

  const res = await fetch(TURNSTILE_VERIFY_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });

  if (!res.ok) {
    console.error('[verify-signup] Cloudflare siteverify returned HTTP', res.status);
    return { success: false, 'error-codes': ['cf-http-error'] };
  }

  return await res.json();
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────────────────────────
  if (applyCors(req, res)) return; // handled OPTIONS preflight

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);

  // ── 1. Rate limiting: 5 signup attempts per IP per hour ──────────────────
  const { limited, remaining } = checkRateLimit(ip, 'signup', 5, 3_600_000);
  res.setHeader('X-RateLimit-Limit',     '5');
  res.setHeader('X-RateLimit-Remaining', String(remaining));

  if (limited) {
    console.warn('[verify-signup] Rate limited:', ip);
    return res.status(429).json({
      error: 'Too many signup attempts from your connection. Please wait an hour and try again.',
    });
  }

  const { email, turnstileToken } = req.body || {};

  // Basic presence and format check
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  if (!turnstileToken) {
    return res.status(400).json({ error: 'Security verification token is missing.' });
  }

  // ── 2. Cloudflare Turnstile verification ──────────────────────────────────
  let turnstileResult;
  try {
    turnstileResult = await verifyTurnstileToken(turnstileToken, ip);
  } catch (err) {
    console.error('[verify-signup] Turnstile verification error:', err.message);
    return res.status(500).json({ error: 'Security check unavailable. Please try again.' });
  }

  if (!turnstileResult.success) {
    console.warn('[verify-signup] Turnstile failed for IP:', ip, turnstileResult['error-codes']);
    return res.status(400).json({
      error: 'Security verification failed. Please refresh the page and try again.',
    });
  }

  // ── 3. Disposable email check ─────────────────────────────────────────────
  const domain = email.split('@')[1]?.toLowerCase() ?? '';

  if (DISPOSABLE_SET.has(domain)) {
    console.warn('[verify-signup] Disposable email rejected:', domain, '| IP:', ip);
    return res.status(400).json({
      error: 'Disposable email addresses are not allowed. Please sign up with your real email address.',
    });
  }

  // ── All checks passed ─────────────────────────────────────────────────────
  console.log('[verify-signup] Passed all checks for domain:', domain, '| IP:', ip);
  return res.status(200).json({ ok: true });
}
