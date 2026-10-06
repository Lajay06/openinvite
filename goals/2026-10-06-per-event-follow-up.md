# Per-event follow-up

Small goal. Everything here is a consequence of goals/2026-10-01-per-event-invitations.md, closed at 46ff3a1f.

## Items

1. Personal link shows the guest's own set union the public set. In src/lib/guestEventVisibility.js, the events a recognised guest sees are the events they are invited to plus every event the public page shows. A guest can never see fewer events than a stranger. Add guard cases: 40 invited and 460 untouched, an untouched guest on their own link sees the event; one guest removed, that guest on their own link does not see it and the public page hides it; a removed guest and an untouched guest on the same wedding and the same event, opposite outcomes on their own links. Update the file header to the three rules (public, personal, union). Held PR.

2. Land the four item 6 guards held back from #893 because they assert UI from #886, #887, #889 and #892. The rsvp-submit guard is already covered by tests/persistence/rsvp-only-invited-events.mjs; do not duplicate it. Each guard must be proved red once by reverting the behaviour it pins, then green. Held PR, one PR for all four.

3. Report only, no code: when a guest has no per-event rows, Guest.rsvp_status (flat) can disagree with the per-event chips (Grace: attending versus awaiting). List every reader of the flat rsvp_status on main, say which ones also have a per-event source, and propose two rules for the advisor to choose between. Do not change behaviour.

## What else does this touch

Guest site public path (item 1 only). No schema change. No api/send-*.js. No email templates. Mobile: item 1 changes data, not layout; confirm the celebration page at 390 still has no horizontal scroll. Legal pages: no.

## Stop conditions

As CLAUDE.md, plus: no new schema key on mainCeremony or reception; api/rsvp-submit.js not touched (no exception in this goal); any change outside src/lib/guestEventVisibility.js, its guard, the four item 6 guards, their fixtures, and for item 2 only the shard registration in .github/browser-shards.json and the matching package.json script entries; rebalance shard seconds only if the measured total moves either shard by more than 60s, STOP and report.

## Protocol

Both PRs held. Run the diff guards (us-english, calm-copy) after every commit and before every push. Print both pre-merge blocks together at the end in the narrow format with full 40-character head SHAs and the four checks by name. Then the item 3 report.
