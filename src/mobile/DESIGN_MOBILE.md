# Openinvite mobile design

Mobile exception. The Openinvite desktop product is sharp: no border-radius on cards, no shadows. The mobile app in `src/mobile/` is deliberately different. Phones, iOS sheets, widgets and notifications are all rounded, and square blocks fight the hardware. Inside `.oi-mobile-root` only, cards and images are rounded and floating elements have one soft elevation. Do not apply these rules outside `src/mobile/`, and do not 'fix' rounded corners inside it.

## The feel

Reference points: Nespresso, Airbnb, Qantas and the other major airline apps, Apple's own apps. What they share, and what this app takes: big imagery, generous rounded cards, one confident title per screen, circular icon buttons top right, color panels for emphasis, peeking carousels, very little text per card, smooth small motion, and a tab bar that feels like part of the phone.

The app should feel photographic, not like a settings screen. A screen with no photo on it should be a form or a dense list, and nothing else.

## Tokens

All scoped under `.oi-mobile-root` as CSS custom properties in `src/mobile/styles/mobile.css`. Nothing here is global.

**Radius**

| Token | Value | Used for |
|---|---|---|
| `--m-r-card` | 20px | cards, panels, row groups, the notification banner |
| `--m-r-image` | 16px | images, tiles, the guest suite preview frame |
| `--m-r-input` | 14px | inputs, selects, textareas |
| `--m-r-sheet` | 28px | bottom sheets, top corners only |
| `--m-r-pill` | 999px | pills, buttons, filter chips, status badges |
| circular | 50% | icon buttons, icon tiles, avatars, the Ava button, tab bar |

**Elevation**

None on cards. Cards separate from the page by color and spacing. One token, `--m-elev: 0 8px 24px rgba(0,0,0,0.08)`, used only for floating things: the tab bar, the Ava button, the in-app notification banner, bottom sheets. Nothing else may carry a `box-shadow`.

**Color**

Every value is one DESIGN_SPEC.md defines: the brand red, the black, white, the spec's greys, and one alpha tint of the red. Nothing warm. No brown, cream, beige, sand, wine or warm grey, in tokens, fixtures, mocks or inline styles; the tone names `wine`, `sand` and `blush` were removed with the colors on 2026-09-21 and must not be reintroduced under any name. Panels do not borrow from the couple's universe palette; that is the guest site's design, not the app's.

