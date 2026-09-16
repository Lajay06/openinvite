# Run 5 — the owner's specs, verbatim

**Why this file is in the repo and not in a session scratchpad.** The T10–T15
message was lost when a session rolled over: the summary kept the labels and
the order, the specs themselves were in no transcript still on disk, and the
owner had to re-send them. A session scratchpad lives in `/private/tmp` and is
exactly the thing that does not survive. This file is the run's spec of record.

Nothing here is edited, summarised or reordered. Each block is the owner's
message as it was sent, in the order it arrived.

**Order:** T1 → T2 → T3 → T9 → T5 → T4 → T6 → T7 → T8 → T10 → T11 → T12 → T14
→ T15 → T13 (diagnosis only). Then the launch smoke on main, then the Run 5
report.

---

LAUNCH RUN 5 — two owner findings, pre-launch. MINOR self-merge on green; HELD with marks otherwise. Report at the end.

T1 fix/custom-page-in-nav — DIAGNOSE FIRST, then fix. Owner repro today on production: in the design studio, add a brand-new custom page → it can be created and edited, but it does not appear in the guest-site navigation and cannot be dragged into the main page list. R9 was reported done in Run 3 — state what R9 actually shipped (PR, SHA, what it changed) and why the owner still sees this. Then fix: a new custom page is enabled by default, appears in the nav in the position it was created, and is reorderable with the standard pages (same drag list, same persistence). Guard: create a page in a fresh process → it renders in the published nav and its position survives a reorder + reload.

T2 fix/sample-banner-preview — the white "this is sample content…" banner shown while editing must not render in Preview (the device preview in the studio and the Preview action) or on the published site. Editing view only. Guard: banner present in edit, absent in preview, absent in /w/<slug>.

Order: T1 → T2. Then re-run the launch smoke on main and stop.


========================================


LAUNCH RUN 5 — continued (owner walkthrough of the check-list, 2026-09-16). T1 and T2 stand as specified. MINOR self-merge on green; HELD with marks otherwise; owner-facing copy is calm-pass, no emojis, US English. One report at the end.

T3 fix/ava-modal-one-shell — every page-level "Ask Ava" opens ONE shared modal shell in the flat brand (flat pink/strawberry, no gradients, no navy, no legacy "AI" icon; the Ava mark once, in the title). Title reads "Ask Ava — <page name>"; quick actions as the page defines; sections collapsed by default where the modal has sections. Enumerate every page-level entry point (follow imports, not grep of the label) and for each report: today's target (page modal / global pod / legacy component) and its styling. Owner's rulings from the walkthrough:
  - pink/purple gradient header (Guest list, Moodboard, Styling, Beauty, Music, Photography, Vendors, Marketplace, Transport, Accommodation, Budget, Registry, …) → flat shell.
  - navy legacy modals (Wedding party, Vows & speeches "AI vows and speech writer", the details page) → the shared shell; Vows keeps its writer function inside the shell at modal scale, sections collapsed.
  - openers that go to the global pod (Seating, Guest gifts, and any other) → page modal with that page's actions. This supersedes the earlier "owner's call" on Seating/Wedding favours: the owner has now called it.
  - button labels read "Ask Ava to <do the thing>" everywhere; a bare "Ask Ava" is a defect.
Guard: for every entry point, click → role=dialog with the shared shell class and the page's title; no gradient/navy class present; pod count unchanged. Likely out of MINOR — HELD with the full list.

T4 fix/studio-landscape-notice — (a) copy: "Turn your phone sideways, or use a desktop for the best experience." (b) in landscape on a phone, a status pill (green dot · openinvite.com.au/w/<slug> · "website builder") overlays the top of the studio; find what renders it and either hide it below the md breakpoint or dock it so nothing overlaps the canvas. Guard at 844×390. MINOR.

T5 fix/country-picker-full — the picker offers ~10 countries; it must offer the full ISO list with dial codes, searchable, default from the venue country else AU, with a small flag beside each. Flags are local SVG assets (bundled), NOT emoji — the no-emoji rule applies. Neat: flag · country · +code in one row, 12/14 type. Guard: list length ≥ 200, search "new z" → New Zealand +64, no emoji code points in the rendered picker. MINOR if in class.

T6 fix/experiences-itinerary-links — (a) the placeholder square still renders beside itinerary items (e.g. "Check in at Crown Sydney") — it goes, same rule as the photo band. (b) each itinerary item shows, under the description, "Website" when the place has one and "View on map" when it has a location — both when both exist; hotels/restaurants/bars favor Website, walks/parks favor map, but show whichever the data has. Data comes from the same Google Places fields as Stay. Guard: item with both → two links; item with neither → none; no placeholder element. MINOR if in class.

T7 fix/experiences-favorites-count — DIAGNOSE FIRST: the owner selected four favorites; the Experiences page shows two. Report where favorites are stored, where the page reads them, and why two are dropped (filter, limit, dedupe, category?). Then fix so every selected favorite renders. Guard: four selected → four rendered.

