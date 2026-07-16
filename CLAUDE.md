# Claude Code Instructions — Openinvite

## Read first
Before making ANY change, read DESIGN_SPEC.md in the 
project root. All changes must comply with it.

Before touching RLS, the admin key, or any admin-key-backed api/*.js
endpoint, read BASE44_PLATFORM_NOTES.md — empirically established Base44
platform behavior (what the admin key can/can't do, the create:null +
hashed-identifier pattern, the User-entity auth quirk, schema drift, env
var sourcing). Update it when you learn something new the same way.

## Rules
- Sentence case everywhere — no ALL CAPS, no Uppercase Every Word
- No text-transform: uppercase anywhere in CSS or JSX
- No box-shadow on cards
- No rounded corners except buttons and pills (border-radius: 999px)
- Every dashboard page must use DashboardPageHeader component
- All data via base44.entities.* authenticated client only
- No imports from @/entities/* — use base44.entities.* instead
- Font: Plus Jakarta Sans, always
- Muted text: rgba(10,10,10,0.4) — never #888 or gray-400/500
- All accordions: defaultValue={[]} (collapsed by default)
- Primary colour: #E03553
- Black: #0A0A0A

## After every change
- Run npm run build and confirm exit 0
- Work on a feature/fix branch — NEVER commit or push directly to main
- Open a PR with ./scripts/ship.sh and let the Vercel preview deploy before merging
- If a new pattern was introduced, update DESIGN_SPEC.md

## Definition of done — READ THIS
A task is NOT done until it is merged to main AND verified working on openinvite.com.au.
- "Build passes" is NOT done.
- "PR opened" is NOT done.
- Done = merged to main + live site confirmed.

## PR rule — same session, no exceptions
Every PR must be merged or closed in the SAME session it is opened.
Never leave a PR open at the end of a session. Never start a new task with an open PR pending.
If a PR can't be merged yet (conflict, needs review), say so explicitly — don't move on silently.

## Start of every session
Run `gh pr list` first. If any PRs are open from a previous session, surface them to the user immediately before doing anything else. Do not let open PRs go unnoticed.

## File structure
- Layout shell: src/Layout.jsx
- Sidebar: src/components/layout/AnimatedSidebar.jsx  
- Page header: src/components/layout/DashboardPageHeader.jsx
- Global styles: src/index.css
- Design tokens: src/styles/tokens.js
- Base44 client: src/api/base44Client.js

## Branching — mandatory
- Always work on a feature/fix branch, never directly on main
- Start work: ./scripts/new-feature.sh <name>
- Ship work: ./scripts/ship.sh "commit message"  (build check → commit → push → PR)
- Full workflow documented in WORKFLOW.md

## Project facts
- Stack: React + Vite + Tailwind + shadcn/ui
- Backend: Base44 (entities accessed via base44.entities.*)
- Hosting: Vercel Pro — openinvite.com.au is production (main branch)
- Every pushed branch/PR gets an automatic Vercel preview URL
- main = production; must always be deployable

## Do NOT touch without explicit instruction
- Stripe / payment files (api/create-checkout-session.js, api/webhooks/stripe.js, etc.)
- Auth / login flow (src/lib/AuthContext.jsx, src/components/auth/)
- Email sending functions (api/send-*.js, api/emails/)

## Google Places integration
- Server-side proxy only: api/places.js and api/places-search.js
- Key: GOOGLE_PLACES_API_KEY (server env var, never exposed to browser)
- NEVER use a VITE_GOOGLE_* client-side key — it would be bundled into the browser JS
- Photo URLs: store the raw photo_reference string; render via /api/places-photo?ref=...

## Base44 data — Guest Suite
- ALL Guest Suite data persists to the WeddingDetails entity in Base44
- Fields used: guestSuiteAccommodation.places[], guestSuiteTransport.{places[],notes[]},
  weddingPolicies, emergencyContacts, dayVendorContacts, experienceGuide (all sub-fields),
  accommodation, transport, music, qna, pageSections
- The website builder pages (WeddingStayPage, WeddingTransportPage, WeddingExperiencePage)
  and the builder preview (WBWebsitePreview) read from THESE SAME FIELDS — single source
- If a new Guest Suite page stores data in a new field, ADD THAT FIELD TO THE BASE44
  ENTITY SCHEMA before releasing (unknown fields are silently dropped by Base44)
