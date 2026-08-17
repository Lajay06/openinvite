# Security Step 3 — report

`CustomGift.payment_link_url` + `RegistryProduct.purchased_by`.
Prepared 2026-08-17 against main `6a504a6`. **Report only, no code.**

Payments path read-only throughout: `api/webhooks/stripe.js` and
`api/create-checkout-session.js` were read, never modified. Confirmed below.

---

## 1. Writer audit — first, per gotcha #17

### `CustomGift`

| writer | operation | credential |
|---|---|---|
| `src/pages/Registry.jsx:91` | create | client, couple's own token |
| `src/pages/Registry.jsx:90` | update | client, couple's own token |
| `src/pages/Registry.jsx:114` | delete | client, couple's own token |

### `RegistryProduct`

| writer | operation | credential |
|---|---|---|
| `src/pages/Registry.jsx:99` | create | client, couple's own token |
| `src/pages/Registry.jsx:98` | update | client, couple's own token |
| `src/pages/Registry.jsx:118` | delete | client, couple's own token |
| `src/pages/Registry.jsx:125` | update — **`purchased_by` append** | client, couple's own token |

**There is no server-side writer for either entity.** The only `api/`
references are the two guest-safe READS in `api/wedding-by-slug.js:109/112`.

Every write is the couple acting on their own rows through
`base44.entities.*`, and both entities are owner-scoped on update and delete,
so the couple can only ever touch their own. Collaborators reach the page in
`readOnly` mode, which withholds the edit/delete/purchase handlers entirely
(`Registry.jsx:217/220`).

**Consequence for any encryption of these fields: the writers are already
correctly scoped, but they are all CLIENT-SIDE.** That is the decisive fact
for §4 — it is the opposite of the Step 2b situation, where writers were
unscoped but server-side.

---

## 2. What the two fields actually hold, and current exposure

### `CustomGift.payment_link_url`

The couple's own external payment link (PayPal.me, Venmo, a Stripe Payment
Link, etc.). Guests are sent to it to contribute. **No money moves through
Openinvite** — that is the deliberate no-money-through-the-product design from
#304.

Guest exposure is *intended*: the link's whole purpose is to be clicked by
guests. `api/_lib/guestSafeRegistry.js:52` includes it only when
`isSafeHttpsUrl()` passes, so a non-https or malformed value is dropped
entirely rather than rendered. `WeddingRegistryPage.jsx:32` renders the
Contribute button only when the field survived that filter.

**It is not a secret.** It is a URL the couple publishes on a public wedding
site. The sensitivity is *integrity*, not confidentiality: if it were altered,
guests' money would go to an attacker's account. Confidentiality-oriented
encryption at rest would protect the wrong property.

### `RegistryProduct.purchased_by`

An array of `{guest_name, guest_email, quantity, purchase_date, message}`.
**This is guest PII in plaintext**, and unlike the payment link it is
*couple-private* — `guestSafeRegistry.js` excludes it from the guest payload
by allowlist, deliberately (`:13`, `:65`).

Worth being precise about who writes it: it is appended by the **couple**
(`Registry.jsx:125`) when they mark an item purchased. Guests do not write it.
So the guest emails in it were typed or imported by the couple, not
self-submitted.

---

## 3. Current data — both fields are empty

Read with the new fail-closed `adminRead` helper (all three entities have
`read: null`, so an admin read is legitimate here):

| | count |
|---|---|
| `CustomGift` rows | 1 |
| …with `payment_link_url` set | **0** |
| …with a non-https link value | 0 |
| `RegistryProduct` rows | **0** |
| …`purchased_by` entries | **0** |
| …entries carrying a `guest_email` | **0** |

So **there is no plaintext PII in either field today, and no live payment
link.** As with every earlier stage in this programme, a migration would be a
no-op. That should be recorded as the reason for closing rather than a
migration being run.

---

## 4. Recommendation: do NOT encrypt either field. Reasons differ per field.

### `payment_link_url` — encryption protects the wrong property

It is published to the public internet by design. Encrypting a value whose
purpose is to be read by anonymous guests buys nothing, and costs the same
server-endpoint round trip every other encrypted field now needs.

The real risk is **tampering**: an altered link silently redirects guests'
money. That is an integrity problem, and the mitigations are different:

- `update` is already owner-scoped, so only the couple can change it.
- `isSafeHttpsUrl()` already rejects non-https at the guest boundary.
- **Gap worth closing:** validation currently lives in the *form*
  (`CustomGiftForm.jsx:38`) and at the *guest read* boundary. There is no
  check at the write itself, because there is no server-side writer. A value
  written by any other means is only caught on the way out.
- Optional hardening, cheap: render the link's hostname next to the Contribute
  button so a guest can see where they are being sent, and show the couple the
  stored hostname on the dashboard so a change is visible to them.

### `purchased_by` — genuinely sensitive, but encryption is the wrong tool *here*

It is real guest PII and correctly withheld from guests today. Two reasons not
to encrypt it as `budget`/`celebrant` were:

