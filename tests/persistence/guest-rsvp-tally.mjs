/**
 * tests/persistence/guest-rsvp-tally.mjs
 *
 * Covers AUDIT_2026-07.md S21: 8 files reimplemented Guest.rsvp_status
 * tallying/filtering ad hoc (2 of them checking a 'confirmed' value that
 * doesn't exist in the schema and could never match), now consolidated
 * onto src/lib/guestRsvpTally.js. Pure logic, no live Base44/network calls
 * — a fixture covering all four enum values plus a plus-one, exercising
 * both the default (primary-only) and includePlusOnes modes.
 */

import { pass, fail } from './_shared.mjs';
import { tallyGuestRsvp, isAttending, isDeclined, isMaybe, isPending, isAwaitingPrimary, isAwaitingPlusOne } from '../../src/lib/guestRsvpTally.js';

// One guest per enum value, plus a 5th with a plus-one whose own status
// differs from the primary's, plus a 6th with an unset/undefined status
// (must count as pending, not throw).
const FIXTURE = [
  { id: 'g1', rsvp_status: 'pending',   invite_sent_at: '2026-01-01' },                          // awaiting (invited, still pending)
  { id: 'g2', rsvp_status: 'attending', invite_sent_at: '2026-01-01' },
  { id: 'g3', rsvp_status: 'declined',  invite_sent_at: '2026-01-01' },
  { id: 'g4', rsvp_status: 'maybe',     invite_sent_at: '2026-01-01' },
  {
    id: 'g5', rsvp_status: 'attending', invite_sent_at: '2026-01-01',
    plus_one_email: 'plusone@example.com', plus_one_rsvp_status: 'pending', // plus-one hasn't answered yet
  },
  { id: 'g6', rsvp_status: undefined, invite_sent_at: null },              // never invited, unset status
];

