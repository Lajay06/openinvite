# Collaborators, safe and truthful (lane C, opened 2026-10-10)

Lane C. Runs under the goal autonomy protocol in WORKFLOW.md. No dev server, no browser, no local CI shards: lanes A and B own those, and CI runs the browser shards on every PR. Branch prefix c/. Never write to another lane's files or branches. No em or en dashes anywhere. US English.

Legal review: yes, at close. A collaborator is a third party reading a couple's data, and since this goal fixes the 503, also the couple's guest list. Removal that did not revoke, invite links that never expired, and the accept link's host are all for the reviewer.

## Territory

api/collaborator-accept.js, api/collaborator-context.js, api/collaborator-data.js, api/collaborator-guests.js, api/collaborator-lookup.js, api/collaborator-budget.js, api/_lib/collaboratorAuth.js (held, owner ruling 2026-10-11: the authorization check for every collaborator endpoint), api/_lib/collaboratorInviteToken.js, api/_lib/collaboratorInvites.js (new in 1b, held, owner ruling 2026-10-11: which invite link is the live one), and one new file at the api/ root, api/collaborator-revoke.js (held). api/send-collaborator-invite.js only under the named exceptions in items 1b and 1c: it is an api/send-*.js file and CLAUDE.md lists those as do not touch. src/lib/collaboratorContext.jsx, src/lib/collaboratorPageMap.js, src/lib/collaboratorEmailTemplate.js (held, it is email copy), src/components/layout/CollaborateModal.jsx, src/components/layout/AnimatedSidebar.jsx, src/components/shared/AvaButton.jsx, the collaborator gate in src/Layout.jsx, src/pages/CollaboratorAccept.jsx, src/pages/ChoosePlan.jsx only under the named exception in item 4 (held), the collaborator branches of the eleven permissioned pages, src/pages/Help.jsx (the "Inviting a collaborator" article, which is product chrome, not marketing), and tests/persistence.

Not touched: src/pages/Register.jsx, src/pages/Login.jsx, src/lib/AuthContext.jsx, src/components/auth/. The payments path is frozen. No marketing pages and no prerendered/: collaboration claims on the marketing site are lane B's, listed under Handover below. No schema change by the terminal: item 1b needs one, added by the owner in Base44 chat and mirrored in a held PR.

Overlap: lane A's bounces goal touches src/pages/Guests.jsx and api/_lib. Before opening any PR that touches a file another open PR touches, do the merge in a scratch worktree and state in the PR body whether it was clean.

## Rulings in advance

From the owner, 2026-10-10, after the two lane C scouts.

1. Security first, three held PRs, in this order: (a) removal and permission edits write a revoke or a fresh grant event, and collaboratorAuth honors the latest event; (b) invite tokens expire 7 days from iat, and the accept path checks the current invite token so a resend invalidates old links; (c) the accept link's host comes from VITE_APP_URL on the server, never from the request body.
2. The collaborator context survives navigation. Every sidebar link and top-level link keeps collabOwner. Any page without a grant shows the access-denied screen, never the collaborator's own wedding.
3. The Ava modal is not shown in a collaborator session in this goal.
4. A brand-new account's accept flow lands on the invite after sign-up, never on choose-plan or onboarding. The invitee gets no trial and no wedding of their own.
5. Permissions are truthful. The picker offers only pages that work today: Event Details, and Guests once its 503 is fixed. Everything is labeled "view only". The invite email names pages in plain words, with no "view & edit". Dashboard, Music, Seating and Registry stay off the picker until phase 2. Seating's WeddingDetails versus weddingDetails mismatch is fixed anyway.
6. Fix Guests' 503.
7. Phase 2 is scout only, at the end of this goal. For each of the nine entities only the owner can read, propose how a collaborator read and write would work server side without widening RLS, following the Guest pattern, with the effort per entity. Then stop for a ruling.

Guards for every item, including a plant that removes a collaborator and proves the next request is refused.

## Facts from the scout

