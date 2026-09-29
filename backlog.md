# Backlog

Work that has been identified, scoped and deliberately deferred. Not a to-do
list for the product — that lives in the app. This is for findings that came out
of a run, are worth doing, and were not that run's job.

An entry says what to do and, where it matters, what NOT to do. An entry that
only names a topic is a reminder, not a task, and reminders rot.

---

## Unread rsvpCta values

19 universe rsvpCta values are unread since #866 (button is global "Send my
link"). Remove in a copy-cleanup pass, with the ruling doc amended, not before.

---

## British spellings outside the diff-based guard

British spellings outside the diff-based guard: `'display is honoured'` in
`tests/persistence/publish-parity.mjs`; `recognisedToken` and
`recognise`/`recognised` comments in `WeddingRSVPPage.jsx` / `RSVPPage.jsx`. One
sweep, rename with care (`recognisedToken` is an identifier).

---

## Good to know has no row in the studio page list

Good to know has no row in the studio page list (WBLeftPanel / WEDDING_PAGES):
couples cannot see, toggle or reorder it; visibility is derived from
`weddingPolicies[*].display` + content. Needs a row with a switch and a
decision: switch replaces the derived rule, or AND/OR with it. No data
backfill — default the switch to the derived value.

---

## Guest notes — no erasure path

Guest notes — no erasure path: GuestMessage delete is owner-scoped and
admin-written rows are anonymous; needs a mediated delete endpoint (couple
deletes a guest's note on request). Same class as RsvpResponse.

---

## Dead handlers sweep

Handlers declared and never wired. Two found so far, both by accident rather
than by looking:

- **`handleAddPlaylist`** (`src/pages/Music.jsx`) — declared, never called, so
  "Create playlist" did not exist as a control. Found 2026-09-26 while wiring
  the playlist field; `eslint` had been reporting it as unused the whole time.
- **The Music track CRUD** (round two, item 12) — `addTrackMutation`,
  `updateTrackMutation`, `deleteTrackMutation`, an approve toggle and a
  `playlistTracks` query, none of them rendered. A couple's songs were real
  records with no screen in the product that showed them.

Twice on the same page is a pattern, not a coincidence: something is shipping
handlers without their controls, and the failure is invisible — an unreferenced
handler builds, lints to a warning, and reads as a working feature to anyone
scanning the file.

**The task:** one pass over `src/pages` and `src/components` for functions named
`handle*` with zero JSX references. **Report, don't fix.** Some will be dead
code to delete and some will be missing controls to build, and those are
different decisions with different owners — a sweep that silently deleted the
second kind would remove the evidence that a feature was never finished.

Worth noting for whoever runs it: `eslint`'s `unused-vars` already finds most of
these and is configured as a warning, so they do not fail CI. The report is the
deliverable, not a lint rule change.

---

## pageGuidance.js unread since the Studio tour

`src/lib/pageGuidance.js` is unread since the Studio tour (#872); fold any
purpose/actions text worth keeping into the chapters, then delete.

---

## guest-font-effect passes on a contrast failure

`guest-font-effect` reports 2 text elements below 4.5:1 on /w/ routes and still
passes; either fix the contrast or make the guard fail on it.
