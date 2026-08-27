# WAVE 2 — DELETION SCOPE REPORT

**Nothing is deleted here.** Eight items, ordered lowest risk first, so the safe
ones can land while the rest are still being decided. Each merges on its own
quoted line.

## Two things established before anything else

**PRODUCTION DATA — measured, with a control.** Control: `WeddingDetails` → **19
rows**, the known nineteen, so a zero below is informative rather than a broken
query.

| entity | rows | distinct owners |
|---|---|---|
| Photo | **0** | 0 |
| LiveStream | **0** | 0 |
| MoodboardItem | **0** | 0 |
| GuestContactSubmission | **1** | 1 |
| Guest | 210 | 3 |

**CLOUDINARY — the assumption behind the media-cost queue does not hold.**

- **Photos does NOT consume Cloudinary.** `PhotoGallery` uploads via
  `useFileUpload` → `base44.integrations.Core.UploadFile`. Deleting it changes
  **Base44** storage, not Cloudinary.
- **The asset machinery does not upload at all.** Three previews reference one
  static Cloudinary URL as a fallback image; nothing is stored.
- Cloudinary's real consumers are marketing, auth and email surfaces — About,
  Ava, Contact, Features, Pricing, Tour, home components, ForgotPassword,
  ResetPassword, `emailBrand`, `gift-reveal`. **None are in this scope.**

**Neither deletion will move the media-cost numbers.** The report can be
unblocked from this wave.

---

## 1. LIVE STREAM — lowest risk

**Code deleted:** `src/pages/LiveStreaming.jsx`, `src/pages/GuestSuiteLiveStream.jsx`,
their `src/App.jsx` routes, `src/pages.config.js` entries, the
`AnimatedSidebar.jsx` nav item.
**Stops being reached:** nothing else.
**Schema orphaned (named, not proposed):** entity `LiveStream` in its entirety;
its generated fields in `src/lib/entityFields.generated.js`.
**Production data:** **none — 0 rows.** No data decision needed.
**Guest view:** nothing changes. There is no guest page — that is the defect.
**What else was standing on it:** `resolveMyWedding.js` references it; confirm
it is a listing rather than a dependency before deleting.
**Also closes:** the publish-parity finding — it promises "visible to guests"
with no guest surface to be visible on.

## 2. PHOTOS — low risk, one open question

**Code deleted:** `src/pages/PhotoGallery.jsx`,
`src/components/guest-website/pages/WeddingPhotosPage.jsx`,
`src/lib/photoExport.js`, the `photos` entry in `WEDDING_PAGES`
(`websiteThemes.js:445`), `PAGE_COMPONENTS['photos']` in both
`MultiPageWeddingWebsite.jsx` and `RealWebsitePreview.jsx`, the sidebar item,
the `pages.config.js` entry, `WBRightPanel.jsx:616`.
**NOT deleted — unrelated despite the name:** `api/places-photo.js` (Google
Places proxy), `MarketingPhotoPair.jsx` (marketing), `Photography.jsx` (a
VENDOR planning page, not the photo feature), and `ourStoryContent.photos` /
block `photos` fields in the builder, which are a different feature.
**Schema orphaned:** entity `Photo`.
**Production data:** **none — 0 rows.**
**Guest view:** the Photos page disappears from the nav. **Any guest with a
`/w/:slug/photos` link now meets `InvitationNotAvailable`** — that path is live
as of #599 and needs no new work.
**What else was standing on it:** `enabledPages` may contain `'photos'` on
existing records; after removal from `WEDDING_PAGES` those entries become inert
rather than erroring, because `pageLinks` already filters on a resolvable label.
**OPEN QUESTION for the owner:** `Photography.jsx` is a vendor page that shares
the word. Confirm it stays.

## 3. THE "PREVIEW YOUR SITE" CARD — low risk, purely presentational

