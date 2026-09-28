# Guest notes and Messages

> **CLOSED 2026-09-27.** All four items merged; zero open PRs; `main` at
> `79ff81db`, `test:ci` 3941/3941.
>
> | item | PR | merge commit |
> |---|---|---|
> | 1 — RSVP confirmation email | #861 | `bd16d4ab39b6684ac91bf00ca31a2f1df12f6b77` |
> | 2 — guest note endpoints | #862 | `cf4a2562d9237874c09fdd823629ba5f1c22cc06` |
> | 3 — "Send a note" on the guest site | #863 | `8c2785fadaa607bab6f7dd94287d43c726d1ccdb` |
> | 4 — Messages, honest | **#865**, replacing #864 | `79ff81db2b406d220ad982fa32322fa2e66c1aca` |
>
> #864 carried item 4 and was **closed by GitHub, not merged**: it was based on
> #862's branch, #862's squash-merge deleted that branch, and GitHub closes a
> dependent PR rather than retargeting it. A closed PR's base cannot be changed.
> The content was replayed onto `main` as #865 — the same seven files and the
> same +356/-9. The rule that came out of it is in WORKFLOW.md: no stacked PRs.
>
> Three decisions taken during the run that outlived it:
>
> - **The email lives only in `encrypted_guest`.** Item 2 asked for `hashId` on
>   the address; the owner's addendum then put the address inside the blob and
>   named the expected live diff as exactly two fields. There is no hash column
>   and adding one would be a schema change, so `hashId` is unused here.
> - **The channel filter and channel labels never existed.** Item 4 asked for
>   their removal; the pills were already status-only and no row rendered a
>   channel. The guard asserts their absence so the ruling holds going forward.
> - **Guest notes have no erasure path.** `GuestMessage.delete` stayed
>   owner-scoped while `read` and `update` went to `null`, so an
>   admin-key-written note cannot be deleted by anyone. Deliberately unchanged
>   in this goal; recorded in `BASE44_PLATFORM_NOTES.md`'s right-to-erasure
>   section and in `backlog.md`.
>
> **LIVE PASS COMPLETE, 2026-09-28**, on `la.jay06+smoke01` (owner-run). Note
> submitted from the published site; it appeared in Messages with the sidebar
> badge at 1; mark-read succeeded; reply sent and **delivered** to
> `la.jay06+notiftest01`, Reply-To the smoke couple. Messages works end to end.
>
> That pass proved the one thing CI cannot: an admin-key `PUT` on a
> `created_by_id: "anonymous"` row succeeds now that `GuestMessage.update` RLS is
> `null`. Corroborated by two `/api/guest-note-update` 200s in the production
> logs.
>
> It also found three defects, all fixed after this closure, and each fix
> confirmed by a further owner-run pass on `la.jay06+smoke01`:
>
> - **The reply failed and the row printed `mailto:…`** — one cause, two
>   symptoms: `isValidEmail` accepted a scheme prefix, so an address pasted from
>   a mailto link was stored and then refused by Resend. Fixed in **#866**
>   (`9d67009d`), which also added the no-token RSVP gate's note form.
> - **The email said "The couple" instead of the names** — `Messages.jsx` sent
>   `Invitation.couple_names`, a different record from the wedding, and the
>   server never resolved them. Fixed in **#867** (`2f45cfd4`), resolving
>   server-side with `coupleDisplayName()`.
> - **A trailing full stop failed the same way** — `la.jay06+notiftest01@gmail.com.`
>   was accepted and refused by Resend, one day after the `mailto:` case. The
>   first fix had been a character blacklist, so it closed one shape and left the
>   class open. Fixed in **#868** (`74b5b3c9`): the domain is checked AS a domain
>   — dot-separated labels, none empty, a final label of at least two letters —
>   so a trailing stop fails on a rule rather than on a list that has to
>   anticipate the next paste. `normalizeEmail` also repairs on the READ path, so
>   notes already stored with a bad address became replyable with no migration.
>
> **FINAL LIVE PASS, 2026-09-28 (#868):** the reply on the "nelly" note — the
> trailing-dot address, a row that already existed — was **delivered**, and the
> From name, subject, eyebrow and footer all read **"Smoke & Alias"**. That
> closes both the validation class and the naming defect on a real send, and it
> confirms the read-path repair works on a row nobody could edit.
>
> The lesson worth carrying: the first email-validation fix was too narrow
> because it patched the shape in front of it. `tests/persistence/
> email-validation.mjs` now keeps the historical validator verbatim and sweeps
> every address in the repository through both, so a future change cannot loosen
> the rules or silently refuse an address the product used to accept.

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
