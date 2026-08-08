/**
 * scripts/reset-test-account.mjs
 *
 * The standard test-account reset tool for this repo. Resets ANY permitted
 * test account to pre-onboarding state (deletes wedding data, clears
 * onboarding/plan flags) so signup/onboarding/plan-selection can be walked
 * repeatedly.
 *
 * Usage:
 *   node scripts/reset-test-account.mjs <email> [password]
 *   npm run reset:test -- <email> [password]
 *
 * Password resolution: the CLI arg wins if given; otherwise read from the
 * RESET_TEST_PASSWORD env var (shell env or .env.local, gitignored).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * SAFETY LOCK — EMAIL MUST BE A +ALIAS OF A KNOWN TEST ACCOUNT. NEVER BYPASS.
 *
 * This script deletes wedding data owned by the authenticated account. That
 * is a destructive, irreversible action. Running it against a real couple's
 * account would permanently destroy their wedding data.
 *
 * The guard below runs on the raw CLI string, BEFORE any network call is
 * made, and requires the email's local part to be a `+alias` of exactly
 * `jaygalaxy23` or `la.jay06` at `@gmail.com` — i.e. it must match:
 *
 *     /^(jaygalaxy23|la\.jay06)\+[^@+]+@gmail\.com$/i
 *
 * INTENTIONAL TIGHTENING vs the old version of this script: the two bare
 * addresses (`jaygalaxy23@gmail.com`, `la.jay06@gmail.com` — no `+alias`)
 * are now REFUSED, even though the old script was hard-locked to exactly
 * `jaygalaxy23@gmail.com` with no alias requirement at all. Those two bare
 * inboxes are the real accounts other long-lived local credentials
 * (BASE44_TEST_EMAIL, CAPTURE_TEST_EMAIL, the persistence-suite default)
 * point at day to day — this tool must never be able to touch them by
 * accident, so it now only accepts a same-inbox `+alias` derivative
 * (`jaygalaxy23+whatever@gmail.com`, `la.jay06+whatever@gmail.com`) minted
 * specifically for a one-off reset/throwaway account. Any other email
 * domain or local part is refused outright.
 *
 * After the guard passes and login succeeds, the AUTHENTICATED email
 * (from the login response, then again from a fresh GET /entities/User/me)
 * is independently re-checked against the same regex — belt-and-braces,
 * so a token swap or a login response lying about its own email can't slip
 * through. There is NO flag, argument, or env var that bypasses either
 * check. If you need this tool to accept a different inbox, don't add a
 * bypass — widen the regex deliberately and re-read this whole comment
 * block first.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Load .env.local ───────────────────────────────────────────────────────────

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '..', '.env.local');

try {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
} catch { /* rely on shell env */ }

const APP_ID = process.env.VITE_BASE44_APP_ID || '68731d183f075e406eda2236';
const BASE   = 'https://base44.app/api';

// ── CLI args ────────────────────────────────────────────────────────────────

const CLI_EMAIL    = process.argv[2];
const CLI_PASSWORD = process.argv[3];
const EMAIL    = CLI_EMAIL;
const PASSWORD = CLI_PASSWORD || process.env.RESET_TEST_PASSWORD;

// ── The ONE pattern of email this script is allowed to run against ────────────
// See the header comment above for the full rationale. Do not widen this
// without re-reading it.
const ALLOWED_EMAIL_RE = /^(jaygalaxy23|la\.jay06)\+[^@+]+@gmail\.com$/i;

