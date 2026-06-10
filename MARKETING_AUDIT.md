# Marketing Audit — Phase 0

> Read-only. No code changes. All file:line references are evidence from the current codebase.
> Goal: map the real shipped feature set against current marketing copy so each feature has one
> clear home on the marketing site and duplicated claims are consolidated.
> Voice/language of existing copy is preserved — new content needs are marked **NEW COPY NEEDED**.

---

## 1. Feature Inventory

Every real, shipped, user-facing feature with plan gating.

**Tier codes**
- `FREE-TRIAL` — accessible during 14-day free trial only (`plan === 'free'`)
- `PRO` — included in $79 Pro plan and above
- `ULTRA` — included in $149 Ultra plan only (not accessible to Pro users)
- `UNGATED` — available to all authenticated users regardless of plan
- `UNCLEAR` — gating could not be determined from code alone

Plan gating mechanism: `AnimatedSidebar.jsx:198` — `const canAccessUltra = _plan === 'ultra' || _plan === 'free';` (Ultra + free-trial share access). Pro users are hard-blocked from Ultra features. `StudioGuestSuite.jsx:88` — `const canAccess = plan === 'ultra' || plan === 'free';`.

### Planning tools (all UNGATED)

| Feature | File | Key capabilities |
|---------|------|-----------------|
| Daily update / briefing | `src/pages/DailyUpdate.jsx` | AI-generated daily briefing, countdown, weekly priorities, smart suggestions, guest alerts, vendor notes, budget insights |
| Planning dashboard | `src/pages/Dashboard.jsx` | RSVP chart, budget summary, upcoming tasks, quick links |
| Schedule / timeline | `src/pages/ScheduleHub.jsx` (hub) + `src/pages/Schedule.jsx` | Timeline builder, vendor coordination, task assignment, deadline tracking, day-of view, CSV export |
| To-do list | `src/pages/TodoList.jsx` | Task management and tracking |
| Guest list | `src/pages/Guests.jsx` | Unlimited guests, add/edit/delete, bulk import, categorisation, email templates |
| Guest polls | `src/pages/Polls.jsx` | Pre-built poll templates (cocktails, first dance, midnight snack, dessert, photobooth theme, hashtag), custom options, vote tracking, Ava insights |
| Guest messaging | `src/pages/Messages.jsx` | Unread tracking shown in `Layout.jsx:264–266` |
| Seating planner | `src/pages/Seating.jsx` | Drag-and-drop canvas 1400×900, table creation/editing, guest assignment, venue asset library, AI seating generator, table search |
| Wedding party | `src/pages/WeddingParty.jsx` | Roles and member management |
| Moodboard | `src/pages/Moodboard.jsx` | Image upload, boards (venue ideas, dress, colour palette), 13 category tags, Pinterest integration |
| Styling | `src/pages/Styling.jsx` | Flowers, decorations, attire/dress code, vendor linking |
| Beauty | `src/pages/Beauty.jsx` | Beauty and grooming planning |
| Food & beverage | `src/pages/FoodBeverage.jsx` | Catering, menu design, dietary tracking |
| Music planner | `src/pages/Music.jsx` | Spotify integration, collaborative playlists, guest music requests, track organisation by vibe/moment, music timeline, playlist sharing, DJ collaboration |
| Photography | `src/pages/Photography.jsx` | Shot lists, vendor management |
| Vows & speeches | `src/pages/VowsSpeeches.jsx` | Writing tool, AI-powered suggestions |
| Guest gifts / favours | `src/pages/WeddingFavours.jsx` | Favour management, Ava favour ideas |
| Vendor management | `src/pages/Vendors.jsx` | Add/edit/delete, categorisation, contact tracking, payment scheduling, contract storage |
| Vendor marketplace | `src/pages/VendorMarketplace.jsx` | Browse and connect with vendors |
| Budget tracker | `src/pages/Budget.jsx` | 14 categories, real-time tracking, charts, forecasting, expense analytics, friendly payment reminders, cost-saving suggestions |
| Registry | `src/pages/Registry.jsx` | Store links, custom cash funds, product registry, guest purchase tracking, completion rates |
| Honeymoon | `src/pages/Honeymoon.jsx` | Destination ideas, Ava prompts |
| Considerations | `src/pages/Considerations.jsx` | Planning checklists |
| Ceremony details | `src/pages/CeremonyDetails.jsx` | Ceremony timeline, officiant details, vow management |
| Transport (admin) | `src/pages/Transport.jsx` | Guest transport coordination, logistics |
| Accommodation (admin) | `src/pages/Accommodation.jsx` | Guest accommodation planning |
| Emergency contact | `src/pages/EmergencyContact.jsx` | Day-of emergency contacts |
| Live streaming (admin) | `src/pages/LiveStreaming.jsx` | Live stream setup |
| Event details | `src/pages/EventDetails.jsx` | Couple names, wedding date, venue, ceremony/reception entries |
| Notes | `src/pages/Notes.jsx` | Freeform notes |
| Ava AI assistant | `src/Layout.jsx:531–549` | Floating AI pod, contextual across all pages, unlimited |

