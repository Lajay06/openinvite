# Bounces and notes (Goal 4, lane A, opened 2026-10-10)

Lane A. Runs under the goal autonomy protocol in WORKFLOW.md. Sweep items C24, D11, O3 (bounces), O2 (notification for a new guest note), L3 (delete a note with confirm). Copy is written below; use it verbatim. No em or en dashes anywhere. US English.

Legal review: yes, at close. New Guest field, a new inbound webhook from Resend, a new email to the couple, and Goal 3's opt-out link are all for the reviewer.

## Territory

api/ (new api/resend-webhook.js at the api/ root, held; api/webhooks/ is the payments webhook directory, frozen as a directory, and nothing in it is touched), api/send-invites.js only under the named exception in item 2, api/_lib, src/pages/Guests, src/components/guests, src/pages/Messages.jsx and its components, tests/persistence. No schema changes by the terminal: the field is added by the owner in Base44 chat and mirrored in a held PR. Payments path frozen. No marketing pages, no prerendered/.

## Browser rules

One lane with a dev server or browser at a time; lane B holds the browser for batch 2, so wait and say so. No local CI shards unless the harness or a fixture changed. Sub-agents: at most two, one driving a browser.

## Rulings in advance

Only permanent bounces stamp a guest; transient bounces and complaints are logged and ignored this goal. A bounced guest is skipped on send the way an opted-out guest is, with its own count, until the address is changed; changing the address clears the stamp. Emails are matched to guests by Resend tags set at send time, never by searching addresses; an event without the tags is logged and dropped. The webhook verifies the Svix signature with RESEND_WEBHOOK_SECRET, which the owner generates in the Resend dashboard and sets in Vercel; the terminal never sees it, prints it, or writes it anywhere. A request that fails verification gets 401 and no log of its body. The note notification goes to the couple's account address, one email per note, no digest, no new switch. Deleting a note is a calm confirm in place, not a modal.

## Decisions

Made during the goal, confirmed by the owner, and written down so a later
reader does not re-open them.

2026-10-11, item 4's email shell is local and not the retention emails'. The
LAYOUT is theirs, by the item's instruction; the code that renders it is not.
The retention pair are marketing and a note notification is transactional, so
a marketing restyle must never restyle the email that tells a couple someone
wrote to them. What is shared is the brand tokens in src/lib/emailBrand.js,
which is the half that should be shared.

2026-10-11, item 4's fallbacks when a note carries no name. The item's copy is
"{Guest first name} left you a note" and "A note from {guest name}", and a
GuestMessage row can hold an empty name: api/guest-note-submit.js writes
firstNameOrNull(name) || '', so a guest who typed an address into the name
field leaves nothing there rather than leaving the address. The fallbacks are
"A guest left you a note" and "A note from a guest", following the bell
notification's own wording. With a name, both strings are the item's,
character for character.

## Scout rulings

Adopted from item 0's scout, 2026-10-10. api/resend-webhook.js exports config with bodyParser false and reads the raw bytes: Vercel parses the body by default and api/webhooks/stripe.js falls back to re-stringifying it, which can never satisfy a signature over exact bytes. Verification uses resend.webhooks.verify from the installed SDK, so no new dependency and no hand-rolled HMAC. Deliveries older than five minutes are rejected. Tags are read as an OBJECT on the webhook side and sent as an ARRAY: the send API takes tags as an array of name and value pairs, and the webhook returns them as a record keyed by name, so the two sides do not share a shape. The classification is matched as bounce.type === 'Permanent' exactly and everything else is logged as not stamping, which covers the wording difference between this goal's "transient" and Resend's documented "Temporary". The webhook is idempotent on email_id: a second delivery for the same email_id is a 200 no-op, because delivery is at-least-once. guest_id and owner_id are validated against Resend's tag character rules, ASCII letters, numbers, underscores and dashes with a limit of 256 characters, before they go on an email; if either fails the tags are dropped with a log line and the send still happens, because a tag is for matching a bounce later and is not worth failing a couple's invitation over.


## State

Written so an auto-compact loses nothing. Updated as the goal moves.

As of 2026-10-11, items 0, 1 and 2 are done and item 3 is open as PR #964.

WHERE WE ARE. The owner added Guest.email_bounce in Base44 with the scout's
amendment: at (date-time), kind (enum permanent), detail, email_id. Item 0's
scout is reported and its nine rulings are in the Scout rulings section above.
The mirror merged as #955. The webhook merged as #957 at api/resend-webhook.js,
after the ruling recorded in Lessons. The owner has registered it in the Resend
dashboard, set RESEND_WEBHOOK_SECRET in Vercel, redeployed and sent one test
event; whether that delivery was accepted is being settled with the owner
outside this file, and the terminal's attempt to read it is recorded below.
Item 2, the tags and the bounce skip, merged as #959.

WHAT IS OPEN. PR #964, item 3, not held. It carries
src/components/guests/emailBounce.js (new, the shared predicate and the clear
rule), src/components/guests/GuestList.jsx, src/pages/Guests.jsx,
src/components/guests/SendInvitesModal.jsx, this goal file, and two guards:
tests/persistence/guests-bounce-label.mjs (new, 40 checks, 31 plants all
caught) and two repaired checks in tests/persistence/guest-stop-emails.mjs.

