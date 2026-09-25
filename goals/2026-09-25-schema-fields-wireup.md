# Schema fields wire-up

Thirteen declarations were added to the live Base44 schema on 2026-09-25 and verified against the mirror (additive only, zero removals). This goal syncs the mirror and finishes the three items that stopped in round 2 for want of them. Every item here touches couple-facing planning, so every PR carries a "Mobile impact" line; where the mobile shell would need the same thing, say so in the line — the web terminal never writes to the mobile branch.

## 1. Mirror sync (RULE 12)

Sync base44/entities/WeddingDetails.jsonc and Music.jsonc from the verified live exports (the scratchpad copies you diffed). Add the thirteen paths with their live types and descriptions; change nothing else. Add the provenance comment in the house style: "Added to the live schema by the owner in the Base44 chat, 2026-09-25, and verified field-by-field against a live export before this mirror was written." Schema mirrors are above MINOR: hold.

## 2. Guidance on

The guidance system (#853) ships behind a flag defaulting off because guidanceState did not exist. It does now: {tourSeenAt: string|null, dismissed: string[]}. Flip the default on. Persist tourSeenAt as an ISO timestamp the first time the tour completes or is skipped; append a page key to dismissed when a "What's here" panel is dismissed; never write either field on a wedding that has not loaded. A couple who has already seen it must never see it again after a reload — guard that. Read-verify-write-reread on the persistence test, on the smoke account only. Hold.

## 3. Dress code pills and notes

New on mainCeremony, reception, and each preWeddingEvents[] / postWeddingEvents[] item: dressCodePills (string[]) and dressCodeNotes (string). The existing dressCode string stays as the fallback — no backfill, no migration.

Editor (event details, each event): a pill picker with this vocabulary, plus "Add your own" for a custom pill: Black tie · Black tie optional · Cocktail · Formal · Semi-formal · Smart casual · Casual · Garden party · Beach formal · Festive · Traditional dress welcome · Comfortable shoes. Up to six pills per event. Below it, Notes: one free-text line, 160 characters, placeholder "Anything guests should know — heels and grass, a chilly courtyard, a colour you'd love to see."

Guest site: dressCodeLine() already accepts an array — pills render through it. Notes render as one line beneath, in the event's own voice, only when non-empty. If pills are empty, the legacy dressCode string shows exactly as it does today. The per-event styling quiz (#849) reads pills first, then the string.

Editors show what guests see: no pill or note appears in an editor that does not appear on the guest site. Guard at 390 and 1440. Hold.

## 4. Music: playlists and the couple's own tag

Music.playlist (string, free text) and Music.categoryOther (string) now exist. In the Music table (#852):

- Playlist column. "Create playlist" names a new one (a name is a string on the tracks that belong to it, nothing else); "Link playlist" assigns a track to an existing name; the accordion groups by playlist name. WeddingDetails.music.playlists[] remains the list of names; a track's playlist must be one of them or empty.
- Category select gains "Something else…" as its last option. Choosing it reveals a short text field that writes categoryOther and clears category; the row's tag shows categoryOther. Choosing any of the six clears categoryOther. Never both set. The six-tag guard stays green.

Hold.

## Not in this goal

Messages (zero GuestMessage rows exist anywhere — owner decision pending). Polls summary strip. The Base44 MCP schema read (parked).