export async function runGuestRsvpTally() {
  const results = [];

  console.log('\n  guestRsvpTally — fixture covering all 4 enum values + a plus-one:\n');

  // ── Default (primary-only, matches every site except Guests.jsx) ────────
  {
    const t = tallyGuestRsvp(FIXTURE);
    results.push(t.attending === 2
      ? pass('tallyGuestRsvp default — attending count (g2, g5; plus-one excluded)', t.attending)
      : fail('tallyGuestRsvp default — attending count (g2, g5; plus-one excluded)', 2, t.attending));
    results.push(t.declined === 1
      ? pass('tallyGuestRsvp default — declined count', t.declined)
      : fail('tallyGuestRsvp default — declined count', 1, t.declined));
    results.push(t.maybe === 1
      ? pass('tallyGuestRsvp default — maybe count', t.maybe)
      : fail('tallyGuestRsvp default — maybe count', 1, t.maybe));
    results.push(t.pending === 2
      ? pass('tallyGuestRsvp default — pending count (g1, g6; plus-one excluded)', t.pending)
      : fail('tallyGuestRsvp default — pending count (g1, g6; plus-one excluded)', 2, t.pending));
    results.push(t.awaiting === 1
      ? pass('tallyGuestRsvp default — awaiting count (g1 only: invited + pending; g6 never invited)', t.awaiting)
      : fail('tallyGuestRsvp default — awaiting count (g1 only: invited + pending; g6 never invited)', 1, t.awaiting));
    results.push(t.total === 6
      ? pass('tallyGuestRsvp default — total (primary guests only, no plus-one)', t.total)
      : fail('tallyGuestRsvp default — total (primary guests only, no plus-one)', 6, t.total));
    results.push(t.responded === 4
      ? pass('tallyGuestRsvp default — responded = total - pending', t.responded)
      : fail('tallyGuestRsvp default — responded = total - pending', 4, t.responded));
  }

  // ── includePlusOnes: true (matches Guests.jsx) ───────────────────────────
  {
    const t = tallyGuestRsvp(FIXTURE, { includePlusOnes: true });
    results.push(t.attending === 2
      ? pass('tallyGuestRsvp includePlusOnes — attending unaffected (plus-one is pending, not attending)', t.attending)
      : fail('tallyGuestRsvp includePlusOnes — attending unaffected (plus-one is pending, not attending)', 2, t.attending));
    results.push(t.pending === 3
      ? pass('tallyGuestRsvp includePlusOnes — pending includes the plus-one (g1, g6, g5-plus-one)', t.pending)
      : fail('tallyGuestRsvp includePlusOnes — pending includes the plus-one (g1, g6, g5-plus-one)', 3, t.pending));
    results.push(t.awaiting === 2
      ? pass('tallyGuestRsvp includePlusOnes — awaiting includes the plus-one (g1 + g5-plus-one, both invited+pending)', t.awaiting)
      : fail('tallyGuestRsvp includePlusOnes — awaiting includes the plus-one (g1 + g5-plus-one, both invited+pending)', 2, t.awaiting));
    results.push(t.total === 7
      ? pass('tallyGuestRsvp includePlusOnes — total counts the plus-one as its own attendee', t.total)
      : fail('tallyGuestRsvp includePlusOnes — total counts the plus-one as its own attendee', 7, t.total));
  }

  // ── Predicate helpers, directly ──────────────────────────────────────────
  console.log('\n  guestRsvpTally — individual predicates:\n');
  {
    results.push(isAttending(FIXTURE[1]) === true
      ? pass('isAttending(attending guest) — true', true)
      : fail('isAttending(attending guest) — true', true, isAttending(FIXTURE[1])));
    results.push(isDeclined(FIXTURE[2]) === true
      ? pass('isDeclined(declined guest) — true', true)
      : fail('isDeclined(declined guest) — true', true, isDeclined(FIXTURE[2])));
    results.push(isMaybe(FIXTURE[3]) === true
      ? pass('isMaybe(maybe guest) — true', true)
      : fail('isMaybe(maybe guest) — true', true, isMaybe(FIXTURE[3])));
    results.push(isPending(FIXTURE[5]) === true
      ? pass('isPending(unset-status guest) — true (undefined counts as pending)', true)
      : fail('isPending(unset-status guest) — true (undefined counts as pending)', true, isPending(FIXTURE[5])));
    results.push(isAwaitingPrimary(FIXTURE[0]) === true
      ? pass('isAwaitingPrimary(invited + pending guest) — true', true)
      : fail('isAwaitingPrimary(invited + pending guest) — true', true, isAwaitingPrimary(FIXTURE[0])));
    results.push(isAwaitingPrimary(FIXTURE[5]) === false
      ? pass('isAwaitingPrimary(never-invited guest) — false (not "awaiting" if never invited)', false)
      : fail('isAwaitingPrimary(never-invited guest) — false (not "awaiting" if never invited)', false, isAwaitingPrimary(FIXTURE[5])));
    results.push(isAwaitingPlusOne(FIXTURE[4]) === true
      ? pass('isAwaitingPlusOne(guest with a pending plus-one) — true', true)
      : fail('isAwaitingPlusOne(guest with a pending plus-one) — true', true, isAwaitingPlusOne(FIXTURE[4])));
    results.push(isAwaitingPlusOne(FIXTURE[0]) === false
      ? pass('isAwaitingPlusOne(guest with no plus-one) — false', false)
      : fail('isAwaitingPlusOne(guest with no plus-one) — false', false, isAwaitingPlusOne(FIXTURE[0])));
    // 'confirmed' is not a valid enum value — must never match any predicate.
    const fakeConfirmed = { rsvp_status: 'confirmed' };
    results.push(isAttending(fakeConfirmed) === false && isPending(fakeConfirmed) === false
      ? pass("A 'confirmed' status (invalid, not in the schema enum) matches neither isAttending nor isPending", 'correctly unmatched')
      : fail("A 'confirmed' status (invalid, not in the schema enum) matches neither isAttending nor isPending", 'both false', `isAttending=${isAttending(fakeConfirmed)} isPending=${isPending(fakeConfirmed)}`));
  }

  // ── Empty/null input safety ──────────────────────────────────────────────
  {
    const t = tallyGuestRsvp([]);
    results.push(t.total === 0 && t.attending === 0
      ? pass('tallyGuestRsvp([]) — all zeros, no throw', JSON.stringify(t))
      : fail('tallyGuestRsvp([]) — all zeros, no throw', 'all zero', JSON.stringify(t)));
    const t2 = tallyGuestRsvp(undefined);
    results.push(t2.total === 0
      ? pass('tallyGuestRsvp(undefined) — treated as empty, no throw', JSON.stringify(t2))
      : fail('tallyGuestRsvp(undefined) — treated as empty, no throw', 'all zero', JSON.stringify(t2)));
  }

  return results;
}