### Guest Suite / website (ULTRA — free-trial included)

Gating: `AnimatedSidebar.jsx:198`, `StudioGuestSuite.jsx:88`. Pro users see "Upgrade to Ultra" tooltip: `AnimatedSidebar.jsx:256`.

| Feature | File | Key capabilities | Coming soon? |
|---------|------|-----------------|--------------|
| Wedding website builder | `src/pages/StudioWebsite.jsx` | 11 universe themes, drag-and-drop sections, 13 page templates, left/right/preview panels, full-screen preview, Ava auto-fill, publish | No |
| Universe / theme selection | `src/pages/StudioUniverse.jsx` | 11 premium theme styles (Aman, Tulum, Kyoto, Capri, Tokyo, Marrakech, Paris, Amalfi, Sedona, Aspen, Santorini) | Help.jsx:34 lists additional themes as coming soon |
| Guest Suite overview | `src/pages/GuestSuite.jsx` | Hub for website, invitations, RSVP | No |
| Guest Suite — schedule | `src/pages/GuestSuiteSchedule.jsx` | Guest-facing event schedule | No |
| Guest Suite — Q&A | `src/pages/GuestSuiteQandA.jsx` | Guest-facing FAQ | No |
| Guest Suite — registry | `src/pages/GuestSuiteRegistry.jsx` | Guest-facing registry display | `WeddingWebsite.jsx:147` — "Registry details coming soon" |
| Guest Suite — accommodation | `src/pages/GuestSuiteAccommodation.jsx` | Accommodation guide for guests | `GuestAccommodation.jsx:31` — recommendations "coming soon" |
| Guest Suite — transport | `src/pages/GuestSuiteTransport.jsx` | Transport guide for guests | No |
| Guest Suite — experience guide | `src/pages/GuestSuiteExperience.jsx` | Local guide, activities | No |
| Guest Suite — policies | `src/pages/GuestSuitePolicies.jsx` | Guest-facing wedding policies | No |
| Guest Suite — polls (guest-facing) | `src/pages/GuestSuitePolls.jsx` | Guest poll voting | No |
| Guest Suite — live stream (guest-facing) | `src/pages/GuestSuiteLiveStream.jsx` | Live stream page for guests | "Live stream details coming soon" |
| Digital invitations | Described in `src/pages/GuestSuite.jsx:36–43` | Design and send via email/WhatsApp | No (card present) |
| RSVP pages (guest-facing) | `src/App.jsx:167` `/rsvp/:token` | Token-based RSVP form | No |
| Save the dates / thank you cards | Listed in `src/pages/Pricing.jsx:31` | Print assets | `src/pages/GuestSuite.jsx:55` — "Print-ready designs" marked **Coming soon** |
| Studio — share | `src/pages/StudioShare.jsx` | Publish and share website link | No |

### Features with no plan gating found (UNCLEAR)

| Feature | File | Note |
|---------|------|------|
| Ava Studio | `src/pages/AvaStudio.jsx` | Accessible via `/studio/ava` — gating not visible in code review |
| Ava Studio — website builder | `src/pages/AvaStudioWebsite.jsx` | Same |
| Ava Studio — assets | `src/pages/AvaStudioAssets.jsx` | Preview marked "coming soon" |

---

## 2. Marketing Page Map

### Home (`/`) — `src/pages/Home.jsx`

| Section | Component | Features/copy claimed | File:line |
|---------|-----------|----------------------|-----------|
| Hero collage | `HeroCollage` | Visual impression, no explicit feature claims | `Home.jsx:38` |
| Value prop | `ValuePropSection` | Broad brand positioning | `Home.jsx:42` |
| Scroll morph "Why us?" | `ScrollMorphSection` | Interactive demo, brand story | `Home.jsx:45` |
| Horizontal feature scroll | `HorizontalScrollSection` | Feature highlights (copy inside component) | `Home.jsx:48–50` |
| Light section transition | `LightSectionReveal` | Visual transition | `Home.jsx:53` |
| Feature — invitations | `FeatureInvitations` | Digital invitations | `Home.jsx:57` |
| How it works | `HowItWorksSection` | Sign up flow | `Home.jsx:61` |
| Testimonials | `TestimonialsSection` | Social proof | `Home.jsx:64` |
| Ava banner | inline | **"AI meets I Do. Say hello to Ava."** | `Home.jsx:73` |
| Ava spotlight | `AvaSpotlightSection` | Ava AI | `Home.jsx:76` |
| Pricing | `PricingSection` | Tier summary | `Home.jsx:79–81` |
| Full-bleed CTA | `FullBleedPhotoCTA` | Sign-up CTA | `Home.jsx:84` |

