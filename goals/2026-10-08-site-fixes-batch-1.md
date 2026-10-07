# Site fixes batch 1 (owner walkthrough of 2026-10-08)

Lane A. Runs under the goal autonomy protocol in WORKFLOW.md. One PR per item unless two items share a file, then one PR for both. Items in the order below; marketing items first because they are the most visible.

Owner's intent: he walked the marketing site and the dashboard top to bottom and listed what reads wrong. Every item here is a visible fix. Nothing in this goal changes what guests receive by email, the payments path, or any schema.

Legal pages: no.

## Territory for this goal

src/pages, src/components, src/lib, public marketing pages. For this goal only, lane A may edit the Features page and the Home page (normally lane B territory); lane B rebases on main before its next PR. No api/ changes expected; if an item turns out to need one, STOP and report before writing it.

## Browser rules

Only one lane may have a dev server, vite preview or browser open at a time. No local CI shards unless the harness or a fixture changed. Sub-agents: at most two, only one driving a browser.

## Items

1. Features page accordion. Remove the rows "A guest suite written for you" and "Universe invitations and RSVP" (Universe has its own section). Replace the remaining rows with these eight, in this order, copy exactly as written:

   Vendors and the marketplace: "Every vendor in one place, with contact, quote, deposit and what is still owed. Browse the marketplace for the ones you have not booked yet and send an enquiry without leaving the studio."

   Seating chart and the visualizer: "Drag guests onto tables, see who is still unseated, and walk the room before anyone else does. The visualizer shows the layout the way your guests will see it."

   Calendar: "One calendar for the whole engagement: deadlines, vendor payments, fittings, and every event on your run sheet. Subscribe from your phone so nothing lives only in the studio."

   Ava on every page: "Ava has read your wedding. Ask what is unpaid, who has not replied, or what still needs a decision, on any page, at any hour."

   Mood board: "Pin the looks you keep coming back to, colors, florals, dresses, tables, and keep them next to the plan instead of across six apps."

   Toasts and speeches: "Who is speaking, in what order, for how long. Speakers get a short brief and a deadline so nobody writes theirs in the car."

   On the day details: "Getting there, where to stay, who to call, what to wear. Written once, shown to guests where they need it."

   Registry and cash funds: "Link the registry you already have, or set up a cash fund with a note that does not feel awkward. Guests see it only when you say so."

   Keep the accordion's existing structure and styling. If any row has an illustration slot, reuse the nearest existing illustration; no new assets.

2. Home page, the card section after the sliding carousel. Remove the "Guest suite" card only. The remaining six cards keep their current order and copy, ending on Plus one.

3. Event details page: remove the "Your address" line that shows openinvite.com.au/<slug>. Nothing else on the page changes.

4. Guest list, "Invited to" column. With two or more events the pills break the row. Ruling: one row, never wrapping; show up to two pills, then a "+N" pill; hovering or tapping "+N" shows the full list. Column width stays as it is.

5. Date format. Dashboard dates shown as written dates ("18 May 2026") become numeric in the account's chosen format, default day/month/year (18/05/2026). Add "Date format" to Settings with two choices, day/month/year and month/day/year. Guest-facing pages keep their written dates; this is dashboard only. Storage: use an existing per-account preferences field if one exists; if none exists, STOP and report the exact field name and type needed (owner adds it via Base44 chat), then continue with the other items.

6. Tag colors. Each tag gets a distinct color from a fixed palette of at least eight, chosen deterministically from the tag name so the same tag is always the same color across sessions and devices. Text contrast must pass on every swatch.

7. Vendor sections, tab order. The vendor tab is first in every vendor-related section. Beauty: the team tab moves from third to first. Music: vendors, then playlist, notes, considerations. Photography: delete the "Photo and video details" tab (it duplicates the two vendor tabs); keep Photographers, Videographers, Shot list, Timeline, Considerations. Catering is already correct; verify and leave it. Any content that lived only in the deleted tab moves to the matching vendor tab before deletion; nothing is dropped.

8. Google place search. Every place search in the app gets a "Near me" control that biases results to the browser's location. Permission is requested only when the control is used, never on page load; if refused, the search works as today. List every place search you changed in the PR body.

9. On the day details. Tabs are inconsistent (some centred, some full width). Ruling: full width everywhere, matching the rest of the dashboard.

10. Budget: thousands separators in the saved plan section, same formatter as the top cards. Check every other money figure on the Budget page while there.

11. Design studio, Content. "Show welcome text" must hide only the welcome text; today it also hides the mark. Add a third toggle, "Show motif", default on, that hides the universe's motif for a plain intro. Store it wherever the other two toggles are stored.

12. Settings, sharing. Remove Copy link, Share on WhatsApp, QR code and any other control that shares the site by link, including the WhatsApp share guard noted in the backlog. Email from the studio is the only way guests receive the site. Password protection stays exactly as it is. Grep the whole app for the removed controls so no second copy survives elsewhere.

## Rulings in advance

Copy: use the copy above verbatim; where an item needs a label not written here, use the shortest plain English and record it in the PR body. No emojis. No em or en dashes anywhere, including comments.

Item 2: the owner listed seven names from memory; the ruling is "remove Guest suite, change nothing else".

Item 5: if the field is missing, the item stops but the goal continues.

Item 7: content migration before tab deletion is required, not optional.

Any held-list file: STOP and report before editing. List every changed file against the held list in each PR body.

## What else does this touch

Features and Home pages are marketing (lane B territory, exception above). Item 5 may need an owner schema change. Item 8 touches every vendor and venue form with a place search. Item 12 touches Settings and possibly the public page share menu. Studio tour recordings (lane B) may show the old accordion and share controls; lane B re-records after this goal.

## Guards

Each item adds or extends one guard that fails on main before the change and passes after. Items 4, 6, 10 and 11 are browser guards; the others persistence or render guards. New guards are registered with estimated seconds in the shard tables.

## Close

Last line: "Closed <date> at main <full SHA>, PRs <list>".
