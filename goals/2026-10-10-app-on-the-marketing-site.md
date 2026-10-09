# The app on the marketing site (owner request 2026-10-09; lane B, after the tour page)

Lane B. Runs under the goal autonomy protocol in WORKFLOW.md. Marketing pages only. One PR per item unless two items share a file.

Owner's intent: the Openinvite app (iPhone and Android, full planner, still in build, live at launch) is the part of the product that the people who have seen it love most, and the website does not mention it anywhere. The job of this goal is simple: let every visitor know there is an app. Not a campaign, not a redesign; a block on the home page, a section on the Features page, one line on Pricing, and a page of its own that the badges will point at.

Legal pages: no.

## Territory

Marketing pages (home, Features, Pricing, a new /app page), the marketing footer, scripts/marketingRoutes.mjs, src/lib/marketingSeo.js (marketing SEO entries only), prerendered/, Cloudinary marketing assets. Never src/pages (dashboard), src/components outside the marketing components, api/, email templates, or the app shell. The dashboard prompt and the email lines are not in this goal; they are listed under "What else does this touch".

## Browser rules

One lane with a dev server or browser at a time. No local CI shards unless the harness or a fixture changed. Sub-agents: at most two, one driving a browser.

## Facts the copy relies on

iPhone and Android. Full planner on the phone: daily update, guests and replies, seating, budget, vendors, schedule, Ava. The guest suite is designed on a desktop; on the phone a couple can preview, check and publish it. Guests never need the app; they open a link. The app is included in both plans at no extra cost. The app is not yet in either store. Until the owner supplies live store links, every place a badge would go shows the plain text line "Coming to the App Store and Google Play at launch." with no link and no badge artwork; the official Apple and Google badges are added only when the links exist, in a later MINOR change.

## Items

1. Home page block. One section after the six cards and before pricing. Left: a phone frame showing the daily update at 390 (a still from the existing rich-fixture 390 take of that chapter, or a short loop of it if it stays under the page's media budget). Right: heading "The whole planner, in your pocket." and body "Plan on the train, on the couch, in the queue for coffee. The guest list, the budget, the seating chart and Ava are all on your phone, and a reply from a guest reaches you the moment it lands. Your guests never need the app; they open a link." Below the body, the store line from the facts section. Matches the spacing, type and width of the sections around it; no new colors.

2. Features page section. A section of its own above the accordion, not a ninth accordion row. Heading "Everything, on your phone". Three phone frames from the 390 takes: the daily update, the guest list showing a fresh reply, the budget (owner ruling 2026-10-10: the budget replaces the seating chart, which at 390 tells a phone to use a larger screen and has no touch dragging; the seating line changed for the same reason). Five short lines, copy exactly: "The morning page that tells you what today needs." "The guest list, with replies arriving as they happen." "The seating chart, wherever you are." "The budget, with every vendor payment and what is still owed." "Ava on every page, at any hour." Then one sentence: "You design your guest suite on a desktop, where the space is; everything else is yours wherever you are." Then the store line.

3. Pricing line. In each plan card, one line in the same style as the existing inclusions: "Includes the app." Nothing else on the page changes.

4. The /app page. Route /app, prerendered, in scripts/marketingRoutes.mjs, in the sitemap, not noindexed, with a getMarketingSeo entry: title "Openinvite | The app", description "The Openinvite wedding planner on your phone: guests, replies, seating, budget, vendors, schedule and Ava. iPhone and Android, included with every plan. Guests never need it." Page: the Features section's three phones and five lines, the desktop sentence, a short block headed "Do my guests need it?" with the body "No. Your guests open a link and reply in a browser. Nobody has to make an account or install anything to come to your wedding.", the store line, and the marketing footer. Add "The app" to the marketing footer on every marketing page, linking to /app. When the store links arrive, this page is where the Apple Smart App Banner meta tag goes; leave a one-line code comment marking the spot and nothing else.

## Rulings in advance

Copy verbatim, US English, no em or en dashes, no emojis. Where a label is needed that is not written here, shortest plain English, recorded in the PR body. No badge artwork and no store links until the owner supplies them; the store line is text only. Phone frames use real product footage from the rich fixture at 390; no mockups and no invented screens. Nothing here changes any dashboard, guest-facing or email surface. Any held-list file: STOP and report before editing. Items 1 to 4 self-merge under the protocol if clear of the held list; the marketingSeo.js entry is permitted under the same exception as the tour page.

## What else does this touch

Lane A later: a dismissible "Keep planning on your phone" card on the daily update page for the first three dashboard visits after onboarding, and a permanent "Get the app" line on the Account page (folded into Goal 5, account basics). Emails later: a P.S. with the store line in the welcome email and one short paragraph in the day 7 email (a MINOR change when the stores are live). The mobile app shell must match the web (no WhatsApp, numeric dates, account currency) before the badges go live; that is the mobile pass, not this goal.

## Guards

Each item adds or extends one guard, red before and green after. Home, Features, Pricing and /app render the exact copy above; the store line appears wherever a badge would and no img or link to apps.apple.com or play.google.com exists anywhere on the marketing site until the links are supplied (asserted absent); /app is in the routes list, the sitemap and test:marketing-routes and passes prerender freshness; the footer link renders on every marketing page; no horizontal scroll at 390 on any touched page; media on the home block stays within the page's existing budget.

## Close

Last line: "Closed <date> at main <full SHA>, PRs <list>".

Closed 2026-10-10 at main f20ceaddc2ba2c959fae43d8197710398ff8ec30, PRs #947 #948 #949 #950
