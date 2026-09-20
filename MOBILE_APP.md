# Openinvite mobile app v0

Branch `mobile/app-shell`. Built against `MOBILE_APP_GOAL.md`, informed by
`MOBILE_AUDIT.md` (the 390px audit of the existing dashboard).

## Phase 0: inventory

### The platform, as found

| Thing | Where | What the mobile shell reuses |
|---|---|---|
| Router | `src/App.jsx`, `react-router-dom` v6 `BrowserRouter`. Authenticated routes sit under one `<ProtectedRoute>` in `AuthenticatedApp`; `pages.config.js` auto-registers `/PascalCase` routes. | `/m/*` registered in the same protected block; `/m/preview/*` registered outside it, dev only. |
| Auth | Base44 (`@base44/sdk`), not Supabase. `src/lib/AuthContext.jsx` exposes `useAuth()` with `user`, `isAuthenticated`, `isLoadingAuth`, `logout`. Token in `localStorage.base44_access_token`. Email + password via `base44.auth.loginViaEmailPassword`; Google / Apple via a full-page redirect to `base44.app` that returns `?access_token=` to `from_url`. `Login.jsx` honors `?next=`. | `useAuth()` for the user, `logout` for sign out. Unauthenticated `/m` sends to `/login?next=%2Fm`. |
| Data client | `src/api/base44Client.js` (`base44.entities.*`, wrapped by the trial write guard). Ownership-scoped readers in `src/lib/resolveMyWedding.js`: `getMyWeddingDetails()`, `putMyWeddingDetails()`, `getMyRecords(entity, sort)`, `getMyGuestsWithRsvp()`. Guest writes go through `src/lib/guestWrites.js` (`createGuest`, `updateGuest`, `deleteGuest`, which call `/api/my-guests`). | Exactly these. No new endpoints, no new entities. |
| Plan gating | `src/lib/trialStatus.js` `getTrialStatus(user)` (`plan`, `isPaid`, `trialActive`, `daysLeft`); `canAccessUltra(user)`. Checkout in `src/lib/checkoutSession.js`, billing portal in `Account.jsx`. | `getTrialStatus` for the Account plan row. Every checkout / upgrade / portal CTA is hidden when `isNative()`. |
| Ava | `src/components/layout/AvaChatPod.jsx` (self-contained: builds context, calls the LLM, renders action cards; props `onClose, openDetail, messages, setMessages, dismissed, setDismissed, onClear`). Opened from anywhere via `openAva()` in `src/lib/avaOpen.js`. | The pod is rendered unchanged inside a full-height mobile bottom sheet; its fixed 380x520 inline size is overridden by a scoped stylesheet under `.oi-mobile-root`. Scope, prompts and tools untouched. |
| Existing mobile handling | One breakpoint at 1024px in `Layout.jsx` + `index.css`: a 64px white top bar with a hamburger that opens a left `Sheet` drawer. No bottom tab bar, no safe-area handling, no `viewport-fit=cover`. See `MOBILE_AUDIT.md`. | Nothing. The shell is a separate tree under `/m`. |
| Universe / site | `WeddingDetails.activeUniverse`, `slug`, `websiteEnabled`, `coverPhoto`; `src/lib/universeCatalog.js` `getUniverse(id)`; sample hero via `getSampleWedding(id)?.coverPhoto` (as `StudioHub.jsx` does). Site URL is `${origin}/w/${slug}`. | Site tab reads these; share uses the same URL. |
| Countdown / names | `src/lib/weddingCountdown.js` `daysUntilWedding`, `countdownLabel`; couple names from `couple1Name` / `couple2Name` (as `Layout.jsx`). | Home hero. |
| Git hooks | `.githooks/pre-commit` refuses undeclared new files (`STAGE_PATHS=... git commit`); `pre-push` runs payments-freeze, no-credentials, canon-branch, docs-channel, then `npm run lint`. | Every commit declares its paths. |

### Desktop route map

Scope column: **v0** = built as a mobile screen; **row** = reachable from a mobile row that links to the desktop page or explains it is a desktop surface; **later** = not in v0.

