# Phase 2 pre-scope — hero tiers 1 and 2 (still, Ken Burns)

Report only. No code. 2026-08-19. The two tiers NOT gated on mood-loop
licensing.

---

## The headline: the dial already exists in the schema and drives nothing

`WeddingDetails.heroEffect` is declared live — `enum: [parallax, zoomout,
static]`, `default: static` — and `websiteThemes.js` exports a matching
`HERO_EFFECT_OPTIONS` list with names and descriptions written for a UI.

**Nothing reads either.** Repo-wide:

| Reference | What it does |
|---|---|
| `websiteThemes.js:408` `HERO_EFFECT_OPTIONS` | defined, **zero consumers** |
| `StudioWebsite.jsx:194` | sets `heroEffect: 'static'` as a default |
| `entityFields.generated.js` | my generated field map, not a reader |
| `src/components/guest-website/**` | **no file reads `heroEffect` at all** |

So a couple can have `heroEffect: 'parallax'` stored and every guest sees a
static hero. This is the `Note.status` shape again — a declared field with a
plausible option list and no wiring — except here nothing writes it either, so
no data has been lost. It is dead scaffolding rather than a silent bug, and the
distinction is worth stating: **tiers 1 and 2 are not "add a field", they are
"wire the field that is already there"**.

Verify before building: nothing in `api/` writes it either. The field's presence
should not be read as partial implementation.

## What the hero actually is today

Two separate things, and the tier work touches both:

1. **`EntranceMoment.jsx`** — the arrival animation. Reads
   `weddingDetails.coverPhoto`, preloads it, and gates entry on the image
   settling (`mustWaitForPhoto`). This is where a still-vs-motion decision
   physically lands.
2. **`{Universe}Masthead.jsx` × 20** — per-universe typographic hero treatments
   (Kyoto's asymmetric ensō column, Editorial's diagonal break, Minimal's
   centred set, and so on). These render **names and marks, not photography**.
   They receive `coupleNames, kicker, theme, typography, textColor` — **no
   photo, no motion props**.

The masthead layer is therefore not where the dial goes. The dial belongs to the
photographic layer beneath it. Any tier work that tries to route motion through
the mastheads will fight 20 files for no gain.

## The existing motion gate, which tiers must respect

`isMotionEnabled(weddingDetails)` → `scrollAnimation !== 'none'`, with
`scrollAnimation` an enum of `none | subtle | dramatic` (default `subtle`).
`SectionReveal` already honours it, and `UniverseWorldView` additionally honours
`prefersReducedMotion`.

**Two dials already exist and are not reconciled.** `scrollAnimation` (live,
consumed) and `heroEffect` (declared, dead). Before adding tiers, the
relationship has to be decided: is the hero tier independent of scroll
animation, or a facet of one expressiveness setting? Shipping tier 2 without
answering that gives couples two controls that can contradict each other —
"dramatic scroll, static hero" is coherent; "no motion, Ken Burns hero" is not,
and nothing currently prevents it.

**Recommendation:** `scrollAnimation: 'none'` must hard-override the hero tier
to still, and `prefersReducedMotion` must too. That is a correctness rule, not a
preference — a couple who turned motion off, or a guest whose OS says reduce
motion, should not get a moving hero.

## Tier 1 — still

Almost entirely already true, since nothing moves today. The work is **making
"still" a choice rather than an accident**:

- Read `heroEffect === 'static'` explicitly rather than relying on the absence of
  an implementation.
- The hero photo gets a defined still treatment: focal-point handling, and a
  decision about whether the crop is fixed or responsive at 390.
- `coverPhoto` currently has no focal-point data. A still hero crops hardest on
  narrow screens, so this is where faces get cut. **Likely a schema addition**
  (`coverPhotoFocal: {x, y}`) — flagged as advisor territory, not pack work.

## Tier 2 — Ken Burns

- Slow scale/translate on the hero photo, CSS-driven, no scroll coupling (that
  is parallax, tier 3).
- Must respect both gates above.
- Needs the same focal-point data as tier 1, more urgently: a Ken Burns move
  that drifts off a face is worse than a static crop that includes it.
- Per-universe distinctness is the open design question — see below.

## Per-universe distinctness inventory

**20 universes, each with a bespoke masthead**, plus bespoke footers and section
marks: amalfi, aspen, bali, brooklyn, capetown, capri, edinburgh, editorial,
florence, havana, kyoto, london, minimal, monaco, mykonos, paris, sedona, seoul,
shanghai, taj.

The mastheads are genuinely distinct at the *typographic* level. What does not
exist is any per-universe **photographic** character — no universe declares a
crop bias, a motion direction, a duration, or an easing.

So tier 2 has a design fork that pre-scoping should surface rather than settle:

- **One Ken Burns for everyone** — cheap, consistent, and makes 20 carefully
  differentiated universes share one photographic gesture.
- **Per-universe motion signature** — Kyoto drifting slowly upward into its
  negative space reads differently from Havana pushing in on a sunburst. This is
  where the expressiveness dial earns its name, and it is 20 design decisions,
  not one engineering decision.

**This is the question to put to La**, and it is the one that determines whether
tier 2 is a small PR or a design project.

## Scope note

`heroEffect` is a `WeddingDetails` field and the hero renders on the guest
website. Under the autonomous pack's rails this is **guest-facing** and
therefore out of merge scope entirely — correctly so, which is why this is a
pre-scope and not a build.
