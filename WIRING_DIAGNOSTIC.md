# Wiring Diagnostic — Phase 0

> Read-only audit. No code changes. All findings are evidence-based with file:line references.
> Produced as Phase 0 groundwork for UNIVERSE_ROADMAP.md (does not exist yet — create separately).

---

## 1. Builder Controls Audit

Every control in the builder right-panel and left-panel, classified by wiring status.

**Status codes**
- `CONNECTED` — writes a field AND that field is read by both builder preview and published site
- `WRITES-BUT-UNREAD(preview)` — field is saved and published site reads it, but builder preview does not show it
- `WRITES-BUT-NEVER-READ` — field is saved but never read anywhere
- `NEVER-WIRED` — UI element exists but writes nothing to DB
- `NO-UI` — feature exists in data/published site but has no builder control

| Control | UI location | Field written | Saved | Builder preview reads | Published site reads | Status |
|---------|------------|---------------|-------|-----------------------|----------------------|--------|
| Theme picker | WBRightPanel.jsx:156–180 | `activeTheme` | ✓ | ✓ WBWebsitePreview.jsx:826 | ✓ MultiPageWeddingWebsite.jsx:132 | **CONNECTED** |
| Typography picker | WBRightPanel.jsx:182–212 | `activeTypography` | ✓ | ✓ WBWebsitePreview.jsx:827 | ✓ MultiPageWeddingWebsite.jsx:133 | **CONNECTED** |
| Page enable/disable toggles | WBLeftPanel.jsx:91–96 | `enabledPages` | ✓ | ✓ nav visible in preview | ✓ MultiPageWeddingWebsite.jsx:134 | **CONNECTED** |
| Custom pages (create/delete) | WBLeftPanel.jsx:99–110 | `customPages` | ✓ | ✓ nav renders | ✓ published nav | **CONNECTED** |
| Section inline editor | WBWebsitePreview.jsx (click-to-edit) | `pageSections[page][]` | ✓ | ✓ | ✓ MultiPageWeddingWebsite.jsx:244–262 | **CONNECTED** |
| Page transition picker | WBRightPanel.jsx:214–219 | `pageTransition` | ✓ | ✗ no AnimatePresence in preview | ✓ MultiPageWeddingWebsite.jsx:229–230 | **WRITES-BUT-UNREAD(preview)** |
| Scroll animation picker | WBRightPanel.jsx:220–224 | `scrollAnimation` | ✓ | ✗ | ✗ never read anywhere | **WRITES-BUT-NEVER-READ** |
| Hero effect picker | WBRightPanel.jsx:225–227 | `heroEffect` | ✓ | ✗ | ✗ never read anywhere | **WRITES-BUT-NEVER-READ** |
| Universe "Change →" button | WBRightPanel.jsx:120–153 | nothing — navigates to `/studio/universe` | ✗ | n/a | n/a | **NEVER-WIRED** (navigation only) |
| Left-panel "Change →" design link | WBLeftPanel.jsx:242–246, 254–258 | nothing — navigates to `/studio/universe` | ✗ | n/a | n/a | **NEVER-WIRED** (navigation only) |
| Assets panel (10 items) | WBLeftPanel.jsx:267–295 | nothing — UI placeholder only | ✗ | ✗ | ✗ | **NEVER-WIRED** |
| Grain/texture opacity | (no builder UI) | n/a | n/a | n/a | ✓ WeddingHomePage.jsx:33 reads `universeConfig.texture.opacity` | **NO-UI** (code-defined per universe) |
| Section reveal motion | (no builder UI) | n/a | n/a | n/a | ✓ WeddingHomePage.jsx reads `universeConfig.motion.*` | **NO-UI** (code-defined per universe) |

### Critical gap: `activeUniverse` never written from builder

The published site resolves universe entirely from `weddingDetails.activeUniverse` (MultiPageWeddingWebsite.jsx:138–141). The field is also read inside StudioWebsite.jsx to derive the preview universe theme. However, **no path in WBRightPanel or WBLeftPanel writes `activeUniverse` to WeddingDetails**. The "Change →" buttons only navigate away to `/studio/universe`.

If UniverseSelectedChoice.jsx (at the `/studio/universe` route) writes `activeUniverse` via `base44.entities.WeddingDetails.update`, then the universe persists but is invisible inside the builder layout. If it does not write it, `activeUniverse` is always `null` and grain/motion never activate on the published site.

**Verification needed:** confirm that `src/components/studio/UniverseSelectedChoice.jsx` calls `WeddingDetails.update({ activeUniverse: ... })` and that the value survives a round-trip.

---

## 2. Left-Panel Pages ↔ Guest Suite Data Map

