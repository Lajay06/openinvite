# Goal: Openinvite Professional, the portal for wedding professionals

Written 2026-10-14 by the advisor for lane E. Version 2: it replaces the earlier "Backstage" draft. The owner's rulings: the name is Openinvite Professional, and professionals do not send invitations. The couple runs their own Openinvite. The professional runs the planning and the day, and sees the couple's guest numbers through a link the couple approves.

One goal, run end to end without returning between items, under the goal autonomy protocol in WORKFLOW.md. The only planned stops are the ones the standing rules force: schema (owner adds fields in Base44 chat), payments (owner's passphrase push), production writes (quoted line), and couple-side or legal changes (held).

## The product in one paragraph

Openinvite Professional is for planners, coordinators and venue event managers who run many weddings at once. It is their planning workspace: every event they are running, a real run sheet, every vendor and payment, their team's tasks, and a day-of mode on their phone. It is not a second invitation tool. Invitations, the Guest Suite and RSVPs stay with the couple, in the couple's own Openinvite. When a couple links their Openinvite to their planner, the planner sees a safe, read-only view of what they need to run the day: who's coming, names, dietary needs, meals and tables. They never see guests' emails, phones or addresses. That link is the engine of the whole idea: planners recommend Openinvite to their couples (10% off with the planner's code), the planner gets live numbers, and Openinvite gets the couple.

## Names (constants in src/lib/professionalBrand.js)

- Product: **Openinvite Professional**. Short form in the UI: **Professional**. Never shorten it to "Pro": that is a couple plan.
- Route root: /professional (marketing page /professional, app /professional/app).
- Plans: **Solo**, **Team**, **Agency**.
- Codes: **partner codes**.
- The link: **Link your planner** (couple side) and **Linked couples** (professional side).

## Who does what

| | The couple (their own Openinvite) | The professional (Openinvite Professional) |
|---|---|---|
| Invitations, Guest Suite, RSVPs | Yes, as today | No. Never sends to guests |
| Guest list with contact details | Yes | No. Sees names only, and only if linked |
| Guest numbers, names, dietary, meals, tables | Yes | Yes, read-only, if linked and shared |
| Run sheet for the day | Their simple schedule | The full professional run sheet |
| Vendors, contracts, payment schedules | Their own list | Full vendor book across all events |
| Budget | Their own | Their own fee and costs; the couple's budget only if the couple shares it |
| Team | Collaborators | Seats and roles |

## How the link works

1. The planner adds an event in Professional and clicks **Invite the couple**. The couple gets an email: "{Planner} would like to plan your wedding with you on Openinvite." It carries the planner's partner code (10% off Pro or Ultra).
2. A couple without Openinvite signs up and buys Pro or Ultra with the code. A couple who already has Openinvite just signs in. Either way they land on **Link your planner**.
3. The couple chooses what to share, with clear defaults:
   - On by default: guest count and reply totals (coming, not coming, waiting), guest names, plus-ones and children, dietary needs and allergies, meal choices, table and seat, the wedding date, venue and ceremony time.
   - Off by default, couple can turn on: their schedule, their vendor list, their budget, song requests, accessibility notes.
   - Never shared, no switch: guest emails, phones, mailing addresses, the couple's private notes, messages, passwords or payment details.
4. The couple approves. The planner's event now shows a live **Guests** panel fed from the couple's account. It updates as replies come in.
5. The couple can change what they share, or unlink, at any time in Settings > My planner. Unlinking stops the feed at once. The planner keeps their own run sheet and notes, and keeps a frozen copy of the last totals only (no names).
6. A couple can link one planner per wedding in this goal.

Events that aren't linked are **standalone events**. The planner types in numbers, or imports a guest CSV (names, dietary, meal, table), from the couple's spreadsheet or another RSVP site. No contact details are imported: the importer drops email, phone and address columns and says so.

The professional never gets the couple's planner, invitations or Guest Suite. So a professional's subscription can't be used to hand out free Ultra.

## Privacy

- Guests gave their details to the couple. Sharing them with the couple's own planner is the couple's choice, made on the link screen. The Privacy Policy needs one new section on this, written by the advisor and reviewed by the solicitor before switch-on. Lane E drafts nothing legal; it leaves a flagged placeholder and lists it in the final report.
- The feed is built server-side from an allowlist of fields, never by passing rows through. Guest names and dietary needs are decrypted on the server and sent only to a professional with a live link. Guard: the response for a linked event never contains an email, phone, address, guest id, token or any _enc or _hash field, and a revoked link returns nothing.
- Every read through a link is logged (who, which event, when), and the couple can see "Last viewed by your planner: today, 2:14 pm".

## Pricing (constants in src/lib/professionalPlans.js)

Planners book 12 to 18 months ahead, so the events they are "running at once" are close to everything they've booked for the year. Limits are set for that.

| Plan | Monthly | Yearly (2 months free) | Active events | Seats |
|---|---|---|---|---|
| Solo | US$29.95 | US$299 | 10 | 1 |
| Team | US$79 | US$790 | 30 | 5 |
| Agency | US$149 | US$1,490 | 75 | Unlimited, plus their own branding on vendor sheets and couple invites |

- More than 75 active events: "Talk to us" (hello@openinvite.com.au).
- An **active event** is one that isn't archived. Events archive themselves 30 days after the date, then become read-only, are kept for 24 months, and can be exported at any time. Unarchiving takes a slot.
- Trial: 14 days, 2 events, full features, no card to start.
- Downgrade or over the limit: the newest events beyond the limit go read-only until a slot frees. A plan change never deletes anything.
- Cancel: the workspace is read-only for 90 days with export. Couple links stay but the feed pauses. Removal is a separate, owner-ruled job.
- USD on screen, like the couple site.

Research behind it (2026-10-14): Aisle Planner 10 projects US$39.99/mo, 25 US$69.99, 45 US$99.99. Planning Pod about US$74 to US$159. HoneyBook US$36 / 59 / 129. Timeline Genius US$54.95 for timelines only. Openinvite Professional undercuts Aisle Planner per event and is the only one with live RSVP numbers from the couple's own invitations.

## Partner codes

- Every workspace gets a code (e.g. HOLLY10). Team and Agency can make up to 10 named codes. The code is built into the "Invite the couple" email.
- A couple using a code gets **10% off** Pro or Ultra.
- The workspace earns **US$20 per Pro** and **US$50 per Ultra** as **credit on its Professional bill** (Stripe customer balance). No cash payouts in this goal. Credit carries forward.
- Credit is **pending** until the couple's refund window has passed (read the refund policy page; at least 14 days), then **earned**. A refund before then cancels it.
- Rules: no self-referral (same email, same Stripe customer or a workspace member); one reward per couple; codes case-insensitive, unique, revocable; no stacking with a gift; cap US$500 credit per workspace per month unless the owner lifts it.
- The partner page shows codes, uses, pending and earned credit, and never a couple's name or email: "a couple, Ultra, 3 Nov".
- Lane C is designing pay-it-forward referrals for couples. There must be one referral engine with two kinds (couple and partner). Read lane C's design before item 9 and report how they join. If lane C hasn't built it, build the engine generically and tell lane C.

## Team and access inside a workspace

- Owner: billing, codes, everything.
- Planner: full access to the events assigned to them.
- Assistant: tasks, run sheet and standalone guest lists on assigned events; no money.
- Day-of: the run sheet and contacts for one event on the day; can tick items done.
- Linked guest data follows the event: any seat on that event can see what the couple shared, and nothing more.
- Vendors get no account: a private link to a run sheet filtered to their own items, revocable, expiring 7 days after the event.

## What a professional gets

1. **Events home**: every active event with couple, date, venue, days to go, linked or standalone, guests coming / waiting, tasks overdue, next payment due, assigned planner. Sort, filter by planner and month. A calendar view with clash warnings.
2. **Event switcher** always top left.
3. **Run sheet**:
   - pre-loaded in 15-minute rows (7:00 to 24:00 by default), switchable to 5 or 30;
   - columns: time, duration, item, location, who's responsible (team member or vendor), cue, notes, status;
   - several sheets per event (Setup / load-in, Ceremony, Reception, Pack-down, Rehearsal, custom);
   - shift everything after a row by N minutes; drag to reorder; clash and gap warnings;
   - if the couple shares their schedule, their items show as a read-only lane beside the sheet so nothing is missed;
   - vendor-filtered sheets; PDF (A4 and Letter, landscape) and CSV.
4. **Guests panel**: live totals for linked events (coming, not coming, waiting, plus-ones, children), dietary and allergy summary for the caterer, meal counts, the table list with names. One-click caterer sheet (PDF and CSV): counts by meal, allergies by table. For standalone events, the same panel fed by manual entry or CSV import.
5. **Vendor book across all events**: reusable contacts (role, company, phone, email, insurance expiry, notes). Per event: booking, deposit, payment schedule, contract file, arrival and finish times, all flowing into the run sheet and vendor links.
6. **Payment schedule** across every event: due dates, status and who pays. "Due this week". Tracking only, no money moves.
7. **Professional budget**: their own fee, commissions and costs per event; the couple's budget appears read-only beside it only if shared.
8. **Tasks with owners**, per event and across events ("My tasks this week"); templates by months to go (12, 9, 6, 3, 1, the week of, the day of).
9. **Templates library**: save any run sheet, checklist, budget, questionnaire or vendor package and start new events from it.
10. **Client questionnaires**: send the couple a form (must-play songs, family notes, photo list) and the answers land in the event.
11. **Day-of mode**, phone-first at 390: now / next / later from the run sheet, big tick buttons, one-tap call or text for vendors and team, the live guest total, the emergency kit list, offline-tolerant (the current sheet and contacts are cached).
12. **Documents** per event (contracts, floor plans, licences, insurance).
13. **Notes and meeting log**, private to the team.
14. **Exports**: CSV for every table, laid out like the spreadsheets planners use today.
15. **Agency branding** on vendor sheets, questionnaires and the couple invite email. Openinvite stays in the footer.
16. **Ava for professionals**, using the existing Ava plumbing: "draft the vendor email", "find gaps in this run sheet", "what's due this week across my events".

## What a professional doesn't get

- No invitations, Guest Suite, RSVP pages, universes or design studio. Those are the couple's.
- No guest contact details, ever.
- No couple onboarding quiz. Instead, **New event**: couple names, date, venue, guest estimate, template, assigned planner, done in under a minute.
- No trial banners, retention or stall emails, gifting prompts, countdown cheer or couple upsells.

## Couple-side changes (held PRs, behind the flag)

The only couple-side additions: the **Link your planner** screen, **Settings > My planner** (sharing switches, last viewed, unlink), and the "Invite the couple" email arriving. Nothing else on the couple side changes. Every couple-side file change is a held PR listing each line changed, with screenshots at 1440 and 390. Guards pin the couple's existing screens.

## Look and feel

- Related to Openinvite but clearly a workplace: a black (#0A0A0A) side bar and top bar with the event switcher; the work area #F5F5F5 with white cards; Plus Jakarta Sans; red #E03553 for actions only.
- Dense tables (40px rows, sticky headers), keyboard navigation in the run sheet (arrows, Enter to edit, Cmd/Ctrl+D to duplicate).
- Full logo top left with "Professional" beside it in the same weight.
- No cream, no eyebrow lines, no em dashes, US English, calm copy, errors through api/_lib/calmErrors.js.
- Every screen works at 390; day-of mode is designed for 390 first.
- Photography only on the marketing page and empty states, from the owned Higgsfield set. Never DTS photos in any AI tool.

## Marketing page /professional

In the site's own grammar (project doc product-showcase-placement-2026-10-14): full-bleed 900px sections, photo or solid ground edge to edge, the big headline style, one red pill CTA, product as live HTML cards over a photo.
1. Hero, black: "Run every wedding from one place." Subline: "A real run sheet, every vendor and every payment across all your events, and live guest numbers straight from your couples' Openinvite." CTA "Start free for 14 days".
2. Run sheet (white), as live cards.
3. Live guest numbers (photo with the guests panel over it): "Your couples send the invitations. You see who's coming."
4. Events home (black).
5. Partner codes: "Your couples save 10%. You earn credit."
6. Pricing.
7. CTA.
Add "For planners" to the site nav and footer only when the flag is on.

## Accounts and sign-in

Same Base44 auth. A new account picks its path at /professional/start, which writes accountType "professional" on the account (new User field, owner adds it). /login sends a professional account to /professional/app and a couple to the couple dashboard, as today. One email can't be both in this goal; say so plainly and suggest a second email.

## Data model (item 0 confirms before anything is wired)

The safe pattern is the collaborator one already in production: rows stay owned by their owner's account, and access across accounts goes through server endpoints that check a grant. RLS is never opened.

Proposed new entities (owner adds them in Base44 chat; lane E prints the exact box and never calls update_entity_schema):
- **ProWorkspace**: owner_user_id_hash, name, plan (solo, team, agency, trial), plan_status, event_limit, seat_limit, stripe_customer_id, stripe_subscription_id, brand_logo_url, brand_name, trial_ends_at, is_test.
- **ProMember**: workspace_id, member_user_id_hash, member_email_hash, role (owner, planner, assistant, dayof), assigned_event_ids, event_type log like CollaboratorGrant, is_test.
- **ProEvent**: workspace_id, couple_names_enc, event_date, venue, status (active, archived), kind (linked, standalone), assigned_member_ids, template_id, is_test.
- **PlannerLink**: event_id, workspace_id, couple_user_id_hash, wedding_id_hash, shares (the switches), event_type log (request, approve, update, unlink), last_viewed_at, is_test. The couple's approval is the couple's own create, so ownership is honest.
- **ProGuest** (standalone events only): event_id, name_enc, dietary_enc, meal, table, plus_one, child, is_test. Never an email, phone or address field.
- **RunSheetRow**: event_id, sheet, start_minute, duration_minutes, item, location, owner_ref, cue, notes_enc, status, sort, is_test.
- **VendorContact** (workspace) and **VendorBooking** (event: vendor_id, role, deposit, schedule, contract_file, arrive, finish, link_token_hash, link_expires_at).
- **PaymentDue**, **ProTask**, **ProTemplate**, **ProQuestionnaire**, **ProDocument**, **ProNote**.
- **PartnerCode** and **PartnerReward** (code, workspace_id, stripe_promotion_code_id, status; reward: code_id, couple_user_id_hash, plan, amount, status pending/earned/credited/cancelled, earn_after).
- **User** gains accountType ("couple" or "professional"). Nothing else on User changes.

Every _hash field uses APP_HASH_KEY and every _enc field APP_ENC_KEY, both through appKeys.js. Names, notes and dietary needs are encrypted at rest like Guest PII.

Item 0 must also answer: which existing modules read a couple's guests, replies, meals and seating server-side (my-guests-rsvp, guestPii, the seating entities), so the linked feed reuses them rather than re-reading raw rows.

## Billing

- Stripe Billing subscription per workspace, monthly or yearly. New endpoint api/professional/subscribe.js (ask the freeze guard whether it counts as payments; if so, Payments-Change route).
- The Stripe customer portal handles card changes, plan switches and cancel.
- api/webhooks/stripe.js (FROZEN) gains subscription and invoice events for workspaces only. Couple purchase handling stays byte-identical except one new branch for partner-code rewards. Held, Payments-Change trailer, owner's passphrase push. Guard that the couple path is unchanged.
- Partner codes are Stripe promotion codes (10% off the Pro and Ultra prices), created through the API. The reward is written from the webhook, pending until earn_after. A daily cron turns pending into earned and applies the credit to the workspace's Stripe customer balance. Production writes only after the owner's quoted line.
- Stripe sandbox first, with gift-test-style preview keys set by the owner. Never sk_live_. A Stripe page must show Sandbox or close without paying. Lane E prints the list of sandbox prices for the owner to create.

## Territory and lane rules

Lane E, folder ~/Downloads/openinvite-6, branch prefix e/. Lane E owns everything new under src/pages/professional/, src/components/professional/, src/lib/professional*.js, api/professional/*.js, api/_lib/professional*.js, tests/persistence/professional-*.mjs, scripts/professional-*.mjs, base44/entities/Pro*.jsonc and PlannerLink.jsonc mirrors (after the owner adds them), the /professional marketing page and this goal file.

Shared files only in held PRs, listing every line changed: src/App.jsx (routes), couple-side settings and sign-up for the link screens, api/create-checkout-session.js and api/webhooks/stripe.js (FROZEN), the couple-side email templates. Import api/_lib/appKeys.js, never change it.

Never: run the live persistence lane; inspect Vercel env by any route; derive any key from a credential; read or change couple data except through a live PlannerLink; change couple-side behaviour beyond the link screens; press Pull in Base44; run a bare base44 deploy; open DTS photos in any AI tool.

Everything ships behind PROFESSIONAL=1, off in production. Browser rules: one lane with a dev server or browser at a time; sub-agents at most two, one driving a browser.

## The run, in order

Each item: build, guards (each proved red on a planted fault first), screenshots at 1440 and 390, then carry on. PRs that touch no held file self-merge on green behind the flag. Held PRs accumulate and are reported together at the end with their five marks.

0. **Scout, then keep going.** Report the data-model answers, the freeze guard's view of new billing files, and lane C's referral design. Print the Base44 chat box for every new entity and the User field, then keep building item 1 onward against a local adapter (src/lib/professionalStore.js, in-memory test data) until the entities exist. The mirror PR follows the owner's confirmation.
1. Shell: /professional/app layout, black bars, event switcher, empty states, flag gate, accountType routing.
2. Events home and calendar, clash warnings, New event from blank or a template.
3. Run sheet in full (as above), PDF and CSV.
4. Vendor book, bookings and vendor links, with a read-only vendor page at 390.
5. Payment schedule and the professional budget.
6. Tasks with owners and months-out templates; "My tasks this week".
7. Templates library and client questionnaires.
8. Team seats and roles; invites by email (the collaborator invite look: full logo, #F5F5F5); server-side role checks on every endpoint; a truthful-permissions guard.
9. Partner codes and rewards (after the referral-engine check).
10. **The planner link**: "Invite the couple" email with the code, the couple's Link your planner screen and Settings > My planner (held, couple side), PlannerLink grants, the allowlisted server feed, the Guests panel and caterer sheet, the read log, unlink. Standalone events: manual entry and CSV import that drops contact columns.
11. Day-of mode.
12. Billing: plans, trial, limits, over-limit read-only, cancel and read-only, sandbox wiring (held, payments).
13. Ava for professionals.
14. Marketing page /professional, nav and footer entries, behind the flag.
15. Exports everywhere.
16. End-to-end browser test on the preview: la.jay06+pro01 starts a trial, makes 2 events from a template, adds a vendor and shares a vendor link, invites la.jay06+pro02 as an Assistant, invites a couple (la.jay06+procouple01) who buys Ultra in the sandbox with the partner code and links. Check that the Guests panel shows names and counts but no contact details, the reward is pending, and unlinking stops the feed. The owner runs anything that needs his keys or a live write.

## Stop conditions (halt and report at once)

1. A schema field is needed that isn't in the printed box. Print the addition and carry on with the adapter; stop only if nothing else can proceed.
2. Any migration or backfill of existing couples' data.
3. Any couple-side change beyond the link screens, or any change to couple copy or pricing.
4. Payments beyond the subscription branch and the partner reward, or any sk_live_ key.
5. A decrypt failure on any stored row (standing rule 3).
6. Any path where a professional could see a guest's email, phone or address, or any couple data without a live link.
7. Two failures in a row of the same gate, or a flake you can't attribute.

## Done when

- The preview shows a working Openinvite Professional: sign up, trial, events home, run sheet, vendors and links, payments, tasks, templates, questionnaires, team roles, partner codes, the planner link with the live Guests panel, standalone import, day-of mode, sandbox billing, the marketing page and exports, all at 1440 and 390.
- Every endpoint checks the role and the link server-side, and the guards prove it.
- The couple side is unchanged apart from the link screens (guards pin it).
- One final report: what merged (with commits), every held PR with its five marks, the Base44 boxes, the sandbox prices for the owner to create, the Privacy Policy placeholder for the advisor and solicitor, and anything else the owner must do.

## Open questions for the owner (defaults apply until he says otherwise)

1. Plan limits: Solo 10 / Team 30 / Agency 75 active events (default). The owner first floated 5 events at US$29.95; the research says 5 is too few, because planners book a year ahead.
2. Rewards as bill credit, US$20 Pro and US$50 Ultra (default). Cash payouts later.
3. Whether venues and photographers who don't subscribe can hold a partner code (default: not in this goal).

## Owner rulings, 2026-10-14 (after #1059)

- Every Professional PR is HELD for the owner's line: anything touching an endpoint, the feed, PlannerLink, the routes, billing or any couple-side file.
- The feed's check is an exact allowlist of keys at every level (FEED_SHAPE in api/_lib/professionalFeed.js); any other key fails. An email-shaped value is the second net.
- Accessibility: the feed sends nothing. Guest.special_requests is not an accessibility field. The couple's accessibility switch stays hidden until a dedicated accessibility field exists.
- Tables: the table name only (Guest.table_assignment). Seats, and the asServiceRole read of Table they would need, are parked.
- The server flag: professionalOnServer() is on only with PROFESSIONAL=1, previews included. A Vercel preview alone is not enough.
