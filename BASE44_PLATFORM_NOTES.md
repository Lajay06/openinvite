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
