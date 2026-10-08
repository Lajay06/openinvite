/**
 * GET /api/cron/send-onboarding-emails
 *
 * Vercel Cron — runs daily at 09:00 UTC (schedule defined in vercel.json).
 *
 * Each run:
 *   1. Resolves every real user who owns a WeddingDetails record.
 *   2. Identifies users who signed up in the day-3 window (72–96 h ago)
 *      and sends the "Have you tried Ava yet?" email.
 *   3. Identifies users who signed up in the day-7 window (168–192 h ago)
 *      and sends the "Your free trial has 7 days left" email.
 *   4. Skips users already on a paid plan (plan === 'pro' | 'ultra').
 *   5. Logs a per-run summary and returns it as JSON.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * The bug this file used to have — read before touching it again
 * ─────────────────────────────────────────────────────────────────────────
 * This cron has been silently failing every run since it shipped
 * (confirmed via Vercel's live error logs, failing since at least
 * 2026-07-04): it listed Users via `Authorization: Bearer <ADMIN_KEY>`,
 * which the User entity 401s on for LIST specifically (every other
 * entity accepts this form). Switching to `?api_key=` — the fix
 * BASE44_PLATFORM_NOTES.md originally suggested — does NOT actually fix
 * it: confirmed empirically while building api/cron/send-weekly-digest.js
 * that `GET /entities/User?api_key=...` returns `200 []`, an empty array,
 * even with real users in the app. There is no working way to bulk-list
 * every User via the admin key at all — see BASE44_PLATFORM_NOTES.md's
 * "User entity bulk-listing" section for the full story.
 *
 * Fixed the same way send-weekly-digest.js was built from the start:
 * iterate WeddingDetails instead (read is null/unscoped, lists correctly
 * via the ordinary Bearer form) and resolve each owner's User record
 * individually via api/_lib/base44Admin.js's getBase44User() (the
 * already-proven single-record path). Every onboarding-email recipient
 * necessarily has a User account; most also have a WeddingDetails record
 * by the time day 3 rolls around (onboarding happens immediately after
 * signup) — a user who somehows hasn't started onboarding by day 3/7 will
 * be missed by this approach, same tradeoff send-weekly-digest.js accepts,
 * and preferable to a cron that silently sends nothing to anyone at all.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * REQUIRED ENV VARS
 * ─────────────────────────────────────────────────────────────────────────
 *
 *   CRON_SECRET        — Vercel injects this automatically. The cron
 *                        invocation sends  Authorization: Bearer {CRON_SECRET}.
 *                        Add it to Vercel project settings → Environment Variables
 *                        if you need to call the endpoint manually too.
 *
 *   BASE44_ADMIN_KEY   — A server-side-only Base44 token with read access to
 *                        all User entities in the app. Obtain from the Base44
 *                        dashboard → Settings → API Keys → Service Account.
 *                        Add to Vercel project settings → Environment Variables
 *                        (do NOT prefix with VITE_ — it must stay server-only).
 *
 *   RESEND_API_KEY     — Resend API key (already configured).
 *   VITE_BASE44_APP_ID — Base44 app ID (already configured).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * EMAIL SEQUENCE OVERVIEW
 * ─────────────────────────────────────────────────────────────────────────
 *
 *   Day 0   onboarding-day1  "Welcome to Openinvite 🎉"
 *           Triggered on signup via POST /api/on-signup.
 *
 *   Day 3   onboarding-day3  "Have you tried Ava yet? 👋"
 *           Sent by THIS cron to users whose created_date is 72–96 h ago.
 *
 *   Day 7   onboarding-day7  "Your free trial has 7 days left ⏰"
 *           Sent by THIS cron to users whose created_date is 168–192 h ago.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TIMING WINDOW RATIONALE
 * ─────────────────────────────────────────────────────────────────────────
 *
 *   The cron runs once per day (09:00 UTC). Using a 24-hour window means
 *   every user will be matched by exactly one daily run, regardless of what
 *   time of day they signed up. No user is emailed twice; no user is skipped
 *   as long as the cron runs at least once per day.
 *
 *   Day 3 window : 72 h ≤ age < 96 h   (signed up between 3–4 days ago)
 *   Day 7 window : 168 h ≤ age < 192 h (signed up between 7–8 days ago)
 */