| Desktop route | What it does | Data source | Mobile tab | Scope |
|---|---|---|---|---|
| `/DailyUpdate` | Landing page: greeting, day state, stat tiles, Ava briefing | `getMyWeddingDetails`, `getMyRecords('Note'/'Schedule'/'Budget'/'Vendor')`, `getMyGuestsWithRsvp`, `dayState.js` | Home | v0 (hero, next up, RSVP and budget snapshots, quick actions) |
| `/event-details` | Partner names, date, venues, guest count | `getMyWeddingDetails` / `putMyWeddingDetails` | Account | row (desktop) |
| `/Schedule`, `/Calendar` | Wedding-day and planning schedule | `getMyRecords('Schedule')`, `base44.entities.Schedule` | Plan | v0 read-only list under Plan › Timeline |
| `/TodoList`, `/Checklist` | Tasks (Note entity, `view_type: 'todo'`) and the auto checklist | `getMyRecords('Note')`, `base44.entities.Note.create/update/delete` | Plan | v0 (checklist segment: list, complete, add) |
| `/Guests` | Guest list, filters, add / edit / import, send invites | `getMyGuestsWithRsvp`, `guestWrites.js`, `weddingEvents.js` | Guests | v0 (list, filters, search, detail, add / edit sheet) |
| `/SendInvites`, `/Invitations` | Email sends and invitation design | `SendInvitesModal`, builder | Guests | later (desktop) |
| `/Polls` | Polls and games | `getMyRecords('Poll')` | Plan | later |
| `/Messages` | Guest replies and WhatsApp | `getMyRecords('Message')` | Guests | later |
| `/Seating` | Table canvas | `getMyRecords('Table')`, `seatingChart.js` | Plan | row (desktop, per its own notice) |
| `/wedding-party` | Wedding party members | `getMyWeddingDetails` | Plan | later |
| `/Moodboard`, `/Styling`, `/Beauty`, `/FoodBeverage`, `/Music`, `/Photography`, `/VowsSpeeches`, `/wedding-favours` | Style and experience planning pages | mixed | Plan | later |
| `/Vendors` | Vendor list and status | `getMyRecords('Vendor')` | Plan | v0 read-only list under Plan › Vendors |
| `/VendorMarketplace` | Google Places vendor search | `/api/places-search` | Plan | later |
| `/ceremony-details`, `/transport`, `/accommodation`, `/emergency-contact` | On-the-day details | `getMyWeddingDetails` | Plan | later |
| `/Budget` | Plan, expenses, forecasting | `getMyRecords('Budget')`, `base44.entities.Budget`, `WeddingDetails.budget` via `/api/my-wedding-details` | Plan | v0 (totals, categories, category detail, add expense sheet) |
| `/Registry` | Registry platforms, products, cash funds | `getMyWeddingDetails` | Site | row (desktop) |
| `/studio` | Studio hub | `getMyWeddingDetails` | Site | v0 (site status card) |
| `/studio/website`, `/website-editor` | Full website builder | builder state | Site | row (desktop) |
| `/studio/universe` | Universe picker | `universeCatalog.js` | Site | row (desktop) |
| `/studio/ava` | Ava studio | | Site | row (desktop) |
| `/GuestSuiteSchedule`, `/QandA`, `/GuestSuiteRegistry`, `/GuestSuiteAccommodation`, `/GuestSuiteTransport`, `/GuestSuiteExperience`, `/GuestSuitePolicies`, `/GuestSuitePolls` | Guest suite content editors | `getMyWeddingDetails` sub-fields | Site | row (links to desktop pages) |
| `/honeymoon`, `/Considerations` | Extras | `getMyWeddingDetails`, static | Plan | later |
| `/account` | Profile, plan, billing portal, notifications | `useAuth().user`, `base44.auth.updateMe`, `/api/create-portal-session` | Account | v0 (rows; purchases hidden natively) |
| `/help` | Help centre | static | Account | row (link) |
| `/Contact` | Contact form | `/api/contact` | Account | row (link) |

### Route prefix check

`/m` collides with nothing. Existing routes starting with `m` are `/mocks/universe/{a,b,c}` (a different first segment). Guest sites are `/w/:slug`, RSVP is `/rsvp/:token`, games `/games/:token/:id`. `isPublicPath()` in `App.jsx` does not match `/m`, so `/m/*` falls through to the authenticated `Routes`, which is where it is registered. `/m/preview/*` is registered next to `/login` (outside the guard), and only when `import.meta.env.DEV`.
