# Builder Universe Audit

*Read-only audit. No code changes. Goal under audit: "each of the 10 universes fully works with distinct type/colour/texture/transition/motion AND every guest feature adapts to the active universe's styling."*

The 10 universes: aman, tulum, kyoto, capri, marrakech, brooklyn, bali, paris, capetown, mykonos.

---

## Critical cross-cutting finding

There are **three independent, mutually-inconsistent colour-palette data sources** for the 10 universes, and only one is actually consumed by the published site:

1. `src/components/universe-studio/UniverseSelector.jsx:3-21` — a `UNIVERSES` array with per-universe `bg`/`accent` hex values, used only as the builder's universe-picker card preview (e.g. `capri: bg:'#1A6EBD', accent:'#FFE566'` at line 14). Never persisted, never read again — `onSelect` only passes `u.id` up; `src/pages/UniverseStudio.jsx:43` does `handleSave({ activeUniverse: universeId })`, no colour data leaves this component.
2. `src/pages/StudioWebsite.jsx:32-131` — a second, richer `UNIVERSE_THEMES` object (primary/secondary/background/text/accent + its own `fontDisplay`/`fontBody`) used only in the builder's live preview panel, e.g. `kyoto.fontDisplay: '"Noto Serif JP", serif'` (~line 63) — a **different font than Kyoto's canonical typography** (see §2).
3. `src/lib/websiteThemes.js:1-258` — `WEBSITE_THEMES`, a 25-entry array keyed by legacy theme ids (`aman`, `still`, `dusk`, `sage`, `slate`, `blush`, `noir`, `ivory`, `midnight`, `terra`, `forest`, `coral`, `lavender`, `bronze`, `arctic`, `desert`, `plum`, `jade`, `charcoal`, `champagne`, `obsidian`). **Only `aman` overlaps with a canonical universe id.** This is the only one actually consumed by the published site:
   - `src/components/guest-website/MultiPageWeddingWebsite.jsx:160`: `const theme = WEBSITE_THEMES.find(t => t.id === weddingDetails.activeTheme) || WEBSITE_THEMES[0];`
   - `weddingDetails.activeTheme` is a field entirely separate from `weddingDetails.activeUniverse`. Nothing in the builder sets `activeTheme` when a universe is picked — confirmed at `UniverseStudio.jsx:43` (only sets `activeUniverse`).
   - `WEBSITE_THEMES[0]` (the fallback) is the `aman` entry (`websiteThemes.js:2-17`).

**Net effect:** for all 9 non-Aman universes, unless the couple separately finds an unrelated legacy colour-theme picker and picks one of the 25 `WEBSITE_THEMES` ids (none named after or designed for the 9 other universes), the published site renders **Aman's exact colour palette regardless of the selected universe.** This is the same bug class as the previously-fixed "4 universes fell back to Aman's colours," except for colour specifically it is **9 of 10 universes, always** — colour was never wired into the per-universe system introduced in PR #75.

---

## (1) Hero capabilities

| Hero type | Builder control | Persisted as | Published-site render | Status |
|---|---|---|---|---|
| Static image | `WSContentTab.jsx:106`, `ContentTab.jsx:74-75` | `weddingDetails.coverPhoto` | `WeddingHomePage.jsx:14` (`background-image` when no video file) | **WORKING** — overlaid text uses `typography.headingFont/headingWeight/headingStyle/bodyFont` (`:47-73`) and `universeConfig?.motion?.duration` for the reveal (`:37,78`). |
| "Video" hero | `WSContentTab.jsx:105` (Hero Video URL, YouTube/Vimeo placeholder), `ContentTab.jsx:69-70` | `weddingDetails.heroVideoUrl` | **Never read.** `WeddingHomePage.jsx:14` checks `weddingDetails.heroVideoFile` — a field never written anywhere in the codebase. Even name-matched, a YouTube/Vimeo URL as a CSS `background-image` wouldn't render as video — no `<video>`/`<iframe>` embed exists in the file. | **BUILT-BUT-BROKEN.** Persists, looks functional in the form, zero effect on any render. |
| Hero visual effect (Parallax / Zoom Out / Static) | `HERO_EFFECT_OPTIONS` (`websiteThemes.js:408-412`), via `WBRightPanel.jsx:225` (live) and `WSDesignTab.jsx:138` (dead duplicate) | `weddingDetails.heroEffect` | **Never read anywhere** — zero occurrences in any guest-website render file. | **BUILT-BUT-BROKEN / dead control.** |
| Text-overlay hero (custom draggable/positioned text) | **Not found** — no component/prop/field matching `textOverlay`/`overlayText`/`heroOverlay` anywhere under `src/components/website-builder/`, `src/components/website-editor/`, or `StudioWebsite.jsx`. | — | — | **MISSING.** |

