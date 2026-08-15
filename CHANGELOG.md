# Changelog

All notable changes to Openinvite, one line per merged PR. Newest first.
Dates are merge dates. Generated from `gh pr list --state merged` — see
`git log`/the PR itself for full detail on any entry.

## Highlights

- **2026-08-09/11 — universe re-theming, Ava Studio (built then parked), and
  RLS hardening**: all 8 universe asset-preview components re-themed per
  the couple's chosen universe (#384), then deepened with real
  per-universe accent colors and destination photography instead of a
  shared stock couple photo (#402, #404); Ava Studio's guided 7-step setup
  journey was built, given a photography-forward experience overhaul, then
  parked for post-launch per owner decision — code kept, entry points
  removed (#395, #396, #398, #400); the universe picker's save/select flow
  was fixed so a couple's pick actually registers (#383, #394); a
  same-session security audit found 29 entities with open (`read: null`)
  RLS and a live plaintext-chat exploit (`StreamChat`) — fix batches
  in progress as of this changelog entry.
- **2026-08-05/09 — onboarding accept-passes, marketing polish, and
  Spotify token leak**: the onboarding wizard went through several
  accept-passes (light-only theme, split-shell layout, Step 5/Cultural
  accordions, real guest-list CSV import, real Places vendor search, an
  onboardingDraft-stuck-at-true incident fix); a SECURITY FIX stopped
  Spotify OAuth tokens leaking to anonymous guest-site visitors (#326);
  the `/tour` product tour page shipped and iterated through 10 visual
  passes; a cash-fund/registry public-site wiring landed with an explicit
  no-money-through-Openinvite design (external payment link only, #304).
- **2026-08-03 — security sweep (Sessions A–C)**: encrypted RsvpResponse
  and GuestContactSubmission PII at rest, added Turnstile to the remaining
  anonymous-write endpoints, made every cron fail closed when `CRON_SECRET`
  is unset, normalized wildcard-CORS on the third-party proxies, fixed a
  family of silent catch-and-redirect failures, shipped HSTS +
  `Content-Security-Policy-Report-Only` with a real allowlist and a
  violation logger (#268), and added an independent activation-mismatch
  alert cron on top of the Stripe webhook (#269).
- **2026-08-01/02 — marketing, pricing, and gifting v2**: USD-first
  pricing, a canonical signup → plan → payment flow, a real gifting
  checkout bridge (buy a plan for someone else, no claim page), and a
  matching marketing/legal/email sweep.
- **2026-07-19/26 — accessibility, notifications, and the July audit**:
  `AUDIT_2026-07.md` landed and its blockers/should-fixes were worked down
  batch by batch — code-splitting, dead-code removal, keyboard support and
  `aria-label`s across every dashboard page, muted-text contrast fixes, a
  full in-app notifications system (bell, prefs, weekly digest cron).
- **2026-07-09/17 — data integrity and RLS**: server-mediated every
  anonymous guest-site data path, migrated unscoped dashboard/builder
  queries to ownership scoping, fixed a tenant-scoping leak, rate-limited
  the public functions, and moved the last hardcoded API key server-side.
- **2026-06/07-early — the universes**: the 10 (later 20, with the Ultra
  tier) aesthetic "universe" website themes were built out one by one —
  Marrakech first as the reference pattern, then Aman, Kyoto, Brooklyn,
  Bali, Paris, Capri, Mykonos, Cape Town — alongside the block builder, the
  real guest RSVP flow, and per-event ("Smart RSVP") support.

## Full log

## 2026-08-11

- #404: Universe asset previews: wire each universe's own imageUrl into the 3 photo-bearing previews (PR B)
- #402: Universe asset previews: deepen token wiring on the 4 thin components (PR A)
- #401: Seating: zoom-aware dot grid, persisted seat-name labels, Add event alignment, standard Auto-allocate button

## 2026-08-10

- #400: Park Ava Studio: remove all in-app entry points, keep the code
- #399: Schedule: split overlapping timeline blocks into lanes instead of overprinting
- #398: Ava Studio: experience overhaul (photography-forward, plan-aware, wedding-aware)
- #397: Marketplace: dedupe vendor adds at the write, seed added state from existing records, rename Save to Add to my vendors
- #396: Ava Studio: next-action highlight on the 4 dashboard-owned steps (PR2)
- #395: Ava Studio: guided 7-step setup journey (PR1 — stepper core)
- #394: Universe step: add per-tile Explore/Select buttons so a couple's pick actually registers
- #393: Home: serve the three Wix full-bleed photos as adaptive WebP
- #392: UniverseMiniHero: restore the Caldo photo from its print master, and fail the build on off-CDN full-bleed images
- #391: Tour: discrete per-section themes with a 400ms cross-fade, replacing the scroll-linked arc
- #390: Onboarding accept-pass: match Universe grid to marketing page, remove quote bubble and dark/light toggle, standard Continue size; Vendor chips + working search
- #389: Onboarding accept-pass: strip em dashes, collapse Step5/Cultural accordions by default, swap Cultural page image, fix shell scroll-trap
- #388: IMAGE_MANIFEST: Tour hero tight framing needs a ~5100px master
- #387: Step 5 accordion + faith/culture dedup: consolidate faith capture into Step 5, trim cultural page to heritage-only
- #385: Hero and end-cap image quality: responsive delivery everywhere, ladder to 3840 for the two print masters
- #384: Universe asset previews: re-theme all 8 preview components per selected universe's own colors/typography

## 2026-08-09

- #383: Universe step: on-brand light tile grid, fix dead save-the-date image, fix broken back-navigation from preview
- #382: Tour: continuous light-to-dark background arc
- #381: Fix onboarding resume-shortcut: restore path on draft resume so completion doesn't silently skip the final save
- #380: Onboarding visual pass: single per-step image, left-aligned split steps, fork card redesign, completion name fix
- #379: reset-test-account.mjs: verify empty via live re-fetch, print before/after count
- #378: Home banner: smaller type, still exactly 5 lines
- #377: Ava rows: align heading and description on their baselines
- #376: Pricing: center the comparison table on the page axis
- #375: Pricing: move the 24-months block directly above the end cap
- #374: About: remove the end cap; page closes on the photo pair
- #373: Swap the About and Tour hero photos, crops re-derived
- #372: Zero-overlay default for heroes and end caps; 0.2 on Features
- #371: Fix onboardingDraft race — completed onboarding left stuck at draft:true (Incident-1 class)
- #370: [9] Vendor step: real Places search + fix save dropping google_place_id/rating/phone/address
- #369: EXPERIMENT — DO NOT MERGE — all hero and end-cap overlays off
- #367: Remove the tracked backlog file
- #366: Tour: print hero with a copy band, and the new end cap
- #365: Universe step: rebuild as /universes-style grid, skip entirely for Pro (Ultra-only feature)
- #364: Nav: lowercase the Features and Pricing paths so active state matches
- #363: US English on Features and the marketing comments
- #362: Add Tour to the public nav
- #361: Tour: shared hero, and a photo pair after scene 04
- #360: Pricing hero: use the print original with responsive delivery
- #359: Features: let the flex-col class stack the deep-dive columns under lg
- #358: Fork step: align 'Let's do it'/'Let's go' pills across uneven card heights
- #357: Choose-plan: tighten spacing so cards fit without scroll on common viewports
- #356: End caps: single-line headings, new Pricing and Universes copy
- #355: Ava: drop the stale demo-block tombstone
- #354: Group A: onboarding split-shell layout (left/right image, coloured logo)
- #353: Home banner: match the hero's viewport height instead of the image ratio
- #352: US English: Personalized recommendations on Home
- #351: End cap: add optional cta, set Features and Ava headings
- #350: Roll the Get started CTA out across the marketing hero pages
- #349: Ava: swap the budget deep-dive photo
- #348: Ava: swap the Smart Budget Tips spotlight photo
- #347: Home Ava block: keep the first sentence, set it on two lines
- #346: Home banner: wrap the statement to 5 lines clear of the subject

## 2026-08-08

- #345: Ava: remove the demo block, it moves to /tour
- #344: Onboarding inspiration step: create MoodboardItem records immediately, matching Moodboard.jsx's own upload pattern
- #343: US English in marketing and auth code comments
- #342: Onboarding guest-list step: reuse the dashboard's real CSV/XLSX import instead of a broken 4-line stub
- #341: Pricing: current-plan pills on the plan cards use textMuted, not textDisabled
- #340: Onboarding cultural/religious step: replace free-text textarea with the canonical faith/culture picker
- #339: Pricing: make the current-plan pills legible on the end cap
- #338: Onboarding budget step: use the shared 18-currency list, not a local 5-entry array
- #337: Fix free trial showing as ended immediately on brand-new accounts
- #336: US English in Home page copy: organized, optimization, analyzed
- #335: About: reframe hero on the couple, owner copy, drop deliverables list
- #334: End-cap: add optional scrim prop, Pricing lightens to 0.35
- #333: Pricing end-cap: re-center the photo crop so both heads stay visible
- #332: Design Studio world view stays full-screen for the whole exploration phase
- #331: Pricing: put the contained sections on one 1100px alignment grid
- #330: Fix mobile horizontal overflow in the Universes editor feature grid
- #329: Guest song-request pipeline: working search, dashboard moderation, Music bridge
- #328: Fix mobile horizontal overflow in the Ava spotlight row grid
- #325: Fix the British spelling failing CI on main

## 2026-08-07

- #327: Spotify PR B: guard search's JSON parsing, delete dead refresh endpoint, fix the lying Connected badge
- #326: SECURITY FIX: stop leaking Spotify OAuth tokens to anonymous guest-site visitors
- #324: Universes CTA: add a background photo with a legibility-tested scrim
- #323: Remove Ultra crown badge from the universe selector tiles
- #322: Swap the Ava end-cap image
- #321: Fix stale-chunk crash after deploys: reload-once on failed dynamic import
- #320: Home pricing pills: equal width and height, shared baselines
- #319: AvaSpotlight intro: match the Universes intro type, centre it between banner and first row
- #318: Diagnostic: beacon the real client-side ErrorBoundary crash to Vercel logs
- #317: Email branding: guest-facing from-name + reply-to
- #316: Ava deep-dives: equal 50/50 columns, alternating image side, mobile stacking
- #315: Email branding: owner-facing copy fixes
- #314: Remove the Features product demo blocks and rebalance the background rhythm
- #313: Swap the Smart Budget Tips photo on Ava
- #312: Pricing gift block: new heading and subtext, drop eyebrow, standard button, lighter overlay
- #311: Swap the Timeline block photo on Features
- #310: Menu Phase 1 (Ultra) — couple-defined guest meal options
- #309: Apply one hero rule: centered text, no CTA except home
- #308: Fix vestigial Guest.meal_choice reads — repoint to live per-event RsvpResponse overlay
- #307: Fix Plus 1 card subtext so every carousel heading shares one baseline
- #306: V10: update /tour commentary copy

## 2026-08-06

- #305: V9: background rhythm, Features grid and frame fill, scroll-linked parallax on /tour

## 2026-08-05

- #304: Cash fund + registry public-site wiring (Option A: external payment link, no money through Openinvite)
- #303: V7: restate page titles as Openinvite | Page, remove app from titles and descriptions
- #302: V8: vertically center the home carousel cards below the fixed nav
- #301: T2: build the product tour page at /tour with placeholder frames
- #300: V4b: About closes on the shared marketing end-cap
- #299: V5: swap About hero image, restore the two origin-story paragraphs

## 2026-08-03

- #269: Add activation-mismatch alert cron + rollback runbook
- #268: Add HSTS + CSP-Report-Only security headers, CSP violation logger
- #267: Normalize the 7 wildcard-CORS Places/Spotify/stock-search proxies
- #266: Cron endpoints fail closed in production when CRON_SECRET is unset
- #265: Add Turnstile to collect-guest-contact.js and rsvp-poll-vote.js
- #264: Fix silent catch-and-redirect family; add a real no-empty CI guard
- #263: Fix Account.jsx silent checkout/portal failures; route Google Maps key server-side
- #262: Document PR 1c: Guest RLS-bypass experiment result (confirmed negative)
- #261: Encrypt GuestContactSubmission PII; move approve/merge/dismiss server-side
- #260: Encrypt RsvpResponse PII: hash guest_id, encrypt song_request/note/dietary/email
- #259: Onboarding completion flow: retry the verify-read, land on DailyUpdate, account-scope TipsModal
- #258: Choose-plan redesign: rebuild against marketing pricing page components
- #257: Onboarding theme unification: whole wizard light, matching marketing site
- #256: Onboarding content refresh: single-source universe catalog, persist style/ceremony/vibe selections

## 2026-08-02

- #255: chore: generalize reset-test-account.mjs into the standard test-account tool
- #254: G4 v1: gifting checkout bridge (real gift purchase, no claim page needed)
- #253: G3: email overhaul (colour logo, fix fictional Ultra features, remove emojis)
- #252: G2: remove AUD mentions from marketing copy, FAQ, JSON-LD, and llms.txt (USD-only display, AUD checkout stays functional)
- #251: G1 follow-up: correct ISOLA Cloudinary asset ID
- #250: G1: marketing fixes — hero wrap, photo swaps, pricing CTA/table bugs, banner fixes
- #249: B4: welcome email wired up, unified email brand template, em-dash sweep
- #248: B3: contact collector — /w/:slug/collect form, review panel, GuestContactSubmission entity
- #247: B2: add /gifting page, footer link, and pricing-page gift moment
- #246: B1: add 10 distinct universe entrance transition animations
- #245: B0: correct stale onboarding-cron bug docs, verify live in prod, fix ship.sh PR title bug
- #244: Add site header and remove photo overlay text on auth pages (A3)
- #243: Cloudinary compression audit: add f_auto,q_auto to remaining marketing images
- #242: Legal and email sweep: hello@ everywhere, ACL-compliant refund wording, collab@ contact
- #241: Fix cross-account daily-briefing cache leak on shared browsers
- #240: Fix onboarding wizard bounce: missing isOnboardingComplete import

## 2026-08-01

- #239: Document Base44 workspace MCP query_entities User-lookup path
- #238: Marketing PR A2: heroes, banners, and line-length audit
- #237: Marketing PR A1: layout and consistency fixes
- #235: Fix paying-customer onboarding gap, add password visibility toggles (PR7)
- #236: Add launch checklist: webhook destination URL must match canonical www domain
- #234: Gift and promo codes: allow_promotion_codes on existing checkout
- #233: USD-first pricing pivot: Pro US$49 / Ultra US$99, canonical everywhere
- #231: Auth reskin: split layout with photo carousel for Register/Login
- #230: Hero consistency: shared MarketingHero component across Features/Ava/Universes/Pricing
- #232: Logged-in marketing behavior: quiet nav icon, in-app upgrade routing
- #229: Marketing polish: copy sweep, banner centering, homepage overflow fix, universes cleanup
- #228: Canonical signup flow: fix dead redirectToLogin CTAs, gate plan choice on account state, route payment through registration

## 2026-07-28

- #227: Marketing visual cleanup: About/Features/Ava/Universes hero and CTA simplification
- #226: Harden Ava capture flow against stale TipsModal overlay and /DailyUpdate landing route
- #225: Fix Dashboard duplicate TipsModal mount blocking clicks (incl. Ava)

## 2026-07-27

- #224: Fix CountUp stat animation getting stuck near 0 on 16 dashboard pages
- #223: Fix marketing site: hero copy, scroll cue, pricing table centering, feature accent line (PR7)
- #222: Migrate hand-rolled modals onto shared Dialog/Sheet wrapper (PR1b)

## 2026-07-26

- #221: Add multi-event seating: event tabs, per-event guest pools, copy layout, Table/VenueAsset event_id (PR6)
- #220: Redesign Recent activity: category icons, human copy, deep links to specific items (PR5)
- #219: Deliver guest message replies via email, honest WhatsApp labels (PR4b)
- #218: Add run sheet CSV export and full/per-event .ics calendar downloads (PR4a)
- #217: Wire Transport shuttles and Attire tailor onto shared Vendor pattern (PR3c)
- #216: Migrate Photographer entity into Vendor (PR3b)
- #215: PR3a: extract VendorRosterSection, rewire Beauty/Music, stronger vendor pattern CI guard
- #214: PR2: Design Studio header pinning fix, Budget plan real data + CountUp non-determinism fix
- #213: PR1: guest list tag hover, filter pill sizing, Ava modal + Ava naming sweep, Quick tips flatten, Pinterest relabel

## 2026-07-24

- #212: Hotfix: fix stale prerendered asset references breaking production
- #208: AEO/SEO PR2: FAQ page with FAQPage structured data, linked in footer
- #211: Round 8 PR3: fix guest data coherence (event_responses now populated for every invited guest, not just 12%), reconcile header counts with plus-one breakdowns, add per-event RSVP filter with Recovery Brunch as the second-event scenario

## 2026-07-23

- #210: Round 8 PR2: daily update numeral safety net on cache reads, Design studio header collapsed to one compact row, background music surfaced in website builder Settings, seamless canvas sections with hover-only add affordance, alphabetized theme options, sortable My vendors table
- #209: Round 8 PR1: pricing table alignment, footer cleanup, Contact TikTok icon, Features accent-line consistency, auth pages fit viewport + correct logo, flat Quick tips CTA
- #207: AEO/SEO PR1: build-time prerendering for marketing routes, per-page metadata, robots.txt, sitemap.xml, Organization/SoftwareApplication structured data, llms.txt, homepage answer capsule
- #206: Round 7 PR4: video sound unmute, invite background music, who's-coming guest experience toggles
- #205: Round 7 PR3: cultures and traditions picker, Ava culture awareness, Ava individual guest lookup
- #204: Round 7 PR2: universe placeholders, search result highlight/scroll, numeral copy, studio header height, quick tips rewrite, vendor favourites
- #203: Round 7 PR1: cinematic mini-hero, solid CTA fills, About/Contact photo & layout redesign
- #202: Add London universe photography, replacing interim placeholder everywhere it appears
- #201: Dashboard round 6, PR C: visual consistency and polish
- #200: Dashboard round 6, PR B: modals + structural vendor-pattern consolidation

## 2026-07-21

- #199: Dashboard round 6, PR A: fix top-bar search and white-flash navigation
- #198: Add route-collision guard, fix two dead-code route duplicates
- #197: Dashboard/app fixes: routing bug, activity feed, guest tags, Attire rebuild, vendor consistency
- #196: Marketing cleanup round 5: single-colour headings, photo swaps, Ava revert
- #195: Marketing round 4 follow-ups: mini-hero, Ava banner, cleanup
- #194: Marketing round 4: contact form, photo swaps, universe fixes, cleanup
- #193: Add seed-demo-data.mjs (already run) — populate John & Suzanne demo data
- #192: Rename Aman universe to London (trademark caution)

## 2026-07-20

- #189: Add CI: build, lint, credential-free tests, marketing-routes
- #190: chore: fix lint backlog (unused imports + eslint config)
- #188: Weekly digest: real logo and recommended actions
- #187: chore: remove one-off digest-preview endpoint
- #186: chore: dedicated secret for digest-preview endpoint
- #185: chore: temporary one-off weekly digest preview send
- #184: Fix send-onboarding-emails.js: never-fixed 401 on user listing
- #183: Notifications Part 5: weekly digest cron
- #182: Notifications Part 4: event wiring (RSVP, plus-one, collaborator, questionnaire)
- #181: Notifications Part 3: live bell UI (unread badge, dropdown, mark-read)

## 2026-07-19

- #180: Modal focus management: focus trap, Escape-closes, return focus
- #179: Notifications Part 2: User.notification_prefs + Account page section
- #178: Notifications Part 1: Notification entity + recipient-scoped RLS
- #177: PR H: fix Home.jsx gradient banner text contrast
- #176: PR G: migrate gray-400/gray-500/#888/#999/#aaa onto design tokens
- #173: PR F4: keyboard support + aria-labels — guest-facing + misc pages
- #174: PR F3: keyboard support + aria-labels — dashboard/account/shared modals
- #172: PR F2: keyboard support + aria-labels — wedding detail form pages
- #175: PR F1: keyboard support + aria-labels — website builder/studio area
- #171: Fix User.tempUnit/deletionRequestedAt false positives in schema audit
- #170: Fix dropped Note.status/view_type schema, correct Music.source false positive
- #169: Fix schema drift: restore 3 reverted WeddingDetails fields, stale test, drift guard
- #168: Audit cleanup batch E: role-aware alt text on venue/album-art images, seating chart mobile notice
- #167: Audit cleanup batch D: delete dead pages, add DashboardPageHeader to 3 Studio pages
- #166: Audit cleanup batch C: lift useCollaboratorContext into a single Context provider
- #165: Audit cleanup batch B: Dashboard toast.error on fetch failure, fix false-empty flash on Budget/Schedule/Vendors
- #164: Audit cleanup batch A: parallelize collaborator fetches, lazy-load grid images, fix onboarding timer leak, remove sensitive checkout logs
- #163: api/places.js: document mock-fallback, log every trigger
- #162: Layout.jsx: cache app-shell data with React Query
- #161: Collapse dual routing mechanism into one canonical URL per page
- #160: Fix muted-text contrast: 0.4 -> 0.6 alpha, WCAG AA 4.5:1
- #159: Consolidate RSVP tally logic into one shared utility
- #158: Fix accessibility blockers: sidebar, bell, menu, Ava toggle
- #157: Route-level code splitting: 5.2MB bundle -> 221 chunks
- #156: Remove 79 dead component files and 11 unused npm dependencies
- #155: Fix silent checkout failure in the in-app upgrade path
- #154: Add full codebase audit findings doc (AUDIT_2026-07.md)
- #153: Make Sentry replay masking explicit (maskAllText, blockAllMedia)
- #152: Add COOP + CORP security headers; skip COEP
- #151: Rate-limit 5 remaining unprotected endpoints

## 2026-07-17

- #150: fix: gate Afterpay/Clearpay to AUD-only checkout sessions
- #149: Marketing site round 3: owner feedback
- #148: Marketing site round 2: owner feedback pass (ready for review)
- #147: Hotfix: /ava production crash + mobile nav overlap
- #146: Product visual capture pipeline: real screens/videos on the marketing site

## 2026-07-16

- #145: Marketing site overhaul — one visual system, real content
- #144: feat: collaborators get the real dashboard, not an orphan page
- #140: feat: Manage Collaborators — real invite/accept/permission enforcement
- #143: fix: guest questionnaire answers were silently failing (500)
- #127: mock: three Design Studio redesign directions (Gallery / Tile+World / Entrance)
- #139: feat: give plus-ones their own RSVP identity
- #138: feat: sortable guest table + unify guest list/seating table assignment
- #142: chore: consolidate Overview into Design Studio
- #141: fix: Design Studio back button position + kill selector-wall fade-in
- #137: fix: stop persistence test harness from leaking records into production
- #136: Mock: shared vendor-template for Styling/Beauty/Food & beverage/Photography
- #135: Add Gravatar avatars for guests + optional RSVP email capture
- #134: Add Pexels stock photo search to the media library picker
- #133: Rename Guest polls to Polls & games; add private game questionnaires
- #132: Restructure Music page into tabs; add Apple Music/YouTube link-paste
- #131: Add shared upload-feedback UI and guest-site loading skeleton

## 2026-07-15

- #130: fix: universe experience — data guard, photos, real root-caused centring/back-button bugs, copy rewrite
- #129: feat: add 10 new Ultra universes (Amalfi, Sedona, Aspen, Taj, Havana, Edinburgh, Monaco, Florence, Seoul, Shanghai)
- #128: feat: rebuild Design Studio around direction C (entrance)
- #126: feat: location controls for vendor search — my location, event venue, online services
- #125: fix: event cards with no photo are clean text cards, not a broken slab
- #124: fix: merge 'Key roles' and 'Wedding party' tabs into one
- #123: fix: individual seats are selectable; remove Import layout for now
- #122: fix: new guests land at bottom of list; move Dietary into expanded row
- #121: fix: stop rendering Transport note to guests; relabel dashboard field; drop Crisp from privacy/cookie policy
- #120: fix: remove Crisp chat, default Schedule to Calendar, reframe Transport to wedding party
- #119: fix: webhook must not 200 a paid session it failed to activate
- #118: fix: move Collaborate out of the avatar dropdown into the sidebar
- #117: feat: rebuild Account into one tabbed page (Settings / Billing / Security)
- #116: fix: valid PWA manifest, audit app-logs/analytics console noise
- #115: hotfix: fix production white-screen — Map icon shadowed global Map constructor
- #114: feat: rebuild vendor marketplace on real Google Places data, remove enquiry form
- #113: feat: wedding-day weather in the top bar countdown
- #112: feat: wire wedding theme/context into Ava's AI features
- #111: fix: refresh Quick Tips and Help Centre content to match current product
- #110: fix: avatar dropdown 404s, duplicate sidebar link, Guest Suite back-nav orphan
- #109: Dashboard structure cleanup + guestbook removal
- #108: Make selected table obvious and let tables be renamed anytime
- #107: Fix modals centering on the scrolled page instead of the viewport
- #106: Overhaul the guest list into a Monday.com-style editable table

## 2026-07-14

- #105: Entrance moment: first-visit reveal for the published wedding site
- #104: Sync published site with builder; fix universe-blind swatches; compact font picker
- #103: Expand block styling controls and font system (v2)
- #101: feat: curated per-block styling + fix the inert font system
- #98: fix: make the add-block control clear, prominent, and insert-anywhere
- #97: feat: re-introduce the block builder — freedom within beauty
- #96: feat: complete the payment/subscription flow
- #95: fix: build a real per-page content-editor panel

## 2026-07-13

- #94: fix: restore working content editing with a real per-field panel
- #93: fix: eliminate the last divergent render path (full-screen Preview)
- #92: fix: builder preview renders the real published tree, not the section canvas
- #91: fix: add missing RSVP CTA to the default home layout (Tulum)
- #90: feat: rebuild Paris, Capri, Mykonos, and Cape Town — the final four worlds
- #89: feat: rebuild Kyoto, Brooklyn, and Bali as three fully realised worlds
- #88: feat: rebuild Aman as the minimal-pole world (layout, motif, palette, motion, copy)

## 2026-07-12

- #87: feat: rebuild Marrakech as a fully realised universe (editorial-masthead layout)
- #86: fix: Guide and Getting Here pages now use the themed component tree
- #85: fix: published guest site renders real interactive pages, not builder mockups
- #84: Make the wedding asset system real and exportable
- #83: Fix universe-picker id mismatches and asset-save integrity
- #82: Universe cleanup batch: dead code, distinctness, texture/motion

## 2026-07-11

- #81: Fix and complete the video hero
- #80: Wire the real guest RSVP page into universe theming
- #79: Wire real per-universe colour palettes

## 2026-07-10

- #78: Migrate RSVP responses to dedicated entity, off Guest
- #77: Migrate poll votes/comments to dedicated entities
- #76: Rate-limit 6 unprotected public functions, gate Spotify token refresh

## 2026-07-09

- #75: Add per-universe styling system: fonts, texture, motion, builder parity
- #71: Server-mediate every anonymous guest-site data path
- #74: Migrate unscoped dashboard/builder queries to ownership scoping
- #73: Fix Spotify OAuth CSRF exposure + resolve jspdf critical
- #72: Rewrite legal pages to match the real product, fix wrong domain site-wide

## 2026-07-08

- #70: Require auth on send-invites/send-email/create-portal-session, add Turnstile to rsvp-link-request
- #69: Move hardcoded Google Maps API key to env var
- #68: Split test-persistence.mjs into per-domain files
- #67: Fix remaining UX_INTRICACIES.md top-10 findings
- #64: Fix send-flow gaps: type-switch defaults, banner image, editable invites later

## 2026-07-07

- #66: Fix silent onboarding save failure and add resume-after-refresh
- #65: Fix tenant-scoping leak in LiveStream lookups
- #63: Consolidate email sending into one previewed, split-pane system

## 2026-07-06

- #61: Universe-styled invitation and reminder emails
- #60: Unify Guest list + Invitations into one Guests hub
- #59: fix: derive rsvp_status from per-event responses, surface per-event answers in GuestList
- #58: fix: post-login/register redirect to /Dashboard instead of /
- #56: feat: guest styling questionnaire (roadmap D2, rules-based)
- #54: feat: virtual guestbook (roadmap D4)
- #52: feat: per-event RSVP — couple-side invite checkboxes + guest-side per-event form (SMART_RSVP_MODEL.md PR 3+4)

## 2026-07-05

- #50: fix: resolve wedding/invitation records by ownership, not global most-recent
- #55: fix: sync base44/entities/*.jsonc docs to the now-healed live schema
- #53: feat: texture token system, procedural library step 1 (TEXTURE_LIBRARY_SPEC.md C3)
- #51: fix: retire legacy GuestRSVP path, route to canonical token flow
- #49: feat(rsvp-pr2): register Guest.event_responses — Smart RSVP per-event matrix

## 2026-07-03

- #48: fix: converge published-site RSVP on canonical token flow, stop silent data loss

## 2026-06-10

- #47: feat(rsvp-pr1): stable event_id on embedded events — Smart RSVP prerequisite
- #46: fix: Aman grain — 0.08 → 0.025 (barely-there); extract to --universe-grain-opacity CSS var
- #45: feat: Guest Suite — replace overview strip with split hero card (venue photo, countdown)
- #44: feat: Schedule — rename 'Visual builder' tab to 'Timeline'; add info banner
- #43: feat: sort event cards chronologically within each group (main and additional)
- #42: feat: replace time text inputs with dropdown pickers (15-min increments, underline style)

## 2026-06-06

- #41: fix: event time persists — explicit save with computed nextData; lowercase am/pm
- #40: feat: event cards — horizontal card layout with right image panel

## 2026-06-05

- #39: feat: Celebration page — editorial day-grouped layout with side-photo cards
- #37: fix: builder preview shows real data — reuses published page components
- #38: feat: Events UI — modal + card pattern matching My Vendors

## 2026-06-04

- #36: fix: published site renders all builder sections; preview buttons flush save
- #35: fix: typography fonts now actually load — <link> in head, builder preview fixed
- #34: fix: wire typography — font selection now drives the published site
- #33: fix: Aman texture/motion polish — hooks above early returns, grain at 6%
- #32: feat: Aman texture/motion Phase 2 — grain, scroll reveals, page transition
- #31: feat: universe as prominent Design panel master — theme demoted to optional refinement
- #30: feat: Aman universe selection now drives the public website palette (keystone slice 1)
- #29: fix: remove Timeline view tab, rename List view → Run sheet
- #28: fix: Schedule page layout order — header → stat cards → action bar → tabs (matches Budget)

## 2026-06-03

- #27: feat: consolidate Checklist + TodoList into tabbed TasksHub (To do · Checklist)
- #26: fix: flatten Schedule double tab-bar → single row (Calendar · Visual builder · Timeline · List · Considerations)
- #24: feat: consolidate Calendar + Schedule into tabbed ScheduleHub
- #23: fix: reorganise sidebar — group order, item order, 4 renames
- #22: feat: full Attire planning panel — outfits, tailor, fittings, accessories
- #21: fix: eliminate stale-closure data drops in Catering (latestFabRef pattern)
- #20: fix: unify save pattern across 5 planning pages — visible Save button replaces autosave and per-section buttons
- #19: fix: Catering autosave on input change; add missing Select/Input imports to Styling
- #18: fix: register 7 WeddingDetails planning fields in Base44 schema — foodAndBeverage, photography, attire, flowers, decorations, beauty, entertainmentDetails were silently dropped
- #16: fix: register Guest.invite_sent_at, invite_channel, reminder_sent_at — invite-tracking dashboard was always showing Not Sent
- #15: fix: register Guest.song_request, rsvp_note, poll_votes in Base44 schema — RSVP data was silently dropped
- #13: fix: write onboarding guest count to canonical WeddingDetails.guestCount+guestType; wire expected count into global Ava context
- #12: feat: onboarding polish — flat #E03553 pills (14), hero 2-line break, date spacing, Ava location copy
- #11: fix: route login to /onboarding when account has no wedding data
- #10: fix: unify onboarding flag casing — Dashboard.jsx reads onboardingCompleted (camelCase) to match Onboarding.jsx; register field in User schema; add reset:test script and npm run reset:test
- #9: feat: consolidate theme into WeddingDetails.theme.* — retire standalone Theme page + enrich global Ava

## 2026-06-02

- #5: refactor: consolidate Event Details data model — single dress code per event, endTime editable in Event Details, Event Details sole writer of event facts, dead field cleanup
- #7: fix: Experience Guide Places — own guide state locally so adds appear immediately and sequential adds don't overwrite each other
- #4: feat: button-after-selection, add manually, and use-my-location on Experience Guide Places tab
- #3: feat: add 'Add manually' + 'Use my location' to Accommodation and Transport add panels
