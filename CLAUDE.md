# OpenInvite — Claude working notes

This file tracks the locked design system being applied across the entire app and the current state of that work. Read it at the start of every session.

---

## Tech stack

- React + Vite
- Tailwind CSS + shadcn/ui (Radix UI primitives)
- `class-variance-authority` (cva) for component variants
- `react-router-dom` for routing
- Base44 backend (entities via `@/entities/...`)
- `lucide-react` icons
- `react-hot-toast` for toasts
- `date-fns` for date math
- Open-Meteo API (free, no key) for weather widget

---

## Design constitution — LOCKED, do not deviate

### Typography
- **Font**: Plus Jakarta Sans only — loaded in `index.html` (weights 300–800, italic variants)
- **No** DM Sans, DM Serif Display, or any other font anywhere
- **Sentence case** everywhere (headings, labels, buttons, nav items) — no Title Case, no ALL CAPS except the 11px label utility

### Colours
| Token | Hex |
|---|---|
| `--color-red` | `#E03553` |
| `--color-purple` | `#803D81` |
| `--color-lime` | `#DDF762` |
| `--color-navy` | `#0A1930` |
| `--color-black` | `#0A0A0A` |
| `--color-white` | `#FFFFFF` |

- **Minimum text contrast on light bg**: `#444444`. Never use `#888888`, `#666666`, `text-muted-foreground`, or anything lighter than `#444444` on white/light backgrounds.
- Placeholder / de-emphasised text: `rgba(10,10,10,0.4)` (40% opacity black).

### Border-radius
- **Cards, containers, modals, inputs, tables**: `0` — no radius at all
- **Buttons and badges only**: `border-radius: 999px` (pill shape)
- Tailwind: use `rounded-none` on containers, `rounded-[999px]` on buttons/badges

### Buttons
- ALL buttons must be pill-shaped (`border-radius: 999px`) — no exceptions
- **Primary**: `background: #E03553`, white text, hover `scale(1.03)`, active `scale(0.98)`
- **Secondary/ghost**: `background: rgba(10,10,10,0.08)`, dark text, same hover scale
- **Glass-dark** (for dark backgrounds): `background: rgba(255,255,255,0.15)`, white text, `backdrop-filter: blur(8px)`
- CSS utility classes available: `btn-primary`, `btn-editorial-secondary` (defined in `src/index.css`)

### Inputs
- **Underline only** — `border-bottom: 1px solid rgba(10,10,10,0.18)`, all other borders `none`
- Focus state: `border-bottom: 2px solid #E03553`
- No background, no box-shadow, `border-radius: 0`
- Padding: `6px 0` (no left/right padding)
- Text: `14px / font-weight 500 / #0A0A0A`
- Placeholder: `rgba(10,10,10,0.4)`, `font-weight 400`

### Labels (form labels, table headers, stat card labels)
- `font-size: 11px`, `font-weight: 700`, `text-transform: uppercase`, `letter-spacing: 0.08em`
- Colour: `rgba(10,10,10,0.4)` on cards, `#444444` in forms

### Separators / dividers
- Use `1px solid rgba(10,10,10,0.08)` — no `<hr>` with opinionated margins
- Use vertical dividers (`width: 1px, height: 20px`) between header cluster items
- No bullet points anywhere — use line separators instead

### Sub-header pattern (every dashboard page)
Every dashboard page should have this structure immediately below the fixed header:

```
┌─────────────────────────────────────────────────┐
│  Sub-header  height:48px  bg:#FFF               │  ← page title centred, 18px/700
│  borderBottom: 1px solid rgba(10,10,10,0.08)    │
├─────────────────────────────────────────────────┤
│  Descriptor strip  bg:#F5F5F5  padding:12px 0   │  ← short descriptor, 14px/600/rgba(10,10,10,0.5)
└─────────────────────────────────────────────────┘
```

