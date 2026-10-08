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

## Close

Last line: "Closed <date> at main <full SHA>, PRs <list>".
