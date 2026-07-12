# Website Builder Gap Map

*Read-only audit. No code changes. Master gap audit for the entire invitation-website builder + published guest site — brutally honest, zero-surprises goal. Builds on `BUILDER_UNIVERSE_AUDIT.md` (hero/typography/texture/motion/colour/feature-adaptation), whose findings on colour (PR #79), the real RSVP page (PR #80), and the video hero (PR #81) are now fixed; its remaining items (dead files, texture/motion duplicates, missing pageTransitions, `WeddingPollsPage` missing `universeConfig`, the `StudioWebsite.jsx` font-resolution typo) are still open as of this report.*

---

## Critical cross-cutting finding — three competing universe pickers, only one correct, and it's unreachable

There are **three separate, independently-built universe-selection UIs**, with three different id sets — and the only one that actually matches `UNIVERSE_CONFIGS` (the canonical styling data in `src/lib/websiteThemes.js`) is unreachable from any live navigation link. Verified directly (not just from the sub-investigation):

1. **`src/components/onboarding/OnboardingStepUniverse.jsx:6-14`** — the mandatory first-run onboarding step every new couple sees. Exactly **9 entries** (`grep -c` confirms), missing **mykonos** entirely. Uses id `'cape-town'` (hyphenated) at line 14 — `UNIVERSE_CONFIGS`'s key is `'capetown'` (no hyphen). The selection is written verbatim, no normalization: `src/pages/Onboarding.jsx:151` — `activeUniverse: draft.activeUniverse || prev.activeUniverse`. Selecting "Cape Town" here writes `'cape-town'` → `resolveUniverseConfig()` finds no match (`normalizeUniverseKey` only lowercases/trims, it doesn't strip hyphens) → silently falls through to the generic legacy `WEBSITE_THEMES` default. **A new couple's very first styling choice can silently fail with zero error shown**, for every couple who isn't shown Aman, Tulum, Kyoto, Capri, Marrakech, Brooklyn, Bali, or Paris.

2. **`src/pages/StudioUniverse.jsx:11-21`**, routed at `/studio/universe`, linked live from the Guest Suite hub (`src/pages/StudioHub.jsx`) — confirmed this **is the actual reachable "choose your universe" entry point** in the live app. 11 options; 5 of them (`tokyo`, `amalfi`, `sedona`, `aspen`, `santorini`) have **zero corresponding entry in `UNIVERSE_CONFIGS`**. Clicking through to `/studio/universe/<id>` renders `UniverseViewBase.jsx`, whose selection button (`UniverseViewBase.jsx:143`) writes `{ activeUniverse: id, activeTheme: 'still' }` (with a special-case override to `'aman'` at line 145, for aman only). For those 5 ids, the couple sees a fully-realized, richly-styled selection page (own accent colour, hero photo, tagline) and is told they've selected it — but the published site then renders with **zero universe-specific styling** (falls to the generic "Still" theme). 7 of these 11 (`tokyo, marrakech, paris, amalfi, sedona, aspen, santorini`) are gated as paid **"Ultra" tier** (`PREMIUM_IDS`, `StudioUniverse.jsx:8`, confirmed verbatim) — meaning **5 of 7 paid premium universe options are completely non-functional**, silently.

3. **`src/pages/UniverseStudio.jsx`** (routed at `/universe-studio`, `App.jsx:209-211`) + **`src/components/universe-studio/UniverseSelector.jsx:5-20`** — the ONLY correct flow: confirmed exactly the 10 canonical ids matching `UNIVERSE_CONFIGS` exactly (`aman, tulum, kyoto, capri, marrakech, brooklyn, bali, paris, capetown, mykonos` — no hyphen on capetown, mykonos present). **Confirmed via repo-wide grep: nothing anywhere in `src/` other than `App.jsx`'s own route declaration references `/universe-studio` or `UniverseStudio`.** It is orphaned — reachable only by typing the URL directly.