T8 fix/stay-website-at-add — a stay added today via Google search (Shangri-La) shows only "View on maps". The add path stores name/place/address but not the place's website. Fetch and store the website at add time (Places Details `website` field) for Stay AND for Experiences places; existing stays untouched (no sweep). Guard: add a place with a website → link renders. MINOR if in class (api/ touch → HELD).

T9 fix/whatsapp-honest-gate — owner ruling: the feature stays; the "connect" theater goes. The send button is no longer gated on a stored number. In its place, one line beside the send action: "Opens in your WhatsApp app — messages send from the account you're signed in to." The couple's number field stays, relabeled "Your WhatsApp number (for guests to message you)", feeding only the QR. Guard: send available with no number stored; QR still uses the number. MINOR.

Order: T1 → T2 → T3 → T9 → T5 → T4 → T6 → T7 → T8. Then the launch smoke on main, and the Run 5 report.

========================================

LAUNCH RUN 5 — additions T10–T15 (re-sent verbatim, 2026-09-16)
Order after T8: T10 → T11 → T12 → T14 → T15 → T13 (diagnosis only).

T10 fix/media-stock-select — Media library, Stock photos tab: clicking a stock photo loads, then the pane goes blank and nothing appears selected; the photo has in fact been added under Uploaded. Ruling: clicking a stock photo selects it immediately and closes the picker with that photo applied (same as choosing an uploaded one); no copy into Uploaded, no second step. Guard: click stock → onSelect fires once with that URL, picker closed, Uploaded count unchanged. MINOR.

T11 fix/media-uploads-persist — the Uploaded tab is empty every time the library or the studio is reopened, though the files exist in the back end. Ruling: Uploaded lists every asset this wedding has uploaded, from the back end, every time it opens (newest first), with what is already used marked. DIAGNOSE where uploads are stored (Base44 UploadFile URLs on the record? a MediaAsset entity? Cloudinary folder?) and read from that source — no new entity without my word. Guard: upload in one session, reopen in a fresh process → listed. MINOR if in class; HELD if it needs api/ or schema.

T12 fix/email-templates-page — Guest list → Email templates: (a) the first card ("Save the date") has no header while the others do; add it. (b) the thumbnails are the generic beige set even when a universe is selected — they must render in the selected universe, generic only when none is chosen. (c) add a one-line note with a button: "Email designs are edited in the Design studio" → opens the studio on the email templates. MINOR if in class.

T14 fix/send-invites-save-the-date — Send invites → "Choose the email type" lists Invitation, Reminder, Event update, Thank you… but NOT Save the date, though the template exists. Add it as the first type, wired to the existing save-the-date template and the same send path; the drawer opened from the template card pre-selects it. Guard: type list contains save-the-date first; sending one records it like any other type. HELD if api/send-invites.js changes; MINOR otherwise.

T15 fix/universe-hero-focus — universe picker and heroes: London heads cut off (focus too high) · Kyoto couple low with empty space above (lift) · Edinburgh couple + dogs too low (lift, center them) · Monaco couple at the bottom (lift into frame). Shanghai is the reference for how visible the couple should be. Adjust heroFocus / object-position for those four only; nothing else changes. Universe configs are outside MINOR → HELD: send the four before/after values and a 390 + 1440 screenshot pair per universe for the owner to approve before the line. (Havana photo swap: owner will supply a new file later — not this run.)

T13 plan-gating — DIAGNOSE FIRST, READ-ONLY, report before any code. Owner intent: email templates, send invites and digital-invite features are Ultra-tier; non-Ultra accounts see them greyed with an "Ultra" badge (visible, as marketing), not hidden. Report: the plan tiers the product actually has (names, source of truth), what PLAN_FEATURES says about these features today, where the current gate (if any) lives, which accounts (owner's main, smoke01, the fixtures) would be affected and how, and what the launch smoke (send step 7) would do under the gate. The payments path is FROZEN and plan* is outside MINOR — no code without my ruling.

T13 ruling (applies once the diagnosis matches): tiers are Pro (planner) and Ultra (guest suite + invitations), pay once. Email templates and Send invites are Ultra. Gate them with the SAME mechanism that already gates the guest suite for Pro — no new plan logic, no new field, nothing under payments/checkout. Non-Ultra sees the cards and the Send invites entry greyed with an "Ultra" badge (flat brand, no emoji); click → the existing upgrade prompt; Ultra unchanged. Email templates stay under Guest list for launch. Before building: confirm the owner's main account and smoke01 read as Ultra; if either does not, STOP and report — never change any account's plan. HELD if plan* files are read; no Payments-Change trailer (read only). Guard: Pro fixture → greyed + badge + disabled send + upgrade prompt; Ultra fixture → unchanged; smoke passes.
