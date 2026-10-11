# Dashboard fixes batch 1 (Goal 5, lane A, opened 2026-10-11)

Lane A. Runs under the goal autonomy protocol in WORKFLOW.md. From the owner's
own walkthrough of the dashboard. Copy is written below; use it verbatim. No em
or en dashes anywhere. US English.

Territory: lane A territory, the whole web repo. NO HELD FILE IS EXPECTED. If
one appears, stop and report rather than opening a held PR.

Each item is one PR, self-merged under the protocol, reported as one line:
number, merge SHA, item.

ORDER, owner ruling 2026-10-11: 1, 2, 3, 4, 6, then 5.

## Scout

Done 2026-10-11, read only, printed, and the owner ruled on all five answers.
The findings that changed the items are recorded under each one.

## Items

1. Vendors, one source of truth. VendorRosterSection's button becomes exactly
   "Add vendor" on all five surfaces (Beauty's team tab, Music's tab,
   Photography's two tabs, Transport). VendorContactSection stays as it is: it
   already leads with "Add vendor" and shows edit and change only once a vendor
   is set. Music's tab label becomes "Musicians"; its key and its default tab
   are unchanged. "On the day" (Emergency contacts) STAYS on
   WeddingDetails.dayVendorContacts, because those contacts include people who
   are not vendors, and its control gains two actions: "Add vendor", which
   picks from the shared Vendor list and copies name and phone in, and "Add
   contact", free text. Guard: a vendor created in each category appears on
   every surface for that category, every add control's first-action label is
   "Add vendor", and the On the day pick copies name and phone.

   SCOUT FINDING. The consolidation was already most of the way done: both
   VendorContactSection and VendorRosterSection read the Vendor entity through
   getMyRecords and filter by category, and no page hand-rolls its own
   add-button plus VendorList plus VendorFormModal wiring. What was wrong was
   the wording ("Add beauty vendor", "Add music vendor", and three more) and
   that the category filter was written inline in two places, which is the one
   rule that must not drift. It now lives in
   src/components/vendors/vendorPicks.js. The only surface not on the Vendor
   entity is On the day, hence the owner's ruling above.

2. Faith options. Non-religious pinned first and excluded from the alphabetical
   order, then alphabetical, then Other last. The Interfaith sub-pick uses the
   same list minus Interfaith, with Non-religious pinned first there too.
   _STYLE_TO_FAITH stays valid. All pills the same size.

   SCOUT FINDING. theme.faith is a FREE STRING on WeddingDetails, not an enum,
   so no schema change is needed and every stored value keeps working. The nine
   current options are a front-end constant, FAITH_OPTIONS in
   src/lib/weddingThemeOptions.js. Of those nine, plain "Christian" is not in
   the owner's new list; owner ruling 2026-10-11: keep it, because it is a
   value already stored on real records.

   THE COUNT. The owner's enumerated list is 21 entries including Non-religious
   and Other. Keeping plain Christian makes 22, not the 21 the ruling names.
   Built as 22, exactly as enumerated plus Christian, and reported.

   PILL SIZE, as built. Only the Interfaith sub-pick was compact; it is now the
   default size, so every faith pill matches on both the Theme tab and
   onboarding. The two CULTURE sub-picks keep size="compact", because they are
   not faith and the ruling sits under this item. The sub-pick is the main list
   minus Interfaith, which by the ruling's own wording keeps Other in it: a
   couple can therefore read "Interfaith: Other and Hindu", which is odd and is
   reported rather than quietly filtered.

3. Guests page, AMENDED by the owner's screenshot, 2026-10-11. Remove the "N
   guests across N invitations" line, the invited and replied per-event line,
   and the Refresh button together with its age line. The summary cards and the
   Ava button stay.

   AND THE DEADLINE MOVES, which is why this item is no longer removals only.
   The "Reply by" row (the date input and the sentence "Guests can reply until
   you set a date.") leaves the Guests page. The deadline itself STAYS: it
   becomes editable on the Send invites review step and is shown on Event
   details. Nothing about how the deadline works server-side changes.

   SCOUT FINDING. There is no "Replied by" line on the page. The nearest string
   is "Reply by", a column header, which is why the owner held it back. The age
   line and the Refresh button were shipped together in #943 and are documented
   as belonging together, so they go together. The two summary lines are #902
   and the per-event follow-up goal.

4. Invited to column, AMENDED by the owner's screenshot, 2026-10-11, and no
   longer held. The EventChip pills COLLAPSE in any row that also has an email
   and a phone, rendering as a thin colored stripe through the text; the sparse
   row (Harper Reid, no contact column filled) shows them at full height. Fix
   the layout so the chips keep their padding and height in every row: no flex
   shrink on the chip, and no height constraint reaching it from the cell,
   including the "+2" overflow chip. Guard: measure chip height in a populated
   fixture row and assert it equals the chip height in a sparse row.

   AS BUILT, 2026-10-11, and the cause was not the contact column. MEASURED
   FIRST: every chip painted FOUR PIXELS tall, in every row, at 390 and at
   1440. Two pixels of padding around a ZERO line box, because the chip button
   set lineHeight: 0 to kill the inline-baseline gap and CHIP_BASE never set a
   line-height of its own, so it inherited the zero; the 10px glyphs painted
   outside the 4px box they were meant to sit in. The contact column was the
   CONTRAST, not the cause: a taller row centers a 4px pill in more empty
   space, which is why it was obvious where an email and a phone were present
   and easy to miss where they were not.

   scripts/test-invited-to-row.mjs had already recorded this, as a note
   explaining why it could not assert height: "a pill's BOX is its 2px of
   padding while its glyphs paint outside that box". It described the defect
   and shipped it as a constraint. That note is now corrected.

   A SECOND DEFECT THE SCREENSHOT DID NOT NAME, found by the new guard on its
   first run: bordered pills were 20px and filled ones 18px, two pill heights
   in one row. CHIP_BASE now reserves a transparent 1px border so a variant can
   turn its border visible without changing the geometry.

   WHAT "THE ROW HEIGHT" MEANS HERE. The guard asserts the CHIP ROW is equal
   with and without a contact, not the table row. A table row carrying an email
   and a phone is legitimately taller than one carrying neither, and the cell
   only controls the chip row. Reported to the owner as a reading of the
   ruling rather than assumed.

   SCOUT FINDING, which the screenshot corrects. Nothing is struck through:
   every state renders through EventChip and every branch returns a pill on
   CHIP_BASE with borderRadius 999, the not-invited state being an outline
   pill. The "thin stripe" is that pill crushed by the row, not a different
   component, so the fix is layout and not a rewrite. Measured, not declared:
   computed styles lie about this, so the guard reads painted height and
   belongs in the browser shards rather than tests/persistence.

6. Chunk-load failures self-heal, AHEAD OF ITEM 5. Every lazy route goes
   through lazyWithReload, a failed chunk import reloads the page once with a
   guard against a reload loop, and index.html is never cached by the browser.

   SCOUT FINDING, 2026-10-11, after the owner's stale-tab incident. All of that
   is ALREADY TRUE and none of it is guarded. Production serves index.html as
   public, max-age=0, must-revalidate and hashed assets as public,
   max-age=31536000, immutable (vercel.json); no service worker is registered
   anywhere; there are zero bare React lazy() call sites, with 46 routes wrapped
   in pages.config.js and 3 in App.jsx; and src/lib/chunkReloadGuard.js already
   reloads at most once per ten seconds keyed in sessionStorage, holds rather
   than reloading when storage is unavailable, and records an outcome, while
   lazyWithReload holds Suspense instead of flashing the error boundary and
   bounds that hold with a ten second hang guard, and main.jsx adds a
   vite:preloadError side-channel. Nothing in tests/ or scripts/ touches any of
   it. So this item PROVES the mechanism rather than rebuilding it: plant a
   failing import, assert the reload fires exactly once, assert a second
   failure inside the window holds instead of looping, assert the hang guard
   rejects so nobody is stranded on a spinner, assert every route is wrapped
   and no bare lazy() exists, assert no service worker, and assert the two
   Cache-Control rules. If a real gap turns up while writing it, that part is
   built and named.

   ONE THING NOT CHANGED, and why. "index.html is never cached" is already met
   as "always revalidated", not as no-store. must-revalidate keeps the 304 and
   still prevents a stale document being reused after a deploy; no-store would
   lose the 304 for no gain. Flagged for the owner rather than changed.

   AS BUILT, 2026-10-11. Two guards, because the question has two halves.
   tests/persistence/chunk-selfheal.mjs (23 checks) DRIVES the real
   reloadOnceForChunkError with a stubbed sessionStorage, a counted reload and
   a movable clock: one reload, a second failure inside the window held, the
   window crossed so a tab can heal again later, and both storage failures
   holding rather than reloading unguarded. It also pins the static facts: 49
   wrapped routes and no bare lazy(, the preloadError side-channel reaching the
   same guard without preventing default, the hold bounded by the hang guard,
   no service worker, and the asset rule with no immutable document rule beside
   it.

   scripts/test-chunk-reload.mjs (15 checks, shard A, booked 38s) plants a 404
   on one route's chunk, which is a stale index.html in one request, and COUNTS
   LOADS. The healthy sequence is load, fail, reload, fail again, hold, so
   exactly two; the plant is deliberately left in place, because lifting it
   after the first failure would not test the loop guard at all. It also reads
   the served document's Cache-Control, because the document's rule is the
   platform default and appears in no file in this repo.

   16 plants, all 16 caught by the persistence half. The browser half was then
   proved red on its own three ways, because a CI guard nobody has watched fail
   is an assumption: with the reload removed it reports 1 load, with the loop
   guard removed 87, and with the stamp never written 121.

5. HELD BY THE OWNER, pending the localStorage keys. If the Google picture URL
   is available, show it in the top-right avatar with the initials as fallback.

   SCOUT FINDING. src/lib/AuthContext.jsx stores the ENTIRE base44.auth.me()
   payload verbatim into localStorage.oi_user, so any field the provider
   returns is already in hand with no schema change. The declared User mirror
   has no picture field, but that proves little: BASE44_PLATFORM_NOTES.md
   records that the built-in User entity is a different subsystem whose live
   schema declares almost nothing. The sidebar avatar builds initials from
   full_name or email and never looks for an image. Unknown rather than
   unavailable, which is a different answer from the one item 5 asks for.

7. Housekeeping, LAST, after item 5. Remove src/lib/lastUpdated.js and its
   guard. Item 3 took its only consumer off the Guests page, so it is dead
   code; the owner's ruling of 2026-10-11 is that it leaves in its own small PR
   rather than inside item 3, so that PR stays a removals-and-move PR with no
   module deletion in it.

   AS BUILT, 2026-10-11, taken ahead of item 5 on the owner's word because
   item 5 is parked. The module is deleted and so are the two sections of
   tests/persistence/guests-refresh.mjs that drove updatedLabel,
   refreshFailedLine and clockTime: a guard for a module that no longer exists
   is not a guard. The file itself STAYS, holding item 3's inverted checks,
   because a removal nobody guards is one a later refactor can read as an
   accident and undo. Two checks are added, not just deleted: the module's file
   is gone from the repo, and nothing imports it.

## Stop conditions

As CLAUDE.md. No held file is expected: if one appears, stop and report. Never
read or write a non-owner record. Item 5 is held by the owner and is not started;
items 4 and 6 were released by the rulings of 2026-10-11.

## Lessons

## Close

Lessons section, then the last line: "Closed <date> at main <full SHA>, PRs <list>".
