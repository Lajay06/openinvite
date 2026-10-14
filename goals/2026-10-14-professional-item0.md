# Openinvite Professional, item 0: the scout and the Base44 boxes

Lane E, 2026-10-14. Companion to goals/2026-10-14-professional.md. Read-only findings, then the exact text for the owner to paste into Base44 chat. Lane E never calls update_entity_schema and never deploys a function; it keeps building against the adapter, src/lib/professionalStore.js, until the owner confirms.

## Data-model answers

1. **Who reads a couple's guests server-side today.** api/my-guests-rsvp.js reads the couple's Guest rows and WeddingDetails with the couple's own token, RsvpResponse with the admin key by `wedding_id`, and joins them on `hashId(guest.id) === guest_id_hash` (APP_HASH_KEY, through questionnaireCrypto). It aggregates with src/lib/rsvpAggregation.js (`latestEventResponses`, `deriveRsvpStatus`, `mergePlusOneEventResponses`). api/_lib/guestPii.js `mergeGuestPii` decrypts `encrypted_guest_pii` (APP_ENC_KEY) and overlays the ten PII fields. api/collaborator-guests.js is the cross-account precedent: grant check, admin-key Guest read by `created_by_id`, ownership re-checked per row, `excludeTestRecords`, `mergeGuestPii`, `DERIVED_FIELDS` stripped.
2. **The linked feed reuses those modules** and adds one thing: api/_lib/professionalFeed.js, an allowlist that writes every output key by name. Guest reads go through `mergeGuestPii`; replies and meals through rsvpAggregation and `effectiveMealChoice`. Nothing passes a row through.
3. **Tables.** The Table entity has owner-scoped read, so an admin-key read returns an empty list. The feed takes each guest's table from `Guest.table_assignment` (a reception-only display cache the seating page keeps). Seat numbers would need the hosted asServiceRole read that collaboratorRead uses; until the owner rules on extending it, the feed sends table names only. (api/cron/send-weekly-digest.js:119 reads Table with the admin key and probably gets nothing: noted for its owner lane, not touched.)
4. **Households and children.** `Guest.is_child`, `child_age`, `household_id` exist; the feed counts children from `is_child`.
5. **Keys.** api/_lib/appKeys.js exports `hmacHex` (APP_HASH_KEY) and `encKey()` (APP_ENC_KEY); the cipher is questionnaireCrypto's `encryptPayload` and `decryptPayload`. Every Pro `_hash` field uses `hmacHex`, every `_enc` field `encryptPayload`. appKeys.js is imported, never changed.
6. **The safe pattern.** The goal's own words: RLS is never opened. So every Pro entity is owner-scoped on all four operations, and the server reaches across accounts through one hosted function, `professionalData`, in the shape of collaboratorRead and collaboratorWrite: a shared-secret header, the caller re-identified from the forwarded token, the role checked on every call, a field allowlist. The one exception is PlannerLink, an append-only log like CollaboratorGrant (create null, read null, hashed identifiers), because the couple's approval must be the couple's own create.

## The freeze guard and the new billing files

scripts/check-payments-freeze.mjs freezes exactly `api/webhooks/` and five files (stripe webhook, create-checkout-session, planPricing, planGift, giftAuth). New files `api/professional/subscribe.js`, `api/professional/billing-portal.js`, `api/_lib/professionalBilling.js` and a rewards cron are not frozen by the guard. Lane E still treats them as payments: they ship in held PRs with a Payments-Change trailer, because the goal says the subscription is payments and the guard has no general heuristic. The webhook branch is frozen and needs the owner's passphrase push.

## Lane C's referral design, and how the engines join

goals/2026-10-10-pay-it-forward.md: `REFERRALS_ENABLED`, `User.referral_code`, `User.referred_by_code`, a `ReferralJoin` log, one shared FRIEND10 Stripe promotion code made by hand, no reward to the referrer, a count of friends who joined. State: ruled, not started. Nothing is built: no files, no entities, no branches.

