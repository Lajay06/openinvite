# Openinvite mobile design

Mobile exception. The Openinvite desktop product is sharp: no border-radius on cards, no shadows. The mobile app in `src/mobile/` is deliberately different. Phones, iOS sheets, widgets and notifications are all rounded, and square blocks fight the hardware. Inside `.oi-mobile-root` only, cards and images are rounded and floating elements have one soft elevation. Do not apply these rules outside `src/mobile/`, and do not 'fix' rounded corners inside it.

## The feel

Reference points: Nespresso, Airbnb, Qantas and the other major airline apps, Apple's own apps. What they share, and what this app takes: big imagery, generous rounded cards, one confident title per screen, circular icon buttons top right, colour panels for emphasis, peeking carousels, very little text per card, smooth small motion, and a tab bar that feels like part of the phone.

The app should feel photographic, not like a settings screen. A screen with no photo on it should be a form or a dense list, and nothing else.

## Tokens

All scoped under `.oi-mobile-root` as CSS custom properties in `src/mobile/styles/mobile.css`. Nothing here is global.

**Radius**

| Token | Value | Used for |
|---|---|---|
| `--m-r-card` | 20px | cards, panels, row groups, the notification banner |
| `--m-r-image` | 16px | images, tiles, the site preview frame |
| `--m-r-input` | 14px | inputs, selects, textareas |
| `--m-r-sheet` | 28px | bottom sheets, top corners only |
| `--m-r-pill` | 999px | pills, buttons, filter chips, status badges |
| circular | 50% | icon buttons, icon tiles, avatars, the Ava button, tab bar |

**Elevation**

None on cards. Cards separate from the page by colour and spacing. One token, `--m-elev: 0 8px 24px rgba(0,0,0,0.08)`, used only for floating things: the tab bar, the Ava button, the in-app notification banner, bottom sheets. Nothing else may carry a `box-shadow`.

**Colour**

| Token | Value | Role |
|---|---|---|
| `--m-bg` | #F5F5F4 | page |
| `--m-card` | #FFFFFF | card |
| `--m-text` | #1A1A1A | primary text |
| `--m-text-2` | #444444 | secondary text, the lightest allowed on a light surface |
| `--m-line` | #E7E5E4 | hairline dividers |
| `--m-primary` | #E03553 | flat, sparingly: primary buttons, active tab, progress fill, key numbers, unread dot |
| `--m-ink` | #1A1A1A | emphasis panel (Ava, the dark stat) |
| `--m-wine` | #3B1820 | emphasis panel (due payments, warnings) |
| `--m-blush` | #FBE9EC | emphasis panel, light |
| `--m-sand` | #EFE9E1 | emphasis panel, light |

Panels prefer the couple's universe palette when it exposes one (`getUniverse(id).colors.darkBg` for ink, `lightBg` for sand) and fall back to the tokens. Text on a panel is chosen by `readableOn()` from `src/lib/surfaceTint.js`, never hard-paired.

No gradients, with one exception: a bottom-up dark scrim over photos so white text stays readable (`--m-scrim`).

**Type**

Plus Jakarta Sans only. Headings weight 600, never heavier. Size contrast does the work, not weight.

| Class | Size / line | Use |
|---|---|---|
| `.oi-m-title` | 34 / 40 | the one screen title, and the greeting |
| `.oi-m-hero-num` | 56 / 56, tabular figures | days to go, totals |
| `.oi-m-section` | 22 / 28 | section titles |
| `.oi-m-body` | 16 / 24 | body, row labels, inputs |
| `.oi-m-meta` | 14 / 20 | secondary lines, captions |
| `.oi-m-status` | 12 / 16 | status pills |

**Spacing**

8px grid. Side gutter 16px. 24px between sections. 12px between cards in a row, 8px between rows in a group. Card padding 16px, hero card padding 20px. Minimum tap target 44px.

## Still locked, from the product rules

Sentence case everywhere, including badges and tab labels. Lucide icons only. No emoji; the ✦ mark is for Ava alone. Text never lighter than #444444 on a light surface. No hype language, no exclamation marks, no em dashes, no bullet points in UI copy. Copy is plain, warm and specific.

## Components

