# Anonymous access matrix — Openinvite

Scope: the **published, anonymous guest-facing site** only (`/w/:weddingSlug*`,
`/rsvp/:token`, and the handful of Turnstile-gated submit endpoints a guest's
browser calls directly) — not the authenticated couple's dashboard.

**2026-08-16: fully rewritten.** The previous version of this file referenced
a `SECURITY_AUDIT.md` that does not exist in this repo (never committed, or
removed before this rewrite — the reference was dangling) and an entity list
from before several migrations (`Photographer`→`Vendor`, poll votes/comments
off `WeddingDetails` into dedicated entities, RSVP data off `Guest` into
`RsvpResponse`, etc. — see `git log --oneline | grep -i migrate`). This
version reflects the live Base44 schema and the actual server-mediated
architecture as of the 2026-08 RLS remediation pass. Companion doc:
`BASE44_PLATFORM_NOTES.md` — the living reference for Base44 platform
behavior (what the admin key can/can't do, the `create:null` + hashed-
identifier pattern, hosted functions). This file is the living reference for
*which entity is reachable from the anonymous guest site and how* — update it
whenever that changes, the same way `BASE44_PLATFORM_NOTES.md` gets updated
when a new platform quirk is learned.

Base44's entity permissions are **entity-level, not row/token-scoped** —
"read: null" means *any* caller with *any* valid credential (including the
server's own admin key) can list *every* record of that entity across *every*
wedding, not just the one a slug/token happens to point at. The safe pattern
throughout this app is: keep the entity's own RLS as tight as its readers
allow, and for anything a genuinely anonymous caller must reach, mediate
through a server endpoint that resolves the token/slug itself and returns
only an explicit allowlist of fields — never let the client query the entity
directly.

## Entities the anonymous guest site actually touches (verified against the live `MultiPageWeddingWebsite.jsx` component tree + every guest-facing `api/*.js` endpoint)

| Entity | RLS today | Anonymous read path | Status |
|---|---|---|---|
| **WeddingDetails** | `read: null` (open) | `api/wedding-by-slug.js`, server-mediated, admin-key. Returns only `api/_lib/guestSafeWedding.js`'s explicit allowlist — `websitePassword`/`emergencyContacts`/`dayVendorContacts`/`contactPerson`/`celebrant`/`license`/Spotify OAuth tokens are never sent, `websitePassword` is replaced by a computed boolean. | App-level filter already correct. RLS itself still open — anyone with a raw Base44 token can bypass the filter and read the full row. **Step 2 (planned, not started):** hash `websitePassword`, encrypt `emergencyContacts`/`dayVendorContacts`/`contactPerson`/`celebrant`/`license`/`budget`, null out dead Spotify OAuth tokens. |
| **CustomGift**, **RegistryProduct** | `read: null` (open) | `api/wedding-by-slug.js`'s `fetchGuestSafeRegistry`, server-mediated, admin-key. | **Step 3 (planned, not started):** encrypt `payment_link_url` (CustomGift) and `purchased_by` (RegistryProduct) at write, decrypt only in `fetchGuestSafeRegistry`'s response. |
| **PollComment** | `read: null` (open) | `api/wedding-poll-results.js`, server-mediated, admin-key. | **Step 4 (planned, not started):** encrypt comment text at write, decrypt server-side in the results endpoint. |
| **Guest** | `read: null` (open) | `api/_lib/rsvpAuth.js`'s `resolveGuestByToken` — used by `api/rsvp-lookup.js`, `api/rsvp-submit.js`, `api/rsvp-poll-vote.js`, `api/questionnaire-lookup.js`, `api/questionnaire-answer-submit.js`, `api/wedding-attendees.js` — admin-key, resolves by `rsvp_link_id`/`plus_one_rsvp_link_id` token, no client-suppliable guest id. | **Not yet flipped.** This is the current launch blocker on `Guest`: the anonymous caller here has no Base44 session at all (only an opaque token), so there is no caller-token migration possible — same structural class as `SongRequest`'s anonymous-stamped rows. `Guest.read` staying `null` is required for this path regardless of what happens with the dashboard/collaborator/cron readers (Step 1). Full fix is the encrypt-at-rest project `BASE44_PLATFORM_NOTES.md`'s "`Guest`'s PII exposure is real..." section already scopes — not started. |
| **SongRequest** | `read: null` (open) | `api/song-request-submit.js`, create-only, no anonymous read path. | **Resolved, closed.** `guestEmail` was the only real PII; hashed to `guestEmailHash` (`fix/song-request-email-hash`, 2026-08-16). Remaining exposure is track metadata + a free-text note — accepted as non-sensitive by design, same reasoning as `Questionnaire` below. No further action planned. |
| **Questionnaire** | `read: null` (open) | `api/questionnaire-lookup.js`, admin-key. | **Resolved, closed.** Intentional — holds quiz copy, not guest PII. `QuestionnaireResponse` (the actual answers) already has `create:null/read:null` with AES-256-GCM-encrypted payloads and HMAC-hashed ids (`fix/questionnaire-response-rls`) — the sensitive half of this feature is already done. |
| **RsvpResponse**, **PollVote**, **GuestContactSubmission**, **CollaboratorGrant** | `create: null, read: null` (open by design) | Server-mediated only; every row is admin-key-stamped `created_by_id: "anonymous"` (Base44's own behavior, not chosen) — encrypted-by-design, same pattern as `QuestionnaireResponse`. | Working as designed, out of scope for this pass. |
| **PlanGift** | `create: null, read: null, update: null, delete: null` (open) | `api/_lib/planGift.js`, admin-key, Stripe webhook idempotency + gift-redemption lookup. | **Out of scope** — payments freeze. Sensitive fields (Stripe session/promotion-code linkage) are already opaque identifiers, not raw PII. Residual risk accepted. |
| **Hotel** | `create`/`read`/`update`/`delete` all owner-scoped | Not read by the anonymous guest site at all — accommodation content comes from `WeddingDetails.guestSuiteAccommodation`/`accommodation`, per `CLAUDE.md`'s Guest Suite single-source-of-truth rule. | Resolved. Open `create` closed to owner-scoped, 2026-08 (Batch 1). |

## Entities flipped to owner-scoped in the 2026-08 RLS pass, confirmed NOT touched by the anonymous guest site

Verified by grepping the entire `src/components/guest-website/**` tree (the actual `/w/:slug` component tree, not the dead `WeddingWebsite.jsx` legacy page) plus every guest-facing `api/*.js` endpoint for each name — zero hits in both passes:

`RegistryItem`, `LiveStream`, `GuestMessage`, `CustomEventPage`, `Music`, `Photo`, `Invitation`, `StoryMilestone`. Read RLS flipped to `{created_by_id: "{{user.id}}"}` (Batch 1). `StreamChat` locked (`read`+`create` both owner-scoped — live chat is out of launch scope, lock-and-park). None of these are reachable by an anonymous guest under any current route; the dashboard editor pages that manage some of them (`PhotoGallery.jsx`, `OurStory.jsx`, `Invitations.jsx`, `LiveStreaming.jsx`) are authenticated, reachable only via the couple's own session token, which safely satisfies the new RLS for their own records. `CustomEventPage` has zero references anywhere in `src/` — a fully orphaned entity, no UI at all.

## Guest — the current live blocker, in detail

`Guest.read` cannot simply flip to owner-scoped; three distinct admin-key/no-caller readers block it, in decreasing order of severity:

1. **`resolveGuestByToken`** (above) — six anonymous guest-facing endpoints, no caller identity possible. Blocks the flip outright until Guest gets the same encrypt-at-rest treatment `RsvpResponse`/`GuestContactSubmission` already have.
2. **`api/collaborator-guests.js`** — a collaborator (not the wedding owner) viewing the owner's guest list. Cross-account; a collaborator's own token can never satisfy `{created_by_id: owner's id}` (Base44 RLS has no OR). **Parked** 2026-08-16 (`fix/guest-rls-step1`): endpoint returns 503, UI shows a clear "temporarily unavailable" message. Rebuild path: a Base44-hosted function using `asServiceRole` (see `BASE44_PLATFORM_NOTES.md`'s "Hosted functions" section) — post-launch fast-follow.
3. **`api/cron/send-weekly-digest.js`** — a scheduled batch job iterating every wedding, no single caller to scope to. **Parked** 2026-08-16: unscheduled in `vercel.json`, handler no-ops. Rebuild path: a Base44-hosted scheduled automation using `asServiceRole` (3-minute run cap means the current single-pass loop needs to become paginated across runs) — post-launch fast-follow.

The one migratable reader, `api/my-guests-rsvp.js` (the couple's own dashboard guest list), was migrated to the caller's own forwarded bearer token 2026-08-16 — no longer admin-key-dependent. `api/guest-contact-review.js` was already caller-token for all `Guest` writes, verified, no change needed.

**Net: `Guest.read` stays `null` until item 1 above gets its own encrypt-at-rest project.** Items 2 and 3 no longer block it, but item 1 alone is sufficient to keep it open — flipping it today would break RSVP submission, RSVP lookup, poll voting, questionnaire access, and the attendee display for every real guest.
