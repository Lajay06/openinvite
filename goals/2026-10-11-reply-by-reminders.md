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

## Handed forward

A third, final-day reminder if couples ask. Per-event reply-by dates.
