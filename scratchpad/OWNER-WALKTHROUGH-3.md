# Owner walk-through #3 — the findings list

## PROVENANCE. READ THIS BEFORE USING ANY LINE BELOW.

**This list was never written down when it was made.** It came from the owner's
walk-through of the product in chat, delivered in batches, and was compressed
into the advisor's ledger as four waves. It is reconstructed here on
**2026-08-30** from that ledger.

That makes every line below **the advisor's reconstruction, not the owner's
words**. Specifically:

- **The count is uncertain.** The advisor believed the original was ~34 items
  and could identify ~29. Counting the reconstruction as discrete lines gives
  **27**. So somewhere between **five and seven items are lost** — either never
  recorded as belonging to this list, or closed in passing and forgotten.
- **The wording is paraphrase.** Where a line matters, check it against the
  product, never against this file.
- **Items may be wrong as well as missing.** A reconstruction can invent as
  easily as it can drop.

**This is the third record that lived only in chat**, after the Wave 3 accordion
spec and the Wave 2 deletion list — both of which were also written into the
repo only after they had gone missing once. The pattern is now established:
**a record that lives only in conversation is a record that will be
reconstructed later, at a loss.** Write it down when it is made.

**Anything the owner's own audit turns up that is not below is a RECOVERED item,
not a new one.** Add it and mark it recovered — the gap between his findings and
this reconstruction is the measurement of what the compression cost.

---

## WAVE 1 — closed

1. **Song statuses no tab can display.** Statuses existed that no tab surfaced.
2. **Schedule sorted by time-of-day, ignoring the date** — in two identical files.
3. **Four nav pages doubled.** Nav built from two lists with no dedupe.
4. **The guide's Publish gates the nav link only**, not the page.

## WAVE 2 — closed, deletions

5. **Photos** — removed.
6. **Live stream** — removed.
7. **Copy collect link** — removed.
8. **Guest-guide categories** — removed.
9. **Copy-layout** — removed.
10. **All asset machinery** — Assets and Design replaced by one "Change universe" pill.
11. **The "Preview your site" card** — removed.

## WAVE 3

12. **The accordion pattern, product-wide.** Absorbs three tickets as adoptions
    rather than fixes: **wedding party**, **theme options**, **FAQ**.
    *(Counting note: this is one line that contains three sub-items. If the
    original counted them separately, that is +2 toward the missing count.)*
13. **No wide letter-spacing.**
14. **"Openinvite" is one word, lowercase i.**
    **LIVE COUNTEREXAMPLE, 2026-08-31 — the owner has seen "OpenInvite" in the
    running product.** So this item is either never done, done partially, or
    regressed. The verification pass determines which, and **records how it
    established it**, because this is exactly the shape the owner is worried
    about: an item on a list, plausibly believed done, contradicted by his own
    eyes. The pass justifying itself before it started.
15. **Currency symbols and thousands separators.**
16. **Table numbers centred.**
17. **Marketplace controls at narrow widths.**
18. **Send-invitation modal above the Ava button.**
19. **One investigation covering three symptoms that smell like one cause:**
    venue-assets typography, invisible panel titles, universe button contrast.
    *(Counting note: one line, three symptoms. Another +2 if counted separately.)*

## WAVE 4

20. **Our Story gets page-level editing.**
21. **Design Studio moves to the top of Guest Suite.**
22. **The add-section "+" always visible.**
23. **"Make this my universe" on the universe hero.**
24. **One preview, with its device switcher.**

## OWN TICKETS

25. **The styling quiz** — B1-2. Samoan recorded, suits recommended.
26. **The vows lock** — B1-15. Held for the owner.
27. **The plus-one row** — B3-1. "Beef" rendering in the CONTACT column.

## ADDED AFTER THE ORIGINAL WALK-THROUGH (2026-08-31)

Recorded when made, which is the whole lesson of this file. Numbered on from
the reconstruction; not part of the ~34.

