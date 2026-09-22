# Goal 6: Openinvite mobile app, launch experience, guest suite naming, polish

Continue on branch `mobile/app-shell`. The owner has used the goal 5 build on his iPhone and is happy with the direction. This run refines the launch sequence, adopts "Guest suite" naming, adds a frosted floating tab bar, sets the real app icon and applies his screen-level fixes.

## Hard rules

- Read `CLAUDE.md`, `DESIGN_SPEC.md`, `src/mobile/DESIGN_MOBILE.md`, `MOBILE_APP.md` and `MOBILE_PARITY.md` first.
- Stay on `mobile/app-shell`. Never commit to `main`, never merge, never open, close or comment on any PR. Push the branch only.
- Leave the local signing team lines in `ios/App/App.xcodeproj/project.pbxproj` uncommitted.
- Allowed edits outside `src/mobile/`: router registration for `/m/*`, `package.json`, `capacitor.config.ts`, `assets/`, `ios/`, `android/`. Do not modify desktop files. Import and reuse desktop hooks and logic freely.
- No database, schema, entity or env changes. No new API keys. No new dependencies. No secrets anywhere.
- Photos come only from the Cloudinary `app/` folder through `src/mobile/images.ts`. Photos stay stills: no zoom or motion effects on any photo.
- Design rules in `DESIGN_MOBILE.md` apply. Brand colours only, sentence case, Lucide icons, no emojis, no em dashes, no hype copy.
- One commit per numbered item, `npm run build` before each. Blockers are documented and stubbed, they do not stop the run.

## 1. App icon

- Replace the current red circle icon with the Openinvite brand mark only, without the word "Openinvite". Find the mark in the repo (it is already used on the site). Do not redraw it.
- Regenerate the iOS and Android icons with `@capacitor/assets`, using the correct padding and background from `DESIGN_SPEC.md`.
- The native launch screen also uses the mark rather than the full wordmark if it currently shows the word. The in-app splash keeps the full logo.

## 2. Launch timing

The owner cannot see the steps because they pass too quickly.

- Native launch screen: at least 1.2 seconds.
- In-app photo splash with the full logo: at least 1.8 seconds, then a gentle crossfade onward. Never shorter, even if data is ready sooner.
- Then the daily update screen (item 4), which stays until the user taps "Let's go".
- The daily update screen shows on the first open of each calendar day, local time. Later opens that day go splash, then dashboard. Store the last-shown date locally.
- Respect reduced motion by using plain fades.

## 3. Rotating splash photo

- Replace the single Kyoto photo with a rotating pool of 20 to 30 photos from the `app/` folder.
- Each open shows a different photo from the pool, never the same one twice in a row, and it cycles through the whole pool before repeating.
- Pool photos must not be used anywhere else in the app. The "no photo appears twice" rule still holds.
- If fewer than 20 unused photos remain after all other slots are filled, use what is available and report exactly how many more photos are needed.
- Pick photos that work behind a centred logo with the scrim: calm, strong, faces not cut off, no closed eyes.

## 4. Daily update screen (replaces the plain greeting)

Mirror the desktop daily update exactly in content. Find the desktop daily update component and reuse its data and logic, so the mobile screen always says the same thing the desktop says for that couple on that day. Example from the owner's own account: the date small at the top, "Morning, J & L.", "100 days out and we're well on track.", "Today's first move: book the celebrant."

Layout, bold and engaging (the dashboard after it stays calm):
- Top third: a full-bleed photo from the couple's own photos (demo: the demo couple photo pool from item 7), square corners top, rounded 28px where it meets the panel below.
- Bottom two thirds: a flat #E03553 panel with white text.
  - Date: 13/18, weight 600, white at full opacity.
  - Greeting: 40/46, weight 600.
  - Status line and first move: 20/28, weight 500, with 16px between lines.
- A white pill button "Let's go" with #E03553 text, full width inside the gutter, above the home indicator.
- Text on the pink panel must meet AA contrast. Test at 130 percent text size and fix any truncation.
- Tapping "Let's go" slides the panel away and settles the dashboard in, with a light haptic.
- Add `/m/preview/daily-update`.

## 5. "Guest suite" naming

"Guest suite" is Openinvite branding and must be used everywhere in the app.
- The bottom tab "Site" becomes "Guest suite". Keep the current icon.
- Replace "site", "your site" and "website" wherever they refer to the couple's guest-facing pages across `src/mobile/`: headings, buttons, empty states, notifications copy, Ava sheet prompts, account rows and fixtures. Keep "website" only where it means the Openinvite desktop product.
- Grep `src/mobile/` for "site" afterwards and review every remaining hit.