**Additional bug:** the builder's own full-screen preview (`WBWebsitePreview.jsx:42,50`) checks `hasBg = details.coverPhoto || details.heroVideoUrl` (line 42, both fields), but the actual background at line 50 unconditionally uses `` `url(${details.coverPhoto}) center/cover no-repeat` `` — a couple who only set a Hero Video URL sees `hasBg === true` but a broken `url(undefined)` in preview.

**Dead builder files:** `WSContentTab.jsx` / `WSDesignTab.jsx` / `WSSettingsTab.jsx` are not imported anywhere outside their own directory (repo-wide grep, zero external references) — superseded by the live, routed `StudioWebsite.jsx` → `WBRightPanel.jsx` → `WBWebsitePreview.jsx` (via `FullScreenPreview.jsx`, `StudioWebsite.jsx:618`) path. The dead files still contain a live-looking duplicate of the hero-effect control, which is a trap for future edits (see §4).

---

## (2) Universe style coverage

`resolveTypography`/`resolveTexture`/`resolveMotion` (`src/lib/universeStyling.js:31-82`) key off `UNIVERSE_CONFIGS[normalizeUniverseKey(activeUniverse)]` (`websiteThemes.js:585-589`). **`UNIVERSE_CONFIGS` (`:464-578`) has no colour field at all** — only `typography`, `texture`, `motion`, and (Aman only) `pageTransition`. No `resolveColors()`/`resolvePalette()` exists anywhere.

| Universe | Heading font | Body font | Colour palette | Texture | Motion (duration/yOffset) |
|---|---|---|---|---|---|
| aman | Cormorant Garamond ✅ | Jost ✅ | **✅ PASS** (only universe with a matching `WEBSITE_THEMES` entry) | grain/0.025 ✅ | 0.75/18 ✅ |
| tulum | Fraunces ✅ | Karla ✅ | **❌ FALLS BACK TO AMAN** | canvas/0.02 (`:495`) | 0.7/16 (`:496`) — duplicate w/ paris, capetown |
| kyoto | Shippori Mincho ✅ canonical (builder preview shows wrong "Noto Serif JP" — see below) | Zen Kaku Gothic New ✅ | **❌ FALLS BACK TO AMAN** | paper/0.02 (`:505`) | 0.6/12 (`:506`) — unique |
| capri | Italiana ✅ | Poppins ✅ | **❌ FALLS BACK TO AMAN** | linen/0.015 (`:515`) | 0.65/16 (`:516`) |
| marrakech | Marcellus ✅ | Nunito Sans ✅ | **❌ FALLS BACK TO AMAN** | plaster/0.03 (`:525`) | 0.75/20 (`:526`) — unique |
| brooklyn | Bebas Neue ✅ | IBM Plex Sans ✅ | **❌ FALLS BACK TO AMAN** | grain/0.035 (`:535`) — same type as aman, distinct opacity | 0.5/14 (`:536`) — unique |
| bali | Prata ✅ | Mulish ✅ | **❌ FALLS BACK TO AMAN** | canvas/0.02 (`:545`) — **identical to tulum** | 0.8/18 (`:546`) — unique |
| paris | Playfair Display ✅ | Lato ✅ | **❌ FALLS BACK TO AMAN** | linen/0.02 (`:555`) | 0.7/16 (`:556`) — duplicate w/ tulum, capetown |
| capetown | Bitter ✅ | Josefin Sans ✅ | **❌ FALLS BACK TO AMAN** | paper/0.025 (`:565`) | 0.7/16 (`:566`) — duplicate w/ tulum, paris |
| mykonos | Cinzel ✅ | Montserrat ✅ | **❌ FALLS BACK TO AMAN** | plaster/0.02 (`:575`) | 0.65/14 (`:576`) — unique |