**Code deleted:** the third card object in `src/pages/StudioHub.jsx` (title
"Preview your site", subtitle "See your website exactly as your guests see
it."), and the two survivors — Guest Suite, My Universe — widened to rectangles.
**Schema orphaned:** none.
**Production data:** none.
**Guest view:** unchanged. This is dashboard chrome.
**What else was standing on it:** it is the only in-product route to the guest
preview from the hub; confirm the same destination remains reachable from the
Guest Suite card or the builder before removing the door.

## 4. COPY LAYOUT — low risk, contained

**Code deleted:** the "Copy layout from…" control at `src/pages/Seating.jsx:932`
and the copy routine at `Seating.jsx:401`.
**Schema orphaned:** none — it copies table geometry between a couple's own
events, it does not store anything of its own.
**Production data:** none.
**Guest view:** unchanged.
**What else was standing on it:** the comment at `Seating.jsx:401` records
"decision #3 — tables only, never guest assignments". That decision has no other
home; **record it before deleting the code that documents it.**

## 5. GUEST GUIDE CATEGORIES — medium risk, data-bearing

**Code deleted:** the `categories` tab and its editor in
`ExperienceGuideTab.jsx` (state at :55, toggles at :90-98), the enabled-category
rendering in `WeddingExperiencePage.jsx` (:35-39, :150-157), and the
`CATEGORIES` constant.
**Stops being reached:** `couplePicks` and the itinerary remain; only the
category grid goes.
**Schema orphaned:** `WeddingDetails.experienceGuide.categories` (a nested
free-form object — no schema change is required to strand it).
**Production data:** lives inside `experienceGuide` on `WeddingDetails`. **Not
yet counted per record — that count necessarily reads the two protected
records, so it needs its own line.**
**Guest view:** a guest stops seeing the category grid of local
recommendations. Guides consisting only of categories become **empty pages that
still publish**.
**What else was standing on it:** `experienceGuide.published` gates the page
(#599). A guide whose only content was categories will publish an empty page —
**decide whether emptiness should un-publish it.**

## 6. COPY COLLECT LINK — medium risk, SCOPE AMBIGUOUS

**The owner's words are "remove the whole copy collect link feature", and the
button and the feature are different sizes. Reporting both; not choosing.**

**Reading A — the button only:** delete `src/pages/Guests.jsx:822-826` (the
"Copy collect link" control and its fallback). Everything else stays. Zero data
impact, zero guest impact.

**Reading B — the whole collection feature:** additionally
`src/pages/GuestCollect.jsx`, `api/collect-guest-contact.js`,
`api/guest-contact-review.js`, `src/components/guests/PendingImportsPanel.jsx`,
the App route, and entity `GuestContactSubmission`.
**Production data under Reading B:** **1 row exists.** Deleting the code does
not delete it; the row would be orphaned and needs its own decision and its own
line.
**Guest view under Reading B:** the collect page stops existing. Any guest
holding a collect link meets a refusal.
**What else was standing on it:** `api/collect-guest-contact.js` was one of the
seven sites adopted onto the shared slug resolver (#586). Removing it reduces
that adoption count, and **the resolver guard asserts the adoption — it will
need its expected count updated in the same PR, or it will fail.**

## 7. ALL ASSET MACHINERY — highest risk of the seven, widest blast radius

**Code deleted:** `src/components/universe-studio/AssetGrid.jsx`, all eight
previews in `src/components/universe-studio/assets/` (InstagramKit, MenuCard,
MotionGraphic, PlaceCards, SaveTheDate, SeatingChart, ThankYou,
WelcomeSignage), `src/pages/AvaStudioAssets.jsx` and its two `App.jsx` routes
(`/studio/ava/assets`, `/studio/ava/assets/:step`).
**Left panel:** the `Design` and `Assets` sections in `WBLeftPanel.jsx`
(:261-302, plus `designOpen`/`assetsOpen` state) are replaced by **one pill
reading "Change universe"** that navigates to the universe studio.
**Stops being reached:** `UniverseWorldView.jsx` and `MockShared.jsx` reference
assets; confirm whether each is a consumer or merely a listing.
**Schema orphaned:** none found — the previews render from `WeddingDetails`
fields that other surfaces also read. **Nothing to strand, which is why this is
safe despite its size.**
**Production data:** none of its own.
**Guest view:** unchanged — this is all studio-side.
**Cloudinary:** three previews reference one static fallback URL. Deleting them
removes a handful of reads and no stored assets.
**What else was standing on it:** the Design section in the left panel is being
removed alongside Assets on the owner's instruction. **Confirm what Design
currently contains and where those controls go** — this is the largest
"what else was standing on it" question in the wave, and the one most likely to
remove a control someone still needs.

## 8. THE SECOND ACCOMMODATION ROUTE — needs a decision before it is scoped

Two routes render the same accommodation data from the same fields, both
labelled "Stay": `/w/:slug/accommodation` (`GuestAccommodation`, its own route)
and `WEDDING_PAGES` `stay` (`WeddingStayPage`, inside the shell).

**Survivable meanwhile:** the nav dedupe (#598) shows a guest only one.
**The decision:** which is the real accommodation page, and what the other's
route does once it is gone — redirect, or refuse through the
`InvitationNotAvailable` path now that #599 exists.
**Guest view:** whichever route is removed, **any existing guest link to it
breaks.** That is the only item in this wave where a link already in someone's
inbox can stop working, which is why it is last.

---

## Recommended landing order

**1 Live stream · 2 Photos · 3 Preview card · 4 Copy layout** — no production
data, no guest-facing loss beyond an intended page removal, nothing standing on
them that is not named above.

**5 Guide categories · 6 Collect link** — data-bearing or scope-ambiguous.

**7 Asset machinery** — large but structurally safe; its risk is the Design
section travelling with it.

**8 Accommodation route** — needs a product decision first, and can break a link
already sent.
