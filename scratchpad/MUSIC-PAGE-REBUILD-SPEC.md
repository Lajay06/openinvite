# Music page rebuild — spec

Opens Phase 1. **Report only; no code written.**

Standing decision being implemented: **playlist link + free-text requests + QR.**
Everything below serves that, and the audit is what determines how much comes out.

Produced 2026-08-18 against `main` @ `c012d9d`. Live figures are read-only.

---

## 1. The finding that should shape the plan

**There is almost no real music data.** Measured live:

| Entity | Rows | Detail |
|---|---|---|
| `Music` | **2** | both `source: 'spotify'`, **0 carry a `spotify_track_id`** |
| `SongRequest` | 234 | 231 are the known orphaned unstamped rows from deleted weddings → **3 real** (1 `added`, 2 `declined`) |

So the entire Spotify-search apparatus — the most complex part of this surface —
has **never produced a single stored track.** Even the two `Music` rows that
exist were not added through it.

This removes the migration question almost entirely. The rebuild is a
**deletion plus a small build**, not a data-preserving refactor. Any plan that
budgets for migrating playlists is budgeting for something that isn't there.

---

## 2. Current-state audit

**2,862 lines across 15 files.**

| File | Lines | Fate |
|---|---|---|
| `src/pages/Music.jsx` | 606 | rebuild |
| `src/pages/GuestMusic.jsx` | 372 | rebuild |
| `api/song-request-review.js` | 230 | keep, simplify |
| `api/song-request-submit.js` | 227 | keep, simplify |
| `src/components/music/MusicSuggestionsModal.jsx` | 199 | delete |
| `src/components/music/SpotifyModal.jsx` | 171 | **delete** |
| `src/components/music/SpotifySearch.jsx` | 171 | **delete** |
| `src/components/music/MusicTrackRow.jsx` | 155 | delete |
| `api/spotify-search.js` | 154 | **delete** |
| `src/components/music/MusicForm.jsx` | 132 | delete |
| `src/components/music/SharePlaylist.jsx` | 131 | rebuild as the share/QR panel |
| `src/components/music/AddFromLink.jsx` | 97 | fold into the playlist-link field |
| `src/components/guest-website/pages/WeddingMusicPage.jsx` | 87 | rebuild (see §3) |
| `src/components/music/MusicList.jsx` | 84 | delete |
| `src/lib/musicLinkParser.js` | 46 | keep — link parsing is the new core |

Couple-side `Music.jsx` has four tabs: **Playlist**, **Vendor**, **Notes**,
**Considerations**. Only Playlist is in scope; the other three are ordinary
planning content and must survive untouched.

---

## 3. 🔴 Pre-existing bug found during the audit — two guest music pages, one unreachable

There are **two** guest-facing music surfaces:

1. `GuestMusic.jsx` (372 lines) — standalone, Turnstile-protected song requests
2. `WeddingMusicPage.jsx` (87 lines) — a page inside the multi-page wedding site

`src/App.jsx` registers `/w/:weddingSlug/music` → `GuestMusic` **and**
`/w/:weddingSlug/:page` → `MultiPageWeddingWebsite`, whose page map also binds
`'music'` → `WeddingMusicPage`. React Router ranks a static segment above a
dynamic one, so `GuestMusic` always wins.

**Verified on production:** `https://www.openinvite.com.au/w/john-suzanne/music`
renders `GuestMusic` ("Request a song", search-first, Spotify-green).

But `RealWebsitePreview.jsx:44` also binds `'music'` → `WeddingMusicPage`, so
**the builder preview shows the couple a music page no guest will ever see.**
That is a preview/production divergence, and it is pre-existing — not introduced
by this rebuild. The rebuild must collapse it to one page rather than inherit it.

**Also noted:** both guest routes are registered twice, in two separate
`<Routes>` trees (`App.jsx:189-191` and `258-260`). Only one tree mounts at a
time so it is not a live collision, but every guest route must be edited in two
places, which is how divergence starts.

---

## 4. Dead Spotify residue

The user-OAuth connection was torn down in Step 2b/2c. What remains:

**Schema fields with zero readers** — `WeddingDetails.music.spotifyConnected`
and `.spotifyUserId`. A repo-wide grep finds **no reader at all**, only a
comment in `api/_lib/guestSafeWedding.js:92` describing them. Dead residue.
Undeclaring them is a **schema change** and is therefore **flagged for the
advisor, not done** — and per gotcha #5, undeclaring does not erase stored
values, so it is safe but not reversible-by-redeclaring in terms of visibility.

**Still live, and this is the decision point:** `SPOTIFY_CLIENT_ID` and
`SPOTIFY_CLIENT_SECRET` are **set in Production and Preview** (80 days old), and
`api/spotify-search.js` works — it uses a `client_credentials` app grant, which
needs no user connection. The Spotify *search* feature is functional; it is the
*connection* that is gone.

So deleting Spotify search is a **product decision, not a cleanup**. The standing
decision (free-text requests) implies removing it, and the data says nobody has
ever used it — but it is a working feature, so it should be removed knowingly.
If removed, both env vars should be deleted too.

**Playlist fields worth keeping:** `music.playlists[]` carries
`spotifyPlaylistId`, `name`, `coverImage`, `trackCount`, `enabled`. The rebuild's
"playlist link" maps onto this, though a link is not necessarily a Spotify id —
see §7.

