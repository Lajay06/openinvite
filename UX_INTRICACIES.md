# UX Intricacies — Openinvite couple-facing journeys

Read-only audit of `main`, walked as a skeptical first-time couple. Every finding
cites exact file:line. "Severity" is one of: **blocks couples** (data loss, dead
end, or literally cannot proceed), **feels broken** (confusing/janky but
workaroundable), **cosmetic** (minor polish).

Note on timing: at audit time, PR #63 (email template consolidation) and PR #64
(send-flow fixes) were open but **not yet merged to `main`**. Findings under
"Send invite/reminder/update/thank-you" reflect `main` as it stands today,
without those fixes; where a finding is already addressed by an open PR, that's
noted explicitly so it isn't double-counted as new work.

---

## Journey: Onboarding → wedding setup

**1.** Category: (a)/(b) — no persistence until the very last step
Location: `src/pages/Onboarding.jsx:71-88` (`onboardingData` — plain `useState`, no localStorage, no autosave) + `:174-209` (`saveOnboarding` — the only place anything is written to Base44)
Severity: **blocks couples**
Fix: Persist progress incrementally (e.g. a draft `WeddingDetails` record updated per step, or localStorage) so a refresh or closed tab doesn't erase everything a couple just entered across up to 13 steps.

**2.** Category: (b)/(d) — silent save failure still shows "success"
Location: `src/pages/Onboarding.jsx:210-212` (`catch (err) { console.error(...) }` — swallows the error) + `:142-145` (`handlePathB` calls `saveOnboarding` then unconditionally advances to the completion screen regardless of whether it threw internally)
Severity: **blocks couples**
Fix: If `saveOnboarding` fails, show an error and keep the couple on the current step — don't advance to "you're done" when nothing was actually saved. (Compounding bug: because `onboardingCompleted` is only set at the end of the same try block, a failed save also means `Onboarding.jsx:110` will bounce them back to `welcome` next login, with no memory of what happened.)

**3.** Category: (c)/(a) — wedding slug has no uniqueness check
Location: `src/pages/Onboarding.jsx:158-159` (`slug: couple1Name.toLowerCase().replace(...) + '-' + couple2Name.toLowerCase().replace(...)`)
Severity: **blocks couples**
Fix: Two couples with the same or similar names collide on the exact same `/w/:slug`; check for an existing slug and append a disambiguator before creating the record.

**4.** Category: (d) — "Quick setup" still saves the detailed path's partial data
Location: `src/pages/Onboarding.jsx:142-145` (`handlePathB`) calling `saveOnboarding('quick')`, which unconditionally runs `:176-207` (guest list, budget, vendors, moodboard creation) regardless of the `path` argument
Severity: **feels broken**
Fix: A couple who explored a few Path A steps then backed out to "Quick setup" gets those partial entries silently created anyway — either clear `onboardingData`'s Path-A fields on `handlePathB`, or make the label honest about what carries over.

**5.** Category: (e) — no guidance if `saveOnboarding` never populates the dashboard
Location: `src/pages/Onboarding.jsx:215-220` (`handleCompletion` calls `navigate('/Dashboard')` with no verification a `WeddingDetails` record exists)
Severity: **feels broken**
Fix: Confirm the record was created before navigating away from onboarding.

---

## Journey: Events create/edit/delete

**6.** Category: (a) — ceremony and reception can never be deleted
Location: `src/pages/EventDetails.jsx:705-710` (`handleDeleteCustom` only operates on `preWeddingEvents`/`postWeddingEvents` — no equivalent for `mainCeremony`/`reception`)
Severity: **feels broken**
Fix: A couple having an elopement + reception only, with no formal ceremony, can't remove the "Ceremony" section — it and its always-on invite-toggle chip stay forever. Allow marking main events as "not applicable" rather than making them structurally permanent.

**7.** Category: (b)/(e) — deleting a custom event doesn't warn about invited/RSVP'd guests
Location: `src/pages/EventDetails.jsx:705-710` (generic `window.confirm('Remove this event?')`, no guest count, no check of `Guest.event_responses`)
Severity: **feels broken**
Fix: Show "N guests are invited to this event" before deleting, matching the guest-delete-warning fix suggested below.

