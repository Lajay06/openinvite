# Open tickets — build terminal

Written 2026-08-25. This file exists so ticket detail survives a context reset.
Strategy lives in the advisor's ledger; this is the operational list.

Standing protocol: report → advisor issues a **verbatim quoted authorization
line** → build → verify → merge. Every line is conditional on
`npm run pr:green <PR> ` exiting 0 at merge time; SKIPPED is not PASS. One PR at
a time, merged or closed the same session. Guest-facing UI needs **owner accept
on renders** before the merge request.

---

# UNIVERSE PROGRAMME — the report before the work (2026-08-31)

**Ordered by the owner before a line of universe work: what is a universe made
of, and can we look at twenty at once. Both answered from source.**

## What a universe is: 13 dimensions, and they are NOT palette swaps

`websiteThemes.js` (1,416 lines) -> `universeCatalog.js`. Every dimension is
rendered somewhere; none is dead.

| | filled /20 | distinct /20 |
|---|---|---|
| colors, typography, motion, layout, copy, tagline, tileDescription, motifNote, worldStory, imageUrl | 20 (layout & copy: 19) | **20** |
| tags | 20 | 19 |
| **texture** | 20 | **14** |
| **transitionStyle** | 20 | **10** |

**Ten of thirteen dimensions carry twenty distinct values.** (Was eleven;
texture left the group on 2026-08-31, see below.) This is not five worlds and
fifteen palettes — each universe has its own layout token (`london-minimal`,
`kyoto-vertical`, `capri-citrus`), motion timing, copy voice and world story.

**Texture moved to 14 deliberately.** The eight grid universes now inherit a
per-family level from `TEXTURE_REGISTRY` (canvas 0.015, linen 0.012) instead of
each carrying its own opacity; the twelve noise universes keep theirs. The
distinctness test that had required all twenty to differ was retired with it —
that rule is what forced four canvas universes to override the calibrated
default upward, to 2x at bali, which was the defect the owner reported as "too
in your face". A per-family calibrated level cannot coexist with a rule
demanding a unique level per universe.

**AND THE NUMBER ABOVE COUNTS VALUES, NOT DIFFERENCES ANYONE CAN SEE.** Measured
in dL* against the two grounds each overlay actually meets, eleven of the twenty
textures sit below the ~1.0 threshold on BOTH grounds. So texture never carried
twenty distinguishable values — it carried twenty different numbers, and a test
enforcing distinctness in the config could never have told the difference. The
same caveat applies untested to the other ten dimensions in this table: **the
real programme question is how many carry twenty PERCEPTIBLY distinct values,
and that has never been measured for any of them.** See DECISION-LOG 2026-08-31.

**The two real gaps, and they are small:**
1. **`transitionStyle`: 10 values across 20 universes**, each shared by a pair.
   The one genuinely thin axis.
2. **`tulum` is missing `layout` and `copy`** — the only hole in 260 cells.

## The contrast finding, RELOCATED — it is the accent, not the body

The standing claim was "15 of 20 palettes fail contrast", read as the product
being illegible. **Measured, that is true of the accent and false of the body.**

| | Result |
|---|---|
| **Body text** (`lightText` on `lightBg`) | **0 of 20 fail.** All above 7:1, most above 10:1 |
| **Accent** (`accent` on `lightBg`) | **15 of 20 fail 4.5:1** &middot; **10 of 20 fail even 3:1** |

**It is still real**, because `color: accent` appears **62 times on guest
surfaces** — active nav, section eyebrows, quote attribution, list marks. That
is text, so 4.5:1 applies.

**Honest severity: secondary and label text in 15 universes is below the
legibility threshold. Not "three quarters of the product is illegible".** The
fix is the accent value in 15 palettes, not a redesign.

## Can we look at twenty at once? YES, and it is cheap — tested, not asserted

**All 20 universes render at tier 1: 20/20, zero failures, 19/20 visually
distinct outputs.** A real guest page renders once per universe through the
existing harness, in seconds, no browser needed.

**The contact sheet is built:** every universe on one page, each card rendered in
its own palette and type stack, with the matrix and computed contrast beneath.

**The 19/20 is itself a finding the matrix could not produce:** two universes
rendered byte-identically on that page. Either a genuine collision or a page that
does not exercise the dimension they differ on. Worth identifying.

## The work the matrix says this actually is

1. **The 15 accent contrast failures** — bounded, concrete, launch-relevant
2. **`transitionStyle`** — 10 values for 20 universes
3. **`tulum`'s missing `layout` and `copy`**
4. **The two identical renders** — which, and why

Not "make twenty worlds distinct". They largely are.

---

# WAVE 3 — THE ACCORDION PATTERN (owner's spec, recorded verbatim 2026-08-30)

**This spec was never written into the repo until now — the owner's own note,
the same failure as the deletion list.** It is recorded here first, before any
code, because a pattern that lives only in a conversation is a pattern that gets
re-derived differently every time it is used.

## The ruling

The **celebration onboarding step is the REFERENCE IMPLEMENTATION** for options
and accordions, dashboard-wide. Owner, verbatim:

> "please understand how much we love the accordion for the celebration page and
> how it needs to translate across the entire dashboard and website invitation
> where possible."

This carries the **same standing as the Stay page** does for guest content
layout — a named reference implementation, not a suggestion.

## The first rule of this wave

**WRITE THE PATTERN DOWN AS ONE COMPONENT BEFORE PROPAGATING IT.** A pattern
copied twenty times from memory becomes twenty patterns. The component is the
deliverable; the adoptions are downstream of it.

## The specification

| # | Rule |
|---|---|
| 1 | **Collapsed by default. Always. Every instance.** (Matches the standing `defaultValue={[]}` rule in CLAUDE.md.) |
| 2 | **One section open at a time.** |
| 3 | Section heading in **the size and weight of that page**, sentence case, left-aligned, **chevron right**, **thin rule between sections**. |
| 4 | Collapsed, nothing chosen: **"Nothing selected yet"**, quiet grey. |
| 5 | Collapsed, choice made: **THE CHOICE IS SHOWN** as a light, borderless, **non-interactive chip**. |
| 6 | Options are **PILLS**. Unselected: **outlined**. Selected: **solid black, white text**. |
| 7 | **Generous vertical rhythm.** The page breathes; that is most of why it reads as expensive. |

**Rule 5 is the one most likely to be dropped.** The owner singled it out: a
collapsed section must still tell you what you decided. A section that collapses
and hides the decision has lost the point of collapsing.

**THE TOP ROW IS THE BUG, NOT THE MODEL.** Style's pills are borderless while
Ceremony's are outlined — the owner flagged this himself. **Outlined wins.** Do
not reproduce the top row's treatment when building the component.

## The open question — do not guess, do not soften

Hover on an unselected pill goes **black**, and **selected** is also **black**.
Those cannot be the same black, or a couple cannot tell what they chose from
what their cursor is touching.

**Propose the distinction and show it before adopting.** Explicitly ruled out:
resolving it by making hover subtle. The owner likes that it goes black.

## Universal structure, local skin

**Carry the BEHAVIOUR everywhere:** collapsed by default, one open at a time,
the summary chip, the rhythm, the heading hierarchy.

**Do NOT carry the black pill or the Plus Jakarta Sans face onto guest
surfaces.** There the universe supplies colour, face and weight. Owner's canon:

> "there is no point if they all run the same and just have slight colours."

This is the artwork exemption expressed as a component boundary: the accordion's
mechanics are chrome, its skin on a guest surface belongs to the couple's
universe.

## What this absorbs

Three tickets stop being three fixes and become **three adoptions**:

- wedding party
- theme options
- **L-2** — the FAQ accordion (previously listed under THE ORDER)

**Report any accordion that cannot become an instance, and why.** A surface that
resists the pattern is a finding, not a silent exception.

## Then the modals — propose before building

**Add guest** and **Add vendor** "feel crowded and a bit cheap" (owner). Propose
them rebuilt on this pattern: **essentials open, everything else in collapsed
sections showing what has been chosen.**

**Report the proposal before building.** This is a proposal gate, not a build
instruction.

## DONE — theme options adopted (#620), after the density variant (#619)

Stopped and reported rather than built, per the owner's instruction to sequence
rather than untangle a three-way collision.

The Theme tab (`EventDetails.jsx` -> `ThemeSection.jsx`) is a **full instance**,
periphery included — but it carries **89 pills**, and **52 of them** (Culture,
across 5 regions) render at a `small` density: 11px type, 5x12 padding. The
shared `OptionPill` has no size variant. Forcing 52 dense options up to
12px/8x16 inflates each by roughly 40% in area on the densest surface in the
product.