28. **The gifting page's "Prefer to arrange this with a real person? Email us."
    comes off the bottom of that page.** Owner's words: *"Email us should never
    be an option."*

    **THE PRINCIPLE, AND ITS BOUNDARY — the sentence is broader than the
    instruction and must not be over-applied.**

    - **The directive is specific:** remove that line, from that page.
    - **The principle behind it:** *buying should not offer a human as an
      alternative to the product.* A self-serve purchase that suggests emailing
      someone instead is confessing the flow does not work.
    - **It is NOT "remove every contact email".** The owner's own launch list
      has `support@` and `CONTACT_TO_ADDRESS` as gating items. **Support AFTER a
      purchase is a different thing from an escape hatch DURING one.**

    **Sweep is a report first.** When this item is built, report every other
    place the same pattern appears — a human offered as an alternative inside a
    purchase or signup flow — and bring that list before removing anything
    beyond the gifting page.

    **Scope note:** the gifting page is marketing-adjacent. This is a fresh
    owner directive and therefore authorized, but **narrowly: one line.** It is
    not a licence to touch anything else on that page, and the standing
    no-marketing-edits reset otherwise holds.

29. **Casing sweep: "Openinvite", one word, lowercase i, everywhere.**
    This is the enforcement half of #14 — #14 is the rule, this is the sweep
    across the product that makes it true. Kept separate because the owner
    raised it again after seeing it wrong live, and because a rule and a sweep
    have different completion tests.

---

## Counting reconciliation, stated rather than smoothed over

| Source | Count |
|---|---|
| Owner's original walk-through | **~34** (advisor's recollection) |
| Advisor could identify | **~29** |
| Discrete lines in this reconstruction | **27** |
| Sub-items inside #12 and #19 | **+4** if counted separately (→ 31) |

**The honest statement is: 27 discrete lines, up to 31 if the two composite
items are split, against an original believed to be 34.** Three to seven items
are unaccounted for. That gap is not a rounding error to be waved away — it is
the cost of the compression, and it is why the owner's audit is finding things.

---

## VERIFICATION PASS — 2026-08-31, checked against source and running guards

**Prediction, stated before the run** (so the result cannot be massaged after):
VERIFIED ~12 · UNVERIFIED ~3 · NOT STARTED ~12 · SUPERSEDED ~2.

**Actual: VERIFIED 12 · PARTIAL 2 · UNVERIFIED 9 · NOT STARTED 6 · SUPERSEDED 0.**

### The miss is the finding, and it is about the verdict scheme itself

- **VERIFIED landed exactly** (12 predicted, 12 found).
- **NOT STARTED was half** what I predicted — more had been built than expected.
- **UNVERIFIED was three times** what I predicted. Most are *visual* claims —
  centring, spacing, stacking order — which source cannot settle and the load
  harness cannot reach. **This is the render gap deciding a third of the pass.**
- **SUPERSEDED: none.** I predicted 2 and found 0.
- **PARTIAL: 2, a bucket the four-verdict scheme does not have.**

