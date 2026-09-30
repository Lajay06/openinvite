# Small fixes: overflow, logo, contrast

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
