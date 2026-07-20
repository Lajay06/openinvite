/**
 * GET /api/cron/send-weekly-digest
 *
 * Vercel Cron — runs weekly (schedule in vercel.json). For every couple
 * with notification_prefs.weekly_digest on (and not in_app_only), emails a
 * wrap-up: RSVPs received this week, running guest-list totals (the shared
 * src/lib/guestRsvpTally.js utility, same source of truth as the dashboard),
 * poll/questionnaire activity this week, and days until the wedding.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Why this iterates WeddingDetails, not User — read before touching this
 * ─────────────────────────────────────────────────────────────────────────
 * api/cron/send-onboarding-emails.js has been silently failing every run
 * since it shipped: it lists Users via `Authorization: Bearer <ADMIN_KEY>`,
 * which the User entity 401s on for LIST specifically (every other entity
 * accepts this form). BASE44_PLATFORM_NOTES.md documented the fix as
 * `?api_key=` instead — confirmed that avoids the 401, but confirmed
 * SEPARATELY and EMPIRICALLY while building this cron that `GET
 * /entities/User?api_key=...` still returns `200 []`, an empty array,
 * even with real users in the app. `GET /entities/User/:id?api_key=...`
 * (a single known id) works fine — this is a bulk-list-specific gap, not
 * the same 401 bug, and not fixed by the documented workaround.
 *
 * There is no working way to bulk-list every User via the admin key. This
 * cron sidesteps the problem entirely: WeddingDetails.read is null
 * (unscoped) and DOES list correctly via the ordinary Bearer form, so it
 * iterates real WeddingDetails records (one per couple) and resolves each
 * owner's User record individually via api/_lib/base44Admin.js's
 * getBase44User() (the already-proven single-record path) to read their
 * email/notification_prefs. This is also just a better fit for what the
 * digest actually needs — every recipient necessarily has a wedding.
 */

import { Resend } from 'resend';
import { getBase44User } from '../_lib/base44Admin.js';
import { hashId } from '../_lib/questionnaireCrypto.js';
import { latestEventResponses, deriveRsvpStatus, toEventResponsesShape } from '../../src/lib/rsvpAggregation.js';
import { tallyGuestRsvp } from '../../src/lib/guestRsvpTally.js';
import { DEFAULT_NOTIFICATION_PREFS } from '../../src/lib/notificationPrefs.js';
import { renderWeeklyDigestEmail } from '../../src/lib/weeklyDigestEmailTemplate.js';

const BASE44_API = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY;
const APP_URL = process.env.VITE_APP_URL || 'https://openinvite.com.au';
const FROM = 'Openinvite <hello@openinvite.com.au>';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const resend = new Resend(process.env.RESEND_API_KEY);

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

export function realOnly(rows) {
  return (rows || []).filter(r => !r.is_test);
}

/** One real (non-test) WeddingDetails per owner — the most recently created if an owner somehow has more than one. */
function dedupeOwners(weddings) {
  const byOwner = new Map();
  for (const w of weddings) {
    const existing = byOwner.get(w.created_by_id);
    if (!existing || new Date(w.created_date) > new Date(existing.created_date)) {
      byOwner.set(w.created_by_id, w);
    }
  }
  return byOwner;
}

export async function buildDigestForWedding(wedding, allQuestionnaireResponses, weekAgo) {
  const ownerQuery = encodeURIComponent(JSON.stringify({ created_by_id: wedding.created_by_id }));
  const guests = realOnly(await adminFetch(`/apps/${BASE44_APP_ID}/entities/Guest?q=${ownerQuery}`));

  const weddingIdQuery = encodeURIComponent(JSON.stringify({ wedding_id: wedding.id }));
  const rsvpRows = realOnly(await adminFetch(`/apps/${BASE44_APP_ID}/entities/RsvpResponse?q=${weddingIdQuery}`));

  // Group by guest_id FIRST — toEventResponsesShape's output doesn't carry
  // guest_id (it's the per-guest event_responses[] shape, guest_id is
  // implicit from context), so reshaping has to happen per-guest-group,
  // after grouping, not before (grouping on the reshaped rows would key
  // everything on `undefined`). deriveRsvpStatus also requires this reshape
  // regardless — it checks r.invited, a field raw RsvpResponse rows don't
  // have (not part of that entity's schema) — see
  // src/lib/resolveMyWedding.js's getMyGuestsWithRsvp for the same
  // group-then-reshape order client-side.
  const rawRowsByGuest = new Map();
  for (const r of latestEventResponses(rsvpRows)) {
    if (!rawRowsByGuest.has(r.guest_id)) rawRowsByGuest.set(r.guest_id, []);
    rawRowsByGuest.get(r.guest_id).push(r);
  }
  const eventsByGuest = new Map();
  for (const [guestId, rows] of rawRowsByGuest) {
    eventsByGuest.set(guestId, toEventResponsesShape(rows));
  }

  const guestsForTally = guests.map(g => ({
    id: g.id,
    rsvp_status: deriveRsvpStatus(eventsByGuest.get(g.id) || []),
    invite_sent_at: g.invite_sent_at,
  }));
  const totals = tallyGuestRsvp(guestsForTally);

  const newGuestIds = new Set(rsvpRows.filter(r => new Date(r.created_date) >= weekAgo).map(r => r.guest_id));
  let newAttending = 0, newDeclined = 0;
  for (const guestId of newGuestIds) {
    const status = deriveRsvpStatus(eventsByGuest.get(guestId) || []);
    if (status === 'attending') newAttending++;
    else if (status === 'declined') newDeclined++;
  }

  const pollVotes = realOnly(await adminFetch(`/apps/${BASE44_APP_ID}/entities/PollVote?q=${weddingIdQuery}`))
    .filter(v => new Date(v.created_date) >= weekAgo);
  const pollComments = realOnly(await adminFetch(`/apps/${BASE44_APP_ID}/entities/PollComment?q=${weddingIdQuery}`))
    .filter(c => new Date(c.created_date) >= weekAgo);

  const questionnaires = realOnly(await adminFetch(`/apps/${BASE44_APP_ID}/entities/Questionnaire?q=${ownerQuery}`));
  const qHashes = new Set(questionnaires.map(q => hashId(q.id)));
  const questionnaireResponsesThisWeek = allQuestionnaireResponses.filter(
    r => qHashes.has(r.questionnaire_id_hash) && new Date(r.submitted_at) >= weekAgo
  );

  const daysUntil = wedding.weddingDate
    ? Math.ceil((new Date(wedding.weddingDate) - Date.now()) / (24 * 60 * 60 * 1000))
    : null;

  return {
    coupleNames: wedding.coupleNames || [wedding.couple1Name, wedding.couple2Name].filter(Boolean).join(' & '),
    daysUntil,
    newRsvpCount: newGuestIds.size,
    newAttending,
    newDeclined,
    totals,
    pollActivity: pollVotes.length + pollComments.length,
    questionnaireActivity: questionnaireResponsesThisWeek.length,
    accountUrl: `${APP_URL}/account`,
  };
}

