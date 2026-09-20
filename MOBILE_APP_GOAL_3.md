# Goal 3: Openinvite mobile app, list patterns + native app layer + first-run experience

Continue on the existing branch `mobile/app-shell`. Goals 1 and 2 stay as built. This run settles how lists look, turns the web shell into a proper native app (icon, splash, deep links, Face ID lock, camera, offline handling), adds the first-run experience, and prepares the push backend for approval without applying it.

## Outcome

1. One consistent list system across the app, following the rule in Phase 1.
2. A single image manifest so photos can be swapped later in one file, plus a preview page showing every image slot.
3. Native layer: app icon and splash, deep-link handling for auth, Face ID app lock, camera and photo library upload, keyboard and safe-area polish, offline and slow-network states, optimistic updates.
4. First-run experience: welcome screens, a mobile login screen, and notification permission priming.
5. `PUSH_BACKEND_PROPOSAL.md`: the exact schema, function and payload design for real push, written for approval. Nothing applied.
6. Accessibility pass, fresh screenshots, updated docs. `npm run build` passes. No existing desktop or guest-facing page changed.

## Hard rules (unchanged)

- Read `CLAUDE.md`, `DESIGN_SPEC.md`, `src/mobile/DESIGN_MOBILE.md` and `MOBILE_APP.md` first.
- Stay on `mobile/app-shell`. Never commit to `main`, never merge, never open a PR. Push the branch only.
- Additive only. Allowed edits outside `src/mobile/`: router registration for `/m/*`, `package.json`, `capacitor.config.ts`, and the native `ios/` and `android/` projects. Anything else goes under "Needs a decision" in `MOBILE_APP.md`.
- No database, schema, RLS, entity or env changes. No `npm audit fix`. No upgrades to existing dependencies. New dependencies are limited to the Capacitor plugins named in this file and `@capacitor/assets` as a dev dependency.
- Reuse the existing data client, hooks, mutations and upload utilities exactly as the desktop does.
- Keep the presentational plus container split so everything works in `/m/preview`.
- Design rules in `DESIGN_MOBILE.md` apply: sentence case, Plus Jakarta Sans, Lucide only, no emojis, no em dashes, no hype copy, no gradients except the photo scrim, one elevation token for floating elements only.
- Commit per phase, `npm run build` before each commit. Blockers are documented and stubbed, they do not stop the run.

## Phase 1: List patterns

The decision: use both patterns, chosen by a rule, never mixed within one list.

Item cards (each item is its own rounded card with a 12px gap, like a product list): use when items are few enough to browse, each one matters on its own, and the item has an image or a primary action. Anatomy: 72px rounded thumbnail or colour tile on the left, title, one meta line, a key value (amount, date or status) at the bottom left, and one trailing action on the right edge where it makes sense (complete, pay, message, call). The whole card taps through to detail.
Use for: vendors, registry items, payments due, tasks in "Next up" and "Due soon", seating tables, accommodation and transport options, experience guide entries, polls, timeline moments.

Grouped rows (many rows inside one rounded card, hairline dividers, sticky section headers): use when the list is long, text-led and scanned or searched rather than browsed.
Use for: guests, budget line items inside a category, full checklist inside each group, messages conversation list, notification centre, song requests, guestbook entries, settings and account.

Rule of thumb to record in `DESIGN_MOBILE.md`: more than about 25 items or no image and no inline action means grouped rows. Otherwise item cards.

Also:
- Build `ItemCard` and refine `Row` and `GroupedList` as shared components, then move every list in the app onto one or the other.
- Add a view toggle (circular icon button at the top right, next to search) on vendors and registry only, switching between item cards and a two-column image grid. Remember the choice locally.
- Swipe actions on grouped rows where an existing mutation supports it: complete a task, mark a message read, delete with confirm.
- Long lists are virtualised or paginated if the existing data layer already supports it. Do not add a virtualisation library.
- Every list keeps its skeleton, empty and error states, and gets pull to refresh.

