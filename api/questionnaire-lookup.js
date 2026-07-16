/**
 * POST /api/questionnaire-lookup
 *
 * Public, unauthenticated endpoint backing GamesPage.jsx (the guest-facing
 * questionnaire/game page, /games/:token/:questionnaireId). Validates the
 * guest's existing rsvp_link_id token exactly as api/rsvp-lookup.js does
 * (via resolveGuestByToken, admin-key-backed, no client-suppliable guest
 * id anywhere), then confirms the questionnaire belongs to that guest's
 * own wedding AND that this specific guest is an eligible recipient
 * (isEligibleRecipient — the same recipient rule the couple's dashboard
 * tracker uses) before returning anything.
 *
 * A non-recipient's token gets the same 404 as a bad token or a
 * non-existent questionnaire id — never a distinguishing 403 — so this
 * endpoint can't be used to probe which questionnaires exist for guests
 * who aren't on the list.
 *
 * Never returns another guest's answers: the only response fields tied to
 * "who answered what" are this SAME guest's own prior submission (so they
 * can see/edit what they already sent), resolved by (questionnaire_id,
 * this guest's own guest_id) — there is no code path here that reads or
 * returns any other guest's QuestionnaireResponse row.
 *
 * Body: { token: string, questionnaireId: string }
 * Response: 200 {
 *   title, intro, questions: [{ id, text, type, options }],
 *   alreadyAnswered: boolean,
 *   previousAnswers: [{ question_id, answer_text, selected_option }] | null
 * }
 * or 404 { error: '...' }
 *
 * Required env var: BASE44_ADMIN_KEY — server-side-only Base44 service token.
 */

import { applyCors, checkRateLimit, getClientIp, sanitizeString } from './_lib/security.js';
import { resolveGuestByToken } from './_lib/rsvpAuth.js';
import { isEligibleRecipient } from '../src/lib/questionnaireRecipients.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

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
  if (!res.ok) throw new Error(`Base44 GET ${path} failed (${res.status})`);
  return res.json();
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'questionnaire-lookup', 20, 60_000);
  res.setHeader('X-RateLimit-Limit', '20');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) return res.status(429).json({ error: 'Too many requests — please wait a moment.' });

  const token = sanitizeString(req.body?.token || '');
  const questionnaireId = sanitizeString(req.body?.questionnaireId || '');
  if (!token || !questionnaireId) {
    return res.status(400).json({ error: 'token and questionnaireId are required' });
  }
  if (!BASE44_ADMIN_KEY) {
    console.error('[questionnaire-lookup] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const resolved = await resolveGuestByToken(token);
    if (!resolved || !resolved.wedding) {
      return res.status(404).json({ error: 'This link has expired or is invalid.' });
    }
    const { guest, wedding } = resolved;

    const questionnaires = unwrapList(
      await adminFetch(`/apps/${BASE44_APP_ID}/entities/Questionnaire?q=${encodeURIComponent(JSON.stringify({ id: questionnaireId }))}`)
    );
    const questionnaire = questionnaires.find(q => q.id === questionnaireId);

    if (
      !questionnaire ||
      questionnaire.created_by_id !== wedding.created_by_id ||
      !isEligibleRecipient(questionnaire, guest)
    ) {
      // Same response whether the id is wrong, belongs to a different
      // wedding, or this guest just isn't a recipient — never distinguish.
      return res.status(404).json({ error: 'This game could not be found.' });
    }

    const existingResponses = unwrapList(
      await adminFetch(`/apps/${BASE44_APP_ID}/entities/QuestionnaireResponse?q=${encodeURIComponent(JSON.stringify({ questionnaire_id: questionnaireId, guest_id: guest.id }))}`)
    );
    const mine = existingResponses.find(r => r.guest_id === guest.id && r.questionnaire_id === questionnaireId);

    return res.status(200).json({
      title: questionnaire.title,
      intro: questionnaire.intro || '',
      isActive: questionnaire.is_active !== false,
      questions: (questionnaire.questions || []).map(q => ({
        id: q.id, text: q.text, type: q.type || 'short_text', options: q.options || [],
      })),
      alreadyAnswered: !!mine,
      previousAnswers: mine ? (mine.answers || []) : null,
    });
  } catch (err) {
    console.error('[questionnaire-lookup] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
