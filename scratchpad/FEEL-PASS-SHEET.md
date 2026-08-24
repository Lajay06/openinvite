# Feel-pass sheet

The seven feel-pass items, what shipped, what remains, and the rulings that
govern them.

**Why this file exists.** The sheet lived only in conversation. That is how the
build terminal came to report item 3 as "already shipped as #504" when #504 was
items 2 and 4, and item 3 had never been touched. A ledger that exists only in a
transcript is not a ledger. Anything that governs future work goes here.

---

## Status

| # | Item | Status | PR |
|---|---|---|---|
| 1 | Hairlines and dividers 0.08 → 0.12, borders only | shipped | #502 |
| 1b | Unify dividers to 0.12 on both ramps + divider-aware sweep probe | shipped | #503 |
| 2 | Empty-state icons → `textDisabled` | shipped | #504 |
| 3 | Informational text off the Tailwind grey ramp → `textMuted` | shipped | #534 |
| 3b | Complete the grey ramp: `gray-900`/`800` → house `#0A0A0A` | authorized, next | — |
| 4 | `gray-300` split by role | shipped | #504 |
| 5 | CountUp → instant | remaining | — |
| 6 | Uppercase → sentence case (**product chrome only**) | remaining, ruled | — |
| 7 | Loading idioms unified | remaining | — |

---

## Rulings

### The chrome / artwork line (governs items 6 and 7)

**The sentence-case rule applies to PRODUCT CHROME ONLY.** Guest-facing artwork
is the couple's chosen design and is **permanently exempt**:

- `src/components/guest-website/**` — per-universe mastheads, footers, section marks
- `src/components/universe-studio/**` — asset previews
- `src/components/website-builder/**` — invitation and asset previews

Printed-card content like "ACCEPTS WITH PLEASURE" or "DECLINES WITH REGRETS" is
artwork, not UI drift. Converting it would damage the product.

Measured at the time of the ruling: 99 `text-transform: uppercase` declarations,
of which **80 are artwork (leave)** and **19 are chrome (convert)**; plus ~32
literal ALL-CAPS JSX strings, of which **13 are artwork** and **~19 are chrome**
(`ULTRA FEATURE`, `AVA WANTS TO`, `SUBJECT LINE`, `MESSAGE BODY`, `BANNER IMAGE`,
`RECOMMENDED`, `SENDING TO`, `WHAT HAPPENS NEXT`, `REGISTRY LINKS`,
`INVITATION NOT FOUND`, and the nine universe names in `Help.jsx`).

`pages/ScrollMorph.jsx` is a routed but unlinked dead page and is excluded.

The exclusion list is encoded once, as `ARTWORK` in
`tests/persistence/muted-text-tokens.mjs`. If the line ever moves, that is the
single place to change it. CLAUDE.md's rule wording was amended to say "product
chrome" so the rule and the codebase stop disagreeing.

### Held classes are reported, never absorbed

Items are scoped as written. When a pass finds an adjacent class, it is reported
for a ruling rather than folded in. This is how the divider exemption (#503) and
the grey ramp (3b) were handled.

---

## Standards that came out of this workstream

- **A positive control validates the instrument, not the conclusion's coverage.**
  An instrument structurally blind to a species proves nothing about that
  species. (#503, `scripts/lib/dividerSweep.mjs`.)
- **Verify the planted edit is present before trusting a control's silence.**
  A BSD `sed '0,/re/s//.../'` construct silently failed to apply during #534, so
  two controls reported zero failures on genuinely broken trees. The probe was
  fine; the control was broken.
- **Empty read is not a clean read.** Verifying #534 on production, every search
  for `rgba(10,10,10,.6)` came back empty and read as "the classes never
  compiled". Tailwind minifies it to the 8-digit hex `#0a0a0a99`. A zero on the
  side that must be non-zero means a broken instrument, not a clean result.
- **Heights are measured, never asserted.** (#532.)

---

## Text roles (src/styles/tokens.js)

| Role | Value | Use |
|---|---|---|
| `textMuted` | `rgba(10,10,10,0.6)` | informational text the user must read (AA, ~5.25:1) |
| `textPlaceholder` | `rgba(10,10,10,0.58)` | input placeholders and hints (~4.89:1) |
| `textDisabled` | `rgba(10,10,10,0.3)` | disabled controls, purely decorative text |
| `iconMuted` | `rgba(10,10,10,0.45)` | enabled icon-only controls (1.4.11, 3:1) |

Never `#888`, `gray-400`, or `gray-500`. In compiled CSS, `textMuted` appears as
`#0a0a0a99`, not as an `rgba()` string.

---

## Accessibility note (feel-pass 5)

`CountUp` never had a `prefers-reduced-motion` branch. It animated every stat
on every dashboard page for 1200ms regardless of what the visitor had asked the
OS for. Deleting the animation closed that gap — **the fix was removal, not an
added branch.** Worth remembering when the next decorative animation is
proposed: the accessible version of an animation nobody needs is no animation.