**Net effect: the live, reachable universe-selection UI is the wrong one.** This one issue plausibly explains why theming looked broken for most universes even after `resolveColors()` (PR #79) was wired — most real weddings likely have an `activeUniverse` value that doesn't exist in `UNIVERSE_CONFIGS` at all, because it was set through flow #1 or #2, never flow #3.

---

## (1) Assets — printables

Ten asset types exist, all built on the same shared component pair: `src/components/website-builder/AssetEditors.jsx` (editors) + `AssetPreviews.jsx` (previews), surfaced via `ASSET_PREVIEW_MAP`/`ASSET_EDITOR_MAP` and consumed by both `WBRightPanel.jsx` (the live website builder's asset editor) and `src/components/studio/guest-suite/StudioAssetsTab.jsx` (the Guest Suite's dedicated Assets tab).

| Asset | Editable | Real data or placeholder | Universe-styled | PDF/export | Status |
|---|---|---|---|---|---|
| Save the Date | Yes — photo, header/subtitle, layout (`AssetEditors.jsx:90-108`) | Real (couple-entered text + photo) | Uses its own `BgPicker`/layout choices, not the universe resolvers — not theme-adaptive | None | **PARTIAL** |
| Digital Invitation | Yes — photo + message (`AssetEditors.jsx:113-125`) | Real | Same as above | None | **PARTIAL** |
| Menu Card | Yes — title, footer, starters/mains/desserts/drinks (`AssetEditors.jsx:127-151`) | Real, substantive | Same as above | None | **PARTIAL** |
| **Seating Chart** | Yes — title, light/dark background (`AssetEditors.jsx:153-171`) | **Misrepresented**: editor copy claims "Seating data is pulled automatically from your Guest List & Seating planner" (`AssetEditors.jsx:169`), but the preview hardcodes literal `'Table 1'`–`'Table 6'` (`AssetPreviews.jsx:94`) — never reads a real `Table`/`Guest` record | Partial (bg toggle only) | None | **PLACEHOLDER-ONLY, and the UI actively misrepresents it as live** |
| **Guest Tags** | Yes | Hardcoded `[{name:'Guest Name', table:'Table 4'}, ...]` repeated 4× (`AssetPreviews.jsx:157`) — not real guest names | Not confirmed | None | **PLACEHOLDER-ONLY** |
| Welcome Signage | Yes (`AssetEditors.jsx:210-227`) | Not deep-audited | Not confirmed | None | Unverified/likely PARTIAL |
| Instagram Story Kit | Yes | Not deep-audited | Not confirmed | None | Unverified/likely PARTIAL |
| Motion Graphic | Yes | Static preview only — no animation found anywhere in the codebase for it | Not confirmed | None | Likely **PLACEHOLDER** (name overstates the feature) |
| Thank You Notes | Yes | Not deep-audited | Not confirmed | None | Unverified/likely PARTIAL |
| RSVP Card | Yes | Not deep-audited | Not confirmed | None | Unverified/likely PARTIAL |

**PDF/print export — confirmed MISSING for every asset type, no exceptions.** `src/components/studio/guest-suite/StudioAssetsTab.jsx:45-47`:
```js
const downloadAsset = () => {
  // Simple download trigger — opens asset in new tab
  alert('Download coming soon. Right-click the preview and save the image.');
};
```
Called from the "↓ Download" button (`:58`, `:114`) and a second inline "Download" click (`:183`, `alert('Download coming soon.')`). The product's own marketing copy directly contradicts this: `:16` describes Welcome Signage as *"Large format A1 venue signage"*; `:17` describes Guest Tags as *"Name tags, 6 per A4 sheet, print-ready"* — **neither is true; nothing produces a file.**

`jspdf` (`^4.2.1`) and `html2canvas` (`^1.4.1`) **are** installed and genuinely used — but only in `src/components/schedule/WeddingDayTimelineBuilder.jsx` (a couple-side wedding-day-timeline export), completely unrelated to any of the 10 printable asset types. The dependency exists and works elsewhere; it was simply never wired into the asset system.

**Confirmed live (verified via `list_entity_schemas` against the production Base44 app, not just the local `.jsonc` file): `assetContent` does not exist anywhere on the `WeddingDetails` schema.** Since `WBRightPanel.jsx` persists asset customisations to `weddingDetails.assetContent[assetKey]`, and Base44 silently drops any field not declared on the entity schema (the exact bug class this session already found and fixed twice for `music.spotifyConnection` and `heroVideoUrl`/`heroVideoFile`) — **every asset customisation a couple makes is silently discarded on save.** One-line fix: add `assetContent: {"type":"object"}` to the `WeddingDetails` schema via `update_entity_schema`.

---

## (2) Every published-site page/section

`WEDDING_PAGES` (`src/lib/websiteThemes.js:437-452`) and `PAGE_COMPONENTS` (`MultiPageWeddingWebsite.jsx:67-82`) match exactly — 14 slugs each, no mismatch, **no dead nav links at the page-routing level.** Nav renders via real `react-router` navigation, gated by `enabledPages`.

| Page | Nav link | Content | Universe styling |
|---|---|---|---|
| home | Works | Real (coupleNames/date/tagline), now has a working video hero | ADAPTS |
| our-story | Works | Real (`ourStoryContent`) | ADAPTS |
| celebration | Works | Real (schedule/itinerary) | ADAPTS |
| rsvp (in-site) | Works | Real | ADAPTS |
| registry | Works | Real (`registryContent`) | ADAPTS |
| music | Works | Real | ADAPTS |
| photos | Works | Real | ADAPTS |
| styling | Works | Real (questionnaire) | ADAPTS (no `universeConfig` — per prior audit, still open) |
| polls | Works | Real | **PARTIALLY** (missing `universeConfig` — per prior audit, still open) |
| faq | Works | Real (`qna` array) | ADAPTS |
| stay | Works | Real | ADAPTS |
| transport | Works | Real | ADAPTS |
| experience | Works | Real | ADAPTS |
| guestbook | Works | Real | ADAPTS |

**Confirmed MISSING (no published-site page exists at all)**:
- **Wedding party** — zero references under `src/components/guest-website/`. `src/pages/WeddingParty.jsx` exists but is couple-side dashboard only, never guest-facing.
- **Livestream** — zero references under `src/components/guest-website/pages/`, despite a `LiveStream` entity and other nav-gating flags existing on the page.

Separately, outside this 14-page nav: the actual guest RSVP submission page (`src/components/rsvp/RSVPPage.jsx`, `/rsvp/:token`) was found universe-blind and fixed this session (PR #80) — not a "dead link," just architecturally outside this page list.

---

## (3) Universe landing/home experience — polish audit

Honest assessment: **this reads as a well-executed reskin, not a bespoke-per-universe experience.** What varies per universe: heading/body font pairing, resolved colour palette (as of PR #79, assuming the couple actually reached the correct universe-picker — see the cross-cutting finding), one of 5 texture overlay types at very low, barely-perceptible opacity, and fade-up motion timing/distance. What does **not** vary: there is no per-universe decorative motif, icon set, divider style, section layout, or imagery treatment beyond whatever photo/video the couple uploads themselves. Structurally, a Kyoto wedding and a Capri wedding are pixel-identical once you subtract font/colour/texture — same hero layout, same scroll-indicator arrow, same card shapes on every page.

What would concretely need to exist for this to read as "world-class"/bespoke rather than "generic template, reskinned":
- Universe-specific decorative elements (an ink-wash divider for Kyoto vs. a wave motif for Capri vs. an ironwork-style rule for Brooklyn) — currently every universe uses the identical generic `<div style={{height:1, background:...}}}` divider line.
- A default illustrative/iconographic treatment for the hero when the couple hasn't uploaded their own photo/video — currently it's either their media or a flat colour, no per-universe fallback art.
- Per-universe section layout variation — Marrakech's "Desert Opulence" and Brooklyn's "Urban Industrial" currently render in the identical centred-card, centred-text layout as every other universe.
- The texture/motion exact-duplicate pairs flagged in `BUILDER_UNIVERSE_AUDIT.md` (tulum/bali texture; tulum/paris/capetown motion) are still unfixed as of this report, further narrowing per-universe distinctiveness.

This gap is structural (one shared component tree with swapped tokens), not a per-universe quality difference — it applies uniformly across all 10.

---

## (4) Builder editability

| Element | Editable from a *reachable* builder UI? | Persists & reaches the published read path? |
|---|---|---|
| Hero text (names/date/tagline) | Yes — onboarding/dashboard core fields | Yes |
| Hero image (`coverPhoto`) | Yes, but only as of this session — previously no live input existed anywhere (added to `WBRightPanel.jsx` in PR #81) | Yes |
| Hero video (`heroVideoUrl`) | Yes, added this session (PR #81) | Yes, as of PR #81 |
| Our-story / celebration / registry / FAQ / photos / music / policies content | Yes, via each page's own dashboard editor or the section-content system | Yes (each confirmed reading the matching field name) |
| **Asset customisations (all 10 types)** | Yes, real editors exist | **No — confirmed live: `assetContent` is not declared on the `WeddingDetails` schema, so every save is silently dropped** |
| **`heroEffect`** (Parallax/Zoom Out/Static) | Yes — control exists (`WBRightPanel.jsx`, per prior audit) | **No — never read anywhere on the published site** (still open) |
| **`activeUniverse`, via the two reachable pickers** | Yes, trivially easy to set | **Silently fails** for `cape-town` (onboarding) and `tokyo`/`amalfi`/`sedona`/`aspen`/`santorini` (Studio Universe, 5 of 7 paid Ultra options) — the single largest "editable but not wired" instance in the app |

This is the same bug class as `heroVideoUrl`/`heroVideoFile` (a builder write and a published-site read disagreeing on field name/value), now confirmed in **three places**: the original hero field (fixed), the `activeUniverse` id mismatches (open), and `assetContent` (open).

---

## (5) PDF export — full inventory

| Location | Produces a real PDF? |
|---|---|
| Asset system (`StudioAssetsTab.jsx` "Download" controls) | **No — a literal `alert('Download coming soon...')`, zero implementation**, at 3 separate call sites in the same file |
| `WBRightPanel.jsx` asset editor panel | No export control present at all |
| `PublishModal.jsx` QR code download | Not a PDF — a working PNG download of the site's QR code; unrelated to printables |
| `src/components/schedule/WeddingDayTimelineBuilder.jsx` | The **only** real `jspdf`/`html2canvas` usage in the codebase — genuine, working PDF generation, but for the couple's own day-of timeline, not any guest-facing printable |

**There is no working PDF export anywhere for save-the-dates, invitations, menus, seating charts, guest tags, or signage.** This is the single largest gap between the product's own marketing copy ("print-ready," "Large format A1 venue signage") and what actually ships.

---

## Prioritised build backlog

Ordered by (a) broken-for-guests first, (b) core-feature completeness, (c) polish. Each item scoped to one PR.

1. **[S] Fix the onboarding universe picker's id mismatch** (`OnboardingStepUniverse.jsx:14`, `'cape-town'` → `'capetown'`) and add the missing `mykonos` entry — every new couple's first styling choice can currently silently fail.
2. **[M] Retire or fix the `/studio/universe` (StudioUniverse.jsx) picker** — either remove the 5 non-existent premium universe ids (`tokyo`, `amalfi`, `sedona`, `aspen`, `santorini`) from `PREMIUM_IDS`/the options list until `UNIVERSE_CONFIGS` supports them, or build out those 5 universes' configs to match. Currently 5 of 7 paid Ultra-tier options are completely non-functional.
3. **[S] Link the correct universe picker into the app.** `UniverseStudio.jsx`/`UniverseSelector.jsx` is the only picker whose ids match `UNIVERSE_CONFIGS` exactly, and it's unreachable from any nav. Either route the live "choose your universe" entry points (onboarding, Guest Suite hub) to it, or merge its correct id list into whichever picker becomes canonical.
4. **[S] Add `assetContent` to the `WeddingDetails` Base44 schema** — every asset customisation a couple makes is currently silently discarded on save.
5. **[S] Fix the misrepresented Seating Chart / Guest Tags asset previews** — either wire them to real `Table`/`Guest` data, or stop claiming ("pulled automatically from your Guest List") that they do.
6. **[M] Wire real PDF/print export for the asset system** — `jspdf`/`html2canvas` are already installed and proven working elsewhere (`WeddingDayTimelineBuilder.jsx`); replace the `alert('Download coming soon...')` stubs in `StudioAssetsTab.jsx` with real export using the same libraries.
7. **[S] Fix `WeddingPollsPage.jsx` missing `universeConfig`** (carried over from `BUILDER_UNIVERSE_AUDIT.md`, still open) — one-line prop addition, brings it to parity with the other 13 guest pages.
8. **[S] Fix the `StudioWebsite.jsx` builder-preview font-resolution typo** (carried over, still open) — `typo?.fontDisplay`/`fontBody` should read `typo?.headingFont`/`bodyFont`.
9. **[S] Remove the dead `heroEffect` control and its `WSDesignTab.jsx` duplicate** (carried over, still open) — never implemented anywhere on the published site.
10. **[S] Recalibrate the duplicate texture/motion values** (carried over, still open) — tulum/bali texture, tulum/paris/capetown motion.
11. **[S] Add distinct `pageTransition` values for the 9 universes that lack one** (carried over, still open) — only aman has one in `UNIVERSE_CONFIGS`.
12. **[S] Delete the confirmed-dead builder files** (carried over, still open) — `WSContentTab.jsx`, `WSSettingsTab.jsx`, `WSDesignTab.jsx`; resolve the `WSPagesTab.jsx` liveness question.
13. **[M] Build a published, guest-facing Wedding Party page** — currently dashboard-only, no guest-facing equivalent exists at all.
14. **[M] Build a published, guest-facing Livestream page** — entity and nav-gating flags exist; no page does.
15. **[L] Give each universe genuine per-universe decorative identity** (motifs/dividers/default imagery/layout variation) — the biggest lift here, addresses the "generic reskin vs. bespoke" gap in §3; not urgent relative to the above, but the largest single lever on perceived product quality.
