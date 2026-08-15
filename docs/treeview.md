# Repository tree view — annotated

Orientation map for a new engineer. Grouped by directory, not exhaustive file-by-file — significant individual files are called out where it matters.

## 1. Top-level architecture

React + Vite SPA frontend in `src/`, talking to a Base44 backend-as-a-service (entities defined in `base44/entities/`, accessed via the authenticated `base44.entities.*` client — never a direct `@/entities/*` import). Vercel-hosted serverless functions live in `api/` — these are the only place the Base44 **admin key** and Stripe secrets are used; the browser never sees them. Static/marketing assets live in `public/`, with a `prerendered/` directory holding pre-generated marketing HTML snapshots (kept in sync via a CI guard — see `scripts/`). `dist/` is the Vite build output (generated, not source). `scripts/` holds the dev workflow (`new-feature.sh`/`ship.sh`) and a battery of CI-time correctness checks. `tests/persistence/` holds a Base44-backed integration-test suite distinct from the CI scripts.

## 2. `src/` breakdown

- **`src/App.jsx`** — the full route table. Single source of truth for what's routed where, including the split between the couple's dashboard, the public guest site (`/w/:weddingSlug*`), and marketing pages. Read this first to understand what's actually live vs. dead code elsewhere in the tree.
- **`src/Layout.jsx`** — the dashboard shell (sidebar + top bar) every authenticated page mounts inside. Notably renders its children twice (desktop + mobile trees) — a known footgun for anything with side effects/portals.
- **`src/main.jsx`** — Vite/React entry point.
- **`src/pages/`** (98 files) — one file per route, both dashboard pages (Guests, Budget, Vendors, EventDetails, AvaStudio, UniverseStudio, StudioHub, StudioGuestSuite, Account, …) and the small number of dedicated guest-only routes (`GuestAccommodation.jsx`, `GuestMusic.jsx`, `GuestCollect.jsx`). Some files here (e.g. `WeddingWebsite.jsx`) are **not routed** in `App.jsx` and are dead code — check the route table, not just file existence, before trusting a page is live.
- **`src/components/`** — grouped by feature area, not by type:
  - `guest-website/` — the actual live public guest site renderer (`MultiPageWeddingWebsite.jsx` and its `pages/`/`blocks/`/`layouts/` subtrees). This is what a wedding guest sees at `/w/:slug`.
  - `guest-suite/` — the **couple's dashboard builder** for guest-facing content (policies, experience guide, accommodation/transport curation). Despite the name, these are authenticated dashboard components, not guest-facing pages themselves.
  - `guest-experience/` — guest-facing experience-guide widgets (interactive map, etc.), consumed by the guest site.
  - `onboarding/` — the signup wizard's step components, orchestrated by `src/pages/Onboarding.jsx`.
  - `universe-studio/` — the "Design Studio" universe picker/world-view experience, including `assets/` (the 8 per-universe asset-preview cards — Save the Date, Menu, Seating, etc.).
  - `studio/` — Guest Suite builder tabs (website/assets/policies/share) and universe-selection modals.
  - `website-builder/` — the real website/asset editor components (right panel, media library, per-asset preview renderers distinct from the universe-studio picker previews).
  - `layout/` — dashboard chrome: `AnimatedSidebar.jsx` (nav), `DashboardPageHeader.jsx` (mandatory per-page header per project convention), `AvaModal.jsx`.
  - `ui/` — shadcn/ui primitives (button, dialog, input, select, etc.) — the shared `dialog.jsx` is the single source of the 16px modal-radius convention.
  - `dashboard/`, `guests/`, `budget/`, `schedule/`, `seating/`, `vendors/`, `music/`, `moodboard/`, `styling/`, `registry/`, `messages/`, `notes/`, `rsvp/`, `vows/`, `event-details/`, `games/`, `invitations/` — one directory per dashboard feature area, mostly self-explanatory from the name.
  - `home/`, `marketing/`, `public/` — the marketing site (landing page, features, pricing, etc.) and its shared public-facing chrome (`PublicNav`, `PublicFooter`).
  - `mocks/` — early visual-direction mockup components, largely superseded.
  - `shared/` — cross-cutting small components (`AvaButton`, `PageConsiderations`, `CountUp`, `DatePicker`, `VenueSearchPanel`, etc.).
