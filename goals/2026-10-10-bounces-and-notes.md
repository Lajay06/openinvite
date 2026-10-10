# Bounces and notes (Goal 4, lane A, opened 2026-10-10)

Lane A. Runs under the goal autonomy protocol in WORKFLOW.md. Sweep items C24, D11, O3 (bounces), O2 (notification for a new guest note), L3 (delete a note with confirm). Copy is written below; use it verbatim. No em or en dashes anywhere. US English.

Legal review: yes, at close. New Guest field, a new inbound webhook from Resend, a new email to the couple, and Goal 3's opt-out link are all for the reviewer.

## Territory

api/ (new api/webhooks/resend.js, held; api/webhooks/stripe.js is frozen and not touched), api/send-invites.js only under the named exception in item 2, api/_lib, src/pages/Guests, src/components/guests, src/pages/Messages.jsx and its components, tests/persistence. No schema changes by the terminal: the field is added by the owner in Base44 chat and mirrored in a held PR. Payments path frozen. No marketing pages, no prerendered/.

## Browser rules

One lane with a dev server or browser at a time; lane B holds the browser for batch 2, so wait and say so. No local CI shards unless the harness or a fixture changed. Sub-agents: at most two, one driving a browser.

## Rulings in advance

Only permanent bounces stamp a guest; transient bounces and complaints are logged and ignored this goal. A bounced guest is skipped on send the way an opted-out guest is, with its own count, until the address is changed; changing the address clears the stamp. Emails are matched to guests by Resend tags set at send time, never by searching addresses; an event without the tags is logged and dropped. The webhook verifies the Svix signature with RESEND_WEBHOOK_SECRET, which the owner generates in the Resend dashboard and sets in Vercel; the terminal never sees it, prints it, or writes it anywhere. A request that fails verification gets 401 and no log of its body. The note notification goes to the couple's account address, one email per note, no digest, no new switch. Deleting a note is a calm confirm in place, not a modal.

## Items

0. Scout and stop. Read api/send-invites.js and report how it calls Resend for invitations and reminders and whether tags are already passed; read api/webhooks/stripe.js for the shape a webhook takes in this repo; read Resend's docs for the email.bounced event shape, the bounce classification field, and the Svix headers; read Messages.jsx and the note read and update paths from the guest notes goal (#862 to #868). Confirm or amend the proposed field below and STOP so the owner can add it. Resume at item 1 once the mirror PR is on main.

   Proposed field on Guest:
   email_bounce, object, optional, sub-properties: at (string, date-time), kind (string, enum permanent), detail (string, a short sanitized reason with no address in it). Description: Set when an invitation or reminder to this guest bounced permanently. Cleared when the couple changes the email address.

1. Webhook, HELD. New api/webhooks/resend.js: POST only; verifies the Svix signature against RESEND_WEBHOOK_SECRET read at call time; 401 on failure with no body logged; handles email.bounced with a permanent classification by reading the guest id and owner id from the event's tags, loading that one guest through the admin path scoped to that owner, and writing email_bounce; every other event type returns 200 and is counted in one log line. Guard with a signed fixture and an unsigned one, and a plant that drops the signature check. Log lines use the "[resend-webhook] FAILURE: ..." shape with a colon. After merge, STOP and tell the owner to register https://www.openinvite.com.au/api/webhooks/resend in the Resend dashboard for the email.bounced event and set the secret in Vercel; resume when the owner says done.

2. Tags at send time, HELD, named exception for api/send-invites.js: each email carries tags guest_id and owner_id. Bounced guests are skipped like opted-out guests, with skippedBounced in the 200 response and the error "Every guest you selected has a bounced email address. Fix the addresses and try again." when all are skipped. No other change in that file.

3. Guests page. A guest with email_bounce shows the label "Email bounced" on the row and a "Bounced" filter beside the existing opt-out filter. Changing the email address clears email_bounce in the same save. The row's existing Resend action is the fix path; when the stamp is present the row shows the sentence "This address bounced. Fix it, then resend." Send modal shows the skipped count with "{n} bounced, not sent." Guard the clear-on-change and the skip.

4. Note notification, HELD because it sends email. New api/_lib/guestNoteNotification.js, own file, not src/lib/emailTemplate.js; sent from the note submit path to the couple's account address. Same table layout as the retention emails, no photo. Subject: "{Guest first name} left you a note". Preheader: "It is on your Messages page, with a reply button." Heading: "A note from {guest name}". Body: the note's first 240 characters, then "..." if cut. Button "Read and reply" to the Messages page. Footer line: "You get one email for each note. Reply from Messages, not from this email." Reply-To hello@openinvite.com.au. is_test skips.

5. Delete a note. On Messages, each note gets a quiet "Delete" control that becomes an inline confirm, calm per the P5 restraint: "Delete this note? It goes for good." with "Delete" and "Keep". Deletes through the existing note update endpoint with a delete action, owner-scoped on the server, and the unread badge recounts. Guard the server scope: a caller cannot delete another account's note.

## Stop conditions

As CLAUDE.md. Any held-list or do-not-touch file outside the named exceptions: stop and report. Never read or write a non-owner record. Never print a secret or a webhook signature. Items 1, 2 and 4 are held; print the five-marks block for each and wait for the line.

## Close

Lessons section, then the last line: "Closed <date> at main <full SHA>, PRs <list>". Then the end-of-goal report, and tell the legal reviewer: email_bounce, the Resend webhook, the note notification, and Goal 3's opt-out link and stop page.
