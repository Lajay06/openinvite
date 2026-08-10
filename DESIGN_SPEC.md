# Openinvite Design Specification

## Typography
- Font: Plus Jakarta Sans (already loaded via * selector in index.css)
- Base size: 16px (browser default)
- All text: sentence case only. No uppercase, no ALL CAPS anywhere.
- Headings: font-weight 700, letter-spacing -0.02em, color #0A0A0A
- Body: font-weight 400, color #0A0A0A
- Muted text: color rgba(10,10,10,0.6) — never #888888
- Labels/captions: font-size 11px, color rgba(10,10,10,0.6)
- Input placeholders/hint text: color rgba(10,10,10,0.58) — a touch
  lighter than muted text, still WCAG AA 4.5:1
- Disabled controls / purely decorative text: color rgba(10,10,10,0.3) —
  WCAG exempts disabled UI; never use on text a user must read
- Enabled icon-only controls (not disabled): color rgba(10,10,10,0.45) —
  WCAG 1.4.11 non-text contrast (3:1), distinct from disabled/decorative
  so an active icon button is never left below even that lenient floor
- Named tokens for all four live in src/styles/tokens.js
  (textMuted/textPlaceholder/textDisabled/iconMuted) — use these instead
  of hand-rolling a new alpha

## Colours
- Brand red/pink: #E03553
- Purple: #9333ea  
- Gradient (Ava, avatar): linear-gradient(135deg, #ec4899, #9333ea)
- Black (top bar): #0A0A0A
- White: #FFFFFF
- Border: rgba(10,10,10,0.08)
- Background: #FFFFFF (pages), #F7F7F7 (right panel)
- Muted background: rgba(10,10,10,0.03)

## Spacing
- Page content padding: 32px horizontal, 24px vertical
- Section gap: 24px
- Card inner padding: 20px
- Form field gap: 16px

## Border radius
- Default: 0px (sharp corners everywhere)
- Pills/badges: 999px
- Buttons: 999px (pill shape)
- Exception — onboarding/tips carousel cards (e.g. TipsModal): 16px. A
  deliberate, narrow exception for soft, welcoming first-run UI; does not
  apply to dashboard cards, which stay 0px.
- Exception — real product stills/video on the marketing site
  (ProductMediaFrame, src/components/shared/): 14px. A screen sitting in
  the page reads correctly with a slight radius; a flat 0px edge reads like
  a printed card, not a device. Scoped to real captured product media only
  (scripts/capture/) — never stock photography, never dashboard UI.

## Layout
- Top bar: fixed, full width, 48px height, background #0A0A0A, z-index 50
  Left: logo + wedding name/date/countdown
  Center: search pill (background rgba(255,255,255,0.1), border-radius 999px, width 220px)
  Right: bell icon + avatar dropdown
- Sidebar: fixed, left 0, top 48px, width 200px, background #FFFFFF
- No sub-header bar — DashboardPageHeader is the page-level header
- Content: margin-left 200px, padding-top 48px
- Right panel (dashboard only): width 35%, background #F7F7F7

## Components

### DashboardPageHeader
- Used on every dashboard page
- Padding: 10px 32px
- Title: font-size 18px, font-weight 600, color #0A0A0A
- Subtitle: font-size 12px, color rgba(10,10,10,0.6), inline beside title

### Buttons
- Primary: background #E03553, color white, border-radius 999px,
  padding 6px 14px, font-size 12px, font-weight 600
- Secondary: background rgba(10,10,10,0.08), border 1px solid rgba(10,10,10,0.12),
  color #0A0A0A, border-radius 999px, padding 6px 14px, font-size 12px
- Ava floating button: circle 44×44px, gradient bg linear-gradient(135deg,#ec4899,#9333ea),
  Sparkles icon 18px white, bottom 24px right 24px fixed, box-shadow 0 4px 12px rgba(147,51,234,0.3)
- Ava page button (AvaButton component): pill shape, gradient bg linear-gradient(135deg,#ec4899,#9333ea),
  padding 7px 14px, Sparkles icon 13px, font-size 12px font-weight 600, color white
  Position: after DashboardPageHeader, in div padding 16px 32px 0, align-self flex-start
  Triggers openAva custom event → opens the floating AvaChatPod in Layout

### Form inputs
- Underline style only: no box, border-bottom 1px solid rgba(10,10,10,0.15)
- On focus: border-bottom color #E03553
- Label: font-size 11px, font-weight 600, color rgba(10,10,10,0.6),
  letter-spacing 0.06em, sentence case
- Font-size: 14px, color #0A0A0A

### Cards
- Background: #FFFFFF
- Border: 1px solid rgba(10,10,10,0.08)
- Border-radius: 0px
- Padding: 20px
- No box-shadow

### Tabs
- Tab bar: border-bottom 1px solid rgba(10,10,10,0.08)
- Active tab: color #0A0A0A, font-weight 600, 
  border-bottom 2px solid #0A0A0A
- Inactive tab: color rgba(10,10,10,0.6), font-weight 400
- Tab label: font-size 13px, font-weight 600, sentence case — NO uppercase/text-transform
  (tabs.jsx TabsTrigger uses text-[13px] font-semibold, no uppercase class)

### Badges/Pills
- Border-radius: 999px
- Font-size: 10px, font-weight: 600, letter-spacing: 0.02em
- Padding: 2px 7px
- Status colours:
  Confirmed/complete: background #dcfce7, color #166534
  Pending: background #fef9c3, color #854d0e
  Declined/cancelled: background #fee2e2, color #991b1b
  Default: background rgba(10,10,10,0.06), color #0A0A0A

### Accordion
- All items collapsed by default (defaultValue={[]})
- Header: font-size 14px, font-weight 600
- Border: 1px solid rgba(10,10,10,0.08) between items

### Sidebar navigation
- Item font-size: 12px
- Item padding: 7px 12px
- Active item: background rgba(224,53,83,0.08), color #E03553,
  border-left 2px solid #E03553
- Section label: font-size 10px, letter-spacing 0.06em,
  color rgba(10,10,10,0.6), sentence case
- Icon size: 14px
- Design studio is a regular NavItem (Sparkles icon), not a special red pill

## Canonical dashboard page layout

Reference implementation: `src/pages/Budget.jsx`.

Every dashboard page must follow this exact top-to-bottom order — no exceptions:

1. `DashboardPageHeader` — title + subtitle
2. **Stat cards row** (if the page has stats) — full-width flex strip:
   `borderBottom: '1px solid rgba(10,10,10,0.08)'`
   Each cell: `flex: 1, padding: '24px 32px', minHeight: 80`
   Compute stats from the full dataset so the strip renders before any tabs.
3. **Ava + actions bar** — single `justify-between` flex row, always present:
   ```jsx
   <div style={{ padding: '16px 32px', display: 'flex', alignItems: 'center',
     justifyContent: 'space-between', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
     <AvaButton label="Ask Ava to …" onClick={…} />
     <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
       {/* action buttons */}
     </div>
   </div>
   ```
   If there are no action buttons on the page, the row still renders with just `AvaButton`
   and still carries `borderBottom`.
4. **Tabs row** (if the page has tabs) — `display: flex, borderBottom: '1px solid rgba(10,10,10,0.08)', padding: '0 32px'`
5. **Content area** — all data/lists/grids inside `div` with `padding: '32px 32px 48px'`

## Onboarding wizard

Reference implementation: `src/pages/Onboarding.jsx` + `src/components/onboarding/*`.

- The whole wizard is light — one page background (`#FFFFFF`) across every
  step, `welcome` through `completion`, including the `pathA-*` detail
  steps. There is no dark mode for the wizard chrome; the old per-step
  `theme`/`isDark` prop was removed, not just left at `'light'`.
- Text colours follow the same tokens as the dashboard: `#0A0A0A` primary,
  `rgba(10,10,10,0.6)` muted, `rgba(10,10,10,0.58)` placeholders,
  `rgba(10,10,10,0.18)` default borders.
- Universe picker tiles (`OnboardingStepUniverse.jsx`'s `UniverseGridTile`)
  ARE a deliberate dark-card exception — the one dark surface left in the
  wizard. They match the live marketing `/universes` page's own grid tile
  (`Universes.jsx`'s `UniverseTile`) byte-for-byte in visual language:
  full-bleed photo, a bottom gradient scrim, italic tagline, bold white
  name, hover-reveal `worldStory` + palette swatches, laid out 5 columns ×
  4 rows (`gap: 3`, forced `repeat(5, 1fr)` at desktop widths — not
  auto-fill). This reverses an earlier round's light-card treatment (see
  git history on this file for that reasoning); the owner call this time
  was that the picker is the couple's first real look at what a universe
  feels like, and a plain white thumbnail undersold it next to the actual
  product. Do not "fix" this back to a light card without checking with the
  owner first — it has flipped both ways once already. Every OTHER card in
  the wizard (`OnboardingStep4GuestCount`'s tiles, `OnboardingStep8Fork`'s
  cards, etc.) stays light — this is scoped to the universe grid only.
- The old "wedding website appearance" Dark/Light toggle on the universe
  step has been removed entirely (accept-pass round 2). It set
  `websiteMode` on the couple's *published wedding website* theme, but
  `resolveColors()` gives the selected universe's own colours unconditional
  priority over it (see `BASE44_PLATFORM_NOTES.md`), so the toggle never
  had any visible effect anywhere — it read as a dead control. `websiteMode`
  still defaults to `'dark'` and is still written to `WeddingDetails` on
  completion; only the picker UI is gone.
- The old "A"-in-a-circle quote-bubble avatar on the universe step's intro
  line is also gone — it was leftover chat-bubble branding from an earlier
  design. The intro is now a plain paragraph, same voice as every other
  step's subtext, no quotation marks.

## Full-bleed marketing photography

Every full-bleed photo behind text — `MarketingHero`, `MarketingEndCap`, and
the Universes closing CTA — is delivered through `responsivePhoto()` in
`src/lib/marketingImage.js`. Never hand-write a Cloudinary URL for one.

- `responsivePhoto(publicId, sourceWidth, { transform, croppedWidth })` returns
  `{ src, srcSet }`. `sourceWidth` is the master's real pixel width, read from
  `.../fl_getinfo/<publicId>.jpg` — never estimated. It caps the ladder at the
  real asset so a descriptor can never advertise pixels that do not exist.
- Ladder runs to **3840** (a 1920px viewport at dpr 2). It stops there
  deliberately: uncapped, a 4K display would pull the raw multi-megabyte
  original.
- Quality is per candidate width, not flat: `q_auto` below 2560 where the file
  can be painted near 1:1, `q_50` at 2560+ where it is only ever chosen by a
  display painting it at ≥2 device px per CSS px and artifacts land sub-pixel.
  Measured: more pixels at lower quality beats fewer pixels at higher quality
  (`q_50,w_3200` is sharper than `q_auto,w_2560` at the same byte count).
- **Crop by ratio, never by fixed pixels.** A `c_crop,w_1190` on a 1600px
  master throws away 26% of the resolution before the ladder ever sees it.
  Where a crop is only needed to reframe horizontally, use `objectPosition`
  instead — it costs no pixels and adapts per viewport.
- Judge sharpness as **delivered px ÷ (CSS box px × devicePixelRatio)**. 1.0 is
  correct; below ~0.7 reads as soft on a retina display. Note that
  `naturalWidth` is density-corrected for srcset images and will understate the
  real decode — measure with `createImageBitmap`, not `naturalWidth`.
- `npm run test:marketing-images` enforces both halves of this and must pass.

Known ceiling: only the Pricing and About heroes are print masters. The other
eleven full-bleed photos are 1280–1600px web exports and sit at 0.34–0.42x;
that is an asset limit, not a code one, and only a larger upload lifts it.

## Rules
- No text-transform: uppercase anywhere
- No box-shadow on cards
- No rounded corners except buttons, pills, badges
- Every dashboard page must use DashboardPageHeader
- All data fetched via base44.entities.* authenticated client
- Sentence case everywhere — headings, labels, tabs, buttons
- Muted text minimum contrast: rgba(10,10,10,0.6), never #888888
  (WCAG AA 4.5:1 against white; the previous 0.4 alpha only reached
  ~2.7:1 — AUDIT_2026-07.md S13, corrected across ~150 files + the
  src/styles/tokens.js textMuted token)
- The same fix for the undocumented 0.3 variant (AUDIT_2026-07.md S14)
  was role-aware, not a blanket bump — see the Typography section above
  and src/styles/tokens.js's textPlaceholder/textDisabled/iconMuted
  tokens for which value applies to which kind of text/control