**Summary:**
- **Typography: PASS for all 10** — 10 genuinely distinct heading/body pairs.
- **Texture: PASS for 9, one true duplicate** — tulum/bali share `canvas`/`0.02` exactly (`:495,545`).
- **Motion: PASS for 7, one 3-way duplicate** — tulum/paris/capetown all resolve to `duration:0.7, yOffset:16` exactly (`:496,556,566`).
- **`pageTransition` exists only for `aman`** (`:483-486`). The other 9 fall through to `weddingDetails.pageTransition` (a generic, non-universe setting) or `'fade'` (`MultiPageWeddingWebsite.jsx:261,269`) — **9 of 10 universes have no universe-specific page-transition distinctiveness.**
- **Colour palette: FAIL for all 9 non-Aman universes** (see cross-cutting finding above).

**Builder/publish typography parity bug** — `StudioWebsite.jsx:787-788`:
```js
const effectiveHf = typo?.fontDisplay || universeTheme?.fontDisplay || '"Plus Jakarta Sans", sans-serif';
const effectiveBf = typo?.fontBody || universeTheme?.fontBody || '"Plus Jakarta Sans", sans-serif';
```
`typo` (from `resolveTypography(details)`, line 338) returns `{headingFont, bodyFont, ...}` — **no `fontDisplay`/`fontBody` key exists on it.** So `typo?.fontDisplay` is always `undefined`, and both lines **always** fall through to the second, divergent `universeTheme` object (`StudioWebsite.jsx:32-131`) — despite `StudioWebsite.jsx:334-337`'s comment explicitly claiming preview matches publish exactly. Confirmed divergent for Kyoto: builder preview shows `"Noto Serif JP"` (`:63`) vs. published `"Shippori Mincho"` (`websiteThemes.js:501`) for the identical record.

---

## (3) Feature adaptation

All "ADAPTS" ratings below are capped by the §2 colour-fallback bug — even a page that adapts typography/texture/motion per universe still gets Aman's colours for 9/10 universes.

| Feature | File | Rating | Evidence |
|---|---|---|---|
| Styling questionnaire | `WeddingStylePage.jsx:110` → `AIStyleQuestionnaire`/`RulesBasedStyleQuestionnaire` | **ADAPTS** | Receives `theme`/`typography` (`:117,133-136,219-285`); does **not** receive `universeConfig` — no texture/motion calibration. |
| Accommodation | `WeddingStayPage.jsx:6` | **ADAPTS** | Full prop set: `{weddingDetails, theme, typography, universeConfig}`. |
| Transport | `WeddingTransportPage.jsx:24` | **ADAPTS** | Full prop set. |
| Experience guide | `WeddingExperiencePage.jsx:25` | **ADAPTS** | Full prop set. |
| RSVP (in-site page inside the multi-page site) | `WeddingRSVPPage.jsx:9` | **ADAPTS** | Full prop set; also uses `isMotionEnabled` (`:4`). |
| **RSVP (the actual `/rsvp/:token` link guests click)** | `src/components/rsvp/RSVPPage.jsx:171` | **IGNORES-UNIVERSE — most severe finding** | Takes **zero props** — cannot receive theme/typography/universeConfig. Routed standalone (`App.jsx:158`), entirely outside `MultiPageWeddingWebsite.jsx`'s render tree. Every style is a hardcoded literal: `fontFamily: "'Plus Jakarta Sans', Helvetica, Arial, sans-serif"` (`:13`), `background: '#FAFAFA'` (`:18,375,385`), `color: '#0A0A0A'` (`:20,28,51...`), accent `'#E03553'` (`:25,64,66,112-114,133` — this is the **OpenInvite dashboard's own brand red**, not a wedding colour). This is the actual page this session's `rsvp-submit.js`/`rsvp-lookup.js` work powers — a guest RSVPing to a Kyoto wedding sees the same red/black/off-white OpenInvite-branded form as any other wedding. |
| Guestbook | `WeddingGuestbookPage.jsx:22` | **ADAPTS** | Full prop set, including the inner `GuestbookCard` (`:9`). |
| Polls | `WeddingPollsPage.jsx:288` | **PARTIALLY** | `{weddingDetails, theme, typography}` — **no `universeConfig`** (confirmed zero occurrences). Adapts font/colour, missing universe-specific texture/motion. |
| Schedule/itinerary ("Celebration") | `WeddingCelebrationPage.jsx:12` | **ADAPTS** | Full prop set; contains day-schedule/itinerary rendering (`:18,201-209`). |
| Registry | `WeddingRegistryPage.jsx:6` | **ADAPTS** | Full prop set. |
| Our story / photos | `WeddingOurStoryPage.jsx:5`, `WeddingPhotosPage.jsx:6` | **ADAPTS** (both) | Full prop set. |
| *(bonus, not originally requested)* FAQ / Music | `WeddingFAQPage.jsx:7`, `WeddingMusicPage.jsx:5` | **ADAPTS** | Full prop set. |

