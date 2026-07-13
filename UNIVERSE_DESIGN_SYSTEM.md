# Universe design system

*Codifies the per-universe "world" pattern proven by Marrakech (PR #87), so the remaining 9 universes get built to one standard instead of nine one-off efforts. This is a spec to build against, not a description of finished work — only Marrakech is fully realised as of this writing.*

---

## 0. Current state — how this worked before Marrakech

Before PR #87, there was no per-universe **layout** concept. Every universe rendered through the exact same shared centered-stack JSX in each guest-site page component (`WeddingHomePage.jsx`, `WeddingOurStoryPage.jsx`, `WeddingCelebrationPage.jsx`, `WeddingRSVPPage.jsx`, etc.) — only the *styling values* varied per universe (colour, typography, texture, motion calibration, page-transition type), via `theme`/`typography`/`universeConfig` resolved once in `MultiPageWeddingWebsite.jsx` and passed down unchanged. There was no branch point for *structure* — a universe could look different (different colours, different font, a different scroll-reveal duration) but every wedding's home page was built from the identical DOM shape. That's why 10 "distinct worlds" read, in practice, as one layout with a palette swap.

PR #87 added the first structural branch point: `universeConfig.layout`, checked inside each page component, to swap in an alternate composition instead of just re-skinning the same markup. Section 1 below documents that mechanism precisely.

---

## 1. Layout architecture — how a universe gets its own structure

### The key

`UNIVERSE_CONFIGS` entries in `src/lib/websiteThemes.js` may declare an optional `layout` string, e.g.:

```js
marrakech: {
  // ...typography, colors, texture, motion, pageTransition...
  layout: 'editorial-masthead',
  copy: { /* see §1.4 */ },
}
```

When `layout` is **absent** (every universe except Marrakech today), a page component's default behaviour is unchanged: the original shared centered-stack markup. `layout` is resolved the same way as every other per-universe value — through `resolveUniverseConfig(weddingDetails)` (`src/lib/websiteThemes.js`) — no new resolver function was needed.

### The opt-in point

Each real, guest-facing page component checks the key directly and branches:

```js
const isEditorial = universeConfig?.layout === 'editorial-masthead';

if (isEditorial) {
  return ( /* dedicated composition */ );
}

return ( /* the original shared stack, byte-for-byte */ );
```

This lives in the page component itself (`WeddingHomePage.jsx`, `WeddingOurStoryPage.jsx`, `WeddingCelebrationPage.jsx`, `WeddingRSVPPage.jsx` today), not in `MultiPageWeddingWebsite.jsx` — the router still resolves one `PageComponent` per page slug exactly as before; it has no idea layouts exist. This keeps the blast radius of a new layout contained to the pages that choose to branch, and guarantees the other 9 universes' render path is provably untouched (verified for Marrakech by diffing every edited file's `else` branch against its pre-PR-87 markup).

### The primitives folder

`src/components/guest-website/layouts/` holds the reusable building blocks a layout composes from:

| File | Purpose |
|---|---|
| `EditorialMasthead.jsx` | Kicker line + woven-pattern rule + oversized couple names, asymmetric two-line break with an italic accent |
| `EditorialGridFooter.jsx` | Structured N-column grid (date / venue / RSVP-style CTA), zellige rules between columns, collapses to stacked + horizontal rules under 720px |
| `EditorialSectionKicker.jsx` | The small "Nº — label" + rule, reused to open a section body |
| `ZelligeDivider.jsx` | The pattern generator itself (§2) |

Every one of these takes `theme`/`typography`/`copy` (or specific strings) as **props**, not hardcoded Marrakech values — `EditorialMasthead` doesn't know it's being used for Marrakech. That's what makes this a shared architecture rather than a Marrakech-only component: a second universe that wants the same editorial idiom can set `layout: 'editorial-masthead'` and pass its own theme/typography/copy into the exact same components today, with zero code changes to the primitives.

### How the *next* universe plugs in

