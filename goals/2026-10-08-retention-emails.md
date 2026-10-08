# Retention emails (owner request 2026-10-07; lane A, after site fixes batch 1)

Lane A. Runs under the goal autonomy protocol in WORKFLOW.md. Two automatic emails to couples who stall, sent from the existing onboarding cron through Resend on the Openinvite domain. Copy is fixed and written below; use it verbatim.

Legal pages: no (lifecycle mail is already described in the Privacy Policy; the legal reviewer confirms at the next cycle).

## Territory

api/cron (the existing onboarding cron and its helpers), a new api/_lib/retentionEmails.js for the two templates, src/pages/Account.jsx for the stop switch, tests/persistence. Do not edit src/lib/emailTemplate.js or any guest-facing template; these emails go to the couple, not to guests, and get their own file. No api/send-*.js changes. No schema changes by the terminal: fields are added by the owner in Base44 chat and mirrored in a held PR.

## Browser rules

One lane with a dev server or browser at a time. No local CI shards unless the harness or a fixture changed. Sub-agents: at most two, one driving a browser.

## Items

0. Scout and stop. Read the onboarding cron and report: how often it runs, how it finds accounts, what it already sends, how it records that it sent something, and where the "Stop these emails" link should land. Then confirm or amend the proposed User fields below and STOP so the owner can add them. Resume at item 1 once the mirror PR is on main.

   Proposed fields on User:
   lifecycleEmails, boolean, default true. Description: Whether the account receives the two retention emails (not finished setting up; guest list still empty). Set false by the Stop link or the Account switch.
   retentionEmails, object with four optional string sub-properties setup24h, setupDay4, guests24h, guestsDay5, each an ISO timestamp of when that email was sent. Description: Which retention emails this account has received; each is sent at most once.

1. Templates. api/_lib/retentionEmails.js exports both emails as HTML plus a plain-text part. 600px table layout, Plus Jakarta Sans with Helvetica and Arial fallbacks, white card on #f6f4f1, brand red #E03553 button with 6px radius, logo wordmark top left, one full-width photo under it, footer in #8a8580 12px with a top hairline. Photos: trigger 1 uses https://res.cloudinary.com/dsr84xknv/video/upload/so_0,f_auto,q_auto,w_1200/amalfi_16x9.jpg (alt "A wedding table set by the sea at golden hour"); trigger 2 uses https://res.cloudinary.com/dsr84xknv/video/upload/so_0,f_auto,q_auto,w_1200/tulum_16x9.jpg (alt "A lantern-lit garden ready for a party"). From: the address the onboarding cron already uses. Reply-To: hello@openinvite.com.au. List-Unsubscribe header pointing at the stop link. Greeting uses the first name typed in onboarding when present, otherwise "Hi there,".

   Trigger 1 copy.
   Subject: You got as far as your names
   Preheader: Which is further than most people get on a Tuesday.
   Heading: You got as far as your names.
   Body paragraphs:
   Hi {first name},
   You started setting up your wedding on Openinvite, typed your names, and then something more interesting came along. Fair enough.
   Here is the thing: the part you left is the short part. The date, the place, roughly how many people. Three answers, and the studio builds itself around them: a wedding site in your colors, a guest list that knows who is coming, and Ava, who has read all of it and will answer questions at 11pm so you do not have to.
   Nothing is lost. Everything you typed is still there.
   Button: Pick up where you left off (login, returning to onboarding)
   After the button: If something got in the way, a question, a worry, a thing that did not work, reply to this email. A real person reads it (hello, that is me, Jay).
   Footer: You are getting this because you created an Openinvite account on {date} and have not finished setting up. Not planning a wedding anymore, or just want quiet? Stop these emails. Openinvite, Australia. hello@openinvite.com.au

   Trigger 2 copy.
   Subject: Your guest list is still empty, and that is fine
   Preheader: Ten names and the whole studio wakes up.
   Heading: Your guest list is still empty, and that is fine.
   Body paragraphs:
   Hi {first name},
   You made an account, had a look around, and then real life happened. Happens to everyone.
   Ten names is all it takes to make the rest of the studio come alive. Add the people you could not get married without, and watch the seating chart, the RSVP page and the invitations wake up around them.
   Nothing is lost. Your wedding is exactly where you left it.
   Button: Add your first ten guests (the Guests page)
   After the button: Stuck on who makes the list? Ava is good at that conversation. Stuck on something else? Reply here and a real person answers (hello, that is me, Jay).
   Footer: You are getting this because you created an Openinvite account on {date} and your guest list is empty. Not planning a wedding anymore, or just want quiet? Stop these emails. Openinvite, Australia. hello@openinvite.com.au

   The second nudge of each trigger reuses the same email unchanged.

2. Triggers in the cron. Trigger 1: account created, onboarding not completed, 24 hours or more since signup and setup24h unset; again at 4 days if still not completed and setupDay4 unset. Trigger 2: onboarding completed, zero guests, 24 hours or more since signup and guests24h unset; again at 5 days if still zero and guestsDay5 unset. Never send when lifecycleEmails is false, when the account is deleted or deletion-requested, or when the condition no longer holds at send time. Record the timestamp before sending so a crash cannot double-send. Accounts older than 30 days at the time this ships never receive either email (no backfill). Smoke, test and owner accounts: the cron's existing exclusions apply; if there are none, exclude la.jay06+smoke01 and the owner's main account explicitly and STOP to report.

3. Stop link and switch. The footer link lands on a signed, token-based stop page that sets lifecycleEmails false without requiring login and shows one line: "Done. No more of these from us." Account page gets a switch "Emails when I have gone quiet" beside the notification preferences, same updateMe path as dateFormat. The token is HMAC of the user id with an existing server secret; never a bare id. No new secret is created; if no suitable existing secret is available, STOP and say which env var is needed.

4. Owner test send. Add a cron-safe dry mode that renders both emails for a named account without sending, and one owner-only route or script that sends both to la.jay06+notiftest01 (the only permitted test address). Report when it is ready; the owner triggers it and confirms the render.

## Rulings in advance

Copy verbatim, US English, no em or en dashes, no emojis. If the cron has no notion of "onboarding not completed", use the same signal the stall agent uses (onboardingDraft or step index present, no dashboard arrival) and record the choice in the PR body. If first name is missing, "Hi there,". Any held-list file: STOP and report before editing; list every changed file against the held list in each PR body. The mirror PR (item 0) and the cron PR (item 2) are HELD for the advisor's line; items 1, 3 and 4 self-merge under the protocol.

## What else does this touch

User schema (owner adds two fields). The onboarding cron's schedule and exclusions. Resend sending volume (small). Account page. Privacy Policy wording is already general enough; the legal reviewer checks at the next cycle.

## Guards

Templates: both render with the copy above, plain-text part present, no banned characters. Triggers: a fixture account at 23h gets nothing, at 25h gets exactly one, at 25h again gets nothing, after completing setup or adding a guest gets nothing, with lifecycleEmails false gets nothing, older than 30 days at ship gets nothing. Stop link: a tampered token changes nothing; a valid token sets the flag once. Each new guard proved red before the change.

## Close

Last line: "Closed <date> at main <full SHA>, PRs <list>".