// ── Entities owned by the couple's own account (created_by_id, or for
// Notification the custom recipient_user_id field — see BASE44_PLATFORM_NOTES.md
// "The built-in User entity is a different subsystem entirely" and
// tests/persistence/notifications.mjs's header for why Notification uses a
// different scoping field). WeddingDetails is handled separately (step 4,
// prints embedded-data note + is the source of wedding ids used to scope
// GuestContactSubmission in step 5).
//
// IMPORTANT — many of these entities (confirmed via list_entity_schemas /
// the base44/entities/*.jsonc mirrors) have `read: null` (unrestricted) RLS,
// e.g. Guest, Photo, Hotel, Questionnaire, WebsiteTheme, ThemeDetails,
// Invitation, Music, CustomGift, RegistryItem/Product, LiveStream,
// StreamChat, StoryMilestone, CustomEventPage, GuestMessage. A plain
// unfiltered GET on any of these returns EVERY couple's records
// platform-wide, not just this account's — confirmed empirically against
// WeddingDetails specifically while building this version of the script
// (a real GET returned 13 WeddingDetails rows across 7 distinct
// created_by_id owners for a single test-account token). Their DELETE RLS
// stays owner-scoped (`created_by_id: {{user.id}}`, or `user_condition:
// {role:'admin'}` for WebsiteTheme/ThemeDetails specifically — a normal
// test account is never admin, so those two always report 0 deleted, by
// design, not a bug), so Base44 itself blocks any attempt to delete another
// account's row — but blindly attempting those doomed deletes anyway is
// wasteful and produces misleading "attempted/deleted" counts. This script
// filters every fetched row to `row[ownerField] === me.id` BEFORE issuing
// any DELETE, for every entity below, closing that gap.
const SEPARATE_ENTITIES = [
  { entity: 'Guest' },
  { entity: 'Budget' },
  { entity: 'Vendor' },
  { entity: 'Schedule' },
  { entity: 'MoodboardItem' },
  { entity: 'GuestMessage' },
  { entity: 'Photo' },
  { entity: 'LiveStream' },
  { entity: 'StreamChat' },
  { entity: 'StoryMilestone' },
  { entity: 'WebsiteTheme' },
  { entity: 'CustomEventPage' },
  { entity: 'Invitation' },
  { entity: 'Note' },
  { entity: 'Task' },
  { entity: 'Table' },
  { entity: 'VenueAsset' },
  { entity: 'VowSpeech' },
  { entity: 'RegistryItem' },
  { entity: 'RegistryProduct' },
  { entity: 'CustomGift' },
  { entity: 'ReceivedGift' },
  { entity: 'VendorLog' },
  { entity: 'VendorTask' },
  { entity: 'Collaborator' },
  { entity: 'Music' },
  { entity: 'ThemeDetails' }, // retired (nothing writes to it); included for belt-and-braces
  { entity: 'Hotel' },        // added — confirmed owner-created via src/components/guest-experience/HotelRecommendations.jsx
  { entity: 'Questionnaire' },// added — confirmed owner-created via src/components/games/GamesManager.jsx
  { entity: 'Notification', ownerField: 'recipient_user_id' }, // added — scoped by recipient, not created_by_id (admin-key-created); see tests/persistence/notifications.mjs
];

// ── Entities that CANNOT be deleted by the couple's own token — verified,
// not assumed. Not skipped for lack of trying; skipped because it's
// structurally impossible.
//
// All six are the create:null + hashed-identifier append-only pattern
// (BASE44_PLATFORM_NOTES.md): guest-facing endpoints write these rows using
// BASE44_ADMIN_KEY (or, for CollaboratorGrant, whichever party's token
// happened to call the endpoint), and Base44's admin key/anonymous callers
// always stamp a freshly-created record's created_by_id as the literal
// string 'anonymous' (confirmed in api/collaborator-guests.js's header and
// re-confirmed directly in scripts/cleanup-stray-test-records.mjs +
// tests/persistence/anonymous-endpoints.mjs). Every one of these entities'
// own delete RLS is `{ created_by_id: '{{user.id}}' }` — no real user id is
// ever the string 'anonymous', so that condition can never be satisfied by
// ANY credential, including a fresh, correctly-scoped, real user token, and
// including BASE44_ADMIN_KEY itself (verified directly per the two files
// above). This is not something a client-side query filter can work around
// — it is enforced server-side by Base44's RLS engine.
//
//   RsvpResponse         — guest RSVP submissions (rsvp-submit.js etc.)
//   PollVote              — guest poll votes (wedding-poll-vote.js, rsvp-poll-vote.js)
//   PollComment            — guest poll comments (wedding-poll-comment.js)
//   SongRequest            — guest song requests (song-request-submit.js)
//   QuestionnaireResponse  — guest questionnaire answers (questionnaire-answer-submit.js)
//   CollaboratorGrant      — collaborator accept/revoke events (collaborator-accept.js).
//     Nuance: create RLS is null and this one IS created using the
//     accepting collaborator's own bearer token (not the admin key —
//     see collaborator-accept.js's header), so created_by_id is a real
//     user id, not 'anonymous'. If this test account has ever accepted a
//     collaboration invite on someone ELSE's wedding, its own grant rows
//     are technically deletable via its own token. This script does not
//     special-case that: read RLS is also null (platform-wide, unscoped)
//     for this entity, so fetching it at all means fetching every
//     collaborator relationship on the whole platform just to filter
//     client-side for a rare edge case. Deliberately left un-fetched,
//     consistent with the other five above — not a data-safety concern
//     either way (delete RLS still protects it), just scope discipline.
//
// NOTE: this list previously included SongRequest as an *active* delete
// target in this script's SEPARATE_ENTITIES (pre-generalization version).
// That was already a latent no-op: every delete attempt against it was
// silently swallowed by the per-row catch, so it never actually deleted
// anything — just wasted a GET against a platform-wide, unscoped table
// every run. Moved here where it belongs, with the reason documented
// instead of silently absorbed by a catch block.
const SKIP_ENTITIES = [
  { entity: 'RsvpResponse', reason: 'guest-submitted, append-only (create:null); delete RLS requires created_by_id === your id, but admin-key-created rows are stamped created_by_id:"anonymous" — never satisfiable by any credential' },
  { entity: 'PollVote', reason: 'guest-submitted, append-only (create:null); same created_by_id:"anonymous" wall as RsvpResponse' },
  { entity: 'PollComment', reason: 'guest-submitted, append-only (create:null); same created_by_id:"anonymous" wall as RsvpResponse' },
  { entity: 'SongRequest', reason: 'guest-submitted, append-only (create:null); same created_by_id:"anonymous" wall as RsvpResponse — previously listed as an active delete target in this script, but that was always a silent no-op' },
  { entity: 'QuestionnaireResponse', reason: 'guest-submitted, append-only (create:null); same created_by_id:"anonymous" wall as RsvpResponse' },
  { entity: 'CollaboratorGrant', reason: 'append-only event log (create:null); usually created by the OTHER party\'s token (the invitee accepting, not the wedding owner) and read RLS is platform-wide unscoped — skipped to avoid fetching every collaboration relationship on the platform for a rare, non-destructive edge case' },
];

