# Reply lifecycle (Goal 3 of the essentials sweep; lane A, after budget units)

Lane A. Runs under the goal autonomy protocol in WORKFLOW.md. Source: claude/essentials-sweep-results-2026-10-01.md, Goal 3, plus the "maybe" status carried over from the RSVP status goal (#898). One PR per item unless two items share a file.

Owner's intent: once invitations are out, the couple lives on the Guests page. Everything here is about what happens after the send: the guest who has not replied, the guest who replied late, the guest who wants to be left alone, the deadline, and the couple being able to see and act on all of it from the guest row without leaving the page.

Legal pages: no for items 1 to 5. Item 6 (a guest asks to stop emails) is a privacy-facing change; the legal reviewer is told at the close of this goal, not before.

## Territory

src/pages (Guests, dashboard), src/components (guest list row, status editor, send modal, guest website RSVP tab and home tab), src/lib, api/ except the held files, tests/persistence, base44/entities mirrors (held). Held-list files that this goal is expected to touch, each only after a STOP and only in its own held PR: api/rsvp-submit.js (item 2, named exception below), src/lib/emailTemplate.js and the guest-facing templates (item 6), base44/entities mirrors and entityFields.generated.js (items 0 and 6). No api/send-*.js changes; if an item turns out to need one, STOP and report before writing it.

## Browser rules

Only one lane may have a dev server, vite preview or browser open at a time. No local CI shards unless the harness or a fixture changed. Sub-agents: at most two, only one driving a browser.

## Items

0. Scout and stop. Report, with file:line, and change nothing:
   a. Where the RSVP deadline lives today (WeddingDetails field name and type, or none), where it is shown to the couple, and whether anything reads it on the guest site or in api/rsvp-submit.js.
   b. What is recorded when an invitation email is sent to a guest: fields on Guest (invitation_sent and anything else), any log entity or per-send record, and whether a timestamp, email type and recipient address are kept anywhere. Say plainly whether per-guest send history can be shown from existing data or needs a new field.
   c. How the Guests page loads and refreshes its data today (query, polling, cache time), so item 4 can add an honest "last updated".
   d. The exact enum of event_responses[].status in the Guest schema export, and every reader that switches on it (dashboard counts, status editor, CSV import and export, seating, Ava context).
   e. Whether any guest-facing email already carries a stop or unsubscribe link, and what the guest-facing templates have in their footer.
   Then propose the owner schema changes below, amended by what you found, and STOP. Resume at item 1 once the owner confirms the fields are added and the mirror PR (held) is on main.

   Proposed owner schema changes:
   Guest.event_responses[].status enum gains "maybe" (currently pending, yes, no).
   Guest.email_opt_out, boolean, default false. Description: The guest asked, from a link in an email we sent them, not to receive further emails about this wedding. Set by the guest, shown to the couple, respected by every send.
   Guest.email_opt_out_at, string, date-time. Description: When the guest asked.
   If item 0b finds that send history needs a field, propose it as well: Guest.send_history, array of objects {type, sent_at, to}, each entry appended by the send path, never rewritten.

1. Maybe returns. With the enum widened: the status editor offers Maybe again; CSV import maps "maybe" to maybe (the summary line "Maybe is recorded as awaiting for now" goes); dashboard counts show Maybe as its own bucket wherever Attending and Declined are shown as buckets; seating and Ava treat maybe as not yet attending. Guests are not offered Maybe on the reply form: the owner's model is a yes or no with big buttons, and Maybe is something the couple records after a conversation. Say so in a code comment at the status editor.

2. Deadline. The couple can set a reply-by date (reuse the field from 0a if one exists; otherwise STOP and propose WeddingDetails.rsvp_deadline, date). The Guests page shows it near the top with how many have not replied. On the guest site, from midnight at the end of that date in the wedding's time zone (if no wedding time zone exists yet, use the venue's or UTC and record the choice; Goal 6 adds the field), the RSVP tab stops offering the two buttons and shows:
   Heading: Replies have closed.
   Body: {couple names} needed final numbers by {date}, so this form is now closed. If your plans have changed, or you did not get the chance to reply, send them a note below and they will see it straight away.
   Below it, the existing Send a note form. A guest who already replied still sees their reply, read-only, with the same note form. The server refuses a status write after the deadline with the same sentence; this is the named exception for api/rsvp-submit.js, HELD, reviewed line by line before the line is issued. The couple can clear or move the date at any time and the form reopens.