- **`src/lib/`** — the bulk of the app's non-UI logic, flat directory, ~65 files. Notable ones:
  - `resolveMyWedding.js` — the account-scoping helper every dashboard page uses (`getMyWeddingDetails`, `getMyRecords`, `getMyGuestsWithRsvp`) to resolve "the logged-in user's own records." **Client-side scoping only** — see `BASE44_PLATFORM_NOTES.md`/recent security audit findings for why several entities' backend RLS doesn't itself enforce this.
  - `weddingBySlug.js` — the server-mediated equivalent for the **anonymous guest site** (`fetchWeddingBySlug`, calls `api/wedding-by-slug.js`).
  - `websiteThemes.js` — `UNIVERSE_CONFIGS`, the single source of truth for all 20 universes' design tokens (colors, typography, motion, copy, imagery).
  - `universeCatalog.js` — thin display/ordering layer over `UNIVERSE_CONFIGS` for the picker UI; never hardcodes a color/font itself.
  - `universeStyling.js` — resolves a wedding's active universe into concrete `theme`/`typography` objects for builder surfaces.
  - `setupJourney.js` — `JOURNEY_STEPS`, the single shared definition of the "empty → launched wedding" critical path (7 steps, ordered — the array order is itself the "what's next" priority), consumed by `AvaStudio.jsx`.
  - `avaStudioCopy.js` — deterministic (non-LLM) per-step personalized copy templates for Ava Studio.
  - `guestImport.js`, `rsvpAggregation.js`, `guestRsvpTally.js`, `tableAssignment.js`, `seatingChart.js` — guest list / RSVP / seating business logic.
  - `onboardingSave.js` — builds the final `WeddingDetails` payload the onboarding wizard writes on completion.
  - `checkoutSession.js` — client-side Stripe checkout kickoff helper (pairs with `api/create-checkout-session.js`).
  - `AuthContext.jsx`, `collaboratorContext.jsx` — React context providers for the logged-in user and collaborator-permission state respectively.
  - Various `*EmailTemplate.js` files — HTML string builders for transactional emails (paired with `api/emails/*.js`/`api/send-*.js`).