## Phase 2: Image manifest

More photos are coming later, so make swapping them trivial.

- Create `src/mobile/images.ts` as the single source of truth: every decorative image slot in the app (hero fallbacks, Plan hub tiles, "keep planning" cards, empty states, welcome screens, lock screen mock wallpaper) mapped to a Cloudinary public ID, alt text, and focal point if needed. No Cloudinary ID for a decorative slot may live anywhere else in `src/mobile/`.
- Slots with no good image yet use a colour panel and are marked `todo: true` in the manifest.
- Add `/m/preview/images`, dev only: a gallery of every slot showing the current image, slot name, where it is used, recommended pixel size and aspect ratio, and a clear "needs photo" marker on the todo slots. This is the shopping list for the next batch of photos.
- Stills only for any ID starting with `DTS_`. Do not invent public IDs.

## Phase 3: Native layer

Icon and splash
- Generate app icon and splash assets for iOS and Android with `@capacitor/assets` from the existing Openinvite logo in the repo. Splash is a flat background with the logo centred, no gradient. If no suitable source file exists at high enough resolution, create the config and folder, document exactly what file is needed (1024 by 1024 icon, 2732 by 2732 splash), and continue.
- Splash hides once the shell and first data are ready, with a short fade.

Deep links and auth
- Register the custom URL scheme `openinvite://` in the iOS and Android projects and add a listener with `@capacitor/app` `appUrlOpen` that routes incoming links into the router under `/m`.
- Handle auth callbacks: when a Supabase auth redirect arrives through the scheme, complete the session using the existing auth client and land on Home. Study the existing web callback handling and mirror it. Do not change the web flow.
- In `MOBILE_APP.md`, list the exact redirect URLs that must be added in the Supabase dashboard by hand, and note that universal links on the openinvite.com.au domain are the later upgrade.
- External links open in the in-app browser through `@capacitor/browser`, never by navigating the app's own webview away.

Face ID app lock
- Add `@aparajita/capacitor-biometric-auth`. Under Account, add "Require Face ID to open". When on, the app shows a branded lock screen on cold start and after five minutes in the background, and unlocks with Face ID, Touch ID or the Android equivalent, with device passcode as fallback.
- This is an app lock only. Do not store passwords, tokens or any credential anywhere new. The existing session handling stays as it is.
- Web and preview: the toggle is hidden when not native.

Camera and photos
- Add `@capacitor/camera`. Wherever the desktop lets a couple upload an image and that feature exists in the app, offer "Take photo" and "Choose from library" in a bottom sheet, then upload through the existing upload utility and Cloudinary preset the desktop uses. Show upload progress and a retry on failure.
- Add the iOS usage description strings for camera and photo library, written plainly.

Keyboard, safe areas, gestures
- Inputs are never hidden by the keyboard. Composer bars (messages, Ava) sit on top of the keyboard. Tapping outside dismisses it.
- Check every screen and sheet against the notch, Dynamic Island and home indicator.
- iOS edge swipe goes back. Android hardware back closes sheets first, then goes back, then asks before exiting from Home.
- Disable webview tells: no text selection on UI chrome, no tap highlight, no rubber-band bounce on the shell, no pinch zoom, no long-press callout on images.

Offline and slow network
- Add `@capacitor/network`. When offline, show a slim banner under the header, keep showing the last loaded data, and disable actions that need the network with a plain explanation.
- Optimistic updates for the quick actions where the existing data layer makes it safe: completing a task, marking a notification or message read, toggling a setting. Roll back with a short message if the save fails.
- Every request path has a timeout state with a retry button. No infinite spinners.

## Phase 4: First-run experience

