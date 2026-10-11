# Dashboard fixes batch 1 (Goal 5, lane A, opened 2026-10-11)

Lane A. Runs under the goal autonomy protocol in WORKFLOW.md. From the owner's
own walkthrough of the dashboard. Copy is written below; use it verbatim. No em
or en dashes anywhere. US English.

Territory: lane A territory, the whole web repo. NO HELD FILE IS EXPECTED. If
one appears, stop and report rather than opening a held PR.

Each item is one PR, self-merged under the protocol, reported as one line:
number, merge SHA, item.

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

3. Guests page, removals only. Remove the "N guests across N invitations" line,
   the invited and replied per-event line, and the Refresh button together with
   its age line. The summary cards and the Ava button stay. Nothing is added.
   The "Reply by" column is LEFT ALONE until the owner's screenshot settles
   what he meant.

   SCOUT FINDING. There is no "Replied by" line on the page. The nearest string
   is "Reply by", a column header, which is why the owner held it back. The age
   line and the Refresh button were shipped together in #943 and are documented
   as belonging together, so they go together. The two summary lines are #902
   and the per-event follow-up goal.

4. HELD BY THE OWNER, pending his screenshot. Every "Invited to" value is a
   pill, the same component.

   SCOUT FINDING. Nothing in that column is struck through. Every state renders
   through one component, EventChip, and every branch returns a pill on
   CHIP_BASE with borderRadius 999. The not-invited state is an OUTLINE pill,
   transparent with a hairline border and muted text. There is no line-through
   anywhere in the guests code; the only three in the dashboard are
   completed-task styles in VendorDetailPanel, AttirePanel and TodoList. So the
   item as written has no target, and the owner is settling it from a
   screenshot.

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

## Stop conditions

As CLAUDE.md. No held file is expected: if one appears, stop and report. Never
read or write a non-owner record. Items 4 and 5 are held by the owner and are
not started.

## Lessons

## Close

Lessons section, then the last line: "Closed <date> at main <full SHA>, PRs <list>".