ALSO OPEN. PR #965, item 4, HELD because it sends email. It carries
api/_lib/guestNoteNotification.js (new, renders and does not send),
api/guest-note-submit.js (the injectable send, awaited after the row is
written) and tests/persistence/guest-note-notification.mjs (new, 52 checks,
35 plants all caught). Its two decisions are in the Decisions section above.

WHAT IS NEXT. Item 5, deleting a note.

ONE TOOL FAILURE WORTH NOT REPEATING. The Vercel runtime log query returned
"No logs found" for a 50-minute window across four query shapes, with no
filter at all, so the webhook test delivery's status could not be read from
here. That is the tool failing, not a verdict, and it was reported as such
rather than inferred.

WHAT IS NEXT. Item 1, the webhook, HELD, once #955 is on main: new
api/resend-webhook.js with bodyParser false and raw bytes,
resend.webhooks.verify from the installed SDK, 401 with no body logged, a
five-minute replay window, tags read as an object, bounce.type === 'Permanent'
matched exactly, idempotent on email_id, every other event type a counted 200.
Guard with a signed fixture, an unsigned one, and a plant that drops the
signature check. Log lines use "[resend-webhook] FAILURE: ..." with a colon.

AFTER ITEM 1 MERGES, STOP: the owner registers
https://www.openinvite.com.au/api/resend-webhook in the Resend dashboard for
email.bounced and sets RESEND_WEBHOOK_SECRET in Vercel. The terminal never
sees, prints or writes that secret. Resume at item 2 when the owner says done.

THE FACTS ITEM 1 AND 2 WILL NEED, from the scout, so they are not re-derived:
api/send-invites.js builds its per-email object in exactly one place and passes
no tags today; g.id and caller.id are both already in scope there; invitations
and reminders are the same endpoint, selected by type, so there is no
api/send-reminders.js; api/webhooks/stripe.js has no bodyParser config and
falls back to re-stringifying the body, which cannot satisfy a signature over
exact bytes; svix is not installed and does not need to be; Resend's tag values
allow only ASCII letters, numbers, underscores and dashes, up to 256
characters; data.tags arrives as an object keyed by name while the send API
takes an array of name and value pairs.


## Items

0. Scout and stop. Read api/send-invites.js and report how it calls Resend for invitations and reminders and whether tags are already passed; read api/webhooks/stripe.js for the shape a webhook takes in this repo; read Resend's docs for the email.bounced event shape, the bounce classification field, and the Svix headers; read Messages.jsx and the note read and update paths from the guest notes goal (#862 to #868). Confirm or amend the proposed field below and STOP so the owner can add it. Resume at item 1 once the mirror PR is on main.

   Proposed field on Guest:
   email_bounce, object, optional, sub-properties: at (string, date-time), kind (string, enum permanent), detail (string, a short sanitized reason with no address in it). Description: Set when an invitation or reminder to this guest bounced permanently. Cleared when the couple changes the email address.

1. Webhook, HELD. New api/resend-webhook.js: POST only; verifies the Svix signature against RESEND_WEBHOOK_SECRET read at call time; 401 on failure with no body logged; handles email.bounced with a permanent classification by reading the guest id and owner id from the event's tags, loading that one guest through the admin path scoped to that owner, and writing email_bounce; every other event type returns 200 and is counted in one log line. Guard with a signed fixture and an unsigned one, and a plant that drops the signature check. Log lines use the "[resend-webhook] FAILURE: ..." shape with a colon. After merge, STOP and tell the owner to register https://www.openinvite.com.au/api/resend-webhook in the Resend dashboard for the email.bounced event and set the secret in Vercel; resume when the owner says done.

2. Tags at send time, HELD, named exception for api/send-invites.js: each email carries tags guest_id and owner_id. Bounced guests are skipped like opted-out guests, with skippedBounced in the 200 response and the error "Every guest you selected has a bounced email address. Fix the addresses and try again." when all are skipped. No other change in that file.

3. Guests page. A guest with email_bounce shows the label "Email bounced" on the row and a "Bounced" filter beside the existing opt-out filter. Changing the email address clears email_bounce in the same save. The row's existing Resend action is the fix path; when the stamp is present the row shows the sentence "This address bounced. Fix it, then resend." Send modal shows the skipped count with "{n} bounced, not sent." Guard the clear-on-change and the skip.

4. Note notification, HELD because it sends email. New api/_lib/guestNoteNotification.js, own file, not src/lib/emailTemplate.js; sent from the note submit path to the couple's account address. Same table layout as the retention emails, no photo. Subject: "{Guest first name} left you a note". Preheader: "It is on your Messages page, with a reply button." Heading: "A note from {guest name}". Body: the note's first 240 characters, then "..." if cut. Button "Read and reply" to the Messages page. Footer line: "You get one email for each note. Reply from Messages, not from this email." Reply-To hello@openinvite.com.au. is_test skips.

