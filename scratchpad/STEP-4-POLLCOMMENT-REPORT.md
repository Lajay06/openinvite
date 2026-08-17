# Security Step 4 — report: `PollComment`

Prepared 2026-08-17 against main `7b72df9`. **Report only, no code.**

Short version: `PollComment` itself needs no encryption, and the reason it
does not is more interesting than the field. Auditing it surfaced a
**website-password-gate bypass affecting six endpoints**, which is a larger
finding than the one Step 4 was scoped to.

---

## 1. Writer audit — first, per gotcha #17

| path | operation | credential | status |
|---|---|---|---|
| `api/wedding-poll-comment.js:98` | **create** | admin key | live, the only writer |
| `scripts/migrate-poll-entities.mjs:144` | create | admin key | historical one-off |
| `api/wedding-poll-results.js:75` | read | admin key | guest-facing |
| `api/cron/send-weekly-digest.js:204` | read | admin key | couple digest |

**No update path. No delete path. No client-side writer** — `PollComment`
never appears in `src/` as an entity call; `Polls.jsx` and
`WeddingPollsPage.jsx` reach it only through those endpoints.

So the entity is **append-only in practice**, matching the `create: null`
guest-write pattern.

### What the writer actually stores

```js
// api/wedding-poll-comment.js:98
body: JSON.stringify({ wedding_id: wedding.id, poll_id: pollId, text: comment })
```

Three fields. That is the whole record.

---

## 2. The field inventory — there is no identity to protect

Live schema, read 2026-08-17:

| field | note |
|---|---|
| `wedding_id` | scoping |
| `poll_id` | scoping |
| `text` | the guest's comment — the only content |
| `is_test` | harness flag |

**No name. No email. No guest id. No hash.** Nothing links a comment to the
person who wrote it.

That is not an accident, and the sibling entity proves it. `PollVote` *does*
carry identity and *does* hash it:

> `guest_identifier` — HMAC-SHA256 digest (keyed with BASE44_ADMIN_KEY,
> computed server-side, never the raw value)... never reversible to a real
> identity, never an auth mechanism.

So the poll family already applies hashing wherever identity exists.
`PollComment` has none to apply it to. **The design already did the thing
Step 4 was going to propose.**

---

## 3. Current data — 220 rows, all harness residue, zero real

Read via the `adminRead` guard (`read: null`, so an admin read is legitimate):

| | count |
|---|---|
| total rows | 220 |
| attached to a **live** wedding | **0** |
| orphaned (wedding deleted) | **220** |
| flagged `is_test` | 0 |
| distinct comment texts | **1** — `"A sentinel test comment"` |
| texts containing an email- or phone-shaped string | 0 |
| `created_by_id` values | `["anonymous"]` only |

Created 2026-07-10 → 2026-08-10, stopping when `fix/persistence-test-leak`
landed. Identical shape to the 231 orphaned `SongRequest` rows.

**No real guest has ever left a poll comment.**

Two consequences: any migration is a no-op, and these 220 rows are a **fourth
instance of the right-to-erasure gap** — `created_by_id: "anonymous"` with
owner-scoped delete means nobody can remove them.

---

## 4. Recommendation on the scoped question: do NOT encrypt `text`

Three independent reasons, any one sufficient:

1. **It is published to other guests by design.** Poll comments are a social
   feature; `wedding-poll-results.js` returns `c.text` to every visitor and
   `WeddingPollsPage.jsx` renders them. Encrypting a value whose purpose is to
   be shown to guests protects the wrong property — the same reasoning that
   settled `payment_link_url` in Step 3.
2. **There is no identity to compromise.** A comment cannot be attributed to a
   person from the row. The disclosure risk of an unattributed sentence is
   categorically lower than for `emergencyContacts` or `purchased_by`.
3. **Every writer is server-side already**, so encryption would be *cheap* to
   add — which makes it worth stating clearly that cheapness is not a reason.
   It would add a decrypt hop to a guest-facing read path for no gain.