### Stat card strip
Used on the Dashboard. Full-width horizontal flex, 4 equal columns, vertical dividers only:
- Each card: `flex: 1`, `padding: 24px 32px`, `borderRight: 1px solid rgba(10,10,10,0.08)`
- Label: `11px/700/uppercase/0.08em/rgba(10,10,10,0.4)`
- Value: `clamp(24px, 3vw, 36px)/700/#0A0A0A`
- Value animates 0 → target on load using `requestAnimationFrame` + easeOutCubic

---

## Layout architecture

**Two completely separate layouts — do not mix them.**

### Marketing pages (bypass Layout.jsx entirely)
Listed in `noLayoutPages` array in `src/Layout.jsx`:
```
Home, Features, Pricing, CouplesStudio, PlanSelection,
Onboarding, PaymentWall, GuestWebsite, WeddingWebsiteEditor
```
These pages render with no sidebar. Each embeds its own `<PublicNav />` component which handles the scroll-to-pill behaviour. Do not add `AnimatedSidebar` to these.

### Dashboard pages (use Layout.jsx)
All other pages go through `Layout.jsx`:
- **Sidebar**: `AnimatedSidebar` — `position: fixed, top:0, left:0, bottom:0, width: 200px`
- **Header**: `Header.jsx` — `position: fixed, top:0, left:200px, right:0, height:64px, zIndex:30`
- **Content**: `marginLeft: 200px, paddingTop: 64px` (desktop) / `paddingTop: 64px` (mobile)
- **Mobile**: Fixed top bar (logo + hamburger) + `Sheet` for nav overlay

---

## Sidebar nav structure (`AnimatedSidebar.jsx`)

Seven sections. Do not add or remove items without discussion.

| Section | Items |
|---|---|
| Planning | Overall, Calendar, Checklist, To do list |
| Guests | Guest list, Wedding party, Seating, Messages |
| Finances | Budget, Registry |
| Creative | Styling, Music, Moodboard, Vows & speeches, Wedding favours |
| Vendors | Vendors |
| Day of | Schedule, Ceremony details, Live stream |
| Extras | Honeymoon, Accommodation, Transport, Emergency contact |

Bottom (static, non-nav): Account settings, Collaborate, Quick tips, Help centre, Leave dashboard.

Studio section: single `#E03553` pill button "Design studio" — no nav items.

**Active state**: `borderLeft: 2px solid #E03553`, `background: rgba(224,53,83,0.08)`
**Hover state**: `background: rgba(10,10,10,0.04)` — no border-radius
**NavItem icon size**: 18, padding `10px 16px`
**Section label style**: `fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'rgba(10,10,10,0.4)', marginTop:24`

---

## Files completed

### Foundation
| File | What was done |
|---|---|
| `index.html` | Replaced DM Sans + DM Serif Display with Plus Jakarta Sans (weights 300–800, italic) |
| `tailwind.config.js` | Added brand colour tokens (`brand-red`, `brand-purple`, etc.), zeroed all `borderRadius` defaults, added `pill: '999px'` |
| `src/index.css` | Fixed `--radius: 0px`, removed duplicate font `@import`, fixed `btn-editorial-secondary` to pill shape with correct hover |

### UI primitives (`src/components/ui/`)
| File | What was done |
|---|---|
| `button.jsx` | Full rewrite — all variants pill-shaped, primary `#E03553`, added `glass-dark` variant, scale hover |
| `input.jsx` | Underline-only, focus red `2px`, correct padding/weight/placeholder |
| `label.jsx` | 11px/700/uppercase/0.08em tracking |
| `textarea.jsx` | Same underline-only treatment as input |
| `select.jsx` | Trigger matches input style, dropdown `rounded-none`, check icon `#E03553`, item hover `rgba(10,10,10,0.04)` |
| `form.jsx` | `FormDescription` → `#444444`, `FormMessage` → brand red |
| `card.jsx` | `CardTitle` — removed `font-serif-display`; `CardDescription` → `#444444` |
| `badge.jsx` | Added `rounded-[999px]` to base, fixed secondary text to `#444444`, added `brand` variant |
| `dialog.jsx` | `rounded-none`, `DialogDescription` → `#444444` |
| `tabs.jsx` | Active tab → `#E03553` underline + text; inactive → `#444444`; label-style text |
| `table.jsx` | `TableHead` label style; `TableRow` hover `rgba(10,10,10,0.025)`; `TableCaption` → `#444444` |
| `progress.jsx` | `rounded-none`, gradient fill `#E03553 → #803D81`, track `rgba(10,10,10,0.08)` |
| `alert.jsx` | `rounded-none` |

