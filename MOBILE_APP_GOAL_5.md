# Goal 5: Openinvite mobile app, full feature parity sweep + owner fixes

Continue on branch `mobile/app-shell`. Goals 1 to 4 built the shell, design, native layer and launch. The owner now judges the app to have about 20 percent of the desktop's planning functionality. This run makes every couple-facing planning feature on mobile do everything its desktop equivalent does, then applies his specific fixes.

## Hard rules

- Read `CLAUDE.md`, `DESIGN_SPEC.md`, `src/mobile/DESIGN_MOBILE.md` and `MOBILE_APP.md` first.
- Stay on `mobile/app-shell`. Never commit to `main`, never merge, never open, close or comment on any PR, including #804, #807 and #809, which belong to other lanes. Push the branch only.
- Leave `ios/App/App.xcodeproj/project.pbxproj` signing team lines uncommitted. They are the owner's local signing settings.
- Allowed edits outside `src/mobile/`: router registration for `/m/*`, `package.json`, `capacitor.config.ts`, `assets/`, `ios/`, `android/`. Do not modify existing desktop pages, components, hooks or services. Import and reuse them freely. If desktop logic is locked inside a page component and cannot be imported without editing the desktop file, rebuild the logic inside `src/mobile/` using the same hooks and mutations, and list each case in `MOBILE_APP.md` under "Needs a decision" as a future shared-extraction candidate.
- No database, schema, entity or env changes. No new API keys. No new dependencies. No `npm audit fix`.
- Base44 connector use is limited to `list_entity_schemas`. Never read production rows.
- No secrets in code, logs or commits.
- Design rules in `DESIGN_MOBILE.md` apply, including the goal 4 type scale, brand colours only, default proportional figures, sentence case, Lucide icons, no emojis, no em dashes.
- One commit per feature or fix, `npm run build` before each. Blockers are documented and stubbed, they do not stop the run.

## Phase 0: Parity audit (no code)

Create `MOBILE_PARITY.md` at repo root. For every couple-facing desktop dashboard feature, read the desktop page and every modal, drawer, form and sub-view it opens, and record:

- Every field shown and editable, with its type and validation.
- Every action: create, edit, delete, reorder, duplicate, filter, sort, search, import, export, share, send, assign.
- Every modal and its full field list.
- Every integration it uses (Google Places autocomplete, place details, maps, Google Calendar, Spotify, email sending, Stripe, file upload, Ava tools).
- Every state: empty, loading, error, permission or plan gating.
- The current mobile equivalent and a gap list.

The desktop is the source of truth. Planning features must reach full parity. Canvas-style tools (the seating chart layout and the site builder) reach parity for every list and form based action. The drag-on-canvas surface itself can stay desktop-only with a clear note.

## Phase 1: Close the gaps, feature by feature

Work through `MOBILE_PARITY.md` in desktop sidebar order. For each feature:

1. Build every missing field, action and modal on mobile.
2. Desktop modals become mobile bottom sheets, or full-screen sheets for long forms, with the same fields, defaults, validation messages and save behaviour. No simplified versions.
3. Use the same integrations as the desktop, through the same existing services and hooks:
   - Any location field (venues, event details, vendors, accommodation, transport, experience guide) uses the existing Google Places autocomplete and place details. It stores and shows the same place data the desktop does (name, address, map link, and photo or static map if the desktop shows one).
   - Anything the desktop connects to Google Calendar, Spotify or other services does the same on mobile.
   - Open maps and directions in the native Maps app through `@capacitor/browser` or a maps URL, never inside the app webview.
4. Tick the feature off in `MOBILE_PARITY.md` with what was built, and commit.

Demo mode note: the demo build blocks the network, so Google and live data cannot load there. For demo only, add realistic fixture place data in the same shape the Google integration returns (venue names, full addresses, a placeholder map tile from the `app/` photo folder), so demo screens look like the connected version. Never fake the integration in real mode. If an integration is blocked on the web side (for example the Google Places key), mirror the desktop's current behaviour and note it.

## Phase 2: Owner's specific fixes

