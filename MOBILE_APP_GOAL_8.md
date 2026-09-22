# Goal 8: Openinvite mobile app, owner fixes, real login track, contacts, calendar, offline day

Continue on branch `mobile/app-shell`. This run combines the owner's latest phone-test fixes with three features chosen from `MOBILE_IDEAS.md` (contacts import, calendar sync, offline mode for the day), and prepares the app to run against the owner's real account.

## Hard rules

- Read `CLAUDE.md`, `DESIGN_SPEC.md`, `src/mobile/DESIGN_MOBILE.md`, `MOBILE_APP.md`, `MOBILE_PARITY.md` and `MOBILE_IDEAS.md` first.
- Stay on `mobile/app-shell`. Never commit to `main`, never merge, never open, close or comment on any PR. Push the branch only.
- Leave the local signing team lines in `ios/App/App.xcodeproj/project.pbxproj` uncommitted.
- Allowed edits outside `src/mobile/`: router registration for `/m/*`, `package.json`, `capacitor.config.ts`, `assets/`, `ios/`, `android/`, and new proposal documents at repo root. Do not modify desktop files or anything under `api/`.
- No database, schema or entity changes. No new API keys. No secrets in code, logs, commits or chat. Env values pulled locally are never committed.
- Base44 connector use is limited to `list_entity_schemas`. Never read production rows from the terminal.
- New dependencies allowed: `@capacitor-community/contacts` only.
- Photos come only from the Cloudinary `app/` folder, stills only, no photo appears twice.
- Design rules in `DESIGN_MOBILE.md` apply.
- One commit per numbered item, `npm run build` before each. Blockers are documented and stubbed, they do not stop the run.

## 1. Daily update, full screen

The background app shows above the card and sometimes clashes. Make it a full-screen takeover.

- The daily update covers the whole screen, edge to edge, including under the status bar. Nothing of the dashboard is visible behind it.
- Layout: the photo fills the top 45 percent, running under the status bar with a light scrim at the top so the time and battery stay readable. The #E03553 panel fills the bottom 55 percent, meeting the photo with a 28px rounded top edge. Keep the current text, sizes, "Let's go" and "Not again today".
- Replace all 7 bundled daily photos with photos of people facing the camera, faces fully in frame, eyes open, warm and candid. No backs turned. Pick from unused photos in `app/`. Re-export to `src/mobile/assets/daily/` and keep the once-only rule.
- Swipe down to close still works. Closing reveals the dashboard with a short fade.

## 2. Top bar: brand mark and messages

On every tab root (Home, Guests, Plan, Guest suite, Account):
- Top left: the Openinvite brand mark only, 28px, no wordmark. Tapping it on a non-Home tab goes to Home.
- Top right, three circular 44px buttons in this order: search, messages, notifications.
  - Messages opens the messages conversation list, and has its own unread count badge.
  - Notifications keeps its dot.
- The large screen title sits below this row.
- The collapsed top bar on scroll keeps the mark and the three buttons.

## 3. Guest numbers: consistent labels and correct maths

- One label set everywhere, for every event filter (all events, ceremony, reception and every other event): **Invited, Attending, Declined, Awaiting reply**. "Not yet invited" remains available as a list filter. Remove "yes", "no", "pending" and "waiting" wording from the stat row, filters and guest profile.
- Use the same counting logic the desktop uses. Import the desktop function if it exists; otherwise replicate it exactly and note it as a shared-extraction candidate.
- The invariant, per event: Invited = Attending + Declined + Awaiting reply. Plus-ones are counted the way the desktop counts them and labelled clearly.
- The stat numbers change with each event filter while the labels stay fixed.
- Tapping a stat filters the list to that status and highlights the stat in #E03553. Tapping again clears it.
- Add a unit test for the counting function using the demo fixtures, covering every event. It must fail if the invariant breaks.

## 4. Guest suite: desktop-only note at the top

- Move the "builder and Ava's Studio need a bigger screen" message to the top of the Guest suite tab, as a slim info banner under the title: "Editing your guest suite and Ava's Studio happens on a laptop. Changes you make there show up here."
- It has a close button. Once closed it stays hidden, stored locally.
- A small "Edit on a laptop" row remains at the bottom for reference.

## 5. Guest suite and invitation previews match the desktop exactly

- The previews in the app must use the same rendering components the desktop editor preview uses, imported directly, not a mobile imitation. Same universe, fonts, photos, sections and content.
- Previews are view only. No edit controls.
- If a desktop preview component cannot be imported without editing desktop files, stop on that item and document exactly what would need extracting.

## 6. Send invites: full parity and safety

