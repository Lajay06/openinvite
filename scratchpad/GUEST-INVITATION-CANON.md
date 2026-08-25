# Guest invitation canon — the address line, and hero restraint

Design rulings, 2026-08-25. Design only; no code in this document.

**STATUS: both rulings ACCEPTED by the advisor.** The non-repetition rule at
the end is adopted as canon.

**OWNER ACCEPT STILL REQUIRED ON THREE SPECIFICS, before any build:**
1. The four worked address-line examples.
2. The tagline demotion (recorded as the terminal's judgment call, put to the
   owner as overrulable — not smuggled through).
3. **The essentials band.** Below the hero there is currently no fixed
   furniture at all, so this is NEW STRUCTURE appearing on every wedding site
   and cannot ship on a design ruling alone.

**Do not write the remaining fifteen address lines until the four examples are
accepted.**

Amends the hero-experience canon. **The ladder, the scrim rules and the motion
personalities are untouched** — this constrains the overlay's CONTENT and adds
one new fixed band. Those three live in the advisor's ledger, not in this repo;
nothing here should be read as restating or replacing them.

---

## The two facts everything below rests on

**STRUCTURAL — there is nothing under the hero.** `WeddingHomePage` renders the
hero and then `UniverseBlocks`, which are optional and couple-authored. A
wedding with no blocks has a home page consisting of a hero and nothing else.
So "move the date and RSVP below the hero" is not a relocation into existing
furniture — **the furniture does not exist and has to be specified.**

**PLUMBING — we hold the token, not the name.** `guestRecognition.js` keeps the
guest's RSVP token in localStorage and `MultiPageWeddingWebsite` reads it, but
the NAME only arrives from `/api/rsvp-lookup`. Any addressed moment is gated on
a network round trip. This single fact decides where the address line can live.

---

# RULING 1 — the invitation addresses the guest

The site recognises a guest who arrives on their personal link and holds that
recognition for the visit, yet the only personalised moment is "Hi <name>,"
above the RSVP form. The invitation itself never says who it is for.

## Placements considered

### A · A fourth beat in the entrance moment — "For Grace", after the names
The most ceremonial option and the obvious first instinct: an envelope has a
name on it. **Rejected**, on three grounds that are design, not caution:

1. **It races the lookup.** The entrance is a scripted ~2.5s reveal that starts
   at mount. A name resolving mid-script either pops in late or forces the
   reveal to wait on a network call. Delaying the invitation to fetch a name is
   the wrong trade in an experience whose whole point is arrival.
2. **It happens once, ever.** The entrance is gated per visitor per site in
   localStorage. A guest who returns in three months to check the timings is
   never addressed again — which is most of the relationship.
3. **It is the most screenshot-prone frame in the product.** A reveal is what
   people photograph and send on. The owner's constraint is that the guest's
   name never travels beyond their own screen, and this is precisely the frame
   that travels.

### B · The hero kicker slot becomes the address line — RECOMMENDED
The kicker is the line above the couple's names: "An invitation", "A quiet
gathering", "Nº 01 — Marrakech".

**It is the weakest copy in the system. Eight of nineteen universes say
literally "You are invited"**, and two more are a word away from it. It is a
slot addressed to nobody, in the one place where we may know exactly who is
standing there.

- **Recognised:** the kicker renders the address line, universe-voiced, first
  name only.
- **Unrecognised:** the kicker renders exactly as it does today.

It **replaces** rather than adds, so the hero's element count is unchanged and
Ruling 2 below still holds. There is no empty state to design, because the slot
is never empty — it falls back to the line that is there now.

**The race is solved by ordering, not by waiting.** Render the universe kicker
immediately; swap to the address line only once the lookup has resolved AND the
entrance curtain has lifted. Nothing changes on screen during the reveal, and a
failed lookup simply never swaps — no guest can tell the difference.

### C · The essentials band opens with the address line
Sound, and free of any race, but it sits below the fold and reads as a caption
to logistics. Being greeted should not arrive after the parking information.
**Held as the fallback surface** if B is ever ruled out.

## Recommendation

**B, on the home page only. Once per visit to the landing, not on every page.**

Every page would nag, and the RSVP tab already greets by name — a guest who
moves between tabs would be addressed three or four times in a minute. The
landing is where an invitation is opened; that is where it should say who it is
for.

## Degradation — the slot is never empty

| State | Kicker slot renders |
|---|---|
| Recognised, name resolved | the address line |
| Recognised, lookup pending | the universe kicker |
| Recognised, lookup failed | the universe kicker |
| Name is the `—` PII sentinel | the universe kicker |
| Unrecognised visitor | the universe kicker |

The sentinel row is not hypothetical. `NAME_PLACEHOLDER` is `'—'`, and until
F-A every token endpoint returned it. **Treat `—`, empty and whitespace as
unrecognised** — a hero reading "— , you are welcome" is worse than no
personalisation at all.

## Privacy rules