These came from the owner using the app on his iPhone. Each one is its own commit.

1. **Home "Next up" cards:** every card is the same height, the height of the first card. Fixed card height, titles clamped to two lines, meta to one line, content aligned to the top.
2. **Guest profile:** RSVP status is broken down per event (ceremony, reception, welcome drinks, and every other event the couple has), each with its own status. Also show everything the desktop guest record holds: meal choice, dietary notes, plus-ones and their details, group or household, table, contact details, address, invitation and message history, gifts and notes. Everything the desktop lets you edit is editable.
3. **Song requests (and every list grouped by date):** the date group header is sticky. It sits at the top with a solid background matching the page, and rows scroll underneath it without overlapping.
4. **Checklist and to-dos:**
   - Tapping a task opens its detail sheet with every desktop field and action.
   - Tapping the circle fills it with a short animation, strikes the title through, gives a light haptic, and after about 1 second the task moves into a collapsible "Completed" section at the bottom of its group.
   - Show an "Undo" toast for 4 seconds after completing.
   - Completed tasks can be unticked from the Completed section.
5. **Polls and games:** full create, edit, delete, options, settings and results, matching desktop.
6. **Plan tab accordion:**
   - Each desktop sidebar group is an accordion section. The collapsed header shows the group name at the section heading size, a count of features, and a chevron.
   - Tap to expand and show that group's tiles. Tap again to collapse.
   - Remember which sections are open.
   - The first section is open on the first visit, and the rest start collapsed.
   - Keep the overall progress card above the accordion.

## Phase 3: Photos, no repeats anywhere

The owner still sees the same photo in more than one place, and some tiles without photos.

1. For every preview screen, including every sub-screen and sheet, collect every image actually rendered in the DOM, not just the manifest.
2. Any rendered image not coming from `src/mobile/images.ts` is a bug. Route it through the manifest. This includes fixtures, hero fallbacks, avatars used as photos, and empty states.
3. Across the entire app, every photo appears exactly once. No public ID is reused in two slots, and no slot is served by a hidden fallback that duplicates another.
4. Every tile or card that is designed to hold a photo has one. List any tile that is intentionally photo-free and why.
5. The owner supplied 73 photos in the Cloudinary `app/` folder. If the app now needs more photo slots than there are usable photos, stop assigning, report exactly how many more photos are needed and for which slots, and leave those slots on a clean colour panel until the owner adds them.
6. Update `/m/preview/images` to show every rendered slot, and to fail loudly on any duplicate.

## Phase 4: Independent parity check

When the build work is done, start a fresh subagent that has not seen this session's work. Give it only `MOBILE_PARITY.md`, the desktop source and the mobile source. Ask it to verify, feature by feature, that every desktop field, action, modal and integration exists on mobile, and to list every gap it finds. Fix every gap it reports, then update `MOBILE_PARITY.md`.

## Phase 5: Verify and document

- Rebuild with `npm run mobile:demo`, then `npx cap sync`.
- Fresh 390 by 844 screenshots of every preview screen and every sheet into `mobile-screenshots/`.
- `npm run build` passes. `git diff main --stat` shows only new files and allowed edits.
- Inside `src/mobile/`, check: duplicate photos, Cloudinary IDs outside `images.ts`, font sizes above the goal 4 scale, off-brand colours, `tabular-nums`, emojis, em dashes.
- Update `MOBILE_APP.md` and `MOBILE_PARITY.md`: what was built, remaining desktop-only items with reasons, shared-extraction candidates, and photos still needed.
- Push `mobile/app-shell`. No PR.

## Definition of done

- `MOBILE_PARITY.md` shows every couple-facing planning feature at full parity, or lists a specific, justified desktop-only exception.
- Every desktop modal has a mobile sheet with the same fields and behaviour, and location fields use the same Google integration as the desktop.
- All six owner fixes are in.
- No photo appears twice anywhere in the app, and every photo tile is filled or explicitly reported as waiting on more photos.
- The independent subagent check found no remaining gaps, or every gap it found is fixed.
- Screenshots and docs are current, the build passes, nothing outside the allowed files changed.
