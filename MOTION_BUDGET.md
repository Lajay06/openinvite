# Motion budget

**Written from what ships, not from what was intended.** Every number below was
read out of the code on 2026-09-04. Read this before any UI change that moves
something.

## The guest site

| what | duration | easing | where |
|---|---|---|---|
| **Page transition** | **0.24s – 0.34s**, per universe | per type | `MultiPageWeddingWebsite.getTransitionVariants` |
| **Section reveal** | `motion.duration`, **0.4s – 0.95s** per universe, default 0.7s | `motion.ease`, default `easeOut` | `SectionReveal` |
| **Entrance moment** | 0.35s – 1.3s by name-motion, plus a cue held **1800ms** | per motion | `EntranceMoment` |
| Entrance hold ceiling | **`MAX_HOLD_MS = 4000`** | — | `entranceConfig.js` |

**Six page-transition types**, all with a direction where one applies: `push`,
`lift`, `iris`, `unfold`, `dissolve`, `fade`. Twenty universes, twenty distinct
`(type, direction, duration)` combinations, twelve distinct mechanisms.

**Six name motions** for the entrance: `rise`, `dissolve`, `unfold`, `snap`,
`drift`, `stillness`.

**FIVE UNIVERSES OF TWENTY HAVE A BESPOKE ENTRANCE** — london, marrakech,
brooklyn, bali, kyoto. The other fifteen fall back to
`DEFAULT_ENTRANCE_CONFIG`. That is the largest known gap in the motion system
and it is a content gap, not a code one.

### Magnitudes, and why they are what they are

Page-transition displacement is calibrated against a measured loudness scale —
the fraction of the viewport not showing settled content at peak:

    unfold                  0.84 – 0.92
    push (horizontal)       0.20 – 0.25
    push (vertical), lift   0.14 – 0.17
    iris                    0.21
    dissolve                0.12
    fade                    0.00   (aspen, havana — deliberate stillness)

**Vertical is deliberately quieter than horizontal.** A large vertical page
movement reads as a scroll jump on a surface guests scroll constantly.

**Every variant sits at `opacity: 0` when displacement is greatest**, so only
about a third of declared travel happens while the page is visible. A 28px push
is a 9px push. Any new magnitude must be reasoned about on that basis, not on
the declared number.

## Scroll behaviour

`isMotionEnabled(weddingDetails)` returns `scrollAnimation !== 'none'`. **Only
`'none'` is distinguishable** — `'subtle'` and `'dramatic'` produce identical
output today.

## The dashboard

No page transitions. Reveal and countdown animations are local to components.
`CountUp` animates stat values.

## WHERE MOTION IS FORBIDDEN

- **Forms.** Nothing animates while someone is typing, choosing or submitting.
  A control that moves under a cursor is a control that gets mis-tapped.
- **Tables and lists of data.** Rows do not fade, slide or stagger in. A guest
  list is read, not experienced.
- **Anything behind a confirmation.** A destructive action's dialog appears; it
  does not perform.
- **Progress.** There are no progress bars on the dashboard and none may be
  added — state is "next", never "done", and never a percentage.
- **`prefers-reduced-motion`.** Every guest-site variant returns a NEUTRAL
  variant, not a zero-duration one. A zero duration still RUNS the transform,
  so `x: 28` became an instant sideways jump — movement, delivered faster. The
  correct answer to "I do not want motion" is no motion.

## The rule that catches the rest

**A DIFFERENCE BELOW THE THRESHOLD OF PERCEPTION IS NOT A DIFFERENCE.** Before
adding motion, state what it should look like and measure whether it does.
`tests/motion/capture.mjs` reports two numbers: distinct signatures, which
saturates and cannot fail, and **distinct mechanisms**, which can. Grade by the
second.
