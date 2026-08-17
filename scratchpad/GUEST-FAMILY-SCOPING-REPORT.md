# Guest encryption family — scoping report

Prepared 2026-08-18 against main `c98fefd`. **Report only, no code written.**
All probes read-only; no schema touched; no rows written.

---

## 0. Headline, up front

Three things changed my view of this block while scoping it.

1. **The exposure is live and I confirmed it, not inferred it.** A second,
   unrelated authenticated account reads **206 `Guest` rows belonging to other
   accounts**, 201 of them carrying name + email + phone together. `Guest.read`
   is `null` in the live schema, and an owner-scoped read was never applied
   despite a code comment in `api/my-guests-rsvp.js` claiming it was.
2. **The 2026-08-03 scope estimate in BASE44_PLATFORM_NOTES is stale and
   overstates the work.** It says "dozens of dashboard call sites... roughly
   15-20x the surface area". The real number today is **one read chokepoint and
   24 write call sites, of which only 5 touch a field we would encrypt.** Most
   of the surface it worried about has already migrated to `getMyRecords`.
3. **PII is not the worst of it.** `rsvp_link_id` is a bearer capability token
   sitting in the same unscoped-readable table. Anyone who can list `Guest` can
   harvest every RSVP link and submit or alter any guest's RSVP. Encrypting
   names and emails while leaving that readable would be sealing the window and
   leaving the key in the door.

**Severity framing, honestly:** all 206 exposed rows are synthetic — 200
`@example.com`, one the operator's own address, zero real couples' guests. Same
grading as the poll-gate hole: **launch-blocking correctness, not an active
breach.** But unlike every prior stage in this programme, *there are rows*, and
that turns out to matter for the migration decision (§8).

---

## 1. The exposure, measured

Probe: log in as `BASE44_TEST_EMAIL_2` (an account that owns none of this data)
and list `Guest`.

| credential | HTTP | rows visible |
|---|---|---|
| owner | 200 | 206 |
| **unrelated authenticated account** | **200** | **206** |
| admin key | 200 | 206 |

Of the rows visible to the non-owner: `distinct created_by_id = 2`, **the
other account's own id is not among them**, and the fixture owner's is. That is
cross-tenant read, confirmed rather than reasoned about.

Populated field counts across all 206 (aggregate only, no PII reproduced):

| field | populated |
|---|---|
| `name` | 206 |
| `email` | 201 |
| `phone` | 201 |
| `plus_one_name` | 40 |
| `plus_one_email` | 31 |
| `dietary_restrictions` | 23 |
| `plus_one_dietary_restrictions` | 5 |
| `mailing_address`, `notes`, `special_requests`, `rsvp_note`, `song_request` | 0 |

Total `Guest` rows app-wide: **206** — i.e. the entire table is the exposed set.

---

## 2. Chokepoints

### 2a. Read — exactly one, and that is the good news

`src/lib/resolveMyWedding.js:144` `getMyRecords(entityName, …)`:

```js
const rows = await base44.entities[entityName].filter({ created_by_id: me.id }, sort);
```

Dynamic by entity name, which is why a naive `entities.Guest.filter` grep finds
nothing. **Every dashboard read of `Guest` goes through this one function**,
either directly or via `getMyGuestsWithRsvp` (`:190`), which wraps it and
overlays RSVP data from `api/my-guests-rsvp.js`. 30+ consuming files, one call
site.

### 2b. `api/my-guests-rsvp.js` — the precedent to copy

Already does exactly the job PR A needs: authenticates the couple, reads
`Guest` with **the caller's own forwarded bearer token** (`callerFetch`), reads
the encrypted `RsvpResponse` rows with the admin key, decrypts server-side, and
returns a plain overlay. It is the proof that the pattern works and that the
dashboard tolerates it.

Note for the record: its header comment says *"Guest.read is owner-scoped as of
this change"*. **That is not true of the live schema** (§1). Either the change
was never applied or it drifted back (gotcha: schema drift). The comment should
be corrected whichever way we go.

### 2c. `api/_lib/rsvpAuth.js` `resolveGuestByToken` — the anonymous path

```js
{ rsvp_link_id: token }   // then { plus_one_rsvp_link_id: token }
```

Admin key, by necessity: the caller is an **anonymous guest** clicking a link
in an invitation. There is no session to forward. This is the reason §6
concludes that scoping `Guest.read` is not available to us.

---

## 3. Writer audit — complete, per gotcha #17

### Client-side (the couple's own browser token)

