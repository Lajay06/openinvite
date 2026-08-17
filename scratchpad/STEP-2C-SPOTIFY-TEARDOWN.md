# Step 2b stage (c) — Spotify teardown report

Prepared 2026-08-17 against main `46a024a`. Nothing applied. Read-only:
repo grep + one admin-key row scan + one deliberate 403 probe.

---

## 1. Row inventory — `music.spotifyConnection`

Scanned all 21 `WeddingDetails` rows.

| | count |
|---|---|
| rows total | 21 (16 real, 5 `is_test`) |
| rows with any `music` object | **1** |
| rows with a non-empty `music.spotifyConnection` | **1** |
| rows with `music.spotifyUserId` | 0 |
| rows with `music.spotifyConnected === true` | 0 |

The single affected row:

```
id       6a1f90fa5b4e0702b5a051aa
slug     john-suzanne
is_test  false
keys     accessToken, displayName, expiresAt, imageUrl, refreshToken
expiresAt 1785674016305  (access token expired ~2026-08-02)
```

**That row is the fixture** — the same record used for every verification this
session. No real couple holds a Spotify connection. The access token is long
expired; the **refresh token is still live** (Spotify refresh tokens do not
expire), which is the whole reason this is worth doing.

---

## 2. Two corrections to the stated scope

### 2a. `api/spotify-refresh.js` does not exist

It was deleted previously. `api/_lib/spotifyAuth.js`'s own header records it:

> (api/spotify-refresh.js used to be a second caller; it was orphaned/never
> actually invoked by anything and was deleted rather than kept as a parallel
> refresh implementation.)

The live schema description for `spotifyConnection` still names it as a
reader, so that description is stale on this point too. The real third file
is **`api/spotify-session-fetch.js`**, plus **`api/_lib/spotifyAuth.js`**.

### 2b. Deleting `api/spotify-search.js` wholesale would break guest song requests

`spotify-search.js` has **two modes** (its own header, lines 8–12):

1. **User token** — `{q, accessToken, refreshToken, expiresAt}`, needs the
   couple's OAuth connection.
2. **App token** — `{q}` only, `client_credentials` grant from
   `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET`. No user connection at all.

Verified every caller's request shape:

| caller | sends | mode |
|---|---|---|
| `src/pages/GuestMusic.jsx:76` | `{q}` | app token |
| `src/components/music/SpotifySearch.jsx:35` | `{q}` | app token |
| `src/components/music/SpotifyModal.jsx:41` | `{q}` + tokens **if present** | user token, degrades to app |

So **guest-facing song-request search does not depend on the OAuth
connection at all.** Removing the file would delete a working guest feature
for no security gain — the tokens we are purging are not what powers it.

`SpotifyModal` already degrades: it attaches tokens only
`if (spotifyConnection?.accessToken)`. With the connection gone it silently
falls back to app-token search.

**Recommendation: keep `spotify-search.js` and delete only its user-token
branch.** That removes every code path that touches a stored token while
leaving search working for guests and couples alike.

---

## 3. What can write `music.spotifyConnection` today

Removal has to cover every writer, or the purge is undone by the next connect.

| # | file | role | disposition |
|---|---|---|---|
| 1 | `api/spotify-callback.js` | OAuth callback; the only thing that creates the connection | **delete** |
| 2 | `api/spotify-session-fetch.js` | hands the token bundle to the browser after callback | **delete** |
| 3 | `src/pages/Music.jsx` (~L255–280) | reads session-fetch, writes `spotifyConnection` into the row | **delete that flow** |
| 4 | `src/pages/Music.jsx` (~L308–327) | connect (redirect to Spotify) + disconnect | **delete** |
| 5 | `api/_lib/spotifyAuth.js` | ownership check, used only by the user-token path | **delete** |
| 6 | `api/spotify-search.js` user-token branch | accepts a refresh token from the client | **delete branch, keep file** |
| 7 | `src/components/music/SpotifyModal.jsx` | only client that sends tokens | **strip token passing** (keep modal, app-token search still works) |

`api/_lib/security.js` has rate-limit entries for the removed endpoints —
cosmetic, remove in the same pass.

After 1–7, nothing in the codebase can write the field.

---

## 4. Deletion plan — and a blocker worth knowing about

### The blocker: the admin key CANNOT delete this data