When a page has authored `pageSections`, MultiPageWeddingWebsite.jsx:248 skips the PageComponent entirely and renders sections instead. For the three data-heavy Guest Suite pages (stay, transport, experience), this means builder sections would silently override the admin-managed data.

| Page slug | PageComponent (fallback) | Guest Suite admin section | Key WeddingDetails fields consumed | Dynamic sections bypass admin data? |
|-----------|--------------------------|--------------------------|-------------------------------------|--------------------------------------|
| `home` | WeddingHomePage | — | `coupleNames`, `weddingDate`, `mainCeremony.*`, `activeUniverse` (for grain) | ✓ yes |
| `our-story` | WeddingOurStoryPage | — | couple / story fields | ✓ yes |
| `celebration` | WeddingCelebrationPage | Event Details | `mainCeremony.*`, `reception.*` | ✓ yes |
| `rsvp` | WeddingRSVPPage | Guests | RSVP entity (separate) | ✓ yes |
| `registry` | WeddingRegistryPage | — | registry fields | ✓ yes |
| `music` | WeddingMusicPage | — | `music.*` | ✓ yes |
| `photos` | WeddingPhotosPage | — | photos fields | ✓ yes |
| `styling` | WeddingStylePage | — | styling fields | ✓ yes |
| `polls` | WeddingPollsPage | — | polls fields | ✓ yes |
| `faq` | WeddingFAQPage | Guest Suite → Q&A | `qna` | ✓ yes |
| `stay` | WeddingStayPage | Guest Suite → Accommodation | `guestSuiteAccommodation.places[]` | ⚠️ **YES — sections would hide admin-managed accommodation data** |
| `transport` | WeddingTransportPage | Guest Suite → Transport | `guestSuiteTransport.{places[], notes[]}` | ⚠️ **YES — sections would hide admin-managed transport data** |
| `experience` | WeddingExperiencePage | Guest Suite → Experience Guide | `experienceGuide.*` | ⚠️ **YES — sections would hide admin-managed guide data** |

The three flagged rows are the risk: a couple who fills in the Guest Suite accommodation/transport/experience forms would see their data disappear on the published site if someone also adds even one section to that page in the builder. There is currently no guard, warning, or conflict resolution for this.

---

## 3. Transitions / Motion System Analysis

### Page transitions

- **Control:** pill group in WBRightPanel.jsx:214–219, options from `TRANSITION_OPTIONS` (websiteThemes.js)
- **Options:** `fade` (default), `slide`, `reveal`, `dissolve`
- **Written to:** `weddingDetails.pageTransition`
- **Published site:** MultiPageWeddingWebsite.jsx:229–230 reads `universeConfig?.pageTransition?.type ?? weddingDetails.pageTransition ?? 'fade'`, universe config takes priority. Aman overrides with `fade` at 0.65s.
- **Builder preview:** not applied — WBWebsitePreview.jsx has no AnimatePresence wrapper, so users cannot preview transitions before publishing.
- **Conclusion:** saves and publishes correctly; preview gap only.

### Scroll animation (dead field)

- **Control:** pill group in WBRightPanel.jsx:220–224, options `none` / `subtle` (default) / `dramatic`
- **Written to:** `weddingDetails.scrollAnimation`
- **Read by:** nothing. Grep across all src files returns zero consumers.
- **Conclusion:** fully dead. UI misleads users.

### Hero effect (dead field)

- **Control:** pill group in WBRightPanel.jsx:225–227, options `parallax` / `zoomout` / `static` (default)
- **Written to:** `weddingDetails.heroEffect`
- **Read by:** nothing. Zero consumers in src.
- **Conclusion:** fully dead. UI misleads users.

### Universe grain (texture)

- **Config:** `UNIVERSE_CONFIGS.aman.texture = { type: 'grain', opacity: 0.08 }` (websiteThemes.js:457–460)
- **Render path:** WeddingHomePage.jsx:33 renders `<GrainOverlay opacity={universeConfig.texture.opacity} />` when `universeConfig?.texture` is truthy
- **GrainOverlay:** GrainOverlay.jsx:26 — default prop `opacity = 0.04`, uses `var(--universe-grain-opacity, ${opacity})` for CSS-var override
- **CSS var set at:** MultiPageWeddingWebsite.jsx:177 sets `--universe-grain-opacity: universeConfig?.texture?.opacity` on `.wb-guest-root`
- **Scoped to:** Aman only — all other universe configs are undefined, so `universeConfig` is `null`, grain never renders for them
- **No user control.** Opacity is code-defined per universe.

### Universe section reveal (motion)