import { Resend } from 'resend';
import { getBase44User } from '../_lib/base44Admin.js';
import { onboardingDay3Email } from '../emails/onboarding-day3.js';
import { onboardingDay7Email } from '../emails/onboarding-day7.js';
import { isExcludedAccount } from '../_lib/excludedAccounts.js';
import { dueRetentionEmail, mergeRetentionFlag, suppressesDay3, RETENTION_SHIP_DATE } from '../_lib/retentionTriggers.js';
import { setupNudgeEmail, guestsNudgeEmail, RETENTION_REPLY_TO } from '../_lib/retentionEmails.js';
import { stopEmailsUrl } from '../_lib/stopEmailsToken.js';
// THE GUEST COUNT LIVES IN ITS OWN FILE, and the reason is a guard rather
// than tidiness: tests/persistence/guest-plaintext-readers.mjs requires any
// api/ file that reads Guest rows AND dereferences a nulled PII column to
// resolve the blob through mergeGuestPii. This cron reads user.email, so
// adding a Guest read here made it match both halves of that rule and the
// guard flagged it, correctly. See api/_lib/guestCount.js.
import { countRealGuests } from '../_lib/guestCount.js';

// ─── Config ──────────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY);

const BASE44_API    = 'https://base44.app/api';
const BASE44_APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY; // server-side only, no VITE_ prefix

const FROM = 'Openinvite <hello@openinvite.com.au>';

// 24-hour windows (in hours) — ensures each user matches exactly one run
export const DAY3_MIN_H = 72;  // 3 days
export const DAY3_MAX_H = 96;  // 4 days
export const DAY7_MIN_H = 168; // 7 days
export const DAY7_MAX_H = 192; // 8 days

// Retention emails (item 2 of goals/2026-10-08-retention-emails.md) are NOT
// windowed like the two above. They are a threshold plus a sent-flag, because
// each is offered again at a later age and a window would silently drop an
// account the cron missed for a day. The thresholds and the flags live in
// api/_lib/retentionTriggers.js; RETENTION_SHIP_DATE is re-exported here so a
// reader of the cron can see the no-backfill cutoff without opening that file.
export { RETENTION_SHIP_DATE };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true if `createdDate` falls within [minHours, maxHours) ago.
 * Exported so it can be unit-tested directly with synthetic dates —
 * Base44's created_date is server-stamped, not settable on write, so this
 * boundary logic can't be exercised end-to-end by seeding aged test data.
 * @param {string|null|undefined} createdDate  ISO-8601 date string from Base44
 * @param {number} minHours
 * @param {number} maxHours
 */
export function isInWindow(createdDate, minHours, maxHours) {
  if (!createdDate) return false;
  const ageHours = (Date.now() - new Date(createdDate).getTime()) / 3_600_000;
  return ageHours >= minHours && ageHours < maxHours;
}

/** Returns true for users who are already on a paid plan — skip them. */
function isPaid(user) {
  return user.plan === 'pro' || user.plan === 'ultra';
}

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

/** One real (non-test) WeddingDetails per owner — the most recently created if an owner somehow has more than one. */
function dedupeOwners(weddings) {
  const byOwner = new Map();
  for (const w of weddings.filter(w => !w.is_test)) {
    const existing = byOwner.get(w.created_by_id);
    if (!existing || new Date(w.created_date) > new Date(existing.created_date)) {
      byOwner.set(w.created_by_id, w);
    }
  }
  return byOwner;
}

/**
 * Send a single onboarding email, catching individual failures so one bad
 * address doesn't abort the whole run.
 *
 * @param {string}   to
 * @param {string}   name
 * @param {string}   subject
 * @param {Function} htmlFn   — template function: ({ email, name }) => html string
 * @returns {{ ok: boolean, id?: string, error?: string }}
 */