**Features mentioned:** invitations, Ava AI, pricing tiers.  
**Features NOT mentioned on Home:** budget, seating, music/playlists, moodboard, polls, vendor management, registry, website builder, Guest Suite pages (accommodation/transport/experience), vows, daily update, schedule/timeline.

---

### Features (`/features`) — `src/pages/Features.jsx`

| Section | Component | Features/copy claimed | File:line |
|---------|-----------|-----------------------|-----------|
| Hero | inline | **"Everything you needed. Plus a few things you didn't expect."** | `Features.jsx:89` |
| Zoom parallax | `ZoomParallax` | Visual | `Features.jsx:97` |
| Quick start | `QuickStartSection` | Onboarding | `Features.jsx:100` |
| Dashboard section | `DashboardSection` | Planning dashboard | `Features.jsx:103` |
| Six-feature grid | inline | Smart Budget Tracker, Registry Tool, Ultimate Planner, AI Integration, Guest Suite, Collaborative Playlists | `Features.jsx:106` |
| Invitations | `InvitationsSection` | Digital invitations | `Features.jsx:109` |
| Accordion | `ALL_FEATURES` array | Advanced Guest Management, Smart Budget Tracking, Timeline & Schedule Planning, Collaborative Playlists, Photo & Memory Management, Registry Integration, Venue Management | `Features.jsx:55–62` |
| Deep dive — timeline | `FeatureTimeline` | Schedule/timeline | `Features.jsx:115` |
| Deep dive — playlists | `FeaturePlaylists` | Music/playlists | `Features.jsx:116` |
| Deep dive — guests | `FeatureGuests` | Guest management | `Features.jsx:117` |
| Deep dive — budget | `FeatureBudget` | Budget tracking | `Features.jsx:118` |

**Features mentioned:** budget, registry, planner/dashboard, AI (Ava), Guest Suite, playlists/music, invitations, guest management, timeline, photo management, venue management.  
**Duplicated from Home:** Ava AI, invitations.  
**Features NOT mentioned on Features page:** seating planner, moodboard, polls, vows & speeches, vendor management, beauty, food & beverage, wedding party, styling, accommodation/transport guide, experience guide, daily update, save the dates.

---

### Pricing (`/pricing`) — `src/pages/Pricing.jsx`

| Section | Content | File:line |
|---------|---------|-----------|
| Free trial | 14 days, full access | `Pricing.jsx:65` |
| Pro ($79) | Unlimited guests, budget, Ava AI, vendors, seating, schedule, photography/styling/moodboard, music, registry, vows, priority support, 24 months | `Pricing.jsx:11–23` |
| Ultra ($149) | Pro + website builder, 11 premium themes, digital invitations, online RSVP pages, Guest Suite (accommodation/transport/experience), save the dates | `Pricing.jsx:25–32` |
| FAQs | One-time payment, 14-day money-back, no credit card for trial, archive plan $49 | `Pricing.jsx:34–63` |

**Notes:** Pricing.jsx is the most accurate feature-to-tier mapping in the codebase. It mentions seating planner (Pro), moodboard (Pro), vows & speeches (Pro) — none of which appear on the Features page. Guest Suite pages are named individually.

---

### About (`/about`) — `src/pages/About.jsx`

| Section | Content | File:line |
|---------|---------|-----------|
| DELIVERABLES (12 items) | Guest Management Suite, Smart Budget Tracker, Digital Invitations, Seating Planner, Collaborative Playlists, Registry Integration, AI Assistant (Ava), Photo & Memory Management, Vendor Management, Timeline & Schedule Builder, RSVP Tracking, Collaboration Access | `About.jsx:15–28` |
| BELIEFS (3 items) | "Design first." / "Everything connected." / "For every couple." | `About.jsx:30–46` |

**Duplicated from Features page:** budget, guest management, playlists/music, registry, Ava AI, timeline, photos.  
**On About but not Features:** seating planner, vendor management, RSVP tracking, collaboration access.  
**On Features but not About:** venue management.

