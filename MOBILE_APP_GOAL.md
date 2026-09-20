# Goal: Openinvite mobile app v0 (Capacitor shell + mobile screens)

## Outcome

By the end of this run, the branch `mobile/app-shell` contains a working first version of the Openinvite mobile app for couples:

1. A mobile app shell with a five-tab bottom navigation, living at `/m/*`, built from new components in `src/mobile/`.
2. Mobile screens for the core couple features, wired to real data through the existing data layer.
3. A dev-only preview mode at `/m/preview/*` that renders every screen with fixture data, so screens can be reviewed without logging in.
4. Capacitor installed and configured so the same build runs as an iOS and Android app.
5. `MOBILE_APP.md` at repo root documenting what was built, what was skipped, and what comes next.
6. `npm run build` passes. Nothing on the existing desktop or guest-facing site has changed.

This is a foundation we will tweak screen by screen afterwards. Favour a complete, coherent, clean skeleton over deep polish on any one screen.

## Hard rules (do not break these)

- Read `CLAUDE.md` and `DESIGN_SPEC.md` in full before writing any code. They override anything in this file if there is a conflict, except where this file says "mobile exception".
- Work only on a new branch: `git checkout -b mobile/app-shell` from an up-to-date `main`. Never commit to `main`. Never merge. Never open or merge a PR. Push the branch only.
- ADDITIVE ONLY. Do not modify existing pages, layouts, components, global CSS, or guest-facing wedding pages. Allowed edits to existing files are limited to: the router file (to register `/m/*` routes), `package.json`, `index.html` (viewport meta only, see Phase 1), `.gitignore`, and Tailwind config only if strictly needed for safe-area utilities. If you think another existing file must change, do not change it. Write it up in `MOBILE_APP.md` under "Needs a decision".
- No database, schema, RLS, entity, or env changes. No new tables. No new API keys. Do not run `npm audit fix`. Do not upgrade existing dependencies.
- Use the existing data client, hooks, auth context and query patterns exactly as the desktop dashboard pages do. Find how the equivalent desktop page loads and mutates its data and reuse that. Do not invent new data access patterns.
- Commit at the end of every phase with a clear message. Run `npm run build` before every commit. If the build fails, fix it before moving on.
- If a phase is blocked (missing tool, missing credential, unclear data model), do not guess and do not stop the whole run. Document the blocker in `MOBILE_APP.md`, stub that piece cleanly, and continue.

## Design direction

Inspiration is the Nespresso iOS app: clean, calm, light, a bit fun, very easy to thumb through. Take its structure and rhythm, not its styling. Openinvite brand rules still apply.

What to take from Nespresso:
- A light neutral page background with flat white content blocks sitting on it. Lots of breathing room.
- One large, confident screen title at top left of every tab ("Hi La", "Guests", "Account"). No busy header bars.
- A fixed five-item bottom tab bar: thin line icon with a small label underneath, clear active state.
- Account-style screens built from stacked full-width rows: icon tile on the left, label, chevron on the right.
- Horizontally scrolling rows where the next card peeks in from the right edge, with small dot pagination where it is a carousel.
- A single hero block at the top of Home with imagery and one pill button.
- Horizontally scrolling filter pills under the title on list screens.
- Two-column card grids for browsable collections.
- A slim progress bar with one sentence of plain explanation under it.
- Friendly empty states: one icon, one sentence, one action.
- A dedicated full-screen search view with the input focused at the top.

Openinvite brand rules that stay locked (these override the Nespresso look):
- Sentence case everywhere. No uppercase CSS, including badges and tab labels.
- No box-shadow anywhere on cards or blocks. Separate blocks with the background contrast and spacing, not shadows.
- No border-radius on cards, blocks, inputs, images or icon tiles. Border-radius 999px only on pills and buttons. The floating Ava button is the one other exception.
- Plus Jakarta Sans only. Headings weight 600. Do not go heavier.
- Primary colour #E03553, flat, never a gradient. Use it sparingly: primary buttons, active indicator, progress fill, key numbers.
- Text never lighter than #444444 on light backgrounds.
- 8px grid for all spacing and sizing.
- Lucide icons only. No emojis. The ✦ mark is reserved for Ava.
- Copy is plain and warm. No hype language, no exclamation marks, no em dashes, no bullet points in UI copy.

