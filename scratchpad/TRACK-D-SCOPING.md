# Track D — scoping report

Prepared 2026-08-18 against main `9fd234a`, after the migration wrote 205/205
blobs. **Report only. No code, no rows.**

Track D nulls the plaintext PII columns. Until it runs, every one of those
values is still readable by any authenticated account — the blobs sitting
beside them changed nothing on their own.

---

## 1. Stop-reading-plaintext: the code changes D needs

The migration wrote blobs; it did not change who reads what. Six server
surfaces still read a PII field straight off a `Guest` row and will read `null`
the moment D runs. Audited by grep across `api/`, then read individually.

| # | reader | what it reads | breaks as | fix |
|---|---|---|---|---|
| **D-1** | `api/_lib/auth.js:70,71,87` | `g.email`, `g.plus_one_email` — builds the set of emails owned by a wedding | the set comes back empty; whatever gates on it fails open or closed silently | `mergeGuestPii` each row before mapping |
| **D-2** | `api/rsvp-link-request.js:166-167` | `g.email` — matches the requester to a guest | matches nobody; the neutral `{sent:true}` reports success forever, sending nothing | merge before the `.find()` |
| **D-3** | `api/song-request-submit.js:157` | `g.email` — confirmed-guest check | matches nobody; the check fails open or closed depending on the branch | merge before the `.find()` |
| **D-4** | `api/wedding-attendees.js:133,142` | `g.name` — public attendee list | every attendee renders as the `name` placeholder | merge before mapping |
| **D-5** | `api/my-guests-rsvp.js:182,194` | `g.plus_one_email`, `g.dietary_restrictions` | plus-one overlay silently stops; dietary falls back to the placeholder | merge before the overlay |
| **D-6** | `api/my-guest-links.js:174` | `guest.plus_one_email` — gates plus-one token minting | no plus-one token is ever minted again | merge before the check |

**Two that look like hits and are not**, checked individually so they are not
"fixed" into breakage: `api/collect-guest-contact.js:118-121` reads
`req.body`, not a Guest row, and `api/guest-contact-review.js:115-117` reads a
*decrypted submission*. `send-weekly-digest.js:332` reads `user.email`, a User
row. None touch Guest PII.

**D-2 is the one to be most careful with.** Its neutral response is deliberate
anti-enumeration design, so a broken match is indistinguishable from "that
email isn't a guest" — exactly the failure shape that hid for a whole track in
E3-1. It needs the same treatment: a log line on the matched branch, and the
production log as the evidence rather than the UI confirmation.

---

## 2. The nulling script

`scripts/null-guest-pii.mjs`, separate from the migration for the reason the
migration's header already states: adding a derived column is re-runnable,
destroying the last copy is not.

### Nine columns nulled, `name` placeheld

Per the advisor's Track C decision: `name` is `required` at the schema level,
so it cannot be nulled. It takes a **stable placeholder**; the constraint
question defers to the post-D legacy-column cleanup.

| columns | action |
|---|---|
| `email`, `phone`, `mailing_address`, `dietary_restrictions`, `special_requests`, `notes`, `plus_one_name`, `plus_one_email`, `plus_one_dietary_restrictions` | set to `null` |
| `name` | set to a fixed placeholder |

**Placeholder value — recommending `"—"`** (em dash, one character). It is
visibly not a name, sorts harmlessly, is not mistakable for real data in a CSV
export, and is not an empty string — which some UI treats as "missing" and
renders as a fallback that might itself look like a name.

### Verify-before-destroy, per row

Unchanged in principle from Track E3, and the entire safety argument:

> For each row, before writing: decrypt `encrypted_guest_pii`, assert it has
> all ten keys, and assert each of the ten equals the still-present plaintext.
> One row failing aborts the whole run without writing anything.

After this script there is no second copy. Verifying the recovery path
*immediately before* destroying the original is the only moment that check is
worth anything.

### Gotcha #18 watch on the two `format: "email"` columns

`email` and `plus_one_email` carry a `format: "email"` constraint in the live
schema. E3 proved nulling a plain-string column works on this platform, but a
format-constrained column is the untested case — a 422 on `null` is exactly the
gotcha #18 class.

**The dry run will probe this explicitly on a single row before the real run**,
and per the advisor's instruction, if a 422 appears the affected columns get
flipped to union types by the advisor *before* the run. The script does not
work around it.

### Guards

Dry-run default; `--execute` requires `--expect-rows`; counting by single
large-limit fetch deduped by id (gotcha #19); `retryPolicy.mjs` pacing and
429-only bounded retry; independent re-read verification.

### The enumerated exception

`6a584d473aa3ab1ec180fcdc` — `created_by_id: "anonymous"`, admin-key PUT
returns 403. It has no blob and cannot get one, so it **must not** be a target:
nulling it is impossible, and attempting it would abort the run. The script
carries the id in an `UNWRITABLE` constant, skips it explicitly, and reports it
as skipped rather than filtering it out silently.

---

## 3. The exit gate — cross-tenant probe, both ways

All legs with plaintext nulled, on production, against the fixture.

| # | leg | assertion |
|---|---|---|
| **1. attacker sees nothing** | list `Guest` as an unrelated authenticated account | **zero** rows expose any of the nine, and `name` is the placeholder on every row **except the enumerated id** |
| **2. couple sees everything** | dashboard guest list through `/api/my-guests` | all 205 render with real names, emails, phones — proving `decryptPayload` is the only source, since no plaintext exists |
| **3. guest-facing read** | RSVP lookup and the attendee list | still resolve and render real names |
| **4. write still round-trips** | edit a guest's dietary through the UI | lands, reloads, and the blob rebuilds without blanking the other nine |

**Leg 1's assertion is enumerated, not zero.** Per decision 3: the gate asserts
zero plaintext PII on every row *except* the pinned id. A gate expecting zero
would fail forever on a row nothing can fix; a gate tolerating "some
exceptions" would silently accept a second unwritable row appearing. **If the
exception list grows beyond that id, the gate fails.**

Legs 2, 3 and 4 are the admit path. Proving only leg 1 is how a system that
has lost everyone's data passes a security probe perfectly — the lesson from
#461, and the reason every probe in this programme now has both halves.

---

## 4. Sequence within D

1. **D code PR** — the six readers merged onto `mergeGuestPii`, plus the
   nulling script. Verified while plaintext still exists, so every reader can
   be proven working *before* anything is destroyed.
2. **Dry run**, including the `format: "email"` null probe. Reported verbatim.
3. **Execute** on a quoted line carrying the count.
4. **Exit gate**, four legs, reported row by row.

Deliberately in that order: the readers must be proven on real plaintext-backed
data first, because after step 3 a broken reader and a destroyed value look
identical.