So they are not re-derived. The scout is in the 2026-10-10 lane C report.

- The eleven permission keys are in src/lib/collaboratorPageMap.js:55-110. Every page branches to a collaborator endpoint before any own-account read; the leaks are elsewhere (below).
- The admin key gets 200 with an empty list from any entity whose read is owner-scoped (BASE44_PLATFORM_NOTES.md:9-24). Live read RLS on 2026-10-10: owner-scoped for Budget, Schedule, Music, Invitation, Table, VenueAsset, RegistryItem, Vendor and MoodboardItem; open for Guest, WeddingDetails, SongRequest, CustomGift, RegistryProduct and CollaboratorGrant. The live schema matched the local mirror.
- The sidebar strips the query string on every click: AnimatedSidebar.jsx:487, 523 and 672 split at "?", and :505 navigates to a route that never carried it. Only Dashboard.jsx (collabSuffix, :126) and CollaboratorGuests.jsx append collabOwner today.
- AvaModal.jsx reads and writes the signed-in user's own wedding (lines 9-11, 66, 94-98), and AvaButton renders on seven collaborator pages: Budget :513, ScheduleHub :360, Music :564, Seating :929, Registry :181, Moodboard :308 and EventDetails :1068.
- Removal is CollaborateModal.jsx:146-148, a Collaborator delete with the owner's token. A permission edit is :107, a Collaborator update. Neither touches CollaboratorGrant. The only grant write in the repo is collaborator-accept.js:81, and collaboratorAuth.js:76 returns the latest event per owner and collaborator hash.
- CollaboratorGrant: event_type enum is exactly grant and revoke. collaborator_user_id_hash is required. collaborator_email_hash is stored on every grant. create and read are null.
- The owner never learns the collaborator's user id, and the admin key cannot read Collaborator. So any owner-side event must find the collaborator's user hash by listing that owner's grants by email hash. That is possible because CollaboratorGrant read is null.
- verifyInvite in collaboratorInviteToken.js never checks iat. send-collaborator-invite.js writes a fresh invite_token on every send, but accept never reads it, and cannot: it would need to read Collaborator.
- send-collaborator-invite.js builds the accept URL from req.body.origin.
- Brand-new account: /register?next= goes to /choose-plan, where goFree writes plan_step_completed and trialStartedAt and navigates to /onboarding, dropping next (ChoosePlan.jsx:105-106).
- Guests: api/collaborator-guests.js:122 returns 503 before auth. Its header says the reason (Guest read owner-scoped) is stale; live Guest read is null.
- Seating.jsx:264 reads data.WeddingDetails; collaborator-data.js:123 returns data.weddingDetails.
- Existing grants: the page-map header records two existing collaborators, each with ten or more keys. Grants for collaborators already removed in the past are still live.

## Items

Order of work: 1a, 1b, 1c, 2, 3, 6, 5, 4, 7. Item 6 comes before item 5 because the picker offers Guests only once Guests works.

1a. Revoke and permission edits, HELD.
   - New api/collaborator-revoke.js, authenticated as the owner. It takes an email and an action, revoke or permissions.
   - The server computes the owner hash from the verified caller and the email hash from the lowercased email. It lists CollaboratorGrant rows for that pair, then writes one new event per distinct collaborator_user_id_hash found: event_type revoke, or event_type grant with the new permissions. The write uses the owner's own token.
   - No grant rows found means the invite is pending: nothing is written, and a permission edit on a pending invite resends the invite instead, so the old link dies under 1b.
   - CollaborateModal's delete and permission edit call this endpoint before touching the Collaborator record. If the endpoint fails, the Collaborator record is left alone and the owner sees "That did not save. Try again." The window.confirm on delete becomes an inline confirm: "Remove {name}? They lose access straight away." with "Remove" and "Keep".
   - Reconcile on open: when the owner opens CollaborateModal, it sends its current collaborator emails, and the server revokes every grant under that owner hash whose email hash is not in the set. This catches collaborators removed before this goal. Ruled 2026-10-11: the revoked set is the grants with no matching Collaborator record for that owner.
   - collaboratorAuth keeps "latest event wins", unchanged in shape. Ties on created_date resolve to revoke.
   - Guards: (i) a stubbed-fetch unit guard on getCollaborationFor across grant, revoke, grant and permission-update sequences; (ii) the plant the owner asked for: grant, then removal through collaborator-revoke, then the next collaborator-data request is a 403. Prove it red by planting a collaboratorAuth that ignores revoke; (iii) reconcile revokes an orphaned grant and leaves a current one alone.