- Welcome: three full-screen swipeable screens with a photo from the manifest, a short headline and one line of text each, dots, "Get started" and "I already have an account". Shown once, tracked locally.
- Mobile login at `/m/login`: email and password with the existing auth client, show and hide password, plain error messages, links out to the existing reset flow. Magic link and social options appear only if the web app has them, and go through the deep-link handling from Phase 3. Do not alter the existing web login page.
- New accounts: if sign-up involves plan selection or payment on the web, do not rebuild it. When native, say the account is created on the website and offer to open it in the in-app browser. Record this under "Needs a decision" with the App Store purchase question.
- Notification priming: a friendly screen explaining what notifications the couple will get, shown the first time something notable happens (first RSVP arrives), with "Turn on notifications" and "Not now". For now "Turn on" only records the choice locally and says notifications are coming soon. Do not call the system permission prompt yet.
- Add all of these to `/m/preview`.

## Phase 5: Push backend proposal (write, do not apply)

Create `PUSH_BACKEND_PROPOSAL.md` at repo root. Schema discipline applies: this is a proposal to be approved, so show everything exactly and change nothing.

Include:
- The exact table definitions: a notifications table and a device tokens table, with columns, types, indexes and the precise RLS policies. Owner-scoped reads. Writes to notifications only from the server side. Follow the project's existing pattern of keeping guest-writable data in its own entities, and never attach these to guest-writable paths.
- What generates each notification type: database triggers or a server function for RSVPs, messages, guestbook, song requests, polls, registry, plus a scheduled job for due tasks, due payments and the Ava briefing.
- The fan-out function: reads new notifications, respects per-type settings and quiet hours, sends through APNs and FCM, handles invalid tokens.
- Exact payload examples per type using `src/mobile/notifications/copy.ts`, including the deep link each one opens.
- What is needed from the owner: Apple Developer account, APNs key, Firebase project, where each secret would live.
- How `useNotifications` swaps from the derived feed to the table with no screen changes.
- A rollout order and a rollback plan.

## Phase 6: Accessibility, verify, document

Accessibility
- Every icon-only button has an accessible label. Tabs, toggles, sheets and carousels have correct roles and focus order. Sheets trap focus and restore it on close.
- Layouts survive large text: test at 130 percent and fix truncation and overlap.
- Contrast: text on photos always sits on the scrim, text on colour panels meets AA, nothing lighter than #444444 on light surfaces.
- Reduced motion removes movement, parallax and count-ups.

Verify
- Run `npx cap sync`. If Xcode is installed, confirm the iOS project builds for the simulator from the command line and record the result. If it is not installed, record that and the steps.
- Fresh 390 by 844 screenshots of every preview screen, including the new list patterns, the image gallery, welcome, login, lock screen, offline state and permission priming. Replace the old set.
- `npm run build` passes. `git diff main --stat` shows only new files and the allowed edits.
- Inside `src/mobile/`, search for and fix: `uppercase`, emoji, em dashes, exclamation marks in UI copy, gradients other than the scrim, shadows other than the elevation token, fonts other than Plus Jakarta Sans, Cloudinary IDs outside `images.ts` for decorative slots.

Document
- Update `MOBILE_APP.md`: what was built, how to run on the simulator and on a real iPhone, manual steps for the owner (Supabase redirect URLs, icon source file if missing, Xcode install, Apple Developer account), the list rule, stubs and blockers, "Needs a decision", and the roadmap re-ordered for what is left before TestFlight.
- Push `mobile/app-shell`. Do not open a PR.

## Definition of done

- Every list in the app uses item cards or grouped rows according to the rule, and the rule is written in `DESIGN_MOBILE.md`.
- `images.ts` owns every decorative image and `/m/preview/images` shows the full slot gallery with todo markers.
- Icon, splash, deep links, Face ID lock, camera upload, keyboard handling, offline states and optimistic updates are in place, or the precise blocker is documented.
- Welcome, mobile login and notification priming exist and appear in preview.
- `PUSH_BACKEND_PROPOSAL.md` is complete and nothing in it has been applied.
- Screenshots are refreshed, docs are current, the build passes, and nothing outside the allowed files changed.