Mobile tokens (define as CSS custom properties scoped under a `.oi-mobile-root` class on the shell root, never globally, because global `!important` font rules in this codebase have overridden inline styles before):
- Page background: #F5F5F4. Block background: #FFFFFF. Hairline divider: #E7E5E4.
- Text primary #1A1A1A, secondary #444444.
- Screen title 32px/40px weight 600. Section title 20px/28px weight 600. Body 16px/24px. Meta 14px/20px.
- Screen side gutter 16px. Gap between blocks 8px or 16px. Block inner padding 16px.
- Minimum tap target 44px by 44px. Tab bar height 64px plus bottom safe area.
- All inputs font-size 16px minimum so iOS does not zoom.

Mobile behaviour:
- Use `env(safe-area-inset-*)` for the top of screens and the bottom tab bar.
- No hover-dependent interactions. Give pressed states with a subtle opacity or background change, 120ms.
- Screen transitions and sheet open/close 200ms to 250ms, transform and opacity only. Respect `prefers-reduced-motion`.
- Use bottom sheets instead of centred modals for forms and pickers. Sheets have square corners.
- Lists scroll inside the screen; the title scrolls away and a compact 17px title fades into a slim top bar once scrolled past 48px.
- Pull to refresh on data lists where the data layer makes that easy. Skip it if not.
- Skeleton loading blocks (flat, no shimmer gradient) instead of spinners.

## Phase 0: Inventory (no code)

1. Read `CLAUDE.md`, `DESIGN_SPEC.md`, and `MOBILE_AUDIT.md` if it exists.
2. Map the codebase: router, auth flow, data client, every couple-facing dashboard route and the hooks or queries each uses, the Ava chat component, plan or subscription gating, and any existing mobile handling.
3. Start `MOBILE_APP.md` with a table: desktop route, what it does, data source, which mobile tab it maps to, and whether it is in scope for v0.
4. Confirm `/m` does not collide with any existing route, especially guest-site slugs. If it does, choose another short prefix and record it.

## Phase 1: Shell

Create `src/mobile/` with this shape (adapt names to repo conventions):

- `MobileShell` : root layout with `.oi-mobile-root`, tokens, safe areas, outlet, tab bar, Ava button.
- `TabBar` : five tabs, Lucide icons, sentence-case labels, active state is primary text weight 600 plus a 2px #E03553 indicator above the icon.
- `ScreenHeader` : large title with optional right-side icon actions, collapsing to the compact bar on scroll.
- `Block`, `Row` (icon tile, label, value, chevron), `PillButton`, `FilterPills`, `PeekCarousel`, `ProgressBar`, `EmptyState`, `Skeleton`, `BottomSheet`, `SearchScreen`.
- `native.ts` : thin wrapper around Capacitor APIs with `isNative()` guards so everything is a no-op on the web.

Tabs:
1. Home
2. Guests
3. Plan
4. Site
5. Account

Register routes under `/m/*` behind the same auth guard the dashboard uses. Unauthenticated users go to the existing login, then back to `/m`. In `index.html`, make sure the viewport meta includes `viewport-fit=cover`. Do not change anything else there.

Do not redirect mobile visitors to `/m` yet. That is a later decision.

## Phase 2: Screens

Build each screen as a presentational component that takes data through props, plus a container that loads real data with the existing hooks. This split is required because the preview route in Phase 3 renders the presentational components with fixtures.

Home
- Title: "Hi {first name}".
- Hero block: the couple's wedding imagery if available from their universe or site settings, names, date, days to go, one pill button to the most useful next action.
- "Next up": peek carousel of the next few open checklist tasks.
- RSVP snapshot: attending, declined, awaiting, with a progress bar and one plain sentence.
- Budget snapshot: spent against total with a progress bar.
- Quick actions: two-column grid (add guest, add task, add expense, view site).

Guests
- Title, search icon, filter pills (all, attending, declined, awaiting, plus any existing groupings).
- Guest list as rows. Tap opens a guest detail screen. Add and edit through a bottom sheet using the existing mutations.
- Full-screen search view.

Plan
- Segmented pills at the top: checklist, budget, and any other planning tools that exist and fit (timeline, vendors, seating if simple to list).
- Checklist: grouped tasks, tap to complete, add task sheet.
- Budget: totals block, categories as rows, category detail, add expense sheet. The desktop Budget page is the canonical reference for data and terminology.