| file | op | fields touched | touches an encryption candidate? |
|---|---|---|---|
| `pages/Guests.jsx` | create ×2 | full guest payload; `{name, event_responses}` | **YES** |
| `pages/Guests.jsx` | update ×6 | `restGuestData`, arbitrary `updates`, `tags`, `rsvp_link_id` | **YES** (2 of 6) |
| `pages/Guests.jsx` | delete ×2 | — | no |
| `components/guests/ImportGuestModal.jsx` | create | CSV import — full PII | **YES** |
| `components/layout/AvaModal.jsx` | create + update | AI-supplied `action.data` | **YES** (unbounded) |
| `components/guests/SendInvitesModal.jsx` | update ×3 | `rsvp_link_id`, `plus_one_rsvp_link_id` | no |
| `components/messages/WhatsAppCompose.jsx` | update | `rsvp_link_id` | no |
| `components/games/GamesManager.jsx` | update | `rsvp_link_id` | no |
| `lib/tableAssignment.js` | update ×6 | `table_assignment` | no |

**24 mutations across 8 files. Only 5 of them, in 3 files, touch a field we
would encrypt.** The other 19 write tokens, table assignments and tags — none
of which are encryption candidates, so they can stay client-side untouched.
This is the single biggest correction to the old scope estimate.

`AvaModal` is the awkward one: it forwards whatever the model produced
(`action.data`) straight into `create`/`update`, so its field set is unbounded
by construction and must be routed server-side regardless.

### Server-side

| file | op | credential | note |
|---|---|---|---|
| `api/my-guests-rsvp.js` | read | **caller** | the good pattern |
| `api/guest-contact-review.js` | create + update | **caller** | also correct |
| `api/collaborator-guests.js` | read / update / delete | **admin** | update/delete are the known-broken collaborator gap — admin key cannot satisfy owner-scoped update |
| `api/_lib/rsvpAuth.js` | read | admin | anonymous guest path |
| `api/_lib/auth.js` | read | admin | lists another user's guests by id |
| `api/wedding-attendees.js` | read | admin | |
| `api/rsvp-link-request.js` | read | admin | `fetchAll('Guest')` |
| `api/song-request-submit.js` | read | admin | confirmed-guest check |
| `api/cron/send-weekly-digest.js` | read | admin | cron, no session exists |

---

## 4. Field inventory and per-field call

Ten candidates, not nine — the old note's list collapsed "plus-one
equivalents" into one line. Recommending all ten, with the reasoning that
differs per field.

| field | rows | recommend | why |
|---|---|---|---|
| `name` | 206 | **encrypt** | the identifier that makes everything else linkable |
| `email` | 201 | **encrypt** | direct contact PII |
| `phone` | 201 | **encrypt** | direct contact PII |
| `mailing_address` | 0 | **encrypt** | home address; empty now, decide before data lands |
| `dietary_restrictions` | 23 | **encrypt** | allergy data is health-adjacent |
| `plus_one_dietary_restrictions` | 5 | **encrypt** | same |
| `special_requests` | 0 | **encrypt** | accessibility needs — health-adjacent |
| `notes` | 0 | **encrypt** | free text the couple writes *about* a guest |
| `plus_one_name` | 40 | **encrypt** | PII for a person who never signed up for anything |
| `plus_one_email` | 31 | **encrypt** | same |

**Not encrypted, deliberately:**

- `rsvp_link_id`, `plus_one_rsvp_link_id` — **but see §5; these need their own
  treatment and cannot simply be left as they are.**
- `table_assignment`, `tags`, `category`, `rsvp_status`, `meal_choice`,
  `event_responses`, `seating_preferences/avoid`, `invitation_sent`,
  `invite_channel`, timestamps — operational, not identifying on their own, and
  several are filtered/sorted on.
- `rsvp_note`, `song_request` — **superseded, not spared.** Both are already
  AES-encrypted on `RsvpResponse` and overlaid at read time; the `Guest` copies
  are frozen pre-migration leftovers with 0 populated rows. Recommend a
  dead-field cleanup rather than encrypting a field nothing writes.

---

## 5. The finding that is not about encryption: `rsvp_link_id`

`resolveGuestByToken` accepts `rsvp_link_id` as a **bearer capability**. Present
the token, and `api/rsvp-lookup.js` / `api/rsvp-submit.js` treat you as that
guest.

That token lives in the same table an unrelated authenticated account can list.
So today, anyone with any API token can enumerate every guest's RSVP link and
submit or alter RSVPs as any of them, for any wedding.

Encrypting `name`/`email`/`phone` does **nothing** about this. Three options:

1. **Hash it** — store `rsvp_link_id_hash = hashId(token)` and look up by hash,
   exactly the `SongRequest.guestEmailHash` pattern (#432). The token stays a
   secret in the invitation only. Lookup by equality still works, which is all
   `resolveGuestByToken` does. **Recommended.**
2. Encrypt it — wrong tool: you cannot look up by an AES blob without
   decrypting every row.
3. Defer — only defensible if the block ships behind the same hosted-functions
   dependency anyway.

I have **not** folded this into A–D below, because it is a distinct change with
its own migration (existing links must keep working) and it deserves its own
decision. Flagging it as the item most likely to be missed if we scope this
block purely as "encrypt the PII fields".

---

## 6. Why RLS scoping is not available — and why it is worse here than `WeddingDetails`

The obvious fix is `Guest.read: {created_by_id: "{{user.id}}"}`. It is not
available, for the same reason the `WeddingDetails.read` flip was rejected, only
more so.

Six server readers use the **admin key**, and per gotcha #1 an owner-scoped read
returns **200 + empty array** to the admin key — silently. Flipping it would
break, with no error anywhere:

- `resolveGuestByToken` → every RSVP link in every invitation stops resolving
- `send-weekly-digest` cron → couples' digests go out empty
- `rsvp-link-request` → "email me my link" silently finds no guest
- `song-request-submit` → confirmed-guest checks fail open or closed at random
- `wedding-attendees` → attendee lists blank
- `collaborator-guests` → collaborators see an empty guest list

**And unlike `WeddingDetails`, these cannot be converted to the caller's token,
because there is no caller.** An anonymous guest clicking an invitation link has
no session; a cron job has no user at all. The `callerFetch` escape hatch that
made `my-guests-rsvp` work does not exist for them.

So: **encryption at rest is the only lever available before hosted functions.**
That conclusion matches the old note; what is new is that it is now *verified*
against the live readers rather than assumed.

---

## 7. Mixed-row plan

The `typeof value === 'string'` discriminator this programme used for
`WeddingDetails` **cannot work here** — every candidate field is already
string-shaped, so plaintext and ciphertext are indistinguishable by type. That
is precisely the failure mode that forced the versioned `scrypt$` prefix in
#450.

**Recommended shape: follow the `RsvpResponse` precedent, not the
`WeddingDetails` one.** One new blob field:

```
encrypted_guest_pii   AES-256-GCM ciphertext (base64, iv+authTag+ciphertext) of
                      {name, email, phone, mailing_address, dietary_restrictions,
                       notes, special_requests, plus_one_name, plus_one_email,
                       plus_one_dietary_restrictions}
```

Why a blob rather than ten encrypted columns:

- **The discriminator becomes a boolean, not a sniff.** A row is migrated iff
  `encrypted_guest_pii != null`. No prefix convention, no type inspection, no
  ambiguity — the exact problem RULE-7-adjacent bugs come from.
- It is the pattern already proven twice in this codebase (`RsvpResponse`,
  `PlanGift`), so the crypto helpers (`encryptPayload`/`decryptPayload`) and the
  review intuition already exist.
- Ten separate ciphertext columns means ten independent chances for one to be
  missed on a write path.

Read logic during the mixed window:

```
row.encrypted_guest_pii ? {...row, ...decryptPayload(row.encrypted_guest_pii)}
                        : row      // legacy plaintext, still readable
```

Write logic during the mixed window: write the blob **and** null the plaintext
columns in the same request, so no row is ever half-migrated.

---

## 8. PR sequence, and the migration argument

### A — server read endpoint (`api/my-guests.js`), no encryption yet

Move `getMyRecords('Guest')` behind an authenticated endpoint using the
caller's token, mirroring `my-guests-rsvp.js`. Pure indirection: same data,
same shape, no crypto. Ships alone so that if the dashboard breaks, the cause is
unambiguous.

*Verification:* every consuming page still renders its guest list; the fixture
count matches before and after.

### B — server write endpoint, for the 5 PII-touching mutations only

`pages/Guests.jsx` (create ×2, update ×2), `ImportGuestModal.jsx` (create),
`AvaModal.jsx` (create + update). The other 19 mutations stay client-side —
they touch tokens, tags and table assignments, none of which are encrypted.

*Writer-scoping first, per this programme's own rule: **B must land before any
field is encrypted**, or the browser will be asked to write a value it cannot
produce.*

### C — declare `encrypted_guest_pii`, dual-write, prefer-blob-on-read

Schema change goes **through the advisor**, declare-first, and remember gotcha
#5: the first write after a schema push materialises the new field as `null` on
that row. Ship with reads preferring the blob and falling back to plaintext.

### MIGRATION — and I recommend running it, not closing it

Every prior stage in this programme closed its migration as a no-op because
there were genuinely zero rows. **This one has 206.** They are synthetic, and
the tempting move is to close it the same way and let the fixtures be
re-imported.

I think that is the wrong call, for the reason this session just learned the
hard way. A migration that is never run is a migration that is never proven —
the same shape as a gate that only ever asserts refusal. These 206 rows are the
**only** opportunity to exercise the migration path against real stored data
before a real couple's guest list exists. Running it costs one script execution
and converts an untested code path into a tested one.

Also worth noting, and different from every erasure-gap entity: `Guest` rows are
created client-side with a **real** `created_by_id`, so unlike the
`PollComment`/`SongRequest` orphans they are genuinely deletable and updatable
by their owner. The migration can be re-run or rolled back.

Migration runs under RULE 8: `--expect-rows`, dry-run default, scoped write,
verified by an independent read.

### D — stop writing plaintext, null the columns

Remove the dual-write, null the ten plaintext columns on every migrated row,
and leave them undeclared-but-present per gotcha #5 (undeclaring does not erase
stored values — an explicit null-out is required, and is the whole point of
this PR).

