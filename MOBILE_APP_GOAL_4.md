# Goal 4: Openinvite mobile app, owner phone-test fixes

Continue on branch `mobile/app-shell`. The owner has used the app on his iPhone. This run applies his feedback: one photo library, a proper launch sequence, a full-width hero carousel, and a calmer, smaller, more spacious type and layout system.

## Hard rules (unchanged)

- Read `CLAUDE.md`, `DESIGN_SPEC.md`, `src/mobile/DESIGN_MOBILE.md` and `MOBILE_APP.md` first.
- Stay on `mobile/app-shell`. Never commit to `main`, never merge, never open a PR. Push the branch only.
- Allowed edits outside `src/mobile/`: router registration for `/m/*`, `package.json`, `capacitor.config.ts`, `assets/`, and the native `ios/` and `android/` projects.
- No database, schema, entity or env changes. No new dependencies. No `npm audit fix`.
- No secrets in code, logs, commits or chat. Do not print API keys or secrets to the terminal.
- Design rules still apply: Plus Jakarta Sans only with default proportional figures, brand colours only (no browns or creams), sentence case, Lucide icons, no emojis, no em dashes, no hype copy.
- Commit per phase, `npm run build` before each commit. Blockers get documented and stubbed, they do not stop the run.

## Phase 1: One photo library

The owner created a Cloudinary folder named `app` (cloud `dsr84xknv`) with 72 photos. Every decorative image in the mobile app comes from this folder.

1. Get the list of public IDs in the `app` folder.
   - If admin credentials already exist locally as environment variables, list the folder through the Cloudinary Admin or Search API without printing the secret.
   - If they do not, stop this phase and ask the owner in one message to paste the list of public IDs. Do not guess IDs, do not scrape the console, and continue with the other phases while waiting.
2. View every photo (fetch small thumbnails) before assigning it, so each one suits its slot.
3. Rewrite `src/mobile/images.ts` so every decorative slot uses a photo from `app/`. Rules:
   - Every slot has a photo. None left as `todo`, no colour-panel fallbacks except on load failure.
   - No photo appears twice on the same screen. Across the whole app, prefer each photo once. With 72 photos this should be possible. If a repeat is unavoidable, keep repeats on different tabs.
   - Match photo to meaning (a table setting for seating, flowers for vendors, a couple for Home).
   - Choose crops and focal points so faces are never cut off. Skip any photo with closed eyes in the focal area.
   - Photos stay stills. No zoom, crossfade-zoom or animated effects on any photo. The existing gentle scroll parallax offset is fine.
4. In real (non-demo) mode, the couple's own photos still take priority on the Home hero and the Site preview only. Every other slot uses the `app/` folder.
5. Remove every Cloudinary ID from other folders that was used for decorative slots in `src/mobile/`.
6. Update `/m/preview/images` so it shows every slot and its assigned photo, and flags any repeats.

## Phase 2: Launch sequence

Target experience: tap the icon, a branded splash, a short personal greeting, then the dashboard.

1. Native launch screen (the frame iOS shows before the app loads):
   - Rebuild the iOS launch storyboard as a flat colour view with the full Openinvite logo centred at a small size. No full-screen image, which fixes the black 2 to 4 second launch and the oversized-image warning from the simulator run.
   - Background colour from `DESIGN_SPEC.md`. Update `capacitor.config.ts` and `assets/splash.svg` so the native splash and webview background use the same brand colour. No warm grey.
   - Do the matching change for Android.
2. In-app splash (first thing the web layer shows, hands off seamlessly from the native one):
   - The full Openinvite logo, and a hero photo from the `app/` folder filling the screen behind it, with the photo scrim so the logo reads.
   - Stays until the shell and first data are ready, at least 800ms, at most about 2.5s.
