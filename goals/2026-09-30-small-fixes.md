# Small fixes: overflow, logo, contrast

> **CLOSED 2026-10-01.** All three items shipped, with the guards that were
> waiting to mean what they say now meaning it.
>
> | PR | merged | what it was |
> | --- | --- | --- |
> | [#881](https://github.com/Lajay06/openinvite/pull/881) | `08dca2ae` | Seating and Photography stop scrolling the page sideways at 390; the overflow guard loses both exceptions and gains a content pass |
> | [#882](https://github.com/Lajay06/openinvite/pull/882) | `2dd2a1e3` | One logo component on both grounds, with a pixel-scanning guard |
> | [#883](https://github.com/Lajay06/openinvite/pull/883) | `aa0c60bb` | The quote attribution clears 4.5:1, and the contrast guard now fails |
> | [#884](https://github.com/Lajay06/openinvite/pull/884) | `0d21cefd` | A green shard keeps its timings, so the rebalance became possible |
> | [#885](https://github.com/Lajay06/openinvite/pull/885) | `3ab64c0c` | The rebalance itself, read from those timings |
> | [#877](https://github.com/Lajay06/openinvite/pull/877) | `f9c0ca1e` | Before the goal opened: the tour's footage follows its chapter |
> | docs | `ff29c76b` | DECISION-LOG addendum under R38, and the overflow backlog line |
>
> **Measured, before and after.**
>
> | | before | after |
> | --- | --- | --- |
> | seating at 390 | page +103px, canvas 0px wide | page +0px, canvas 324 x 900, first on the page |
> | photography at 390 | page +8px | page +0px |
> | logo offset, header vs footer | 0.281 against 0.177 | 0.281 against 0.257, tolerance 0.05 |
> | guest text under 4.5:1 | 2 elements at 2.27:1 | 0 |
> | shard balance | A 970s, B 1071s, 101s apart | A 915s, B 919s, 4s apart |
>
> **What the work found that nobody was looking for.** The first seating fix
> contained the page and left the canvas rendering zero pixels wide, which only
> a measurement caught. PublicNav had three logo sites, not one, and the one
> serving the home page was neither of the two first converted. The logo
> component could not live in components/shared/ because the design-system
> sweep bars letter-spacing there. And the shard file's instruction to
> rebalance from a green run was unusable until #884, because GitHub truncates
> the log of a long job.
>
> **Carried forward.**
>
> 1. **746px of page chrome sits above the seating canvas at 390.** The canvas
>    is reachable without horizontal dragging now and is the first thing in its
>    frame, but the page header, stat cards and event tabs push it to the
>    bottom of a phone's first screen. Reworking that is a page redesign, not
>    an overflow fix.
> 2. **A marketing change ships its regenerated prerendered/ snapshots in the
>    same commit.** #882 touched PublicNav and PublicFooter and needed all
>    fourteen regenerated; the freshness guard is what catches it, and it
>    catches it only after the fact. The rule is in WORKFLOW.md and worth
>    knowing before starting, not after.

Three product items that fell out of the studio tour and CI split goals. Each is small, each has a guard already waiting to mean what it says.

## 1. Two dashboard pages scroll sideways on a phone

Seating overflows the viewport by 103px at 390 and Photography by 8px. test:dashboard-no-overflow currently excepts both. Find the element that is wider than the viewport on each (print its selector and measured width), fix the layout so nothing exceeds 390, then delete both exceptions from the guard so it fails on any overflow anywhere. Print before and after widths. Do not hide the overflow with overflow-x: hidden; fix the width. If Seating's canvas needs to scroll inside its own frame, the frame stays inside the viewport and scrolls within.

## 2. Header and footer logos are different lockups

On the marketing site the header wordmark sits lower against the mark than the footer wordmark does. Find both sources (asset, or mark plus text) and print what each is. Replace with one shared logo component used in both places, sized by a prop. Guard: header and footer render the same lockup (same asset or same component) at 1440 and 390, and the mark-to-wordmark vertical offset is identical in both. No new artwork; if the two assets differ, keep the one the brand doc names, and say which.

## 3. Guest site text under the contrast floor

test:guest-font-effect reports 2 text elements below 4.5:1 on /w/ routes and passes anyway. Print the two elements, their colors, their backgrounds and the measured ratio. Fix them to 4.5:1 or better without changing the universe's palette tokens; adjust the element, not the theme. Then make the guard fail on any element under the floor. If a fix would need a palette token to change, stop and report the token and the ratio; that is my call.

## Guards

Item 1: test:dashboard-no-overflow with no exceptions. Item 2: a new logo-lockup guard at both widths. Item 3: guest-font-effect failing on contrast. All three run in the shards; update browser-shards.json for the new guard and rebalance while there (A 963s vs B 1071s today), keeping the 120s budget.

## Mobile impact

Item 1 is web dashboard only. Item 2 is marketing only. Item 3 is the guest site, shared by URL with the mobile shell's web views; record in the PR that the shell inherits the fix.

## Not in this goal

Any other overflow found while looking. Any palette token change. Marketing copy.
