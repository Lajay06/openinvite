# Base44 platform notes

Empirically established facts about how Base44 actually behaves, gathered
across several sessions of building server-side (`api/*.js`) integrations.
Read this before touching RLS, the admin key, or any new admin-key-backed
endpoint — every item below was confirmed by direct testing against the
live app, not inferred from documentation.

## The admin key is not a superuser bypass

`BASE44_ADMIN_KEY` is a normal API credential, evaluated against each
entity's own RLS rules exactly like any other caller. It has no session
identity of its own that matches any real user's `{{user.id}}`.

Confirmed behavior, per operation, against an entity with owner-scoped RLS
(`{created_by_id: "{{user.id}}"}`):

| Operation | Result |
|---|---|
| `read` | `200`, empty array — silently filtered, no error |
| `create` | `403 Permission denied for create operation` |
| `update` | `403 Permission denied for update operation` |
| `delete` | (not directly tested, but `404`/`403` observed for records the admin key doesn't own) |

This means: **any entity the admin key needs to read or write on behalf of
a non-owner must have `read`/`create`/`update` set to `null` (open) for
that operation** — there is no way to grant the admin key owner-equivalent
access to a specific record via RLS. Confirmed against `Collaborator`,
`Guest`, `QuestionnaireResponse`, and `Questionnaire` independently, all
with identical results.

**Implication for `Guest` specifically**: `Guest.update`/`Guest.delete` are
owner-scoped, so the admin key gets a flat `403` trying to edit or delete
an *existing* guest on behalf of anyone but the real owner — this is why
`api/collaborator-guests.js`'s "edit" permission currently has no working
write path, documented explicitly in that file's own header rather than
silently left broken.

## The `create:null` + hashed-identifier pattern

The one reliable way to let a non-owner (a guest, a collaborator) cause a
write on someone else's data: set that entity's `create` RLS to `null`
(unrestricted) and design the feature as **append-only** — every new
event is a fresh row, never an update to an existing one, and "current
state" is derived by aggregating the log at read time (latest-wins per
some dedup key). This sidesteps the update-RLS wall entirely, since
nothing is ever updated.

Used by: `RsvpResponse`, `PollVote`, `PollComment`, `SongRequest`,
`QuestionnaireResponse`, `CollaboratorGrant`.

Because `create:null`/`read:null` entities are listable, unscoped, by
**anyone with any API token** — not just the intended caller — anything
that could identify a real person must be stored as an HMAC digest
(`crypto.createHmac('sha256', BASE44_ADMIN_KEY)`), never a raw id, name, or
email. See `api/_lib/pollAuth.js`, `api/_lib/questionnaireCrypto.js`,
`api/_lib/collaboratorAuth.js`'s `hashId` for the same construction reused
three times. If the *content* itself is sensitive (not just the identity
of who wrote it), encrypt it too — `QuestionnaireResponse.encrypted_answers`
is AES-256-GCM, keyed the same way, precisely because "visible only to the
couple" is a stronger promise than the poll/RSVP entities make.

Base44 RLS's own docs describe support for `$or`/`$in`/`$nin` combinators
— confirmed this exists as documented syntax, but never validated it
working in practice (an attempt to test it against `Collaborator` was
correctly blocked as an unauthorized change to shared production
infrastructure, and reverted before any real test ran). Don't assume it
solves the owner/collaborator access problem without testing it in
isolation first, on a throwaway entity, with explicit authorization.

## The built-in `User` entity accepts arbitrary custom fields, no schema needed