**Pattern:** of 12 guest-facing components checked, 10 correctly receive the full theming contract, 1 (Polls) is missing only `universeConfig`, and 1 — the real RSVP submission page, arguably the single most important guest surface on the site — is entirely disconnected from theming.

---

## (4) Overlays & controls

| Control | Set in builder | Read on published site | Status |
|---|---|---|---|
| `enabledPages` (per-page nav visibility) | `WBLeftPanel.jsx:96,101,108` | `MultiPageWeddingWebsite.jsx:162,219,242` | **WIRED / WORKING** |
| `pageSections` (per-page section list/order) | `StudioWebsite.jsx:328` | `MultiPageWeddingWebsite.jsx:275` | **WIRED / WORKING** |
| `heroEffect` (Parallax/Zoom Out/Static) | `WBRightPanel.jsx:225` (live) + `WSDesignTab.jsx:138` (dead duplicate) | Never read | **DEAD CONTROL** |
| `heroVideoUrl` | `WSContentTab.jsx:105`, `ContentTab.jsx:69-70` | Never read (published site reads the never-written `heroVideoFile` instead) | **DEAD CONTROL** |
| Text-overlay editor | Not found | N/A | **DOES NOT EXIST** |
| `activeUniverse` | `UniverseStudio.jsx:43` | Drives typography/texture/motion only | **PARTIALLY WIRED** — never drives colour |
| `activeTheme` | No live call site found setting it (only default-state initializers, e.g. `StudioWebsite.jsx:176: activeTheme: 'still'`) | `MultiPageWeddingWebsite.jsx:160` | **VESTIGIAL** — nothing in the current UI lets a couple change it away from its default, which is exactly why every universe silently inherits Aman's/`'still'`'s legacy colours |

**Possible second duplicate control** (unconfirmed, flagged for follow-up): `WSPagesTab.jsx` also writes `enabledPages` (lines 25, 35) — same duplication pattern as `heroEffect`'s WS*/WB* split. Only `WBLeftPanel.jsx` was confirmed as the live writer; whether `WSPagesTab.jsx` is fully dead or reachable from some other path wasn't verified in this pass.

---

## (5) WithJoy gap (punch list, general knowledge — not verified against withjoy.com)

- **Video hero** — confirmed broken (§1); a real gap vs. a builder where this is typically a signature, working feature.
- **Text-overlay/customizable hero layouts** — confirmed missing entirely (§1).
- **True per-universe colour distinctiveness** — confirmed broken for 9/10 universes (§2); likely the single biggest visible gap, since colour is usually the most immediately perceptible "theme" signal to a guest.
- **Wedding party bios (published, guest-facing)** — no dedicated page found among the 14 published guest-site pages; `src/pages/WeddingParty.jsx` exists but is a couple-side dashboard page, not guest-facing.
- **Live-stream (published guest-facing page)** — a `LiveStream` entity and conditional nav flags exist (`MultiPageWeddingWebsite.jsx:224`), but no dedicated published-site livestream page exists in `PAGE_COMPONENTS` (`:67-82`) or `WEDDING_PAGES`.
- **Guest photo uploads vs. couple-curated-only** — `WeddingPhotosPage.jsx` exists and adapts to the universe; whether it supports guest uploads (vs. couple-only curation) wasn't confirmed in this pass.
- **Hotel/accommodation block depth** (room-block codes, multiple properties) — `WeddingStayPage.jsx` exists and adapts; feature-completeness not deep-audited here.
- **Custom domain** — not investigated in this pass.