---

## 5. Flows

### Couple side — now

Music → Playlist tab → a track-management UI: Spotify search modal, add-by-link,
manual add form, per-track rows with approve/decline, a suggestions modal, and a
share-link panel. Nine pieces of UI to curate a track list that, in practice, is
empty.

### Couple side — proposed

One screen, three blocks:

1. **Your playlist** — a single URL field. Paste a Spotify / Apple Music /
   YouTube playlist link. `musicLinkParser.js` already parses these; validate,
   store, show the resolved name and a "Preview" link out.
2. **Song requests** — the list of guest submissions with approve/decline, plus
   the existing settings (`guestRequestsEnabled`, `requestsRequireApproval`,
   `limitOnePerGuest`, `onlyForConfirmedGuests`, `requestsClosedDate`,
   `requestMessage`). These already exist and already work.
3. **Share** — the guest URL, a copy button, and the **QR code**.

Vendor / Notes / Considerations tabs unchanged.

### Guest side — now

`/w/:slug/music` → search-first Spotify UI, with "Cannot find your song? Type it
in yourself" as a secondary fallback link.

### Guest side — proposed

The fallback becomes the primary. One page:

- The couple's `requestMessage`
- **Free-text fields**: song title, artist, optional note, submitted-by
- Turnstile (already wired, keep exactly as is)
- If a playlist link is set, a "Listen to our playlist" button
- Respect the existing gates: requests disabled, closed date passed, confirmed
  guests only, one-per-guest

**One page, not two** — resolving §3.

---

## 6. What gets deleted

- `api/spotify-search.js` and both `SPOTIFY_*` env vars (pending §4 decision)
- `SpotifySearch.jsx`, `SpotifyModal.jsx` — the search UI
- `MusicList.jsx`, `MusicTrackRow.jsx`, `MusicForm.jsx`,
  `MusicSuggestionsModal.jsx` — per-track curation
- The duplicate music page (§3), whichever way it is collapsed

**Open question — the `Music` entity.** With per-track curation gone, `Music`
(15 fields, 2 rows) has no writer. Recommend leaving the entity declared and
unused for now: deleting it is a schema change, it holds real (if trivial) data,
and `SongRequest` already carries the guest-request flow. Flag for the advisor.

## 7. What gets built

| Piece | Notes |
|---|---|
| Playlist-link field | Reuses `musicLinkParser.js`. Needs a **schema decision**: `playlists[].spotifyPlaylistId` is Spotify-specific, but the link may be Apple/YouTube. Either add a `playlistUrl` + `playlistSource` pair, or store the raw URL. **Advisor decision — schema change.** |
| Rebuilt `GuestMusic.jsx` | Free-text first; keep Turnstile, keep the gates |
| Rebuilt couple Playlist tab | Three blocks above |
| QR panel | Follows the established `api.qrserver.com` pattern (4 existing sites: `PublishModal`, `StudioShareTab` ×2, `WhatsAppQRCode`) |

**QR caveat worth raising:** every existing QR sends the wedding URL to a
third-party service (`api.qrserver.com`) as a query parameter, and renders an
`<img>` from it. It works and it is the house pattern, but it is an external
dependency on a page couples will print, and it discloses the URL. A local
generator would remove both. Not part of this rebuild unless you want it.

---

## 8. Verification plan

Per the standing rule, **both halves, and the admit half re-read independently.**

**Admit**
1. Couple pastes a playlist link → reload → link persists and resolves.
2. Guest submits a free-text request on production → appears in the couple's
   list → **independent Base44 re-read** confirms the `SongRequest` row, its
   `ownerUserId` stamp, and its `guestEmailHash`.
3. Couple approves → status changes → re-read confirms.
4. QR code scans to the correct guest URL.

**Refuse**
5. Requests disabled → guest page refuses.
6. Past `requestsClosedDate` → refuses.
7. `onlyForConfirmedGuests` → a non-confirmed guest refuses.
8. `limitOnePerGuest` → second submission from the same email refuses.
9. Turnstile absent/invalid → `400`, no row created.

**Regression**
10. Vendor / Notes / Considerations tabs still load and save.
11. `/w/:slug/music` resolves to exactly one page, and the builder preview shows
    that same page (§3 closed).
12. `npm run verify` 13/13 and `npm run test:marketing-routes` — the latter
    because deleting components risks the referenced-but-not-imported blank-page
    failure mode.

**Not verifiable locally:** Turnstile is domain-restricted, so legs 2 and 9 are
production-only with the standing fixture.

---

## 9. Decisions needed before build

1. **Remove Spotify search?** It works and its credentials are live. The
   standing decision implies yes; the data says nobody used it. Confirm.
2. **Playlist link storage shape** — schema change (§7).
3. **Undeclare `spotifyConnected` / `spotifyUserId`?** — schema change, zero
   readers.
4. **Keep the `Music` entity declared but unused?** Recommend yes.
5. **Which guest music page survives** — `GuestMusic` (feature-complete,
   Turnstile) or `WeddingMusicPage` (themed, inside the site shell)? Recommend
   keeping `GuestMusic`'s logic and giving it the site shell's theming, so the
   builder preview stops lying.
6. **Local QR generation** instead of the third-party image (§7)?

Items 2 and 3 are schema changes and are flagged, not taken, per the work pack.
