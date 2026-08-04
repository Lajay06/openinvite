# Openinvite

The all-in-one wedding planning platform — guests, budget, schedule,
invitations, and 20 aesthetic "universes" for a couple's guest-facing
wedding website. Production: **[openinvite.com.au](https://openinvite.com.au)**.

## Stack

- **Frontend**: React 18 + Vite + Tailwind + shadcn/ui (Radix primitives),
  React Router, TanStack Query, Framer Motion
- **Backend data**: [Base44](https://base44.com) — all data access goes
  through the authenticated `base44.entities.*` client (see
  `src/api/base44Client.js`); never import from `@/entities/*` directly
- **Server functions**: Vercel Functions under `api/*.js` — payments
  (Stripe), email (Resend), third-party proxies (Google Places, Spotify,
  Pexels), crons, and anything needing the Base44 admin key
- **Hosting**: Vercel Pro. `main` is production and deploys automatically
  on merge; every branch/PR gets its own preview URL
- **Payments**: Stripe Checkout (hosted, redirect-only — no Stripe.js on
  the client) + a webhook (`api/webhooks/stripe.js`) that activates plans
- **Auth**: Base44's own auth (OTP-based), see `src/lib/AuthContext.jsx`
- **Monitoring**: Sentry (errors + session replay), PostHog (product
  analytics) — both no-op locally unless their env vars are set

## Getting started

```bash
npm install
cp .env.example .env   # fill in the values you need — see below
npm run dev
```

Most of the app runs fine locally with zero env vars — anything unset
degrades gracefully (mock data, a disabled feature, or a no-op), never a
crash. You only need to fill in the env vars for the specific integration
you're working on.

## Environment variables

`.env.example` documents these in more detail inline. Server-only vars
(no `VITE_` prefix) are never bundled into the browser — see
`api/_lib/security.js` and each endpoint's own docstring for how they're
used.

| Variable | Where | Purpose |
|---|---|---|
| `VITE_BASE44_APP_ID` | client | Base44 app id |
| `BASE44_ADMIN_KEY` | server | Base44 service-level admin key — the only way to write the built-in `User` entity (plan activation) or bypass RLS from a trusted server context. **Never expose to the browser.** |
| `STRIPE_SECRET_KEY` / `VITE_STRIPE_PUBLISHABLE_KEY` | both | Stripe API access |
| `STRIPE_WEBHOOK_SECRET` | server | Verifies `api/webhooks/stripe.js` signatures — required (fails closed) in production |
| `VITE_STRIPE_PRO_PRICE_ID` / `VITE_STRIPE_ULTRA_PRICE_ID` | client+server | AUD prices |
| `VITE_STRIPE_PRO_PRICE_ID_USD` / `VITE_STRIPE_ULTRA_PRICE_ID_USD` | client+server | USD prices (canonical display currency) |
| `RESEND_API_KEY` | server | Transactional + alert email |
| `GOOGLE_PLACES_API_KEY` | server | Places search/photos — proxied server-side only (`api/places*.js`); no client-side Google key exists or should ever be added |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | server | Spotify search/OAuth, proxied via `api/spotify-*.js` |
| `VITE_SPOTIFY_CLIENT_ID` | client | Spotify OAuth authorize redirect (public client id, not a secret) |
| `TURNSTILE_SECRET_KEY` / `VITE_TURNSTILE_SITE_KEY` | both | Cloudflare Turnstile, gates the anonymous guest-write endpoints |
| `PEXELS_API_KEY` | server | Stock photo search in the media library |
| `VITE_SENTRY_DSN` / `SENTRY_AUTH_TOKEN` | both | Error monitoring + session replay; auth token is build-time only (source map upload) |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` | client | Product analytics |
| `CRON_SECRET` | server | Authenticates Vercel Cron invocations of `api/cron/*.js`. Vercel injects this automatically in production — every cron **fails closed** if it's unset in production, rather than running unauthenticated |
| `VITE_APP_URL` | client | Canonical app URL, used in email templates/links |
| `BASE44_TEST_EMAIL` / `BASE44_TEST_PASSWORD` | local only | Dedicated test account, required by `npm run test:persistence` |

## Scripts

```bash
npm run dev                    # local dev server
npm run build                  # production build — must exit 0 before shipping
npm run lint / lint:fix        # ESLint
npm run typecheck              # tsc, JS-with-JSDoc type checking

npm run test:ci                       # credential-free subset run in CI
npm run test:persistence              # live Base44 round-trip check (requires BASE44_TEST_* creds)
npm run test:marketing-routes         # loads every public route in a real browser, fails on the error boundary
npm run test:route-collisions         # guards against duplicate route registrations
npm run test:vendor-contact-consistency
npm run test:marketing-hero-consistency

npm run audit:schema           # diffs code-referenced entity fields against Base44's actual schema
npm run audit:images           # flags repeated marketing images
npm run reset:test             # resets the dedicated test account to a clean state
npm run capture                # marketing screenshot/video capture pipeline (see scripts/capture/)
```

## Workflow

Every change ships through a feature branch → PR → Vercel preview → merge.
`main` must always be deployable — nobody commits or pushes to it directly.

```bash
./scripts/new-feature.sh <name>     # branch off latest main (feat/ or fix/)
./scripts/ship.sh "commit message"  # build check → commit → push → open PR
```

Full detail, branch protection rules, the persistence test, and the
marketing-routes smoke test are in **[WORKFLOW.md](./WORKFLOW.md)**.
Standing instructions for AI coding sessions on this repo are in
**[CLAUDE.md](./CLAUDE.md)**.

## Documentation index

| Doc | What it's for |
|---|---|
| [CLAUDE.md](./CLAUDE.md) | Standing rules for AI coding sessions on this repo — design rules, branching, definition of done |
| [WORKFLOW.md](./WORKFLOW.md) | Full branch → PR → preview → merge workflow, branch protection, persistence + marketing-routes tests |
| [DESIGN_SPEC.md](./DESIGN_SPEC.md) | The visual design system — typography, colour, spacing, components, canonical page layout |
| [BASE44_PLATFORM_NOTES.md](./BASE44_PLATFORM_NOTES.md) | Empirically established Base44 platform behavior — what the admin key can/can't do, RLS quirks, schema drift, the User-entity auth quirk. Read before touching RLS, the admin key, or an admin-key-backed endpoint |
| [ANONYMOUS_ACCESS_MATRIX.md](./ANONYMOUS_ACCESS_MATRIX.md) | What the published, anonymous guest-facing site (`/w/:slug`, `/rsvp/:token`) can and can't read, given Base44 permissions are entity-level, not token-scoped |
| [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) | Narrow, recurring standing checks (not a one-time audit) — re-run whenever their specific trigger condition happens again. Currently: the webhook-domain check, CSP report-only rollout, and the production rollback runbook |
| [AUDIT_2026-07.md](./AUDIT_2026-07.md) | Full codebase audit, July 2026 — blockers, should-fix, nice-to-have, with a proposed fix sequence |
| [MARKETING_AUDIT.md](./MARKETING_AUDIT.md) | Maps the real shipped feature set against current marketing copy, so every feature has one clear home and duplicated claims are consolidated |
| [ONBOARDING_JOURNEY_REVIEW.md](./ONBOARDING_JOURNEY_REVIEW.md) | Static-code review of the full signup → plan → payment → dashboard path |
| [WIRING_DIAGNOSTIC.md](./WIRING_DIAGNOSTIC.md) | Phase 0 read-only audit feeding into the (not-yet-created) universe roadmap |
| [BUILDER_UNIVERSE_AUDIT.md](./BUILDER_UNIVERSE_AUDIT.md) | Read-only audit of whether each of the 10 aesthetic universes fully works end to end |
| [UNIVERSE_DESIGN_SYSTEM.md](./UNIVERSE_DESIGN_SYSTEM.md) | The per-universe "world" pattern spec (proven by Marrakech) that the other 9 universes build against |
| [TEXTURE_LIBRARY_SPEC.md](./TEXTURE_LIBRARY_SPEC.md) | Spec for the 10-texture system giving each universe material depth |
| [VISUAL_CONTENT_STRATEGY.md](./VISUAL_CONTENT_STRATEGY.md) | How the marketing site sources product shots, lifestyle imagery, video, and UGC |
| [IMAGE_MANIFEST.md](./IMAGE_MANIFEST.md) | Tracks every Cloudinary asset used on the marketing site, so no photo repeats |
| [BUILDER_BLOCK_SCOPE.md](./BUILDER_BLOCK_SCOPE.md) | Ground-truth scoping notes for the website-builder block system |
| [SMART_RSVP_MODEL.md](./SMART_RSVP_MODEL.md) | Build-ready data model spec for per-event RSVP |
| [PR6_SEATING_PROPOSAL.md](./PR6_SEATING_PROPOSAL.md) | Research/design proposal for multi-event seating (pre-implementation) |
| [CHANGELOG.md](./CHANGELOG.md) | Merged-PR history |

## Deployment

- `main` = production. Every merge to `main` deploys automatically via
  Vercel's GitHub integration.
- Every pushed branch/PR gets its own preview URL, posted as a PR comment
  within ~60 seconds.
- A task is not "done" until it's merged to `main` **and** verified working
  on openinvite.com.au — see the Definition of Done in `CLAUDE.md`.
- Rollback: see the runbook in `LAUNCH_CHECKLIST.md` for the instant-rollback
  steps and the do-not-rollback-a-schema-change callout.
