/**
 * GET /api/admin/stats
 *
 * Protected admin endpoint.
 * Verifies the caller is the admin user via Base44, then returns
 * Stripe-sourced stats: revenue, paid users, recent payments.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY      — Stripe secret key
 *   VITE_BASE44_APP_ID     — Base44 app ID (used to verify the caller's token)
 */

import Stripe from 'stripe';
import { checkRateLimit, getClientIp } from '../_lib/security.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_API = 'https://base44.app/api';
const ADMIN_EMAIL = 'lajay@openinvite.com.au';

/** Verify the request comes from the admin by checking the Base44 token. */
async function verifyAdmin(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  if (!token) return false;
  try {
    const res = await fetch(`${BASE44_API}/apps/${BASE44_APP_ID}/entities/User/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const user = await res.json();
    return user?.email === ADMIN_EMAIL;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Rate limiting: 20 requests/min per IP ──────────────────────────────
  // Defense-in-depth: admin-gated, but each call still does up to 200
  // Stripe API reads plus a Base44 token check.
  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'admin-stats', 20);
  res.setHeader('X-RateLimit-Limit', '20');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) {
    console.warn('[admin/stats] Rate limited:', ip);
    return res.status(429).json({ error: 'Too many requests — please wait a moment and try again.' });
  }

  const isAdmin = await verifyAdmin(req);
  if (!isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // Pull up to 200 most recent completed checkout sessions
    const allSessions = [];
    let hasMore = true;
    let startingAfter;
    while (hasMore && allSessions.length < 200) {
      const batch = await stripe.checkout.sessions.list({
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      allSessions.push(...batch.data);
      hasMore = batch.has_more;
      if (batch.data.length > 0) startingAfter = batch.data[batch.data.length - 1].id;
      else hasMore = false;
    }

    const paidSessions = allSessions.filter(s => s.payment_status === 'paid');
    const now = Date.now() / 1000; // seconds
    const weekAgo = now - 7 * 24 * 60 * 60;

    // Revenue in AUD (amounts are in cents)
    const totalRevenue = paidSessions.reduce((sum, s) => sum + (s.amount_total || 0), 0) / 100;

    // Unique paying customers by email
    const seenEmails = new Set();
    const uniquePaidUsers = [];
    for (const s of paidSessions.sort((a, b) => b.created - a.created)) {
      const email = s.customer_email || s.customer_details?.email || '';
      if (email && !seenEmails.has(email)) {
        seenEmails.add(email);
        uniquePaidUsers.push({
          email,
          plan: s.metadata?.plan || 'pro',
          amount: (s.amount_total || 0) / 100,
          date: new Date(s.created * 1000).toISOString(),
          status: s.payment_status,
          sessionId: s.id,
        });
      }
    }

    const paidThisWeek = paidSessions.filter(s => s.created >= weekAgo).length;
    const totalSessions = allSessions.length;
    const conversionRate = totalSessions > 0
      ? ((paidSessions.length / totalSessions) * 100).toFixed(1)
      : '0.0';

    // Recent 50 payments (newest first, all sessions not just unique)
    const recentPayments = paidSessions
      .sort((a, b) => b.created - a.created)
      .slice(0, 50)
      .map(s => ({
        email: s.customer_email || s.customer_details?.email || '—',
        plan: s.metadata?.plan || 'pro',
        amount: (s.amount_total || 0) / 100,
        date: new Date(s.created * 1000).toISOString(),
        status: s.payment_status,
        sessionId: s.id,
      }));

    return res.status(200).json({
      stats: {
        totalPaidUsers: uniquePaidUsers.length,
        paidThisWeek,
        totalRevenue,
        conversionRate,
        totalSessions,
      },
      users: uniquePaidUsers,
      recentPayments,
    });
  } catch (err) {
    console.error('[admin/stats] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
