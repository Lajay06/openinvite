# Open tickets — build terminal

Written 2026-08-25. This file exists so ticket detail survives a context reset.
Strategy lives in the advisor's ledger; this is the operational list.

Standing protocol: report → advisor issues a **verbatim quoted authorization
line** → build → verify → merge. Every line is conditional on
`npm run pr:green <PR> ` exiting 0 at merge time; SKIPPED is not PASS. One PR at
a time, merged or closed the same session. Guest-facing UI needs **owner accept
on renders** before the merge request.

---

## THE FIX WAVE — next, one PR, owner accept before merge

From the owner's production walk of the RSVP flow (2026-08-25). The walk itself
PASSED end to end: landed inside the site on `taj`, correct universe line, both
primary buttons, per-event card, dietary pills, and the writes landed
(3 RsvpResponse rows, latest-wins intact, verified from Base44).

**F-A · PII never restored on the token path** — highest.
`NAME_PLACEHOLDER = '—'` (`api/_lib/guestProtectedFields.js:79`) is written into
the plaintext `name` column; the real value lives in the encrypted blob and is
restored only by `mergeGuestPii`. Three endpoints read PII **without** calling it:

| endpoint | reads |
|---|---|
| `api/rsvp-lookup.js` | `name`, `email`, `dietary_restrictions` |
| `api/rsvp-submit.js` | `name` — this is where "New RSVP from —" is built |
| `api/questionnaire-answer-submit.js` | `name` — a third notification nobody has reported |

`wedding-attendees.js` and `my-guest-links.js` already restore. `rsvp-poll-vote`
and `questionnaire-lookup` read no PII.

**Fix at `resolveGuestByToken` in `api/_lib/rsvpAuth.js`** — the write-boundary
rule applied to a read boundary. Fixes all seven callers at once; a narrow fix
would leave five silently wrong. `mergeGuestPii` is idempotent (re-reads the
blob, copies the same values) so the two already calling it are unaffected.
Consequence: this has NEVER worked in production — every recognised guest on
every wedding has seen "Hi —,". Not a regression from the embed; the embed put
it somewhere the owner finally looked.

