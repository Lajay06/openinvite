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

## 5a. E3 BLOCKING OBLIGATIONS — this list must be empty before E3 merges

Recorded 2026-08-18 after E1 shipped. These are raw-plaintext readers that E1
deliberately did NOT touch, because E1 left storage unchanged. Each one breaks
silently the moment E3 nulls the plaintext columns — no error, just a link that
resolves to nothing or an empty string rendered into an email.

| # | reader | what breaks at E3 | required change |
|---|---|---|---|
| **E3-1** | `api/rsvp-link-request.js:161-166` — reads `guest.rsvp_link_id` with the admin key and emails `${baseUrl}/rsvp/${token}` | the "email me my link" recovery flow sends a URL ending in `/rsvp/undefined` | decrypt `rsvp_link_id_enc` server-side; it already holds the key, so no endpoint hop |
| **E3-2** | `api/_lib/rsvpAuth.js:61,66` — `resolveGuestByToken` queries the plaintext columns | **every RSVP link in every invitation stops resolving** | query `*_hash` (already dual-path from E2; E3 removes the plaintext fallback) |
| **E3-3** | `SendInvitesModal.jsx` `previewRsvpUrl`, `EmailTemplates.jsx` `sampleRsvpUrl` | both silently fall through to the `preview-token` placeholder | **no change — this is the intended end state.** A sample email the couple is only looking at must not carry a live capability. Listed so it reads as a decision, not a regression. |
| **E3-4** | `GamesManager.jsx` `copyLinks` — builds `/games/<token>/<gameId>` | game links stop working if recovery is not decrypting `_enc` | **REQUIRED verification leg, advisor decision 2026-08-18.** Deferred from the E1 click-throughs because the fixture had no games. At E3: create a throwaway game on the fixture, verify links resolve after the plaintext null via decrypt, then delete the game. |

E3-1 and E3-2 are hard blockers. E3-3 is a deliberate no-op, recorded so that
nobody "fixes" it later by re-introducing a live token into a preview. E3-4 is
a required verification leg rather than a code change — it is the one E1
click-through that could not be run, and E3 is where it must be closed.

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

---

## 7. E2 field specifications — for the advisor to apply

Four new fields on `Guest`. All `string`, all nullable, all default absent.
Declare-first: these must exist in the live schema **before** any code writes
them (gotcha #5 — the first write after a push materialises every
newly-declared field as `null` on that row).

### `rsvp_link_id_hash`

- **type:** `string`
- **nullable:** yes — null until the guest has a token (E2 dual-write) or until
  the migration backfills an existing one.
- **description:**
  > HMAC-SHA256 digest of the guest's RSVP link token, keyed with
  > RSVP_TOKEN_KEY (a dedicated server-only secret, deliberately NOT
  > BASE44_ADMIN_KEY — RSVP links are printed in invitations and must not share
  > a failure domain with the admin key). Computed server-side by
  > api/_lib/rsvpAuth.js and api/my-guest-links.js; the raw token never derives
  > from this value. This is the LOOKUP key: resolveGuestByToken hashes the
  > token a guest presents and matches on this field, so Guest.read staying
  > null no longer lets an unscoped lister harvest usable invitation links.
  > Never reversible to the raw token, never an auth mechanism on its own.

### `rsvp_link_id_enc`

- **type:** `string`
- **nullable:** yes — same lifecycle as the hash; the two are always written
  together and are meaningless apart.
- **description:**
  > AES-256-GCM ciphertext (base64, iv+authTag+ciphertext) of the guest's raw
  > RSVP link token, keyed with RSVP_TOKEN_KEY. Exists because the token must
  > remain RECOVERABLE: the couple copies links in bulk, resends invitations,
  > and shares them over WhatsApp, and api/rsvp-link-request.js re-sends a
  > guest's own link on request. Decrypted only server-side, only for the
  > wedding's owner (api/my-guest-links.js verifies created_by_id and reads
  > with the caller's own token). Rotating RSVP_TOKEN_KEY without a
  > decrypt-old/re-encrypt-new migration permanently invalidates every
  > distributed link — see BASE44_PLATFORM_NOTES.md.

### `plus_one_rsvp_link_id_hash`

- **type:** `string`
- **nullable:** yes — null unless the guest has a plus-one with their own email.
- **description:**
  > HMAC-SHA256 digest of the PLUS-ONE's own RSVP link token, keyed with
  > RSVP_TOKEN_KEY. Same construction and same purpose as
  > rsvp_link_id_hash, for the separate token a plus-one receives when
  > plus_one_email is set (feat/plus-one-identity). resolveGuestByToken falls
  > back to matching this field when the primary hash does not match, and
  > returns role:'plus_one'.

