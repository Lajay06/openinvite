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

import { coupleDisplayName } from '../_lib/coupleNames.js';
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

/**
 * Urgency-scored "This week" suggestions — each rule's condition is checked
 * independently, only rules whose condition is actually true contribute an
 * entry, and the caller caps the result at 4 (most urgent first). Base
 * scores are a rough priority ordering between rule types (outstanding
 * RSVPs affect headcount planning most broadly, so it's weighted highest);
 * the count/deadline terms added on top are just tie-breaks within that.
 */
async function buildRecommendedActions({ ownerQuery, wedding, guests, eventsByGuest, totals, daysUntil, APP_URL }) {
  const actions = [];

  const pendingShare = totals.total > 0 ? totals.pending / totals.total : 0;
  if (totals.pending > 0 && pendingShare >= 0.2 && (daysUntil == null || daysUntil > 0)) {
    actions.push({
      score: 100 + pendingShare * 20 + (daysUntil != null && daysUntil <= 30 ? 30 : daysUntil != null && daysUntil <= 90 ? 10 : 0),
      text: `A good week to send RSVP reminders. ${totals.pending} guest${totals.pending === 1 ? '' : 's'} ${totals.pending === 1 ? "hasn't" : "haven't"} responded yet.`,
      url: `${APP_URL}/Guests`,
    });
  }

  let mealMissingCount = 0;
  for (const g of guests) {
    const rows = eventsByGuest.get(g.id) || [];
    if (deriveRsvpStatus(rows) === 'attending' && rows.some(r => r.status === 'yes' && !r.meal_choice)) mealMissingCount++;
  }
  if (mealMissingCount > 0) {
    actions.push({
      score: 50 + Math.min(mealMissingCount, 20),
      text: `A good week to collect meal choices. ${mealMissingCount} attending guest${mealMissingCount === 1 ? '' : 's'} still ${mealMissingCount === 1 ? 'needs' : 'need'} to pick one.`,
      url: `${APP_URL}/Guests`,
    });
  }

  const tables = realOnly(await adminFetch(`/apps/${BASE44_APP_ID}/entities/Table?q=${ownerQuery}`));
  if (tables.length > 0) {
    let unassigned = 0;
    for (const g of guests) {
      const rows = eventsByGuest.get(g.id) || [];
      if (deriveRsvpStatus(rows) === 'attending' && !g.table_assignment) unassigned++;
    }
    if (unassigned > 0) {
      actions.push({
        score: 45 + Math.min(unassigned, 20),
        text: `A good week to finish seating. ${unassigned} attending guest${unassigned === 1 ? '' : 's'} still ${unassigned === 1 ? 'needs' : 'need'} a table.`,
        url: `${APP_URL}/Seating`,
      });
    }
  }

  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const notes = realOnly(await adminFetch(`/apps/${BASE44_APP_ID}/entities/Note?q=${encodeURIComponent(JSON.stringify({ created_by_id: wedding.created_by_id, view_type: 'todo' }))}`));
  const dueTasks = notes.filter(n => n.status !== 'Done' && n.due_date && new Date(n.due_date) <= in7Days);
  if (dueTasks.length > 0) {
    actions.push({
      score: 90 + Math.min(dueTasks.length, 20),
      text: `A good week to close out your checklist. ${dueTasks.length} task${dueTasks.length === 1 ? '' : 's'} ${dueTasks.length === 1 ? 'is' : 'are'} due this week.`,
      url: `${APP_URL}/TodoList`,
    });
  }

  // Budget has no forward-looking due date (only payment_date once paid), so
  // VendorTask.due_date is the closest real signal for "a payment or vendor
  // item is coming up" — it's managed from the Vendors page, not Budget.
  const vendorTasks = realOnly(await adminFetch(`/apps/${BASE44_APP_ID}/entities/VendorTask?q=${ownerQuery}`));
  const dueVendorTasks = vendorTasks.filter(t => !t.completed && t.due_date && new Date(t.due_date) <= in7Days);
  if (dueVendorTasks.length > 0) {
    actions.push({
      score: 85 + Math.min(dueVendorTasks.length, 20),
      text: `A good week to check in with vendors. ${dueVendorTasks.length} vendor task${dueVendorTasks.length === 1 ? '' : 's'} ${dueVendorTasks.length === 1 ? 'is' : 'are'} due this week.`,
      url: `${APP_URL}/Vendors`,
    });
  }

  return actions.sort((a, b) => b.score - a.score).slice(0, 4).map(({ text, url }) => ({ text, url }));
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
    if (!rawRowsByGuest.has(r.guest_id_hash)) rawRowsByGuest.set(r.guest_id_hash, []);
    rawRowsByGuest.get(r.guest_id_hash).push(r);
  }
  const eventsByGuest = new Map();
  for (const [guestId, rows] of rawRowsByGuest) {
    eventsByGuest.set(guestId, toEventResponsesShape(rows));
  }

  const guestsForTally = guests.map(g => ({
    id: g.id,
    rsvp_status: deriveRsvpStatus(eventsByGuest.get(hashId(g.id)) || []),
    invite_sent_at: g.invite_sent_at,
  }));
  const totals = tallyGuestRsvp(guestsForTally);

  const newGuestIds = new Set(rsvpRows.filter(r => new Date(r.created_date) >= weekAgo).map(r => r.guest_id_hash));
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

  const recommendedActions = await buildRecommendedActions({
    ownerQuery, wedding, guests, eventsByGuest, totals, daysUntil, APP_URL,
  });

  return {
    coupleNames: coupleDisplayName(wedding),
    daysUntil,
    newRsvpCount: newGuestIds.size,
    newAttending,
    newDeclined,
    totals,
    pollActivity: pollVotes.length + pollComments.length,
    questionnaireActivity: questionnaireResponsesThisWeek.length,
    recommendedActions,
    accountUrl: `${APP_URL}/account`,
  };
}