**F-B · Meal preference must be opt-in.** Renders unconditionally today; should
appear only where the couple enabled meal options for that event. **Report the
governing setting BEFORE building** — there is a custom-meal-options concept
(see FoodBeverage's Ultra gate); if no per-event setting exists, report that and
propose the smallest one. Do not invent schema silently.

**F-C · Email field** — RULED: hide when we already hold an email for that
guest; show only when we do not (guests added by name alone, and the
never-emailed case). Label accordingly when shown. **Unanswerable until F-A
lands** — that path currently sees the placeholder for `email` too.

**F-D · Translucent surfaces.** Every input, select, textarea, pill and event
card is semi-transparent, so universe texture shows through and they look cheap.
Owner: "make them all full fill." Solid fill drawn from the **universe palette**
— not white, not gray. Check contrast on **all 19 palettes**, not just taj;
fine-stroke 4.5:1 still applies. Signature surface, treat as universe not chrome.
Folded in: **M-1** and **M-2** below.

**F-E · Remove the tick** on the confirmation state. Owner: "corny." Let the
typography carry it. Rest of that screen is accepted.

**F-F · Event cards lack detail.** Ceremony shows name + time only. Needs venue,
address, and whatever else the couple has set — a guest deciding whether they can
make the ceremony needs to know where it is.

**F-G · The 19 intros and 19 rsvpSent tails were never written.**
`git log -S rsvpIntro -- src/lib/websiteThemes.js` returns nothing; that field
has never been touched. `rsvpWelcome` (19 recognised lines) DID ship. The owner's
phone shows the original lost-property copy because that is what is in the file.
**Grep the accepted strings after writing them, per the landing-check rule.**
The accepted sets are in the conversation ledger — re-request them if lost.

**Hamburger tap target** — the guest-site mobile menu button
(`md:hidden ml-auto`) is **20px**. It is the only navigation a guest has on a
phone; a guest who cannot open it cannot reach the RSVP tab. Size to 44px in
this wave. The 17px masthead link waits for WEBKIT-PASS.

### Mobile findings (WebKit @ 390, verified)
- **M-1** — one inline `100vh` on the RSVP container. Under the Safari toolbar
  `100vh` resolves to the larger height and the section overshoots. Use `100dvh`.
- **M-2** — "Not you? Use a different invitation" is **37px**, under 44px. Mine.
- **M-3** — `overflowAfter: 1`. Zero horizontal overflow before the primary tap,
  ONE element after. **Identify during the build and report what it was; do not
  fix blind.**
- **M-4** — pre-existing sub-44px chrome: masthead 17px (→ WEBKIT-PASS),
  hamburger 20px (→ this wave, see above).

**What PASSED on mobile:** primary buttons 336×65/67, full width, above the fold
even at the toolbar-reduced 664px; zero overflow before tap; tap-through works
(counted in, both events, pills, submit). **No separate mobile RSVP surface
exists** — one implementation, restyled. No `isMobile`, no `matchMedia`, no
width-conditional route.

---

## QUEUED, in order

**INVITE-LINK-PREVIEW** — findings first, report in flight. Shared invite links
unfurl as technical rather than invite-forward. Must establish: served meta for
`/w/:slug` and `/rsvp/:token` as an unfurler sees it (crawler UA, not the SPA's
client-rendered head — unfurlers do not run JS); whether prerender produces
per-wedding meta or one generic snapshot; **the robots conflict** (#518 put
`Disallow: /api/ /rsvp/ /w/` on five named groups and `X-Robots-Tag
noindex,nofollow,noarchive` on `/w/`) for facebookexternalhit, Twitterbot,
Slackbot-LinkExpanding, WhatsApp, Discordbot, TelegramBot and whatever Apple
uses; the privacy consequence of allowing unfurlers, honestly, including that
`/rsvp/:token` IS a capability and the unfurl fires the moment the link is pasted
regardless of whether we answer; and the **Applebot** trade if the preview agent
is the indexing agent. **The robots answer decides whether this is a metadata
ticket or a policy ticket.** Target: preview as an invitation — couple's names,
date, hero photograph. **Never the guest's name or anything guest-specific** —
the card is fetched by a third party and can be screenshotted, so it must be
identical for every guest of that wedding. `/rsvp/:token` previews as the
wedding.

**PR 4 · change-your-reply** — show the current answer with an edit affordance
instead of jumping to done. **No data model change needed**: `RsvpResponse` is
append-only with latest-wins and `rsvp-submit` already documents that
resubmission creates new rows. `Guest.update` 403s under owner-scoped RLS —
that 403 is *why* append-only exists; do not route the change through `Guest`.

**HARNESS-FIXTURE-TRUTH** — `scripts/lib/renderHarness.mjs` seeds the
**decrypted** form of fields the product is supposed to decrypt, so every render
proved the personalisation worked by asserting it into existence. Offenders:
`rsvp-lookup` stub (`name`), `Guest` seed (`name`, `email`,
`dietary_restrictions`), `GuestMessage` seed (`guest_name`). Legitimate:
`PUBLISHED_WEDDING.slug` / `activeUniverse` — plain stored columns.
**The test: does the product TRANSFORM this on the way to the screen?** If yes,
seed the stored form and let the code do the work.

**EXPORT-OVERLAY-SILENT-FAIL** — `getMyGuestsWithRsvp` overlays
`/api/my-guests-rsvp` (which aggregates `RsvpResponse` latest-wins) over the raw
Guest rows. On failure it logs and returns raw rows — and the CSV then reports
**every guest as pending**, with nothing shown to the user. Either surface the
failure and refuse the export, or mark it unmistakably. Same family as the dead
Copy links button: a silent failure that looks like a result.

**NULL-SCRIPT-VERIFY-FIX** — `scripts/null-rsvp-plaintext.mjs`'s third VERIFY
assertion compares a **database-wide** recoverable count against
`targets.length`. It passed on the E3 run only because targets ≈ all rows, and
broke the moment the target set was 2. Correct it to "every TARGET row is still
recoverable" and add a control that fires.

**WEBKIT-PASS** — pre-beta, findings only. `GamesManager`'s copy-links was broken
in Safari and nobody reported it: the product has effectively been verified in
one engine, and the guest side skews further to Safari than the dashboard does.
Scope: guest list actions, invite sending, RSVP end to end, publish, exports,
studio copy/share controls. Classes to hunt: clipboard behind an `await`
(pinned now, but new sites can be written), programmatic downloads and
`<a download>`, `Intl`/date parsing, `100vh` under the toolbar,
`backdrop-filter`, sticky positioning, tap targets. `copylinks-webkit.mjs` is the
worked example of running both engines and reporting the difference.

**MESSAGES-GUARDS** — `src/pages/Messages.jsx:149` calls
`message.guest_name.toLowerCase()` unguarded and `:263` formats `created_date`
unguarded. One row missing either field crashes the page. Two defensive guards,
one PR.

**T2 GUESTMUSIC-CHROME** — build the approved spec (playlist = link card,
name-only requests). Closes the music-doubling finding AND the spec debt: the
playlist currently embeds twice, once on the in-site music page and again on
`/w/:slug/music`, and `WeddingMusicPage.jsx:17-19` documents the deferred
collapse in its own words. **Scope addition:** `GuestMusic.jsx` consumes NO
universe typography — it is the only guest page rendering both faces as
`Plus Jakarta Sans`, and is the owner's "single font" sighting.

**E1–E4 emoji batches** — 67 pictographic emoji in rendered code. Canon is about
**presentation**: a violation is any glyph rendering in the system emoji font,
and **U+FE0F is the tell**. Monochrome marks (✓ ✗ ▲ ▼ ▶ ★ ☆ △ ◆ ○ ↔ ↗ ♥ ❝ ✆ ✎)
are NOT violations; `✦` is an instance of the rule, not an exception.
- **E1 guest-facing**: `WeddingPollsPage:418`, `MultiPageWeddingWebsite:43`,
  `HotelRecommendations:309`, `RestaurantRecommendations:238`,
  `TransportationOptions:141`, `GuestAccommodation:111`, `GamesPage:153`.
  Owner accept.
- **E2 outbound templates** (sent in the couple's name — RULED: strip):
  `SendInvitesModal:26`, `WhatsAppCompose:25-28`,
  `api/cron/send-onboarding-emails.js:66,69`.
- **E3 marketing + Ava**: `RefundPolicy:41,45,50`, `Ava.jsx:172-173`. Hygiene
  only, NOT a redesign — the marketing direction reset stands. Report whether any
  other Ava surface carries non-`✦` glyphs.
- **E4 product chrome + structural**: the rest. `trialErrorToast.js:26` (🔓)
  specifically — it fires at the trial boundary, the moment of a payment
  decision and the home of "Your work is safe and yours". `DevReset.jsx` is
  dev-only: EXEMPT. Comment-only hits: leave.
- **STRUCTURAL, report before building**: `Polls.jsx` (13, `emoji:` as a
  catalogue data field), `AvaStudioAssets.jsx` (11, same shape),
  `InteractiveMap.jsx` (emoji passed into `createCustomIcon` as pin glyphs).
  These need a replacement MECHANISM — an icon token key, not a glyph. The
  advisor is commissioning an icon vocabulary; **do not invent one.**

**GUEST-TYPOGRAPHY-PARITY** (was T3 POLLS-TYPOGRAPHY; absorbs T2's typography
half) — **in the fix wave.** This is what the owner reported as "the font
combinations seem inconsistent, some pages have the right blend, some are just
one font". Swept 2026-08-25 across every guest-facing file; four offenders, all
the rest of the tree (20 masthead/footer/section-mark sets, twelve pages)
consumes both faces correctly:

| file | hard-coded | headingFont | bodyFont | what a guest sees |
|---|---:|---:|---:|---|
| `src/pages/GuestAccommodation.jsx` | 36 | 0 | 0 | entirely Plus Jakarta Sans — no typography plumbing AT ALL |
| `WeddingPollsPage.jsx` | 18 | 3 | 0 | universe headings, chrome body — the half-and-half |
| `WeddingWebsiteNav.jsx` | 1 | 0 | 0 | **the sneakiest** — one line, but the nav is on EVERY page, so even correct pages carry a wrong one |
| `src/pages/GuestMusic.jsx` | 1 | 0 | 0 | no universe typography at all |

`GuestAccommodation.jsx` serves `/w/:slug/accommodation` (App.jsx:189) — it has
no `resolveTypography`, no `universeConfig`, no `typography` reference of any
kind.

**THE SYSTEMIC FIX IS THE DELIVERABLE, not the four files.**
`GuestAccommodation` is NEW and shipped with no plumbing at all, which means
the next new guest page can do exactly the same and nobody will notice. Add a
probe that FAILS when any guest-facing file declares a font-face literal
instead of consuming `resolveTypography`, with an explicit allowlist for
anything genuinely exempt. The four fixes are cleanup; the guard is what makes
the defect unshippable. Same shape as the clipboard sweep's "no awaited
clipboard write remains anywhere in src".

**FONT-OVERRIDE-NOT-PUBLISHED** — also in the wave, but it explains a DIFFERENT
symptom and does not explain the owner's observation. `fontOverride` is written
by the studio (`WBRightPanel.jsx:213-215`), listed in `StudioWebsite.jsx`'s
writable fields, and read FIRST by `resolveTypography` — but it is absent from
`GUEST_SAFE_WEDDING_FIELDS`, so `wedding-by-slug` cannot return it (confirmed
against the live 44-key response). A couple who picks fonts sees them in the
builder and their guests never do. Latent today — `universeStyling.js` notes no
wedding has one set — and it bites the first couple who uses the picker.

**PREVIEW-NAV** — `?preview=true` only skips the password gate
(`weddingBySlug.js:18-19`). `WeddingWebsiteNav` builds plain `href`s with **zero**
preview references, so the first nav click drops preview mode and a couple on a
password-protected site lands in the gate. Make preview propagate through nav.
Three-buttons-one-destination is acceptable once nav holds. The 8 asset previews
ARE reachable via the Design studio (`UniverseWorldView`/`AssetGrid`) — no ticket.

**F4/F5 (motif cropping, alignment)** — blocked on the content-rich seed. The
guest-page sweep currently measures near-empty pages: `PUBLISHED_WEDDING` carries
the shell but no story blocks, photos, registry items or FAQ entries, so
`overflow=0 cropped=0` is an empty read, not a clean one.

**Item 7 · loading idioms** (feel-pass) — 76 files use `Loader2`, 59
`animate-spin`, 5 `Skeleton`, 2 `animate-pulse`. Chrome-only per the surface
line. Batch in: `"Photos coming soon!"` / `"No FAQs added yet."` exclamation
marks, and `Polls.jsx`'s 🗳️ if E4 has not taken it.

**DATE-GUARDS** — `/w/:slug/celebration` renders "Invalid Date Invalid Date".
Establish seed-shape vs genuine unguarded format first; if genuine, fold the two
`Messages.jsx` guards in — unguarded date formatting is one defect class.

**Micro list** — `CollaboratorAccept.jsx:52` zero-key crash · three
`1.5px dashed` empty-state wrappers · `UnmuteButton` zIndex 5 ·
`capetown`/`cape-town.jpg` convention hazard · `AIWeddingAssistant.jsx:254`
`shadow-sm` on a card (CLAUDE.md bans box-shadow on cards) ·
`scripts/lib/dividerSweep.mjs` has no importer — check whether superseded by the
CI-registered guards before retiring; do not delete on orphan status alone ·
`ScrollMorph` is routed but linked from nowhere (probable dead route, deletion is
its own decision) · six components orphaned by the homepage rebuild
(`HeroCollage`, `ValuePropSection`, `HorizontalScrollSection`,
`AvaSpotlightSection`, `UniverseMiniHero`, `UniverseTeaserSection`) — sweep
CANCELLED for now, they may return to service.

---

## WATCH FOR (free production verification)

**The two 16 Jul rows minting.** `6a58822ff96d2b9e2169cf16` and
`6a5881c9901dc3528b7534b2` are owner-scoped with `rsvp_link_id_enc` null. The
#539 backfill sweep fires on guest-list load and mints for exactly the rows
lacking a token. **Next time the owner opens their guest list, those two should
gain tokens and no others.** Report it when seen — it costs nothing and proves
the sweep.

**Owner's Safari retry of Copy links** (#543). Three outcomes, all informative:
copies (fix confirmed), fallback panel opens (activation fixed, permission
separately blocked), still nothing (hypothesis wrong, tell me immediately).

---

## PARKED

`feat/homepage-rebuild` @ `5211d01` — pushed, no PR. Substance quarry only. The
MARKETING-SITE workstream is ON HOLD; the LIVE marketing site is the reference
standard and no existing marketing page is rebuilt without a fresh owner
directive. New pages (comparison, trust) match the live design language.

`6a584d473aa3ab1ec180fcdc` — the `created_by: "anonymous"` Guest row. Untouched;
evidence. Deletion needs its own line. Live-path question is ANSWERED (no
anonymous path creates Guest rows today); which historical mechanism produced it
is archaeology and deliberately not being spent on.

Post-launch: `rsvp_link_id` / `plus_one_rsvp_link_id` undeclare batch (writer
stopped in #540, data purged, column undeclare last — see DECISION-LOG).
HttpOnly cookie for the RSVP token — only pays if the seven `resolveGuestByToken`
endpoints read it server-side; a non-HttpOnly cookie buys nothing over
localStorage. Do not half-build it.