1. Pick (or invent) a `layout` id for the `UNIVERSE_CONFIGS` entry (§2 gives each of the 9 remaining universes a proposed idiom — most are NOT `editorial-masthead`, they're new idioms).
2. If the idiom is close enough to reuse existing primitives (e.g. another universe that also wants an oversized-name masthead), reuse `EditorialMasthead`/`EditorialGridFooter`/`EditorialSectionKicker` directly with that universe's own theme/typography/copy — no new files.
3. If the idiom is structurally different (a two-column colour-block layout, an asymmetric negative-space grid, a field-journal tab layout — see §4), author new primitives in the same `layouts/` folder, named for what they do (`ColorBlockSplit.jsx`, `NegativeSpaceGrid.jsx`, etc.), not for which universe uses them.
4. Add the `isEditorial`-style branch (rename the local variable to describe the idiom, e.g. `isColorBlockSplit`) to each of the 4 real page components, with the non-matching branch left completely untouched.
5. Never fork a page component per universe. The number of page components stays fixed at "however many guest-site pages exist," not "pages × universes."

---

## 2. The six levers — what makes a universe a distinct "world"

Colour and font alone were never going to feel like different *worlds* — a universe needs all six of these authored together, or it reads as a palette swap. Marrakech is the worked example; every lever links to where it lives in code.

| # | Lever | What it governs | Marrakech (worked example) |
|---|---|---|---|
| 1 | **Layout idiom** | The section-level structure — `universeConfig.layout`, resolved per page component (§1) | `editorial-masthead`: Nº/kicker + oversized asymmetric-broken serif names + structured grid footer |
| 2 | **Signature pattern/motif** | A generated (not photographed) geometric texture woven into rules/dividers/borders at low contrast | `ZelligeDivider.jsx` — interlocking-star SVG data URI, tinted to the theme's own colour, 0.35–0.4 opacity |
| 3 | **Type pairing with real presence** | `universeConfig.typography.{headingFont,bodyFont}` | Amiri (serif, real presence, Arabic-inspired) + Nunito Sans (restrained sans), oversized with local italic accents |
| 4 | **Muted/expensive palette** | `universeConfig.colors` | Muted terracotta accent `#B5654A` (was a saturated maroon `#8B2635`), deep espresso ground `#241811`, warmed brass secondary `#B8945F` |
| 5 | **Motion personality** | `universeConfig.motion` (duration/yOffset/ease) — same `SectionReveal` fade-up mechanism every universe uses, only calibration differs | `duration: 0.85, yOffset: 22` — slower and further-travelled than the ~0.7/16-20 baseline most universes sit at: "considered, warm" |
| 6 | **Copy voice** | `universeConfig.copy` (optional; §1.4-style fallback pattern) | `rsvpCta: 'Reveal my invitation'`, `rsvpIntro`/`rsvpSent` reworded, per-page `Nº —` kickers |

### 1.4 — the copy-voice mechanism, precisely

`copy` is an optional object on a `UNIVERSE_CONFIGS` entry. Every consumer resolves it with a fallback equal to the pre-existing hardcoded string, e.g. (`WeddingRSVPPage.jsx`):

```js
const copy = universeConfig?.copy || {};
// ...
{copy.rsvpCta || 'Send me my RSVP link'}
```

This is the same "declare it in the config, resolve it at the call site with a safe default" pattern texture/motion/typography already use — so a universe with no `copy` key (everyone except Marrakech today) is byte-for-byte textually unaffected. **Known gap, not yet solved**: the more evocative accept/decline copy ("Joyfully accepts" / "Regretfully declines") lives in the separate token-based RSVP submission form (`src/components/rsvp/RSVPPage.jsx`), which has no `copy`-key plumbing yet. Extending the same pattern there is a clean, low-risk follow-up, not a redesign.

---

## 3. The quality bar — "expensive, not themepark"

Every universe must clear this bar before it ships. This is the actual review checklist, not a vibe:

- **Restraint over illustration.** No literal icons/emoji/clipart standing in for a place ("🕌 Marrakech," a palm tree PNG for Bali). If a place needs representing, it's colour, type, and a generated geometric motif — never a picture-book cliché of the destination.
- **Confident type, never timid mid-sizes.** Headings are either genuinely oversized (`clamp()` reaching toward 5–7rem on desktop) or precisely small (an 11px letter-spaced label) — nothing in the "looks like a slightly bigger paragraph" zone. Marrakech's masthead names run up to `6.5rem`; its kickers sit at `12px`/`0.22em` tracking. Nothing in between.
- **Pattern is woven, not printed.** A signature motif renders at low opacity (Marrakech: 0.35–0.4) on rules/borders/dividers — if it's loud enough to read as a decorative banner rather than a texture, it's too strong. It should survive being described as "you'd only notice it if you looked."
- **Palette is muted, not saturated.** Every accent should read as a real material (terracotta, brass, aged brass, weathered stone, ink) rather than a bright "brand" hue. If an existing accent reads as vivid/playful (see §4's flagged colours below), it needs desaturating/deepening before it ships, the same correction Marrakech's accent went through (`#8B2635` saturated maroon → `#B5654A` muted terracotta).
- **Motion is a personality, not a toggle.** Every universe uses the same `SectionReveal` fade-up mechanism (per the existing "no per-universe forked CSS" rule) — the personality comes entirely from calibrating `duration`/`yOffset`, never from adding new animation types per universe.
- **Copy sounds like the world, not like a template with find-and-replace.** A one-line RSVP CTA change ("Reveal my invitation" vs. the generic "Send me my RSVP link") should feel like it could only belong to that universe.

---

## 4. Per-universe spec table — first-draft direction for the remaining 9

Proposed starting points, not final designs — each needs the same live-preview calibration pass Marrakech's palette/motion went through (`fix/universe-cleanup`'s "verify live before merge" precedent) before shipping. Existing `typography`/`colors`/`motion`/`texture` values (`websiteThemes.js`, `UNIVERSE_CONFIGS`) are the baseline; **flagged** entries need refinement toward the muted/expensive bar, not just adoption as-is.

| Universe | Layout idiom (new) | Signature motif (new, generated) | Type pairing (current → direction) | Palette direction | Motion personality (current calibration) | Copy voice (example) |
|---|---|---|---|---|---|---|
| **Aman** | *Letterpress card* — centred composition inside a thin double-hairline frame, evoking fine stationery; smallest, quietest kicker of all 10 | Fine cross-hatch linen-weave, barely visible — extends the existing `grain` texture logic into a rule/border motif | Cormorant Garamond / Jost — already has real presence, keep as-is | `#0A0A0A` / `#F8F7F5` / **`#C4956A`** gold — already muted, keep as-is | `0.75s`/`18px` — gentle, unhurried, already correct | *"Respectfully, yes"* / *"With gratitude, not this time"* |
| **Tulum** | *Coastal ledger* — single wide column, generous line-height, oversized left margin like a sun-bleached journal page | Radiating sun-ray line motif (thin concentric arcs), used on section rules | Fraunces / Karla — already real-presence serif, keep | `#3D2B1F` / `#F5ECD7` / `#D4845A` — accent reads warm but reasonably muted already; consider deepening slightly toward a true terracotta if it reads too orange live | `0.7s`/`16px` — unhurried baseline, fits | *"Yes, we'll be there"* / *"Sun's out without us this time"* |
| **Kyoto** | *Ma grid* — deliberate asymmetric negative space, right-aligned small type blocks against large empty fields, evoking a shoji-screen grid | Fine **asanoha** (hemp-leaf) or **seigaiha** (wave-scale) geometric lattice — genuine Japanese pattern families, well-suited to a real woven motif | Shippori Mincho / Zen Kaku Gothic New — already restrained and precise, keep | `#1A1A1A` / `#F5F2ED` / `#6B6B5A` moss-stone — already muted, keep | `0.6s`/`12px` — quietest, most precise of all 10, fits | *"Accept, with gratitude"* / *"Regretfully, we must decline"* |
| **Capri** | *Sail card* — bold two-panel split (colour-block blue + white), diagonal accent rule, boutique-hotel-card feel | Fine scalloped wave/shell arc, repeating along dividers | Italiana / Poppins — keep, already bright/crisp-fitting | **`#E8C547`** lemon-yellow accent reads vivid/playful rather than muted-expensive — **flagged**: consider a deeper muted ochre/brass instead, keeping `#1B3A6B` Capri-blue and `#FEFBF3` as-is | `0.65s`/`16px` — fits breezy-but-composed | *"Delighted to join you"* / *"Wish we could sail over"* |
| **Brooklyn** | *Manifest sheet* — asymmetric zine/gig-poster grid, thick left-aligned rule, oversized stacked name blocks | Fine dotted rivet-grid or brick-coursing hairline pattern | Bebas Neue / IBM Plex Sans — keep, already distinct industrial voice | `#1C1C1C` / `#F5F5F5` / `#B85C38` rust — already muted, keep | `0.5s`/`14px` — quickest/most direct of all 10, fits "gritty, unfussy" | *"I'm in"* / *"Can't make it"* |
| **Bali** | *Canopy layout* — layered, full-bleed panels with floating text blocks, generous vertical rhythm evoking jungle canopy | Interlocking-circle **kawung**-inspired batik motif, or a palm-frond weave | Prata / Mulish — keep, real presence | `#2D5A27` jungle green / `#FAF7EF` / `#F5E6CC` — accent and accentSecondary are currently identical; **flagged**: differentiate with a second, deeper gold so accent hierarchy reads clearly | `0.8s`/`18px` — lush, languid, fits | *"With open arms, yes"* / *"Our hearts are there, we aren't"* |
| **Paris** | *Atelier plate* — fine rule-framed content blocks like a couture lookbook page, elegant asymmetric margins | Fine quilted-diamond or trellis motif, very restrained | Playfair Display / Lato — keep, classic romance fits | `#1A1A2E` / `#FAF7F2` / `#C9A96E` gold — accent and accentSecondary currently identical; **flagged**: a deep wine/burgundy secondary would read more "French romance" than a second gold | `0.75s`/`17px` — tender, lingering, fits | *"Avec plaisir"* / *"With regret, not this time"* |
| **Cape Town** | *Field journal* — tab-indexed sections, ledger-style rules, topographic-feeling margins | Woven raffia/basket cross-hatch, or a fine topographic contour-line motif | Bitter / Josefin Sans — keep, earthy-adventurous fits | `#5C3D2E` / `#F5EEE3` / `#C4A882` khaki — accent/accentSecondary identical again; **flagged**: a deeper safari-green or burnt-sienna secondary would sharpen the palette | `0.6s`/`15px` — snappier, "adventurous," fits | *"Wouldn't miss the adventure"* / *"Missing this one, wish we were there"* |
| **Mykonos** | *Whitewash terrace* — bold colour-block architecture (deep blue block + white block), evoking Cycladic terraces | Cycladic lattice/grille motif — the iconic blue-and-white geometric window-grille pattern, genuinely distinctive and on-theme | Cinzel / Montserrat — keep | `#1B4F8A` / `#F5FAFF` / **accent currently `#1B4F8A`, same as darkBg** — **flagged, most urgent fix in this table**: an accent identical to the dark background hue risks accent-on-dark-bg elements (buttons, links) being nearly invisible; needs a genuinely distinct accent — a warm brass or terracotta would read as an intentional "sun on whitewash" contrast against the Aegean blue | `0.65s`/`14px` — crisp, coastal, fits | *"Yes — see you on the island"* / *"Wish we were island-bound with you"* |

### Reading this table

- **Layout idiom** and **signature motif** are net-new proposals — nothing here exists in code yet; each needs its own `layouts/` primitive (or reuse of an existing one where two universes converge on a similar idiom) before a universe can set its `layout` key.
- **Type pairing**, **palette**, and **motion** columns mostly say "keep" — these were already calibrated correctly in earlier work (the `fix/universe-cleanup` texture/motion-collision fixes). The **flagged** entries (Capri's accent, Bali/Paris/Cape Town's undifferentiated accent-secondary, Mykonos's accent-equals-background) are the real palette work remaining, independent of the new layout/motif/copy levers.
- **Copy voice** examples are a starting tone, not final strings — same caveat as Marrakech's own copy: verify live, adjust for how the wedding's actual RSVP flow reads end-to-end before treating any of these as final.