### Layout
| File | What was done |
|---|---|
| `src/Layout.jsx` | Restored `AnimatedSidebar` for desktop; correct fixed positioning for header + sidebar; mobile Sheet nav; account settings modal uses `btn-primary` / `btn-editorial-secondary`; Toaster `borderRadius: 0` |
| `src/components/layout/AnimatedSidebar.jsx` | Full rewrite — new `NAV_SECTIONS` const, removed Ava/Studio items, correct `NavItem` styling, `MobileSidebarContent` export updated |
| `src/components/layout/Header.jsx` | Full rewrite — couple name left, search centre (underline input with dropdown results), right cluster: countdown + Sep + weather + Sep + bell + Sep + user icon |

### Pages
| File | What was done |
|---|---|
| `src/pages/Dashboard.jsx` | Sub-header bar, descriptor strip, stat card strip with `CountUp` animation, welcome banner updated, quick links updated, old editorial header + old classes removed |
| `src/pages/Guests.jsx` | Sub-header, descriptor strip, CountUp stat strip, pill filter buttons, sentence-case tabs, red pill Add guest button |
| `src/components/guests/GuestList.jsx` | Vibrant RSVP pill colours (lime/red/purple/subtle), spec BadgePill (Plus Jakarta Sans, 999px radius), correct border colours, `#444444` min contrast |
| `src/components/guests/GuestForm.jsx` | Removed Card wrapper, removed conflicting Input className overrides, pill-shaped tag chips, btn-primary submit, btn-editorial-secondary cancel |
| `src/components/guests/RSVPManagement.jsx` | Replaced gradient card with flat `#0A0A0A` strip, horizontal stat strip with dividers, flat rows + spec gradient progress bars, no Card components |
| `src/components/guests/EmailTemplates.jsx` | All zinc→spec colours, rounded→none containers, pills kept for filter chips, red pill send button, spec status pill colours, red left-border active template state |
| `src/pages/Vendors.jsx` | Sub-header, descriptor strip, CountUp stat strip, Ask Ava dark pill, Add Vendor modal, two tabs (My vendors / Find vendors), filter pill rows |
| `src/components/vendors/AIVendorAssistant.jsx` | Custom fixed modal, dark header, 4 tabs (Categorize/Analyze/Suggest/Payments), full InvokeLLM functionality |
| `src/components/vendors/VendorDetailPanel.jsx` | Fixed overlay, spec colours, underline inputs, 3-tab communications panel |
| `src/pages/Seating.jsx` | Three-panel layout, dot-grid canvas, drag-and-drop tables/assets, seat assignment, zoom controls, CountUp stat strip |
| `src/components/seating/VisualTable.jsx` | Seat position math (round orbit / rectangle top-bottom), selected state, click vs drag distinction |
| `src/components/seating/VisualAsset.jsx` | Spec colour map for all venue asset types and shapes |
| `src/components/seating/VenueAssetLibrary.jsx` | Layout items sidebar, Add table button, venue assets, basic shapes, Import layout file input |
| `src/components/seating/AddTableModal.jsx` | Fixed overlay modal, underline inputs, spec buttons |
| `src/components/seating/AISeatingGenerator.jsx` | Custom fixed modal, sticky dark header, generate/review steps, InvokeLLM with tag-based seating |
| `src/pages/Music.jsx` | Sub-header, descriptor strip, CountUp stat strip, three-panel layout (playlists / tracks / song requests), Ask Ava dark pill, settings modal with pill toggles |
| `src/components/music/MusicForm.jsx` | Light inline form (no dark bg), underline inputs, pill toggles for guest_suggestion/approved, btn-primary submit |
| `src/components/music/MusicList.jsx` | Fixed label-caps → inline labelStyle, dark bg track list with category group headers |
| `src/components/music/MusicTrackRow.jsx` | Approval color `#22c55e` → `#6b7700`, inline styles throughout |
| `src/components/music/MusicSuggestionsModal.jsx` | Removed framer-motion + Card; fixed overlay (zIndex 9200); spec tab bar; spec category color pills; inline SuggestionCard |
| `src/components/music/PlaylistStats.jsx` | Removed Card wrappers → flat border-based stat cells with icons |
| `src/components/music/SharePlaylist.jsx` | Removed Card + rounded-lg; fixed overlay; spec colors; dark navy "coming soon" block |
| `src/components/music/SpotifySearch.jsx` | Fixed label-caps → inline; btn-editorial-primary → btn-primary; raw input (not shadcn) for dark bg search |
| `src/pages/VowsSpeeches.jsx` | Sub-header, descriptor strip, CountUp stat strip, two-panel layout (list + viewer/editor), Ask Ava dark pill, removed Toaster + AIWeddingAssistant + react-quill |
| `src/components/vows/VowSpeechEditor.jsx` | Replaced ReactQuill with plain Textarea; underline inputs; btn-primary submit; inline labelStyle |
| `src/components/vows/AIVowsSpeechesAssistant.jsx` | Removed Dialog + Card + Button; fixed overlay (zIndex 9200); dark navy header; spec tab bar; 3 tabs (Generate/Improve/Preview); pill toggles; spec colors |
| `src/pages/Moodboard.jsx` | Sub-header, descriptor strip, CountUp stat strip, removed framer-motion + AIWeddingAssistant + Button + AnimatePresence; drag-and-drop upload kept; category filter pills |
| `src/components/moodboard/MoodboardGrid.jsx` | Removed framer-motion + DropdownMenu + Badge + Button; hover overlay via onMouseEnter/Leave; spec category pills; edit + full-view modals as plain fixed overlays |
| `src/components/moodboard/AddItemModal.jsx` | Removed motion + Card + Button; fixed overlay; underline inputs; image preview; btn-primary save |
| `src/components/moodboard/BoardSelector.jsx` | Removed Card + motion + Button; inline pill board tabs; inline create form |
| `src/components/moodboard/PinterestConnect.jsx` | Removed motion + Card + Button; fixed overlay; underline search input; curated fallback results; toast feedback |
| `src/pages/Checklist.jsx` | Sub-header, descriptor strip, CountUp stat strip, overall progress bar; replaced label-caps + font-serif-display + #888888 + progress-editorial classes; inline spec styles throughout |
| `src/pages/GuestExperience.jsx` | Full overhaul — sub-header, descriptor strip, inline tab bar (red active), AI dark pill button, flat Quick Book sidebar with spec cards, no AIWeddingAssistant |
| `src/pages/EventDetails.jsx` | Sub-header, descriptor strip, SectionLabel + UInput label colours → rgba(10,10,10,0.4), borderRadius 0 on guest/feature cards, info banner rounded-none |
| `src/pages/Styling.jsx` | Added descriptor strip, border spec rgba(10,10,10,0.08), tabs → red active state, AI button → dark pill, label styles inline, removed AIWeddingAssistant |
| `src/pages/Invitations.jsx` | Loading state bg-gray-50 → white, text-pink-500 → #E03553 |
| `src/components/dashboard/RSVPChart.jsx` | label-caps → inline labelStyle, font-serif-display → inline, DM Sans → Plus Jakarta Sans, spec border colours, RSVP colour map |
| `src/components/dashboard/BudgetSummary.jsx` | label-caps → inline, font-serif-display → inline, spec borders, gradient progress bars |
| `src/components/dashboard/UpcomingTasks.jsx` | label-caps → inline, category badge → pill with colour, spec dividers, font-sans-ui removed |
| `src/components/dashboard/RecentActivity.jsx` | label-caps → inline, font-sans-ui removed, spec dividers |
| `src/components/auth/LoginScreen.jsx` | Container borderRadius 0, buttons → pill (999px), label colours → rgba(10,10,10,0.4), divider rgba(10,10,10,0.08), muted text fixed |
| `src/components/UserNotRegisteredError.jsx` | font-serif-display → inline, #888888 → rgba(255,255,255,0.5), label-caps → inline |
| All `src/components/onboarding/*.jsx` | rounded-xl/2xl/lg → rounded-none on containers, label-caps → inline, font-serif-display → inline |