Confirmed empirically 2026-07 (schema-drift-guard triage, investigating
`User.tempUnit`/`User.deletionRequestedAt` flagged as "dropped" by
`scripts/lib/schemaDropScan.mjs`'s static scan): both fields are actually
fine — `list_entity_schemas` on `User` does return a real schema, and it
already correctly declares both. The scanner's embedded snapshot was just
wrong (never properly cross-checked against a live fetch).

While investigating, went one step further: wrote a totally undeclared,
made-up field name (`__persistence_probe_undeclared_field__`) via
`PUT /apps/:id/entities/User/me`, then read it back with a fresh, separate
`GET` — it round-tripped correctly. **The built-in User entity persists
arbitrary custom fields regardless of schema declaration** — fundamentally
different from every custom entity (`WeddingDetails`, `Guest`, `Note`,
etc.), which silently drop anything not declared in their schema. This
also explains `onboardingCompleted` (camelCase, used everywhere in the
app): the live `User` schema only declares `onboarding_completed`
(snake_case), yet the camelCase field round-trips fine in practice —
confirmed directly, not just inferred.

**Practical implication**: a "DROPPED" finding for `User` from
`audit-schema.mjs`/`schema-drift-guard.mjs` is likely a false positive by
the nature of this entity, not a real bug — treat it with much lower
confidence than a DROPPED finding on a custom entity. This does NOT mean
User is exempt from the separate "silently reverts later" schema-drift
phenomenon below — only that immediate write-then-read-back of an
undeclared field is not, itself, evidence of a problem for `User`
specifically.

## The built-in `User` entity is a different subsystem entirely

Every custom entity in this app authenticates equally well via
`Authorization: Bearer <BASE44_ADMIN_KEY>`. The built-in `User` entity does
**not** follow this rule for listing:

```
Authorization: Bearer <ADMIN_KEY>   →  401 "Authentication required to list users"
?api_key=<ADMIN_KEY>  (query param) →  200
```

Confirmed directly, twice, isolating the header-vs-query-param variable
with everything else identical. `api/_lib/base44Admin.js`'s
`getBase44User`/`writeBase44UserPlan` (used by the Stripe webhook) already
use the `?api_key=` form and work correctly. `api/cron/send-onboarding-emails.js`
uses the `Authorization: Bearer` form and has been failing on every run
since it shipped (confirmed via Vercel's live error logs, failing since at
least 2026-07-04) — this is a real, live, unfixed bug: the day-3/day-7
onboarding emails have never sent. Not fixed as part of this session
(out of scope for the task that found it); flagged for its own fix using
the `?api_key=` pattern already proven in `base44Admin.js`.

## `RSVP_TOKEN_KEY` — rotation permanently invalidates every distributed RSVP link unless migrated first

Set 2026-08-18 (Track E). A dedicated key, deliberately NOT `BASE44_ADMIN_KEY`,
because RSVP tokens are **externally distributed** — printed in invitations and
sitting in guests' inboxes, beyond our control. Sharing a failure domain with
the admin key would mean an admin-key rotation, done for any unrelated reason,
silently killed every outstanding invitation. Same principle as
`websitePasswordHash.js` (#450), amplified by the fact that the blast radius
here is other people's mailboxes rather than one couple's own site.

**Deliberate rotation of `RSVP_TOKEN_KEY` requires a decrypt-old/re-encrypt-new
migration BEFORE the old key retires — rotation without it permanently
invalidates every distributed RSVP link.**

Both halves fail to the same key, which is what makes this unrecoverable rather
than merely disruptive: the hash stops matching presented tokens AND the
ciphertext stops decrypting, so the raw tokens cannot be recovered to re-hash
them. There is no repair path after the fact.

Set in Production, Preview and Development with the SAME value — preview
deployments share the production Base44 backend (see the preview-writes-real-
data note below), so a divergent key would write hashes that production could
never match.

## `vercel dev`'s env sourcing doesn't always match `.env.local`

Most env vars used by local `vercel dev` come from `.env.local` as
expected — confirmed for `BASE44_ADMIN_KEY` and `VITE_BASE44_APP_ID`
specifically (hashes/signatures produced locally verified correctly
against endpoints also running under `vercel dev`). `RESEND_API_KEY` did
**not** follow this rule: `.env.local` held a placeholder value, editing
it and restarting `vercel dev` had no effect, and the endpoint kept
failing with "API key is invalid" — `vercel dev` appears to source at
least this one var from the linked Vercel project's own Development
environment config, not the local file, for reasons not fully understood.
If a local test unexpectedly fails on a `RESEND_API_KEY`/similar
third-party-key error, don't assume the code is wrong — check whether the
var in question is actually one `vercel dev` reads locally before
debugging further.

## Schema drift: a pushed field/RLS shape can silently revert

Observed at least three times across different entities
(`Guest.plus_one_rsvp_link_id`, `RsvpResponse.is_plus_one`,
`Collaborator.status`/`invite_token`/`accepted_user_id`/`accepted_at`): a
schema change pushed via `update_entity_schema` and confirmed live can, at
some later point, silently no longer be present — re-checking
`list_entity_schemas` shows the field or RLS rule simply missing, with no
error or notification at the time it happened. Root cause unknown.

**Standing mitigation**: never trust memory of "what I last pushed" for a
security- or feature-critical schema shape. Re-verify via
`list_entity_schemas` immediately before relying on it, especially right
before a merge — this is exactly how the `Collaborator` schema-drift
incident was caught before PR #140 shipped (the persistence suite's own
`Collaborator.status/invite_token persist on create` assertion failed,
which is why that check exists and shouldn't be removed).

**Recurred again, 2026-07**: `WeddingDetails.assetContent`,
`onboardingDraft`, and `onboardingStepIndex` — all three previously fixed
(per `audit-schema.mjs`'s own comments, `assetContent` specifically was
"registered 2026-06-03") — had reverted to absent by the time
AUDIT_2026-07.md's schema-drift re-verification ran `list_entity_schemas`
fresh. Restored via `update_entity_schema` (full-schema replace, not a
patch — see the warning below) and re-verified with a second, independent
`list_entity_schemas` call immediately after the push, per this section's
own standing mitigation. A standing guard now exists for this specific
recurrence class: `tests/persistence/schema-drift-guard.mjs` (via
`scripts/lib/schemaDropScan.mjs`), registered in the main persistence
suite — see that file's header for what it can and can't actually check.

**`update_entity_schema` replaces the whole schema, not a patch.** Its own
tool description confirms: "Fields and constraints not included in this
object will be removed." Always `list_entity_schemas` first, take the full
returned object, add/change only what you mean to, and submit the complete
merged schema back — including the `rls` block explicitly (the tool docs
say entity-level RLS is preserved when omitted, but submitting it
unchanged-but-explicit removes any ambiguity about what's actually being
pushed to a security-relevant entity).

**Base44's schema metadata is not reachable from a plain script.**
Confirmed empirically, 2026-07: `GET /apps/:id/entities/:entity/schema`,
`GET /apps/:id/schema`, and `GET /apps/:id/entities/:entity/meta` all `404`
against the live REST API using the admin key — the first two as if
"schema"/"meta" were being parsed as a record id, the app-level one as "App
not found" entirely. `@base44/sdk`'s shipped types expose no runtime
schema-fetch method either (only build-time CLI codegen via "Dynamic
Types"). This means only the `mcp__claude_ai_Base44__list_entity_schemas`
tool (used interactively, by me) can read the live schema — no test script
run via `npm run test:persistence`/CI can do this itself. Any
drift-detection guard that needs to run as a plain script (like
`schema-drift-guard.mjs` above) is necessarily working off an embedded
snapshot refreshed by hand via that MCP tool, not a true live fetch — it
degrades silently back to the exact blind spot it exists to catch if that
snapshot isn't kept current after future schema changes.

## The built-in `User` entity cannot be bulk-listed via the admin key at all

Confirmed empirically 2026-07 while building the weekly digest cron
(needs to iterate "every user with digest emails on"). Building on the
"different subsystem entirely" finding above:

| Call | Result |
|---|---|
| `GET /entities/User` with `Authorization: Bearer <ADMIN_KEY>` | `401 "Authentication required to list users"` |
| `GET /entities/User?api_key=<ADMIN_KEY>` | `200 []` — succeeds, but the array is empty, even with real users in the app |
| `GET /entities/User/:id?api_key=<ADMIN_KEY>` (a single known id) | `200`, full record — works fine |

The `?api_key=` fix documented above for the single-record path does
**not** carry over to the bulk-list path — it only avoids the 401, the
list itself still comes back empty regardless of query params tried
(`limit`, `q={}`, `sort`). Combining both `Authorization: Bearer` and
`?api_key=` on the same request 401s (the Bearer form wins). There is
currently no known way to bulk-list every User via the admin key.

**Workaround, and the one every "for every user" cron should use**:
iterate a different entity that DOES list correctly (`WeddingDetails.read`
is `null`/unscoped and lists fine via the ordinary `Authorization: Bearer`
form — confirmed working), extract each record's `created_by_id`, then
resolve each owner's `User` record individually via the proven
single-record path (`api/_lib/base44Admin.js`'s `getBase44User`). This is
usually a better fit anyway, since most "for every user" jobs actually
mean "for every user who has X" (a wedding, in the digest cron's case),
not literally every registered account.

**Fixed 2026-07-20, PR #184** — `api/cron/send-onboarding-emails.js` was
ported to the same WeddingDetails-first pattern `send-weekly-digest.js`
uses (resolve owners via `WeddingDetails`, then `getBase44User()` per
owner). Confirmed live in production runtime logs on multiple dates since
(2026-07-21, 07-28, 08-01: all `200`, resolving the correct owner count,
zero errors). The two paragraphs above describing this as unfixed were
stale by the time a later session (2026-08-02) went looking for this bug
armed with a prior handoff note — always re-check current code/git log
before trusting a "known bug" claim, even one written in this file.

Separately confirmed 2026-08-02: **zero real users were ever affected** by
the ~16-day outage (2026-07-04 to 2026-07-20). Queried `User` for every
signup in the full window that could have landed in a day-3 or day-7
match during the outage (2026-06-26 to 2026-07-24) — zero results. This
app's real (non-test) user base is tiny (5 accounts total as of
2026-08-02) and every existing account either signed up before the cron
existed or after the fix. No backfill was needed or performed.

Also discovered while verifying: every single production run of this cron
checked (spanning 2026-07-21 through 2026-08-01) shows `sent: 0` for both
day3 and day7 — meaning the actual Resend send path for these two
templates had *never* been exercised end-to-end in production, fix or no
fix, simply because no real account has ever fallen in a matching window.
Verified the send path directly via a temporary preview-only endpoint
(same pattern as PR #185's `dev-send-test-digest.js`), deleted after use —
see PR that introduced this note for details.

## Registration requires real email-OTP verification — no bypass

Confirmed empirically 2026-07 (creating a second test account for
Notification RLS two-account verification): `POST /apps/:id/auth/register`
succeeds and creates a `User` row immediately, but returns no
`access_token` — just `{id, message: "...check your email for the
verification code", otp_expires_in_minutes}`. `POST /apps/:id/auth/login`
for that account then fails `400` with `"Please verify your email before
logging in"` until `POST /apps/:id/auth/verify-otp` (body:
`{email, otp_code}` — **snake_case**, not the SDK's `otpCode`; sending
`otpCode` raw gets a `422 Field required` on `otp_code`) is called with the
real 6-digit code from that email. No admin-key/dev bypass exists — the
code must come from an inbox someone can actually read. `POST
/apps/:id/auth/resend-otp` (body: `{email}`) reissues a fresh code if
needed. Once verified, normal password login works from then on.

**Practical implication**: any test/script needing a *second* real,
independently-authenticated account (not just the one `BASE44_TEST_EMAIL`)
requires a human to relay one OTP code once, since Gmail `+alias` addresses
(`you+something@gmail.com`) land in the same inbox as the base address and
pass the disposable-email-domain check. A second such account now exists
for this repo's test suite — see `BASE44_TEST_EMAIL_2`/
`BASE44_TEST_PASSWORD_2` in `.env.local` (gitignored, not reproduced here).
Reuse it for any future two-account RLS/collaborator verification instead
of registering a third.

## The scripted-login 401 — unresolved, parked, not user-facing

A freshly-obtained, verified-valid bearer token (confirmed against
Base44's own `/entities/User/me` directly, `200`) gets `401 Authentication
required` when replayed through `verifyBase44User` on production Vercel
specifically — reproduced on both a new endpoint
(`send-collaborator-invite`) and a long-shipped, unrelated one
(`send-invites`), ruling out a code bug in either. The same call succeeds
locally via `vercel dev` with the identical token, code, and request
shape — the only environment where issuance-IP and replay-IP are
guaranteed to differ is actual Vercel production, which is also the only
place this fails.

**Status: confirmed NOT user-facing.** The collaborator feature this
symptom was found while testing works correctly end-to-end with a real
browser session in production (verified directly) — real users are
unaffected. The failure is specific to a token obtained via a
script/direct API call rather than the app's own browser session/SDK
flow. Root cause not identified (a session/IP-binding behavior on Base44's
side is the leading hypothesis, untested). Parked per explicit instruction
— do not spend further session time chasing it unless it starts affecting
a real user-facing path. If picking this up again: the next step would be
comparing exactly what the `@base44/sdk` browser client sends beyond the
`Authorization` header (cookies, additional headers) against a bare
`fetch`-based script, since that's the one variable not yet isolated.

## The Base44 workspace MCP's `query_entities` can filter `User` by email — the runtime admin key can't

Confirmed 2026-08-01 while auditing a stuck test signup
(`jaygalaxy23+planstepfree@gmail.com`, `is_verified:false`, orphaned mid-OTP).
`mcp__claude_ai_Base44__query_entities` with `entityName:"User"` and a
`{"email": "..."}` filter returns the matching record directly — this is a
different credentialed path from the runtime `BASE44_ADMIN_KEY` documented
above, and does **not** hit the "bulk-list always empty" limitation. Useful
for one-off interactive lookups (this session, this tool) but **not
available to any `api/*.js` endpoint or script** — those still only have
the `?api_key=` single-record-by-id path documented above.

The sibling `create_entities`/`update_entities` MCP tools explicitly refuse
the `User` entity ("cannot be created/updated through this tool"), and no
`delete_entities` tool exists at all. Combined with the `User` schema's own
`deletionRequestedAt` field description ("actual deletion is manual,
verified via customercare@openinvite.com.au"), there is currently **no
programmatic way to delete or modify a `User` record** via any tool
available in this workflow — deletion/cleanup of a stuck or orphaned `User`
row is not automatable, by design. An unverified, dataless orphaned account
(never completed OTP) is harmless to leave in place — it can never log in.

Update 2026-08-02 (PR A4 email sweep): the app-facing support address
changed from `customercare@` to `hello@openinvite.com.au` everywhere in
`src/`. The live `User.deletionRequestedAt` field description on Base44
still literally reads "verified via customercare@openinvite.com.au" — this
is a pure human-readable doc string with no functional effect (Base44
doesn't parse it), so it was deliberately left alone rather than pushed via
`update_entity_schema` in the same pass as an unrelated content sweep;
`update_entity_schema` is a full-replace, not a patch, so touching it means
resending the entire current schema. **Also discovered the local
`base44/entities/User.jsonc` mirror had drifted from the live schema** — it
was missing the `notification_prefs` field entirely (present live, added to
the mirror this same pass, verified via a fresh `list_entity_schemas` call
first). No push was made; the mirror was corrected to match what's live.
If the `customercare@` string in the live description is ever updated
directly, remember to include `notification_prefs` (and the corrected
`deletionRequestedAt` text) in the same full-replace call, not just the one
field being touched.

## Google OAuth login correctly dedupes against an existing password account by email

Confirmed empirically 2026-08-03 (Session C security audit, item 1: "can the
same email hold two accounts via Google OAuth + email/password?"), live
against production with the account owner at the keyboard. Two-part test on
`la.jay06@gmail.com`, an account that already existed (created
2025-07-13T02:42:32.950Z, `plan: ultra`, `onboarding_completed: true`):

1. `POST /apps/:id/auth/register` with that same email + a fresh password →
   rejected outright, `"A user with this email already exists"`. The
   password-registration path has its own dedupe check and fails closed.
2. Clicking "Continue with Google" on the same email (real Google consent,
   not scripted) → landed on `/DailyUpdate` already authenticated. Fetched
   that session's own `GET /entities/User/me` and confirmed `id` and
   `created_date` matched the pre-existing account exactly — Base44 resolved
   the OAuth login to the *same* User record by email match, not a new one.

**No account-duplication vector exists via this path.** The empty-looking
dashboard on landing was not a fresh account — it's this account being the
app-owner/admin account (`role: "admin"`), which was never populated with
guest-list/budget test data, as distinct from a normal working account.
Also confirmed as a side effect: `ChoosePlan.jsx`'s `isPastPlanStep()` gate
correctly fast-forwarded past `/choose-plan` because `plan_step_completed`
was already `true` on the existing record — not a gate bypass, working as
designed for any already-onboarded account regardless of which auth method
that particular login used.

## There is no MCP tool to delete an entity schema

`create_entity_schema` and `update_entity_schema` exist; there is no
`delete_entity_schema`. "Retiring" an entity (PR3b, `Photographer` →
`Vendor`) means: delete all its records (via a real logged-in session,
per the RLS behavior above), delete the local `base44/entities/*.jsonc`
file, and remove every code reference — but the empty entity/table
itself is left behind live on Base44's backend, unreachable from the app
but not actually gone. This is harmless (zero records, nothing reads or
writes it) but is not the same thing as deletion. If Base44 ever exposes
a real delete-entity operation, revisit fully retired entities
(currently just `Photographer`) to remove them properly.

## `DELETE` on a `created_by_id: "anonymous"` row is masked as `404`, not `403`, and doesn't work — confirmed empirically, not assumed

Confirmed 2026-08-03 (Session C, PR 1a's orphaned-residue audit) — sharpens
this file's own earlier "(not directly tested)" caveat on delete behavior
for the admin-key/owner-scoped-RLS combination. `RsvpResponse` rows written
by `rsvp-submit.js` via the admin key are stamped `created_by_id:
"anonymous"` (a literal string, not any real user's id) by Base44 itself —
this app never chose that value. `RsvpResponse.delete` RLS is
`{created_by_id: "{{user.id}}"}`. Direct test: `GET
.../entities/RsvpResponse/<id>` with the admin key → `200`, full record.
`DELETE` on the exact same URL, same auth → **`404`**, `{"message":"Entity
RsvpResponse with ID <id> not found", ...}`. Immediate follow-up `GET` on
the same id → `200` again, record unchanged. **The delete was silently
denied and disguised as "not found," not a `403`** — worth knowing if
debugging a similar delete that "isn't working": check whether the record
actually still exists via `GET` before assuming it's really gone. No real
caller identity (not the admin key, not even the wedding owner's own real
session token) can ever satisfy `{{user.id}} === "anonymous"`, so this
isn't fixable by using a different credential — only by the row never
being stamped `created_by_id: "anonymous"` in the first place (see the
right-to-erasure item below), or a privileged platform-level delete
outside the API/MCP surface entirely (Base44 support).

Reproduced on a second entity 2026-08-18 (PR #459's write-gate
verification), which is what makes it a platform behavior rather than an
`RsvpResponse` quirk: a `PollComment` written through
`api/wedding-poll-comment.js` read back `200` under the admin key and
returned `404` to `DELETE` on that same id, under the same auth — and the
wedding owner's own session token was refused identically. Same shape, same
masking, different entity.

## Known accepted residue: ~2010 orphaned, pre-encryption `RsvpResponse` test rows — confirmed synthetic, confirmed undeletable

As of 2026-08-03 (before PR 1a, fix/rsvp-response-encryption): **2,010**
`RsvpResponse` rows across **470** distinct `wedding_id`s still carry the
old plaintext shape (raw `guest_id`, plaintext `song_request`/`note`/
`dietary_restrictions`/`email`) rather than the new
`guest_id_hash`/`encrypted_guest_level` shape — read:null means these are
still listable by anyone, zero auth, same as before the fix. Investigated
before deciding whether to backfill or delete-and-reseed:

- **469 of 470** referenced weddings are **orphaned** — their
  `WeddingDetails` record no longer exists at all (confirmed via direct
  `GET .../WeddingDetails/<id>` → `404` for each, and by pulling the full
  live `WeddingDetails` table — only 15 records exist app-wide right now).
  Only `john-suzanne` (id `6a1f90fa5b4e0702b5a051aa`) is still live.
- Row ownership: `created_by_id` is either `"anonymous"` (1,874 rows,
  written by real calls into `rsvp-submit.js` during test runs) or the
  known dev/test account `jaygalaxy23@gmail.com` (id
  `6a1c32fa7d681c950e26d2cd`, 136 rows). No unrecognized owner anywhere.
- **Content is confirmed synthetic**, not real people's data: every
  populated row sampled carries literal test-suite sentinel strings —
  `"Sentinel song request"`/`"Sentinel RSVP note"`/`"Sentinel dietary
  note"` (from `tests/persistence/anonymous-endpoints.mjs`) and `"Primary
  song"`/`"Primary note"`/`"Primary dietary"` +
  `"Plus-one song"`/`"Plus-one note"`/`"Plus-one dietary"` (from
  `tests/persistence/plus-one-identity.mjs`). This is accumulated
  `npm run test:persistence` residue from the ~3-week dev period
  (2026-07-10 to 2026-07-26), not demo content ever shown to anyone, and
  not any real human's information — `test-persistence.mjs`'s own cleanup
  step already tries to delete these after each run and has always
  silently failed for exactly the reason in the section above (visible as
  "⚠️ CLEANUP FAILED" in test output going back to whenever
  `rsvp-submit.js` first shipped).
- **Undeletable via any tool available to this session** — see the
  `DELETE` finding directly above. No `delete_entities` Base44 MCP tool
  exists either (re-checked live, 2026-08-03; matches this file's
  standing note).

**Decision (2026-08-03, account owner): do not attempt an in-place
encrypt-in-place migration on these rows — accept as a documented,
permanent, low-severity residue** (real exposure surface, zero real
privacy harm since content is synthetic), and pursue removal via a Base44
support ticket requesting a platform-level purge, since no API/MCP path
can do it. **Ticket details**: entity name `RsvpResponse`, filter
`created_by_id = "anonymous"` (this correctly targets only the
admin-key-written legacy rows, not the 136 rows still owned by the real
test account, which are separately cleanable once a working delete path
exists) — approximately 1,874 rows as of 2026-08-03, all pre-dating
2026-07-27. One-line description for the ticket: *"Requesting a bulk
delete of orphaned `RsvpResponse` records where `created_by_id ==
'anonymous'` — these are pre-encryption automated-test artifacts we
cannot delete ourselves because our own owner-scoped delete RLS can never
match Base44's own auto-assigned `'anonymous'` owner value."*

## Single-record `GET .../Entity/:id` does NOT bypass owner-scoped read RLS for custom entities — the `User` entity's behavior is a special case, not a general capability

Tested directly, 2026-08-03 (PR 1c experiment), not assumed. Created a
throwaway custom entity (`RlsExperimentThrowaway`, `read: {created_by_id:
"{{user.id}}"}`, everything else `null`) specifically to test whether the
built-in `User` entity's documented quirk — single-record `GET
.../entities/User/:id?api_key=...` works even though bulk-list/filter is
blocked — generalizes to custom entities with owner-scoped read RLS. It
does not:

- Created one record via a REAL logged-in test account's own session
  token (correctly stamped `created_by_id` to that real user — confirming
  ordinary ownership stamping works fine for non-admin-key writes).
- Admin key, filter query (`?q={marker:...}`) → `200 []` (matches
  already-documented owner-scoped-read behavior).
- Admin key, bulk list, no filter at all → `200 []` (same).
- Admin key, **single-record `GET .../RlsExperimentThrowaway/<id>`** (the
  actual hypothesis) → **`404`**, both via `Authorization: Bearer` and via
  `?api_key=` (the exact variant that works for `User`).

**Conclusion: there is no way for the admin key to read a specific,
individually-known custom-entity record it doesn't own, under any request
shape tried.** The `User` entity's single-record-GET success is unique to
that built-in entity, not a general REST capability. This closes off the
"hash-shell + id-based lookup" redesign that was the leading candidate
for fixing `Guest.read`'s PII exposure without breaking the anonymous
RSVP-token flow — see the `Guest` scope note further down for what's left.

Cleanup: the one test record was deleted (its RLS made delete open, so
this was a normal, uneventful admin-key `DELETE`, unlike the
`RsvpResponse`/`GuestContactSubmission` "anonymous"-owner wall). The
`RlsExperimentThrowaway` *schema* itself can't be deleted (no
`delete_entity_schema` tool exists — same as the retired `Photographer`
entity) — it sits empty and unreachable permanently, which is harmless.

## `Guest`'s PII exposure is real, but the fix is a much larger project than `RsvpResponse`/`GuestContactSubmission` were — flagging the actual scope

With the bypass path closed (above), the only remaining fix pattern is the
one already proven twice: encrypt the sensitive fields at rest
(`name`/`email`/`phone`/`mailing_address`/`dietary_restrictions`/
`notes`/`special_requests`/plus-one equivalents), leave `read: null` as
today. But `Guest`, unlike `RsvpResponse`/`GuestContactSubmission`, is
**not** append-only or narrowly touched — it's read and written directly
by the couple's own browser session across dozens of dashboard call
sites (`Guests.jsx`, `GuestList.jsx`, `ImportGuestModal.jsx`,
`SendInvitesModal.jsx`, `Seating.jsx`, `WeddingParty.jsx`, `EmailTemplates.jsx`,
`BulkActionBar.jsx`, the AI assistants, and more). Every one of those
calls `base44.entities.Guest.filter()/.create()/.update()` directly from
the client, which would break the moment any of the fields it reads or
writes are encrypted — decrypting/encrypting needs `BASE44_ADMIN_KEY`, a
server-only secret the browser can never hold. Fixing this properly means
moving every one of those call sites behind new authenticated server
endpoints (the `api/my-guests-rsvp.js`/`api/guest-contact-review.js`
pattern, at roughly 15-20x the surface area) — a multi-PR project, not a
single scoped fix. Flagged for an explicit priority/scope decision before
starting, not something to fold into a "PR 1c"-sized effort.

## Right-to-erasure gap: anonymous-guest writes create rows nobody can ever delete through the product

**New finding, 2026-08-03, graded post-launch (on record, not a launch
blocker) per explicit account-owner instruction.** Any entity written via
the admin key on behalf of an anonymous guest (`RsvpResponse` today;
the same `create:null` + hashed-identifier pattern used by `PollVote`,
`PollComment`, `SongRequest`, `QuestionnaireResponse`, `CollaboratorGrant`
would have the identical problem) gets `created_by_id: "anonymous"`,
stamped by Base44 itself, not chosen by this app. Since
`update`/`delete` RLS on all of these is owner-scoped
(`{created_by_id: "{{user.id}}"}`), **no one — not the wedding owner's own
real login session, not the admin key, not any real user — can ever
delete or edit an individual guest's row**, because no real `{{user.id}}`
is ever literally the string `"anonymous"`. Today this only affects
synthetic test residue (see above), but once real guests exist
post-launch, a real guest asking "delete my RSVP/song request/poll vote"
(a right-to-erasure / GDPR-style request) **cannot be honored through the
product at all** — there is no UI path and no server endpoint that could
satisfy it, because the underlying entity write itself is unowned by
anyone real.

**Update, 2026-08-03 (PR 1b): the "supply `created_by_id` explicitly"
hypothesis below is confirmed FALSE, tested directly, not assumed.**
Creating a `GuestContactSubmission` via the admin key with an explicit
`created_by_id` set to a real user's id in the request body still got
auto-stamped `"anonymous"` — identical to `RsvpResponse`. Confirmed twice
now, on two different entities: **Base44 always overrides `created_by_id`
to its own value for admin-key-authenticated creates; it never honors a
client-supplied one.** This closes off the simplest fix direction
entirely — there is no way to make these rows "really" owned by the
wedding owner at write time.

**Actual fix direction, given the above — the only one left**: don't try
to fix ownership via RLS at all. Route the mutation itself through a
server-mediated endpoint that does the ownership check in application
code before calling the admin key, exactly the pattern PR 1b implemented
for `GuestContactSubmission` (`api/guest-contact-review.js`: verify the
caller via `verifyBase44User`, resolve their own `WeddingDetails`, then
confirm the target row's `wedding_id` matches before allowing the
admin-key write — leaving the entity's own RLS at `null` throughout,
since it can't distinguish "the real owner, mediated through a trusted
endpoint" from "anyone" any other way). For a real per-guest erasure
endpoint on `RsvpResponse` specifically: `verifyBase44User` + resolve the
caller's own wedding + compute `hashId()` for the target guest (from a
guest id or rsvp token the couple's own dashboard already has) + admin-key
`DELETE` every row matching `{wedding_id: caller's own, guest_id_hash}`.
No RLS change needed at all — the safety property comes entirely from the
endpoint verifying `wedding_id` ownership before deleting, same as PR 1b.
Needs its own scoped PR when real guests exist post-launch; not urgent
before then.

### Known instances, and the two that are now demonstrated rather than inferred

The gap is no longer hypothetical for `PollComment`. PR #459's verification
wrote one row through `api/wedding-poll-comment.js` on the fixture and then
tried to remove it every way available: the wedding owner's own session token
-> `404`, the admin key -> `404`, while an admin READ of the same id returns
the row happily. It is still there.

| # | entity / source | rows | status |
|---|---|---|---|
| 1 | `RsvpResponse` — `rsvp-submit.js` | ~2010 orphaned test rows | confirmed undeletable (2026-08-03) |
| 2 | `SongRequest` — `song-request-submit.js` | 231 orphaned | inferred, same shape |
| 3 | `Guest.update` / `PlanGift.update` collaborator gap | n/a | same root cause, on the hosted-functions list |
| 4 | `PollComment` — `wedding-poll-comment.js` | 220 orphaned + **3 fixture probe rows** | **demonstrated 2026-08-18 (PR #459)** |

The three probe rows on the `john-suzanne` fixture are
`[pr459-poll] "PR459 write-gate probe"`,
`[pr459-prod-poll] "PR459 prod check gate-off"` and
`[pr459-prod-poll] "PR461 unlocked write"` (the last from #461's full-circle
run, proving a write is ADMITTED once unlocked). Both were deliberate: proving the gate lets a correct password
through requires a write that actually lands. Both carry a `poll_id` matching
no existing poll, so nothing renders them. They are recorded here rather than
quietly left, because an erasure ledger that omits the rows its own
verification created is not a ledger.

Every other probe in that verification was designed to write nothing — the
security assertion refuses before any write, and the allowed-path probes used
an unmatched email so no row and no email resulted.

## Hosted functions — the real `asServiceRole` bypass, but only from inside Base44 itself

**Confirmed via Base44 support, 2026-08-16, in response to the "can RLS
express owner OR admin key" question this app's whole RLS-tightening pass
kept running into.** The admin key is NOT a bypass and never will be — no
RLS expression can match a service/admin principal (see the top of this
file). The actual bypass Base44 offers, `base44.asServiceRole.entities.*`,
only works **inside Base44-hosted backend functions**, called via
`createClientFromRequest(req)` — explicitly NOT available to an external
backend calling in over REST with the admin key, which is everything this
app's `api/*.js` (Vercel functions) do today. This closes the door on
"just use asServiceRole from Vercel" as a fix direction entirely — it was
never on the table.

The app's current Base44 plan (Builder) **does** support hosted functions,
confirmed the same day:

- Defined at `base44/functions/<name>/entry.ts` (new directory this repo
  doesn't have yet — `base44/` currently only holds `entities/*.jsonc`
  schema mirrors).
- Deployed with `base44 functions deploy`.
- Two invocation shapes: per-request (called like any endpoint — good fit
  for something like `resolveGuestByToken` or `collaborator-guests.js`'s
  Guest read, both currently blocked because the caller has no
  `{{user.id}}` an owner-scoped RLS rule can match) and **scheduled
  automations**, configured in `function.jsonc` (cron-style schedule) —
  good fit for `send-weekly-digest.js`, which today is a Vercel cron
  admin-key-iterating every `WeddingDetails` row in one run.
- Scheduled automations are capped at a **3-minute max run** and a
  **5-minute minimum interval**, and cost **1 credit per run**. The weekly
  digest cron's current single-admin-key-list-then-loop shape does NOT fit
  a 3-minute cap once there are enough weddings — a hosted-function rebuild
  needs to paginate across multiple scheduled runs, not port the loop as-is.
- Secrets: `base44 secrets set`, read at runtime only via
  `secrets.get()` from `"base44:runtime"` — **must be called inside the
  request/automation handler, not at module load time** (module-load-time
  access doesn't have the runtime context yet). Different secret store
  than Vercel's env vars — `BASE44_ADMIN_KEY` as Vercel knows it and
  whatever this becomes inside a hosted function are two separate places
  of trust, not the same value moved.
- `asServiceRole` is available ONLY inside these hosted functions — not in
  the Vercel `api/*.js` functions this app is built from, regardless of
  which admin key or secret those hold.

This is a genuine architecture option for the handful of endpoints whose
own callers can never satisfy owner-scoped RLS (anonymous guests with only
a token, collaborators reading another account's data, batch/cron jobs
with no single caller) — but it's a new system this repo has zero
infrastructure for yet, not an extension of the existing Vercel/admin-key
pattern. Treat as a scoped, deliberate migration per endpoint, not a
blanket fix.

## Preview deployments share the production Base44 backend — every preview click-through writes real production data

**Trap, confirmed the hard way, 2026-08-16, during the Seating count-
incoherence investigation.** A Vercel *preview* deployment (any
`openinvite-git-*.vercel.app` URL from an open PR) and *production*
(`openinvite.com.au`) are two different frontends pointed at the exact
same Base44 app/database — there is no separate preview-environment data
store. Clicking "Apply seating plan" on a PR's preview writes real
`Table.assigned_guests` rows for whatever real account you're logged in
as, identical in every way to doing it on production. This is not a bug —
it's simply how the Vercel↔Base44 wiring works here — but it is an easy
trap for anyone *investigating* state after a mutating action, one level
removed from the more familiar "never read state after the thing that
mutates it" mistake: the mutating action doesn't have to be the one you
just intentionally ran. A live click-through test on a preview (verifying
a PR, reproducing a bug) IS a mutating action against the shared
production account, and any investigation done afterward — on production,
on a *different* preview, minutes or even many messages later — is
reading state your own prior test already changed, not a clean baseline.

Concretely, this produced a real false lead in this session: reload
instability on `/Seating` (table/guest counts differing across page
loads) looked at first like it might be caused by concurrent data churn
from a shared test account — and on the heavily-reused `jaygalaxy23`
account, some of it plausibly was (a "Table" `updated_date` cluster traced
directly back to an "Apply seating plan" click made minutes earlier, on a
*different* PR's preview, not to anything happening in real time). The
question only got a clean answer by resetting a `+alias` account
(`scripts/reset-test-account.mjs`) that nothing else was concurrently
writing to and re-testing there — see the Seating investigation writeup
for the full trace.

**The practical rule**: before treating "the data looks different than I
expected" as evidence of an app bug, ask whether *you* (via a preview
click-through, an apply/save action, a migration script, or any other
write) touched that same account's data since the last time you looked —
regardless of which URL (preview or production) you used to do it. If the
answer is yes, that's not a clean read, and the fix is to either wait out
your own write's effects or — better, for anything needing a genuinely
clean baseline — use a freshly-reset `+alias` account nobody else is
concurrently exercising.

## Never encrypt a field whose writers aren't scoped first

**Confirmed via a real production incident, 2026-08-16** (see gotcha #17 in
`claude/architecture-gotchas.md`, the canonical write-up — this section is
the platform-fact substance only). `WeddingDetails.budget`/`.contactPerson`
moved to AES-256-GCM ciphertext (Step 2a, PR #436). Every page reading
`WeddingDetails` goes through one chokepoint, `getMyWeddingDetails()` →
`/api/my-wedding-details`, which decrypts on read — so the moment 2a
shipped, every page's local `details` state held a **decrypted plain
object** for `budget`/`contactPerson`, even pages that have nothing to do
with budget.

Any page whose save handler spreads that whole loaded object back into a
raw `base44.entities.WeddingDetails.update(id, wholeThing)` — a pattern
that turned out to be nearly universal across this app's "settings page"
components — re-writes `budget`/`contactPerson` as a plain object on every
unrelated save. Before 2a this was silently destructive (ciphertext quietly
reverted to plaintext). After 2a's schema was pushed live typing those
fields as `string`, Base44 itself started **rejecting the whole write with
HTTP 422** the moment any page tried it — so the failure mode flipped from
"silent data loss on one field" to "every save on that page fails outright,
edit lost" — still bad, just noisy instead of quiet.

The fix is never "patch the one page that broke" — every writer of the
entity needs its own field-scoped `WRITABLE_FIELDS` allowlist (derived from
that page's own actual edit surface, not a shared list — a shared list
recreates the same bug shape by granting pages fields they don't own)
**before** any new field on that entity moves to encrypted-at-rest. Order
matters: scope every writer first, encrypt second — never the reverse.

## The first write after a schema push materializes every newly-declared field on that row

**Confirmed empirically 2026-08-16**, verifying the seven WeddingDetails
declarations that fixed the six-page schema-drift data loss (canonical
gotcha #5). Declaring a new field does **not** retroactively add it to
existing rows. The row is unchanged until something writes to it — and then
the *first* write materializes **every** newly-declared field at once, with
`null` (or `[]` for an array type), regardless of which single field that
write actually touched.

Concretely: a save on the Honeymoon page sent a scoped
`{ honeymoonDetails: … }` payload, and the row diff came back with
**fourteen** changed keys — `honeymoonDetails` plus thirteen unrelated
newly-declared fields (`ceremonyType`, `vowsNotes`, `weddingParty`,
`assetContent`, `foodBeverage`, `favourItems`, …) all going `(absent)` →
`null`. Every pre-existing real value survived untouched, including nested
ones (`transport.coupleNote`, `accommodation.coupleNote`).

**Why it matters**: this is benign and one-time, but it looks exactly like
the unscoped-full-object-write bug it was introduced to fix. Anyone diffing
a row immediately after a schema push will see a scoped writer apparently
touching a dozen fields it doesn't own. Do not "fix" it. The tell is that
every unexpected key moved from *absent* to *null* — never from a real
value to null. If a key moved from a real value to anything, that IS the
real bug and the allowlist is wrong.

Practical rule: capture the diff baseline **after** the first post-push
write on a given row, not before, or the one-time materialization drowns
the signal you actually care about.

## `ringBearerDetails` and friends: field names containing a credential-ish substring get redacted by tooling, not by Base44

**Confirmed 2026-08-16** during the same verification (canonical gotcha
#18). `WeddingDetails.ringBearerDetails` persists and reads back perfectly
— but agent/CLI output layers that scan for leaked secrets match the
substring **"Bearer"** inside the field *name* and mask the value as
`[BLOCKED: Sensitive key]`.

This is a reporting artifact, not a storage or transport problem. The field
was verified working by reading it out of the raw row's field list (where
it rendered as `"Theo, 6, nephew"`) rather than through a key-addressed
lookup.

**Practical implication**: any automated check keying on that field name
will see a blocked placeholder instead of the data and can silently
conclude "empty" or "failed". When verifying it, assert on the surrounding
field list or on a value-equality boolean computed in-page, never on the
echoed value. The same trap applies to any future field whose name contains
`bearer`, `token`, `secret`, `apikey`, or `password` — prefer naming that
avoids those substrings outright.

## Turnstile's site key is domain-restricted: no guest form can be submitted on a preview host

**Confirmed 2026-08-17** while verifying PR #453 (free-text song requests).

The Cloudflare Turnstile site key does not cover `*.vercel.app`. On any
preview deployment the widget refuses to issue a token and logs:

```
[Cloudflare Turnstile] Error: 110200.
```

`110200` is "domain not allowed". The server correctly rejects a submission
with no token, so the form stops at *"Security check still loading"* and
never posts.

**This is not specific to one form.** Every guest-facing write protected by
Turnstile — song requests, RSVP-link requests, the contact form, public
sign-up — is unverifiable on a preview host for the same reason. A preview
click-through can confirm that a guest form *renders* and that its client-side
validation behaves, and nothing beyond that.

**So: guest-write flows verify on PRODUCTION, against fixture / `is_test`
data, always.** This generalises the pattern in use since #444 rather than
introducing a new one. Plan the verification that way from the start — the
alternative is discovering it at the end of a preview pass and having to redo
the whole thing after merge.

Companion to the note above about preview deployments sharing the production
Base44 backend: the data layer is shared, but the bot-check layer is not.

---

## The couple's song-request review actions are broken in production (found 2026-08-17)

Not a platform quirk — an application bug this file records because its cause
is the platform quirk at the top ("The admin key is not a superuser bypass").
Logged here so it is not rediscovered from scratch.

`SongRequest` RLS (confirmed against the LIVE schema, not the mirror):

```
create: null      read: null
update: {created_by_id: "{{user.id}}"}
delete: {created_by_id: "{{user.id}}"}
```

Rows are written by anonymous guests, so every row's `created_by_id` is
literally `"anonymous"`. `api/song-request-review.js` performs BOTH couple
actions with `adminFetch('PUT', …)`:

- `decline` -> `PUT { status: 'declined' }`  (line ~132)
- `add`     -> creates the Music record, then `PUT { status: 'added' }` (~153)

The admin key cannot satisfy an owner-scoped update, so both 403. Verified
end to end against production 2026-08-17 — `POST /api/song-request-review`
with `action: 'decline'` returned 500, and the runtime log shows:

```
[song-request-review] Error: Base44 PUT …/entities/SongRequest/… failed (403):
"Permission denied for update operation on SongRequest entity"
```

**`add` is the worse of the two**: the Music record is created *before* the
failing status write, so the track IS added, the request stays `pending`, and
the couple sees an error. Retrying double-adds.

Same class as the documented `Guest.update` gap that leaves
`api/collaborator-guests.js`'s edit permission with no working write path.
Any fix has to reckon with the same wall: an owner-scoped update on
anonymous-created rows cannot be performed by the admin key or by the couple,
so it needs either an RLS change on `SongRequest.update`, or the
append-only pattern (a separate status/decision row aggregated at read time),
or a Base44-hosted function with `asServiceRole`.

Note for cleanup work: the Base44 **workspace MCP** (`update_entities`) CAN
write these rows where the runtime admin key cannot — used 2026-08-17 to clear
a test request out of the fixture's pending queue. Another instance of the
workspace MCP having reach the runtime key lacks.

