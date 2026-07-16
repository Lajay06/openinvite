/**
 * POST /api/questionnaire-responses-for-owner
 *
 * Authenticated endpoint backing GamesManager.jsx's dashboard "responses"
 * view. Replaces the old client-side getMyRecords('QuestionnaireResponse')
 * call, which relied on QuestionnaireResponse.read being owner-scoped —
 * that's now null (fix/questionnaire-response-rls), and the rows only ever
 * hold hashed ids + an encrypted payload, so the client can no longer read
 * anything meaningful directly even if it queried the entity itself.
 *
 * Two different credentials are used for two different reasons:
 *   - The caller's OWN bearer token fetches their own Questionnaire list —
 *     Questionnaire.create/update stayed owner-scoped, so this is a normal,
 *     already-working owner-scoped read (this endpoint never trusts a
 *     client-supplied user id — it's whoever verifyBase44User resolves).
 *   - BASE44_ADMIN_KEY fetches QuestionnaireResponse rows — read:null means
 *     this works for any caller, but this endpoint only ever filters by the
 *     hashes of the caller's OWN questionnaire ids, never lists unscoped.
 *
 * Response: 200 { responses: [{ questionnaire_id, guest_name, answers, submitted_at }] }
 */

import { applyCors, checkRateLimit, getClientIp } from './_lib/security.js';
import { verifyBase44User } from './_lib/auth.js';
import { hashId, decryptPayload } from './_lib/questionnaireCrypto.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

async function fetchJson(path, token) {
  const res = await fetch(`${BASE44_API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Base44 GET ${path} failed (${res.status})`);
  return res.json();
}

/** Latest row wins per (questionnaire_id_hash, guest_id_hash) — append-only, mirrors rsvpAggregation.js. */
function latestPerPair(rows) {
  const latest = new Map();
  for (const row of rows) {
    const key = `${row.questionnaire_id_hash}::${row.guest_id_hash}`;
    const existing = latest.get(key);
    if (!existing || new Date(row.created_date) > new Date(existing.created_date)) latest.set(key, row);
  }
  return [...latest.values()];
}

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req);
  const { limited, remaining } = checkRateLimit(ip, 'questionnaire-responses-for-owner', 30, 60_000);
  res.setHeader('X-RateLimit-Limit', '30');
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  if (limited) return res.status(429).json({ error: 'Too many requests — please wait a moment.' });

  const auth = req.headers.authorization || '';
  const callerToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const caller = await verifyBase44User(req);
  if (!caller || !callerToken) return res.status(401).json({ error: 'Not authenticated' });
  if (!BASE44_ADMIN_KEY) {
    console.error('[questionnaire-responses-for-owner] BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const myQuestionnaires = unwrapList(
      await fetchJson(`/apps/${BASE44_APP_ID}/entities/Questionnaire?q=${encodeURIComponent(JSON.stringify({ created_by_id: caller.id }))}`, callerToken)
    );
    if (myQuestionnaires.length === 0) return res.status(200).json({ responses: [] });

    const hashToId = new Map(myQuestionnaires.map(q => [hashId(q.id), q.id]));

    // No precedent anywhere else in this codebase for a Mongo-style $in in
    // the ?q= query filter — every other endpoint uses flat equality, so
    // that's the only shape proven to work against Base44's query engine.
    // A couple has few enough questionnaires that one request per hash is
    // fine, and it's a strictly safer bet than an untested operator.
    const rowsByQuestionnaire = await Promise.all(
      [...hashToId.keys()].map(qHash =>
        fetchJson(`/apps/${BASE44_APP_ID}/entities/QuestionnaireResponse?q=${encodeURIComponent(JSON.stringify({ questionnaire_id_hash: qHash }))}`, BASE44_ADMIN_KEY)
          .then(unwrapList)
      )
    );
    const rows = rowsByQuestionnaire.flat();

    const responses = latestPerPair(rows.filter(r => hashToId.has(r.questionnaire_id_hash))).map(row => {
      const decrypted = decryptPayload(row.encrypted_answers);
      return {
        questionnaire_id: hashToId.get(row.questionnaire_id_hash),
        guest_name: decrypted.guest_name,
        answers: decrypted.answers,
        submitted_at: decrypted.submitted_at,
      };
    });

    return res.status(200).json({ responses });
  } catch (err) {
    console.error('[questionnaire-responses-for-owner] Error:', err.message);
    return res.status(500).json({ error: 'Something went wrong — please try again.' });
  }
}
