# Song-request review fix — report

Prepared 2026-08-17 against main `1e98eab`. Report only, no code.

The bug: `api/song-request-review.js` performs both couple actions with
`adminFetch('PUT', …)` on `SongRequest`, whose update RLS is owner-scoped
while every row is created by an anonymous guest. Both 403. Verified against
production — `action: 'decline'` returns 500, runtime log shows
`Permission denied for update operation on SongRequest entity`.

---

## 1. Confirmed: the complete writer set

Per gotcha #17, the writer audit comes first.

| path | operation | credential |
|---|---|---|
| `api/song-request-submit.js:191` | **create** | admin key |
| `api/song-request-review.js:132` | update -> `status: 'declined'` | admin key (**403**) |
| `api/song-request-review.js:153` | update -> `status: 'added'` | admin key (**403**) |
| `scripts/migrate-song-request-email-hash.mjs:101` | update | admin key, one-off, historical |

**Nothing else writes `SongRequest`.** No client-side writer exists;
`src/pages/Music.jsx:130` carries an explicit comment that it deliberately
does *not* use `getMyRecords('SongRequest')` because the rows are
anonymous-written. So decline and add are the only writers besides submit,
plus that one migration script.

Worth noting the migration script would 403 today too. It presumably ran
before `SongRequest.update` became owner-scoped; it is not a live path.

---

## 2. The RLS question, answered — with a working production precedent

**Does update RLS accept `"data.<field>": "{{user.id}}"`? Yes.** No probe
entity needed: this app already ships it.

Live `Notification` schema, read 2026-08-17:

```json
"rls": {
  "create": null,
  "read":   {"data.recipient_user_id": "{{user.id}}"},
  "update": {"data.recipient_user_id": "{{user.id}}"},
  "delete": {"data.recipient_user_id": "{{user.id}}"}
}
```

Its own field description states the pattern outright: *"Set server-side
(admin key) or via a guest-token path, never by the recipient themselves —
this is the field RLS read/update/delete are scoped against, not
created_by_id, so admin-key-created rows are still visible to the
recipient."*

And it is exercised for **update**, from the client, with the caller's own
token: `src/lib/useNotifications.js:37` does
`Notification.update(id, { read: true })` on rows the admin key created.

That is precisely option (a)'s mechanism — admin-key create, custom-field
owner scope, caller-token update — already working in production here.

---

## 3. Option (a) — stamp `ownerUserId` at create. RECOMMENDED

### Why it is nearly free on the submit side

`api/song-request-submit.js` already resolves the wedding server-side
(`:120–121`) and already reads `wedding.created_by_id` (`:145`, for the
guest-list lookup). So the value to stamp is **already in scope** — this is
adding one key to the create payload, not new plumbing.

### Why it is nearly free on the review side

`api/song-request-review.js` already has a `callerFetch` helper and already
uses it for `Music.create` in the same function. The change is swapping two
`adminFetch` calls for `callerFetch` — the #434 pattern, in a file that
already implements it.

### Backfill: effectively a no-op

Full scan of all 232 `SongRequest` rows, 2026-08-17:

| | count |
|---|---|
| total rows | 232 |
| rows whose `weddingId` matches a **live** `WeddingDetails` | **1** |
| orphaned rows (`weddingId` points at a deleted wedding) | **231** |
| rows already carrying `ownerUserId` | 0 |

The 231 orphans are all titled `Test Song Title`, submitted by `Test Guest`,
created between 2026-07-09 and 2026-08-10 — persistence-harness residue whose
weddings were deleted afterwards. The leak stops at 2026-08-10, consistent
with `fix/persistence-test-leak` landing.

The single live-wedding row is the verification record from PR #453, already
declined.

**So no real couple has ever received a song request, and this bug has never
affected one.** That lowers urgency but not correctness — it also means the
risky part of option (a), backfilling before the RLS flip, has almost nothing
to backfill.

The 231 orphans cannot be deleted by anyone (anonymous-created, owner-scoped
delete) — the right-to-erasure gap already recorded in the platform notes.
They can be given a placeholder `ownerUserId` via the workspace MCP, or left
unstamped: their weddings no longer exist, so nobody will ever review them.
**Recommend leaving them unstamped** and filtering the review queue by
`weddingId` as it already does, rather than writing 231 rows for no benefit.

### Sequencing — one correction to the proposed order

The order in the brief was: declare + flip RLS -> ship stamping -> backfill ->
switch review. **Flipping the RLS second opens a window** where new rows are
created without `ownerUserId` and are then unupdatable by anyone, permanently.
Small here because volume is nil, but it is avoidable for free:

1. **Advisor declares `ownerUserId`** (additive, nothing reads it, zero risk)
2. **Ship submit-side stamping** — new rows carry it. RLS unchanged, so review
   stays broken but no worse than today
3. **Backfill** the one live row via the workspace MCP (the only writer that
   can touch anonymous rows)
4. **Advisor flips `SongRequest.update` RLS** to `{"data.ownerUserId": "{{user.id}}"}`
5. **Ship the review switch** to `callerFetch`

Steps 4 and 5 must be in that order: a caller-token PUT before the flip would
403 against the old `created_by_id` rule. Between 4 and 5 the admin-key review
403s — which is exactly what it does today, so no regression window.

`delete` RLS: leave as is. Nothing deletes `SongRequest`, and widening delete
would be scope the fix does not need.

### Field spec for the advisor to declare

```
ownerUserId
  type:        string
  description: "Base44 User.id of the couple who owns the wedding this request
                belongs to. Stamped server-side by api/song-request-submit.js
                at create time from wedding.created_by_id — never supplied by
                the guest. This is the field update RLS is scoped against,
                NOT created_by_id, which is always 'anonymous' on these rows
                because guests submit them unauthenticated. Same pattern as
                Notification.recipient_user_id."
```

---

## 4. The add-path double-add — must be fixed whatever shape wins

Current order (`:139–153`): `Music.create` (caller token, succeeds) **then**
status PUT (admin key, 403, throws). Result: the track **is** added, the
request stays `pending`, the couple sees a 500, and **retrying adds the track
again**.

Fixing the RLS alone makes the failure rarer, not impossible — any failure
between the two writes reproduces it.

Reordering alone does not solve it, it only moves the damage: status-first
means a failed `Music.create` leaves a request marked `added` with no track,
which is silent loss and worse than a visible duplicate.

**Recommend an idempotency guard.** `Music` has no back-link today (fields:
`added_by, album, approved, artist, category, duration, embed_url,
guest_suggestion, image_url, notes, preview_url, song_title, source,
spotify_track_id`), so this needs one new declared field, e.g.
`sourceSongRequestId`. Then `add` becomes:

1. look for an existing `Music` row with `sourceSongRequestId === songRequestId`
2. create it only if absent
3. write the status

A retry after any failure finds the existing row, skips the create, and
completes the status write. Order stops mattering, which is the property worth
having.

If a new field is unwelcome, the weaker fallback is matching on
`song_title + artist + guest_suggestion` within the caller's own Music rows —
works, but silently collapses a genuine duplicate request for the same song by
two different guests. Prefer the explicit field.

---

## 5. Option (b) — append-only decision entity. Honest evaluation

Shape: a new couple-owned `SongRequestDecision` entity (`create: null` or
owner-scoped), written with the caller's token. `SongRequest` is never
updated; current status is derived at read time, latest-wins per
`songRequestId`.

**Genuine advantages:** no RLS change, no backfill, no dependency on the
`data.<field>` comparison, and it is the pattern this codebase already uses
for `RsvpResponse`, `PollVote`, `SongRequest` itself and `CollaboratorGrant`.

**Costs, stated fairly:**

- Every reader must join and aggregate: the couple's queue
  (`api/song-request-review.js` GET), the collaborator path
  (`api/collaborator-data.js`), and anything else surfacing counts. That is
  more code than option (a) touches, in more places.
- `SongRequest.status` becomes vestigial while still being present, populated
  and wrong. Two apparent sources of truth is exactly the trap that produced
  the `websitePassword` sentinels. It would have to be removed or loudly
  documented as dead, which is itself a schema change plus a migration
  question.
- Read cost grows with request volume, where option (a) is O(1).
- A new entity needs its own RLS decision, and `create: null` on it means a
  third party could inject decision rows for someone else's request unless
  each write is validated server-side against wedding ownership — reintroducing
  most of the work option (a) does once, at create.

**Verdict:** it works, and it is the right shape when a write genuinely cannot
be owner-scoped. Here the write *can* be, with a pattern already proven in
this app, so (b) buys nothing and costs a derived-state layer plus a lying
field. Recommend only if (a) fails at step 4.

---

## 6. Option (c) — hosted function with `asServiceRole`

Correct long-term, and it would make this a two-line change. Parked
capability, post-launch. **Rejected for now**, per instruction and on merit:
introducing the first hosted function to fix a feature with zero real usage
would be adopting a new runtime for the least urgent possible reason.

Recorded as the eventual home for this and for the `Guest.update` collaborator
gap, which has the identical cause.

---

## 7. Recommendation

**Option (a).** The mechanism is proven in production in this app
(`Notification`), the submit side already has the value in scope, the review
side already has the helper, and the backfill is a single row. Ship it with
the idempotency guard from §4 and the corrected sequencing from §3.
