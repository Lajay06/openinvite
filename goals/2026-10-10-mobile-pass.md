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

Rulings and order received 2026-10-12:

4. The invitation starter design's date stays written out too: two written-out dates, both guest-facing.
5. "openinvite.com.au" for the web app, and "Web address" with "Visit" for vendor and hotel links, accepted.
6. "Guest Suite", with capitals, everywhere it names the product. The lower-case uses in the shell are made consistent in one PR.
7. Vendor price tiers as one named constant, every tier shown as words, accepted.
8. Lane D's findings 1 to 3 (Send invites) are three real bugs, fixed in one PR by consuming the web's send path rules, not reimplementing them. Finding 4 (household grouping) is the PR after that. Finding 6 (App Store 3.1.1) is a launch-list item, no change yet.
9. The Google sign-in device check waits for the owner to say "ready for the sign-in check".

## Findings for other lanes

Recorded by lane D. Lane D does not edit these files.

1. Lane A, closed by ruling, no action. The per-guest WhatsApp compose sheet stays on both surfaces, because it opens the guest's own WhatsApp from the couple's device and nothing is sent from us. Web: src/pages/Messages.jsx:12 (the import) and :509 (the sheet). Shell: src/mobile/screens/plan/MessagesScreen.jsx:95, wired at src/mobile/screens/plan/PlanContainer.jsx:450. tests/persistence/email-only-channel.mjs already asserts that the web Messages page keeps it.
2. Lane A, open. Inside the native shell, src/App.jsx:212 redirects only "/" and "/DailyUpdate" to /m. Every other public web path (/tour and /app at src/App.jsx:126 and :128, /Pricing, /features and the rest of PUBLIC_PATH_SET) would render the marketing page, pricing and checkout calls to action included, inside the app if anything navigated the webview there. Today nothing in the shell links to them, and src/mobile/native.ts:389 rewrites every deep link under /m, so the gap is latent. It becomes live with universal links. The suggestion is a native guard that sends any non-/m path to /m, in App.jsx, which is lane A's file.
3. Lane A, open. src/pages/GuestSuiteAccommodation.jsx:502 hardcodes `"priceRange":"$200-300/night"` in the example JSON of Ava's stay prompt, so the model is shown dollars whatever the account currency. The shell's copy of the prompt takes the account symbol from src/lib/money.js since mobile parity 3.
4. Lane A, open. Five dashboard dates on the web are still written out with a weekday, after #917 and #941 made dashboard dates numeric: src/components/dashboard/Briefing.jsx:29 (the eyebrow, "Monday 7 September"), src/pages/DailyUpdate.jsx:230 (the masthead), src/components/schedule/ScheduleDayList.jsx:15 (used by src/pages/ScheduleHub.jsx), src/pages/GuestSuiteSchedule.jsx:42 (en-GB, with an all-caps "NO DATE SET" beside it) and src/pages/UniverseStudio.jsx:52 (en-GB). The phone is numeric everywhere since mobile parity 6, so on these five the two surfaces now disagree.
5. Lane A, for a ruling. src/pages/OurStory.jsx:418 offers Ava the starter "Write a short version for the website". The Guest Suite ruling of 2026-10-11 was given for the app, where the copied starter now says "for the Guest Suite"; whether it reaches the web is the advisor's call.

6. Lane A, open. src/components/guests/SendInvitesModal.jsx:636 stamps invite_sent_at (and :652 appends send history) on every guest it minted a link for, including a guest alone on an invitation with no email, who was not sent anything. The modal says "with no email yet" for them before the send and "Invited" after it. The phone does the same through the same withTokens list, so a fix belongs on the web first and the shell follows it.
7. Lane A, for a choice. The publish rule a send obeys (a slug, and websiteEnabled === true) is written inline twice, in SendInvitesModal.jsx:526 and :530 and in api/send-invites.js:275, and the shell now holds a third copy because there is no module to import. A small predicate in src/lib would let all three consume one rule; tests/persistence/mobile-send-path.mjs checks that the three still agree until then.

## Lane D's own findings

Found while doing the parity items, inside lane D's territory. Findings 1 to 3 were fixed together as ordered on 2026-10-12; finding 4 is next; finding 5 is ordered; finding 6 moved to LAUNCH_CHECKLIST.md.

1. The phone's Send invites screen (src/mobile/screens/guests/SendInvitesScreen.jsx) does not refuse to send while the site is unpublished. SendInvitesModal.jsx does, with "Your website is not published yet, so these links would not work."
2. The same screen sends one email per guest. The web sends one per invitation, addressed to the household's lead (invitationsFor in SendInvitesModal.jsx). A household of four gets four emails from the phone and one from the web.
3. The same screen does not skip a guest whose address bounced, and the guest list does not show "Email bounced". The web does both (src/components/guests/emailBounce.js). Parity 8 took opted-out guests only, as ordered; the bounce is the same shape and the same few lines.
4. The guest list does not group a household under its lead, as GuestList.jsx does through groupByHousehold. Parity 4 took the counts and the detail, as ordered.
5. "guest suite" appears in lower case 77 times in the shell's copy. Parity 7 wrote "Guest Suite" in the two strings it replaced, as ruled. One case or the other throughout is a sweep, not done without an order.
6. For store submission, not now: four strings tell the couple to upgrade at openinvite.com.au (Account, Send invites, the Ultra gates in DetailsScreen.jsx and schemas.js). They said "on the website" before parity 7; the wording changed, the direction to buy outside the app did not. App Store review rule 3.1.1 is about exactly this.
7. Not ordered. The phone's send does not append Guest.send_history (src/lib/sendHistory.js's newSendEntry), which the web writes for every type it sends. A send made from the phone is missing from the guest's history on both surfaces.

## State (lane D)

As of 2026-10-11, the advisor's order is done through parity 7. Merged, in order:
item 10 as #984; parity 5 as #987; parity 3 as #990; parity 4 as #992; parity 8 as #993;
parity 6 as #995; parity 7 as #996. Parity 1 and 2 were lane B's, #962 and #966.
Each parity PR carries its own guard under tests/persistence/mobile-*.mjs, planted red
before it merged.

On 2026-10-12, lane D's findings 1 to 3 (Send invites: refused while unpublished, one
email per invitation, bounced addresses skipped) in one PR, with its guard
tests/persistence/mobile-send-path.mjs. The same PR found that the phone's request had
never carried slug or websiteEnabled, so api/send-invites.js had refused every send the
phone made; it carries both now.

WHAT IS NEXT. Household grouping under the lead (finding 4), then "Guest Suite" with
capitals throughout the shell (finding 5). The Google sign-in device check waits for the
owner's "ready for the sign-in check"; it needs the owner and the machine's one browser
slot (the device run counts as it).

Decisions taken during the pass, written down so they are not reopened:

1. Parity 3: the stored vendor price tiers ($ to $$$$) are the desktop VendorForm's enum
   and stay as data in one named constant, PRICE_TIER_KEYS; every display is words. It is
   the money guard's only exemption.
2. Parity 6: besides the invitation email's date, the invitation starter design's date
   (PlanContainer.jsx, copied from InvitationBuilder.jsx) stays written, because guests
   read it on the invitation. Confirmed by the advisor on 2026-10-12.
3. Parity 7: the web app is named as openinvite.com.au; a vendor's, hotel's or place's own
   link is a "Web address" with a "Visit" button.

## Close

Last line: "Closed <date> at main <full SHA>, PRs <list>".
