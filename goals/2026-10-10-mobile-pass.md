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

## Lane D (from 2026-10-11)

Lane D took this goal over from lane B after parity PRs 1 and 2 (#962, #966). Territory: ios/, android/, capacitor.config.*, src/mobile/, and components that exist only for the shell. Lane D never edits src/pages, src/components, src/lib or api/.

Order from the advisor, 2026-10-11: item 10 (the Package.swift pin), then parity 5, 3, 4, 8, 6, 7, one PR each, each with a guard planted red first. Then verify Google sign-in through the openinvite:// return path on a device, report only.

Rulings received with that order:

1. Money: no hardcoded dollar sign left anywhere in src/mobile, guarded by elimination rather than by a list of files.
2. Guest suite wording: "Website builder" and "The website builder" become "Guest Suite". The guest-facing product is the Guest Suite, described as the guest experience; "website" never appears in anything a couple reads in the app.
3. The invitation email's date line stays written out; every other dashboard date goes through dashboardDate.js.

## Findings for other lanes

Recorded by lane D. Lane D does not edit these files.

1. Lane A, closed by ruling, no action. The per-guest WhatsApp compose sheet stays on both surfaces, because it opens the guest's own WhatsApp from the couple's device and nothing is sent from us. Web: src/pages/Messages.jsx:12 (the import) and :509 (the sheet). Shell: src/mobile/screens/plan/MessagesScreen.jsx:95, wired at src/mobile/screens/plan/PlanContainer.jsx:450. tests/persistence/email-only-channel.mjs already asserts that the web Messages page keeps it.
2. Lane A, open. Inside the native shell, src/App.jsx:212 redirects only "/" and "/DailyUpdate" to /m. Every other public web path (/tour and /app at src/App.jsx:126 and :128, /Pricing, /features and the rest of PUBLIC_PATH_SET) would render the marketing page, pricing and checkout calls to action included, inside the app if anything navigated the webview there. Today nothing in the shell links to them, and src/mobile/native.ts:389 rewrites every deep link under /m, so the gap is latent. It becomes live with universal links. The suggestion is a native guard that sends any non-/m path to /m, in App.jsx, which is lane A's file.

## Close

Last line: "Closed <date> at main <full SHA>, PRs <list>".
