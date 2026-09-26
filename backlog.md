# Backlog

Work that has been identified, scoped and deliberately deferred. Not a to-do
list for the product — that lives in the app. This is for findings that came out
of a run, are worth doing, and were not that run's job.

An entry says what to do and, where it matters, what NOT to do. An entry that
only names a topic is a reminder, not a task, and reminders rot.

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
