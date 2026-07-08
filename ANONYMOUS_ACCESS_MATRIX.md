# Anonymous access matrix — Openinvite

Companion to `SECURITY_AUDIT.md` §1/§2. Scope: the **published, anonymous guest-facing site** only (routes matching `/w/:weddingSlug*` and `/rsvp/:token`) — not the authenticated couple's dashboard.

Base44's entity permissions are **entity-level, not row/token-scoped** (confirmed via MCP — no scoping keys in any entity schema). That means "public read: yes" on an entity doesn't mean "readable via a valid token/slug" — it means *any* caller can list *every* record of that entity across *every* wedding, regardless of what filter the app's own client code happens to apply. Several rows below are `No` even though the live UI currently depends on direct client-side access, because the fix is to move that access behind a serverless endpoint (using `BASE44_ADMIN_KEY`, never exposed to the browser) and only then lock the entity down in Base44.

## Entities the anonymous site actually touches (8 of 39)

| Entity | Public read | Public write | Code change required first? | Note |
|---|---|---|---|---|
| **WeddingDetails** | No | No (currently client-side `polls` update) | Yes | Site-render (`filter({slug})`) and RSVP's wedding-resolution (`filter({created_by_id})`) run client-side today, and the record holds `websitePassword`, `emergencyContacts`, vendor phone numbers, billing-adjacent fields, etc. Move slug-resolution to a serverless endpoint returning only an explicit guest-safe field allowlist; move poll-vote writes server-side (validate wedding, apply vote with admin key). |
| **Guest** | No | No | Yes | Live flow: `filter({rsvp_link_id: token})` then `update(guest.id, …)` for RSVP + poll votes — both client-side today. Move token→guest lookup and the update behind a serverless endpoint (mirror `guestbook-submit.js`). A separate `Guest.create()` call exists in `RSVPSection.jsx`, but that component is dead code (imported via `GuestWebsite.jsx` → `StillTemplate.jsx` but never mounted on any live route) — no feature needs public **create**; delete the dead chain rather than fix it. |
| **GuestbookEntry** | No, recommended | Yes for create (already server-mediated) | Read: recommended, not urgent. Create: already fixed. | Create already goes through `guestbook-submit.js` (admin key, Turnstile) — the client never calls `.create()` directly, so Base44's create permission can also be set to `No`. Read is currently a client-side `filter({wedding_id})` — an entity-level "yes" would let anyone dump every couple's guestbook; lower urgency than Guest/WeddingDetails (messages, not contact PII). |
| **Photo** | No | No (not needed — no write path exists on the guest site) | Yes | Guest gallery + "our story" section read `Photo.list()` fully unscoped today. Move behind a serverless endpoint scoped by wedding. |
| **Hotel** | Unclear — confirm with product | No | Maybe | `TravelSection.jsx` reads `Hotel.list()` unscoped. If `Hotel` is a shared, non-sensitive reference table (not per-couple content), blanket `public read: yes` may be fine as-is. If per-couple, treat like Photo. |
| **SongRequest** | No (no read path needed) | No | Yes | `GuestMusic.jsx` (`/w/:weddingSlug/music`) calls `SongRequest.create()` with **no wedding-linkage field at all** today — every wedding's requests land in one unscoped table. Needs the linkage stamped server-side (from slug/token) via a Turnstile-gated serverless endpoint. |
| **Music** | No (no read path needed) | No | Yes | Same issue as `SongRequest`: a guest music-suggestion component calls `Music.create()` with no wedding linkage. Same fix, if this path is kept live. |
| **GuestMessage** | No | No | N/A — not currently live | Only touched by the same dead `RSVPSection.jsx` chain as the orphaned `Guest.create()`. Delete rather than fix. |

## Everything else (31 of 39) — no public read, no public write, no code change needed

`Task`, `VendorBooking`, `VowSpeech`, `Invitation`, `VendorReview`, `ReceivedGift`, `RegistryProduct`, `RegistryItem`, `CustomGift`, `ThemeDetails`, `VenueAsset`, `Vendor`, `Table`, `UserPayment`, `Note`, `VendorTask`, `StreamChat`, `MoodboardItem`, `Photographer`, `Event`, `Schedule`, `Budget`, `QuoteRequest`, `VendorLog`, `Collaborator`, `User`, `Restaurant`, `StoryMilestone`, `CustomEventPage`, `WebsiteTheme`, `LiveStream`.

`GuestAccommodation.jsx`, `GuestTransport.jsx`, `GuestMusic.jsx` (its wedding-resolution call), and `ExperienceGuide.jsx` are the correct reference pattern already in the codebase — they resolve the wedding via `WeddingDetails.filter({slug: weddingSlug})` and read accommodation/transport/registry/experience content from that record's own nested fields, never a separate top-level entity. `LiveStream` is only ever touched by dashboard, `ProtectedRoute`-gated pages (`GuestSuiteLiveStream.jsx` is the couple's own *preview*, not the guest's actual view) — despite the name, it needs no anonymous access at all. `RegistryItem`/`CustomGift`/`Restaurant`/`StoryMilestone`/`CustomEventPage`/`WebsiteTheme` were flagged in `SECURITY_AUDIT.md` as unscoped in `WeddingWebsite.jsx` — a separate, dashboard-gated legacy page, not part of the anonymous surface, so that's a cross-tenant bug among logged-in users (tracked in the audit's fix-first list), irrelevant here.

## Summary for applying in Base44's permissions UI

- **Safe to lock to read: No / write: No today, with zero code changes**: all 31 entities in the "everything else" list.
- **Needs a code change before Base44 can safely be locked down**: `WeddingDetails`, `Guest`, `Photo`, `SongRequest`, `Music` — see `fix/anonymous-endpoints` for the implementation.
- **Already has the right architecture, just tidy up the permission grant**: `GuestbookEntry` create.
- **Needs a product decision, not just a security one**: `Hotel`.