export default async function handler(req, res) {
  // PARKED — but read the correction below before acting on the reason.
  //
  // CORRECTED 2026-08-18 (Guest family, Track A): the original note said
  // Guest.read "is now owner-scoped ({created_by_id: "{{user.id}}"}), which
  // the admin key below can never satisfy". That premise is FALSE and appears
  // never to have been true: Guest.read is `null` in the live schema, verified
  // by listing 206 Guest rows from an unrelated authenticated account. The
  // admin-key reads at line ~163 would therefore work fine, and the failure
  // this job was parked to avoid — silently empty guest counts producing
  // misleading digest emails — does not occur for that reason.
  //
  // THE REAL REASON THIS IS PARKED (advisor decision, 2026-08-18): product
  // timing, not RLS. A cron that emails real couples does not come on before
  // launch. The collaborator digest is on the post-launch restore list and
  // this job restores with it — there is no code defect to fix first.
  //
  // Both facts are recorded deliberately. The original note gave a technical
  // reason that was false, which is worse than no note: anyone auditing this
  // job would have gone looking for an RLS problem that does not exist, and
  // anyone wanting the digest back would have thought it was blocked on one.
  // This is the third file found asserting that same false property; see
  // tests/persistence/rls-comment-claims.mjs, which now fails CI on a fourth.
  //
  // Unscheduled in vercel.json; this early return is belt-and-suspenders in
  // case of a stale/manual trigger.
  //
  // Rebuild path (post-launch fast-follow, not before): a Base44-hosted
  // scheduled automation using base44.asServiceRole (see
  // BASE44_PLATFORM_NOTES.md's "Hosted functions" section) — the only real
  // RLS bypass Base44 offers, available only inside a hosted function, not
  // this Vercel cron. Automations are capped at a 3-minute max run, so the
  // current single-pass "list every WeddingDetails, loop" shape needs to
  // become paginated across runs, not ported as-is.
  return res.status(200).json({ ok: true, skipped: 'parked — see comment in this file' });

  // eslint-disable-next-line no-unreachable
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
  } else if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    // Fail closed in production — same rule webhooks/stripe.js already
    // applies. Vercel injects CRON_SECRET automatically for its own
    // scheduled invocations; a production deployment missing it is a
    // config error, not a reason to proceed.
    console.error('[cron/send-weekly-digest] Refusing to run in production — CRON_SECRET is not set');
    return res.status(401).json({ error: 'CRON_SECRET is required in production' });
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
    // NOT a Guest-PII reader — do not "fix" this with mergeGuestPii.
    // Every .email in this file is user.email — the COUPLE'S own address, from
    // a User row, used to send them the digest. Guest rows are read here only
    // for counts and tallies, never for a guest's contact details. Flagged by
    // the reader guard because the file both reads Guest rows and dereferences
    // .email; allowlisted in tests/persistence/guest-plaintext-readers.mjs
    // with the reason recorded here rather than only in the test.
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
