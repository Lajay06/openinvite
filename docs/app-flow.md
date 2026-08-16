# App flow — Openinvite

Grounded in the real routes in `src/App.jsx` and `src/pages.config.js` (the auto-route loop that registers every `src/pages/*.jsx` file at its PascalCase filename as a URL, e.g. `Guests.jsx` → `/Guests`). Route names below are exact.

## 1. Couple journey

### Sign up
- `/register` (`Register.jsx`) or `/login` (`Login.jsx`) — Base44-backed auth (email/password + OAuth providers). `/signup` redirects to `/register`.
- `/forgot-password` → `ForgotPassword.jsx`, `/reset-password` → `ResetPassword.jsx`.

### Onboarding wizard — `/onboarding`
`src/pages/Onboarding.jsx`'s `STEPS` array, in order:
1. `welcome` — `OnboardingWelcome.jsx`
2. `names` — `OnboardingStep1Names.jsx`
3. `date` — `OnboardingStep2Date.jsx`
4. `location` — `OnboardingStep3Location.jsx`
5. `guestCount` — `OnboardingStep4GuestCount.jsx`
6. `weddingType` — `OnboardingStep5WeddingType.jsx` (accordion: aesthetic + consolidated faith/culture picker)
7. `ava` — `OnboardingStep7Ava.jsx` ("Meet Ava", personalized to what's been entered so far)
8. `universe` — `OnboardingStepUniverse.jsx` (skipped entirely for `plan === 'pro'` accounts — Universes are Ultra-only; per-tile Explore/Select buttons, `activeUniverse` persisted on completion)
9. `fork` — `OnboardingStep8Fork.jsx` — branches into Path A (detailed) or Path B (quick, skips straight to `completion`)
10–14. Path A only: `pathA-guestList`, `pathA-budget`, `pathA-vendors`, `pathA-cultural`, `pathA-inspiration`
15. `completion` — `OnboardingCompletion.jsx` (staggered checklist + confetti, then routes to `/DailyUpdate`)

Draft progress persists to a `WeddingDetails` record as the wizard goes (`onboardingDraft: true` until the final save), so a refresh mid-wizard resumes where the couple left off.

### Plan selection
- `/choose-plan` (`ChoosePlan.jsx`) — Free trial / Pro / Ultra. `/PlanSelection` redirects here.
- Real Stripe checkout on upgrade; `/payment-success` (`PaymentSuccess.jsx`) is the post-purchase landing page.

### Dashboard — landing page is `/DailyUpdate`
Sidebar nav (`src/components/layout/AnimatedSidebar.jsx`'s `NAV_SECTIONS`), two fixed top-level items (**Design studio** `/studio`, **Event details** `/event-details`) plus these sections:

- **Planning** — Daily update `/DailyUpdate`, Overall `/Dashboard`, Schedule `/Schedule`, To do `/TodoList`
- **Guests** — Guest list `/Guests`, Polls & games `/Polls`, Messages `/Messages`, Seating `/Seating`, Wedding party `/wedding-party`
- **Style & experience** — Moodboard `/Moodboard`, Styling `/Styling`, Beauty `/Beauty`, Food & beverage `/FoodBeverage`, Music `/Music`, Photography `/Photography`, Vows & speeches `/VowsSpeeches`, Guest gifts `/wedding-favours`
- **Vendors** — My vendors `/Vendors`, Marketplace `/VendorMarketplace`
- **On the day** — Ceremony details `/ceremony-details`, Transport `/transport`, Accommodation `/accommodation`, Emergency contact `/emergency-contact`
- **Finances** — Budget `/Budget`, Registry `/Registry`
- **Guest Suite** (Ultra-gated) — Schedule `/GuestSuiteSchedule`, Q&A `/QandA`, Registry `/GuestSuiteRegistry`, Accommodation `/GuestSuiteAccommodation`, Transport `/GuestSuiteTransport`, Live stream `/GuestSuiteLiveStream`, Experience guide `/GuestSuiteExperience`, Policies `/GuestSuitePolicies`, Guest polls `/GuestSuitePolls`
- **Extras** — Honeymoon `/honeymoon`, Considerations `/Considerations`

**Design Studio** (`/studio`) fans out to: Universe picker `/studio/universe` (20 style "universes", Ultra-gated), Guest Suite website builder `/studio/guest-suite` (tabs: website / assets / policies / share — the "share" tab is where a couple flips `websiteEnabled` live), and a live-preview link to their own site.

**Ava Studio** (`/studio/ava`) — a guided 7-step setup journey (build website → add guests → turn on RSVP → publish website → set budget → add vendors → plan the day) with live completion detection. Currently **parked/unlinked from navigation** (no sidebar entry) — reachable only by direct URL; the code is intact for a post-launch rebuild.

### Inviting guests → managing RSVPs
- Add guests manually or CSV-import on `/Guests`; "Send invites" dispatches email/WhatsApp invites (each carries a per-guest RSVP link).
- Guest RSVP status/notes/meal choice update live on `/Guests` as guests respond via the public site or the standalone `/rsvp/:token` short-link page (`RSVPPage.jsx`).
- Collaborator access: **Collaborate** (sidebar footer link) opens `CollaborateModal.jsx`, which emails an invite; the invitee accepts at `/collaborate/accept/:token` (`CollaboratorAccept.jsx`) and gets scoped, permission-gated dashboard access (see `collaboratorPageMap.js`) — e.g. `/collaborate/guests` is a collaborator-specific guest view.

### Account
- `/account` (`Account.jsx`) — profile, plan/billing, password change (in-session, real Base44 SDK call), notification prefs, account-deletion **request** (not instant self-service — sets a flag + notifies the team), no self-service email change.
- `/help` — Help center.

## 2. Guest journey

### Opening the invite
Guests land on the public wedding site at `/w/:weddingSlug` (root/home) or `/w/:weddingSlug/:page` for a specific section — routed to `src/components/guest-website/MultiPageWeddingWebsite.jsx`. Internal page slugs (`PAGE_LABELS`): `home`, `our-story`, `celebration`, `rsvp`, `registry`, `music`, `photos`, `styling`, `polls`, `faq`, `stay`, `transport`, `experience` — a subset is enabled per-wedding via `WeddingDetails.enabledPages` (default: `home`, `our-story`, `celebration`, `rsvp`).

Three sections are separate dedicated routes rather than `MultiPageWeddingWebsite` sub-pages:
- `/w/:weddingSlug/accommodation` → `GuestAccommodation.jsx`
- `/w/:weddingSlug/music` → `GuestMusic.jsx` (song request submission)
- `/w/:weddingSlug/collect` → `GuestCollect.jsx` (contact-detail collection, e.g. for a guest whose invite bounced)

All of these resolve the wedding server-side via `fetchWeddingBySlug()` → `api/wedding-by-slug.js`, which allowlists exactly which `WeddingDetails`/registry fields a guest is allowed to see (never the raw entity).

### RSVP
- In-site: the `rsvp` page slug on `MultiPageWeddingWebsite`.
- Or the standalone short-link: `/rsvp/:token` (`RSVPPage.jsx`) — the link sent in invite emails.
- Submission goes through `api/rsvp-submit.js` (guest-level text fields — song request, notes, dietary — are HTML-stripped server-side before storage).

### Registry / gifts
`registry` page slug — shows `CustomGift`/`RegistryProduct` entries via the same allowlisted server path (payment links, no owner-private notes or "who bought what" data).

### Song requests
`music` page slug (browsing/Spotify search) and/or the dedicated `/w/:weddingSlug/music` route — submission via `api/song-request-submit.js`.

### Polls / games
`polls` page slug — `WeddingPollsPage.jsx`, votes/comments submitted and displayed wedding-scoped. A separate, token-gated **private questionnaire/game** exists at `/games/:token/:questionnaireId` (`GamesPage.jsx`) — distinct from the public polls page, used for couple-authored private quizzes (e.g. "the shoe game").

### Guest Suite content (Ultra-gated, couple-authored)
`stay` (accommodation), `transport` (getting there), `experience` (destination guide) page slugs — populated from the couple's Guest Suite builder pages, same allowlisted read path.

## 3. Admin journey

`/admin` (`Admin.jsx`) — a single internal-tooling page (Stripe revenue/user stats). Gate is a client-side redirect for a specific `ADMIN_EMAIL`, but the actual data call (`api/admin/stats.js`) independently re-verifies the caller's identity server-side before returning anything — the client check is UX only, not the real security boundary.

## 4. Collaborator journey

A couple can grant a friend/family member scoped dashboard access without giving them the couple's own login:
1. Couple opens **Collaborate** (sidebar footer) → `CollaborateModal.jsx` → sends an invite email (`collaboratorEmailTemplate.js`).
2. Invitee opens the link → `/collaborate/accept/:token` (`CollaboratorAccept.jsx`) → accepts, gets a scoped session.
3. Collaborator's nav/pages are filtered through `collaboratorPageMap.js` — they see only granted sections (e.g. `/collaborate/guests` for guest-list-only access), and writes are further restricted (several entities' `update`/`delete` RLS is owner-`created_by_id`-scoped, which blocks a collaborator's write even where the UI shows an edit control — documented in that page's own code comments).

---

## End-to-end click-through script

**Part A — Couple: signup through first guest invite**

1. Navigate to `/register`. Create an account (email/password or an OAuth provider).
2. Land on `/onboarding`. Confirm the progress bar starts at 0%.
3. Step through `welcome` → `names` (enter both partners' names) → `date` → `location` → `guestCount` → `weddingType` (expand the accordion, pick an aesthetic + optionally a faith/culture) → `ava` (confirm the "Meet Ava" text reflects what you just entered).
4. On the `universe` step (skip this check if testing a Pro-plan account — it won't appear): tap a universe tile's **Select** button (not just Explore), confirm the tile shows a "Selected" state.
5. On the `fork` step, choose **Path A** (detailed).
6. Step through `pathA-guestList` (add at least one guest), `pathA-budget`, `pathA-vendors` (search and save at least one vendor), `pathA-cultural`, `pathA-inspiration`.
7. On `completion`, confirm the staggered checklist animates in and confetti fires, then click through.
8. Confirm you land on `/DailyUpdate` and the sidebar shows the wedding's name/countdown in the top bar.
9. Open **Design studio** (`/studio`) → **Universe** — confirm the universe picked in onboarding shows as "your current universe," not London/default.
10. Navigate to **Guest list** (`/Guests`). Add one more guest manually with a real email address.
11. Use **Send invites** to send that guest an invite. Confirm a "sent" status appears against their row.
12. Navigate to **Design studio → Guest Suite** (`/studio/guest-suite`) → the **Share** tab. Toggle the site live (`websiteEnabled`). Confirm the public URL shown resolves.

**Part B — Guest: RSVP through registry through song request through polls**

13. Open the public site at the slug shown in step 12 (`/w/<slug>`). Confirm the homepage loads with the couple's real names/date.
14. Navigate to the `rsvp` section (or use the per-guest `/rsvp/:token` link if you have one from the invite email sent in step 11). Submit an RSVP — attending, pick a meal choice, add a note.
15. Back on the couple's dashboard `/Guests`, confirm that guest's row now shows "Attending" with the submitted meal choice/note.
16. On the public site, open `registry`. Confirm registry items/gifts render with no owner-private fields (no "who bought this" name, no internal notes).
17. Open `music` (or `/w/<slug>/music`). Search for and submit a song request.
18. On the couple's dashboard, navigate to **Music** (`/Music`) and confirm the submitted request appears for review/approval.
19. Back on the public site, open `polls`. Vote on a poll and leave a comment. Confirm the comment appears in the list.
20. On the couple's dashboard, navigate to **Polls & games** (`/Polls`) and confirm the same vote/comment is visible there.

Anything that fails at steps 9–20 is either a real regression or one of the entities flagged in this session's RLS audit not having a working server-mediated path yet — check that audit before assuming it's a UI bug.