1b. Invite expiry and resend invalidation, HELD. Ruled 2026-10-11: the expiry goes ahead now; resend invalidation waits for the owner to add CollaboratorInvite after 1a merges.
   - Expiry: verifyInvite's callers refuse a payload more than 7 days past iat. The accept page says "This invite has expired. Ask them to send a new one." Every pending invite older than 7 days dies the day this ships; that is intended.
   - Resend invalidation cannot be met with today's schema. The current token lives only on Collaborator, which the admin key cannot read, and CollaboratorGrant cannot hold an invite event: its enum is grant and revoke, and it requires a collaborator user hash that does not exist yet at invite time.
   - Ruled: a new entity, CollaboratorInvite, built like CollaboratorGrant: create null, read null, hashed ids only. Fields: owner_user_id_hash, collaborator_email_hash, invite_token_hash, is_test. Every send writes one row with the owner's token. Accept refuses a token whose hash is not the latest row for that owner and email pair.
   - STOP after 1a merges, for the owner to add the entity. The mirror PR is held.
   - Guards: an expired fixture is refused, a fresh one accepted, and an old token is refused after a resend. The plant drops the iat check.

1c. Accept link host, HELD, named exception for api/send-collaborator-invite.js.
   - The accept URL is built from process.env.VITE_APP_URL, falling back to https://openinvite.com.au, the same source create-checkout-session.js uses. req.body.origin is ignored, and the modal stops sending it.
   - No other change in that file except what 1b needs.
   - Guard: a request with origin set to another host produces a link on the app host. The plant restores req.body.origin.

