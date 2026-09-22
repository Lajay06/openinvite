# Goal 7: Openinvite mobile app, instant launch, daily update on every open, search, test notifications

Continue on branch `mobile/app-shell`. The owner is happy with the direction. This run removes launch lag, shows the daily update on every open, fixes global search, reorders the home cards, adds a real lock-screen test notification and researches what to add next.

## Hard rules

- Read `CLAUDE.md`, `DESIGN_SPEC.md`, `src/mobile/DESIGN_MOBILE.md`, `MOBILE_APP.md` and `MOBILE_PARITY.md` first.
- Stay on `mobile/app-shell`. Never commit to `main`, never merge, never open, close or comment on any PR. Push the branch only.
- Leave the local signing team lines in `ios/App/App.xcodeproj/project.pbxproj` uncommitted.
- Allowed edits outside `src/mobile/`: router registration for `/m/*`, `package.json`, `capacitor.config.ts`, `assets/`, `ios/`, `android/`. Do not modify desktop files.
- No database, schema, entity or env changes. No new API keys. No secrets anywhere.
- The only new dependency allowed is `@capacitor/local-notifications` for item 5.
- Photos come only from the Cloudinary `app/` folder. Stills only. No photo appears twice in the app.
- Design rules in `DESIGN_MOBILE.md` apply.
- One commit per numbered item, `npm run build` before each. Blockers are documented and stubbed, they do not stop the run.

## 1. Instant launch

The owner wants the app to open like Facebook or Instagram: tap, the logo shows for a moment, the app is there.

- Remove the in-app photo splash and the rotating splash pool entirely. Return the pool photos to the unused list in `images.ts` and `MOBILE_APP.md`.
- The native launch screen (brand mark on the flat brand background) is the only splash. Hide it as soon as the shell has painted its first frame. Target under 500ms, with no artificial minimum.
- Nothing grey or blank is ever visible:
  - The webview background matches the launch screen colour.
  - The shell paints skeletons immediately while data loads.
  - No full-screen image waits on the network during launch.
- Measure cold-start time on the simulator before and after, and report both.

## 2. Daily update on every open

The owner loves the pink three-quarter daily update card and wants it every time he opens the app.

When it shows:
- On every cold start.
- When the app returns from the background after 15 minutes or more.
- Not when switching tabs or returning after a few seconds.

What it looks like:
- It stays a three-quarter-height card sliding up over the dashboard, with the dashboard visible and dimmed behind it. Keep the current design, which the owner likes.
- Its top photo must appear instantly, with no loading gap.
  - Bundle a small set of 7 daily update photos into the app at build time, optimised to about 800px wide in WebP, stored under `src/mobile/assets/daily/`.
  - Download them from the `app/` folder during development and commit the files.
  - Rotate them by day of the week.
  - These 7 count as used and must not appear anywhere else.
  - Pick calm, bright photos with eyes open and faces fully in frame.

Buttons:
- "Let's go", the primary white pill, closes it.
- A secondary text button "Not again today" below it, white at full opacity, 15/20. It closes it and suppresses the card until the next calendar day.
- Swiping the card down also closes it (same as "Let's go").
- Store the "not again today" date locally.

Other rules:
- Content still mirrors the desktop daily update exactly, as in goal 6.
- In demo builds, add a hidden way to re-show it (long-press the Account title) so the owner can review it anytime.

## 3. Global search works

Selecting a result currently does nothing. Fix it.

- Every result type navigates to its destination:
  - A guest opens their guest profile.
  - A task opens the task detail sheet.
  - A vendor opens vendor detail.
  - A feature name opens that feature screen.
  - An event opens event details.
  - Budget items, registry items and messages open their own detail screens.
- Close the search view as you navigate, and make back return to search with the query intact.
- Keyboard "search" or return with a result highlighted opens the top result.
- Show recent searches (last 5, stored locally) when the field is empty, with a clear button.
- Search every entity the desktop search covers, plus features by name.
- Test every result type and list them in `MOBILE_APP.md`.

## 4. Home hero card order

- First: days to go, always.
- Last: guest suite share card, always.
- In between: two rotating cards from the pool (RSVPs, from Ava, budget, next payment, next task, song requests or guestbook).
- Every card carries a small label at the top saying what it is ("Budget", "Next payment", "Next up"), so a line like "Three course dinner, 82 guests, The Fig Tree" is never ambiguous.
- The budget card shows amount left against total with a progress bar.

## 5. Test notification on the lock screen

The owner wants to see a real Openinvite notification on his locked phone. Real push is not built yet, so use local notifications, which need no Apple push setup or paid program.

- Add `@capacitor/local-notifications`.
- Under Account, add a row "Send a test notification", shown in demo builds and dev only.
- Tapping it:
  1. Asks for notification permission using the existing priming screen copy, then the system prompt.
  2. Schedules three notifications from the real copy catalogue (`src/mobile/notifications/copy.ts`) at 10, 20 and 30 seconds, for example a new RSVP, a payment due and the daily briefing. That gives the owner time to lock the phone.
- Each notification uses the app icon and plain sentence-case copy.
- Tapping a notification opens the app on the matching screen, using the same deep-link routing as the notification centre.
- Also fire the in-app banner when the app is open, as goal 2 designed.
- Record in `MOBILE_APP.md` that real push still needs the backend in `PUSH_BACKEND_PROPOSAL.md` and the paid Apple Developer Program.

## 6. Research: what to add next (write only, build nothing)

Create `MOBILE_IDEAS.md`. Look at:
- Leading wedding planning apps: Zola, The Knot, WithJoy, Bridebook, Minted, Hitched, Easy Wedding.
- Best-in-class consumer apps the owner references: Qantas, Nespresso, Airbnb.
- What native iOS offers Openinvite:
  - Home Screen and Lock Screen widgets (countdown, RSVPs, next task).
  - A wedding-day Live Activity.
  - Siri shortcuts.
  - A share extension (save a vendor or inspiration from Safari or Instagram).
  - Calendar sync.
  - Contacts import for guests.
  - Photo capture straight into the moodboard.
  - Offline mode for the wedding day.

For each idea give: what it is, which apps do it, why it matters for a couple, effort (small, medium or large), whether it needs the paid Apple Developer Program or a backend change, and a recommendation. Rank the top 10. Keep it to what fits Openinvite's brand and product, and flag anything that conflicts with an owner decision (for example hotel room blocks were deliberately not pursued).

## 7. Verify and document

- Rebuild with `npm run mobile:demo`, then `npx cap sync`.
- Fresh 390 by 844 screenshots of every changed screen, including the daily update with both buttons and the search results.
- `npm run build` passes. `git diff main --stat` shows only new files and allowed edits.
- Check `src/mobile/` for duplicate photos (daily set included), off-brand colours and font sizes outside the scale.
- Update `MOBILE_APP.md` with the cold-start timings, daily update rules, search coverage and test notification steps.
- Push `mobile/app-shell`. No PR.

## Definition of done

- The app opens with only the brief native logo and no grey or blank frame, with before and after timings reported.
- The daily update shows on every open as defined, with an instant photo, "Let's go", "Not again today" and swipe to close.
- Every global search result navigates correctly.
- The home cards run days to go first, rotating middle cards, guest suite last, each labelled.
- "Send a test notification" puts real Openinvite notifications on the lock screen and tapping one opens the right screen.
- `MOBILE_IDEAS.md` has a ranked top 10.
- Build and docs are current, and nothing outside the allowed files changed.