### `plus_one_rsvp_link_id_enc`

- **type:** `string`
- **nullable:** yes — same lifecycle as the plus-one hash.
- **description:**
  > AES-256-GCM ciphertext (base64, iv+authTag+ciphertext) of the PLUS-ONE's
  > own raw RSVP link token, keyed with RSVP_TOKEN_KEY. Same recovery purpose
  > and same rotation hazard as rsvp_link_id_enc.

### Not declared, not yet dropped

`rsvp_link_id` and `plus_one_rsvp_link_id` stay declared through E2 and the
migration — E2 dual-writes and resolveGuestByToken falls back to them, so
removing them early would break every unmigrated row. E3 nulls their VALUES;
undeclaring them is a separate later cleanup, and undeclaring alone does not
erase stored data (gotcha #5), which is exactly why E3 nulls explicitly.

---

## 8. E3 scoping report — null the plaintext

Drafted 2026-08-18, after E2 shipped and the migration ran to 200/202.
**Report only. No code, no rows.**

E3 is the step that makes Track E worth doing. Until the plaintext column is
null, `Guest.read: null` still means anyone with any API token can list every
row and harvest every outstanding invitation link — the hash and ciphertext
sitting beside it change nothing while the raw value is still there.

### 8.1 The four ledgered obligations

**E3-1 — `api/rsvp-link-request.js` must decrypt.**
Today it reads `guest.rsvp_link_id` twice: once as a *filter* (`&& g.rsvp_link_id`,
to skip guests with no link) and once to *build* the URL. Both break at E3 —
the filter would match nothing and the URL would end `/rsvp/undefined`. The
endpoint already holds `RSVP_TOKEN_KEY`, so this is a local change with no
endpoint hop: filter on `g.rsvp_link_id_enc`, and build from
`decryptToken(guest.rsvp_link_id_enc)`. **Both sites, not just the obvious
one** — the filter is the one a reviewer skims past.

**E3-2 — `resolveGuestByToken` drops the plaintext fallback.**
The resolver already tries hash first, so removing lookups 3 and 4 is a
deletion, not a reordering. Precondition: **the migration must be complete**.
Deleting the fallback while two rows are unmigrated permanently orphans those
two guests' links — which is exactly the state the tree is in right now, and
precisely why E3 cannot start until the remaining 2 rows are done.

**E3-3 — the preview surfaces change nothing, on purpose.**
`SendInvitesModal.previewRsvpUrl` and `EmailTemplates.sampleRsvpUrl` already
fall back to a `preview-token` placeholder for any guest without a token; at E3
every render takes that branch. That is the intended end state: a sample email
the couple is merely looking at must never carry a live capability. Recorded so
nobody later "fixes" it by wiring a real token back in.

**E3-4 — the GamesManager probe leg.**
The one E1 click-through that could not run, because the fixture has no games.
At E3: create a throwaway game, confirm `copyLinks` produces working
`/games/<token>/<gameId>` links **with plaintext nulled** (so the token can only
have come from `decryptToken`), then delete the game. Residue is a Questionnaire
row owned by a real user, so it is genuinely deletable — unlike the
anonymous-write entities.

### 8.2 The nulling approach

A second script, `scripts/null-rsvp-plaintext.mjs`, not a flag on the migration
script. Different operation, different blast radius, different authorization —
folding a destructive step into the tool that also does the safe step is how a
`--execute` gets typed with the wrong intent.

Its own `--expect-rows` guard, computed the gotcha #19 way (single large-limit
fetch, deduped by id), and one additional precondition the migration script does
not need:

> **Refuse to null any row that is not fully migrated.** For every target row,
> assert `rsvp_link_id_hash === hashToken(rsvp_link_id)` **and**
> `decryptToken(rsvp_link_id_enc) === rsvp_link_id` before writing. If a single
> row fails, abort the whole run without writing anything.

That check is the difference between a reversible step and an unrecoverable
one. Once plaintext is gone, a row whose ciphertext does not round-trip has
lost its token forever — there is no other copy. Verifying the recovery path
*immediately before* destroying the original is the only moment that check is
worth anything.

Dry run default, `--execute` + `--expect-rows`, verification by independent
re-read: plaintext null everywhere, hash and ciphertext present everywhere,
and a sample decrypt matching what the pre-null snapshot recorded.