**8.** Category: (b) — deleted event's guest RSVP data becomes permanently unreachable
Location: `src/pages/EventDetails.jsx:709` (`update({ [key]: list.filter(e => e.id !== evId) })` — touches only `WeddingDetails`, never touches any `Guest.event_responses`)
Severity: **feels broken**
Fix: A guest's prior RSVP/meal-choice for that event isn't deleted from their record, but with the event gone from `getWeddingEvents()`, no UI ever iterates it again — the couple can't recover what a guest said even if they immediately regret the deletion. At minimum, warn that this data becomes inaccessible.

---

## Journey: Guest add/import/edit/invite/re-invite/remove

**9.** Category: (b) — CSV import has no duplicate-guest check
Location: `src/components/guests/ImportGuestModal.jsx:95-105` (`handleImport` loops `Guest.create(guestData)` per row with no lookup against existing guests by email/name)
Severity: **feels broken**
Fix: Importing the same list twice (common when a couple re-exports and re-imports from a spreadsheet) silently duplicates every guest; check by email before creating.

**10.** Category: (b) — guest delete doesn't mention what's actually lost
Location: `src/pages/Guests.jsx:141-142` (`window.confirm("Delete this guest?")`)
Severity: **feels broken**
Fix: If the guest has `event_responses`/RSVP data, say so ("Delete Sam? Their RSVP responses will be permanently lost") instead of a generic prompt.

**11.** Category: (c) — resending to one already-invited guest is a hidden multi-step path
Location: `src/pages/Guests.jsx:258-265` (`openSendForSelection` defaults to `filter: 'not_invited'` when nothing is checked — the unified hub dropped the old per-row "Resend" quick-action that used to exist on `InvitationsTab`)
Severity: **feels broken**
Fix: Add a per-row resend affordance so "they said they didn't get it, resend" doesn't require manually finding and checking that one guest's row first.

---

## Journey: Send invite/reminder/update/thank-you

