# Step 3 follow-ups — two read-only audits

Prepared 2026-08-17 against main `5319b47`. **No code written.** Payments-path
files read only, never modified.

Both audits changed the recommended action, so neither was built.

---

## A. `purchased_by.guest_email` — the CONFIRM passed, but the premise did not

### The CONFIRM you asked for: passed

**No couple-facing UI displays `purchased_by[].guest_email`.** Verified
repo-wide:

- `RegistryProductList.jsx` *collects* it (`:138`) and gates the submit button
  on it (`:154`), but renders only `quantity_purchased` counts (`:53`, `:144`).
- Nothing anywhere renders a `purchased_by` element. The only other references
  are the write (`Registry.jsx:126`), a form default
  (`RegistryProductForm.jsx:35`), and the guest-safe exclusion.
- `ReceivedGifts.jsx` *does* display an email (`:312`) — but that is
  `ReceivedGift.giver_email`, a **different entity** (`base44.entities.ReceivedGift`,
  `:13`). Not this field. Flagged only so the two are not conflated later.
- `Messages.jsx` likewise displays `GuestMessage.guest_email` — again a
  different entity.

### But: the field is never read at all

The instruction's rationale was *"guest_email exists for dedup"*. **There is no
dedup.** `purchased_by[].guest_email` is written and never read — not for
deduplication, not for display, not for export, not for anything.

The contrast with the pattern we were told to copy is the tell.
`SongRequest` genuinely dedups on its hash:

```js
// api/song-request-submit.js:168
const alreadySubmitted = existing.some(r => r.guestEmailHash === guestEmailHash);
```

`RegistryProduct` has no equivalent line, because there is no equivalent
feature. #432 hashed a field that was *doing a job*. This field does none.

### Three different fields, three different decisions — do not conflate them

| field | entity | displayed to the couple? | decision |
|---|---|---|---|
| `purchased_by[].guest_email` | `RegistryProduct` | **no** — nothing renders it | **stop collecting** (this decision) |
| `giver_email` | `ReceivedGift` | **yes** (`ReceivedGifts.jsx:312`) | Guest-family **encryption candidate** — untouched here |
| `guest_email` | `GuestMessage` | **yes** (`Messages.jsx:257`) | Guest-family **encryption candidate** — untouched here |

The names are nearly identical and the entities are adjacent in the product,
which is exactly how a later pass could apply this decision to the wrong one.
The two that ARE displayed serve a real purpose and must not simply be dropped;
they are separate candidates on their own merits.

### Why that changes the recommendation

Hashing it would preserve, in perpetuity, a value the product collects from a
guest and never uses. That is still collection without purpose — a
data-minimisation problem a hash does not solve. It also costs a schema field,
a description, and a code path to maintain.

**Worse, the form currently *requires* it.** The submit button is disabled
without an email (`:154`), so a couple recording a purchase is forced to type
a guest's address that the product will never do anything with.

### Options, for your decision

1. **Stop collecting it.** Remove the input and the required-check; drop the
   key from the written object. Smallest change, best privacy outcome, and no
   feature is lost because no feature uses it. Leaves the declared schema field
   harmlessly unused (0 rows), to be dropped in the post-launch dead-field pass.
2. **Keep collecting, make it optional, hash it.** Only worth it if you expect
   a near-term feature that needs purchaser email — thank-you emails sent from
   the product, say. But note a hash cannot send an email, so if that is the
   plan, hashing is the wrong transform and encryption is the right one.
3. **Build the hash as originally instructed.** Honest assessment: this is the
   weakest option. It hardens a field that has no consumer, while leaving the
   collection-without-purpose problem intact.

**Recommendation: (1)**, unless you know of a planned feature that needs the
address, in which case (2) with encryption rather than hashing.

I have not built any of them. This needs your call because the instruction's
premise turned out not to hold.

---

## B. `PlanGift` writer audit — and a correction to my own escalation

### I was wrong to call it an oversight

My Step 3 report escalated `update: null` / `delete: null` as *"an oversight
rather than a decision"*, reasoning that the field descriptions discussed
`read` and never mentioned update or delete.

They do discuss it — in a file I had not read. `api/_lib/giftAuth.js:4-12`
states the decision outright:

> PlanGift has create:null/read:null/update:null/delete:null (PR G4, gifting
> v2 bridge) — mirrors QuestionnaireResponse/RsvpResponse: **the admin key has
> no session identity, so it can never satisfy an owner-scoped {{user.id}} RLS
> rule on any operation**, confirmed empirically... Because this table is
> listable unscoped by anyone with any API token, identifying fields are HMAC
> digests and readable content (emails, personal notes) is AES-256-GCM
> ciphertext.

So it was reasoned, and the compensating controls exist *because* of it. My
escalation was right that the exposure is real and wrong about how it got
there. The correction matters, because "oversight" invites a quick flip and
"deliberate trade-off" invites checking what the trade-off was protecting.

### The audit

**Every** `PlanGift` write path, repo-wide:

| # | operation | call site | credential |
|---|---|---|---|
| 1 | create | `api/webhooks/stripe.js:259` -> `createPlanGift` | **admin key** |
| 2 | update | `api/webhooks/stripe.js:297` -> `updatePlanGift` (`recipient_email_sent`, `recipient_email_error`) | **admin key** |
| 3 | update | `api/webhooks/stripe.js:480` -> `updatePlanGift` (`redeemed_at`, `redeemed_user_id_hash`) | **admin key** |
| — | delete | **none anywhere in the repo** | — |
| — | any client access | **none** — `PlanGift` never appears in `src/` | — |

All three go through `api/_lib/planGift.js`, which takes `adminKey` as a
parameter and sends it as the bearer on every request (`:26, :37, :49, :79, :90`).

### What that means for the flip, per operation

**`update` — cannot be scoped. Confirmed exactly as you anticipated.**
Both update paths use the admin key, so *any* owner-scoped rule breaks them
silently (gotcha #1: 403 on write, and the webhook's own error handling would
surface it as a failed activation). The `data.<field>` pattern does not rescue
it either, and this is worth being precise about:

- `buyer_user_id_hash` is an **HMAC**, not a raw id, so `{{user.id}}` can never
  equal it. The pattern needs a stored *raw* user id, which this entity
  deliberately does not keep — precisely because `read: null` makes it listable.
- The buyer may not be logged in at all (the field's own description: *"null
  when the buyer wasn't logged in"*), so for those rows there is no user to
  scope to under any scheme.
- The recipient is an email address, not necessarily an app user.

So scoping `update` would require either storing a raw buyer id (undoing a
deliberate privacy decision) or a hosted function with `asServiceRole`.

**`delete` — CAN be closed, at zero functional cost.**
Nothing in the repo deletes `PlanGift`. Rows are created by the admin key, so
`created_by_id` is `"anonymous"` and no real user could satisfy
`{created_by_id: "{{user.id}}"}`. Setting delete to that rule therefore makes
deletion impossible for everyone — which is the desired state for a payment
record, and breaks nothing because no code path deletes.

### Residual risk if only `delete` is closed

Honest statement: closing delete does **not** close the integrity hole. With
`update` still open, an attacker with any API token could still flip `status`
between `purchased` and `redeemed`, or overwrite `promotion_code_display`.
Encryption does not help — those fields are deliberately plaintext because
they are not secrets.

Mitigating context, not an argument to ignore it: **0 real `PlanGift` rows
exist** (1 row, `is_test: true`). The exposure is currently theoretical, and
the entity is the natural first candidate for the hosted-functions rebuild,
where `asServiceRole` makes a fully-locked table workable.

### Recommendation

1. **Close `delete` now** — `{created_by_id: "{{user.id}}"}`. Zero functional
   impact, verified by the audit, and removes the ability to destroy a payment
   record outright.
2. **Leave `update` open**, documented as an accepted risk with the reason,
   rather than left looking accidental. Add it to the hosted-functions
   rebuild list alongside `SongRequest` and the `Guest.update` collaborator gap
   — all three have the identical cause.
3. **Do not touch `create` or `read`.** The webhook needs create; read is what
   the encryption and hashing were designed around.

No code changes proposed to any frozen file. This is a schema/RLS decision for
you.

---

## Payments-path confirmation

`api/webhooks/stripe.js`, `api/create-checkout-session.js` and
`api/_lib/planGift.js` were **read only**. No modifications, this session or
in the working tree.