2. Navigation keeps the context.
   - One helper in collaboratorContext.jsx, withCollab(url, ownerUserId), adds collabOwner to any in-app URL. AnimatedSidebar uses it for every desktop, top-level and mobile navigation in a collaborator session. Dashboard.jsx's collabSuffix moves onto it.
   - In-page links on the eleven pages that route inside the dashboard go through it too.
   - Layout's gate is unchanged in rule, and is confirmed to cover every page reachable from a collaborator session, including the ones with no permission key.
   - "Exit collaboration" is the one link that deliberately drops the parameter.
   - Guards: a static guard that every navigate( and Link in AnimatedSidebar passes through withCollab or is the exit link; unit guards on withCollab (keeps other params, does not double-add, leaves external URLs alone).

3. No Ava in a collaborator session.
   - AvaButton returns nothing when the collaborator context has an owner.
   - Layout ignores the openAva event in a collaborator session, so AvaModal and AvaChatPod never open.
   - Vendors' and Guests' own gates stay.
   - Guard: a static guard that AvaButton reads the collaborator context, plus a render guard of AvaButton under a collaborator context.

4. Accept for a brand-new account, HELD, named exception for src/pages/ChoosePlan.jsx.
   - When next is a /collaborate/accept/ path, ChoosePlan sends the visitor straight there. It writes neither plan_step_completed nor trialStartedAt, and never routes to /onboarding.
   - Register.jsx already passes next through and is not touched.
   - Confirm in code that nothing between sign-up and accept creates a WeddingDetails: no getMyWeddingDetails call on that path that creates a record on first read, and nothing in Layout's trial or onboarding checks on the collaborator landing page.
   - A collaborator-only account that later signs in without the link: record what it sees. If that is choose-plan or onboarding, STOP for a ruling. Do not design the "weddings you help with" screen in this goal.
   - Guards: unit guard on the ChoosePlan branch (accept next: no updateMe, no onboarding; any other next: unchanged). The plant removes the branch.

6. Guests: fix the 503.
   - Remove the short-circuit for GET only. Guest read is open live, so the existing admin-key read works.
   - PUT and DELETE return 403 "Collaborators can view the guest list but not change it." until phase 2.
   - Correct the stale header in place.
   - Before shipping, confirm the response carries only what the owner's own Guests table shows, with guest PII handled exactly as api/_lib/guestPii.js does for the owner's own read. It must not carry RSVP tokens or anything the owner's page does not display.
   - excludeTestRecords stays.
   - Guards: a stubbed GET with a valid grant returns only that owner's guests with no token fields; a GET with no grant or a revoked grant is a 403; PUT is a 403.

5. Truthful permissions.
   - The page map gains one export, the phase-1 set: Event Details, and Guests once item 6 is on main. CollaborateModal's picker offers only that set, as one "view only" toggle per page with no edit control.
   - collaboratorAuth's hasPagePermission honors only the phase-1 set, and only view, on the server. The sidebar shows only that set. Stale grants naming Budget and the rest stop serving empty pages.
   - The invite email (src/lib/collaboratorEmailTemplate.js, held) lists pages by their nav labels ("Event details", "Guest list"), followed once by "You can view these pages. You will not be able to change anything." No "view & edit", and no internal key names.
   - Seating.jsx:264 reads data.weddingDetails.
   - Help.jsx's "Inviting a collaborator" article is rewritten to match. It currently promises "Full Access: view and edit everything across the planner, website builder, and Guest Suite", "View Only: see all pages", "Changes made by collaborators are saved to your account", and removal "at any time", which is true only after 1a. New copy is recorded verbatim in the PR body for the owner.
   - Guards: the picker renders exactly the phase-1 set; the server refuses view on Budget for a grant that names Budget; the email for a two-page grant contains "Event details" and "Guest list" and not "edit"; the Seating key.

7. Phase 2 scout, then STOP.
   - For Budget, Schedule, Music, Invitation, Table, VenueAsset, RegistryItem, Vendor and MoodboardItem: propose a collaborator read and write path server side that does not widen RLS, following the Guest pattern.
   - Per entity, say: what the owner's page reads; whether the read can be served from data that is already open, or needs a Base44 hosted function using asServiceRole (BASE44_PLATFORM_NOTES.md, "Hosted functions"); how a write would be attributed so it is not stamped anonymous; and the effort, in PRs and guards.
   - Read only. Stop for a ruling.

## Handover to lane B

What the marketing site and machine-readable surfaces claim about collaboration today, for the owner to hand over:

- src/pages/Features.jsx:198: bullets "Invite your partner or planner", "Set role-based permissions", "Assign tasks with deadlines", "Real-time collaborative updates", "Shared vendor & budget views", "Manage who sees sensitive data". The vendor and budget claim is false today and stays false until phase 2; tasks and real-time updates have no collaborator path at all.
- src/pages/FAQ.jsx:46-47: "Collaborators can be given access to specific parts of the planning process, like the guest list." True once item 6 ships.
- public/llms.txt:7: "A partner, planner or family member can be invited as a collaborator to help plan."
- src/lib/marketingSeo.js:98: the FAQ description names collaborators.
- prerendered/features/index.html and prerendered/faq/index.html carry the same text as their pages.

## Stop conditions

As CLAUDE.md. Any held-list or do-not-touch file outside the named exceptions: stop and report. Never read or write a non-owner record outside the stubbed guards. Never print a secret. Never run a guard listed in LIVE_CREDENTIAL_GUARDS. Items 1a, 1b, 1c and 4 are held, and so is any PR touching src/lib/collaboratorEmailTemplate.js or api/collaborator-revoke.js: print the five-marks block for each and wait for the line. Item 1b's resend invalidation waits for the owner to add CollaboratorInvite. Item 7 stops for a ruling.

## State

As of 2026-10-12:

- 1a merged as #963 (revoke, permission edits, reconcile on open).
- 1b merged in three PRs: #967 (7-day expiry), #981 (CollaboratorInvite mirror) and #982 (a resend or a removal kills the old link). The live round trip, tests/persistence/collaborator-invite-live.mjs, is run only by the owner, with the smoke account.
- 1c merged as #986: the accept link is always on the app host, and every send carries a nonce, so no two links are ever equal.
- 2 merged as #991: withCollab keeps the session on every navigation. Help and Account open as the person's own pages (owner ruling 2026-10-11).
- 3 merged as #999: no Ava in a collaborator session.
- 6 merged as #1002: a collaborator with view on Guests reads the owner's list, derived fields stripped; PUT and DELETE are 403 with the ruled words. Live: no token is a 401 where it was a 503.
- The LiveStream isolation scout found no leak (owner ruling 2026-10-11). #1000 makes tests/persistence/ownership.mjs prove isolation on an owner-scoped entity with a second real account (BASE44_TEST_EMAIL_2), never a fabricated id in q.
- 7 scouted, and ruled 2026-10-12: a Base44 hosted function reads the nine owner-scoped entities for collaborators, checking the grant itself on every call; then writes for Schedule and Moodboard only, each held. Budget, Vendor and Invitation stay view only.
- 7 setup merged as #1011: collaborator hashes and invite links use COLLAB_HASH_KEY, never BASE44_ADMIN_KEY (owner ruling 2026-10-12). The key was rotated before the merge. Every grant and invite link made before it stopped matching. The rebuild script, scripts/collab-grants-rebuild.ts, is not being run: both known collaborators are test accounts and are re-invited from the smoke account's dashboard when next needed (owner, 2026-10-12).
- Next: 7, PR 1 (the hosted function, held), then PR 2 (the Vercel caller), then 5 and 4.

## Findings

- For the weekly digest's eventual restore (found 2026-10-11, in the LiveStream isolation scout). api/cron/send-weekly-digest.js is not scheduled in vercel.json. It reads Table, Note and VendorTask with the admin key, and all three have owner-scoped read, so the admin key gets empty lists (BASE44_PLATFORM_NOTES.md, "The admin key is not a superuser bypass"). The unassigned tables, tasks due this week and vendor tasks due lines can never fire. The fix, when the cron is restored, is the same per-entity read path item 7's phase 2 scout covers. Its other reads (Guest, RsvpResponse, WeddingDetails, Questionnaire, QuestionnaireResponse, PollVote, PollComment) are open-read and work.
- The 26 entities with owner-scoped read, as of 2026-10-11, go with that fix: Budget, Collaborator, CustomEventPage, Hotel, Invitation, LiveStream, MoodboardItem, Music, Note, Photo, QuoteRequest, ReceivedGift, RegistryItem, RlsExperimentThrowaway, Schedule, StoryMilestone, StreamChat, Table, Task, UserPayment, Vendor, VendorBooking, VendorLog, VendorTask, VenueAsset, VowSpeech. Notification is scoped on data.recipient_user_id instead.

## Lessons

- A shared test helper changing on main is a crossing for every open PR whose guard imports it (owner ruling 2026-10-11, at #999, when #998 changed tests/persistence/_shared.mjs). The test is to run that guard against main's copy on the scratch merge. A pass is the verdict.
- Two sends in the same millisecond with the same payload signed the same token, so a resend could fail to kill the old link. Found as a flake in a stubbed guard, fixed with a nonce per send in #986. A guard that freezes the clock makes that case run every time.

## Close

Lessons section, then the last line: "Closed <date> at main <full SHA>, PRs <list>". Then the end-of-goal report. Tell the legal reviewer: collaborators are third parties reading a couple's data, including the guest list from item 6; removal did not revoke access before item 1a, and collaborators removed before reconcile ran kept access until their couple next opened the modal; invite links never expired before item 1b; the accept link's host was client-supplied before item 1c. Hand the Handover list to lane B.