> **The scheme's gap is the important result.** Forced to choose from four,
> item #14 — the one with the owner's live counterexample — would have been
> filed FIXED BUT UNVERIFIED. That is wrong in the direction that hides the
> owner's own sighting. **A verdict scheme with no PARTIAL bucket rounds
> incomplete work up to done.**

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | Song statuses no tab can display | **VERIFIED** | `test:song-status-coverage` — "every writable status is reachable by a tab", "no tab offers a status the schema cannot produce" |
| 2 | Schedule sorted by time, ignoring date | **VERIFIED** | `test:schedule-order` — "31 December sorts above 1 January", plus two timezone controls |
| 3 | Nav pages doubled, no dedupe | **VERIFIED** | `test:nav-no-duplicates` — and it asserts the overlap **still exists** on 4 labels, so the dedupe is proven load-bearing rather than vacuous |
| 4 | Guide Publish gates the nav link only | **VERIFIED** | `test:page-gate` — "availability is decided before the page component is chosen", "page and nav gate on the same 5 inputs" |
| 5 | Photos | **VERIFIED** | no page file, no route, no nav entry. `photosContent.gallery` in `WBRightPanel` is the couple's own website gallery — a different surface |
| 6 | Live stream | **VERIFIED (code)** | zero feature references; residue only in `entityFields.generated.js` → schema orphan pass |
| 7 | Copy collect link | **VERIFIED** | zero references |
| 8 | Guest-guide categories | **VERIFIED** | zero references |
| 9 | Copy-layout | **VERIFIED** | zero references |
| 10 | Asset machinery → one "Change universe" pill | **PARTIAL** | pill exists (`WBLeftPanel:274,288`); `VenueAssetLibrary.jsx` + `Seating.jsx` still reference `VenueAsset` — **hands to the asset-retirement scope report** |
| 11 | "Preview your site" card | **VERIFIED** | only surviving mention is a comment documenting the removal: *"TWO CARDS, NOT THREE"* |
| 12 | Accordion pattern, product-wide | **VERIFIED** | built 2026-08-30; `ThemeSection` render-verified 8/8; wedding party, theme options, FAQ all merged |
| 13 | No wide letter-spacing | **NOT STARTED** | **160** occurrences of `letterSpacing >= 0.1em` in `src/` |
| 14 | "Openinvite" one word, lowercase i | **PARTIAL** | **162 correct vs 28 wrong** across 25 lines. **20 user-visible**, concentrated in legal pages (`TermsOfService` 9, `PrivacyPolicy` 7) and **`PublicFooter`, on every marketing page**. The sweep hit the app and skipped the legal set and the footer — which is exactly where the owner saw it |
| 15 | Currency symbols + thousands separators | **UNVERIFIED** | `useCurrency`, `formatCurrency`, `symbol`, `toLocaleString` all present — a visual claim source cannot settle |
| 16 | Table numbers centred | **UNVERIFIED** | `Seating.jsx:912` has `textAlign:'center', minWidth:36` — needs a look |
| 17 | Marketplace controls at narrow widths | **UNVERIFIED** | `flexWrap:'wrap'` on both control rows — needs a narrow viewport |
| 18 | Send-invitation modal above the Ava button | **UNVERIFIED** | no z-index in either file; stacking order needs a look |
| 19 | One investigation: venue-assets typography, invisible panel titles, universe button contrast | **NOT STARTED** | no investigation exists |
| 20 | Our Story page-level editing | **NOT STARTED** | zero edit affordances in `OurStory.jsx` |
| 21 | Design Studio to top of Guest Suite | **UNVERIFIED** | no "Design Studio" string in the sidebar; may be named differently |
| 22 | Add-section "+" always visible | **UNVERIFIED** | no hover-opacity pattern found; needs a look |
| 23 | "Make this my universe" on the universe hero | **VERIFIED** | `UniverseWorldView.jsx:632`, with an `isCurrent` branch |
| 24 | One preview, with device switcher | **UNVERIFIED** | `FullScreenPreview.jsx` exists; that it is the ONLY preview is unconfirmed |
| 25 | Styling quiz (B1-2) | **UNVERIFIED** | |
| 26 | Vows lock (B1-15) | **NOT STARTED** | held for the owner |
| 27 | Plus-one row (B3-1) — "Beef" in CONTACT column | **UNVERIFIED** | `GuestList.jsx:300` documents a *different* plus-one fix (9 of 40 rendering no status); the column-misplacement is unconfirmed |
| 28 | Gifting page "Email us" | **NOT STARTED** | new item |
| 29 | Casing sweep | **NOT STARTED** | the enforcement half of #14 |

### Two facts kept visually distinct, as ruled

**NOT STARTED (6)** — nobody built it. **UNVERIFIED (9)** — we cannot currently
see it. These must not average into one number: six are work, nine are a
**tooling** limit, and most of the nine are visual claims blocked by the render
gap. That gap is now deciding a third of a verification pass, which is the
strongest argument yet for the universe verification approach.

---

## Original note, retained

**None of the above is verified by this file.** Several are marked "closed" from
the ledger, and a status column is exactly the instrument this project has spent
a day learning not to trust. The verification pass runs against **source or the
running product**, never against this file's own claims.

Verdicts, when that pass runs: FIXED AND VERIFIED (with how) · FIXED BUT
UNVERIFIED (marked done, never confirmed) · NOT STARTED · SUPERSEDED (the
surface changed underneath it).