---

## Files still to do

All remaining dashboard pages need the sub-header + descriptor strip pattern applied, old design-system classes removed, and spec-compliant styling. Priority order (suggested):

**Tier 1 — high traffic pages**
- ~~`src/pages/Guests.jsx` + `src/components/guests/*.jsx`~~ DONE
- ~~`src/pages/Budget.jsx` + `src/components/budget/*.jsx`~~ DONE
- ~~`src/pages/Schedule.jsx` + `src/components/schedule/*.jsx`~~ DONE
- ~~`src/pages/Vendors.jsx` + `src/components/vendors/*.jsx`~~ DONE

**Tier 2 — frequently used**
- ~~`src/pages/Registry.jsx` + `src/components/registry/*.jsx`~~ DONE
- ~~`src/pages/Seating.jsx` + `src/components/seating/*.jsx`~~ DONE
- ~~`src/pages/Messages.jsx` + `src/components/messages/*.jsx`~~ DONE
- ~~`src/pages/Music.jsx` + `src/components/music/*.jsx`~~ DONE
- ~~`src/pages/Moodboard.jsx` + `src/components/moodboard/*.jsx`~~ DONE

- ~~`src/pages/Checklist.jsx`~~ DONE
- ~~`src/pages/Notes.jsx` + `src/components/notes/SuggestionsModal.jsx`~~ DONE
- ~~`src/pages/Calendar.jsx`~~ DONE

