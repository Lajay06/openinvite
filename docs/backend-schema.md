# Backend schema

Every Base44 entity this app uses, as the live workspace actually declares it.

**Generated 2026-08-18** by reading `list_entity_schemas` through the workspace
MCP, entity by entity — not from `base44/entities/*.jsonc`, and not from any
in-repo snapshot. That distinction is the reason this file exists in the form it
does; see "Why this is generated from live" below.

Covers all **48** entities.

## How to read this

**RLS is per-operation.** Each entity declares `create` / `read` / `update` /
`delete` independently. A rule of `null` means **no restriction** — the
operation is open to anyone holding any valid API token for this app. A rule of
`{"created_by_id": "{{user.id}}"}` scopes the operation to rows the calling user
created.

**`read: null` means world-readable.** Not "readable by logged-in users of this
wedding" — readable by anyone who can authenticate to the app at all, across
every wedding. This was confirmed empirically on 2026-08-03: an unauthenticated
request against `RsvpResponse` returned all 2010+ rows across 472 weddings. Every
`read: null` entity below is therefore a place where **field-level encryption,
not RLS, is what protects the data.**

**The admin key is not a superuser.** `BASE44_ADMIN_KEY` is evaluated against
these same rules. Against an owner-scoped entity it reads `200` with an empty
array (silently filtered) and writes `403`. See `BASE44_PLATFORM_NOTES.md`.