---

### Contact (`/contact`) — `src/pages/Contact.jsx`

| Section | Content | File:line |
|---------|---------|-----------|
| Hero | **"Let's plan something beautiful."** | `Contact.jsx:69` |
| Form interests (checkboxes) | Guest Management, Budget Tracking, Digital Invitations, Seating Planner, AI Assistant, Pricing | `Contact.jsx:48` |

---

### Universes (`/universes`) — `src/pages/Universes.jsx`

Showcases 11 premium theme styles. No feature claims — purely visual. Not linked from main nav in most marketing flows.

---

### Duplication matrix

Features appearing on **multiple** marketing pages (current state):

| Feature | Home | Features | About | Pricing | Contact |
|---------|------|----------|-------|---------|---------|
| Ava AI | ✓ | ✓ | ✓ | ✓ | ✓ |
| Digital invitations | ✓ | ✓ | ✓ | ✓ | ✓ |
| Budget tracker | — | ✓ | ✓ | ✓ | ✓ |
| Guest management | — | ✓ | ✓ | ✓ | ✓ |
| Registry | — | ✓ | ✓ | ✓ | — |
| Timeline / schedule | — | ✓ | ✓ | ✓ | — |
| Playlists / music | — | ✓ | ✓ | ✓ | — |
| Seating planner | — | — | ✓ | ✓ | ✓ |
| Vendor management | — | — | ✓ | ✓ | — |
| Photo management | — | ✓ | ✓ | — | — |
| Vows & speeches | — | — | — | ✓ | — |
| Moodboard | — | — | — | ✓ | — |
| Guest Suite (accommodation/transport/experience) | — | — | — | ✓ | — |
| Website builder / themes | — | — | — | ✓ | — |
| RSVP tracking | — | — | ✓ | ✓ | — |
| Polls | — | — | — | — | — |
| Daily update / briefing | — | — | — | — | — |
| Styling | — | — | — | ✓ | — |
| Beauty | — | — | — | — | — |
| Vow writer | — | — | — | ✓ | — |
| Save the dates | — | — | — | ✓ | — |
| Wedding party | — | — | — | — | — |
| Guest gifts / favours | — | — | — | — | — |

**Features mentioned nowhere in marketing:**
- Polls (admin + guest-facing)
- Daily update / AI briefing
- Beauty planning
- Guest gifts / favours
- Styling module
- Wedding party
- Honeymoon planner
- Notes
- Emergency contact
- Considerations / checklists
- Food & beverage planning
- Ceremony details editor
- Live streaming

---

## 3. Placement Plan

### One-feature-one-home assignments

