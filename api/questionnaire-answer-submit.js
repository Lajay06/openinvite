/**
 * POST /api/questionnaire-answer-submit
 *
 * Public, unauthenticated endpoint backing GamesPage.jsx. Writes one
 * QuestionnaireResponse row per guest, keyed by (questionnaire_id,
 * guest_id) — resubmitting just updates the existing row (mirrors
 * rsvp-submit.js's "always allow updating your own response" behaviour).
 *
 * Privacy enforcement (server-side, not just UI):
 *   1. guest_id always comes from resolveGuestByToken(token) — there is no
 *      client-suppliable guest id anywhere in this file, so a caller can
 *      never write (or overwrite) another guest's response no matter what
 *      the request body claims.
 *   2. created_by_id is stamped to wedding.created_by_id (the COUPLE's own
 *      user id, resolved server-side from the guest's wedding) via the
 *      admin key, which is what makes QuestionnaireResponse's owner-scoped
 *      read RLS (`created_by_id: {{user.id}}`) resolve to the couple later
 *      — a guest has no base44 session at all, so no token, however
 *      crafted, can ever satisfy that rule and read anything back.
 *   3. Eligibility (isEligibleRecipient) is re-checked here independently
 *      of questionnaire-lookup.js — a guest can't answer a questionnaire
 *      they were never sent, even if they somehow had its id.
 *
 * Body: { token: string, questionnaireId: string, answers: [{ question_id, answer_text?, selected_option? }] }
 * Response: 200 { ok: true }
 *        or 404 { error: '...' }
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { resolveGuestByToken } from './_lib/rsvpAuth.js';
import { isEligibleRecipient } from '../src/lib/questionnaireRecipients.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;
const MAX_ANSWER_LENGTH = 500;

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

async function adminFetch(method, path, body) {
  const res = await fetch(`${BASE44_API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${BASE44_ADMIN_KEY}` },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Base44 ${method} ${path} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.status === 204 ? null : res.json();
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'questionnaire-answer-submit', 15, 60_000);
  res.setHeader('X-RateLimit-Limit', '15');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) return res.status(429).json({ error: 'Too many requests — please wait a moment.' });

  const token = sanitizeString(req.body?.token || '');
  const questionnaireId = sanitizeString(req.body?.questionnaireId || '');
  const rawAnswers = Array.isArray(req.body?.answers) ? req.body.answers : [];

  if (!token || !questionnaireId) {
    return res.status(400).json({ error: 'token and questionnaireId are required' });
  }
  if (!BASE44_ADMIN_KEY) {
    console.error('[questionnaire-answer-submit] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const answers = rawAnswers
    .filter(a => a && typeof a.question_id === 'string' && a.question_id)
    .map(a => ({
      question_id: a.question_id,
      answer_text: typeof a.answer_text === 'string' ? sanitizeString(a.answer_text).slice(0, MAX_ANSWER_LENGTH) : '',
      selected_option: typeof a.selected_option === 'string' ? sanitizeString(a.selected_option).slice(0, MAX_ANSWER_LENGTH) : '',
    }));

  try {
    const resolved = await resolveGuestByToken(token);
    if (!resolved || !resolved.wedding) {
      return res.status(404).json({ error: 'This link has expired or is invalid.' });
    }
    const { guest, wedding } = resolved;

    const questionnaires = unwrapList(
      await adminFetch('GET', `/apps/${BASE44_APP_ID}/entities/Questionnaire?q=${encodeURIComponent(JSON.stringify({ id: questionnaireId }))}`)
    );
    const questionnaire = questionnaires.find(q => q.id === questionnaireId);

    if (
      !questionnaire ||
      questionnaire.created_by_id !== wedding.created_by_id ||
      !isEligibleRecipient(questionnaire, guest)
    ) {
      return res.status(404).json({ error: 'This game could not be found.' });
    }
    if (questionnaire.is_active === false) {
      return res.status(403).json({ error: 'This game is no longer accepting answers.' });
    }

    const existing = unwrapList(
      await adminFetch('GET', `/apps/${BASE44_APP_ID}/entities/QuestionnaireResponse?q=${encodeURIComponent(JSON.stringify({ questionnaire_id: questionnaireId, guest_id: guest.id }))}`)
    ).find(r => r.guest_id === guest.id && r.questionnaire_id === questionnaireId);

    const payload = {
      questionnaire_id: questionnaireId,
      guest_id: guest.id,
      guest_name: guest.name || '',
      answers,
      submitted_at: new Date().toISOString(),
      created_by_id: wedding.created_by_id,
    };

    if (existing) {
      await adminFetch('PUT', `/apps/${BASE44_APP_ID}/entities/QuestionnaireResponse/${existing.id}`, payload);
    } else {
      await adminFetch('POST', `/apps/${BASE44_APP_ID}/entities/QuestionnaireResponse`, payload);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[questionnaire-answer-submit] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
