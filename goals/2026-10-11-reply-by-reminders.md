# Reply-by reminders: automatic, opt-in, on the couple's deadline (lane A, 2026-10-11)

Runs under the goal autonomy protocol in WORKFLOW.md. Owner idea from the 2026-10-11 walkthrough: the couple sets a reply-by date; a switch next to it sends reminders to guests who have not replied, automatically, without the couple remembering to.

## Rulings

- Opt in. The switch is off for every wedding until the couple turns it on. Turning it on with no reply-by date set is not possible; the switch is disabled with the line "Set a reply-by date first."
- Two sends, no more: 10 days before the reply-by date and 2 days before, each at 9 am in the wedding's timezone (the one Event details already stores; if none, the couple's browser timezone saved at the moment they turn the switch on). A guest gets at most one reminder per send, at most two in total, never after the reply-by date, never if the deadline is less than 2 days away when the switch goes on (then only the sends still in the future happen; if none, the switch says so and stays off).
- Who gets one: invited guests with an email, no reply recorded for the event, no permanent bounce on record, no opt-out. The same exclusion list the retention cron uses applies and is never removed.
- The email is the existing reminder email, unchanged, through the existing send path. No new template, no new sender. If the reminder path turns out to be one of the api/send-*.js files, this goal's send step is held and lands on a merge line.
- Idempotent per guest per send: a reminder record (or a field on the existing reply record, scout decides) stamps which send went to whom; a cron re-run never doubles.
- Where the switch lives: beside the reply-by row on the Send invites review step and on Event details (the two homes #974 gave it), one switch, same state in both places. Label: "Remind guests who have not replied". Under it, when on: "We will email anyone still to reply on {date 1} and {date 2}, at 9 am {timezone}." When the first send has gone: "Sent {date 1} to {n} guests. Next on {date 2}." When both have gone: "Both reminders sent." Turning it off cancels any send still to come and says "Off. No more reminders will go."
- Guests page: no new column. The existing reply filter is enough; the per-guest row shows nothing about reminders.
- Copy: US English, no em dashes, no percentages, nothing that makes a guest feel chased; the email already respects that.
- Schema: if a field or entity is needed it is added by the owner in Base44 chat from the text the scout prints, then mirrored in a held PR. The terminal never calls update_entity_schema.
- Owner test: the same shape as the retention test route, POST with Bearer CRON_SECRET, dry and send modes, send only to la.jay06+notiftest01, subjects prefixed [test].

## Items

0. Scout and stop. Find the reply-by date field and its two homes, the reminder email and its send path (and whether it is held), the cron that could carry the sends (the retention cron or the one that carries scheduled gift sends), how a reply is recorded per event, where bounce and opt-out are read, and how the retention cron keeps its exclusion list. Print the schema text if any (fields, types, descriptions, which plain, which hashed), the exact cron step you propose, and the files you will touch against the held list. STOP.
1. The switch and its lines on both surfaces, writing one field, with the disabled state and the timezone capture. Guard: both surfaces show the same state after a change on either; the switch cannot be turned on without a date.
2. The cron step: due sends, eligible guests, idempotent stamp, counts logged (never addresses), at most 200 guests per run with the rest on the next run. HELD if it touches a held send file.
3. The owner test route and a dry run report (counts for the smoke account's wedding only).
4. Mirror PR for any schema the owner added. HELD.
5. Close: live dry run on production against the smoke account, one send-mode test to the test address, report, and the goal file's Decisions, Handed forward and Lessons sections.

## Decisions

Owner rulings of 2026-10-11, after the item 0 scout and again after item 1 was
first built. Written down so a later reader does not re-open them.

THE SCOUT'S FIVE ANSWERS. send_history is written SERVER SIDE by the cron, one
entry per guest per reminder, kind "reminder", send 1 or 2, with the timestamp;
that entry is the idempotency stamp and it is what the couple sees on the
guest's record, so no new declared field and item 4's mirror PR is empty unless
something else surfaces. The cron is a NEW HOURLY cron,
api/cron/send-rsvp-reminders.js, not the UTC-only 9 am job, so a missed hour
catches up on the next run. The timezone is the BROWSER's at the moment the
switch is turned on, stored as rsvpContent.reminderTimezone and printed in the
line so the couple can see which one we picked, with Australia/Sydney for a
wedding that has none and a logged COUNT of such weddings. rsvpContent is the
accepted home for all three keys because the reply-by date already lives there,
with a live round-trip test required before item 1 merges. Item 2 stays held
because the reminder is api/send-invites.js with type 'reminder'.

ONE HELPER FOR "DUE", SHARED WITH THE CRON. sendIsDue(send, now, tz): due when
now is at or after 9 am local on the send day and before the reply-by date. The
hourly cron sends anything due and unsent, so a switch turned on at 10 am on a
send day gets that send on the NEXT RUN rather than never. The switch's line
and the cron read the same function, because two readings of "due" is how a
line comes to promise a send that does not happen. The line says "today" for a
send still to go on the current day.

ONE PLACE TO TURN IT ON. The switch is read-only on Event details, showing its
state and its line with "Change this on the Send invites page." under it. The
first build made it operable on both surfaces, reading item 1's guard as
licence; the owner ruled that wrong, because a date you cannot edit beside a
switch you can throw is an asymmetry with no reason.

THE LIVE ROUND TRIP IS OWNER-RUN. It is written and registered, and item 1's PR
opens without waiting on it; the merge is held until the owner reports it
green. This checkout has no BASE44_TEST_EMAIL or BASE44_TEST_PASSWORD.

## Lessons

DOCS COMMITS RIDE IN THE LANE'S NEXT PR. Standing rule, owner 2026-10-11, from
this goal's own file failing to land twice: with four lanes merging, a
direct-to-main docs push is a coin toss against the other three, and this one
lost it twice in a row inside ten minutes. A docs commit that is not urgent
goes in the lane's next PR instead. Direct pushes to main are for GOAL CLOSE
COMMITS only, where the SHA in the close line has to be the SHA the push
creates and nothing else can carry it.

AND BRANCH FROM origin/main, NEVER FROM A LOCAL main THAT IS AHEAD. This goal's
item 1 branch was cut from a local main holding the unpushed goal file, so
#985's diff carried that file as a NEW FILE, and a later docs push would have
added the same path twice: an add/add conflict, which is the same trap as
stacking a PR on another PR's branch. Taking the file out of the race resolved
it, and the rule is the general one.

RUN THE DIFF-RANGE GUARDS AFTER THE COMMIT, NEVER BEFORE IT. test:calm-copy and
test:us-english-spelling read added lines in origin/main...HEAD, which is
committed history and not the working tree. Run before committing, they read a
range containing none of the change and report a PASS. That is how "licence"
reached CI in item 1 after five local gates came back green; the same shape had
printed "0 file(s)" an hour earlier on another goal's item, where it was
noticed. A pass from a guard that looked at nothing is the thing to watch for.

## Handed forward

A third, final-day reminder if couples ask. Per-event reply-by dates.

THREE PRE-EXISTING FAULTS IN THE LIVE-CREDENTIAL LANE, found while registering
item 1's round-trip guard and not caused by it. scripts/test-persistence.mjs
asserts that every entry in LIVE_CREDENTIAL_GUARDS is invoked by it, and three
are not: hero-masters-live.mjs and tour-recordings-live.mjs are in the set but
never called, and run-launch-smoke.mjs exports runLaunchSmoke while the check
derives runRunLaunchSmoke from the filename. Nothing in CI runs that lane, so
it has gone unseen, and it means the lane cannot currently come back green.
Owner ruling 2026-10-11: one small separate fix PR on the protocol route, after
item 1 opens.
