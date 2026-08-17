# Track E — `rsvp_link_id`: raw-reader audit and proposed design

Prepared 2026-08-18 against main `c98fefd`. **Audit + design. No code written.**

---

## 1. The audit answer: raw readers exist, and there are six of them

The decision hinged on whether anything legitimately needs the raw token
**after send time**. It does — including the exact feature named in the
instruction.

| # | surface | what it does with the raw token | side |
|---|---|---|---|
| 1 | `pages/Guests.jsx:585` **`handleCopyLinks`** | **"Copy links (bulk)"** — writes raw RSVP URLs to the clipboard | client |
| 2 | `api/rsvp-link-request.js:166` | guest asks "email me my link" → builds `${baseUrl}/rsvp/${guest.rsvp_link_id}` and sends it | **server** |
| 3 | `components/guests/SendInvitesModal.jsx:354/358` | **resend** path — reuses an existing token to build the email URL | client |
| 4 | `components/guests/SendInvitesModal.jsx:300` | `previewRsvpUrl` shown to the couple | client |
| 5 | `components/guests/SendInvitesModal.jsx:387` | `buildWhatsAppUrl(...)` — opens WhatsApp with the link | client |
| 6 | `components/guests/EmailTemplates.jsx:51-55` | `sampleRsvpUrl` in the template preview | client |
| 7 | `components/messages/WhatsAppCompose.jsx:53` | reuse-or-mint, then builds the link | client |
| 8 | `components/games/GamesManager.jsx:422` | reuse-or-mint, then builds the link | client |

**Conclusion: a one-way hash is off the table.** It would permanently break
bulk copy-links, invite resends, the WhatsApp flows, the template preview, and
the server-side "email me my link" recovery. Raw links would become
unrecoverable for every guest already invited.

Per the stated decision tree, this is the **hash-for-lookup +
ciphertext-for-display** branch.

### A second finding the audit turned up

Call sites 3, 5, 7, 8 and `handleCopyLinks` all **mint tokens client-side**
(`crypto.randomUUID()`) and write them directly. Once the stored form is a hash
plus ciphertext, the browser cannot produce either — it holds no key. So token
*minting* has to move server-side too, not just token *reading*. That turns out
to simplify the design rather than complicate it (§2).

---

## 2. Proposed design

### Stored form

| field | contents | purpose |
|---|---|---|
| `rsvp_link_id_hash` | `HMAC-SHA256(key, token)` — `hashId()`, the #432 pattern | the lookup key; `resolveGuestByToken` matches on the hash of the presented token |
| `rsvp_link_id_enc` | AES-256-GCM ciphertext of the raw token | recovery for the six couple-facing surfaces |
| `plus_one_rsvp_link_id_hash` / `_enc` | same pair | same |
| `rsvp_link_id`, `plus_one_rsvp_link_id` | **nulled after migration** | — |

**Already-emailed links keep working.** The token itself never changes — only
how it is stored. A guest presenting the token from an invitation sent months
ago still resolves, because the server hashes what they present and matches.

An attacker who can list `Guest` now gets a hash (irreversible) and a
ciphertext (undecryptable without the key). The impersonation path closes
without invalidating a single outstanding invitation.

### One new endpoint serves every raw reader and every minter

`POST /api/my-guest-links` — authenticated as the couple, caller's own token:

- input: a list of the caller's own guest ids (+ whether the plus-one link is wanted)
- verifies each guest's `created_by_id` matches the caller (the
  `guest-contact-review.js` ownership pattern)
- **mints** a token for any guest that lacks one, storing hash + ciphertext
- **decrypts** and returns the raw links for guests that already have one
- returns `{ [guestId]: { rsvpUrl, plusOneRsvpUrl? } }`

All five client call sites collapse onto this one endpoint, and all client-side
`crypto.randomUUID()` minting disappears. `api/rsvp-link-request.js` (server,
already holds the key) simply decrypts inline — no endpoint hop needed.

### `resolveGuestByToken` change

```
{ rsvp_link_id: token }            ->  { rsvp_link_id_hash: hashId(token) }
{ plus_one_rsvp_link_id: token }   ->  { plus_one_rsvp_link_id_hash: hashId(token) }
```

Equality lookup throughout, so this is a field swap, not an algorithm change.

**During the mixed window**, query the hash first and fall back to the
plaintext field, so a not-yet-migrated row still resolves. The discriminator is
again a boolean — `rsvp_link_id_hash != null` — not a type sniff, consistent
with the blob decision in the Guest family report.

---

## 3. The risk I want on the record before this is built: key rotation

