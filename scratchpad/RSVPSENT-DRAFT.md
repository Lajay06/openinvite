# rsvpSent tails — DRAFT for advisor review

Drafted 2026-08-25 by the terminal, against the approved shape. **Not accepted.**
Advisor reviews, then the owner accepts, then it is written into
`claude/rsvp-experience-ruling.md` and only then into the product.

---

## TWO PROBLEMS WITH THE APPROVED SHAPE, found while drafting

### 1. The existing openings defeat the neutral clause

The shape says *keep each universe's existing `rsvpSent` opening, then add a
neutral clause that never confirms guest-list membership.* But the existing
openings **already confirm the send**:

> kyoto — "It is sent."  ·  brooklyn — "Sent."  ·  london — "your invitation is
> on its way"  ·  taj — "Your invitation is on its way, with our gratitude"

A page that says "Sent." and then "If that email is on the guest list, we've
sent your link" contradicts itself, and the first half has already leaked the
answer. **The response has to be identical whether or not the address matched** —
otherwise the form is an oracle for testing addresses against someone's wedding.

So these drafts **replace the opening** rather than keep it. That is a departure
from the approved shape and needs a ruling.

### 2. `paris` currently opens with a banned loanword

> `paris.rsvpSent` — **"Avec plaisir — your invitation is on its way."**

CLAUDE.md's loanword rule names this exact string as its reductio: *"if paris
says 'avec plaisir', kyoto says 'hai' and marrakech says 'inshallah', the system
becomes costume."* It is live in production today. The draft below replaces it
with "With pleasure." **This is a rule violation independent of this ticket and
should be fixed either way.**

### Also worth noting

13 of the 19 existing openings already contain "spam folder" — the mechanism
phrase criticised for appearing in all nineteen. Keeping the openings would have
preserved exactly that. The drafts still need the inbox/spam instruction because
it is genuinely useful, but it is now carried inside each universe's own
sentence rather than as a shared tail.

---

## The 19 drafts

| Universe | Draft |
|---|---|
| `london` | Your request is with us. If that address is on the guest list, an invitation is on its way — do look in your inbox, and your spam folder. If nothing comes, ask the couple to add you. |
| `kyoto` | Done. If that address is on the list, your invitation has gone — look in your inbox, and in spam. If it does not come, ask the couple to add it. |
| `capri` | Off it goes! If that address is on the list, your invitation is already flying over — check your inbox and your spam. Nothing there? Ask the couple to add you. |
| `marrakech` | Received. If that address is among the guests, your invitation has been sent onward — look in your inbox, and in spam. If none arrives, ask the couple to write you in. |
| `brooklyn` | Got it. If that address is on the list, your invite's sent — check your inbox and spam. Nothing? Ask them to add you. |
| `bali` | That's with us. If that address is on the list, your invitation is on its way over — have a look in your inbox, and in spam. If it doesn't turn up, ask the couple to add you. |
| `paris` | With pleasure. If that address is on the guest list, your invitation has been sent — please look in your inbox, and in your spam folder. If nothing arrives, ask the couple to add you. |
| `capetown` | Thank you. If that address is on the guest list, your invitation is on its way with our gratitude — please look in your inbox, and in spam. If nothing comes, ask the couple to add you. |
| `mykonos` | Done. If that address is on the list, your invitation has gone — check your inbox and your spam. If not, ask the couple to add you. |
| `amalfi` | That's with us. If that address is on the list, your invitation is already on its way — look in your inbox, and in spam. If nothing arrives, ask the couple to add you. |
| `sedona` | Received. If that address is on the list, your invitation has been sent — look in your inbox, and in spam. If it doesn't come, ask the couple to add you. |
| `aspen` | That's noted. If that address is on the list, your invitation has gone out — please check your inbox, and your spam folder. If nothing arrives, ask the couple to add you. |
| `taj` | Your request is received with thanks. Should that address be among the guests, your invitation has been sent — kindly look in your inbox, and in your spam folder. If none arrives, do ask the couple to include you. |
| `havana` | No rush — that's with us. If that address is on the list, your invitation is already on its way; take a look in your inbox, and in spam. If it doesn't show, ask the couple to add you. |
| `edinburgh` | Thank you, that is received. If that address is on the guest list, your invitation has been sent — please look in your inbox, and in your spam folder. Should nothing arrive, ask the couple to add you. |
| `monaco` | Noted. If that address is on the list, your invitation has gone — please check your inbox, and your spam folder. If nothing arrives, ask the couple to add you. |
| `florence` | That's with us. If that address is on the list, your invitation has been sent — check your inbox, and your spam folder. If nothing comes, ask the couple to add you. |
| `seoul` | Received. If that address is on the list, your invitation has been sent — check your inbox and spam. If not, ask the couple to add you. |
| `shanghai` | Received, with thanks. If that address is on the list, your invitation has been sent — please check your inbox, and your spam folder. If nothing arrives, ask the couple to add you. |

## Self-check against the constraints

- **US English** — swept, no British/Australian spellings or idiom.
- **No loanword flourishes** — none; `paris`'s existing one is removed.
- **capri's exclamation** — kept, one only, per the standing exemption.
- **Never confirms membership** — every line is conditional ("If that address
  is on the list…"), and none states as fact that anything was sent to *you*.
- **Guest-actionable close** — every line ends with what to do if nothing comes.
- **Swap test** — the registers are distinct: `brooklyn` is clipped ("Got it…
  Nothing? Ask them to add you"), `taj` is ceremonious ("Should that address be
  among the guests… do ask the couple to include you"), `havana` is unhurried,
  `capri` is bright. A `brooklyn` line under `taj`'s name would read wrong.

## Known weakness, stated

"If that address is on the list" opens the conditional in most of them. The
conditional is load-bearing — it is what prevents the leak — so it cannot vary
much without weakening the guarantee. The variation is carried in the opening
word, the verb, and the close instead. **If the advisor wants more variety in
the conditional itself, that is a copy direction I would rather take than
invent.**