- **`src/hooks/`** — small reusable hooks: `useFileUpload.js` (client-side upload validation wrapper), `useAvaFocus.js` (the "next action" highlight mechanism for Ava Studio's guide-and-route links), scroll/animation hooks for the marketing site.
- **`src/contexts/`** — `CurrencyContext.jsx` (display-currency preference).
- **`src/integrations/Core.js`** — the Base44 platform integration surface (file uploads, LLM invocation) used via `base44.integrations.Core.*`.
- **`src/styles/`**, **`src/utils/`** — design tokens (`tokens.js`, referenced by CLAUDE.md's alpha-value rules) and small pure utilities.

## 3. `api/` breakdown

Vercel serverless functions, Node runtime. Grouped by purpose:

- **Webhooks**: `api/webhooks/stripe.js` — the Stripe payment webhook (signature-verified, fail-closed in production). **Payments path — treat as frozen, do not modify without explicit instruction.**
- **Payments/checkout** (also payments path, same hands-off rule): `api/create-checkout-session.js`, `api/create-portal-session.js`.
- **Guest-facing (anonymous) endpoints** — the server-mediation layer that lets an unauthenticated guest safely interact with a wedding's data without exposing the raw entity: `api/wedding-by-slug.js`, `api/rsvp-lookup.js`, `api/rsvp-submit.js`, `api/rsvp-link-request.js`, `api/rsvp-poll-vote.js`, `api/wedding-poll-vote.js`, `api/wedding-poll-comment.js`, `api/wedding-poll-results.js`, `api/wedding-attendees.js`, `api/song-request-submit.js`, `api/collect-guest-contact.js`, `api/questionnaire-answer-submit.js`, `api/questionnaire-lookup.js`, `api/collaborator-lookup.js`, `api/collaborator-accept.js`.
- **Admin endpoints**: `api/admin/stats.js` — the only admin-only surface in the app; independently re-verifies caller identity server-side (not just a client-side gate).
- **Owner-facing data-review endpoints** (authenticated couple, but proxy through the admin key for entities the couple's own token can't fully read/decrypt): `api/my-guests-rsvp.js`, `api/song-request-review.js`, `api/questionnaire-responses-for-owner.js`, `api/guest-contact-review.js`.
- **Collaborator management**: `api/collaborator-*.js` (context, data, budget, guests, invite-related).
- **Internal helper libraries — `api/_lib/`** (not routes themselves, imported by the endpoints above): `security.js` (write-time HTML-stripping sanitizer), `guestSafeWedding.js`/`guestSafeRegistry.js` (the field-allowlist layer that keeps owner-private `WeddingDetails`/registry fields out of anonymous guest responses), `rsvpAuth.js`/`pollAuth.js`/`collaboratorAuth.js`/`questionnaireCrypto.js`/`giftAuth.js` (the hashing/encryption helpers — HMAC-SHA256 for identifiers, AES-256-GCM for content — backing the "open-read entity, but only hashed/encrypted fields" pattern used across several Base44 entities), `base44Admin.js` (admin-key REST client), `planPricing.js`/`productData.js`, `notify.js` (internal notification dispatch), `spotifyAuth.js`, `auth.js`.
- **Email sending — `api/emails/`**: `purchase-confirmation.js`, `gift-receipt.js`, `gift-reveal.js`, `onboarding-day1.js`/`day3.js`/`day7.js` (drip sequence). Plus top-level `api/send-email.js`, `api/send-invites.js`, `api/send-guest-reply.js`, `api/send-collaborator-invite.js`.
- **Third-party integrations**: `api/place-details.js`/`places.js`/`places-search.js`/`places-photo.js` (Google Places server-side proxy — the app deliberately never exposes a client-side Google key), `api/spotify-*.js` (Spotify OAuth + search), `api/stock-search.js`.
- **Misc**: `api/on-signup.js`, `api/verify-signup.js`, `api/csp-report.js`, `api/client-error-beacon.js`, `api/dev-send-test-digest.js`, `api/cron/` (scheduled jobs).

## 4. `base44/entities/`

48 `.jsonc` files, one per Base44 entity, defining fields + RLS (row-level security) rules. This is a **checked-in mirror of the live Base44 schema**, kept manually in sync via the `mcp__claude_ai_Base44__update_entity_schema`/`list_entity_schemas` tools — it is not automatically generated from the live backend, and `BASE44_PLATFORM_NOTES.md` documents a recurring, empirically-observed problem where a pushed schema/RLS change can silently drift/revert on the live backend without this mirror (or the app) being notified. Any security- or correctness-sensitive question about RLS should be re-verified against the **live** schema via `list_entity_schemas`, not trusted from this directory alone. A companion embedded snapshot for CI purposes lives in `scripts/lib/schemaDropScan.mjs` (used by the schema-drift guard test) and has the same staleness risk, manually refreshed after each real schema change.

## 5. Root-level files worth knowing

- **`CLAUDE.md`** — the standing project rules (design conventions, branching/PR workflow, definition of done, files to never touch without explicit instruction).
- **`DESIGN_SPEC.md`** — the detailed visual design specification (typography, spacing, the wizard-is-light-only rule, etc.).
- **`WORKFLOW.md`** — the branch/ship/PR mechanics (`new-feature.sh`/`ship.sh` usage).
- **`BASE44_PLATFORM_NOTES.md`** — empirically-established Base44 platform behavior (admin key semantics, the create:null+hashed-identifier pattern, schema drift). Read before touching RLS or any admin-key-backed endpoint.
- **`ANONYMOUS_ACCESS_MATRIX.md`** — an audit of exactly what the anonymous/unauthenticated guest site can read, scoped to `/w/:weddingSlug*` and `/rsvp/:token` routes only (references a `SECURITY_AUDIT.md` companion doc that was not found at the repo root as of this writing).
- **`AUDIT_2026-07.md`**, **`BUILDER_UNIVERSE_AUDIT.md`**, **`MARKETING_AUDIT.md`**, **`WIRING_DIAGNOSTIC.md`** — point-in-time, read-only audit reports (codebase-wide, universe-system-specific, marketing-specific, and a "phase 0" wiring check respectively). Historical snapshots, not living docs.
- **`LAUNCH_CHECKLIST.md`** — standing pre-launch checks (references a separate unmerged `audit/launch-readiness` branch).
- **`ONBOARDING_JOURNEY_REVIEW.md`** — a dated review of the signup → plan → payment → dashboard flow.
- **`SMART_RSVP_MODEL.md`**, **`UNIVERSE_DESIGN_SYSTEM.md`**, **`TEXTURE_LIBRARY_SPEC.md`**, **`VISUAL_CONTENT_STRATEGY.md`**, **`BUILDER_BLOCK_SCOPE.md`**, **`PR6_SEATING_PROPOSAL.md`** — forward-looking specs/proposals for features at various stages of completion (explicitly marked in each file whether the described work is live or design-only — check each file's own header before assuming something is built).
- **`IMAGE_MANIFEST.md`** — tracks every marketing-site Cloudinary asset, to prevent duplicate/missing photo usage.
- **`vercel.json`**, **`vite.config.js`**, **`tailwind.config.js`**, **`eslint.config.js`**, **`components.json`**, **`jsconfig.json`** — standard tooling config.

## 6. `scripts/`

- **Dev workflow**: `new-feature.sh` (create a feature/fix branch from latest main), `ship.sh` (build check → commit → push → open PR).
- **Build-time / CI correctness guards** (each has a matching `npm run test:*` script): `test-marketing-routes.mjs` (catches a component referenced-but-never-imported shipping a blank page), `test-marketing-images.mjs`, `test-marketing-hero-consistency.mjs`, `test-prerendered-freshness.mjs` (fails CI if marketing source changed without regenerating `prerendered/`), `test-route-collisions.mjs`, `test-us-english-spelling.mjs`, `test-vendor-contact-consistency.mjs`, `test-ci.mjs` (the aggregate credential-free suite, includes the schema-drift guard), `test-persistence.mjs` (the Base44-backed integration suite, needs real credentials — see `tests/persistence/`).
- **Schema tooling**: `audit-schema.mjs` (human-readable report over the embedded schema snapshot), `lib/schemaDropScan.mjs` (shared scan logic + the embedded `SCHEMAS` snapshot itself, manually refreshed).
- **Data/asset maintenance**: `seed-demo-data.mjs`, `seed-round5-dashboard-review.mjs`, `reset-test-account.mjs`, `cleanup-stray-test-records.mjs`, `backfill-vendor-links-round6.mjs`, `migrate-photographer-to-vendor.mjs`, `migrate-poll-entities.mjs`, `migrate-rsvp-entities.mjs`, `migrate-seating-events.mjs`, `audit-image-repeats.mjs`.
- **Marketing prerendering**: `prerender.mjs`, `apply-prerendered.mjs`, `marketingRoutes.mjs`.
- **`capture/`** — a separate photo-capture pipeline (see the project's own memory notes for its Cloudinary upload/versioning gotchas).