1. **Every writer is client-side.** Encrypting at rest requires
   `BASE44_ADMIN_KEY`, which the browser can never hold. So this would mean
   building a new server endpoint for the whole registry-purchase write path —
   substantially more than the Step 2b changes, which only re-pointed writers
   that already ran server-side or already had an endpoint to move onto.
2. **The read is couple-only already**, and `RegistryProduct.read` is `null`
   (open) — which is the actual weakness. Encryption would hide the values from
   an unscoped lister, which is real, but so would scoping the read.

**Recommended instead, in order:**

- **Consider `RegistryProduct.read` -> owner-scoped.** But check it against
  gotcha #1 first: `api/wedding-by-slug.js:112` reads this entity with the
  ADMIN KEY to build the public registry. Scoping the read would 200-empty
  that, and every public registry section would silently go blank. **This is
  the same trap that killed the `WeddingDetails.read` proposal** and it must
  not be repeated. So: not viable until `wedding-by-slug` moves to a hosted
  function — the same precondition already recorded for `WeddingDetails`.
- **Hash `guest_email` inside `purchased_by`**, as `SongRequest.guestEmail`
  was in #432, if the email is only ever used for equality/dedup. Needs a
  product answer first: does the couple ever need to *read* those addresses
  back (to send a thank-you)? If yes, hashing is wrong and this becomes a
  genuine encryption candidate, at the cost of the endpoint in (1).
- **Cheapest immediate win:** the field is empty. Decide the shape *before*
  any real data lands, and the migration question never arises.

---

## 5. PlanGift adjacency — and one finding that is not in scope but should not wait

`PlanGift` is the gifting record: who bought a plan for whom, the Stripe
session, and the promotion code. It is written **only** by
`api/webhooks/stripe.js` (14 references; `api/create-checkout-session.js` has
none). Both files were read and **not modified**.

Its confidentiality design is careful and deliberate: buyer and recipient
emails, names and notes are AES-256-GCM ciphertext; the buyer's user id is an
HMAC. A field description even states the reasoning outright — *"read:null
means this entity is listable unscoped by anyone with any API token, so the
raw user id never lives here."*

**However — its live RLS is:**

```json
"rls": {"create": null, "read": null, "update": null, "delete": null}
```

**`update` and `delete` are fully open.** Anyone with any API token can modify
or delete any `PlanGift` row. The care taken over `read` makes this look like
an oversight rather than a decision: the descriptions reason explicitly about
`read: null` and never mention update or delete.

Plausible impact, stated as *possible* because **I did not test it** — probing
would mean writing to payments data, which is outside anything authorized:

- flip `status` from `redeemed` back to `purchased`, potentially re-redeeming
  a spent gift code
- mark someone else's unredeemed gift `redeemed`, denying them the plan
- overwrite `promotion_code_display`/`_id`, breaking support lookup
- delete the row outright, erasing the record of a real purchase

**Current data:** 1 row, `is_test: true`, **0 real gift rows.** So nothing is
at risk today, and this is the cheapest possible moment to fix it.

**Recommendation:** tighten `PlanGift.update` and `PlanGift.delete`. `create`
must stay `null` (the webhook writes with the admin key on behalf of an
anonymous buyer — the same create:null pattern used across this app), and
`read` likely must stay `null` for the same admin-key-lookup reason, which the
existing encryption already compensates for. **Update/delete have no
legitimate caller other than the webhook**, and per gotcha #1 the admin key
cannot satisfy an owner-scoped rule either — so this needs the same treatment
as `SongRequest`: either an owner-ish scoping field the webhook stamps, or
acceptance that only a hosted function can mutate it later.

**This is a schema/RLS change, not a code change to the frozen files.** It
needs the owner's decision regardless — flagging it, not acting on it.

---

## 6. Recommendation summary

| item | recommendation |
|---|---|
| `CustomGift.payment_link_url` | **Do not encrypt.** Published by design; the risk is integrity, not confidentiality. Optionally surface the hostname to guest and couple. |
| `RegistryProduct.purchased_by` | **Do not encrypt now.** Every writer is client-side, so it would require a new server endpoint. Field is empty — decide the shape before data lands. Hash `guest_email` if the couple never needs it back. |
| `RegistryProduct.read` -> owner-scoped | **Do not**, until `wedding-by-slug` is a hosted function. Same admin-key trap that killed the `WeddingDetails.read` proposal. |
| Step 3 migration | **Close as not-needed.** Both fields empty; a no-op run would imply a data history that never existed. |
| `PlanGift.update` / `.delete` open | **Escalate.** Out of Step 3 scope but found by it; 0 real rows makes now the cheapest fix. |

## 7. Payments-path confirmation

- `api/webhooks/stripe.js` — read only. Not modified this session; `git log`
  and `git status` both clean for that path.
- `api/create-checkout-session.js` — read only, same.
- Neither references `CustomGift` or `RegistryProduct` at all, so nothing in
  Step 3's own scope touches the payments path even indirectly.