**Tier 3 — secondary pages**
- ~~`src/pages/Invitations.jsx`~~ DONE (loading state colours fixed)
- ~~`src/pages/Photography.jsx` + `src/components/photography/*.jsx`~~ DONE
- ~~`src/pages/VowsSpeeches.jsx` + `src/components/vows/*.jsx`~~ DONE
- ~~`src/pages/FoodBeverage.jsx`~~ DONE
- ~~`src/pages/Florals.jsx`~~ DONE
- ~~`src/pages/EntertainmentDetails.jsx`~~ DONE
- ~~`src/pages/Transport.jsx`~~ DONE
- ~~`src/pages/Accommodation.jsx`~~ DONE
- ~~`src/pages/CeremonyDetails.jsx`~~ DONE
- ~~`src/pages/Honeymoon.jsx`~~ DONE
- ~~`src/pages/EmergencyContact.jsx`~~ DONE
- ~~`src/pages/LiveStreaming.jsx`~~ DONE
- ~~`src/pages/WeddingParty.jsx`~~ DONE (new file created)
- ~~`src/pages/WeddingFavours.jsx`~~ DONE (new file created)
- ~~`src/pages/GuestExperience.jsx`~~ DONE (full overhaul — sub-header, descriptor strip, spec tabs, inline buttons, flat sidebar, no AIWeddingAssistant)
- ~~`src/pages/EventDetails.jsx`~~ DONE (sub-header, descriptor strip, SectionLabel/UInput colours fixed, borderRadius 0 on cards)
- ~~`src/pages/Styling.jsx`~~ DONE (descriptor strip, tab colours red, button spec, label styles, removed AIWeddingAssistant)
- `src/pages/WeddingWebsite.jsx` — guest-facing page, lower priority
- Studio pages (AvaStudio, StudioHub, StudioWebsite, etc.) — standalone tools, lower priority

