# Product visual capture pipeline

Scripted Playwright suite that drives the real production app (never a mock,
never fixture data) to produce the marketing site's product screenshots and
short flow recordings. Built because the marketing site was selling a product
nobody could actually see.

## The standing rule: look, don't touch

Every script in this folder navigates, scrolls, hovers, and — where a
component's own code confirms the action is pure client-side view state
(previewing a universe, selecting a seating table) — clicks. **Nothing here
ever creates, edits, sends, or deletes real data.** Before any interaction
beyond plain navigation was added, the relevant component's source was read
to confirm what the click actually does. Where an interaction would write
(e.g. the Design Studio's actual "switch universe" button, distinct from
just previewing one), the script stops short of it.

The one exception, done once and deliberately: the mobile RSVP shot needs a
real guest's `rsvp_link_id`, which is null until first generated via the
app's own "Copy links" action (`src/pages/Guests.jsx`). That single token
was generated for one real guest ("Jay Smith") in a one-off, explicitly
authorized run — not part of the rerunnable suite. It's cached at
`scripts/capture/output/rsvp-token.txt` (gitignored); if that file is ever
missing, `stills.mjs`/`videos.mjs` skip the RSVP shot with a warning rather
than silently generating a new token.

## Setup

```bash
npm install                      # installs playwright + ffmpeg-static (devDependencies)
npx playwright install chromium  # downloads the browser binary (~150MB, one-time)
```

Add to `.env.local` (gitignored, never commit):

```
CAPTURE_BASE_URL=https://openinvite.com.au   # optional, defaults to prod
CAPTURE_TEST_EMAIL=<owner account email>
CAPTURE_TEST_PASSWORD=<its password>
CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud_name>   # same var scripts/ already uses
```

The account must be the wedding's **owner**, not a collaborator — a
collaborator session shows the "Collaborating on X's wedding" banner on
every page, which must never appear in marketing imagery.

## Running it

```bash
npm run capture              # the one command: preflight -> stills -> videos -> upload -> report
```

Or step by step:

```bash
npm run capture:preflight    # must pass before anything else — see below
npm run capture:stills
npm run capture:videos
npm run capture:upload
```

`run-all.mjs` stops immediately if any step fails — it will not capture
against a broken pre-flight state.

## Pre-flight (`preflight.mjs`)

Must pass before any capture. Checks, in order:

1. **Email/password login succeeds.** If the account turns out to need
   Google SSO (no password form reachable), this stops and reports rather
   than attempting to automate OAuth — that was a standing instruction, not
   a fallback to improvise around.
2. Lands on `/Dashboard`, not `/onboarding` (an empty/fresh account).
3. Dashboard body text contains the expected wedding's names.
4. No trial/upgrade banner, and `/account`'s Billing tab shows the expected
   plan badge with no conflicting badge present.

Saves the authenticated session to `output/storage-state.json` (gitignored)
for `stills.mjs`/`videos.mjs` to reuse — logging in once per run, not once
per shot.

## Shot list

**Stills** (`stills.mjs`) — 2x retina, 1440×900 desktop / 390×844 mobile,
light mode, wrapped in a flat on-brand browser-chrome frame (no shadow, no
rounded corners — matches DESIGN_SPEC.md, not a generic glossy device mockup):

| # | Shot | Route |
|---|---|---|
| 1 | Design studio universe wall | `/studio/universe` |
| 2 | Entrance moment landing | `/w/<slug>` |
| 3 | A world page | `/w/<slug>/<page>` — picked by checking which content fields are actually filled in, not hardcoded (see note below) |
| 4 | Website builder in use | `/website-editor` |
| 5 | Guest list | `/Guests` |
| 6 | Seating canvas | `/Seating` |
| 7 | RSVP, mobile viewport | `/rsvp/<token>` — one real guest's link, generated once (see above) |

**Videos** (`videos.mjs`) — 10-20s each, same visual treatment, transcoded
to both `.webm` (vp9, primary) and `.mp4` (h264, Safari/fallback), plus a
`.jpg` poster frame extracted ~1s before the end (not the start — every
flow spends its first couple of seconds on page-load settle, so an early
frame posters a loading skeleton instead of real content):