export default async function handler(req, res) {
  const runAt = new Date().toISOString();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (token !== cronSecret) {
      console.warn('[cron/send-weekly-digest] Rejected — invalid or missing Authorization header');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
    console.warn('[cron/send-weekly-digest] CRON_SECRET not set — skipping auth check (dev/preview only)');
  }

  if (!BASE44_ADMIN_KEY) {
    console.error('[cron/send-weekly-digest] FAILURE — BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const weekAgo = new Date(Date.now() - WEEK_MS);
  const tally = { sent: 0, skipped_pref_off: 0, skipped_no_email: 0, failed: 0 };

  let weddings;
  try {
    weddings = realOnly(await adminFetch(`/apps/${BASE44_APP_ID}/entities/WeddingDetails?limit=1000`));
  } catch (err) {
    console.error('[cron/send-weekly-digest] FAILURE — could not list WeddingDetails:', err.message);
    return res.status(500).json({ ok: false, runAt, error: err.message });
  }
  const ownerWeddings = dedupeOwners(weddings);

  // Fetched once, reused for every owner — QuestionnaireResponse.read is
  // null (unscoped) app-wide, so there's no per-owner query to make; the
  // hash-set match against each owner's own questionnaire ids happens
  // client-side in buildDigestForWedding instead.
  let allQuestionnaireResponses = [];
  try {
    allQuestionnaireResponses = realOnly(await adminFetch(`/apps/${BASE44_APP_ID}/entities/QuestionnaireResponse?limit=5000`));
  } catch (err) {
    console.error('[cron/send-weekly-digest] Could not fetch QuestionnaireResponse — questionnaire activity will show as 0 for this run:', err.message);
  }

  for (const [ownerId, wedding] of ownerWeddings) {
    let user;
    try {
      user = await getBase44User(ownerId, BASE44_ADMIN_KEY);
    } catch {
      user = null;
    }
    if (!user?.email) {
      tally.skipped_no_email++;
      continue;
    }
    const prefs = { ...DEFAULT_NOTIFICATION_PREFS, ...(user.notification_prefs || {}) };
    if (prefs.in_app_only || !prefs.weekly_digest) {
      tally.skipped_pref_off++;
      continue;
    }

    try {
      const digest = await buildDigestForWedding(wedding, allQuestionnaireResponses, weekAgo);
      if (!process.env.RESEND_API_KEY) {
        console.warn('[cron/send-weekly-digest] RESEND_API_KEY not set — skipping send for', user.email);
        tally.failed++;
        continue;
      }
      const { subject, html } = renderWeeklyDigestEmail(digest);
      const { error } = await resend.emails.send({ from: FROM, to: user.email, subject, html });
      if (error) {
        console.error(`[cron/send-weekly-digest] Send failed for ${user.email}:`, error.message || error);
        tally.failed++;
      } else {
        tally.sent++;
      }
    } catch (err) {
      console.error(`[cron/send-weekly-digest] Error building/sending digest for ${user.email}:`, err.message);
      tally.failed++;
    }
  }

  const ok = tally.failed === 0;
  console.log(`[cron/send-weekly-digest] ${ok ? 'SUCCESS' : 'COMPLETED WITH FAILURES'} — runAt=${runAt} weddings=${ownerWeddings.size} sent=${tally.sent} skipped_pref_off=${tally.skipped_pref_off} skipped_no_email=${tally.skipped_no_email} failed=${tally.failed}`);

  return res.status(200).json({ ok, runAt, weddings: ownerWeddings.size, tally });
}