5. Delete a note. On Messages, each note gets a quiet "Delete" control that becomes an inline confirm, calm per the P5 restraint: "Delete this note? It goes for good." with "Delete" and "Keep". Deletes through the existing note update endpoint with a delete action, owner-scoped on the server, and the unread badge recounts. Guard the server scope: a caller cannot delete another account's note.

## Stop conditions

As CLAUDE.md. Any held-list or do-not-touch file outside the named exceptions: stop and report. Never read or write a non-owner record. Never print a secret or a webhook signature. Items 1, 2 and 4 are held; print the five-marks block for each and wait for the line.

## Lessons

api/webhooks/ is frozen as a directory; a non-payments webhook lives at the api/ root.

Item 3's premise was wrong. It places the Bounced filter "beside the existing
opt-out filter", and there is no opt-out filter on the Guests page: goal 3
(the reply lifecycle) added the row label and no pill at all. Owner ruling,
2026-10-11: the Bounced pill as built is permanent in that form, last in the
status row and shown only when at least one guest is bounced, and no opt-out
pill is added this goal. The lesson is the general one: an item that says
"beside the existing X" is naming a thing the terminal must find before it
builds against it, because the item was written from memory of the surface.

A SIGNING LIBRARY CAN CARRY ITS OWN CLOCK. svix, which the Resend SDK wraps,
enforces a five minute tolerance against the process clock and cannot be told
otherwise, so item 1's fixtures signed at a hardcoded timestamp went red on
every machine except one. 35 of 71 checks failed as "signature verification
failed", which reads as a product fault and was a fixture fault. Fixtures that
carry a signature are signed from the real clock, and our own window gate is
proved by its own log line rather than by a rejection svix might have made.

A COMMIT IS NOT THE WORKING TREE, and git mv is where that bites. Moving
api/webhooks/resend.js and then patching the moved file staged the OLD bytes:
every local run passed off the working tree while CI read the commit and
crashed the guard module on a stale import. After a move plus an edit, the
commit is what gets proved, with git show HEAD:<path>, never the tree.

THE DISJOINT-SET CHECK RUNS IN BOTH DIRECTIONS. It is natural to ask whether
a guard main added reads a file this branch changed. The other direction is
just as real and was nearly missed on item 5: this branch MODIFIED
tests/persistence/guest-note-endpoints.mjs, which reads
api/guest-note-submit.js, a file main had changed in #965, so the merged tree
paired a new guard with a new endpoint that no CI run had seen together. Four
of this goal's six PRs needed main merged in and a re-run; the route is the
exception, not the default.

A GUARD THAT CRASHES HAS NOT REPORTED. Three plants on item 4 and two on item
2 took the guard down instead of turning a check red, every time by
dereferencing a captured payload the plant had emptied. A throw is a red: the
call is wrapped and the reason returned, and every dereference of anything a
plant can remove is null safe. The same family of fault, found twice: a check
that reads TEXT POSITION is not a check on reachability, and item 5's badge
check survived a `return` placed between the delete and the recount until it
was rewritten to read the span between them.

A GUARD CAN READ ITS OWN EXPLANATION. Twice this goal a check matched the
comment that described the thing it was looking for: "neither file
re-implements the clear" matched a comment saying so, and "the email module
does not reach into the invitation templates" matched a header sentence
explaining why it does not. stripComments exists for this, and a check that
greps for an identifier runs on the stripped source.

## Handed forward

Not this goal's work, recorded here so it is not lost.

THE PAYMENTS FREEZE SELF-TEST HAS ONE RED CASE, "new file under
api/webhooks/", and it has been red since #891 on 2026-10-06, the commit that
put both sides of it on main. It was never green there. The checker is right
and the fixture is wrong, twice over. First, the probe path is never declared
to the pre-commit hook in .githooks/pre-commit, so the commit the case needs
is refused, HEAD never moves, and scripts/check-payments-freeze.mjs reads an
empty diff range and correctly exits 0: the case it believes it measures never
happens. Second, run() in scripts/test-payments-freeze.mjs swallows the
commit's exit status, so a case that did not run reports as a case that
failed, which is why this went unseen.

Proved both ways on 2026-10-11, read only. The fixture's own two commands
against a neutral path leave HEAD at the pin and the checker reporting
"0 file(s) checked"; and the checker refuses api/webhooks/resend.js at
60edd652, real history from this goal's own item 1, with exit 1 and the path
named. The directory rule works, which is what refused the push on 2026-10-10.

Owner ruling, 2026-10-11: one PR of its own after this goal closes, held,
carrying the Payments-Change trailer, because that trailer exists for exactly
this, a deliberate change to payments tooling. The checker is not changed.

## Close

Lessons section, then the last line: "Closed <date> at main <full SHA>, PRs <list>". Then the end-of-goal report, and tell the legal reviewer: email_bounce, the Resend webhook, the note notification, and Goal 3's opt-out link and stop page.

Closed 2026-10-11 at main a0939d96678197476b0d34dca0f811f4e764d454, PRs #955 #957 #959 #964 #965 #969