`hashId()` and `encryptPayload()` are both keyed on **`BASE44_ADMIN_KEY`**.
That is the existing precedent (`RsvpResponse.guest_id_hash`,
`encrypted_guest_level`, `PlanGift`), so following it is the consistent choice.

But this field is different in kind from those. **RSVP links are externally
distributed** — printed in invitations, sitting in guests' inboxes, out of our
control. If `BASE44_ADMIN_KEY` is ever rotated:

- every `rsvp_link_id_hash` becomes unmatchable → **every outstanding invitation
  link dies**
- every `rsvp_link_id_enc` becomes undecryptable → **the raw tokens cannot be
  recovered to re-hash them**

Both halves fail to the same key, so rotation would be unrecoverable rather
than merely disruptive. Today that risk is theoretical (the key has never been
rotated), and #450 deliberately avoided keying the website password on the
admin key for a *milder* version of exactly this reasoning — a rotation there
would only have locked couples out of their own site, not broken mail already
sent to hundreds of guests.

**Three options, for your call:**

1. **Dedicated `RSVP_TOKEN_KEY` env var** for this field only. Cleanest;
   rotating the admin key stops being an extinction event for invitations. Cost:
   one more secret to manage, and a divergence from the existing precedent.
2. **Keep `BASE44_ADMIN_KEY` and write a rotation runbook** — rotation must
   decrypt-with-old / re-encrypt-and-re-hash-with-new *before* the old key is
   retired. Zero new secrets; entirely dependent on the runbook being followed.
3. Keep the admin key and accept the risk undocumented. Not recommended — this
   is the kind of thing that is obvious now and invisible in eight months.

**My recommendation: (1).** The whole point of this track is that these tokens
are bearer credentials in the wild; tying their recoverability to a key we may
want to rotate for unrelated reasons couples two things that should not be
coupled.

---

## 4. Migration

| | count |
|---|---|
| `Guest` rows | 206 |
| with `rsvp_link_id` | **202** |
| with `plus_one_rsvp_link_id` | 0 |
| distinct token values | 202 — no collisions |
| token shapes | 201 × uuidv4, **1 × 27-char legacy** |

That last row matters: the migration must not assume a uuid shape. One row
predates the current minting code, and a regex-validating migration would skip
it silently — leaving one guest's link permanently unresolvable once the
plaintext is nulled.

Per the standing reasoning now adopted: **the migration is run, not waived.**
202 rows is the only chance to prove the path before real invitations exist.
Dry-run first, execute on a quoted line, RULE 8 throughout (`--expect-rows`,
scoped write, verified by independent read, non-zero exit on scope mismatch).

**Order matters and is not the obvious one:** hash + ciphertext must be written
**before** `resolveGuestByToken` switches to hash lookup, and the plaintext
nulled **after**. Nulling early orphans every link; switching lookup early
breaks every link until the migration finishes.

---

## 5. Proposed PR sequence for Track E

| PR | contents |
|---|---|
| **E1** | `api/my-guest-links.js` + move all five client call sites and every `crypto.randomUUID()` mint onto it. **No crypto yet** — pure indirection, same plaintext field. Verifiable on its own: copy-links, resend, WhatsApp, preview all still work. |
| **E2** | Declare `rsvp_link_id_hash` / `_enc` (+ plus-one pair) — *schema through you, declare-first*. Dual-write: new tokens get plaintext **and** hash + ciphertext. `resolveGuestByToken` tries hash, falls back to plaintext. |
| **MIGRATION** | Backfill hash + ciphertext for all 202 rows. Dry-run → quoted line → execute → verify by independent read. |
| **E3** | Stop writing plaintext; null `rsvp_link_id` / `plus_one_rsvp_link_id` on every row. |

**E3 verification is the cross-tenant probe, both ways** — as the unrelated
account, confirm the tokens come back empty; as the couple, confirm copy-links
still yields working URLs; and as an anonymous guest, confirm a link emailed
*before* the migration still resolves. That third leg is the admit-path test
for this track, and it is the one that would be easy to skip.

---

## 6. Summary

| question | answer |
|---|---|
| Does any surface read `rsvp_link_id` raw after send time? | **Yes — six**, including a bulk "copy links" button and a server-side link-resend flow. |
| Design | **Hash for lookup + ciphertext for display.** Hash-only would permanently orphan every outstanding invitation. |
| Do old links keep working? | **Yes** — the token is unchanged, only its storage. |
| Extra scope the audit revealed | Client-side token *minting* must move server-side too; one endpoint absorbs both minting and raw reads. |
| Open decision for you | **Which key** — dedicated `RSVP_TOKEN_KEY` (recommended) vs `BASE44_ADMIN_KEY` + rotation runbook. |
| Migration | 202 rows, **run it**; do not assume uuid shape (1 legacy 27-char token). |