**12.** Category: (f) — two completely disconnected "email a guest" systems
Location: `src/pages/Guests.jsx:464-465` (Email templates tab → `EmailTemplates.jsx`, sends via `base44.integrations.Core.SendEmail` at `EmailTemplates.jsx:144`) vs `src/pages/Guests.jsx:496-504` (Send invites drawer → `SendInvitesModal.jsx`, sends via `/api/send-invites` → Resend)
Severity: **blocks couples**
Fix: Neither shares a template, tracking field, or "sent" record with the other — a couple using the Email templates tab has zero record anywhere that they emailed anyone, and the "Invited"/"Last sent" badges elsewhere never reflect it. *(Already addressed in open, unmerged PR #63 — retires this tab into a gallery over the same send path.)*

**13.** Category: (b) — the "RSVP reminder" preset has no RSVP link anywhere in it
Location: `src/components/guests/EmailTemplates.jsx:19-20` (body text) and `:72` (`VARIABLES` array has no `{{rsvp_link}}`) and `:117-121` (`applyVars` never resolves one)
Severity: **blocks couples**
Fix: A guest receiving this "reminder" literally cannot RSVP from the email — there's no link in the body or the variable list. *(Already addressed in open, unmerged PR #63.)*

**14.** Category: (c) — no "update" or "thank-you" send type exists in the real send path
Location: `src/components/guests/SendInvitesModal.jsx:123` (`isReminder` — a boolean, only 2 states) vs the 5 presets in `EmailTemplates.jsx:9-70` that are the disconnected system from finding #12
Severity: **feels broken**
Fix: *(Already addressed in open, unmerged PR #63/#64 — adds a 5-way type selector to the real send drawer.)*

**15.** Category: (e) — no live rendered-email preview until Step 2 of 4
Location: `src/components/guests/SendInvitesModal.jsx` (`previewSubject`/`previewBody` computed at `:228-229`, only rendered inside the Step 2 branch at `:564`) — invisible during guest selection (Step 1) and channel choice (Step 3)
Severity: **cosmetic**
Fix: *(Already addressed in open, unmerged PR #63 — permanent split-pane preview.)*

**16.** Category: (a) — no way to test-send yourself before a real send
Location: `src/components/guests/SendInvitesModal.jsx` (no "send test" affordance anywhere in the current file)
Severity: **feels broken**
Fix: *(Already addressed in open, unmerged PR #63/#64 — "Send test email to me".)*

---

## Journey: View responses

**17.** Category: (e) — Dashboard's RSVP chart collapses per-event responses into one status
Location: `src/pages/Dashboard.jsx:144-146` (`guests.filter(g => g.rsvp_status !== ...)` — reads only the single overall `rsvp_status`, never `event_responses`)
Severity: **feels broken**
Fix: A guest attending the reception but not the ceremony shows as a flat "attending" with no per-event breakdown; add one or label the chart as an overall-status summary.

**18.** Category: (f) — an orphaned duplicate Q&A page sits alongside the real one
Location: `src/pages/GuestSuiteQandA.jsx` (read-only, no sidebar link, unreachable except by typing the URL) vs `src/pages/QandA.jsx` (the real, linked, editable page — sidebar links here)
Severity: **cosmetic**
Fix: Delete `GuestSuiteQandA.jsx` — a couple who somehow lands on it directly sees a dead, non-interactive page that looks like a bug.

---

## Journey: Guestbook moderation

**19.** Category: (e) — no pre-moderation; anything posted goes live immediately
Location: `api/guestbook-submit.js` (no `approved`/`pending` field anywhere; every submission is immediately visible on the published site)
Severity: **cosmetic**
Fix: Reasonable for a guestbook (matches a physical one), but couples used to comment-moderation elsewhere may expect a review queue — at minimum mention in the toggle's description that posts are live instantly, since delete (`src/pages/Guestbook.jsx:38-47`, confirmed present and confirmed) is after-the-fact only.

---

## Journey: Styling toggle

**20.** Category: (e) — the couple has no visibility into whether/how guests use this feature
Location: `src/pages/GuestSuitePolicies.jsx:262` (toggle label: `Show a quick "what to wear" questionnaire on the Styling page`) — this is a guest-only, ephemeral AI outfit-recommendation tool (`src/components/guest-website/pages/WeddingStylePage.jsx:146-165`, a stateless `InvokeLLM` call), not a data-collection survey
Severity: **cosmetic**
Fix: Not a bug — by design nothing is stored for the couple to review. Worth a one-line note in the toggle's own copy so a couple doesn't wonder later "did anyone actually use this?"

---

## Journey: Universe/texture change

**21.** Category: (c)/(d) — no warning that changing universe won't restyle already-sent invites
Location: `src/pages/StudioUniverse.jsx` / `src/components/studio/UniverseSelectedChoice.jsx` (universe-change flow has no messaging about already-sent emails or already-shared links)
Severity: **feels broken**
Fix: Add a note when switching universes after invites have gone out ("already-sent invitations keep their original style").

**22.** Category: (e) — 10 of 11 universes visually look unfinished with no signal in the picker
Location: `src/lib/websiteThemes.js:457-477` (`UNIVERSE_CONFIGS` — only `aman` has real `texture`/`motion` values; the other 10 are commented "not yet defined — they inherit flat/default behaviour until their phase")
Severity: **feels broken**
Fix: A couple picking Tulum, Kyoto, or any of the other 10 gets a visibly flatter, less polished result than Aman with zero indication in the selection screen that some options are less complete than others.

**23.** Category: (c) — every universe selection writes the same hardcoded `activeTheme`, decoupled from the actual choice
Location: `src/components/studio/UniverseViewBase.jsx:143` (`{ activeUniverse: id, activeTheme: 'still' }` — hardcodes `'still'` regardless of which universe `id` was picked) and `src/components/studio/AmanUniverseView.jsx:179` (same hardcoding, specific to Aman)
Severity: **feels broken**
Fix: `activeTheme` and `activeUniverse` are two overlapping theme concepts that fall out of sync the moment any universe other than the one `'still'` was designed for is chosen — parameterize `activeTheme` per universe or remove the redundant field.

---

## Journey: Publish site

**24.** Category: (b)/(d) — the wedding's URL slug can be changed at any time with zero warning
Location: `src/components/studio/guest-suite/StudioShareTab.jsx:96-97` (`updateField('slug', slug)` — no check for whether invites already went out, no confirmation)
Severity: **blocks couples**
Fix: Changing the slug after invitations have been sent silently breaks every `/w/{old-slug}` link already in a guest's inbox. Warn before saving, or keep old slugs redirecting.

**25.** Category: (f) — two separate, independently-reachable toggles control the same publish flag
Location: `src/components/studio/guest-suite/StudioShareTab.jsx:55-56,114-115` (`Publish Website` / `Unpublish` button) vs `src/components/studio/StudioSettingsTab.jsx:74` (a second, separate toggle switch) — both write `websiteEnabled` on the same `WeddingDetails` record from different tabs
Severity: **feels broken**
Fix: Consolidate to one control, or ensure both reactively reflect the same live state so toggling in one place doesn't leave the other showing stale status until a refresh.

**26.** Category: (a)/(e) — a dead "Publish" button lives in unreachable code
Location: `src/pages/StudioWebsite.jsx:502-507` (a full Publish button + `PublishModal`) — this page (`/website-editor`) has zero in-app navigation links to it anywhere (confirmed via repo-wide grep), so this entire publish flow is orphaned
Severity: **cosmetic**
Fix: Delete `StudioWebsite.jsx` and `PublishModal`'s usage here, or wire it in — right now it's dead code that could confuse a future contributor into thinking this is *the* publish path when the real one is `StudioShareTab.jsx`.

---

## Journey: Guest Suite pages

**27.** Category: (d)/(e) — the Registry page under Guest Suite has no way to add/edit/remove anything
Location: `src/pages/GuestSuiteRegistry.jsx` (confirmed via grep: zero `.create(`/`.update(`/`.delete(` calls anywhere in the file — only `.list()` reads at lines 178-180)
Severity: **feels broken**
Fix: A couple managing their Guest Suite setup naturally lands here expecting to manage the registry, hits a read-only dead end, and isn't told to go to the separate `Registry.jsx` planning-tool page instead. Add a clear link/CTA to where registry items are actually managed.

**28.** Category: (a) — removing an accommodation recommendation has no confirm or undo
Location: `src/pages/GuestSuiteAccommodation.jsx:429-432` (`handleRemove` — filters the place out and saves immediately, no `window.confirm`)
Severity: **cosmetic**
Fix: One misclick permanently drops a curated place (which may have taken a Places search + manual curation to find); add a confirm or an undo toast.

**29.** Category: (a)/(f) — live-stream widget can leak another couple's stream
Location: `src/pages/GuestSuiteLiveStream.jsx:42` (`base44.entities.LiveStream.list('-created_date')` — takes the globally most-recent `LiveStream` record with no `created_by_id` scoping)
Severity: **blocks couples**
Fix: On a multi-tenant Base44 app, this can surface a different couple's live-stream link/details to the wrong guest-facing page. Scope the query by the wedding's `created_by_id`, matching the pattern already used elsewhere (`resolveMyWedding.js`).

**30.** Category: (f) — Guest Suite policies exist as two separate UIs writing the same field
Location: `src/pages/GuestSuitePolicies.jsx` (writes `weddingPolicies` via its own form) vs `src/components/studio/guest-suite/PoliciesTab.jsx` (a second, independent UI inside the `StudioGuestSuite` hub, writing the same `weddingPolicies` field via a different route)
Severity: **cosmetic**
Fix: Same risk as finding #25 — two editors for one field, no shared state, so a change in one isn't reflected in the other without a reload.

---

## Top 10 (ordered by severity)

1. **#12** — Two disconnected send-email systems mean the "Email templates" tab leaves zero record anywhere that a guest was contacted. *(Guests.jsx:464-465 / EmailTemplates.jsx:144 — fix in flight, PR #63)*
2. **#13** — The "RSVP reminder" preset email has no RSVP link at all — a guest literally cannot respond from it. *(EmailTemplates.jsx:19-20,72 — fix in flight, PR #63)*
3. **#1** — Onboarding has zero persistence until the final step; a refresh mid-flow erases everything a couple entered. *(Onboarding.jsx:71-88,174-209)*
4. **#2** — A silently-failed onboarding save still shows "you're done" and can trap the couple in a no-data limbo on next login. *(Onboarding.jsx:210-212,142-145)*
5. **#24** — The wedding's public URL slug can be changed anytime, silently breaking every already-sent invitation link. *(StudioShareTab.jsx:96-97)*
6. **#29** — LiveStream lookup has no tenant scoping — a real cross-account data-leak risk, not just UX friction. *(GuestSuiteLiveStream.jsx:42)*
7. **#3** — Wedding slugs aren't checked for uniqueness at creation, risking silent collisions between two couples. *(Onboarding.jsx:158-159)*
8. **#6** — Ceremony and reception can never be deleted or marked not-applicable, forcing every wedding into a two-event shape. *(EventDetails.jsx:705-710)*
9. **#9** — CSV import has no duplicate check, silently doubling a guest list on re-import. *(ImportGuestModal.jsx:95-105)*
10. **#27** — The Guest Suite Registry page is entirely read-only with no pointer to where registry items actually get managed. *(GuestSuiteRegistry.jsx)*