- **Config:** `UNIVERSE_CONFIGS.aman.motion = { sectionReveal: 'fade', duration: 0.75, yOffset: 18, ease: 'easeOut', intensity: 'subtle' }` (websiteThemes.js:461–468)
- **Read by:** WeddingHomePage.jsx — framer-motion `motion.div` with duration and yOffset from `universeConfig.motion`
- **No user control.** Values are code-defined per universe.
- **Not wired into WBSectionRenderer:** MultiPageWeddingWebsite.jsx:257 passes `universeTheme={null}` to `WBSectionRenderer`, so dynamically authored sections never receive universe motion.

### Motion system summary

| Animation | User control | Saved | Preview | Published | Status |
|-----------|-------------|-------|---------|-----------|--------|
| Page transition | ✓ WBRightPanel | ✓ | ✗ | ✓ | Working, no preview |
| Scroll animation | ✓ WBRightPanel | ✓ | ✗ | ✗ | Dead field |
| Hero effect | ✓ WBRightPanel | ✓ | ✗ | ✗ | Dead field |
| Grain opacity | ✗ | ✗ (code-const) | ✗ | ✓ (Aman only) | No UI |
| Section reveal | ✗ | ✗ (code-const) | ✗ | ✓ (Aman only) | No UI |
| Section reveal (dynamic sections) | ✗ | ✗ | ✗ | ✗ | Disconnected even for Aman |

---

## 4. Duplication Scan

### Parallel tab component sets

Two complete sets of design/content/pages/settings tabs exist side by side:

**`src/components/studio/`** — older or alternative studio shell
- `StudioDesignTab.jsx` — theme picker (reads `wedding.activeTheme || wedding.websiteTheme`), typo picker, animation pills, light-background style
- `StudioContentTab.jsx`
- `StudioPagesTab.jsx`
- `StudioSettingsTab.jsx`

**`src/components/website-builder/`** — current builder shell (used by StudioWebsite.jsx)
- `WSDesignTab.jsx` — theme picker (reads `details.activeTheme`), typo picker, animation pills, dark inset style
- `WSContentTab.jsx`
- `WSPagesTab.jsx`
- `WSSettingsTab.jsx`

Key difference: `StudioDesignTab.jsx:42` reads a legacy `websiteTheme` alias (`wedding.activeTheme || wedding.websiteTheme`) that does not appear in the current `DEFAULT` object in StudioWebsite.jsx. This suggests the Studio* tabs are from a prior design iteration. If any route still renders them, they write to the same `activeTheme` field as the WS* tabs — no data conflict, but two UIs for the same thing.

**Risk:** if `/studio/universe` or another studio route renders `StudioDesignTab`, changes there write `activeTheme` / `activeTypography` without going through the builder's `detailsRef` / `setDetailsAndMark()` pipeline, meaning the builder's unsaved-changes state won't track them.

### Double Design surface in builder

The builder has two places showing design state simultaneously:

1. **WBLeftPanel.jsx:234–259** — Design section: shows active theme name and typo name (read-only), two "Change →" links that navigate to `/studio/universe`
2. **WBRightPanel.jsx Design tab** — full inline theme picker, typo picker, three animation pill groups

The left panel Design section is purely informational. Interactions (picking themes) happen only in the right panel. This is an asymmetry — left panel implies the design state belongs there but clicking takes you completely out of the builder.

### Universe picker appears in three places

1. WBRightPanel.jsx:120–153 — universe preview block + "Change →" navigates to `/studio/universe`
2. WBLeftPanel.jsx:234–246 — theme/typo names + "Change →" navigates to `/studio/universe`
3. `/studio/universe` route — `src/components/studio/UniverseSelectedChoice.jsx` etc. — the actual selection UI

None of the three writes directly in-panel. The universe choice lives outside the builder layout.

### `pageSections` bypass for data-driven pages

Documented in Section 2 above. Three Guest Suite pages (stay, transport, experience) serve data-driven content from WeddingDetails sub-objects. If a user authors even one dynamic section on these pages, the `pageSections[page].length > 0` check at MultiPageWeddingWebsite.jsx:248 silently bypasses the entire data-driven PageComponent. No warning, no fallback merge.

---

## Open questions for UNIVERSE_ROADMAP.md

1. Does `UniverseSelectedChoice.jsx` actually persist `activeUniverse` to WeddingDetails? If not, Aman grain/motion never activate even for users who selected Aman.
2. Should `scrollAnimation` and `heroEffect` be implemented or removed from the builder UI?
3. Should the section reveal motion (`UNIVERSE_CONFIGS.aman.motion`) be wired into `WBSectionRenderer` for dynamic sections?
4. What is the intended relationship between `StudioDesignTab` and `WSDesignTab`? Which one should survive?
5. Should there be a conflict warning when a user authors sections on stay/transport/experience pages that would hide their Guest Suite data?
