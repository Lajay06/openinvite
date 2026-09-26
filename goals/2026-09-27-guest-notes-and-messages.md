# Guest notes and Messages

Guests can already reach the couple by replying to the invitation (Reply-To is the couple on every guest-facing email — keep it that way). What is missing: a guest hears nothing after RSVPing, has no way to ask a question from the site itself, and the Messages page describes a route that was never built. Four items. Every item carries a "Mobile impact" line.

## 1. RSVP confirmation email

api/rsvp-submit.js sends the guest nothing. After a successful submit, send one email to the guest, Reply-To the couple, built in src/lib/emailTemplate.js in the house style. Copy (mine, verbatim):

Subject: Your reply to {coupleNames} is in
Body:
Hi {firstName},
{attending ? "You're coming — lovely." : "You can't make it — they'll miss you."}
{eventName} · {date} · {venueName}
Need to change anything? Use the same link you came from.
Replying to this email goes straight to {coupleNames}.

Skip the middle line for any event with no date. No emojis. Send once per submit, never on the couple's own preview. Held (send path).

## 2. Guest note endpoint

New api/guest-note-submit.js for an unauthenticated guest, copying api/song-request-submit.js's full protection set: resolveWeddingBySlug, guest gate, Turnstile, rate limit, sanitizeString with a 1000-character cap, and hashId on the email. Writes one GuestMessage {channel: 'in_app', guest name, guest email, message, read: false}. Calls notify() so the couple's bell lights. Extract the admin write into a shared helper in api/_lib/ and use it here; do not retrofit the other senders in this goal — list them in the PR for a later pass. Held.

## 3. "Send a note" on the guest site

One small form in two places: at the bottom of the RSVP page after a reply is submitted, and at the bottom of Good to know. Heading: "A question for {coupleFirstNames}?" Fields: name, email, message (1000 characters). Button: "Send note". After sending: "Sent. {coupleFirstNames} will reply to {email}." Prefill name and email when the guest arrived by token. Editors show what guests see — no note form appears in any editor that does not appear on the site. Guard at 390 and 1440. Mobile impact: none — guest site. Above MINOR: hold.

## 4. Messages, honest

src/pages/Messages.jsx:
- Empty state becomes: heading "No notes yet"; body "When a guest sends you a note from your site, it lands here. Replies go to their email."
- Filtered empty state stays.
- Remove the channel filter and any WhatsApp/email channel labels on rows — every note arrives in_app. Keep WhatsAppCompose as what it is, an open-in-WhatsApp link, labelled "Open in WhatsApp".
- Wire unreadMessagesCount (src/Layout.jsx:456) to a badge on the sidebar Messages item, or delete it. Wire it. Messages.jsx's invalidateQueries then does something.
- Reply stays email via api/send-guest-reply.js, untouched.
Mobile impact: the mobile shell would need the same badge if it lists Messages; record in the PR. Hold.

## Not in this goal

Retrofitting the other admin writes onto the new helper. WhatsApp Business API. "Quick tips" name collision. The parked Base44 MCP read.
