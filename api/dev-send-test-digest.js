/**
 * GET /api/dev-send-test-digest
 *
 * TEMPORARY, one-off endpoint — sends a single real weekly-digest email
 * (real John & Suzanne wedding data) to a hardcoded test recipient, so the
 * logo + recommended-actions changes in this PR can be reviewed on a real
 * Preview deployment before merge, as a user would see them (logo render,
 * mobile layout, the numbers, the new "This week" suggestions).
 *
 * Reuses api/cron/send-weekly-digest.js's own digest-building logic
 * (buildDigestForWedding) rather than duplicating it.
 *
 * Delete this file (and DEV_DIGEST_SECRET from Vercel's Preview env) once
 * the preview send it exists for is confirmed — it has no reason to reach
 * production and must not be merged to main.
 *
 * Auth: DEV_DIGEST_SECRET, a dedicated one-off secret generated specifically
 * for this endpoint and added to Vercel's Preview environment only (not
 * Production, not CRON_SECRET or any other existing secret).
 */

import { Resend } from 'resend';
import { buildDigestForWedding, realOnly } from './cron/send-weekly-digest.js';
import { renderWeeklyDigestEmail } from '../src/lib/weeklyDigestEmailTemplate.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;
const FROM = 'Openinvite <hello@openinvite.com.au>';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const resend = new Resend(process.env.RESEND_API_KEY);

// John & Suzanne — real, live wedding, per user request.
const WEDDING_ID = '6a1f90fa5b4e0702b5a051aa';
const TEST_RECIPIENT = 'la.jay06@gmail.com';

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

async function adminFetch(path) {
  const res = await fetch(`${BASE44_API}${path}`, {
    headers: { Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Base44 GET ${path} failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return unwrapList(await res.json());
}

export default async function handler(req, res) {
  const devSecret = process.env.DEV_DIGEST_SECRET;
  if (!devSecret) {
    return res.status(500).json({ error: 'DEV_DIGEST_SECRET not set' });
  }
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  if (token !== devSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!BASE44_ADMIN_KEY) {
    return res.status(500).json({ error: 'BASE44_ADMIN_KEY not set' });
  }

  try {
    const weddingRows = realOnly(await adminFetch(`/apps/${BASE44_APP_ID}/entities/WeddingDetails?q=${encodeURIComponent(JSON.stringify({ id: WEDDING_ID }))}`));
    const wedding = weddingRows[0];
    if (!wedding) {
      return res.status(404).json({ error: 'Wedding not found' });
    }

    const allQuestionnaireResponses = realOnly(await adminFetch(`/apps/${BASE44_APP_ID}/entities/QuestionnaireResponse?limit=5000`));
    const weekAgo = new Date(Date.now() - WEEK_MS);
    const digest = await buildDigestForWedding(wedding, allQuestionnaireResponses, weekAgo);

    const { subject, html } = renderWeeklyDigestEmail(digest);

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: 'RESEND_API_KEY not set' });
    }
    const { data, error } = await resend.emails.send({ from: FROM, to: TEST_RECIPIENT, subject, html });
    if (error) {
      console.error('[dev-send-test-digest] Resend error:', error.message || error);
      return res.status(500).json({ ok: false, error: error.message || String(error) });
    }

    console.log(`[dev-send-test-digest] SUCCESS — sent to ${TEST_RECIPIENT} | resend id: ${data?.id}`);
    return res.status(200).json({ ok: true, to: TEST_RECIPIENT, subject, resendId: data?.id, digest });
  } catch (err) {
    console.error('[dev-send-test-digest] FAILURE:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