`WeddingDetails.update` RLS is `{created_by_id: "{{user.id}}"}`. Probed
directly, 2026-08-17:

```
admin-key PUT /entities/WeddingDetails/<id> → 403
{"message":"Permission denied for update operation on WeddingDetails entity"}
```

Canonical gotcha #1. **A server-side deletion script authenticated with
`BASE44_ADMIN_KEY` cannot strip this field from any row it does not own —
which is every row.** This is not a scripting detail; it decides the whole
approach.

Three ways round it, in order of preference:

1. **Owner token.** Works only where we hold credentials. Here that is enough,
   because the one affected row is the fixture and we have its login. This is
   the recommended route for *this* purge.
2. **Base44 workspace MCP `update_entities`.** The platform notes already
   record that the workspace MCP can do things the runtime admin key cannot
   (it can filter `User` by email where the admin key can't). Whether it
   bypasses update RLS is **untested** — worth confirming before relying on
   it, and it is the advisor's tool, not mine.
3. **Temporarily opening update RLS.** Rejected. It would make every couple's
   record writable by any caller for the duration, to fix one fixture row.

Given (1) suffices today, the plan below uses it and does **not** need the
advisor to do anything schema-side to enable deletion.

### The script — dry-run first

`scripts/purge-spotify-connections.mjs`, mirroring the shape of
`reset-test-account.mjs`:

- **`--dry-run` is the default.** Executing requires an explicit `--execute`.
- Scans all rows with the admin key (read is open) and prints one line per
  row holding a connection: id, `is_test`, slug, which key names are present.
  **Never prints a token value**, not even truncated.
- Writes by rebuilding `music` without the `spotifyConnection` key and
  `PUT`ting it with the **owner's token**, one row at a time. Field-scoped to
  `music` — no full-object write.
- Refuses to run against a row whose owner token it does not hold, and says
  so, rather than silently skipping.
- Re-reads every touched row afterwards and asserts `spotifyConnection` is
  gone and the rest of `music` (playlists, requestMessage, toggles) is intact.
  Deleting the connection must not disturb the song-request settings that
  live beside it.

Expected dry-run output today: **1 candidate row, the fixture.**

### Ordering — deletion before or after code removal?

**Code removal first, then purge.** If the tokens are deleted while
`spotify-callback.js` is still live, any stale OAuth redirect still in a tab
can write them straight back. Removing the writers first makes the purge
final. The window between deploy and purge is safe because the connection is
already unreachable by then.

---

## 5. Schema edits — exactly when

Two edits requested; they belong at **different** points.

| edit | when | why |
|---|---|---|
| `websitePassword` description → document the scrypt format | **any time now** | Purely descriptive. Stage (iii) already shipped and the mirror already carries the wording; this is only bringing live into step. No code depends on it. |
| Remove `music.spotifyConnection` from the live schema | **after the purge is verified, not before** | It is a *declaration* removal, and per gotcha #5 an undeclared field is silently dropped on write — but existing stored values are **not** erased by undeclaring it. Removing the declaration first would leave the tokens sitting in the rows while making them harder to see and impossible to write a scoped update against. Purge the data, verify it is gone, then undeclare. |

Suggested sequence:

1. Advisor applies the `websitePassword` description now (independent).
2. PR: code removal (§3) — report, verify, quoted-line merge.
3. Purge script dry-run → report → `--execute` on quoted authorization.
4. Verify the field is gone from the fixture row.
5. **Then** advisor removes `music.spotifyConnection` from the live schema.
6. Mirror sync for that removal rides a follow-up docs/PR.

---

## 6. Blast radius of the code removal

**Lost:** the couple's ability to connect a Spotify account, and with it the
user-scoped playlist import in `SpotifyModal`.

**Kept:** song-request search for guests *and* couples (app token),
Apple Music / YouTube link paste (`AddFromLink.jsx`,
`src/lib/musicLinkParser.js`), all `SongRequest` metadata including
`spotifyTrackId`/`spotifyUrl`, playlists already stored on the row, and every
music page.

`src/pages/PrivacyPolicy.jsx` and `src/pages/Features.jsx` both mention
Spotify. Those need a copy pass in the same PR — a privacy policy describing
an OAuth integration that no longer exists is a factual error in a legal
document, not a cosmetic one.