- **First name only, never the full name.** A hero is photographed and shown to
  people. A first name in the couple's typeface reads as warmth; a full legal
  name reads as a database.
- **Never in the entrance moment**, per A above.
- **Never in meta, Open Graph, or any URL.** Structurally guaranteed already:
  the guest shell is one static wedding-independent file (#546), and the token
  is consumed and stripped from the address bar on arrival.
- The address line is client-rendered only. It must never reach a prerendered
  or server-rendered document.

## Copy shape — the family rule

The nineteen `rsvpWelcome` voices already exist and this must sit beside them
without repeating them. **The division of labour: `rsvpWelcome` is about
REPLYING; the address line is about ARRIVING.** No "reply", "yes", "let us
know" or "RSVP" in this family — those words belong to the other line.

- One line. Contains the guest's first name exactly once.
- An address, not a greeting plus information. No date, no venue, no
  instruction, no "please".
- **Sentence case, and it opts OUT of the kicker's uppercase treatment.** Some
  layouts set the kicker at 12px / 0.22em / uppercase. "GRACE — YOU ARE
  INVITED" is shouting a person's name at them. The address line keeps the
  kicker's size and letter-spacing and drops the transform.
- **≤ 32 characters including the name.** The kicker's letter-spacing is what
  constrains this, not taste — a long line at 0.22em wraps badly at 390.

### Worked examples, spanning the registers — FOR ACCEPTANCE, not final

Four only, deliberately. The remaining fifteen should be written once the shape
is accepted, and the whole set accepted together the way the `rsvpWelcome` set
was — I am not writing nineteen unaccepted lines into a doc.

| Universe | Current kicker | Address line (proposed) |
|---|---|---|
| london | An invitation | Grace, you are most welcome. |
| kyoto | A quiet gathering | For Grace. |
| brooklyn | The wedding | Hey Grace. |
| taj | You are graciously invited | Grace, you honour us. |

Note kyoto: its `rsvpWelcome` is "It is good that you came.", so an arrival line
about being here would collide. "For Grace." steps aside from it — which is the
test to apply to all nineteen.

## Implementation note (not a design decision)

The RSVP tab already calls `/api/rsvp-lookup`. Hoist that lookup to
`MultiPageWeddingWebsite` and pass the result down, rather than adding a second
call — a recognised guest on the home page should not cost two round trips for
one name.

---

# RULING 2 — hero restraint

Owner: *"the hero image and video on the landing should not have the date or
rsvp stuff, it is too much."*

## What the hero carries today

Two shapes, both over-furnished:

- **Layout mastheads** (london, paris, capri, mykonos, capetown and the rest):
  kicker + couple's names, centred — **plus a three-column strip pinned to the
  bottom**: "The date" / "Join us in" / "RSVP — View invitation".
- **Generic hero**: couple's names + tagline + **an RSVP pill**.

## The ruling — the hero carries identity, and nothing else

**Stays:**
1. The kicker — or, when a guest is recognised, the address line (Ruling 1).
2. The couple's names.

**Leaves:** the three-column strip, the RSVP pill, and — one judgment call
beyond the literal instruction — **the tagline**.

The tagline is neither date nor RSVP, so removing it is my recommendation
rather than the owner's words, and it can be overruled. The reasoning: after
this ruling the hero's job is a photograph with a name on it. A sentence
competes with the photograph for the same attention, and the tagline is the
couple's own writing — it deserves room to be read, which the band below gives
it and a scrim over a video does not.

## What moves below it — THE ESSENTIALS BAND

Because nothing fixed exists under the hero, this has to be specified rather
than assumed.

- A band immediately below the hero, **always rendered**, before any
  couple-authored blocks. It is not removable: it carries the facts that make
  the site an invitation rather than a poster.
- **Content, in order:** the couple's tagline (if set) · the date · the place ·
  one action, RSVP.
- **390 first:** stacked rows, generous leading, the RSVP action full-width and
  at least 44px. **≥768:** the three facts become three columns — the shape the
  bottom strip already uses, so this is largely a relocation of an existing
  component rather than a new one to design.
- It sits on the universe's `lightBg`, the first light band after a dark hero,
  so the scroll also delivers a temperature change.
- **It carries the only action on the home page** above the couple's own
  blocks. One invitation, one thing to do.

## How the two moments avoid repeating each other

The entrance plays: light → kicker + hairline → couple's names → curtain lifts.
The hero holds: kicker → couple's names. They are deliberately the same two
elements — the curtain lifts to reveal the thing it just showed, which is the
point of a curtain.

Restraint strengthens this rather than breaking it: the hero no longer carries
furniture the entrance never foreshadowed.

**The rule to keep, stated so it survives future changes:**

> The entrance moment may only ever contain a SUBSET of what the hero contains.
> It must never introduce an element the hero does not have.

Date, place and RSVP are now hero-absent, and therefore entrance-absent too.
The address line is hero-only by Ruling 1, so the entrance keeps the universe
kicker even for a recognised guest — which is also what the privacy rule
requires.