So the adoption needs a density variant on the shared component. That is a
component change, and `feat/guest-faq-accordion` (#614) is already editing the
same file. **Sequence it: land #614, then add the variant, then adopt.**

### The Pill count, filed — a pattern's cost is only arguable once someone says how many

**22 locally-defined pill components** across the repo. Five implemented the
option-selection pill that `OptionPill` replaces — **now FOUR: `ThemeSection`'s
copy died with its adoption in #620, as ruled.** Updated here rather than left
to rot, because a ticket that overstates its own scope is the same defect we
spent the day chasing, just cheaper.

- ~~`src/components/event-details/ThemeSection.jsx`~~ — **done, #620**
- `src/components/onboarding/OnboardingStep5WeddingType.jsx` — **two**, `Pill` and `s5-pill`
- `src/components/onboarding/OnboardingPathACultural.jsx`
- `src/pages/Policies.jsx`
- `src/pages/UniverseStudio.jsx`

The other 17 are filter / status / toggle pills doing a different job and are
NOT in this pattern's scope. The two in the celebration step are their own
ticket, not part of any adoption.

## Sequence

1. The component + the hover question — **report before merging**
2. The three adoptions
3. The modal proposal

---

## WAVE 4 — remove Share from the website builder's top bar

**Owner-ruled. Do not build before Wave 4.**

Owner: there is a Publish and a Share, it is confusing, and the page Share
opens is weird.

**The principle: PUBLISH IS A STATE CHANGE; SHARING IS WHAT HAPPENS
AFTERWARDS, SOMEWHERE ELSE.** A button in builder chrome is for something done
repeatedly while building. Sharing is done once, later, from the Guest Suite —
which already has a proper home for it with the links, the QR code and the
email tools.

- **Publish stays** in the builder.
- **Share leaves the chrome entirely.**
- The route to sharing is offered as the **next step after a successful
  publish**, not as a permanent competitor to it.

### And the duplication to resolve while in there

The address editor exists in **two** homes: the builder's publish modal and the
Guest Suite share page. Same field, twice.

**That duplication is why the claim adoption had to touch as many surfaces as
it did** — and both copies had to be fixed separately when a failed claim left
the typed value on screen. The second was missed on the first pass.

> **The fewer places a thing can be changed, the fewer places can be wrong.**

Propose ONE home for the address when Wave 4 comes round.

---

## MUTATION-SILENCE-SWEEP — mutations with onSuccess and no onError

**Report first, then fix as its own small branch. Not urgent, not now.**

Found by accident: `Music.jsx`'s `updateMutation` had `onSuccess` and **no
`onError`**, so a thrown refusal went into react-query's mutation state and
nothing rendered it. A couple pressed a toggle and saw *nothing happen*.

Canon says every user-initiated action renders success or failure — and **a
canon rule is presumed unenforced until swept product-wide**. One was found
without looking, so assume there are others until they are counted.

- Enumerate every `useMutation` with an `onSuccess` and no `onError`.
- Report the count before fixing anything.
- Weight by whether a human pressed something: a background refetch failing
  silently is untidy; a toggle a couple pressed failing silently is the defect.

**WIDENED: a surface that LIES about success belongs in this sweep too.** The
studio displayed "✓ Saved" over an address it had never written — the response
was checked and truthful, but the payload no longer carried the field the
couple had just edited. So the sweep has two shapes, not one:

- a mutation that fails and says nothing;
- a save that succeeds while excluding what the user changed, and reports
  success anyway.

The second is nastier, because every naive check passes. Look for fields edited
into local state whose persistence path filters them out.

Related: the positive form of the silence rule — *tell them before they try,
not only after they fail*. The `Music` banner does the work; the error message
is the safety net for someone who acts anyway.

---

## THE FIX WAVE — next, one PR, owner accept before merge

From the owner's production walk of the RSVP flow (2026-08-25). The walk itself
PASSED end to end: landed inside the site on `taj`, correct universe line, both
primary buttons, per-event card, dietary pills, and the writes landed
(3 RsvpResponse rows, latest-wins intact, verified from Base44).

**F-A · PII never restored on the token path** — highest.
`NAME_PLACEHOLDER = '—'` (`api/_lib/guestProtectedFields.js:79`) is written into
the plaintext `name` column; the real value lives in the encrypted blob and is
restored only by `mergeGuestPii`. Three endpoints read PII **without** calling it:

| endpoint | reads |
|---|---|
| `api/rsvp-lookup.js` | `name`, `email`, `dietary_restrictions` |
| `api/rsvp-submit.js` | `name` — this is where "New RSVP from —" is built |
| `api/questionnaire-answer-submit.js` | `name` — a third notification nobody has reported |

`wedding-attendees.js` and `my-guest-links.js` already restore. `rsvp-poll-vote`
and `questionnaire-lookup` read no PII.

**Fix at `resolveGuestByToken` in `api/_lib/rsvpAuth.js`** — the write-boundary
rule applied to a read boundary. Fixes all seven callers at once; a narrow fix
would leave five silently wrong. `mergeGuestPii` is idempotent (re-reads the
blob, copies the same values) so the two already calling it are unaffected.
Consequence: this has NEVER worked in production — every recognised guest on
every wedding has seen "Hi —,". Not a regression from the embed; the embed put
it somewhere the owner finally looked.

**F-B · Meal preference must be opt-in.** Renders unconditionally today; should
appear only where the couple enabled meal options for that event. **Report the
governing setting BEFORE building** — there is a custom-meal-options concept
(see FoodBeverage's Ultra gate); if no per-event setting exists, report that and
propose the smallest one. Do not invent schema silently.

**F-C · Email field** — RULED: hide when we already hold an email for that
guest; show only when we do not (guests added by name alone, and the
never-emailed case). Label accordingly when shown. **Unanswerable until F-A
lands** — that path currently sees the placeholder for `email` too.

**F-D · Translucent surfaces.** Every input, select, textarea, pill and event
card is semi-transparent, so universe texture shows through and they look cheap.
Owner: "make them all full fill." Solid fill drawn from the **universe palette**
— not white, not gray. Check contrast on **all 19 palettes**, not just taj;
fine-stroke 4.5:1 still applies. Signature surface, treat as universe not chrome.
Folded in: **M-1** and **M-2** below.

**F-E · Remove the tick** on the confirmation state. Owner: "corny." Let the
typography carry it. Rest of that screen is accepted.

**F-F · Event cards lack detail.** Ceremony shows name + time only. Needs venue,
address, and whatever else the couple has set — a guest deciding whether they can
make the ceremony needs to know where it is.

**F-G · The 19 intros and 19 rsvpSent tails were never written.**
`git log -S rsvpIntro -- src/lib/websiteThemes.js` returns nothing; that field
has never been touched. `rsvpWelcome` (19 recognised lines) DID ship. The owner's
phone shows the original lost-property copy because that is what is in the file.
**Grep the accepted strings after writing them, per the landing-check rule.**
The accepted sets are in the conversation ledger — re-request them if lost.

**Hamburger tap target** — the guest-site mobile menu button
(`md:hidden ml-auto`) is **20px**. It is the only navigation a guest has on a
phone; a guest who cannot open it cannot reach the RSVP tab. Size to 44px in
this wave. The 17px masthead link waits for WEBKIT-PASS.

### Mobile findings (WebKit @ 390, verified)
- **M-1** — one inline `100vh` on the RSVP container. Under the Safari toolbar
  `100vh` resolves to the larger height and the section overshoots. Use `100dvh`.
- **M-2** — "Not you? Use a different invitation" is **37px**, under 44px. Mine.
- **M-3** — `overflowAfter: 1`. Zero horizontal overflow before the primary tap,
  ONE element after. **Identify during the build and report what it was; do not
  fix blind.**
- **M-4** — pre-existing sub-44px chrome: masthead 17px (→ WEBKIT-PASS),
  hamburger 20px (→ this wave, see above).

**What PASSED on mobile:** primary buttons 336×65/67, full width, above the fold
even at the toolbar-reduced 664px; zero overflow before tap; tap-through works
(counted in, both events, pills, submit). **No separate mobile RSVP surface
exists** — one implementation, restyled. No `isMobile`, no `matchMedia`, no
width-conditional route.

---

## THE ORDER (advisor, 2026-08-25)

**R-1 — RESOLVED 2026-08-25. NOT A REGRESSION, AND NOT FROM ANY DEPLOY.**

Owner: *"the update has changed the styling quiz as the gender selection,
budget and notes on the final page are missing or condensed."*

The answer is a third possibility neither option covered: **the fields are
absent by design, because the site is running a different questionnaire.**

`WeddingStylePage.jsx:103-108` is a dispatcher on
`weddingPolicies.stylingQuestionnaire.enabled`:

| flag | component | shape |
|---|---|---|
| `false` (default) | `AIStyleQuestionnaire` | gender → style → comfort → **budget** → **notes** (notes last) |
| `true` | `RulesBasedStyleQuestionnaire` | events → style → budget → results |

The rules-based variant **has never had a gender step or a notes field**, and
its budget is step 2, not a control on the final page. The AI variant has
exactly the shape the owner remembers.

Live on john-suzanne: `stylingQuestionnaire: {"enabled": true}`. Walked the
quiz to the end in WebKit at 390 — events → style → budget → "Your style
guide", which is a **read-only results page with zero inputs, selects or
textareas**. Not condensed. Not broken. A different flow.

**Excluded by file scoping, as instructed:**
- `RulesBasedStyleQuestionnaire.jsx` and `stylingRules.js` — untouched since
  **2026-08-17** (#459, when they were introduced).
- `WeddingStylePage.jsx` — last changed **2026-08-21** (#513, the season fix).
- `GuestSuitePolicies.jsx` (where the toggle lives) — last changed 2026-08-21
  (#511, UI only). Its default is `enabled: false` and **no code path writes
  `true`**.
- **No feel-pass commit touched any styling-quiz file.** Items 3/3b, 5 and 6
  are excluded, not merely unlikely.

So the toggle was turned on by hand, in Guest Suite → Policies.

**THE REAL FINDING, and it is a product one:** the toggle is described only by
what it ADDS — *"Show a quick 'what to wear' questionnaire on the Styling
page… Guests pick the events they're attending, their style, and their
budget"* — and never says what it REPLACES. A couple switching it on has no
way to know they are trading away a richer flow that asked gender and notes.
Honest about itself, silent about the swap. **Needs a ruling: reword the
toggle, or make it a two-way choice that names both flows.** Filed as
STYLING-TOGGLE-NAMES-ONE-SIDE.

**Then M-3 — RULED, FIX IT, own micro PR.** `ToastViewport`
(`src/components/ui/toast.jsx:18`): `w-full` at a 16px offset gives
`right: 406` on a 390 viewport, widening the scroll area on **every page below
`md`, before any toast exists**. Global chrome, which makes it more worth
fixing, not less. Constrain the viewport, verify toasts still render and stack
at both widths, and add a probe pinning zero horizontal overflow at 390 on a
representative page. The `sr-only` heading is correct and stays.

**Then the api-glob guard** (see STANDING-RULES, "A fixed bug that returns is a
fix in the wrong place") — fail any script under `scripts/`/`tests/` that calls
`page.route` with a glob containing `api`.

**Then, in order:** D-1 (experience guide and policies not rendering) · D-2
(guide doubled) · D-3 (RSVP to the end of the nav) · L-1 (Stay as the named
reference layout, **written down before propagating**) · L-2 (FAQ accordion) ·
E1–E4 emoji · PREVIEW-NAV · F4/F5 · item 7 · MESSAGES-GUARDS ·
EXPORT-OVERLAY-SILENT-FAIL · NULL-SCRIPT-VERIFY-FIX · INVENTED-CONTENT-SWEEP ·
HARNESS-FIXTURE-TRUTH · Option B proposal · WEBKIT-PASS.

**D-1 — HELD** pending the owner's specific. `/w/john-suzanne/experience`
renders on production with `experienceGuide.published: true`, so "not
rendering" does not reproduce on this wedding. Do not chase further.
**D-2 (guide doubled) and D-3 (RSVP to the end of the nav) are unaffected and
stand.**

**CSP-BLOB-NOISE** (new, low priority, pre-beta) — the report-only policy
refuses `blob:` on every guest page, so `/api/csp-report` is spammed by a rule
that blocks nothing. Either allow `blob:` or stop reporting it. A noisy channel
is a channel nobody reads, and we want that one quiet and meaningful before
beta.

**Incidentals seen while checking, held not absorbed:** `/w/:slug/polls` still
renders 🗳️ (E1 batch) · the report-only CSP refuses `blob:` URLs on every guest
page, so `/api/csp-report` is being spammed by a policy that is not actually
blocking anything — low-priority CSP tuning.

## HEADING-OUTLINE — established 2026-08-25, and the scope is 11 not 18

**The advisor's expected ruling does NOT hold, and that is the good outcome.**
Measured across all 15 derived guest routes with the entrance overlay
dismissed: **zero routes have more than one h1.** The masthead renders only in
the HOME hero, where the couple's names are legitimately the h1. No masthead
correction is needed and none should be made.

The first measurement said 12 routes had two h1s. That was the instrument: the
harness gives each route a fresh context, so `EntranceMoment` — a fixed overlay
carrying its own `<motion.h1>` with the couple's names — was present every
time. Traced via ancestor chain (`body > div.fixed > … > h1`), not guessed.
`dismissEntrance` exists in the harness for exactly this and I had not used it.

**THE 18 SPLIT 11 / 7 ON INSPECTION. Do not blanket-convert.**

*Real card titles → convert to headings (11):*

| File | Lines | Content |
|---|---|---|
| `UniverseBlocks.jsx` | 464, 489, 511, 528 | `item.title`, `venue.venueName`, `item.question`, `name` |
| `WeddingExperiencePage.jsx` | 122, 175 | `place.name` |
| `WeddingRegistryPage.jsx` | 19, 64 | `fund.title`, `product.name` |
| `WeddingStayPage.jsx` | 111, 163 | `place.name`, `p.name` |
| `WeddingTransportPage.jsx` | 96 | `place.name` |

*NOT titles — genuine non-heading uses of the display face (7). Step 2's cases,
leave them:*

| File | Lines | What it actually is |
|---|---|---|
| `WeddingRSVPPage.jsx` | 204, 380, 648, 738 | the **rsvpIntro paragraph**, set in the display face for voice |
| `WeddingStayPage.jsx` | 68, 76 | check-in / check-out **dates** |
| `WeddingOurStoryPage.jsx` | 331 | a milestone **date**, 0.875rem accent |

Converting the RSVP intro paragraph to an `<h3>` would be semantically wrong
and would damage the outline rather than fix it. **That is what a blanket
conversion would have done to four of the eighteen.**

**TWO SEPARATE OUTLINE DEFECTS found in the same pass, both in scope:**
1. **`/our-story` has ZERO headings.** Its page title is not a heading at all —
   the only h1 on that route was the entrance overlay's. Needs an h1.
2. **`/polls` skips h1 → h3** ("Polls coming soon"). Needs h2, or the h3 needs
   a parent.

**Spacing:** `h1`–`h6` carry UA default margins that `<p>` does not. #551
already hit this once. The render pass for the conversion must compare
before/after spacing per element, not just tag names — eighteen (now eleven)
silent spacing shifts is what passes code review and fails on screen.

## GUEST-FONT-SCOPE — the inline font-family on guest pages does nothing

**Found 2026-08-25 while production-verifying #549. This changes the model.**

`src/index.css:45-51` locks EVERY element to the product face:

```css
*, *::before, *::after            { font-family: 'Plus Jakarta Sans', … !important; }
h1,h2,h3,h4,h5,h6,p,span,div,a,…  { font-family: 'Plus Jakarta Sans', … !important; }
```

An `!important` stylesheet rule beats an inline `style={{ fontFamily }}`. So on
a guest page **the inline declaration is inert**. The only thing that works is
the escape hatch below it:

```css
.wb-guest-root, .wb-guest-root *   { font-family: var(--wb-body-font, …) !important; }
.wb-guest-root h1…h6               { font-family: var(--wb-heading-font, …) !important; }
```

**Exactly two files set that wrapper** — `MultiPageWeddingWebsite` (the live
guest site) and `RealWebsitePreview` (the builder). Three guest routes render
OUTSIDE it and therefore show the product face no matter what they declare:

| Route | Component | Status |
|---|---|---|
| `/w/:slug/accommodation` | `GuestAccommodation` | no wrapper |
| `/w/:slug/music` | `GuestMusic` | no wrapper |
| **`/rsvp/:token`** | `RSVPPage` | **no wrapper** |

The third is the invitation itself — the surface the owner walked, and where
every F-A…F-G change landed. Embedded in the RSVP tab it inherits the wrapper
and works; on its own route it never has.

Measured on production, same pass, declared vs computed:

| Page | declared | computed |
|---|---|---|
| `/stay` (wrapped) | `Cormorant Garamond, serif` | **Cormorant Garamond** |
| `/accommodation` (unwrapped) | `Cormorant Garamond, serif` | **Plus Jakarta Sans** |

**#549 is not wrong, it is incomplete.** Loading the faces is necessary — the
wrapper cannot render a font that was never fetched — but without the wrapper
the loaded faces are never used. Both halves are required.

**COROLLARY DEFECT — SURVEYED 2026-08-25, 18 occurrences.** Inside
`.wb-guest-root`, the `*` rule forces `--wb-body-font` onto every non-heading
tag and beats the component's inline style. So a `<p>` deliberately styled with
the heading face renders in the BODY face:

| File | Occurrences |
|---|---|
| `UniverseBlocks.jsx` | 4 |
| `WeddingStayPage.jsx` | 4 |
| `WeddingRSVPPage.jsx` | 4 |
| `WeddingRegistryPage.jsx` | 2 |
| `WeddingExperiencePage.jsx` | 2 |
| `WeddingTransportPage.jsx` | 1 |
| `WeddingOurStoryPage.jsx` | 1 |

Observed live on `/stay`: `<p>Crown Towers Sydney</p>` declares Cormorant
Garamond and computes Jost. **The reference layout is itself partly not
rendering what it declares** — which matters for L-1, since the pattern about
to be written down and propagated contains four of these.

**Bug or constraint?** Not decided. Either the CSS should stop overriding a
component's explicit intent (then the `*` rule needs narrowing, which is Step
2 territory), or card titles should be `<h3>` rather than styled `<p>`s (a
component change, and arguably better markup anyway). Needs a ruling, not a
guess.

**AND IT INDICTS MY OWN GUARD.** `guest-typography-parity.mjs` checks that
files DECLARE `typography.*` rather than literals. Declarations do not reach
the screen here. The guard verified intent and called it parity — the same
"a scan is only as good as its definition" failure, one level up. The guard
needs an effect-level assertion, not only a source-level one.

**Options to weigh (report-first, do not build blind):**
1. Wrap the three standalone routes in `.wb-guest-root` and set the two CSS
   variables. Smallest, consistent with the existing mechanism, leaves the
   corollary defect in place.
2. Drop the global `*` lock and scope it to the dashboard shell instead. More
   correct — inline styles would mean what they say — but it is a global CSS
   change touching every surface in the product, and the lock exists because
   something once needed it.
3. Both, sequenced: (1) to fix guests now, (2) as a separate considered change.

## BEHIND THE OWNER'S QUEUE — do not pick these up first (advisor ruling 2026-08-25)

Four PRs in a row went to build infrastructure while a mobile defect batch
waited. These are real and none of them is blocking:

- **GUEST-COPY-SPLIT** — move `rsvpIntro`/`rsvpSent` (and the rest of
  `UNIVERSE_CONFIGS[x].copy`) out of `websiteThemes.js`. The only fix that gets
  BOTH properties: no false positives on guest-copy changes, no hole on
  structural ones. Advisor and terminal both dismissed it as unnecessary on the
  same wrong premise. Cost of not doing it: one CI round-trip per copy change.
- **Five-entry assertion extension** — the transitive reachability check now
  covers all six watched sources; extending the same treatment to the page and
  component patterns is the remaining half.
- **PRERENDER-GUARD-SCOPE option 3** — compare generated output instead of
  watching source paths. **EVIDENCE BANKED 2026-08-25, start from this rather
  than re-deriving it:** two consecutive `npm run build:prerender` runs with no
  source change between them are **byte-identical**. The output is
  deterministic, so a regenerate-and-diff guard would NOT drown in
  animation-state false positives. That was the main objection and it does not
  hold.

- **COMMITTED SNAPSHOTS ARE STALE TODAY** (small, not urgent, and **do not open
  a PR just for it** — fold into the next PR touching this area). The committed
  `prerendered/universes/index.html` differs from a fresh capture by
  `opacity: 1` → `opacity: 0` on an animated scroll cue. Since two consecutive
  captures are byte-identical, that is not run-to-run flake: **the committed
  snapshot was taken from a different code state.** Visible text is unaffected
  (5919 chars either way), so nothing is wrong on screen — but it is precisely
  the condition the freshness guard exists to prevent, sitting in the repo.

## PUBLISH-PARITY — A NAMED PROGRAMME, NOT A SWEEP

**THE DASHBOARD PROMISES MORE THAN THE SITE DELIVERS.** On a paid product that
is a trust and refund-risk issue before it is a bug list, and it is exactly the
class the owner keeps finding by walking around — which means the four below
are what one walk surfaced, not what exists.

| Control | Promise | Actual | Disposition |
|---|---|---|---|
| Policies → "Display on website" | appears in the website's Policies section **and Experience Guide** | **no such section exists anywhere** | D-1b, building now as "Good to know" |
| Experience guide → Itinerary | part of the published guide | **delivered in the guest-safe payload, discarded at the render** | D-1a, building now |
| Guest Suite → Live stream | "visible to guests" | **no guest page or route found** | **SCOPE REPORT FIRST** — may never have been built, rather than never wired |
| Website builder → fonts | the couple's chosen fonts | `fontOverride` **absent from the live Base44 schema** — dropped on write | blocked on a schema declaration (advisor) |
| Website → hero effect | parallax / zoom / static | declared, **zero readers** | known dead scaffolding (PHASE2-HERO-TIERS-PRESCOPE) |

**Verified working, for the record:** Schedule · Q&A · Registry · Polls ·
Accommodation · Transport · Music · Guest-experience "who's coming"
(server-enforced in `api/wedding-attendees.js`) · meal options.

**Fixed on the spot 2026-08-25:** `FoodBeverage.jsx` promised "guests will see a
default list (chicken, beef, fish…)", which F-B made false. A dashboard
describing behaviour the product no longer has is the same defect this
programme exists to find, and it was mine.

**Method warning for whoever extends this** — see STANDING-RULES, "A scan is
only as good as its definition of the thing it scans for". The first pass
wrongly cleared `mealOptions` (scan excluded `src/components/rsvp/`) and wrongly
condemned `showAttending` (enforced server-side, not read from the field).
Neither was findable by re-running the scan.

## STYLING-QUIZ-CHOICE (from R-1)

**OWNER RULED: keep both questionnaires. Make the toggle an EXPLICIT NAMED
CHOICE, not a switch**, showing what each one asks so a couple can see the
trade:
- **AI stylist** — gender, style, comfort, budget, notes → a generated look.
- **Quick guide** — events, style, budget → a read-only style guide.

**Do not delete either.** See STANDING-RULES, "A toggle that swaps behaviour
must name what it replaces" — this is the worked example that produced the rule.

## QUEUED, in order

**DONE 2026-08-25 — the Option A guest shell (#546, `0179667`).** Guest routes
served the prerendered marketing homepage, head and body. Fixed by writing
`dist/guest-shell.html` from the fresh index before the snapshot overwrites it,
and pointing `/w/(.*)` and `/rsvp/(.*)` at it ahead of the catch-all. Verified
on production: 2,145 bytes (was 50,846) on all three guest URL shapes, zero
marketing strings, invitation card to a crawler UA, `noindex` header on each,
tab title "John & Suzanne", **zero marketing frames** in a live browser at 390
and 1440, and all 14 marketing routes unaffected.
RULED: **`og:image` absent is correct for now** — any single image honest across
20 universes is a compromise we would discard when B lands per-wedding images.
**Do not build an interim asset**; "the card's image" folds into the B proposal.

**OPTION B — per-wedding unfurl cards. Pre-beta project, not polish.**
Commercial case, from the advisor: the card is seen by every guest of every
wedding — at 200 guests a wedding it is the most-viewed Openinvite-adjacent
surface that will ever exist, and it is free distribution. Bring a scoped
proposal AFTER the fix wave: cost, cache strategy (`s-maxage` +
`stale-while-revalidate` keyed on slug), invalidation when a couple edits,
failure behaviour when the function is down, and the card's image.
**The constraint B inherits, already enforced in code:** the meta decision keys
on `websitePasswordEnabled` **directly**, never on the gate's runtime result —
`api/wedding-by-slug.js:215` documents a fail-open, and a card keyed on gate
state leaks through it. `tests/persistence/guest-shell.mjs` fails if any
title/meta decision is ever keyed on gate state. This is why B can be
*designed* rather than retrofitted.

**INVITE-LINK-PREVIEW** — the metadata half shipped with #546; what remains is
Option B above. Robots question is CLOSED: the owner pastes into iMessage,
Apple's Rich Link fetcher advertises `facebookexternalhit`, and a card is being
produced today — so the fetch already succeeds under current robots rules and
**no robots.txt change is needed** for the primary case. Verify WhatsApp before
assuming it generalises, but do not hold the ticket on it. Original findings: Shared invite links
unfurl as technical rather than invite-forward. Must establish: served meta for
`/w/:slug` and `/rsvp/:token` as an unfurler sees it (crawler UA, not the SPA's
client-rendered head — unfurlers do not run JS); whether prerender produces
per-wedding meta or one generic snapshot; **the robots conflict** (#518 put
`Disallow: /api/ /rsvp/ /w/` on five named groups and `X-Robots-Tag
noindex,nofollow,noarchive` on `/w/`) for facebookexternalhit, Twitterbot,
Slackbot-LinkExpanding, WhatsApp, Discordbot, TelegramBot and whatever Apple
uses; the privacy consequence of allowing unfurlers, honestly, including that
`/rsvp/:token` IS a capability and the unfurl fires the moment the link is pasted
regardless of whether we answer; and the **Applebot** trade if the preview agent
is the indexing agent. **The robots answer decides whether this is a metadata
ticket or a policy ticket.** Target: preview as an invitation — couple's names,
date, hero photograph. **Never the guest's name or anything guest-specific** —
the card is fetched by a third party and can be screenshotted, so it must be
identical for every guest of that wedding. `/rsvp/:token` previews as the
wedding.

**PR 4 · change-your-reply** — show the current answer with an edit affordance
instead of jumping to done. **No data model change needed**: `RsvpResponse` is
append-only with latest-wins and `rsvp-submit` already documents that
resubmission creates new rows. `Guest.update` 403s under owner-scoped RLS —
that 403 is *why* append-only exists; do not route the change through `Guest`.

**HARNESS-FIXTURE-TRUTH** — `scripts/lib/renderHarness.mjs` seeds the
**decrypted** form of fields the product is supposed to decrypt, so every render
proved the personalisation worked by asserting it into existence. Offenders:
`rsvp-lookup` stub (`name`), `Guest` seed (`name`, `email`,
`dietary_restrictions`), `GuestMessage` seed (`guest_name`). Legitimate:
`PUBLISHED_WEDDING.slug` / `activeUniverse` — plain stored columns.
**The test: does the product TRANSFORM this on the way to the screen?** If yes,
seed the stored form and let the code do the work.

**EXPORT-OVERLAY-SILENT-FAIL** — `getMyGuestsWithRsvp` overlays
`/api/my-guests-rsvp` (which aggregates `RsvpResponse` latest-wins) over the raw
Guest rows. On failure it logs and returns raw rows — and the CSV then reports
**every guest as pending**, with nothing shown to the user. Either surface the
failure and refuse the export, or mark it unmistakably. Same family as the dead
Copy links button: a silent failure that looks like a result.

**NULL-SCRIPT-VERIFY-FIX** — `scripts/null-rsvp-plaintext.mjs`'s third VERIFY
assertion compares a **database-wide** recoverable count against
`targets.length`. It passed on the E3 run only because targets ≈ all rows, and
broke the moment the target set was 2. Correct it to "every TARGET row is still
recoverable" and add a control that fires.

**WEBKIT-PASS** — pre-beta, findings only. `GamesManager`'s copy-links was broken
in Safari and nobody reported it: the product has effectively been verified in
one engine, and the guest side skews further to Safari than the dashboard does.
Scope: guest list actions, invite sending, RSVP end to end, publish, exports,
studio copy/share controls. Classes to hunt: clipboard behind an `await`
(pinned now, but new sites can be written), programmatic downloads and
`<a download>`, `Intl`/date parsing, `100vh` under the toolbar,
`backdrop-filter`, sticky positioning, tap targets. `copylinks-webkit.mjs` is the
worked example of running both engines and reporting the difference.

**MESSAGES-GUARDS** — `src/pages/Messages.jsx:149` calls
`message.guest_name.toLowerCase()` unguarded and `:263` formats `created_date`
unguarded. One row missing either field crashes the page. Two defensive guards,
one PR.

**T2 GUESTMUSIC-CHROME** — build the approved spec (playlist = link card,
name-only requests). Closes the music-doubling finding AND the spec debt: the
playlist currently embeds twice, once on the in-site music page and again on
`/w/:slug/music`, and `WeddingMusicPage.jsx:17-19` documents the deferred
collapse in its own words. **Scope addition:** `GuestMusic.jsx` consumes NO
universe typography — it is the only guest page rendering both faces as
`Plus Jakarta Sans`, and is the owner's "single font" sighting.

**E1–E4 emoji batches** — 67 pictographic emoji in rendered code. Canon is about
**presentation**: a violation is any glyph rendering in the system emoji font,
and **U+FE0F is the tell**. Monochrome marks (✓ ✗ ▲ ▼ ▶ ★ ☆ △ ◆ ○ ↔ ↗ ♥ ❝ ✆ ✎)
are NOT violations; `✦` is an instance of the rule, not an exception.
- **E1 guest-facing**: `WeddingPollsPage:418`, `MultiPageWeddingWebsite:43`,
  `HotelRecommendations:309`, `RestaurantRecommendations:238`,
  `TransportationOptions:141`, `GuestAccommodation:111`, `GamesPage:153`.
  Owner accept.
- **E2 outbound templates** (sent in the couple's name — RULED: strip):
  `SendInvitesModal:26`, `WhatsAppCompose:25-28`,
  `api/cron/send-onboarding-emails.js:66,69`.
- **E3 marketing + Ava**: `RefundPolicy:41,45,50`, `Ava.jsx:172-173`. Hygiene
  only, NOT a redesign — the marketing direction reset stands. Report whether any
  other Ava surface carries non-`✦` glyphs.
- **E4 product chrome + structural**: the rest. `trialErrorToast.js:26` (🔓)
  specifically — it fires at the trial boundary, the moment of a payment
  decision and the home of "Your work is safe and yours". `DevReset.jsx` is
  dev-only: EXEMPT. Comment-only hits: leave.
- **STRUCTURAL, report before building**: `Polls.jsx` (13, `emoji:` as a
  catalogue data field), `AvaStudioAssets.jsx` (11, same shape),
  `InteractiveMap.jsx` (emoji passed into `createCustomIcon` as pin glyphs).
  These need a replacement MECHANISM — an icon token key, not a glyph. The
  advisor is commissioning an icon vocabulary; **do not invent one.**

**GUEST-TYPOGRAPHY-PARITY** (was T3 POLLS-TYPOGRAPHY; absorbs T2's typography
half) — **in the fix wave.** This is what the owner reported as "the font
combinations seem inconsistent, some pages have the right blend, some are just
one font". Swept 2026-08-25 across every guest-facing file; four offenders, all
the rest of the tree (20 masthead/footer/section-mark sets, twelve pages)
consumes both faces correctly:

| file | hard-coded | headingFont | bodyFont | what a guest sees |
|---|---:|---:|---:|---|
| `src/pages/GuestAccommodation.jsx` | 36 | 0 | 0 | entirely Plus Jakarta Sans — no typography plumbing AT ALL |
| `WeddingPollsPage.jsx` | 18 | 3 | 0 | universe headings, chrome body — the half-and-half |
| `WeddingWebsiteNav.jsx` | 1 | 0 | 0 | **the sneakiest** — one line, but the nav is on EVERY page, so even correct pages carry a wrong one |
| `src/pages/GuestMusic.jsx` | 1 | 0 | 0 | no universe typography at all |

`GuestAccommodation.jsx` serves `/w/:slug/accommodation` (App.jsx:189) — it has
no `resolveTypography`, no `universeConfig`, no `typography` reference of any
kind.

**THE SYSTEMIC FIX IS THE DELIVERABLE, not the four files.**
`GuestAccommodation` is NEW and shipped with no plumbing at all, which means
the next new guest page can do exactly the same and nobody will notice. Add a
probe that FAILS when any guest-facing file declares a font-face literal
instead of consuming `resolveTypography`, with an explicit allowlist for
anything genuinely exempt. The four fixes are cleanup; the guard is what makes
the defect unshippable. Same shape as the clipboard sweep's "no awaited
clipboard write remains anywhere in src".

**FONT-OVERRIDE-NOT-PUBLISHED** — also in the wave, but it explains a DIFFERENT
symptom and does not explain the owner's observation. `fontOverride` is written
by the studio (`WBRightPanel.jsx:213-215`), listed in `StudioWebsite.jsx`'s
writable fields, and read FIRST by `resolveTypography` — but it is absent from
`GUEST_SAFE_WEDDING_FIELDS`, so `wedding-by-slug` cannot return it (confirmed
against the live 44-key response). A couple who picks fonts sees them in the
builder and their guests never do. Latent today — `universeStyling.js` notes no
wedding has one set — and it bites the first couple who uses the picker.

**PREVIEW-NAV** — `?preview=true` only skips the password gate
(`weddingBySlug.js:18-19`). `WeddingWebsiteNav` builds plain `href`s with **zero**
preview references, so the first nav click drops preview mode and a couple on a
password-protected site lands in the gate. Make preview propagate through nav.
Three-buttons-one-destination is acceptable once nav holds. The 8 asset previews
ARE reachable via the Design studio (`UniverseWorldView`/`AssetGrid`) — no ticket.

**F4/F5 (motif cropping, alignment)** — blocked on the content-rich seed. The
guest-page sweep currently measures near-empty pages: `PUBLISHED_WEDDING` carries
the shell but no story blocks, photos, registry items or FAQ entries, so
`overflow=0 cropped=0` is an empty read, not a clean one.

**Item 7 · loading idioms** (feel-pass) — 76 files use `Loader2`, 59
`animate-spin`, 5 `Skeleton`, 2 `animate-pulse`. Chrome-only per the surface
line. Batch in: `"Photos coming soon!"` / `"No FAQs added yet."` exclamation
marks, and `Polls.jsx`'s 🗳️ if E4 has not taken it.

**DATE-GUARDS** — `/w/:slug/celebration` renders "Invalid Date Invalid Date".
Establish seed-shape vs genuine unguarded format first; if genuine, fold the two
`Messages.jsx` guards in — unguarded date formatting is one defect class.

**Micro list** — `CollaboratorAccept.jsx:52` zero-key crash · three
`1.5px dashed` empty-state wrappers · `UnmuteButton` zIndex 5 ·
`capetown`/`cape-town.jpg` convention hazard · `AIWeddingAssistant.jsx:254`
`shadow-sm` on a card (CLAUDE.md bans box-shadow on cards) ·
`scripts/lib/dividerSweep.mjs` has no importer — check whether superseded by the
CI-registered guards before retiring; do not delete on orphan status alone ·
`ScrollMorph` is routed but linked from nowhere (probable dead route, deletion is
its own decision) · six components orphaned by the homepage rebuild
(`HeroCollage`, `ValuePropSection`, `HorizontalScrollSection`,
`AvaSpotlightSection`, `UniverseMiniHero`, `UniverseTeaserSection`) — sweep
CANCELLED for now, they may return to service.

---

## BLOCKER — #547 MERGED BUT NOT VISIBLE ON PRODUCTION (2026-08-25)

`09d5ea8` merged under a quoted line, `pr:green` green and SHA-matched to
`3d62c46` per RULE 13e. GitHub reports a **successful Production deployment**
for `09d5ea8` at 04:15:46Z.

**The live site has not changed.** Across ~35 minutes:
- `/` (edge `MISS`, fresh) and `/w/john-suzanne` both serve
  `/assets/index-DaO3d0bM.js` — the pre-merge bundle.
- `/w/john-suzanne/accommodation` renders **86 of 86 elements in Plus Jakarta
  Sans**. #547 should give london's `Jost` for body text there.

Cannot be pushed further from here: the deployment's own URL
(`openinvite-594bsfd12-…vercel.app`) returns **302, deployment protection**, and
reaching it would mean transplanting credentials, which is not done.

**NEEDS SOMEONE WITH VERCEL DASHBOARD ACCESS** to confirm whether the
production alias actually advanced to `09d5ea8`. Until then #547 is merged but
**NOT VERIFIED LIVE**, and by the definition of done it is not done.

## GUEST-SHELL-EDGE-CACHE (found while verifying; independent of the above)

Guest routes are served from the Vercel edge cache; marketing routes are not:

| URL | x-vercel-cache | age |
|---|---|---|
| `/w/john-suzanne` | **HIT** | ~1800s |
| `/rsvp/X` | **HIT** | ~1800s |
| `/pricing` | MISS | 0 |
| `/` | MISS | 0 |

Identical `cache-control: public, max-age=0, must-revalidate` on all four, so
the difference is the **rewrite**: #546 points every guest URL at one static
`/guest-shell.html`, and the edge caches that object. **A query string does not
bust it** — `?cb=verify1` still returned HIT — because every guest URL resolves
to the same cached object.

Consequences to weigh:
1. **Guests can be served the previous build's shell after a deploy**, delaying
   fixes reaching exactly the audience #546 was built for.
2. The worse shape, not observed but the same class `apply-prerendered.mjs`'s
   header documents: a cached shell referencing an `/assets/index-*.js` that no
   longer exists boots nothing. Assets are `immutable` and Vercel retains old
   ones, so this is unlikely — but it is the mechanism, and it is worth a
   deliberate decision rather than luck.

Note the owner's iMessage cache-bust still works for *iMessage's* cache; this is
about our origin, not theirs.

## OWNER CHECKS

**#544 network-off test — CONFIRMED BY THE OWNER 2026-08-25. PASSED:** the send
aborted and nothing was mailed. #544 is verified end to end **including its
failure path**, which is the half that normally ships untested. Steps kept
below as the reusable regression procedure, not as outstanding work.

Load Guests, select **two or more** guests with emails (two so the count
reads plural), open Send invites, reach the final step, THEN turn off Wi-Fi (or
Safari → Develop → Network Link Conditioner → 100% Loss), then tap Send.
*Expected:* a red toast — "Could not reach the invitation-link service" or
"N invitation links could not be created (names…). Nothing was sent." — the
modal stays open, the button becomes usable again, and **no guest is marked
invited**. *A failure looks like:* a success toast, a silent nothing, or any
guest showing as invited. Then restore the network and send normally: the links
must be real `/rsvp/<token>` URLs, never `/rsvp/undefined`.
WhatsApp half: network off, open "Open in WhatsApp" for one guest, pick the
RSVP reminder template. Expected `{rsvp_link}` visible in the box, a red
explanation above the footer, and the green button disabled.

## WATCH FOR (free production verification)

**The two 16 Jul rows minting.** `6a58822ff96d2b9e2169cf16` and
`6a5881c9901dc3528b7534b2` are owner-scoped with `rsvp_link_id_enc` null. The
#539 backfill sweep fires on guest-list load and mints for exactly the rows
lacking a token. **Next time the owner opens their guest list, those two should
gain tokens and no others.** Report it when seen — it costs nothing and proves
the sweep.

**Owner's unfurl check on `/w/john-suzanne`** — cache-busting with a query
param, since iMessage caches per URL. Verified on production that this works:
`?cb=1` and `?utm=imessage2` both still serve the guest shell (2,145 bytes,
`og:title="You are invited"`, `X-Robots-Tag` present) — the rewrite matches on
path, so the query is preserved and harmless.
**What success looks like:** a compact card reading "You are invited" with no
image. `twitter:card` is `summary` and there is deliberately no `og:image`, so
Apple will not draw a large image card. A generic card is the CORRECT current
state, not a failure — names, date and hero photograph are Option B.

**Owner's Safari retry of Copy links** (#543). Three outcomes, all informative:
copies (fix confirmed), fallback panel opens (activation fixed, permission
separately blocked), still nothing (hypothesis wrong, tell me immediately).

---

## PARKED

`feat/homepage-rebuild` @ `5211d01` — pushed, no PR. Substance quarry only. The
MARKETING-SITE workstream is ON HOLD; the LIVE marketing site is the reference
standard and no existing marketing page is rebuilt without a fresh owner
directive. New pages (comparison, trust) match the live design language.

`6a584d473aa3ab1ec180fcdc` — the `created_by: "anonymous"` Guest row. Untouched;
evidence. Deletion needs its own line. Live-path question is ANSWERED (no
anonymous path creates Guest rows today); which historical mechanism produced it
is archaeology and deliberately not being spent on.

Post-launch: `rsvp_link_id` / `plus_one_rsvp_link_id` undeclare batch (writer
stopped in #540, data purged, column undeclare last — see DECISION-LOG).
HttpOnly cookie for the RSVP token — only pays if the seven `resolveGuestByToken`
endpoints read it server-side; a non-HttpOnly cookie buys nothing over
localStorage. Do not half-build it.

---

## WAVE 2 / DELETION SCOPE — two routes render the same accommodation data

**A subtraction question, not a navigation one. One of them should stop existing.**

| | route | component | reads |
|---|---|---|---|
| subLinks `accommodation` | `/w/:slug/accommodation` | `GuestAccommodation` | `guestSuiteAccommodation`, `accommodation` |
| WEDDING_PAGES `stay` | in `MultiPageWeddingWebsite` | `WeddingStayPage` | `guestSuiteAccommodation`, `accommodation` |

Same fields, same content, two routes, and **both labelled "Stay"** — which is
how it reached a guest as two doors to the same room.

`GuestAccommodation` is registered as its own route OUTSIDE
`MultiPageWeddingWebsite`, so the two do not share the shell, the nav
highlighting, or the page transitions.

**Survivable in the meantime:** the nav dedupe (#598) means a guest is shown
only one of them. That is a workaround for this, and the guard for it says so
explicitly — see STANDING-RULES.md, "A guard should say why it still exists".

**The question for Wave 2:** which one is the real accommodation page, and what
does the other one's route do once it is gone (redirect, or 404 through the
existing not-found path)?

---

## CLOSED (#599) — logged at its real size: every optional page was readable

The ticket was "does publish on the guest guide do anything". The finding was
not about the guide.

`MultiPageWeddingWebsite` computed `enabledPages` and never consulted it.
**Every page a couple had switched off was fully readable by anyone with the
URL** — the toggle governed the navigation and nothing else. A couple who
turned a page off believed it was gone.

Same class as the unpublished draft, and it affected **every optional page in
the product**, not one. Closed by making reachability and the nav the same
computation.

---

# WAVE 2 — THE DELETION LIST (owner's words, recorded verbatim)

Written down on receipt so it cannot be lost again. The terminal asked for this
list because it had never been stated in-session; that must not need asking twice.

1. **PHOTOS** — "get rid of the photos feature completely."
2. **LIVE STREAM** — "live stream is not connected to anything and does not
   work, so need [removing]." Also closes the publish-parity finding: it
   promises "visible to guests" with no guest page.
3. **COPY COLLECT LINK** — "remove the whole copy collect link feature."
4. **GUEST GUIDE CATEGORIES** — "get rid of categories in guest guide."
5. **COPY LAYOUT** — "remove the copy layout from button and feature."
6. **ALL ASSET MACHINERY** — "remove all the asset stuff as we are not doing
   this feature anymore." The left panel's Assets and Design sections are
   replaced by ONE pill reading "Change universe" that navigates there.
7. **THE "PREVIEW YOUR SITE" CARD** — removed, the two surviving cards widened
   into rectangles. Owner: Guest suite, my universe and preview site "all have
   the same hierarchy and gets confusing."
8. **THE SECOND ACCOMMODATION ROUTE** — see the Wave 2 entry above.

## Standing constraints for this wave
- Deletions merge ONE AT A TIME, each on its own quoted line.
- **DELETING CODE IS NOT DELETING DATA.** Report them separately; orphaned rows
  survive a code deletion and need their own decision.
- **THE TWO NON-OWNER RECORDS ARE NEVER TOUCHED** — `jay-ella`
  (gowdeman@hotmail.com) and `florida-john` (floridasogialofa2@gmail.com) — in
  this or any sweep.
- **DO NOT PROPOSE SCHEMA CHANGES.** Name the orphaned entities and fields; the
  schema is the advisor's boundary.
- Flag anything that consumes **Cloudinary** — the media-cost report is queued
  behind this wave because these deletions may change the numbers.

---

# OWNER RULING — THE PHYSICAL UNIVERSE ASSETS ARE BEING RETIRED ENTIRELY

**Recorded, not scheduled.** Owner's words: *"we are removing all the physical
assets for the universe as it is not worth it."*

That is the **printed and shareable suite** — save the date, menu, place cards,
welcome sign, thank you card, seating chart, Instagram kit, motion graphic. Not
a tidy-up of the editor: **the artifacts themselves stop being something
Openinvite offers.**

Wave 2 item 7 removed the *tool* that made and edited them. This ruling retires
*the things*.

## 1. Reading A stands, but its premise is now temporary

The eight preview components were retained in #607 because they double as the
universe's showcase in `UniverseWorldView`'s Nº 05 chapter — rendered at
`/studio/universe` **and in onboarding**.

**Once the suite is retired, previewing artifacts a couple can never receive is
exactly the defect named in STANDING-RULES.md's headline** — the interface
reporting a state the system does not have, on the first screen of the product.

> **DO NOT REMOVE THE SHOWCASE UNTIL SOMETHING ELSE SHOWS THE UNIVERSE.**

The universe chooser must show a couple what a world looks like. Once the
printed suite is gone the honest answer is almost certainly **their website in
that universe** — the thing they actually receive.

That is a **build with a design question inside it**, not a deletion, which is
why it cannot fold into Wave 2.

## 2. The marketing site sells this suite

Owner-flagged. Every claim about printed and shareable assets becomes false the
day the suite goes. By the sold-anywhere rule that is a **correctness problem on
a page people read before paying** — and removing a claim for a retired feature
needs no owner accept.

**Remember the prerender: editing marketing source is half a change.** The
served HTML is the other half (`npm run build:prerender`, committed in the same
PR).

## WE HAVE NO PRODUCTION USE DATA — every retirement argument is judgement

**Found 2026-08-30 while verifying the wedding-party summary chip, and recorded
here because it changes how this whole programme has to be argued.**

Across all 19 `WeddingDetails` records, the maximum number of wedding-party
members in any role group is **zero**. Not one record has a single bridesmaid,
groomsman, reader or usher.

**The honest reading, and it is not the tempting one.** This is NOT evidence the
feature is unwanted. The sample is the owner's own test accounts plus a friend's
— people poking at the product, not planning a wedding with it. Nineteen records
of that kind can tell you nothing about what real couples would use.

What it IS evidence of:

> **We have no production use data for almost anything.**

So every "is this feature worth keeping" question in this programme has to be
settled on **judgement — what the product is for, what it promises, what it
costs to carry** — and never on "nobody uses it", because we cannot know that.
An argument in this programme that leans on usage is leaning on nothing.

If usage evidence is ever wanted, it has to be built (instrumentation, a real
cohort) before it can be cited, and that is its own project.

### Method note, applies beyond this programme

The chip was **verified by render, not by content** — a 12-name roster rendered
through the real component — precisely because no record had content to verify
against. Say it that way every time: naming which of the two you did is the
difference between a checked claim and an assumed one.

## 3. This needs its own scope report

Not a line in Wave 2. It touches:

- the universe studio and `UniverseWorldView`'s Nº 05 chapter
- **onboarding**, through the same component
- the marketing site and pricing copy
- whatever still generates or exports these artifacts
- **what replaces Chapter 6** — the open design question

Its own item, its own report, **after Wave 2 closes.**

---

## CLOSED (#621, #622) — the render gap, and the claim it does NOT support

**8 of 90 dashboard pages loadable in a test -> 89 of 90.** One line in
`src/lib/app-params.js` was the cause of all 82 failures.

### CORRECTION, made the same hour: LOADABLE is not CONTENT-TESTABLE

"89 of 90 render-testable" **overstates what was measured.** The instrument
requires each page module and reports whether it loads. It does not check that
the page renders anything.

Demonstrated immediately on `WeddingParty.jsx`: it loads fine and renders **413
bytes — a spinner**. `loading` starts true and the roster arrives from a
`useEffect`, which server rendering never runs. So the page is *loadable* and
its populated state is *not reachable* by this harness.

> **The instrument measures loads. "Render-testable" was the cheaper question
> answered and the dearer one reported** — the same substitution as
> build-for-render and grep-for-load, now committed by me against an instrument
> I had built an hour earlier, while writing the rule about it.

**What the harness genuinely supports:** any component rendered directly with
props (`ThemeSection` was verified this way — six sections, collapsed, summary
chips, compact sizing, no local `Pill`), and any page whose initial paint does
not depend on fetched data.

**What it does not:** a page's data-populated state. That needs the data layer
stubbed, which is a further piece of work.

### THE CAPABILITY, IN THREE TIERS — so the correction does not bury what is new

| Tier | Status |
|---|---|
| **A component rendered directly with props** | **WORKS TODAY.** `ThemeSection` verified 8/8: six sections, collapsed on load, summary chips reading back `cultureOther` and the composed interfaith pair, compact sizing at the three nested sites, no local `Pill`. A real assertion about real markup, not a load check. |
| **A page whose first paint needs no fetched data** | Works. |
| **A page's data-populated state** | **Not available** — see the parked fix below. |

**The middle tier is what most UI work here actually needs.** The accordion
adoptions, the pill consolidation, the modals — all component-level, all
verifiable now in a way they were not this morning.

So state it precisely, neither overclaiming nor underselling: **"verified by
build, not by render" stops being acceptable for COMPONENT work, and remains
honest for PAGE-DATA work.**

### PARKED, with the fix written down — content testing

Counting how many of the 89 draw real content versus a loading shell needs the
data layer reachable. Attempted and abandoned on a **two-React-copies** problem:
the esbuild bundle carries its own React while the runner `require`s another,
producing "Invalid hook call".

**Known fix, one line:** mark `react` and `react-dom` **external** in the bundle
so both share one instance.

Parked deliberately rather than attempted tired — three attempts deep twice in
one day, stopped correctly both times. A known fix for a known problem is worth
more than a fourth attempt at midnight.

### `WeddingParty` did NOT fail — read this before hunting a defect

The page returned a spinner under a load check because it fetches in a
`useEffect` and nothing ran the effect. **My assertions about its first paint
were wrong; the page is fine.** Recorded explicitly so that nobody reading
"WeddingParty failed" in six weeks goes looking for a bug that does not exist.

The twelve-name summary chip remains verified at **component** level (tier 1):
all twelve names, each its own chip, wrapping, no truncation.

### Residue, kept by name

```
1 page(s)  src/pagePreload.js — import_meta.glob is not a function
```

Vite-only compile-time API, no Node equivalent. Harness limitation on one page,
not product code. One named, understood residue beats 90/90 bought with a hack.

## TICKET — THE ORIGINAL SIZING, superseded (kept for the method, not the number)

**Owner wants this before the strictness ladder.** It was found as one PR's
caveat and is in fact a property of the whole surface.

### The count

| Scope | Cannot be render-tested | Can |
|---|---|---|
| **Dashboard PAGES** (the substantive surfaces) | **57 of 90 — 63%** | 33 |
| All dashboard components | 142 of 263 — 54% | 121 |

So: not "almost none", but **the majority**, and every page that matters.

### It is NOT structural. There are exactly two causes, both cheap.

1. **`react-hot-toast`** — touches the DOM at module load; **76 files import it
   directly**. Needs no product change at all: a test-time alias to a stub
   (`--alias:react-hot-toast=<stub>`) bypasses it. Confirmed working.
2. **`src/lib/utils.js`** — **our own code, one line**:
   ```js
   export const isIframe = window.self !== window.top;
   ```
   Evaluated at import. That file also exports `cn()`, which nearly every
   component imports, so this single line taints most of the tree. Fix is a
   guard or making it lazy.

**Method note on the count itself:** the first measurement looked only for
`react-hot-toast` and reported 56% of pages. Aliasing that away revealed the
second cause immediately, and the number moved to 63%. **The first figure was a
lower bound produced by an instrument that only knew one answer** — the same
shape as everything else on this list, found in my own analysis this time. If a
third blocker exists, this number is still a lower bound.

### Why it matters beyond convenience

"Verified by build, not by render" was written as one PR's limitation
(`ThemeSection`, #620). It is the default state for 63% of dashboard pages.
Every claim about what a dashboard page *displays* currently rests on a preview
click or on reasoning, not on a test — while the guest surfaces, which have no
such blocker, were render-verified today without difficulty.

---

## TICKET — WHAT ACTUALLY LOOKS AT WHAT (owner ruling 2026-08-30)

**This supersedes and absorbs the rendered-surface question below. It is not
"fix the US-English guard" — it is one pass over EVERY check, guard, hook and
script, in CI and locally, answering three questions each:**

0. **DOES IT STILL HAVE A SUBJECT?** *(added 2026-08-31)*
1. **What is its input?**
2. **What does it do when that input is missing or empty?**
3. **What does it print when it finds nothing?**

**Report the table before changing anything.** The owner wants the shape of the
whole set before any individual one is patched.

The three known points on the spectrum, which is why the sweep is scoped this way:

| Case | Instrument | State |
|---|---|---|
| **Extreme** | emoji / no-emoji rule | **No instrument at all.** Enforced by review. 🏨 and ⭐ lived on a live guest surface for that page's entire life. |
| **Middle** | `test-us-english-spelling.mjs` | **An instrument that can blind itself.** Scans only ADDED lines in a resolved diff range; exits 0 when no base resolves. Three `colour` uses reached main through it. |
| **Control** | the same guard, working | **Six catches**, including one on 2026-08-30. It works when it can see. |

### A GUARD WHOSE SUBJECT HAS BEEN REMOVED STILL PASSES

**Found 2026-08-31, deleting `assetExport.js`.** `tests/persistence/asset-system.mjs`
asserted that every editable asset type had an export spec — checking against a
mirror of `ASSET_EDITOR_MAP` from `AssetEditors.jsx`, **a file deleted a week
earlier in #607**. The guard had been passing green against a map that no longer
existed.

> **This is the emptiest form of the day's shape:** not an instrument that cannot
> see, but one with **nothing left to look at**, still reporting success.

Hence question 0 above. For every guard in the sweep, ask whether the thing it
guards still exists — a green check on a deleted subject is worse than no check,
because it occupies the slot where a real one would be noticed missing.

The governing rule is now canon: **a guard that cannot find its input must fail,
not pass.** This is the merge gate's SKIPPED-is-not-PASS bug in another
instrument — the shape was fixed once and never swept for.

### FOUND BY THE VISIBILITY PR, WITHIN MINUTES — the canon guard does not run in CI

**2026-08-30, #616.** The moment every guard started printing what it looked at,
the CI log said this under the "Canon on a branch" step:

```
canon guard: on HEAD, where canon belongs — 0 file(s) checked
```

`check-canon-branch.mjs` exits 0 immediately when the branch name is `main` or
`HEAD`. **CI checks out a detached HEAD**, so `git rev-parse --abbrev-ref HEAD`
returns literally `HEAD`, and the guard returns before it looks at a single
file. Its whole `--ci` mode — the `Canon-On-Branch:` trailer override, written
and tested — is unreachable.

**The script's own docstring claims the opposite**, and names this exact
scenario as the reason CI matters:

> "An edit made through the GitHub UI on a branch — a pre-push hook is local,
>  which is why this also runs in CI."

It does not run in CI. Canon has been destroyed twice; the local hook is the
only thing that has ever guarded it, and the backstop everyone believed existed
does not. The early exit is correct in intent (canon on main is fine) but tests
the wrong thing: it needs the branch under review, not the checkout's HEAD name
— in CI that is `GITHUB_HEAD_REF`.

**This is the argument for the visibility PR in one line.** Nothing was broken
by that change; it made an existing hole legible, and the hole had been there
since the guard was written. Cost: four print statements.

### The original question, still in scope as part of the sweep

## Do our content rules check rendered surfaces, or only source?

**SHARPENED 2026-08-30 — the framing above understates it. It is not that the
guard misses rendered surfaces. THERE IS NO GUARD.**

Went looking for the emoji check in order to run it against a new use of `✓`.
The only match for "emoji" anywhere in `tests/` is fixture data in
`wedding-details.mjs`. Emoji and sentence-case in product chrome are enforced by
**review alone**.

The contrast is the whole argument, and it is measurable:

| Rule | Automated guard | Times it has caught us |
|---|---|---|
| US English | yes | **five** |
| Emoji | none | **never** |
| Sentence case (chrome) | partial — `sentence-case-chrome.mjs` | — |

US English has caught five violations because something was looking. Emoji has
caught none — not because none occurred, but because nothing was looking: 🏨 and
⭐ rendered on a live guest surface for that page's **entire life**, against a
standing rule, and were found by rendering the page rather than by any check.

So this ticket has two halves, and the second is the bigger one:

1. do the content rules check rendered surfaces, or only source, and
2. **for emoji, is anything checking at all** — in either place.

Build the guard before the next sweep. A sweep finds today's violations once; a
guard finds every future one. Scope note: the guard must sort on **presentation**
(U+FE0F is the tell), never on a Unicode block, and must encode the ARTWORK
exemption the same way `sentence-case-chrome.mjs` already does.

**Raised by the accommodation retirement.** The page rendered 🏨 (U+1F3E8) and
⭐ (U+2B50) on a live guest surface for its whole life. Every emoji sweep this
project has run searched the SOURCE and never saw it; rendering the page did.

**Question for the next emoji batch, and for the content-rule family generally:**
does anything assert against the RENDERED output of a guest surface, or only
against the files?

Rules in this family: no emoji · sentence case in chrome · no ALL CAPS outside
artwork · US English · no exclamation marks in chrome.

A source-only check misses anything that reaches the screen without being
spelled out in the file — a value from data, a library's own markup, a glyph in
a component nobody thought to sweep. The render harness already visits guest
routes, so the mechanism exists.

---

## RECOVERED — two unowned stash entries are now branches

The stack is **empty**, so `git stash pop` fails loudly instead of silently
taking a stranger's work. It had detonated twice in Wave 2, both times in frozen
payments files.

- **`wip/multi-currency-pricing-stash-recovered`** — `7169eab`, base `0797e39`
  (2026-07-16). 12 files, 838 insertions. Payments-adjacent: `planPricing.js`,
  `create-checkout-session.js`, `geo-currency.js`, `currencyPricing.js`,
  `Pricing.jsx`, `PlanSelection.jsx`, `stripe-webhook.mjs`.
- **`wip/onboarding-guest-count-stash-recovered`** — `0442822`, base `67cdc98`
  (2026-06-03). 2 files, 45 insertions.

**Neither has been reviewed, run or verified.** They are preserved as found, and
both are the owner's work to keep or discard.
