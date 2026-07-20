/**
 * GET /api/dev-send-test-digest
 *
 * TEMPORARY, one-off endpoint — sends a single real weekly-digest email
 * (real John & Suzanne wedding data) to a hardcoded test recipient, so it
 * can be reviewed as a user would see it (subject, mobile layout, numbers,
 * preferences link) before the feature is considered fully signed off.
 * Not wired into vercel.json's crons — must be invoked manually.
 *
 * Reuses api/cron/send-weekly-digest.js's own digest-building logic
 * (buildDigestForWedding) rather than duplicating it, so this is exactly
 * the same code path the real weekly cron uses — just pointed at one
 * wedding and one recipient instead of iterating every real owner.
 *
 * Delete this file once the one-off send it exists for is done — it has
 * no reason to exist as a permanent route.
 *
 * Auth: same CRON_SECRET as every other cron/dev endpoint in this app.
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
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (token !== cronSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
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