Site
- Current universe and guest site status, a preview image, "View site" and "Share link" actions (native share when available, copy link otherwise).
- Rows linking to the site sections that are reasonable to edit on a phone. For anything that is too heavy for v0 (the full site builder, Ava's Studio), show a row that explains it is best done on desktop. Do not rebuild the builder.

Account
- Nespresso-style stacked rows: account details, partner or collaborators if that exists, plan, notifications, help centre, contact support (Crisp if there is an existing hook for it), log out.
- Plan row: show the current plan. When `isNative()` is true, hide every purchase, upgrade and checkout call to action in the mobile app. Document this in `MOBILE_APP.md`. Stripe Checkout inside an App Store app is a review risk and the decision on purchases in the app is pending.

Ava
- Floating Ava button above the tab bar, bottom right, using the ✦ mark, the one rounded element allowed besides pills.
- Opens the existing Ava chat in a full-height bottom sheet. Reuse the existing Ava chat logic and API calls. Do not change Ava's scope, prompts or tools.

Every list needs loading, empty and error states. Every form needs validation messages in plain language.

## Phase 3: Preview mode

Add `/m/preview/*`, available only when `import.meta.env.DEV` is true. It renders the same shell and every presentational screen with realistic fixture data from `src/mobile/fixtures/` (an Australian couple, around 80 guests with mixed RSVP states, a part-complete checklist, a budget with several categories). No network calls in preview.

If Playwright or another headless browser is already available in the repo or easy to run with `npx` without adding it to `package.json`, capture screenshots of every preview screen at 390 by 844 into `mobile-screenshots/` and commit them. If not, skip and note it.

## Phase 4: Capacitor

1. Install `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`, and plugins: `app`, `status-bar`, `splash-screen`, `keyboard`, `haptics`, `share`, `browser`, `preferences`.
2. `capacitor.config.ts`: appId `au.com.openinvite.app`, appName `Openinvite`, webDir set to the Vite build output. Bundle the web build locally. Do not point the app at the live URL.
3. When running natively, the app's start path should be `/m`.
4. Wire `native.ts`: light status bar style to match the page background, keyboard resize behaviour so inputs are not covered, light haptic on tab change and task completion, native share sheet for the site link, hardware back button handling on Android.
5. Run `npx cap add ios` and `npx cap add android`, then `npx cap sync`. If either fails because Xcode, CocoaPods or Android Studio is missing, record the exact error and the install steps in `MOBILE_APP.md` and carry on. Commit the native project folders if they were created, with sensible `.gitignore` entries for build artefacts.
6. Add npm scripts: `mobile:build` (build then cap sync), `mobile:ios` (cap open ios), `mobile:android` (cap open android).
7. Do not implement push notifications, deep links, biometrics, or camera upload in this run. Add them to the roadmap.

## Phase 5: Document and finish

Finish `MOBILE_APP.md` with:
- How to run the preview, how to run in the iOS simulator and Android emulator.
- The route and feature table from Phase 0, updated with what was built.
- Every stub, skip and blocker, stated plainly.
- "Needs a decision": anything that required touching existing files, the purchases-in-app question, and whether mobile web visitors should later be sent to `/m`.
- Known auth limitation: email and password login works inside the native shell, but magic links and OAuth need deep links (custom URL scheme or universal links) configured in Supabase. List exactly which redirect URLs will need adding.
- Roadmap, in order: deep links for auth, push notifications, Face ID login, camera upload, App Store and Play Store assets, TestFlight build.

Final checks before the last commit:
- `npm run build` passes.
- `git diff main --stat` shows changes only in the allowed files and new files. If anything else changed, revert it.
- Grep `src/mobile/` for `box-shadow`, `uppercase`, `rounded-` classes other than full pills, emoji characters, and em dashes. Fix any hits.
- Push the branch `mobile/app-shell`. Do not open a PR.

## Definition of done

The goal is complete when all of the following are true:
- Branch `mobile/app-shell` is pushed with one commit per phase.
- `/m` shows the five-tab app with real data for a logged-in couple, and `/m/preview` shows every screen with fixtures in dev.
- Home, Guests, Plan, Site and Account all render with loading, empty and error states, and the Ava sheet opens.
- Capacitor is configured, and the native projects exist or the reason they do not is documented.
- `MOBILE_APP.md` is complete.
- The build passes and no existing page, layout, global style or guest-facing page was modified.