**Step 4 migration: close as not-needed**, on the same basis as every prior
stage — zero real rows, and a no-op run would imply a data history that never
existed.

---

## 5. The finding that matters more: the password gate protects one endpoint

While auditing where comments are exposed, I checked which guest-facing
endpoints honour `websitePasswordEnabled`. Of the seven that resolve a wedding
by slug:

| endpoint | operation | password gate | Turnstile | rate limit |
|---|---|---|---|---|
| `wedding-by-slug.js` | read site content | **yes** (11 refs) | — | yes |
| `wedding-poll-results.js` | **read** votes + comment text | **no** | **no** | yes |
| `wedding-poll-comment.js` | write a comment | **no** | yes | yes |
| `wedding-poll-vote.js` | write a vote | **no** | yes | yes |
| `song-request-submit.js` | write a song request | **no** | yes | yes |
| `collect-guest-contact.js` | write a contact submission | **no** | yes | yes |
| `rsvp-link-request.js` | trigger an RSVP-link email | **no** | yes | yes |

**Six of seven do not consult the gate.** The gate protects the endpoint that
serves the site, while six siblings read and write the same wedding's data
without it.

### Severity, split honestly

**The read is the real problem.** `GET /api/wedding-poll-results?weddingSlug=…`
returns poll vote counts and **every comment's text** for any slug, with no
password check and no Turnstile. For a couple who switched password protection
on, their guests' poll comments are readable by anyone who knows the slug —
which is exactly what the gate was supposed to prevent. A slug is not a
secret: it is in every invitation.

**The five writes are lower severity.** All carry Turnstile and rate limiting,
so they resist bots. The residual is that a determined human who knows the
slug can submit a comment, a vote, a song request, a contact submission, or
trigger an RSVP-link email to a wedding whose site they cannot open. That is
spam and ballot-stuffing, not disclosure.

### Relationship to #447

Same class as the `?preview=true` bypass, different door. #447 fixed a flag
that *overrode* the gate. This is six endpoints that never *consulted* it.
Fixing one did not imply the others, and I did not check them at the time —
worth noting, because that is exactly how a class of bug survives its own fix.

### I have not demonstrated it

Proving the bypass end to end means setting a password on the fixture and
reading its poll results without it. That is a production write and this step
is report-only, so I stopped at static analysis. The code path is unambiguous
— neither endpoint contains any reference to the gate — but I am flagging the
distinction rather than claiming a test I did not run. Happy to demonstrate on
the fixture the moment you want it, the same way #447 was demonstrated.

### Shape of a fix, if you want one

`websiteGateIsOn()` and `verifyWeddingPassword()` already exist in
`api/_lib/guestSafeWedding.js` and are exactly the right primitives, so this
is mostly plumbing, not new design.

- **Reads** (`wedding-poll-results`): gate it the way `wedding-by-slug` does —
  return the same shape a non-protected wedding returns when unlocked, and an
  empty/gated response otherwise. RULE 6a applies: do not error, ignore.
- **Writes**: accept the candidate password the same way `wedding-by-slug` now
  does (POST body, per #449) and refuse the write when the gate is on and the
  password is absent or wrong.
- **Sequencing**: reads first — that is the disclosure half — writes second.
- Each with its own report, fixture verification, and quoted line, per the
  established discipline.

---

## 6. Summary

| item | recommendation |
|---|---|
| encrypt `PollComment.text` | **No.** Published to guests by design; no identity in the row; the poll family already hashes identity where it exists (`PollVote.guest_identifier`). |
| Step 4 migration | **Close as not-needed.** 220 rows, all harness residue, 0 real. |
| 220 orphaned rows | Fourth instance of the right-to-erasure gap. Undeletable; hosted-functions rebuild. |
| **password gate covers 1 of 7 slug endpoints** | **Escalate.** The read leak (`wedding-poll-results`) is the material half; five writes are Turnstile-protected spam vectors. Not demonstrated — report-only step. |
