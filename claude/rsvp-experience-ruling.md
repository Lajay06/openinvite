# RSVP experience — accepted copy

**OWNER-ACCEPTED 2026-08-24.** Committed to the repo 2026-08-25.

This file exists because the set went missing twice. It was held in an advisor
document the terminal could not read, so the ticket that consumed it shipped
without it (#547) and the landing check instituted days earlier had nothing to
check against. See STANDING-RULES, "Accepted copy is committed before the
ticket that consumes it opens."

## `rsvpIntro` — 19 lines, verbatim as accepted

Shown on the RSVP page to a visitor the site does not recognise. Replaces the
lost-property framing the owner reported as "not fixed and talks about
resending".

| Universe | Line |
|---|---|
| `london` | Your reply is warmly received here. Give the email address the couple holds for you, and your own invitation link will follow soon after. |
| `kyoto` | This is where you reply. One address, the email the couple has for you, and your link follows. |
| `capri` | This is the part where you say yes! Type in the email the couple has for you and your own link comes straight back. |
| `marrakech` | Replies are taken here. The email the couple holds for you is all we need, and your own link is sent onward, meant for no one else. |
| `brooklyn` | RSVP here. Enter the address they'd send to. Your link comes back. |
| `bali` | Say yes right here. Leave whichever address reaches you best and your own link will make its way over to you. |
| `paris` | Your reply belongs here. The email the couple has for you is enough, and your own link will follow, gladly. |
| `capetown` | We would love your reply here. Share the email the couple has for you, and your own link will be sent along with our thanks. |
| `mykonos` | Answering is quick. Give the address they have for you and your link comes straight back. |
| `amalfi` | A yes takes a moment. Leave whichever address they'd use to reach you, and your own link follows in moments. |
| `sedona` | One reply, and you are counted in. Give whatever address they'd send to, and your own link comes back to you. |
| `aspen` | The address they have on file for you is all that is needed. Answer below, and your own link will arrive shortly. |
| `taj` | We should be honored by your reply, and it is made here: kindly share the email address the couple holds for you, and your own link shall be sent to you directly. |
| `havana` | There is no rush, but this is the place. Drop in the address they'd use for you and your link finds its way back. |
| `edinburgh` | A reply would be most welcome, and it is made below. Provide the address they wrote down for you, and your own link will be sent to you. |
| `monaco` | Whatever address they would use to reach you is enough. Say yes below, and your link returns in moments. |
| `florence` | Let them know here. Give the address they keep for you and your own link arrives shortly after. |
| `seoul` | Yes or no, both help. Leave the address they'd reach you at, and your link will arrive. |
| `shanghai` | Nothing more is needed than a reply. Share the email they have for you, and your own link will be sent, with our thanks. |

## `rsvpSent` — 19 lines, OWNER-ACCEPTED 2026-08-25

Shown after a visitor asks for their invitation link to be re-sent.

**The response must be identical whether or not the address matched.** Anything
else turns the form into an oracle for testing addresses against someone's
wedding. So every claim that a link was sent is governed by a conditional, and
the only unconditional part is an acknowledgement that is true either way —
submitting the form is a fact regardless of match.

The approved shape originally said *keep each universe's existing opening and
append a neutral clause*. **That was overturned during drafting and the
openings are REPLACED**, because they already confirmed the send — kyoto's "It
is sent.", brooklyn's "Sent.", london's "your invitation is on its way" — and a
page that says "Sent." then "if that email is on the guest list…" contradicts
itself and has already leaked the answer.

Two further things the replacement fixed:
- `paris` opened with **"Avec plaisir"**, the exact string CLAUDE.md's loanword
  rule uses as its own reductio. It was live in production.
- 13 of the 19 old openings contained "spam folder" — the mechanism repetition
  removed from the intros would have been preserved.

| Universe | Line |
|---|---|
| `london` | With pleasure. If that address is on the guest list, your invitation is already on its way — do look in your inbox, and in junk. If nothing comes, a word to the couple will put it right. |
| `kyoto` | Thank you. If that address is on the list, your invitation has gone. Look in your inbox, and wherever mail hides. If it does not come, ask the couple to add it. |
| `capri` | Lovely! If that address is on the list, your invitation is flying over already — check your inbox, and your promotions tab. Nothing there? Tell the couple and they'll sort it. |
| `marrakech` | Received. If that address is among the guests, your invitation has been sent onward — look in your inbox, and in junk. If none arrives, ask the couple to write you in. |
| `brooklyn` | Got it. If that address is on the list, your invite's sent. Nothing? Ask them to add you. |
| `bali` | That's with us. If that address is on the list, your invitation is making its way over — have a look in your inbox, and in spam. If it doesn't turn up, ask the couple to put you on the list. |
| `paris` | With pleasure. If that address is on the guest list, your invitation has been sent — please look in your inbox, and in junk. If nothing arrives, the couple can add you. |
| `capetown` | Thank you, truly. If that address is on the guest list, your invitation is on its way — please look in your inbox, and in spam. If nothing comes, ask the couple to add you. |
| `mykonos` | Done. If that address is on the list, your invitation has gone — check your inbox, and your junk. If not, ask the couple to add you. |
| `amalfi` | If that address is on the list, your invitation is already on its way — look in your inbox, and wherever mail hides. If nothing arrives, ask the couple to include you. |
| `sedona` | Noted. If that address is on the list, your invitation has been sent — look in your inbox, and in spam. If it doesn't come, the couple can add you. |
| `aspen` | That's in. If that address is on the list, your invitation has gone out — please check your inbox, and your junk. If nothing arrives, ask the couple to add you. |
| `taj` | Received with thanks. Should that address be among the guests, your invitation has been sent — kindly look in your inbox, and in your spam folder. If none arrives, do ask the couple to include you. |
| `havana` | No rush — that's with us. If that address is on the list, your invitation is already on its way; take a look in your inbox, and in promotions. If it doesn't show, tell the couple and they'll add you. |
| `edinburgh` | Thank you, that is received. If that address is on the guest list, your invitation has been sent — please look in your inbox, and in junk. Should nothing arrive, ask the couple to add your address. |
| `monaco` | If that address is on the list, your invitation has gone — please check your inbox, and your spam folder. If nothing arrives, the couple can put you on the list. |
| `florence` | That's with us. If that address is on the list, your invitation has been sent — check your inbox, and wherever mail hides. If nothing comes, ask the couple to add you. |
| `seoul` | Received. If that address is on the list, your invitation has been sent. If not, ask the couple to add you. |
| `shanghai` | Received, with thanks. If that address is on the list, your invitation has been sent — please check your inbox, and your junk folder. If nothing arrives, ask the couple to include you. |

### Variation, deliberate

*Where mail hides*, five ways, none dominant: junk ×7 · spam ×5 · "wherever
mail hides" ×3 · promotions ×2 · **omitted entirely ×2** (brooklyn, seoul —
both read better without it).

*The fallback close*, twelve distinct forms, none more than twice.

*Structure* is uniform across all nineteen — beat, conditional, where to look,
what to do — and that was **accepted deliberately**: the message has three jobs
with a natural order, the lengths genuinely differ, and brooklyn, taj and seoul
are unmistakably themselves.
