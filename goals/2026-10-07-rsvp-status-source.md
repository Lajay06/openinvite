# RSVP status has one source

Ruling on item 3 of goals/2026-10-06-per-event-follow-up.md. A guest's status is derived from event_responses everywhere. The flat Guest.rsvp_status column is a legacy landing field: writers may still set it, nothing reads it for display. When the couple records a status by hand, that becomes a real per-event answer, so the chips, the counts and the tally agree and nothing is invented. The full-resolved-set contract from goals/2026-10-01-per-event-invitations.md applies to invitation writes (the Guests page control, bulk invite and remove, SetEventsModal). Status writes are a second kind of write with the narrower rule in item 2; put both rules in the header comment of the module that performs the write, with the public-site reason: an explicit invited: false is a removal under the 2026-10-06 ruling, so a status edit must never be able to create one.

## Items

1. Derive unconditionally. In the same endpoint, relax the skip at the top of the loop so a guest with stored event_responses on the Guest row still gets an overlay entry; only a guest with no RsvpResponse rows, no guest-level row, no plus-one status and no stored event_responses is skipped. Derivation stays server-side; resolveMyWedding.js is not touched. In api/my-guests-rsvp.js, drop the "eventRows ?" condition so rsvp_status is always deriveRsvpStatus(eventResponses). A guest with no per-event rows reads awaiting on every surface. Repoint TopBarSearch.jsx at the overlaid guests (getMyGuestsWithRsvp) so it stops showing the raw stored value. Fix guestStatusSortKey in GuestList.jsx: sort the Invited to column by the derived status rank, and remove the "Not yet invited" bucket that #886 deleted the chip for. Held PR.

2. Hand-recorded status writes per-event rows. In GuestForm.jsx, the guest editor's status control, and guestImport.js (CSV status column), choosing a status updates status and responded_at on the event_responses entries for every event the guest is currently invited to, and only those. A status write is not an invitation write: it never adds, removes or changes an invited key, never creates an entry for an event the guest is not invited to, and leaves every other entry byte for byte as it was. Where the guest has no stored entries at all, the write creates entries only for the events the resolver says they are invited to, carrying invited: true, that status and responded_at now. Choosing pending clears status on those rows to pending and responded_at to null. The flat column may still be written alongside; it is not read. Held PR.

3. Guards and fixtures. Grace case: flat attending, no rows, reads awaiting on the Guests page, the Daily update tally, the RSVP chart and search. Couple sets attending in the editor: rows exist for ceremony and reception only (not Welcome drinks, where she is not invited), chips read attending, per-event counts count her as replied, tally agrees. Import case: a CSV row with status attending produces the same rows. Status write on a guest with an existing explicit invited: false for Welcome drinks leaves that entry unchanged and the public event set unchanged. Status write on Grace with no entries creates ceremony and reception only, and publicEventIds still returns all three. Each guard proved red once.

## What else does this touch

The guest-site RSVP form reads the same rows, so a couple-recorded answer appears there as the guest's current answer and the guest can change it; that is correct. Seating reads attending from the derived value; unchanged. Ava context and the weekly digest already use per-event sources; confirm, do not change. Live couples: any existing guest with a flat status and no rows reads awaiting after item 1 until the couple sets it again; report the count of such guests on the fixtures only, never on production rows. Mobile: no layout change. Legal pages: no.

## Stop conditions

As CLAUDE.md, plus: no schema change; no new key inside event_responses entries (undeclared keys are silently dropped by the platform); getGuestEventResponse's defaulting rule is not touched, STOP if an item seems to need it; api/rsvp-submit.js and api/send-*.js not touched; no production row reads.

## Protocol

Two held PRs, item 1 then item 2, with item 3's guards split between them by subject. Diff guards after every commit, before every push. Print both pre-merge blocks together at the end in the narrow format with full 40-character head SHAs and the four checks by name.
