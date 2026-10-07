# Households and children

Goal 2 from the essentials sweep: C6 one invitation for two named people, C7 children with count or ages, E6 children answered for at reply, C12 duplicate check on single add, C5 undo after delete. Builds on the three Guest fields mirrored in #899: household_id, is_child, child_age.

## The model

A household is a set of Guest rows sharing one household_id. Every person stays their own row, so seating, meals, per-event chips and headcount keep working per person. The lead is the row with an email; if several, the earliest created; if none, the earliest created; ties on created_date break by id ascending. One invitation goes to the lead and the lead's personal link covers the whole household. A child is a row with is_child true and optional child_age, whole years 0 to 17, validated by the writer because the schema says number. Nothing changes for any existing row until a couple uses these.

## Items

1. Resolver. src/lib/household.js: membersOf(guest, guests), leadOf(household), salutation(household) from adult first names ("Priya and Dev", "Priya, Dev and Mina"; children never in the salutation), counts(guests) returning people, adults, children, invitations (one per household plus one per guest without a household). Every surface below reads this module and nothing else. Held PR.

2. Guests page. Rows grouped by household, lead first, members indented under it. Row action "Add someone to this invitation" creates a new row with the same household_id, copying the lead's stored event_responses entries exactly (same event ids, same invited values, status reset to pending, responded_at null). Where the lead has no stored entry for an event, the member gets none either, so defaults apply and no new explicit invited: false is ever created by adding someone; this is an invitation write and is the only exception to the full-resolved-set contract, recorded in statusWrite.js's header beside the other two rules. Row action "Move out of this invitation" clears household_id. Child controls on the guest editor: a "Child" toggle and an age field shown only when it is on; row shows "Child" or "Child, 6". Count line reads "{people} guests across {invitations} invitations" and, when children exist, "{adults} adults, {children} children". Deleting a lead makes the next member the lead. Held PR.

3. Duplicate check and undo. Single add: if a guest with the same normalized name or the same email already exists in this wedding, show "Already on your list: {name}" inline with "Add anyway"; import is unchanged (it already reports). Delete: the row leaves the list at once, a toast says "Deleted. Undo" for 30 seconds, the delete request is sent when the toast expires or the page is left; Undo restores the row with nothing written. Deleting a guest who has replies keeps whatever rule exists today; report it. Held PR.

4. Send invites. One email per household, to the lead, greeting from salutation(); counts in the modal are invitations; a member without an email is not a "missing email" problem when the lead has one; a household whose lead has no email is listed under "No email yet" as one line naming the household. Reminder sends follow the same rule. api/send-invites.js under the goal's named exception, HELD.

5. Reply for the household. The lead's personal link opens the RSVP form with every member listed, children marked "Child" (age shown only to the couple, never on the guest site), one status and one meal choice per member, plus-one controls only on the lead. Submit sends one payload with per-member answers. api/rsvp-submit.js, named exception, HELD: it accepts a member's answer only if that member's household_id equals the link holder's household_id and the wedding matches, applies each member's answer only to events that member is invited to (the #891 rule, per member), writes one RsvpResponse per member per event, and the confirmation email lists everyone by name. A member who has their own link still answers for themselves alone. Adding a person from the guest side is out of scope; the couple adds people.

6. Export and import. CSV export gains Household, Child and Child age columns. Import: a Household column groups rows into one household_id (rows sharing a non-empty value), Child yes or no, Child age whole years; the import summary says "{n} guests in {m} invitations, {c} children".

7. Daily update and Ava. Tally shows adults and children separately and invitations as well as people; Ava context carries the same four numbers through eventTallies.js.

8. Fixtures and guards. Seed one household of three (Priya lead with email, Dev, Mina child age 6) invited to ceremony and reception, and one child without an age. Guards: grouping and lead rule including the id tiebreak; salutation shapes for one, two and three adults; add member copies stored entries only and leaves publicEventIds unchanged; move out; duplicate check and Add anyway; undo restores with zero writes and the delete fires after expiry; one email per household with the right greeting; household submit writes per member, rejects a member from another household, drops uninvited events per member; export and import round trip; counts on the Daily update; celebration page at 390 still has no horizontal scroll. Each proved red once.

## What else does this touch

Seating: unchanged, per person; "seat households together" is backlog. Plus-ones: unchanged; a named plus-one is not converted to a member in this goal (backlog: offer it). Per-event chips stay per person. Guest site public path: unchanged, asserted. Email templates: greeting only. Mobile: Guests page grouping at 390 must not overflow; RSVP form with three members at 390 measured. Legal pages: yes. child_age is the first age stored for a minor; the Privacy Policy children section must say names and ages, entered by the couple, used only for the wedding; the advisor fires the legal review at close.

## Stop conditions

As CLAUDE.md, plus: no schema change beyond the three mirrored fields; no new key inside event_responses entries; api/send-invites.js and api/rsvp-submit.js only as named in items 4 and 5, both HELD; no production row reads; seating code not touched; getGuestEventResponse defaulting not touched; any write that would add an explicit invited: false outside the Guests page invitation controls is a STOP.

## Protocol

Order 1, 2, 3, 6, 7, 4, 5, 8. One held PR per item (8 may fold into the item it proves if small). Carry on past held PRs. Diff guards after every commit, before every push. Registry's LIVE_CREDENTIAL_GUARDS never run. Blocks together at the end, narrow format, full 40-character SHAs, four checks by name.