## 6. Home hero carousel

- The share card: title "Guest suite", line "Share with your guests", one pill button "Share link" that opens the native share sheet with the guest suite link. Remove the URL text shown under it. Nothing else on the card.
- Rotating cards:
  - Build a pool of 6 to 8 card types from real data: days to go, RSVPs so far, from Ava, guest suite share, next payment due, next task, recent song requests or guestbook, and any other the desktop dashboard highlights.
  - Each open shows 4 of them. Days to go is always first. The other three rotate so the owner does not see the same set every time.
  - Only show a card when real data backs it.
- Hero photos are the couple's own:
  - In real mode, use the couple's uploaded photos (their moodboard, guest suite gallery or any photo the desktop stores for them) for the hero cards.
  - While they have none, fall back to the standard app photos.
  - Every section below the hero keeps using the standard `app/` photos chosen for them.
  - In demo, create a separate "demo couple photos" pool of 4 to 6 photos from the `app/` folder, not used anywhere else, and treat it as the couple's own.

## 7. Frosted glass tab bar

- Make the bottom tab bar a floating frosted glass bar: inset 12px from the sides and above the home indicator, fully rounded, a white tint around 70 percent opacity with `backdrop-filter: blur(24px) saturate(180%)`, a hairline white inner border at around 40 percent opacity, and the single elevation token.
- Content scrolls visibly underneath it.
- Provide a solid fallback when `backdrop-filter` is unsupported, and when the user has Reduce Transparency on (`prefers-reduced-transparency`).
- Apply the same frosted treatment to the compact top bar that appears on scroll, for consistency.

## 8. Guests tab tidy

- Summary header: the guest count, "Guests" and the plus-ones figure sit on one line at 390px width. Use a compact stat row, for example "99 guests · 17 plus-ones", and never wrap it.
- Sort and filter:
  - Put search, sort and filter controls in one consistent bar, all the same height (44px), same type size (15/20) and same pill style.
  - Sort becomes one pill showing the current choice, such as "Newest first" with a chevron, which opens a bottom sheet of options.
  - No mixed tiny and large labels.
- The event filter pills (all, ceremony, reception and others) stay as they are.

## 9. Photo fixes

- Styling tile: reposition the crop so the person's face sits fully in frame. Adjust the focal point or gravity for that slot only.
- Emergency contacts tile: add a photo.
- Extras and considerations tile: add a photo.
- Both new photos must be unused elsewhere. Re-run the duplicate check across all rendered screens.

## 10. Remove QR code and direct email from sharing

- Remove every QR code feature from the app (share sheets, guest suite screen, fixtures).
- Remove "Email your guests" and any other way to email or message guests outside the Send invites flow.
- Guests are contacted only through Send invites, by email or WhatsApp.
- Keep "Share link" (native share sheet with the guest suite link) and "View guest suite".
- Record both removals in `MOBILE_PARITY.md` as owner decisions, so a future parity sweep does not add them back even if the desktop still has them.

## 11. Parity note

In `MOBILE_APP.md`, add a short section "Keeping parity": `MOBILE_PARITY.md` is the source of truth; new desktop planning features must get a matching entry; the owner will add a "Mobile impact" line rule to the product lane. Do not edit `CLAUDE.md` yourself.

## 12. Verify and document

- Rebuild with `npm run mobile:demo`, then `npx cap sync`.
- Fresh 390 by 844 screenshots of every preview screen, including the daily update, splash and the new tab bar over scrolled content.
- `npm run build` passes. `git diff main --stat` shows only new files and allowed edits.
- In `src/mobile/`, check: no photo rendered twice (splash pool and demo couple pool included), no QR code, no direct email to guests, "Guest suite" naming complete, no off-brand colours, no font sizes outside the scale except the daily update values in item 4.
- Update `MOBILE_APP.md` and `DESIGN_MOBILE.md`. Report how many photos remain unused and whether more are needed.
- Push `mobile/app-shell`. No PR.

## Definition of done

- The brand mark is the app icon.
- The launch goes native screen, rotating photo splash, then the bold daily update (first open of the day), then the dashboard, each step visible.
- "Guest suite" naming is used everywhere and the tab is renamed.
- The hero rotates its cards and uses the couple's own photos.
- The tab bar is frosted glass with fallbacks.
- The guests header and sort bar are tidy.
- Photo fixes are in, QR code and direct email are gone, and the build and docs are current.