The owner's top concern is being able to send invites from the app.
- Audit Send invites against the desktop flow: choose guests or groups, choose email or WhatsApp, preview the message and invitation, schedule or send now, see sent and failed status, resend. Close every gap.
- Before anything sends, a confirmation sheet shows the exact number of recipients, the channel, and the first few names, with "Send to 42 guests" as the button. No sending on a single tap.
- In demo builds, sending is simulated: it shows the full flow and a success state, and sends nothing.
- In real builds, it calls the same endpoint the desktop uses.
- Add to `MOBILE_APP.md` a safe test procedure for the owner: add yourself as a guest, filter to that guest, send only to yourself, check email and WhatsApp.

## 7. Budget forecasting and Ava, at parity

- Bring the desktop budget forecasting view to mobile: the forecast graph, the health score, every card and figure the desktop shows, and the "Update my health" action with its roughly 30-second running animation and the updated result. Use the same data and endpoints.
- Fix the "From Ava" card:
  - Its action ("look at my top three" and similar) must do what the desktop does.
  - "Ask again" must re-run it.
  - Show a loading state while it runs and a clear error if it fails.
- In demo builds, Ava and the health update return realistic fixture responses after a realistic delay, including the full animation, so the flow can be judged. Real builds call the real endpoints. Audit every other Ava action in the app for the same problem and fix it the same way.

## 8. Real login track (prepare, do not touch production)

Goal: the owner can run the app on his phone logged in to his real account (the J & L wedding).

1. Add a build mode `mobile:real` (npm script) that builds without the demo flag, pointing at the production API and Base44 app, then syncs.
2. The Base44 app ID comes from a local, uncommitted env file. Document the exact command for the owner to pull it (for example `vercel env pull .env.local`). Confirm `.env*` is gitignored. Never print values.
3. Write `CORS_PROPOSAL.md` at repo root with the exact diff to `api/_lib/security.js`:
   - Allow only `capacitor://localhost` and `https://localhost`, no wildcards.
   - Explain why each is needed and how to verify it after deploy.
   - This is for the product lane to review and merge. Do not apply it.
4. Confirm whether email and password login works through the native shell without the Base44 custom-scheme redirect, and document the result. Google and Apple sign-in need `openinvite://auth` registered in the Base44 auth settings, which the owner does by hand.
5. Add a visible "Live" label on the Account screen in real builds, as "Demo data" is labelled in demo builds, so the owner always knows which he is using.

## 9. Contacts import for guests

- Add `@capacitor-community/contacts`.
- In Guests, "Add guests" offers "From contacts": a searchable multi-select list of the phone's contacts, showing name and whether each already exists in the guest list (duplicate detection by email, phone or name).
- Selected contacts become guests through the existing create-guest mutation, with name, email, phone and address mapped to the desktop guest fields. Then offer "Invite now", which opens Send invites for those guests.
- Add a plain iOS contacts usage description. Ask for permission only when the owner taps "From contacts".
- Demo builds: use fixture contacts, write nothing.

## 10. Calendar sync

- First verify the desktop calendar feed. A product-lane session was diagnosing a calendar feed 404. Fetch the feed URL format the desktop uses and confirm it returns a valid calendar. If it does not, stop this item, document the failure, and leave the button hidden.
- If it works:
  - On the schedule screen, "Add to my calendar" subscribes the phone to the feed through `webcal://`.
  - Each event's sheet gets "Add to calendar", using the existing single-event `.ics` export and the share sheet.

## 11. Offline mode for the day

- Cache the last loaded data for four screens: run sheet (schedule), seating (tables and who sits where), vendor contacts, emergency contacts.
- With no network, these screens open from the cache and are read-only, showing the existing offline banner and when the data was last updated.
- Refresh the cache every time these screens load online.
- Write actions on those screens are disabled offline with a plain explanation.

## 12. Verify and document

- Rebuild with `npm run mobile:demo`, then `npx cap sync`. Confirm `npm run mobile:real` builds, without running it against production from the terminal.
- Fresh 390 by 844 screenshots of every changed screen, into `mobile-screenshots/`.
- `npm run build` passes, and the guest counting test passes. `git diff main --stat` shows only new files and allowed edits.
- Check `src/mobile/`: duplicate photos, inconsistent guest labels, off-brand colours, font sizes outside the scale.
- Update `MOBILE_APP.md` (real login steps, invite test procedure, offline scope), `MOBILE_PARITY.md` and `MOBILE_IDEAS.md` (mark 5, 6 and 8 as built or blocked).
- Push `mobile/app-shell`. No PR.

## Definition of done

- The daily update is full screen with faces toward the camera.
- The top bar shows the mark, search, messages and notifications on every tab.
- Guest labels are consistent, the maths holds for every event and the test proves it.
- The guest suite note sits at the top, and previews use the desktop renderers.
- Send invites is at parity with a confirmation step and a simulated demo.
- Forecasting and Ava work at parity, with realistic demo responses.
- `mobile:real` builds and `CORS_PROPOSAL.md` is written but not applied.
- Contacts import, calendar sync (or a documented feed blocker) and offline day mode are in.
- The build, test and docs are current, and nothing outside the allowed files changed.