---

## Investigation limits

- Did not fully audit every remaining page's internals (FAQ, Music) beyond confirming their prop signatures, or `WBSectionRenderer.jsx`'s per-section-type styling (each section type inside `pageSections` may have its own further adaptation gaps not captured here).
- Did not confirm whether `WSPagesTab.jsx` is fully dead or reachable — flagged above as a follow-up.
- Did not access withjoy.com — §5 is general-knowledge-based only, per scope.

---

## Prioritised build plan

Ordered by severity/impact; each item scoped to one PR.

1. **Fix the real RSVP page's theme disconnect** (`src/components/rsvp/RSVPPage.jsx`). Wire it into the theming system (resolve the wedding + universe by token, same pattern as `rsvp-lookup.js`, and apply `theme`/`typography`/`universeConfig` instead of the hardcoded `#E03553`/`#0A0A0A`/`#FAFAFA`/Plus Jakarta Sans literals). Highest priority — it's the actual guest RSVP submission experience, currently 100% universe-blind.
2. **Wire real per-universe colour palettes.** Add a colour-token block to each entry in `UNIVERSE_CONFIGS` (`websiteThemes.js`), add a `resolveColors()`/`resolvePalette()` function to `universeStyling.js` mirroring `resolveTypography()`, and change `MultiPageWeddingWebsite.jsx:160`'s theme resolution to prefer the universe-resolved palette over the legacy `activeTheme`/`WEBSITE_THEMES` lookup (keeping `WEBSITE_THEMES` as a fallback only for weddings that predate universes, if any exist). This is the single biggest visible gap in the whole audit — 9/10 universes currently look colour-identical to Aman.
3. **Fix the builder-preview font resolution bug** (`StudioWebsite.jsx:787-788`) — `typo?.fontDisplay`/`typo?.fontBody` should read `typo?.headingFont`/`typo?.bodyFont` (the actual keys `resolveTypography()` returns), so the builder preview stops silently falling through to the separate, divergent `UNIVERSE_THEMES` object and actually matches what publishes.
4. **Fix or remove the video hero.** Either rename the read site to match the write site (`heroVideoFile` → `heroVideoUrl`) and add a real `<video>`/YouTube-`<iframe>` embed with universe-aware overlay text, or remove the builder control entirely until it can be built properly — a broken, persisted-but-invisible field is worse than no field.
5. **Wire or remove `heroEffect`.** Either implement the Parallax/Zoom Out/Static visual effect on the published hero (`WeddingHomePage.jsx`), or remove the dead control (and its dead `WSDesignTab.jsx` duplicate) so it stops looking functional to whoever edits this next.
6. **Add `universeConfig` to `WeddingPollsPage.jsx`.** Small, mechanical — bring it in line with the other 11 guest-facing pages that already receive the full theming prop contract.
7. **De-duplicate texture/motion collisions.** Recalibrate tulum vs. bali (currently identical texture) and tulum/paris/capetown (currently identical motion) so all 10 universes are texture- and motion-distinct, not just typography-distinct.
8. **Add per-universe `pageTransition` for the other 9 universes** (currently only `aman` has one in `UNIVERSE_CONFIGS`) — cheap, high-polish, matches the "distinct transition" part of the goal literally.
9. **Delete or gut the dead builder files** (`WSContentTab.jsx`, `WSDesignTab.jsx`, `WSSettingsTab.jsx`, and confirm/resolve the `WSPagesTab.jsx` question) so future edits can't be silently made to unreachable code again, as happened with `heroEffect` and the video hero.
10. **Fix `WBWebsitePreview.jsx`'s hero background bug** (`hasBg` checks both `coverPhoto`/`heroVideoUrl` at line 42, but the actual background at line 50 only ever uses `coverPhoto`) — small, but causes a visibly broken `url(undefined)` preview for anyone who sets only a hero video.
11. **Build the text-overlay hero editor.** Net-new feature — lowest urgency relative to fixing what's already broken, but the biggest single feature gap identified versus WithJoy-class builders.
12. **WithJoy-parity net-new pages** (published-site wedding-party bios, published-site livestream page) — net-new scope, after the above fixes land.