| # | Flow | Route | What it shows |
|---|---|---|---|
| 1 | Choosing a universe | `/studio/universe` | Scrolling the universe wall, opening one universe's preview (client-side only — the actual "switch universe" write is a separate button this flow never reaches) |
| 2 | Seating exploration | `/Seating` | Panning the canvas, selecting a table to view its assignment panel (no drag) |
| 3 | Guest RSVP view | `/rsvp/<token>` | Scrolling a real personalized RSVP page, toggling "Attending" (a selection, not a submission) — stops before the actual Submit |
| 4 | Budget tracker in motion | `/Budget` | Scrolling the real budget breakdown, hovering line items |
| 5 | Moodboard browsing | `/Moodboard` | Scrolling through the real moodboard grid |
| 6 | Ava — wedding date | `/Dashboard` | Opening Ava via the same `openAva` window event `Layout.jsx` listens for, typing "What's my wedding date?", letting the streamed answer render — a read-only question, never a write |
| 7 | Ava — guest count | `/Dashboard` | Same Ava panel, typing "How many guests have RSVP'd so far?" — again read-only ("how many", not "add"/"change"/"send") |

Flows 6 and 7 are deliberately informational questions only — asking "what"
or "how many" rather than "add"/"change"/"send" — so there's no ambiguity
about Ava taking a write action on camera.

### Two shots don't point where the brief originally said, and here's why

- **Shot 3** ("a world page"): originally `/our-story`, but that account's
  `ourStoryContent` is placeholder test text ("ghfghfnbv") with an empty
  photo gallery — real data, just not presentable. Checked every content
  field on the WeddingDetails record (read-only) before picking a
  replacement; `/stay` (guestSuiteAccommodation) is the one page with
  genuinely filled-in content (real Sydney hotels, real ratings).
- **Shot 4** ("invitation builder"): originally `/Invitations`, but this
  account has never created an Invitation record, so that route only shows
  the blank "Create your wedding website" first-run wizard — and clicking
  through it would create data. `/website-editor` is the drag-and-drop
  site builder, already fully populated for this wedding (active Kyoto
  universe, real pages, real settings) — a truer "builder in use" shot.

If you re-run this suite against a different account, re-check whether
these substitutions still make sense — a fully-populated account might make
the original `/our-story` and `/Invitations` shots viable again.

### Known limitation

The `/stay` world-page shot's venue cards show real names/ratings/addresses
but the venue photos don't render in headless capture (they load fine in a
normal browser session) — worth another look if this suite is revisited,
not blocking.

## Post-processing (`frame.mjs`)

- Stills: the raw screenshot is inlined as a base64 data URI into an HTML
  page (a `file://` reference gets blocked by Chromium's cross-origin
  file-access rules when the page is loaded via `page.setContent()` —
  learned the hard way, first attempt produced blank frames), rendered
  alongside the browser-chrome bar, and re-screenshotted.
- Videos: the same chrome bar is rendered once as a standalone PNG, then
  ffmpeg's `vstack` filter stacks it above the raw recording — simpler and
  more reliable than alpha-compositing a cut-out bezel over motion video.

## Uploading (`upload.mjs`)

Signed Cloudinary upload (HMAC-SHA1 over sorted params + api_secret, Node's
built-in `crypto` — no SDK dependency) to the `product-shots/` folder.
Writes `output/manifest.json` mapping each shot name to its secure URL(s).
Re-running uploads with the same `public_id`, so Cloudinary overwrites in
place rather than accumulating duplicates — this is the intended shape for
"one command re-captures everything after any UI change."

## Files

```
config.mjs      shared env/paths/viewport config
auth.mjs        standalone login + session-save (preflight.mjs does this too; kept as a utility)
preflight.mjs   the mandatory gate — read this before running anything else
stills.mjs      the 7 still shots
videos.mjs      the 3 flow recordings
frame.mjs       browser-chrome compositing (stills + video) and ffmpeg transcode/poster
upload.mjs      Cloudinary upload + manifest.json
run-all.mjs     preflight -> stills -> videos -> upload -> report (npm run capture)
output/         gitignored — screenshots, videos, session state, manifest, RSVP token
```