3. Greeting:
   - After the splash, a full-screen moment: "Good morning, {first name}" (or "Good afternoon" or "Good evening" by the phone's local time) in large type, and underneath it one short line of briefing drawn from real data, for example "42 days to go. 3 new RSVPs since yesterday."
   - The greeting fades and slides up out of view after about 1.8 seconds, or immediately on tap, and the dashboard with the bottom tab bar settles in.
   - Show it once per app open, not on every tab change. Respect reduced motion by using a plain fade.
4. Add both screens to `/m/preview` (`/m/preview/splash`, `/m/preview/greeting`).

## Phase 3: Home hero carousel

- Each hero card is full width. One card fills the view at a time with no peek of the next card.
- Swipe left and right to move between cards, snapping one card per swipe, with dot pagination underneath.
- Keep the photo, scrim, label, title or number, and pill button on each card.
- Peek carousels elsewhere (such as "Next up") keep their peek. This change is for the hero only.

## Phase 4: Type scale and white space

The owner finds everything too big and cramped. Reference: the Qantas and Nespresso apps, which use small section headings, a lot of white space and calm, readable type. Update the tokens so the change flows everywhere, then check every screen.

New scale (update `DESIGN_MOBILE.md` to match):
- Screen titles: 28/34, weight 600.
- Section headings above rows and tiles: 17/22, weight 600. This is roughly half their current visual size and is the owner's main complaint.
- Tile and card titles: 15/20, weight 600.
- Body: 15/22.
- Meta and small labels: 13/18.
- Hero numbers: 44/48.
- Inputs stay at 16px minimum so iOS does not zoom.

Spacing:
- Side gutter 20px.
- 40px between sections. 12px between a section heading and its content.
- 12px gap between cards in a row or grid.
- Card inner padding 16px.
- Nothing should feel packed. Where a screen still feels busy after the scale change, remove or combine elements rather than shrinking further.

Tiles:
- Every tile and image card shows its title only. Remove all subtitles and secondary lines from tiles and image cards across the app.
- Keep live stats only where they are the point of the card (stat cards, the RSVP and budget snapshot).

## Phase 5: "Latest" and notifications, made considered

Both currently read as basic and oversized. Redesign together so they share one style.

- Each item is a calm row: a 36px circular icon tile in a soft tint of the type colour, a title at 15/20 weight 600, one line of detail at 13/18 in the secondary text colour, and the relative time right aligned at 13/18.
- Unread items get a small #E03553 dot, not bold text everywhere.
- Group headings ("Today", "This week", "Earlier") at 13/18 weight 600, sentence case.
- Generous row height (at least 64px) and hairline dividers inset past the icon.
- On Home, "Latest" shows the three newest items inside one rounded card with a small "See all" link to the notification centre.
- Where an item involves a person (a guest RSVP, a message), use a circular avatar with their initials in place of the icon tile.

## Phase 6: Verify and document

- Rebuild the demo bundle with `npm run mobile:demo`, then `npx cap sync`.
- Fresh 390 by 844 screenshots of every preview screen, including splash, greeting and the full-width hero, into `mobile-screenshots/`.
- Inside `src/mobile/`, check and fix: any font size above the new scale, any tile subtitle, any repeated photo on one screen, any Cloudinary ID outside `images.ts`, any colour not in `DESIGN_SPEC.md`, any `tabular-nums`.
- `npm run build` passes. `git diff main --stat` shows only new files and allowed edits.
- Update `MOBILE_APP.md`: photo assignment summary, launch sequence, new type scale, anything still waiting on the owner.
- Push `mobile/app-shell`. Do not open a PR. Report which screens changed and whether the owner still needs to paste the photo list.

## Definition of done

- Every decorative slot uses a photo from the `app/` folder with no repeats on a screen, or the run is paused only on the owner pasting the photo list.
- Launch goes native branded screen, in-app photo splash with the full logo, greeting, then dashboard, with no black frame.
- The hero carousel shows one full-width card at a time.
- The new type scale and spacing are applied everywhere, tiles show titles only, and "Latest" and notifications share the new considered row style.
- Screenshots and docs are current, the build passes, nothing outside the allowed files changed.