*Verification, on production with the fixture:* re-run the §1 cross-tenant probe
as the unrelated account and confirm the ten fields come back empty while the
dashboard still renders every guest correctly. **That probe is the admit-path
test for this block** — it must show both that the attacker sees nothing *and*
that the owner still sees everything. Proving only the first would repeat
exactly the mistake #461 uncovered.

---

## 9. `ReceivedGift.giver_email` and `GuestMessage.guest_email` — DEFER, explicitly

Both were flagged in the Step 3 follow-up as encryption candidates because,
unlike `RegistryProduct.purchased_by[].guest_email`, they *are* displayed to the
couple (`ReceivedGifts.jsx:312`, `Messages.jsx:257`) and therefore serve a real
purpose that hashing would destroy.

**Recommendation: defer both, out of this block.** Three reasons:

1. **Their read RLS is already owner-scoped** — `{created_by_id: "{{user.id}}"}`
   on both, in the live schema. They do **not** share `Guest`'s defect. The
   cross-tenant listing that makes this block urgent does not apply to them.
2. **Both tables are empty** — 0 rows, confirmed live for the owner, the
   non-owner and the admin key. There is nothing exposed and nothing to migrate.
3. **Their writers are client-side and unscoped-to-a-server-endpoint**
   (`ReceivedGifts.jsx` create/update/delete, `Messages.jsx` update). Encrypting
   them means building *another* pair of server endpoints — the same A/B work as
   above, for two entities that are not currently leaking anything.

Deferring is a judgement that they are lower priority, **not** that they are
safe forever: `read: null` on a future related entity, or a change to these
rules, would re-open the question. The condition to revisit is explicit — **if
either entity's `read` rule is ever loosened, or before either table takes its
first real row, they come back on the list.**

If you would rather fold them in, the honest cost is roughly one extra PR each,
mostly endpoint plumbing, with no migration.

---

## 10. Summary

| item | recommendation |
|---|---|
| `Guest.read` cross-tenant listing | **Confirmed live.** Cannot be fixed by RLS before hosted functions — six admin-key readers, and the anonymous ones have no caller token to switch to. |
| ten PII fields | **Encrypt**, as one `encrypted_guest_pii` blob (RsvpResponse precedent), not ten columns. |
| `rsvp_link_id` bearer token | **Escalate — separate from this block.** Hash it (#432 pattern). Encrypting PII while leaving this readable leaves a full guest-impersonation path. |
| `rsvp_note`, `song_request` on Guest | Dead fields, superseded by the RsvpResponse overlay. Cleanup, not encryption. |
| scope estimate in BASE44_PLATFORM_NOTES | **Stale — correct it.** One read chokepoint, 5 PII-touching writes, not "dozens ... 15-20x". |
| `my-guests-rsvp.js` header comment | Wrong about `Guest.read` being owner-scoped. Correct it. |
| migration | **Run it, do not close it as a no-op.** 206 synthetic rows are the only chance to prove the path before real data. |
| `ReceivedGift.giver_email`, `GuestMessage.guest_email` | **Defer**, with a stated condition to revisit. Read already owner-scoped, both tables empty. |
| collaborator `Guest.update`/`delete` via admin key | Pre-existing broken gap, hosted-functions list. Unchanged by this block. |