### 8.3 The three-way probe — the exit gate

All three legs run **with plaintext nulled**, on production, against the
fixture. Any one failing reverts E3.

| # | leg | assertion |
|---|---|---|
| **1. Attacker sees empty** | list `Guest` as an unrelated authenticated account | `rsvp_link_id` and `plus_one_rsvp_link_id` are null on every row; `_hash`/`_enc` present but useless without the key |
| **2. Couple still works** | bulk copy-links through the real dashboard | returns working URLs — proving `decryptToken` is the only source, since no plaintext exists |
| **3. Pre-migration emailed link resolves** | present a token captured **before** the migration | resolves 200 via the hash path |
| **3b. GamesManager (E3-4)** | throwaway game, copy links | game links carry correct tokens post-null; game deleted |

**Leg 3 is the one that would be easiest to skip and the one that matters
most.** It is the whole promise of Track E: that changing the storage did not
invalidate links already sitting in guests' inboxes. I will capture a token
before E3 runs and hold it specifically for this, rather than reading one
afterwards — a token read after the fact proves nothing about continuity.

Leg 1 is the security assertion, leg 2 and leg 3 are the admit path. Proving
only leg 1 is how a gate that refuses everyone passes as a gate that works.

### 8.4 Preconditions before E3 may start

1. The migration is **complete** — 202/202, not 200/202.
2. #467 (throttle/retry) merged, so completing it is a normal run.
3. A pre-E3 token captured and held for probe leg 3.
4. `RSVP_TOKEN_KEY` present in all three Vercel environments — already true.


---

## 9. E3 build record

- **Migration complete 2026-08-18: 202/202**, verified by independent re-read —
  hash correct on 202/202, ciphertext round-trips on 202/202, plus-one row
  1/1, and the 200 previously-settled rows byte-identical (idempotence proven,
  not assumed).
- **Pre-E3 probe token: HELD.** Captured before any nulling, stored only in the
  gitignored `.env.local`. The 27-character legacy token was chosen — the most
  demanding case and the last row to migrate. This ledger records *that* it is
  held; the value appears in no commit, no PR, no report.
- E3-1 / E3-2 / E3-3 implemented per §8; E3-4 runs as a probe leg after merge.


---

## 10. E3 CLOSED — obligations ledger empty, probe passed

Nulling executed 2026-08-18 against production, `--expect-rows=202`, exit 0.
The verify-before-destroy precondition passed on **202/202** rows before a
single value was destroyed.

```
PRECONDITION — recovery verified immediately before destruction
  rows whose hash + ciphertext both check out : 202/202
WRITE  nulled 202/202
VERIFY (independent re-read)
  rows still holding plaintext      : 0    OK
  rows with ciphertext but no hash  : 0    OK
  rows still recoverable via decrypt: 202  OK
```

### Obligations — all four closed

| # | obligation | status |
|---|---|---|
| E3-1 | `rsvp-link-request` decrypts at both read sites | **CLOSED** — proven by production log `Sent RSVP link for wedding john-suzanne`, a line reachable only after a successful decrypt |
| E3-2 | `resolveGuestByToken` hash-only | **CLOSED** — 0 plaintext lookups remain; the held pre-migration token resolves 200 |
| E3-3 | preview surfaces unchanged | **CLOSED** — deliberately untouched; every render now takes the `preview-token` branch, the intended end state |
| E3-4 | GamesManager probe leg | **CLOSED** — throwaway game created, `Copy links` returned 200 and its token resolved, game deleted |

**The ledger is empty.**

### The probe, all five legs, plaintext gone

| leg | result |
|---|---|
| 1. attacker view | 206 rows listable; **0 expose a plaintext token**. A harvested hash presented as a token → **404**. Harvested ciphertext → **404**. |
| 2. couple copy-links | real button → 200; returned token resolves 200. With plaintext null, `decryptToken` is provably the only source. |
| 3. continuity | the 27-char token held **before** the migration still resolves **200** |
| 4. game links | created, resolved, deleted — zero residue |
| 5. email-me-my-link | end-to-end with real Turnstile; production log confirms the send |

Leg 3 is the one that mattered: a link that was already in a guest's inbox
before any of this began still works.

### Residue

None. The throwaway game was deleted (Questionnaire rows owned: 0 probe games
remaining). The pre-E3 probe token remains held in the gitignored `.env.local`
and can be discarded now that continuity is proven.