This table resolves duplications: each feature gets its definitive marketing home (the page where it's explained in depth), plus which other pages may carry a brief mention. Existing copy carries over; lines marked **NEW COPY NEEDED** have no current copy to reuse.

#### Ava AI — definitive home: **Home** (`AvaSpotlightSection`)
Already has dedicated spotlight on Home. Features and About can keep brief mentions. No change needed to placement logic; just remove redundant inline descriptions from About.

#### Budget tracker — definitive home: **Features** (deep-dive `FeatureBudget`)
Already a deep-dive block. Remove from About DELIVERABLES list or shorten to a single-line mention. Pricing carries the tier note (Pro).

#### Guest management — definitive home: **Features** (`FeatureGuests`)
Already a deep-dive block. About and Contact keep single-line mentions.

#### Digital invitations — definitive home: **Features** (`InvitationsSection`)
Already its own section. Home `FeatureInvitations` is an additional spotlight — keep both (separate sections, different emphasis). About and Contact: single-line mention only.

#### Music / playlists — definitive home: **Features** (`FeaturePlaylists`)
Already a deep-dive block. Remove or shorten on About.

#### Timeline / schedule — definitive home: **Features** (`FeatureTimeline`)
Already a deep-dive block. Shorten on About.

#### Registry — definitive home: **Features** (six-feature grid)
Already in the grid. Shorten or remove from About.

#### Seating planner — definitive home: **Features** (to be added — currently missing)
Currently only on About and Pricing. Move to Features six-feature grid or accordion. **NEW COPY NEEDED** for Features placement. Remove from About DELIVERABLES long-form description; keep brief About mention.

#### Vendor management — definitive home: **Features** (to be added — currently missing)
Currently only on About. Add to Features accordion `ALL_FEATURES`. **NEW COPY NEEDED** for Features entry.

#### Website builder / universe themes — definitive home: **Features** (to be added)
One of the most differentiated Ultra features. Currently only on Pricing. Add a dedicated section or deep-dive to Features. **NEW COPY NEEDED** for Features block. The `/universes` page already exists as a visual showcase — link from Features.

#### Guest Suite (accommodation, transport, experience guide) — definitive home: **Features** (to be added)
Currently only named on Pricing. Add to Features — can bundle as a single "Guest Suite" block. **NEW COPY NEEDED** for Features entry. Home can carry a brief mention alongside invitations.

#### Polls — definitive home: **Features** accordion (to be added)
Mentioned nowhere. Add a single entry to `ALL_FEATURES` accordion. **NEW COPY NEEDED**.

#### Daily update / AI briefing — definitive home: **Features** (to be added)
Mentioned nowhere. Unique differentiator (AI-powered daily planning briefing). Add to Features — could sit alongside Ava section. **NEW COPY NEEDED**.

#### Moodboard — definitive home: **Features** accordion (to be added)
Currently only on Pricing (Pro tier list). Add to `ALL_FEATURES` accordion. Existing Pricing copy ("photography, styling & moodboard tools") can be adapted. **NEW COPY NEEDED** for short Features entry.

#### Vows & speeches — definitive home: **Features** accordion (to be added)
Currently only on Pricing. Add to accordion. **NEW COPY NEEDED** for short entry.

#### Save the dates / print assets — definitive home: **Pricing** (already there)
These are Ultra tier. Keep on Pricing. Mention once on Features under the Ultra section. Note: currently marked **Coming soon** in GuestSuite.jsx:55 — do not claim as fully shipped.

#### Wedding party, guest gifts/favours, honeymoon, beauty, food & beverage, styling, ceremony details, notes, emergency contact, considerations — definitive home: **Pricing** Pro tier list
These are supporting tools that round out the Pro tier. They don't need individual marketing real estate. Add a single catchall line to the Pricing Pro section ("…plus styling, beauty, food & beverage, ceremony planning, honeymoon, moodboard and more"). **NEW COPY NEEDED** — one line.

#### Live streaming — definitive home: **Pricing** Ultra (once guest-facing is fully shipped)
Currently "coming soon" on guest-facing side. Keep on Pricing as a feature note. Do not add to Features until shipped.

### Ultra badge treatment

Per DESIGN_SPEC.md: sentence case, flat, no new colours. Use the existing pattern from `AnimatedSidebar.jsx:242` (current badge) as the reference. Proposed single treatment across marketing pages:

```
ultra  ← pill, background rgba(10,10,10,0.06), text rgba(10,10,10,0.5), borderRadius 999px, 
         fontSize 11, fontWeight 700, padding 2px 8px, fontFamily Plus Jakarta Sans
```

This matches the "Coming soon" pill treatment already in GuestSuite.jsx:212 — just different label text. One consistent component for all tier badges.

---

## 4. Sequence — recommended update order

Each slice is a standalone PR. Ordered from lowest marketing risk to highest.

| Slice | Page | Change | Rationale |
|-------|------|--------|-----------|
| 1 | Features | Add seating planner to six-feature grid (1 card) | Single card addition, no removal |
| 2 | Features | Add vendor management to `ALL_FEATURES` accordion (1 entry) | Additive only |
| 3 | Features | Add polls to `ALL_FEATURES` accordion (1 entry) | Additive only |
| 4 | Features | Add vows & speeches to `ALL_FEATURES` accordion (1 entry) | Additive only |
| 5 | Features | Add moodboard to `ALL_FEATURES` accordion (1 entry) | Additive only |
| 6 | Features | Add daily update / AI briefing as a feature highlight block | Unique differentiator, Ava-adjacent — natural fit near `AvaSpotlightSection` |
| 7 | Features | Add Guest Suite block (bundle: website builder + accommodation + transport + experience) | Biggest Ultra differentiator — deserves its own deep-dive block |
| 8 | About | Shorten DELIVERABLES to remove items now covered on Features; consolidate duplicated descriptions | Removes redundancy without changing brand voice |
| 9 | Home | Add brief Guest Suite / website builder mention near `FeatureInvitations` section | Surfaces Ultra value prop higher in the funnel |
| 10 | Contact | Add "Guest Suite" and "Website builder" to the Interests checkbox list | Low-risk form addition |
| 11 | Pricing | Add catchall line to Pro tier listing for styling/beauty/food & beverage/ceremony/honeymoon/moodboard/more | One sentence, no structural change |
| 12 | All pages | Audit and apply consistent Ultra badge component wherever Ultra features are named | Visual consistency pass |
