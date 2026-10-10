# The mobile pass (owner rulings 2026-10-10; lane B, after site fixes batch 2)

Lane B. Runs under the goal autonomy protocol in WORKFLOW.md. Starts only after goals/2026-10-10-site-fixes-batch-2.md is closed.

The archived mobile app shell lives on origin as mobile/app-shell at e488030c (108 commits, 2026-09-20 to 2026-09-23, branched from main at c7bad8b4). It is a separate React app under src/mobile on the shared data layer, with Capacitor iOS and Android projects. Main has moved 103 commits since, and the shell predates statusWrite.js, household.js, money.js and dashboardDate.js. This goal brings it onto current main and then to parity with the web product.

## Shape

1. Fresh branch b/mobile-pass from current main. The old branch is not rebased and its commits are not cherry-picked; its history stays readable on origin/mobile/app-shell.
2. One import commit bringing, from e488030c: src/mobile/, ios/, android/, capacitor.config.ts, assets/ and the MOBILE_* docs. The mobile-screenshots/ PNGs are not imported.
3. The five shared edits re-applied by hand against current main, not copied: src/App.jsx (the /m routes, /m/preview, /m/welcome, /m/login, and the redirect from / and /DailyUpdate to /m inside the native shell), index.html (viewport-fit=cover), package.json (the Capacitor dependencies and the mobile:* scripts), .gitignore (the Capacitor build output), and the two scripts (scripts/mobile-preview-screenshots.mjs, scripts/test-guest-counts.mjs).
4. The lockfile change is committed in the import commit as a named exception to the lane rule against committing package-lock.json: dependency additions only, and the PR body prints exactly what it adds.
5. The pbxproj edit (DEVELOPMENT_TEAM = CA3SF9YYSG in the Debug and Release build settings) is the local signing team and stays uncommitted.

## Parity PRs, one theme each, in this order

1. Send invites by email only. The shell still offers WhatsApp through wa.me, which bypasses the server's stop-emails check (#951); the web has been email only since #924. First, because of that bypass.
2. The guest suite's Site screen prints no address and offers no share or copy, as the web share tab (#923).
3. Money through src/lib/money.js: the shell's own formatter goes, and the hardcoded dollar signs (the cash fund goal line, the registry stat, the six screens that default the symbol to $) take the account currency.
4. Households and children: household_id, is_child and child_age in the guest counts and the guest detail, matching the web's "guests across invitations, adults, children".
5. Status writes through statusWrite.js, so a status the couple records becomes per-event answers (#897), and Maybe as the couple's own answer with its own tally, counted as replied (#936).
6. Dashboard dates numeric in the account's format through dashboardDate.js (#917, #941). Guest-facing written dates (the invitation email's date) stay written.
7. Guest suite vocabulary: "Website builder" and "the website builder" in the Site screen and the Plan hub become guest suite wording.
8. Opted-out guests shown in the shell's guest list, as the web shows them (#951).

## Stop conditions

As CLAUDE.md. Any held-list or do-not-touch file: stop and report before editing. No simulator or device run without the owner. No store submission.

## Close

Last line: "Closed <date> at main <full SHA>, PRs <list>".