| Component | What it is |
|---|---|
| `TabBar` | A floating white pill, inset 12px from the sides and above the bottom safe area, backdrop blur, the elevation token. Active tab: icon and label in primary, a small spring on select. |
| `ScreenHeader` / `Screen` | Large title left, up to two circular 44px white icon buttons right. On tab roots the rightmost is always the notifications bell with an unread dot. Collapses to a compact blurred bar past 48px of scroll. |
| `HeroCard` | Full width, 4:5, photo with scrim, small label, big title or number, one pill button. Sits in `HeroCarousel` with dot pagination. |
| `ImageCard` | Photo on top (16px), title, one line, optional sentence-case badge. For peek carousels and two-column grids. |
| `FeatureTile` | Plan hub tile: photo or colour panel with a Lucide icon, the feature name, one live stat. |
| `StatCard` | Half-width card: circular icon, label, big number. Used in pairs. |
| `PanelCard` | A colour panel for emphasis: Ava's briefing, a due payment. |
| `ItemCard` / `ItemList` | The browsable list pattern: one rounded card per item. See "Lists". |
| `Row` / `RowGroup` / `GroupedList` / `SwipeRow` | The scannable list pattern: rows in a rounded card with hairline dividers, sticky headers, optional swipe actions. See "Lists". |
| `BottomSheet` | 28px top corners, grab handle, spring open and close, scrim. Full-height variant for Ava. |
| `SmartImage` | Cloudinary delivery with `f_auto,q_auto,c_fill,g_auto` at 2x and 3x, fixed aspect ratio, tinted placeholder, lazy below the fold, alt text always. Never a broken box: falls back to a colour panel. |
| `PillButton`, `FilterPills`, `ProgressBar`, `EmptyState`, `ErrorState`, `Skeleton`, `SearchScreen`, form fields | As in v0, restyled to the tokens. |
| `Banner` | The in-app notification: a rounded card that drops from the top with the elevation token, stays four seconds, swipes away, opens on tap. |

## Lists

Two patterns, chosen by a rule, never mixed within one list.

**Item cards** (`ItemCard` in `ItemList`, each item its own rounded card with a 12px gap): for lists that are browsed. Anatomy: a 72px rounded thumbnail or colour tile on the left, title, one meta line, a key value (amount, date or status) bottom left, and one trailing circular action on the right edge where one makes sense (call, pay, add). The whole card taps through. Used for vendors, registry items, payments due, tasks and payments in "Next up", seating tables, accommodation and transport places, experience guide entries, polls, timeline moments, the wedding party, marketplace results.

**Grouped rows** (`GroupedList` of `Row`s, many rows in one rounded card with hairline dividers and sticky section headers): for lists that are long, text-led, and scanned or searched. Used for guests, budget line items inside a category, the full checklist inside each group, the messages list, the notification centre, song requests, the playlist, settings and account.

**The rule of thumb:** more than about 25 items, or no image and no inline action, means grouped rows. Otherwise item cards.

Grouped rows can swipe left to reveal an action where an existing mutation supports it (`SwipeRow`): complete a task, mark a message read, remove with a confirm. Vendors and the registry carry a circular view toggle beside search that swaps item cards for a two-column image grid; the choice is remembered on the device. Every list keeps its skeleton, empty and error states, and gets pull to refresh.

## Motion

Transform and opacity only. `prefers-reduced-motion` removes movement and keeps fades.

- Press: every tappable card and button scales to 0.98 and back, 120ms (`.oi-m-press`).
- Screen entry: content fades up 8px, staggered 40ms per block, 240ms each (`.oi-m-stagger > *`).
- Hero numbers count up once on first view (`useCountUp`). Progress bars animate to their value.
- Subtle parallax on the hero photo while scrolling, at most 12px (`useParallax`).
- Carousels snap. Light haptic on tab change, task completion, toggles and pull to refresh when native.
- Springs are CSS: `cubic-bezier(0.34, 1.4, 0.64, 1)` on the tab indicator and sheets. No new animation library; framer-motion is a repo dependency but the shell does not need it.

## Imagery

Order of preference: the couple's own imagery (cover photo, site photo blocks, Our Story photos), then the sample content for their universe, then a colour panel. A slot never shows a broken or empty box.

Stills only. Nothing derives motion from an image whose public id starts with `DTS_`. The scroll parallax on a static hero is fine.

Where images belong: Home hero carousel, Home "keep planning" carousel, Plan hub tiles, Site tab preview, vendor and registry cards where the data has photos, empty states where a photo helps, the Account profile card. Where they do not: forms, dense lists, budget tables.

Every decorative slot is named once, in `src/mobile/images.ts`, with its public id, alt text, where it is drawn, the size to supply and a `todo` marker while it waits for a photo. `/m/preview/images` renders that file as a gallery. No decorative Cloudinary id lives anywhere else in `src/mobile/`.