So lane E builds the engine generically, in src/lib/professionalReferral.js and api/_lib/professionalReferral.js, with two kinds: `couple` (lane C's: a code, a join, no reward) and `partner` (a code, a Stripe promotion code per code, a reward ledger with pending, earned, credited and cancelled). Lane C's ReferralJoin becomes the couple kind's join log. Two things for lane C: its design still says the hash key is BASE44_ADMIN_KEY (stale since #1011; it should be APP_HASH_KEY), and its item 7 notes that Stripe rejects `discounts` together with `allow_promotion_codes`, which applies to partner codes too, so a partner code is typed at checkout, never pre-applied.

## The Base44 boxes

Paste each box into Base44 chat as written. Every entity: all four RLS operations owner-scoped, `{"created_by_id": "{{user.id}}"}`, unless the box says otherwise. Every `is_test` is a boolean, default false.

**Box 1, User**

```
Add one optional field to the User entity: accountType, a string enum with the values "couple" and "professional". No default. Change nothing else on User.
```

**Box 2, ProWorkspace**

```
Create an entity ProWorkspace. Fields: owner_user_id_hash (string, required), name (string, required), plan (string enum: trial, solo, team, agency; required), plan_status (string enum: trialing, active, past_due, cancelled; required), event_limit (number), seat_limit (number), stripe_customer_id (string), stripe_subscription_id (string), brand_logo_url (string), brand_name (string), trial_ends_at (date-time), cancelled_at (date-time), reward_cap_monthly (number, default 500), is_test (boolean, default false). RLS: create, read, update and delete all {"created_by_id": "{{user.id}}"}.
```

**Box 3, ProMember**

```
Create an entity ProMember. Fields: workspace_id (string, required), member_user_id_hash (string), member_email_hash (string, required), name_enc (string), role (string enum: owner, planner, assistant, dayof; required), assigned_event_ids (array of strings), event_type (string enum: invite, accept, update, remove; required), is_test (boolean, default false). Rows are an append-only log; the newest row for a member decides. RLS: create, read, update and delete all {"created_by_id": "{{user.id}}"}.
```

**Box 4, ProEvent**

```
Create an entity ProEvent. Fields: workspace_id (string, required), couple_names_enc (string, required), event_date (date), venue (string), status (string enum: active, archived; required), kind (string enum: linked, standalone; required), guest_estimate (number), assigned_member_ids (array of strings), template_id (string), frozen_totals (object), is_test (boolean, default false). RLS: all four {"created_by_id": "{{user.id}}"}.
```

**Box 5, PlannerLink**

```
Create an entity PlannerLink. Fields: event_id (string, required), workspace_id (string, required), couple_user_id_hash (string), couple_email_hash (string), wedding_id_hash (string), shares (object), event_type (string enum: request, approve, update, unlink; required), invite_token_hash (string), is_test (boolean, default false). Rows are an append-only log; the newest decides. RLS: create null, read null, update {"created_by_id": "{{user.id}}"}, delete {"created_by_id": "{{user.id}}"}.
```

**Box 6, PlannerLinkView**

```
Create an entity PlannerLinkView, the read log. Fields: event_id (string, required), wedding_id_hash (string, required), viewer_member_hash (string, required), viewed_at (date-time, required), is_test (boolean, default false). RLS: create null, read null, update {"created_by_id": "{{user.id}}"}, delete {"created_by_id": "{{user.id}}"}.
```

**Box 7, ProGuest**

```
Create an entity ProGuest, for standalone events only. Fields: event_id (string, required), name_enc (string, required), dietary_enc (string), meal (string), table (string), plus_one (boolean), child (boolean), status (string enum: coming, not_coming, waiting), is_test (boolean, default false). It must never have an email, phone or address field. RLS: all four {"created_by_id": "{{user.id}}"}.
```

**Box 8, RunSheetRow**

```
Create an entity RunSheetRow. Fields: event_id (string, required), sheet (string, required), start_minute (number, required), duration_minutes (number, required), item (string, required), location (string), owner_ref (string), cue (string), notes_enc (string), status (string enum: todo, done, skipped), sort (number), is_test (boolean, default false). RLS: all four {"created_by_id": "{{user.id}}"}.
```

**Box 9, VendorContact and VendorBooking**

```
Create an entity VendorContact. Fields: workspace_id (string, required), role (string), company (string, required), contact_enc (string), phone_enc (string), email_enc (string), insurance_expires (date), notes_enc (string), is_test (boolean, default false). RLS: all four {"created_by_id": "{{user.id}}"}.

The name VendorBooking is already taken by the couple-side entity. Create a new entity ProVendorBooking instead. Fields: event_id (string, required), vendor_id (string, required), role (string), fee (number), deposit (number), contract_file (string), arrive_minute (number), finish_minute (number), link_token_hash (string), link_expires_at (date-time), link_revoked (boolean), is_test (boolean, default false). RLS: all four {"created_by_id": "{{user.id}}"}.
```

**Box 10, money, tasks, templates, forms, files, notes**

```
Create these entities, each with RLS all four {"created_by_id": "{{user.id}}"} and is_test (boolean, default false):
PaymentDue: event_id (string, required), booking_id (string), label (string, required), amount (number, required), due_date (date, required), payer (string enum: couple, planner, other), status (string enum: due, paid, cancelled).
ProCost: event_id (string, required), kind (string enum: fee, commission, cost; required), label (string, required), amount (number, required).
ProTask: event_id (string), title (string, required), owner_id (string), due_date (date), done (boolean), months_out (string).
ProTemplate: workspace_id (string, required), kind (string enum: runsheet, checklist, budget, questionnaire, vendors; required), name (string, required), body (object, required).
ProQuestionnaire: event_id (string, required), title (string, required), questions (array of objects), answers_enc (string), token_hash (string), status (string enum: draft, sent, answered).
ProDocument: event_id (string, required), kind (string enum: contract, floorplan, license, insurance, other), name (string, required), file_url (string, required).
ProNote: event_id (string, required), author_member_id (string), body_enc (string, required), kind (string enum: note, meeting).
```

**Box 11, PartnerCode and PartnerReward**

```
Create an entity PartnerCode. Fields: workspace_id (string, required), code (string, required), code_hash (string, required), label (string), stripe_promotion_code_id (string), status (string enum: active, revoked; required), is_test (boolean, default false). RLS: all four {"created_by_id": "{{user.id}}"}.

Create an entity PartnerReward. Fields: code_id (string, required), workspace_id (string, required), couple_user_id_hash (string, required), plan (string enum: pro, ultra; required), amount (number, required), status (string enum: pending, earned, credited, cancelled; required), earn_after (date-time, required), stripe_balance_txn_id (string), is_test (boolean, default false). RLS: all four {"created_by_id": "{{user.id}}"}.
```

**Box 12, the hosted function (owner deploys, never a bare base44 deploy)**

```
When lane E's PR adds base44/functions/professionalData/entry.ts: set its secrets with base44 secrets set PRO_FN_SECRET (new, 64 hex) and APP_HASH_KEY (the production value already in Vercel), then base44 functions deploy professionalData. Add PRO_FN_SECRET to Vercel production and preview.
```

## Differences from the goal's proposal, stated

- VendorBooking is already a couple-side entity name, so the professional one is ProVendorBooking.
- PlannerLinkView is new: the read log ("Last viewed by your planner") needs rows the planner's server call can write and the couple's page can read, which is the append-only shape, not a field on PlannerLink.
- ProCost is new, for item 7 of the product list (the professional budget: fee, commissions, costs).
- ProMember gains event_type so seats are an append-only log, like CollaboratorGrant.