| Token | Value | Role |
|---|---|---|
| `--m-bg` | #F7F7F7 | page (the spec's panel grey) |
| `--m-card` | #FFFFFF | card |
| `--m-text` | #0A0A0A | primary text |
| `--m-text-2` | #444444 | secondary text, the lightest allowed on a light surface |
| `--m-line` | rgba(10,10,10,0.08) | hairline dividers, card borders (the spec's border) |
| `--m-press` | rgba(10,10,10,0.08) | pressed state |
| `--m-primary` | #E03553 | flat, sparingly: primary buttons, active tab, progress fill, key numbers, unread dot |
| `--m-primary-soft`, `--m-tint` | rgba(224,53,83,0.1) | the one light tint: a tinted icon tile, a light emphasis panel |
| `--m-ink` | #0A0A0A | dark emphasis panel (Ava, the dark stat, a due payment) |
| `--m-neutral` | #F7F7F7 | a neutral icon tile or image placeholder inside a white card |

Panel and tile tones are `ink`, `neutral` and `tint`. A `neutral` panel or photo-less feature tile sits on the page grey, so it renders as a white card with the hairline rather than a fill. Text on a dark panel is `--m-on-dark`; nothing is hard-paired.

The three status pairs (`--m-ok`, `--m-warn`, `--m-no` with their backgrounds) are the dashboard guest list's own attending, awaiting and declined colors, kept for the same meanings and nothing else.

No gradients, with one exception: a bottom-up dark scrim over photos so white text stays readable (`--m-scrim`).

**Type**

Plus Jakarta Sans only. Headings weight 600, never heavier. Size contrast does the work, not weight. Figures are the font's default proportional set everywhere: no `font-variant-numeric: tabular-nums` and no `font-feature-settings` on any number. Plus Jakarta Sans's tabular figures are different glyphs (a footed 1, a narrowed 0) and read as a second font. If a true column of figures ever needs aligning, align the column, not the digits.

The scale is small and calm (goal 4, after the owner's phone test; the references are the Qantas and Nespresso apps). Nothing in `src/mobile/` declares a size above it.

| Class | Size / line | Use |
|---|---|---|
| `.oi-m-title` | 28 / 34 | the one screen title |
| `.oi-m-daily__greeting`, `.oi-m-daily__line`, `.oi-m-daily__date` | 40 / 46, 20 / 28, 13 / 18 | the daily update only (goal 6): the one screen allowed above the scale, bold on purpose; the dashboard after it is calm |
| `.oi-m-hero-num` | 44 / 48 (34 / 38 when long) | days to go, totals |
| `.oi-m-num`, `.oi-m-stat__num` | 28 / 34 | stat numbers |
| `.oi-m-section`, `.oi-m-grouped__title`, sheet titles | 17 / 22 | section headings above rows and tiles |
| `.oi-m-tile__name`, `.oi-m-imgcard__title`, `.oi-m-item__title`, `.oi-m-banner__title` | 15 / 20, weight 600 | tile and card titles |
| root, `.oi-m-body`, `.oi-m-row__label`, `.oi-m-pill`, `.oi-m-bubble` | 15 / 22 | body, row labels, buttons |
| `.oi-m-meta`, `.oi-m-row__sub`, `.oi-m-row__value`, `.oi-m-hero__label`, `.oi-m-field__label`, `.oi-m-filter` | 13 / 18 | secondary lines, captions, labels |
| `.oi-m-status` | 12 / 16 | status pills |
| inputs | 16 / 24 | never smaller, so iOS does not zoom |

Tiles and image cards show their title only. No subtitle, stat or secondary line on a tile or an image card anywhere; `FeatureTile` and `ImageCard` ignore one if passed. Live figures belong only where they are the point of the card: stat cards, the RSVP and budget snapshots.

**Spacing**

8px grid. Side gutter 20px (`--m-gutter`). 40px between sections (`.oi-m-stack--24`, `.oi-m-grouped`), 12px between a section heading and its content. 12px between cards in a row or grid, 8px between rows in a group. Card padding 16px, hero card padding 20px. Minimum tap target 44px. Nothing should feel packed: where a screen still feels busy after the scale, remove or combine elements rather than shrinking further.

## Still locked, from the product rules

Sentence case everywhere, including badges and tab labels. Lucide icons only. No emoji; the ✦ mark is for Ava alone. Text never lighter than #444444 on a light surface. No hype language, no exclamation marks, no em dashes, no bullet points in UI copy. Copy is plain, warm and specific.

## Components

| Component | What it is |
|---|---|
| `TabBar` | A floating frosted-glass pill (goal 6): inset 12px from the sides and above the home indicator, fully rounded, white at 70 percent over `backdrop-filter: blur(24px) saturate(180%)`, a hairline white inner border at 40 percent, the elevation token; content scrolls visibly underneath. Solid white where `backdrop-filter` is unsupported or Reduce Transparency is on. The compact top bar that appears on scroll wears the same glass. Active tab: icon and label in primary, a small spring on select. |
| `ScreenHeader` / `Screen` | Large title left, up to two circular 44px white icon buttons right. On tab roots the rightmost is always the notifications bell with an unread dot. Collapses to a compact blurred bar past 48px of scroll. |
| `HeroCard` | Full width, 4:5, photo with scrim, small label, big title or number, one pill button. Sits in `HeroCarousel` with dot pagination. |
| `ImageCard` | Photo on top (16px), title, one line, optional sentence-case badge. For peek carousels and two-column grids. |
| `FeatureTile` | Plan hub tile: photo or color panel with a Lucide icon, the feature name, one live stat. |
| `StatCard` | Half-width card: circular icon, label, big number. Used in pairs. |
| `PanelCard` | A color panel for emphasis: Ava's briefing, a due payment. |
| `ItemCard` / `ItemList` | The browsable list pattern: one rounded card per item. See "Lists". |
| `Row` / `RowGroup` / `GroupedList` / `SwipeRow` | The scannable list pattern: rows in a rounded card with hairline dividers, sticky headers, optional swipe actions. See "Lists". |
| `BottomSheet` | 28px top corners, grab handle, spring open and close, scrim. Full-height variant for Ava. |
| `SmartImage` | Cloudinary delivery with `f_auto,q_auto,c_fill,g_auto` at 2x and 3x, fixed aspect ratio, tinted placeholder, lazy below the fold, alt text always. Never a broken box: falls back to a color panel. |
| `PillButton`, `FilterPills`, `ProgressBar`, `EmptyState`, `ErrorState`, `Skeleton`, `SearchScreen`, form fields | As in v0, restyled to the tokens. |
| `Banner` | The in-app notification: a rounded card that drops from the top with the elevation token, stays four seconds, swipes away, opens on tap. |

## Lists

Two patterns, chosen by a rule, never mixed within one list.

**Item cards** (`ItemCard` in `ItemList`, each item its own rounded card with a 12px gap): for lists that are browsed. Anatomy: a 72px rounded thumbnail or color tile on the left, title, one meta line, a key value (amount, date or status) bottom left, and one trailing circular action on the right edge where one makes sense (call, pay, add). The whole card taps through. Used for vendors, registry items, payments due, tasks and payments in "Next up", seating tables, accommodation and transport places, experience guide entries, polls, timeline moments, the wedding party, marketplace results.

**Grouped rows** (`GroupedList` of `Row`s, many rows in one rounded card with hairline dividers and sticky section headers): for lists that are long, text-led, and scanned or searched. Used for guests, budget line items inside a category, the full checklist inside each group, the messages list, the notification center, song requests, the playlist, settings and account.

**The rule of thumb:** more than about 25 items, or no image and no inline action, means grouped rows. Otherwise item cards.

Grouped rows can swipe left to reveal an action where an existing mutation supports it (`SwipeRow`): complete a task, mark a message read, remove with a confirm. Vendors and the registry carry a circular view toggle beside search that swaps item cards for a two-column image grid; the choice is remembered on the device. Every list keeps its skeleton, empty and error states, and gets pull to refresh.

## Motion

Transform and opacity only. `prefers-reduced-motion` removes movement and keeps fades.

- Press: every tappable card and button scales to 0.98 and back, 120ms (`.oi-m-press`).
- Screen entry: content fades up 8px, staggered 40ms per block, 240ms each (`.oi-m-stagger > *`).
- Hero numbers count up once on first view (`useCountUp`). Progress bars animate to their value.
- Carousels snap. Light haptic on tab change, task completion, toggles and pull to refresh when native.
- Springs are CSS: `cubic-bezier(0.34, 1.4, 0.64, 1)` on the tab indicator and sheets. No new animation library; framer-motion is a repo dependency but the shell does not need it.

## Imagery

Order of preference: the couple's own imagery (cover photo, guest suite photo blocks, Our Story photos, moodboard pins, the guest suite gallery), then the standard `app/` photos, then a color panel. A slot never shows a broken or empty box. The Home hero carousel and the daily update wear the couple's own photos (goal 6); everything below the hero keeps the `app/` photos chosen for it. In the preview the demo couple's photos are the fixture stand-ins in `images.ts`, used nowhere else.

Stills only, on every photo (goal 6): no zoom, no parallax, no scale, no crossfade within a photo. Nothing derives motion from an image whose public id starts with `DTS_`.

Where images belong: the daily update (seven bundled photos, one per weekday; goal 7 removed the in-app splash and its pool, the native launch screen is the mark on ink and nothing else), Home hero carousel, Home "keep planning" carousel, Plan hub tiles, Guest suite tab preview, vendor and registry cards where the data has photos, empty states where a photo helps, the Account profile card. Where they do not: forms, dense lists, budget tables.

Every decorative slot is named once, in `src/mobile/images.ts`, with its public id, alt text, where it is drawn, the size to supply and a `todo` marker while it waits for a photo. `/m/preview/images` renders that file as a gallery. No decorative Cloudinary id lives anywhere else in `src/mobile/`.