**Shared components — ALL DONE**
- ~~`src/components/dashboard/RSVPChart.jsx`~~ DONE
- ~~`src/components/dashboard/BudgetSummary.jsx`~~ DONE
- ~~`src/components/dashboard/UpcomingTasks.jsx`~~ DONE
- ~~`src/components/dashboard/RecentActivity.jsx`~~ DONE
- ~~`src/components/auth/LoginScreen.jsx`~~ DONE (borderRadius 0, pill buttons, spec label colours)
- ~~All `src/components/onboarding/*.jsx`~~ DONE (rounded-none on cards, label-caps → inline, unused imports fixed)
- ~~`src/components/UserNotRegisteredError.jsx`~~ DONE
- ~~`src/App.jsx`~~ DONE (font-serif-display → inline, label-caps → inline, #888888 → spec)

**UI primitives — ALL DONE**
- ~~`accordion.jsx`~~ DONE
- ~~`alert-dialog.jsx`~~ DONE
- ~~`checkbox.jsx`~~ DONE
- ~~`radio-group.jsx`~~ DONE
- ~~`switch.jsx`~~ DONE
- ~~`dropdown-menu.jsx`~~ DONE
- ~~`sheet.jsx`~~ DONE
- ~~`popover.jsx`~~ DONE
- ~~`tooltip.jsx`~~ DONE
- `slider.jsx`, `calendar.jsx` — low usage, deferred

**Routes — ALL PRESENT in App.jsx**
All new pages confirmed routed:
- `/wedding-party` → WeddingParty ✓
- `/wedding-favours` → WeddingFavours ✓
- `/accommodation` → Accommodation ✓
- `/transport` → Transport ✓
- `/ceremony-details` → CeremonyDetails ✓
- `/honeymoon` → Honeymoon ✓
- `/emergency-contact` → EmergencyContact ✓
- `/LiveStreaming` → LiveStreaming ✓

**Build status**
- `npm run build` fails due to `@base44/vite-plugin` not available locally (this is Base44 infrastructure, not a code issue)
- `npx eslint src/` — zero errors in all files touched during design sweep; 80 pre-existing warnings in untouched files (home components, invitation previews, etc.)

---

## Patterns to follow

### Page shell (every dashboard page)
```jsx
<div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
  {/* Sub-header */}
  <div style={{ height: 48, background: '#FFFFFF', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <span style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Page name</span>
  </div>
  {/* Descriptor strip */}
  <div style={{ background: '#F5F5F5', padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(10,10,10,0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Short descriptor here</span>
  </div>
  {/* Page content */}
  <div style={{ padding: '32px 32px 48px' }}>
    ...
  </div>
</div>
```

### Label style (reuse inline or as a shared const)
```js
const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};
```

### Vertical separator (header cluster)
```jsx
function Sep() {
  return <div style={{ width: 1, height: 20, background: 'rgba(10,10,10,0.1)', flexShrink: 0 }} />;
}
```

### CountUp animation
```jsx
function CountUp({ to, duration = 1200, suffix = '' }) {
  const [value, setValue] = useState(0);
  const startRef = useRef(null);
  useEffect(() => {
    if (to === 0) { setValue(0); return; }
    startRef.current = null;
    let raf;
    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * to));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{value}{suffix}</>;
}
```

---

## Anti-patterns — never do these

- `className="rounded-lg"` or any `rounded-*` on cards/containers — use `rounded-none`
- `text-muted-foreground` — always replace with `text-[#444444]` or a specific colour
- `text-[#888888]` or `text-[#666666]` on light backgrounds — minimum is `#444444`
- `font-serif-display` — this class no longer exists; use `fontFamily: "'Plus Jakarta Sans', sans-serif"`
- `label-caps` — use inline label style const instead
- `font-sans-ui` — does not exist; use inline font-family
- Square buttons (no `rounded-[999px]`) — all buttons must be pills
- Inputs with border boxes — underline only
- Bullet point lists — use `<div>` rows with `borderBottom: '1px solid rgba(10,10,10,0.08)'` separators