3. Find my invitation. The guest site's home tab gets one quiet link, "Find my invitation", that goes to the RSVP tab's existing email bridge. Styled as a text link in the universe's body face, never a button. Only shown to an unrecognised visitor; a recognised guest sees nothing new.

4. Guests page: Refresh and last updated. A Refresh control at the top of the list and the line "Updated {n} minutes ago" beside it, driven by the time of the last successful load, not by the page's own clock. Under a minute reads "Updated just now". A failed refresh leaves the list as it was and says "Could not refresh. Showing the list from {time}."

5. Per-guest resend and send history. On the guest row's menu: "Resend invitation", which opens the existing send flow with that one guest selected and nothing else changed. If the existing flow cannot be opened with a preselected guest without an api/send-*.js change, STOP and say what it would take. Send history: the row shows what has been sent to this guest (type and when; channel is always email now), from whatever item 0b found; if it is only invitation_sent, show "Invitation sent" with no date and say in the PR body that dates begin when the field lands.

6. A guest can ask to stop emails. Every guest-facing email gets a footer line "Do not want emails about this wedding? Stop these emails." linking to a signed, token-based page that sets email_opt_out true for that guest, no login, and shows one line: "Done. {couple names} will not email you about the wedding again. You can still reply on their website whenever you like." Token is HMAC of the guest id with the existing admin key, same helper family as the retention stop link, secret read at call time. The couple sees "Asked not to be emailed" on the guest row and in the send flow, and every send skips such guests and says how many were skipped. HELD: touches src/lib/emailTemplate.js and the guest-facing templates; the send-path skip is the one place this may touch api/send-*.js, under a named exception, HELD, reviewed line by line.

## Rulings in advance

Copy above verbatim, US English, no em or en dashes, no emojis. Where an item needs a label not written here, use the shortest plain English and record it in the PR body.

C27 "per-row Copy personal link" from the sweep is not in this goal: the owner removed every share-by-link control in site fixes batch 1 (item 12), and email from the studio is the only way guests receive the site. Do not build it.

Maybe is couple-recorded only. The guest reply form stays yes or no.

Deadline enforcement is server-side as well as client-side; a form that only looks closed is not closed.

Schema changes are owner-only via Base44 chat; the terminal never calls update_entity_schema. The mirror PR is HELD. Any held-list file: STOP and report before editing. List every changed file against the held list in each PR body.

Items 1, 3, 4 and 5 self-merge under the protocol if their file sets are clear of the held list. Items 0 (mirror), 2 and 6 are HELD for the advisor's line.

## What else does this touch

Guest schema (owner adds one enum value and two or three fields). api/rsvp-submit.js (item 2, named exception). Guest-facing email templates and the send path (item 6). The guest website's RSVP and home tabs, all 19 universes; copy is universe-neutral so no per-universe lines are needed. Lane B's rich recordings show the Guests page; re-record after this goal. Privacy Policy: the legal reviewer is told at close about the opt-out link.

## Guards

Each item adds or extends one guard that fails on main before the change and passes after; new guards registered with estimated seconds in the shard tables. Item 1: a maybe row counts in the Maybe bucket and nowhere else; CSV "maybe" round-trips. Item 2: a fixture wedding with a deadline yesterday shows the closed state and the server refuses a status write with the sentence above; with the deadline tomorrow both work as today; clearing the date reopens. Item 3: the link renders for an unrecognised visitor and not for a recognised guest. Item 4: a failed refresh keeps the list and shows the fallback line. Item 5: the resend flow opens with exactly one guest selected. Item 6: a tampered token changes nothing; a valid token sets the flag once; a send to a list containing an opted-out guest skips them and reports the count; the footer line is present in every guest-facing template.


## Lessons

Every lesson from items 0 to 6, including the ones about the instruments
rather than the code, because those cost the most time.

