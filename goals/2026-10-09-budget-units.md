# Budget units (owner decision 2026-10-09; lane A)

Lane A. Runs under the goal autonomy protocol in WORKFLOW.md.

Owner decision, verbatim intent: "They select the currency and everything on their dash is in that currency."

Every money figure a couple types is in the account's currency. Store it as typed, show it as typed, with thousands separators and the account's currency symbol. No exchange-rate conversion anywhere on the dashboard. Stored numbers do not change, so there is no migration.

This closes the units question left open by item 10 of goals/2026-10-08-site-fixes-batch-1.md, which was ruled to a text-input variant precisely so the planner did not have to answer it.

Legal pages: no.

## Territory

src/pages, src/components, src/lib, and the api/ files that render money into an email or an Ava answer. No schema changes: the currency setting already exists and nothing stored moves.

## Browser rules

One lane with a dev server or browser at a time. No local CI shards unless the harness or a fixture changed. Sub-agents: at most two, one driving a browser.

## Items

1. Scout first, and report before changing anything. List every formatCurrency caller and every hardcoded "$" in src/ and api/: vendors, expenses, budget cards, planner, gifts and cash funds, Ava tallies, emails. Read it with Node, not with grep counts. Say which callers convert and which already display as typed.

2. Remove the conversion from formatCurrency's dashboard callers, so it formats only: symbol, separators, the account's currency. Keep the constraint note in src/lib/amountText.js accurate to whatever is true after the change.

3. Fix the hardcoded "$" in BudgetChart, BudgetList, BudgetForecasting, and anything else item 1 finds.

4. Guard. A non-USD fixture, AUD and one other such as EUR, shows the identical figure in the top cards, the planner, vendors and Ava's tally, with the right symbol. Prove it red on a planted conversion before trusting it.

5. If any guest-facing page shows money, a cash fund or a registry, it uses the same rule. Report what you find, and stop and ask if a guest-facing change turns out to be bigger than display formatting.

## Stop conditions

Stop and ask if the currency setting itself is missing or stored somewhere unexpected, or if any caller depends on conversion for something other than display.

Any held-list file: stop and report before editing. List every changed file against the held list in each PR body.

## What else does this touch

The Budget page, the Vendors page and every money figure on the dashboard. Emails and Ava answers that quote a figure. Nothing stored, and no schema.

## Guards

Each item adds or extends one guard that fails on main before the change and passes after. Item 4 is the goal's main guard.

## State

Written on the item 5 branch so the plan survives a context compaction. It reaches
main with item 5's held PR, not before.

Branch: feat/budget-units-guest-registry, local commit c4908dcd23c849af7f398821ea5b74131046e885.

Items 2, 3 and 4 are PR #932 (head 759c30805356755fb4d0c41638eb80881eee607f, base main).
Item 5 imports src/lib/money.js, which only exists in #932, so item 5 cannot build until
#932 lands. That is why it is committed locally and unpushed rather than stacked: a PR based
on another PR's branch is closed, not retargeted, when the parent squash-merges.

Plan, in order, once #932 is on main:
1. Merge main into feat/budget-units-guest-registry. A merge, not a rebase, and the PR's
   base must be main.
2. Re-run the build and both diff guards locally.
3. Push and open the PR as HELD, for the owner's line. It touches
   api/_lib/guestSafeWedding.js, which is on the held list.
4. Print the five-marks block and list every changed file against the held list in the body.

Files in item 5: api/_lib/guestSafeWedding.js (resolveOwnerCurrency, one new guest-safe
field), api/wedding-by-slug.js (resolve it alongside the existing Promise.all) and
src/components/guest-website/pages/WeddingRegistryPage.jsx (format the cash fund and
wishlist figures with the shared helper).

## Lessons

A hand-written check must be planted against with a replacer function, never a string
replacement: String.prototype.replace reads "$$" as an escape for one "$", so a plant meant
to insert a hardcoded dollar sign inserts a plain interpolation instead, and the guard goes
green having tested nothing. The first hardcoded-dollar check in this goal was also written
as a list of the shapes its author had thought of, and it missed three real ones. Rewritten
to work by elimination, it found all three immediately.

## Close

Last line: "Closed <date> at main <full SHA>, PRs <list>".

The lessons section above is held for this close commit, on the owner's instruction, rather
than pushed as a separate docs commit.