// ── GuestContactSubmission — special-cased, not a normal SEPARATE_ENTITIES
// row and not a SKIP_ENTITIES row either.
//
// Verified via base44/entities/GuestContactSubmission.jsonc + reading
// api/collect-guest-contact.js: this entity's RLS is
// { create: null, read: null, update: null, delete: null } — every
// operation is FULLY UNRESTRICTED, not owner-scoped at all (unlike every
// other append-only guest-submission entity above, which at least has
// delete gated by created_by_id even if that gate can never be satisfied).
// That means:
//   - it genuinely CAN be deleted by this account's own token (unlike the
//     SKIP_ENTITIES group) — so it doesn't belong there;
//   - but a plain unfiltered GET returns literally every wedding's
//     submissions platform-wide, and (because delete is also unrestricted)
//     a naive "delete everything the GET returns" loop would actually
//     delete OTHER real couples' guest contact submissions — unlike every
//     entity in SEPARATE_ENTITIES, where Base44's own delete RLS backstops
//     a leaky read. There is no such backstop here.
//
// So this entity is scoped manually by `wedding_id`, using the wedding ids
// captured from this account's OWN WeddingDetails records in step 4, before
// those records are deleted.
const GUEST_CONTACT_SUBMISSION_ENTITY = 'GuestContactSubmission';

