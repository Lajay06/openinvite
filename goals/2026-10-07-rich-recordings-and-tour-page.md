# Rich recordings and the tour page (lane B)

The studio tour recordings were made against a four-guest fixture and look thin. The marketing /tour page still carries placeholders. Both are fixed from one source: a rich, deterministic recording fixture that looks like a real wedding six weeks out.

## Territory

Lane B owns: marketing pages and components, scripts/ recording and fixture code, scripts/lib/fixtures, the Cloudinary studio-tour assets, prerendered/, and src/lib/studioTour.js for recording URLs only. Lane B never touches api/, dashboard pages under src/pages, src/components outside marketing, or any other src/lib file. Lane A is on main at the same time; pull and rebase before every PR; prerendered/ conflicts take main wholesale then re-run build:prerender.

## Items

1. Audit, report only, inside the item 2 PR body: how the nine chapters are recorded today (script, widths, fixture, Cloudinary paths, size guard), and every placeholder on /tour (selector, what it stands in for).

2. Rich fixture. scripts/lib/fixtures/richWedding.mjs, seeded and deterministic, selectable in the render harness as fixture "rich". Shape: a couple with a wedding in six weeks in an Australian city, a published site in one universe, three main events plus two custom events, 212 guests in about 140 invitations using household_id, is_child and child_age (the fields exist on main; the resolver is lane A's #900 and may not be merged yet, so set the fields on rows and do not import household.js), about 65 percent replied with a realistic mix, meal choices and dietary notes, 18 tables with most guests seated, a budget of about 25 lines with vendors and payments, a 14-item run sheet, 30 tasks with some done, notes, a moodboard of existing Cloudinary stock images, three guest notes and two song requests. Names plausible and varied, no real person, no data from any live account. Default fixture unchanged so no existing guard moves. Held PR.

3. Re-record the nine studio tour chapters from the rich fixture at the same widths and Cloudinary paths as today, same derivatives and size cap, poster frames included; studioTour.js updated only where a URL or version changes; the Ava chapter still uses the recording-only fixture reply. Held PR.

4. The /tour marketing page. Every placeholder replaced with real footage from the rich fixture (reuse chapter recordings where the chapter matches; record a dedicated clip where it does not), captions in my voice (plain, sentence case, no em dashes), section order that walks a couple through the product the way the studio tour does, measured contrast on any text over video, 390 and 1440 with no horizontal scroll, prerendered. Held PR.

5. Guards: fixture shape pinned (counts above); every recording URL in studioTour.js and on /tour returns 200 with the right content type and is under the size cap; /tour has zero placeholder markers (a guard that fails on the audit's selectors); test:marketing-routes green. Proved red once each.

## What else does this touch

Dashboard: nothing; the fixture is harness-only. Mobile: /tour at 390 measured. Legal pages: no. Studio tour copy: unchanged.

## Stop conditions

As CLAUDE.md, plus: no file outside the territory above; no live account used for anything; Cloudinary credentials from env only, never printed; no real names or addresses in the fixture; if a chapter cannot be recorded without a code change outside the territory, STOP and report which.

Lesson, owner ruling 2026-10-09: a new recording is uploaded to a new path or version and the code switches to it; a live Cloudinary path is never overwritten. Cloudinary serves an asset by its path and ignores the version in the URL, so an overwrite changes the live site before any PR merges.

## Protocol

Order 2, 3, 4, 5 (1 is written into 2's PR body). Held PRs, carry on

Closed 2026-10-10 at main e5f4cd59b1377044b689e758332eab8617428f94, PRs #935 #940 #945 #946