async function sendEmail(to, name, subject, htmlFn) {
  try {
    const html   = htmlFn({ email: to, name: name || '' });
    const result = await resend.emails.send({ from: FROM, to, subject, html });
    return { ok: true, id: result.data?.id };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Send one retention email, recording that it was sent BEFORE sending it.
 *
 * THE ORDER IS THE POINT, and it is the owner's ruling: "Record the timestamp
 * before sending so a crash cannot double-send." A crash between the write and
 * the send therefore loses one email rather than sending it twice on the next
 * run, and a failed send is never retried. That is the right trade for mail a
 * couple did not ask for, and it is why the failure is logged loudly: nobody
 * should have to infer it from a missing email.
 *
 * @returns {{ ok: boolean, skipped?: string, error?: string }}
 */
async function sendRetention({ user, flag, email, sentAt }) {
  // THE FLAG IS MERGED, NOT REPLACED. A PUT of { [flag]: at } alone would
  // erase the other three and the account would walk the sequence again.
  const retentionEmails = mergeRetentionFlag(user.retentionEmails, flag, sentAt);
  const write = await fetch(
    `${BASE44_API}/apps/${BASE44_APP_ID}/entities/User/${encodeURIComponent(user.id)}?api_key=${BASE44_ADMIN_KEY}`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ retentionEmails }) },
  );
  if (!write.ok) {
    const body = await write.text().catch(() => '');
    // NOTHING IS SENT IF THE RECORD DID NOT MOVE. Sending now would mean no
    // record of it, and the same email again tomorrow, and the day after.
    console.error(`[cron] retention ${flag} NOT sent — could not record it (${write.status}): ${body.slice(0, 160)}`);
    return { ok: false, error: `record failed (${write.status})` };
  }

  const build = email === 'setup' ? setupNudgeEmail : guestsNudgeEmail;
  let rendered;
  try {
    rendered = build({ name: user.full_name, createdDate: user.created_date, stopUrl: stopEmailsUrl(user.id) });
  } catch (err) {
    console.error(`[cron] retention ${flag} could not be rendered: ${err.message}`);
    return { ok: false, error: err.message };
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: user.email,
      replyTo: RETENTION_REPLY_TO,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      headers: rendered.headers,
    });
    return { ok: true };
  } catch (err) {
    // ALREADY RECORDED, DELIBERATELY NOT RETRIED. See the note above.
    console.error(`[cron] retention ${flag} recorded but the send failed: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const runAt = new Date().toISOString();
  console.log('[cron/send-onboarding-emails] run started at', runAt);

  // Vercel Cron always uses GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Auth: verify CRON_SECRET ───────────────────────────────────────────────
  // Vercel automatically adds  Authorization: Bearer {CRON_SECRET}  to every
  // cron invocation. We also honour manual calls that supply the same secret.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth  = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (token !== cronSecret) {
      console.warn('[cron] Rejected — invalid or missing Authorization header');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    // Fail closed in production — never let this run unauthenticated, same
    // rule webhooks/stripe.js already applies. Vercel injects CRON_SECRET
    // automatically for its own scheduled invocations; a production
    // deployment missing it is a config error, not a reason to proceed.
    console.error('[cron] Refusing to run in production — CRON_SECRET is not set');
    return res.status(401).json({ error: 'CRON_SECRET is required in production' });
  } else {
    // No secret configured — allow in dev/preview only; warn loudly
    console.warn('[cron] CRON_SECRET not set — skipping auth check (dev/preview only)');
  }

  if (!BASE44_ADMIN_KEY) {
    console.error('[cron/send-onboarding-emails] FAILURE — BASE44_ADMIN_KEY env var is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  // ── Resolve every real owner via WeddingDetails, then their User record ───
  let ownerWeddings;
  try {
    const weddings = await adminFetch(`/apps/${BASE44_APP_ID}/entities/WeddingDetails?limit=1000`);
    ownerWeddings = dedupeOwners(weddings);
    console.log(`[cron] Resolved ${ownerWeddings.size} distinct wedding owner(s)`);
  } catch (err) {
    console.error('[cron/send-onboarding-emails] FAILURE — could not list WeddingDetails:', err.message);
    return res.status(500).json({ ok: false, runAt, error: err.message });
  }

  // ── Per-run counters ───────────────────────────────────────────────────────
  const tally = {
    day3: { sent: 0, skipped_paid: 0, failed: 0, no_email: 0, skipped_no_slug: 0 },
    day7: { sent: 0, skipped_paid: 0, failed: 0, no_email: 0 },
    retention: { sent: 0, failed: 0, setup24h: 0, setupDay4: 0, guests24h: 0, guestsDay5: 0 },
    excluded: 0,
  };

  // One timestamp for the whole run, so every retentionEmails flag written by
  // this run reads as the same send.
  const sentAt = new Date().toISOString();

  // ── Process each owner ──────────────────────────────────────────────────────
  for (const ownerId of ownerWeddings.keys()) {
    let user;
    try {
      user = await getBase44User(ownerId, BASE44_ADMIN_KEY);
    } catch {
      user = null;
    }
    if (!user) continue;

    const email = user.email;
    const name  = user.full_name || '';

    if (!email) {
      // Users without email addresses can't receive email — skip silently
      tally.day3.no_email++;
      tally.day7.no_email++;
      continue;
    }

    // ── THE OWNER'S OWN ACCOUNTS, AND THE SMOKE ALIASES ────────────────────
    //
    // Owner ruling, item 0 of goals/2026-10-08-retention-emails.md: one list
    // in api/_lib, used by EVERY cron. This cron had no such exclusion before,
    // so every run has been mailing the owner alongside real couples. It
    // guards the two trial emails as well as the retention ones, which is what
    // "every cron" means.
    if (isExcludedAccount(email)) {
      tally.excluded++;
      continue;
    }

    const wedding = ownerWeddings.get(ownerId);

    // ── RETENTION, FIRST BUT LOWEST PRIORITY ──────────────────────────────
    //
    // "Never two emails to one account on the same run" (owner ruling), so
    // whichever of the three is sent, the others are skipped.
    //
    // PRECEDENCE: THE TRIAL EMAILS WIN. Day 3 and day 7 are 24-hour windows
    // that occur exactly once; miss one and it is never sent. A retention
    // email is a threshold plus a flag, so one skipped today is offered again
    // tomorrow. Suppressing the recoverable mail to protect the
    // unrecoverable mail is the only ordering that loses nothing.
    const inDay3 = isInWindow(user.created_date, DAY3_MIN_H, DAY3_MAX_H) && !suppressesDay3({ wedding });
    const inDay7 = isInWindow(user.created_date, DAY7_MIN_H, DAY7_MAX_H);

    if (!inDay3 && !inDay7) {
      let guestCount = 0;
      try {
        guestCount = await countRealGuests({ ownerId, appId: BASE44_APP_ID, adminKey: BASE44_ADMIN_KEY });
      } catch (err) {
        // A FAILED COUNT IS NOT AN EMPTY GUEST LIST. Treating it as zero would
        // mail a couple who has a hundred guests, so the account is skipped
        // for this run and tried again tomorrow.
        console.error(`[cron] retention skipped — could not count guests for one owner: ${err.message}`);
        guestCount = -1;
      }
      if (guestCount >= 0) {
        const due = dueRetentionEmail({ user, wedding, guestCount });
        if (due) {
          const r = await sendRetention({ user, flag: due.flag, email: due.email, sentAt });
          if (r.ok) {
            console.log(`[cron] retention ${due.flag} sent → ${email}`);
            tally.retention.sent++;
            tally.retention[due.flag]++;
          } else {
            tally.retention.failed++;
          }
        }
      }
    }

    // ── Day-3 email ──────────────────────────────────────────────────────────
    //
    // SUPPRESSED FOR AN ACCOUNT THAT NEVER FINISHED SETUP (owner ruling): it
    // invites the couple to try Ava, and Ava has nothing to read yet.
    if (isInWindow(user.created_date, DAY3_MIN_H, DAY3_MAX_H) && suppressesDay3({ wedding })) {
      tally.day3.skipped_no_slug++;
    }
    if (inDay3) {
      if (isPaid(user)) {
        console.log(`[cron] day3 skip (paid plan: ${user.plan}): ${email}`);
        tally.day3.skipped_paid++;
      } else {
        const r = await sendEmail(
          email, name,
          'Have you tried Ava yet?',
          onboardingDay3Email
        );
        if (r.ok) {
          console.log(`[cron] day3 sent → ${email} | id: ${r.id}`);
          tally.day3.sent++;
        } else {
          console.error(`[cron] day3 failed → ${email} | ${r.error}`);
          tally.day3.failed++;
        }
      }
    }

    // ── Day-7 email ──────────────────────────────────────────────────────────
    // NOT suppressed by a missing slug: day 7 is about the trial clock, which
    // runs whether or not setup finished (owner ruling: "then day 7 as today").
    if (inDay7) {
      if (isPaid(user)) {
        console.log(`[cron] day7 skip (paid plan: ${user.plan}): ${email}`);
        tally.day7.skipped_paid++;
      } else {
        const r = await sendEmail(
          email, name,
          'Your free trial has 7 days left',
          onboardingDay7Email
        );
        if (r.ok) {
          console.log(`[cron] day7 sent → ${email} | id: ${r.id}`);
          tally.day7.sent++;
        } else {
          console.error(`[cron] day7 failed → ${email} | ${r.error}`);
          tally.day7.failed++;
        }
      }
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const ok = tally.day3.failed === 0 && tally.day7.failed === 0 && tally.retention.failed === 0;
  console.log(`[cron/send-onboarding-emails] ${ok ? 'SUCCESS' : 'COMPLETED WITH FAILURES'} —`, JSON.stringify({ runAt, owners: ownerWeddings.size, tally }));

  return res.status(200).json({
    ok,
    runAt,
    owners: ownerWeddings.size,
    tally,
  });
}