// ── User fields reset to a fresh-signup state ─────────────────────────────────
// onboardingCompleted / onboarding_completed: the onboarding gate (camelCase
//   is what Onboarding.jsx/Dashboard.jsx actually read; snake_case cleared
//   too, belt-and-braces, same as the original script).
// onboardingPath: written by Onboarding.jsx on completion
//   (`updateMe({ onboardingCompleted: true, onboardingPath: path })`) —
//   src/pages/DevReset.jsx already clears this alongside onboardingCompleted
//   for the same "walk onboarding fresh" reason.
// plan_step_completed: written by ChoosePlan.jsx
//   (`markPlanStepDone()` on every path — free/pro/ultra) and read by
//   `isPastPlanStep()` as one of three gates that skip the plan-choice
//   screen entirely. Must be cleared or a reset account would skip
//   ChoosePlan even with onboardingCompleted/plan cleared.
// plan / planActivatedAt: written by the Stripe webhook via
//   api/_lib/base44Admin.js's writeBase44UserPlan (api/webhooks/stripe.js is
//   NOT touched by this script — this only resets the User record's own
//   already-written field to a cleared state, same as any other field reset
//   here).
const USER_RESET_FIELDS = {
  onboardingCompleted: false,
  onboarding_completed: false,   // legacy snake_case, belt-and-braces
  onboardingPath: null,
  plan_step_completed: false,
  plan: null,
  planActivatedAt: null,
  trialStartedAt: null,          // so a reset account's trial clock restarts on the next "Start free"
};

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${path} → HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   Test account reset — Openinvite                   ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  if (!EMAIL) {
    console.error('✗ Usage: node scripts/reset-test-account.mjs <email> [password]');
    console.error('         (or: npm run reset:test -- <email> [password])');
    console.error('  Password can also come from RESET_TEST_PASSWORD in .env.local / shell env.');
    process.exit(1);
  }

  // ── 1. SAFETY GUARD — on the raw string, before any network call ────────────
  process.stdout.write('  Checking email against the allowed test-account pattern… ');
  if (!ALLOWED_EMAIL_RE.test(EMAIL)) {
    console.error('\n');
    console.error(`${'═'.repeat(60)}`);
    console.error('  ⛔ SAFETY GUARD TRIGGERED — REFUSING TO RUN');
    console.error(`     Given email      : ${EMAIL}`);
    console.error(`     Required pattern : ${ALLOWED_EMAIL_RE}`);
    console.error('');
    console.error('  This script only runs against a "+alias" of jaygalaxy23@gmail.com');
    console.error('  or la.jay06@gmail.com (e.g. jaygalaxy23+throwaway@gmail.com).');
    console.error('  The two BARE addresses (no +alias) are refused on purpose — they');
    console.error('  are real, long-lived credentials other tooling depends on.');
    console.error('  There is no flag or env var that bypasses this check.');
    console.error(`${'═'.repeat(60)}\n`);
    process.exit(1);
  }
  console.log('✓\n');

  if (!PASSWORD) {
    console.error('✗ No password given. Pass it as a second CLI argument or set RESET_TEST_PASSWORD.');
    process.exit(1);
  }

  // ── 2. Authenticate ─────────────────────────────────────────────────────────
  process.stdout.write('  Authenticating… ');
  let token, meEmail;
  try {
    const authRes = await api('POST', `/apps/${APP_ID}/auth/login`, { email: EMAIL, password: PASSWORD });
    token   = authRes.access_token;
    meEmail = authRes.user?.email;
    if (!token)   throw new Error('No access_token in response');
    if (!meEmail) throw new Error('No user.email in login response');
    console.log(`✓  (${meEmail})\n`);
  } catch (err) {
    console.error(`\n✗ Login failed: ${err.message}`);
    process.exit(1);
  }

  // ── 3. SAFETY GUARD — re-verified against the AUTHENTICATED identity ────────
  // Belt-and-braces: both the login response email AND a fresh, independent
  // GET /entities/User/me must satisfy the same pattern as step 1.
  process.stdout.write('  Re-verifying authenticated identity (safety guard)… ');
  let me;
  try {
    me = await api('GET', `/apps/${APP_ID}/entities/User/me`, undefined, token);
  } catch (err) {
    console.error(`\n✗ Could not call /entities/User/me: ${err.message}`);
    process.exit(1);
  }

  const confirmedEmail = me?.email ?? meEmail;
  if (!confirmedEmail) {
    console.error('\n✗ Could not verify account email. Refusing to proceed.');
    process.exit(1);
  }

  if (!ALLOWED_EMAIL_RE.test(confirmedEmail) || !ALLOWED_EMAIL_RE.test(meEmail)) {
    console.error(`\n${'═'.repeat(60)}`);
    console.error('  ⛔ SAFETY GUARD TRIGGERED — REFUSING TO RESET');
    console.error(`     Login response email : ${meEmail}`);
    console.error(`     /entities/User/me email : ${confirmedEmail}`);
    console.error(`     Required pattern        : ${ALLOWED_EMAIL_RE}`);
    console.error('');
    console.error('  The authenticated identity does not match the allowed pattern.');
    console.error('  This should be unreachable given the step-1 guard already passed —');
    console.error('  if you see this, something about the login response is unexpected.');
    console.error('  Refusing to touch any data. No bypass exists.');
    console.error(`${'═'.repeat(60)}\n`);
    process.exit(1);
  }
  if (!me?.id) {
    console.error('\n✗ Could not resolve authenticated user id. Refusing to proceed.');
    process.exit(1);
  }

  console.log(`✓  ${confirmedEmail}  (id=${me.id})\n`);

  const summary = { deleted: {}, skipped: [] };

  // ── 4. Delete WeddingDetails ──────────────────────────────────────────────────
  //
  // This is the central record. Deleting it takes all embedded data with it:
  // theme.*, polls[], qna[], pre/postWeddingEvents[], mainCeremony, reception,
  // guestSuiteAccommodation, guestSuiteTransport, weddingPolicies,
  // emergencyContacts, dayVendorContacts, experienceGuide, pageSections, etc.
  //
  // WeddingDetails.read RLS is null (unrestricted) — see the SEPARATE_ENTITIES
  // comment above. Rows are filtered to created_by_id === me.id BEFORE any
  // delete is attempted, both for correctness (accurate counts) and so a
  // 403 on a foreign row can never abort the whole run. The surviving
  // wedding ids are captured here — GuestContactSubmission (step 5) needs
  // them, and WeddingDetails itself is gone by the time step 5 runs.
  process.stdout.write('  Deleting WeddingDetails record(s)… ');
  const weddingIds = [];
  try {
    const res = await api('GET', `/apps/${APP_ID}/entities/WeddingDetails`, undefined, token);
    const rawRows = unwrapList(res);
    const ownedRows = rawRows.filter(r => r.created_by_id === me.id);
    const foreignCount = rawRows.length - ownedRows.length;

    if (ownedRows.length === 0) {
      console.log(`✓  none found (already clean)${foreignCount ? `  [${foreignCount} other-account record(s) correctly excluded]` : ''}`);
    } else {
      let deleted = 0;
      for (const row of ownedRows) {
        weddingIds.push(row.id);
        try {
          await api('DELETE', `/apps/${APP_ID}/entities/WeddingDetails/${row.id}`, undefined, token);
          deleted++;
        } catch (err) {
          console.error(`\n    ⚠️  Failed to delete WeddingDetails ${row.id}: ${err.message}`);
        }
      }
      console.log(`✓  deleted ${deleted}/${ownedRows.length} record(s)  [all embedded data removed]${foreignCount ? `  (${foreignCount} other-account record(s) correctly excluded)` : ''}`);
      summary.deleted.WeddingDetails = deleted;
    }
  } catch (err) {
    console.error(`\n✗ WeddingDetails delete failed: ${err.message}`);
    process.exit(1);
  }

  // ── 5. GuestContactSubmission — scoped by wedding_id, not created_by_id ──────
  // See the header comment for why this can't use the SEPARATE_ENTITIES loop
  // (fully unrestricted RLS on every operation) nor the SKIP_ENTITIES list
  // (it genuinely is deletable, just not owner-scoped).
  console.log('\n  Deleting GuestContactSubmission (scoped by wedding_id):\n');
  if (weddingIds.length === 0) {
    console.log(`    ${GUEST_CONTACT_SUBMISSION_ENTITY.padEnd(22)} –  skipped (no owned WeddingDetails id to scope by)`);
  } else {
    let gcsDeleted = 0;
    let gcsSeen = 0;
    for (const weddingId of weddingIds) {
      try {
        const q = encodeURIComponent(JSON.stringify({ wedding_id: weddingId }));
        const res = await api('GET', `/apps/${APP_ID}/entities/${GUEST_CONTACT_SUBMISSION_ENTITY}?q=${q}`, undefined, token);
        const rows = unwrapList(res);
        gcsSeen += rows.length;
        for (const row of rows) {
          try {
            await api('DELETE', `/apps/${APP_ID}/entities/${GUEST_CONTACT_SUBMISSION_ENTITY}/${row.id}`, undefined, token);
            gcsDeleted++;
          } catch {
            // skip individual failures — logged in the total below
          }
        }
      } catch (err) {
        console.log(`    ⚠️  Could not query ${GUEST_CONTACT_SUBMISSION_ENTITY} for wedding ${weddingId}: ${err.message.slice(0, 80)}`);
      }
    }
    console.log(`    ${GUEST_CONTACT_SUBMISSION_ENTITY.padEnd(22)} ✓  deleted ${gcsDeleted}/${gcsSeen}  (across ${weddingIds.length} owned wedding id(s))`);
    summary.deleted[GUEST_CONTACT_SUBMISSION_ENTITY] = gcsDeleted;
  }

  // ── 6. Delete all separate entities ──────────────────────────────────────────
  console.log('\n  Deleting separate entity records:\n');

  for (const { entity, ownerField = 'created_by_id' } of SEPARATE_ENTITIES) {
    process.stdout.write(`    ${entity.padEnd(22)} `);
    try {
      const res = await api('GET', `/apps/${APP_ID}/entities/${entity}`, undefined, token);
      const rawRows = unwrapList(res);
      const rows = rawRows.filter(r => r[ownerField] === me.id);
      const foreignCount = rawRows.length - rows.length;

      if (rows.length === 0) {
        console.log(`–  0 records${foreignCount ? `  [${foreignCount} other-account record(s) excluded]` : ''}`);
        summary.deleted[entity] = 0;
        continue;
      }

      let deleted = 0;
      for (const row of rows) {
        try {
          await api('DELETE', `/apps/${APP_ID}/entities/${entity}/${row.id}`, undefined, token);
          deleted++;
        } catch {
          // skip individual failures — expected for e.g. WebsiteTheme/ThemeDetails
          // (delete RLS is role:admin-gated, not owner-scoped — see comment above)
        }
      }
      console.log(`✓  deleted ${deleted}/${rows.length}${foreignCount ? `  [${foreignCount} other-account record(s) excluded]` : ''}`);
      summary.deleted[entity] = deleted;
    } catch (err) {
      const status = err.message.includes('404') ? '–  (not in schema)' : `⚠  error: ${err.message.slice(0, 60)}`;
      console.log(status);
      summary.deleted[entity] = 0;
    }
  }

  // ── 7. Skipped entities — logged, not attempted ──────────────────────────────
  console.log('\n  Skipped (cannot be deleted by any account\'s own token — see script header):\n');
  for (const { entity, reason } of SKIP_ENTITIES) {
    console.log(`    ${entity.padEnd(22)} –  SKIPPED`);
    console.log(`    ${' '.repeat(22)}    ${reason}`);
    summary.skipped.push({ entity, reason });
  }

  // ── 8. Reset onboarding + plan fields ────────────────────────────────────────
  console.log('\n  Resetting onboarding + plan fields on the User record… ');
  try {
    await api('PUT', `/apps/${APP_ID}/entities/User/me`, USER_RESET_FIELDS, token);
    for (const [field, value] of Object.entries(USER_RESET_FIELDS)) {
      console.log(`    ${field.padEnd(22)} → ${JSON.stringify(value)}`);
    }
  } catch (err) {
    console.error(`\n✗ Failed to update auth user: ${err.message}`);
    process.exit(1);
  }

  // ── 9. Summary ────────────────────────────────────────────────────────────────
  const totalDeleted = Object.values(summary.deleted).reduce((s, n) => s + n, 0);
  const entityTypesAttempted = Object.keys(summary.deleted).length;

  console.log(`\n${'─'.repeat(58)}`);
  console.log(`  Account reset:      ${confirmedEmail}  (id=${me.id})`);
  console.log(`  Total deleted:      ${totalDeleted} record(s) across ${entityTypesAttempted} entity type(s)`);
  console.log(`  Skipped entirely:   ${summary.skipped.length} entity type(s) — see list above`);
  console.log('  User fields reset:  ' + Object.keys(USER_RESET_FIELDS).join(', '));
  console.log(`${'─'.repeat(58)}`);

  console.log(`
  ⚠️  BROWSER STEP REQUIRED
  ─────────────────────────────────────────────────────
  localStorage is browser-side — this script cannot reach it.
  Before re-walking onboarding, clear it in the browser:

    Option A (quick):  Open DevTools → Console → type:
                       localStorage.clear()

    Option B (clean):  DevTools → Application → Storage
                       → "Clear site data" button

  Keys to clear: oi_couple_name, oi_wedding_date,
                 oi_wedding_city, oi_user

  Without this the top bar and Ava context will show stale
  couple/date data from the previous onboarding run.
  ─────────────────────────────────────────────────────
`);

  console.log('  ✅ Test account reset to pre-onboarding state.');
  console.log('     Clear browser localStorage, then log in to walk onboarding fresh.\n');
}

run().catch(err => {
  console.error('\n✗ Unexpected error:', err.message);
  process.exit(1);
});