**Undeclared fields are dropped on write and withheld on read.** A field absent
from the schema below does not persist, and a stored value from when it *was*
declared will not be returned. Undeclaring never erases stored data (gotcha #5).

## Why this is generated from live

The previous generation of schema tooling read an embedded snapshot committed to
the repo. It drifted in both directions at once: it omitted fields added after
its last refresh, and it *asserted* two fields (`Note.status`, `Note.view_type`)
as declared when they never had been. The second failure is the dangerous one —
writing a false registration down permanently silenced the drop-scanner for a
live data-loss bug it existed to catch (#483).

`base44/entities/*.jsonc` is the working mirror and is kept synced under RULE 12,
but it has lagged live before — six `WeddingDetails` fields were declared in
Base44 and absent from the mirror as recently as this session. **When this
document and the mirror disagree, live wins and the mirror needs a sync.**

## RLS posture at a glance

### World-readable (`read: null`) — 20 entities

Protected by field-level encryption and hashing, not by RLS.

| Entity | create | update | delete | What guards the data |
|---|---|---|---|---|
| `Guest` | null | owner | owner | `encrypted_guest_pii` blob; plaintext PII columns nulled |
| `WeddingDetails` | null | owner | owner | Per-field ciphertext + `guestSafeWedding` read allowlist |
| `RsvpResponse` | null | owner | owner | `guest_id_hash` + `encrypted_guest_level` |
| `QuestionnaireResponse` | null | owner | owner | `*_id_hash` + `encrypted_answers` |
| `GuestContactSubmission` | null | **null** | **null** | `email_hash` + `encrypted_contact_details` |
| `CollaboratorGrant` | null | owner | owner | All three identifiers HMAC-hashed |
| `PlanGift` | null | **null** | owner | `*_enc` ciphertext for buyer/recipient/note |
| `SongRequest` | null | `data.ownerUserId` | owner | `guestEmailHash`; owner-stamped update scope |
| `PollVote` | null | owner | owner | `guest_identifier` HMAC digest |
| `PollComment` | null | owner | owner | **Nothing — `text` is plaintext** |
| `GuestbookEntry` | null | owner | owner | **Nothing — `guest_name`/`message` plaintext** |
| `RegistryProduct` | null | owner | owner | `guestSafeRegistry` allowlist on the guest-facing read |
| `CustomGift` | null | owner | owner | No sensitive fields by design |
| `VendorReview` | null | owner | owner | No sensitive fields by design |
| `Questionnaire` | owner | owner | owner | Question text only; answers live elsewhere |
| `Event` | admin | admin | admin | Reference data |
| `Restaurant` | admin | admin | admin | Reference data |
| `ThemeDetails` | admin | admin | admin | Reference data |
| `WebsiteTheme` | admin | admin | admin | Reference data |
| `User` | — | — | — | No RLS block declared; built-in entity |

`GuestContactSubmission` is the only entity with **all four** operations open.
That is deliberate and documented in its own schema: Base44 stamps every row
`created_by_id: "anonymous"` regardless of what the create call supplies, so an
owner-scoped update rule would lock out the real owner as well as an attacker.
Ownership is enforced in application code by `api/guest-contact-review.js`.

### Owner-scoped read — 26 entities

`read`/`update`/`delete` all scoped to `{"created_by_id": "{{user.id}}"}`.
`create` is `null` unless noted.

`Budget`, `Collaborator`, `CustomEventPage`, `GuestMessage`, `Hotel` (create:
owner), `Invitation`, `LiveStream`, `MoodboardItem`, `Music`, `Note`, `Photo`,
`QuoteRequest`, `ReceivedGift`, `RegistryItem`, `RlsExperimentThrowaway`
(update/delete: null), `Schedule`, `StoryMilestone`, `StreamChat` (create:
owner), `Table`, `Task`, `Vendor`, `VendorBooking`, `VendorLog`, `VendorTask`,
`VenueAsset`, `VowSpeech`.

`UserPayment` is owner-scoped for `read` but admin-role for `create`/`update`/
`delete`.

### Recipient-scoped — 1 entity

`Notification` scopes `read`/`update`/`delete` on `{"data.recipient_user_id":
"{{user.id}}"}` rather than `created_by_id`, precisely so admin-key-created rows
remain visible to their recipient.

## Encrypted-field contracts

Two distinct constructions are in use, with two distinct keys. Confusing them is
the main hazard here.

### AES-256-GCM ciphertext — reversible

`base64(iv + authTag + ciphertext)` via `api/_lib/questionnaireCrypto.js`'s
`encryptPayload()` / `decryptPayload()`. Decryptable server-side only.

| Field | Key | Plaintext contents |
|---|---|---|
| `Guest.encrypted_guest_pii` | `BASE44_ADMIN_KEY` (SHA-256) | The ten PII fields as one object |
| `Guest.rsvp_link_id_enc` | **`RSVP_TOKEN_KEY`** | The guest's RSVP token |
| `Guest.plus_one_rsvp_link_id_enc` | **`RSVP_TOKEN_KEY`** | The plus-one's RSVP token |
| `RsvpResponse.encrypted_guest_level` | `BASE44_ADMIN_KEY` | `{song_request, note, dietary_restrictions, email}` |
| `QuestionnaireResponse.encrypted_answers` | `BASE44_ADMIN_KEY` | `{guest_name, answers, submitted_at}` |
| `GuestContactSubmission.encrypted_contact_details` | `BASE44_ADMIN_KEY` | `{name, email, phone, mailing_address}` |
| `PlanGift.buyer_email_enc` | `BASE44_ADMIN_KEY` | Buyer's email from Stripe |
| `PlanGift.buyer_name_enc` | `BASE44_ADMIN_KEY` | Buyer's name (optional) |
| `PlanGift.recipient_email_enc` | `BASE44_ADMIN_KEY` | Recipient's email |
| `PlanGift.recipient_note_enc` | `BASE44_ADMIN_KEY` | Buyer's note to recipient |
| `WeddingDetails.budget` | `BASE44_ADMIN_KEY` | `{total, categories}` |
| `WeddingDetails.celebrant` | `BASE44_ADMIN_KEY` | `{name, title, phone, email, type, notes}` |
| `WeddingDetails.contactPerson` | `BASE44_ADMIN_KEY` | `{name, phone}` |
| `WeddingDetails.dayVendorContacts` | `BASE44_ADMIN_KEY` | Array of `{name, phone, role}` |
| `WeddingDetails.emergencyContacts` | `BASE44_ADMIN_KEY` | `{primary, backup, venue, otherNotes}` |
| `WeddingDetails.license` | `BASE44_ADMIN_KEY` | Marriage-licence detail object |

**Key separation is deliberate.** `RSVP_TOKEN_KEY` is not the admin key because
RSVP tokens are externally distributed bearer capabilities — they must not share
the admin key's failure domain.

**Rotation hazard.** Rotating either key requires a decrypt-old / re-encrypt-new
migration *before* the old key retires. For `RSVP_TOKEN_KEY` this additionally
invalidates every stored HMAC.

**Mixed-row reads.** Several `WeddingDetails` fields carry legacy plaintext rows
alongside ciphertext. The discriminator is `typeof value === 'string'`, which is
unambiguous because the plaintext form was always an object or array.

### HMAC-SHA256 — one-way, lookup only

Never reversible; used for equality matching and dedup.

| Field | Key | Hashes |
|---|---|---|
| `Guest.rsvp_link_id_hash` | **`RSVP_TOKEN_KEY`** | The RSVP token — the lookup key for `/rsvp/:token` |
| `Guest.plus_one_rsvp_link_id_hash` | **`RSVP_TOKEN_KEY`** | The plus-one's token |
| `RsvpResponse.guest_id_hash` | `BASE44_ADMIN_KEY` | `Guest.id` |
| `QuestionnaireResponse.guest_id_hash` | `BASE44_ADMIN_KEY` | `Guest.id` |
| `QuestionnaireResponse.questionnaire_id_hash` | `BASE44_ADMIN_KEY` | `Questionnaire.id` |
| `GuestContactSubmission.email_hash` | `BASE44_ADMIN_KEY` | Lowercased email |
| `SongRequest.guestEmailHash` | `BASE44_ADMIN_KEY` | Guest's email |
| `CollaboratorGrant.owner_user_id_hash` | `BASE44_ADMIN_KEY` | Owner's `User.id` |
| `CollaboratorGrant.collaborator_user_id_hash` | `BASE44_ADMIN_KEY` | Collaborator's `User.id` |
| `CollaboratorGrant.collaborator_email_hash` | `BASE44_ADMIN_KEY` | Lowercased invited email |
| `PollVote.guest_identifier` | `BASE44_ADMIN_KEY` | `Guest.id`, or a client anonymous id |
| `PlanGift.buyer_user_id_hash` | `BASE44_ADMIN_KEY` | Buyer's `User.id`, null if not signed in |
| `PlanGift.redeemed_user_id_hash` | `BASE44_ADMIN_KEY` | Redeemer's `User.id` |

### One-way scrypt

`WeddingDetails.websitePassword` — format `scrypt$<saltHex>$<digestHex>`,
per-value random salt. Deliberately **not** keyed on any secret so that key
rotation can never invalidate couples' gates. Verified with
`crypto.timingSafeEqual`. Never returned to any client; the API substitutes a
`websitePasswordIsSet` boolean. `websitePasswordEnabled` is the sole source of
truth for the gate being on — the credential field must not be used to infer it.

## Migration states currently in flight

Two families are mid-migration and carry both old and new representations. Both
use **null as the discriminator** rather than a stored boolean, so there is no
second source of truth that can drift.

### Guest PII (Tracks C/D)

`encrypted_guest_pii != null` means migrated and the blob is authoritative.
Ten plaintext columns — `email`, `phone`, `mailing_address`,
`dietary_restrictions`, `special_requests`, `notes`, `plus_one_name`,
`plus_one_email`, `plus_one_dietary_restrictions` — are nulled at Track D.

`name` is the exception: it stays non-null at the schema level and holds a
**stable placeholder** (`—`), because the field is required. Any surface reading
`Guest.name` directly instead of through the `api/my-guests.js` chokepoint will
render that placeholder. Verified 2026-08-18 that no Base44 query sorts or
filters `Guest` by name.

### RSVP tokens (Track E)

`rsvp_link_id_hash`/`_enc` are authoritative after E3; the plaintext
`rsvp_link_id` and `plus_one_rsvp_link_id` are nulled.

**Neither family's legacy columns may be undeclared yet.** Undeclaring drops the
stored data, and both need a separate post-migration cleanup pass.

## Free-string fields that look like enums

Three meal fields are deliberately **not** enums: `Guest.meal_choice`,
`Guest.plus_one_meal_choice`, and `RsvpResponse.meal_choice`. They store a meal
option **id**, never a display label, so renaming a menu option never orphans a
stored answer. Ids are either one of six defaults (`beef`, `chicken`, `fish`,
`vegetarian`, `vegan`, `kids_meal`) or a couple-defined id from
`WeddingDetails.mealOptions`, whose shape is generated at runtime and therefore
cannot be enumerated in a schema. Validation belongs to the `GuestForm` select,
built from that wedding's own menu.

The contrast is `Note.status` and `Note.priority`: app-defined fixed sets, where
an enum *is* correct.

**Enums are not enforced on write (gotcha #20).** Writing a value outside a
declared enum returns `200` and stores it. Enum declarations document intent;
they do not constrain. Any real validation must live in application code.

## Per-entity field reference

Field counts are top-level properties.

| Entity | Fields | Required | Notes |
|---|---|---|---|
| `Budget` | 8 | category, item_name, budgeted_amount | Line items; `WeddingDetails.budget` is the encrypted summary |
| `Collaborator` | 7 | name, email, permissions | `accepted_user_id` written by admin key at accept time |
| `CollaboratorGrant` | 7 | owner/collaborator hash, event_type | Append-only log; latest event per pair wins |
| `CustomEventPage` | 11 | title, slug | |
| `CustomGift` | 6 | title, requested_amount | `payment_link_url` is the couple's own external link |
| `Event` | 4 | couple_names | Admin-managed reference data |
| `Guest` | 39 | name | See migration states above |
| `GuestbookEntry` | 4 | wedding_id, guest_name, message | Plaintext under `read: null` |
| `GuestContactSubmission` | 5 | wedding_id | All four RLS operations open |
| `GuestMessage` | 12 | guest_name, guest_email, message | Owner-scoped; plaintext contact detail |
| `Hotel` | 13 | name | |
| `Invitation` | 6 | couple_names, wedding_date | `design` holds the full section tree |
| `LiveStream` | 8 | title, stream_url | |
| `MoodboardItem` | 10 | title, image_url | |
| `Music` | 15 | song_title, artist | `sourceSongRequestId` is the add-idempotency guard |
| `Note` | 11 | title | `status`/`view_type` declared 2026-08-18 |
| `Notification` | 8 | recipient_user_id, type, title | Recipient-scoped RLS |
| `Photo` | 8 | image_url, category | |
| `PlanGift` | 19 | session, plan, recipient, promo, coupon | Gift purchase + redemption ledger |
| `PollComment` | 4 | — | `text` plaintext under `read: null` |
| `PollVote` | 5 | — | Latest vote per `poll_id`+`guest_identifier` |
| `Questionnaire` | 8 | title | Question text only |
| `QuestionnaireResponse` | 5 | both hashes, encrypted_answers | |
| `QuoteRequest` | 9 | vendor_id, vendor_name, event_date, message | |
| `ReceivedGift` | 12 | item_name | |
| `RegistryItem` | 4 | store_name, url | Store links |
| `RegistryProduct` | 13 | name, price | `purchased_by` withheld from guest reads |
| `Restaurant` | 13 | name | Admin-managed reference data |
| `RlsExperimentThrowaway` | 1 | — | Test artefact; safe to delete |
| `RsvpResponse` | 10 | — | Per-event row or guest-level row, never both |
| `Schedule` | 9 | event_name, event_date, start_time | |
| `SongRequest` | 18 | title, artist, submittedBy | 231 orphaned unstamped rows are permanently unupdatable |
| `StoryMilestone` | 5 | title, date | |
| `StreamChat` | 4 | stream_id, guest_name, message | |
| `Table` | 8 | name, capacity, shape | `event_id` backfilled to `reception` |
| `Task` | 9 | title | Same shape as `Note` minus status/view_type |
| `ThemeDetails` | 7 | — | Admin-managed reference data |
| `User` | 7 | — | Built-in; see below |
| `UserPayment` | 5 | amount, status | Admin-role writes |
| `Vendor` | 47 | name, category | Largest non-`WeddingDetails` entity |
| `VendorBooking` | 12 | vendor_id, vendor_name, service_type, event_date, total_amount | |
| `VendorLog` | 9 | vendor_id, type, subject | |
| `VendorReview` | 7 | vendor_id, rating, review_text, reviewer_name | |
| `VendorTask` | 6 | vendor_id, title | |
| `VenueAsset` | 8 | name, type, x, y, width, height | `event_id` backfilled to `reception` |
| `VowSpeech` | 5 | title, type, author, content | |
| `WebsiteTheme` | 8 | — | Admin-managed reference data |
| `WeddingDetails` | 98 | — | The central entity |

### `User` is special

The built-in `User` entity declares **no RLS block at all** and persists
arbitrary fields regardless of whether they are declared. A drop-scanner finding
against `User` is therefore always a false positive, and the scanner
short-circuits it (`SCHEMALESS_ENTITIES` in `scripts/lib/schemaDropScan.mjs`).

Declared: `language`, `currency`, `onboarding_completed`, `tempUnit`,
`deletionRequestedAt`, `trialStartedAt`, `notification_prefs`. Code also writes
`full_name` and `plan_step_completed`, which persist despite being undeclared.

## Keeping this current

Regenerate after any schema change:

1. Read live via `list_entity_schemas` through the workspace MCP.
2. Sync `base44/entities/*.jsonc` for any entity that changed (RULE 12).
3. Run `npm run audit:schema` — it reads the mirror, so a mirror gap now shows
   up as a false-positive `DROPPED` finding rather than silence.

A field that appears in code but in neither the mirror nor live is a **silent
write**: Base44 returns `200` and discards it.