FOUR INSTRUMENT FAILURES, each found by planting against a check and watching
it stay green. A check that cannot fail is worse than no check: it reports
safety.

  1. AN ASSERTION THAT MATCHED THE IMPORT LINE. Item 2's "the server refuses
     before the first row is written" used indexOf('deadlineHasPassed'), which
     finds the import at the top of the file and therefore precedes every
     write however the refusal moves. Fixing that exposed a second fault in
     the same line: indexOf('createRsvpResponse(') matched the function
     DECLARATION, which precedes the handler entirely, so the repaired check
     then failed on correct code. Both ends are anchored on call sites now.

  2. A BOOLEAN FILTER ON THE PLANT RUNNER. pass() and fail() return booleans,
     and my runner filtered failures with x.ok === false, which never matches
     one. It printed "FAILED: 0" for a plant whose text I had already
     confirmed was in the file. The guard was fine; the thing checking the
     guard was not.

  3. A HIT TEST BELOW THE FOLD. The share tab's send button sits at y=994 on a
     900px viewport, and elementFromPoint returns null outside the viewport,
     which no hit test can tell apart from being covered. The guard called a
     966px button's label clipped. scrollIntoView did not help either: the
     document is not the scroll container there, so docScrollTop stayed 0.
     Geometry answers clipping at any position; a hit test only adds "covered",
     which is meaningless for a point nobody is looking at.

  4. THE BACKTICK TRAP, seven times in one goal. A backtick in prose inside a
     template literal closes the literal. Twice it produced a silent partial
     write (one took a const declaration with it and lint caught the undefined
     reference); once the script failed to parse and wrote nothing, which is
     the good failure. Snippets go in a file now, never escaped inline. Its
     cousin is the $$ replacement trap recorded in #932: String.prototype
     .replace reads $$ as an escape for one $, so a plant meant to insert a
     dollar sign inserts a plain interpolation. Plant with a replacer function.

THE MERGE-REF RULING. Re-running a workflow does not rebuild
refs/pull/N/merge: #937's ref read 07e6668b before and after its run
completed, eighteen minutes apart, so a re-run would have re-tested the stale
base and proved nothing. Where a re-run cannot cover current main, the
disjoint-set route carries the verdict instead, on evidence: nothing but
disjoint commits merged since the run, checked by filename AND by whether
either side's guards read across the boundary, plus a fresh scratch merge of
current main.

THE MERGE-TIME RE-READ EARNS ITS KEEP. Twice in this goal a stated mark had
gone stale between the authorization and the merge: #943's base had moved
under lane B's #940, and #951's base moved twice while its run finished. The
re-read caught both, and the rule that a verdict belongs to the SHA it was
computed against is what made each safe to proceed on.

THE DISJOINT-SET ROUTE NOW INCLUDES A PRERENDER-IDENTITY CHECK whenever
main's intervening commits touched prerendered/. PRERENDER IDENTITY MEANS
RENDERED OUTPUT WITH HASHED ASSET NAMES NORMALIZED, NOT COMMITTED BYTES
(owner ruling 2026-10-10). Item 6 changed src/App.jsx, which is the router
root compiled into the entry chunk, so every one of the 16 pages differed in
its entry and chunk hashes while 0 of 16 differed in rendered output. On the
byte reading no PR touching a bundled file could ever pass.

A CHECK WRITTEN AS A LIST OF THE SHAPES ITS AUTHOR HAS MET only catches those
shapes, and this goal paid for it twice. The hardcoded-dollar check missed
three real bugs until it was rewritten to work by elimination. The dashboard
date guard looked for exactly one toLocaleDateString spelling and was blind to
both shapes lane B's camera found.

AND SOME THINGS ONLY MEASURING FINDS. The share tab's message box painted 26px
at 390 with nothing in the source stating a width. A bare YYYY-MM-DD deadline
printed 4/30/2027 in Los Angeles, because it parses as UTC midnight and renders
in the viewer's zone. new Date(null) is the epoch, not an invalid date, so a
no-load-yet case rendered a 1970 timestamp as when the list was loaded. None of
the three is visible by reading.

CLIENT CHECKS ARE COURTESIES; SERVER CHECKS ARE RULES. The deadline and the
email opt-out are both enforced twice on purpose: the screen so the couple
sees it before acting, the endpoint because the client is editable by whoever
runs it. Where a server read fails open, the direction is stated and logged
rather than hidden.

## Close

Last line: "Closed <date> at main <full SHA>, PRs <list>".

Closed 2026-10-10 at main f4929077c2188b4e6b8dc31fd3d1091df5f4c4c6, PRs #934 #936 #938 #942 #943 #944 #951
