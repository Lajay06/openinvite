import React, { useState } from 'react';
import { putMyWeddingDetails } from '@/lib/resolveMyWedding';
import { normalizeDeadline, mergedRsvpContent } from '@/lib/rsvpDeadline';
import { formatDashboardDate } from '@/lib/dashboardDate';

/**
 * src/components/shared/RsvpDeadlineField.jsx
 *
 * THE REPLY-BY DEADLINE, IN THE TWO PLACES IT NOW LIVES.
 *
 * Item 3 of goals/2026-10-11-dashboard-fixes-batch-1.md. The editor used to be
 * a row on the Guests page, which the owner's walkthrough took off that page.
 * The deadline itself stays: editable on the Send invites review step, where a
 * couple is already deciding what the invitation says, and shown on Event
 * details, where the wedding date is. One component, two modes, so the two
 * surfaces cannot drift into disagreeing about what a deadline means.
 *
 * NOTHING SERVER-SIDE CHANGES, by the owner's ruling. Same field, same
 * normalization through src/lib/rsvpDeadline.js, same write through
 * putMyWeddingDetails, same nine readers on the guest site.
 *
 * THE COUNT CLAUSE DID NOT COME WITH IT. The Guests page's sentence ended with
 * "N guests have not replied", which it could say because it held the whole
 * guest list. The Send invites flow holds a SELECTION, so the same clause there
 * would count a different population under the same words. Dropped rather than
 * quietly re-pointed, and reported.
 */

export const DEADLINE_LABEL = 'Reply by';
export const NO_DEADLINE_LINE = 'Guests can reply until you set a date.';
export const DEADLINE_SAVE_ERROR = 'Could not save the date. Please try again.';

/** "Replies close at the end of 1 May 2027." */
export function deadlineClosesLine(value) {
  return `Replies close at the end of ${formatDashboardDate(value)}.`;
}

/**
 * @param {object} props
 * @param {object} props.rsvpContent the couple's current rsvpContent
 * @param {(merged: object) => void} [props.onSaved] told the new rsvpContent
 * @param {boolean} [props.readOnly] show the deadline without editing it
 */
export default function RsvpDeadlineField({ rsvpContent, onSaved, readOnly = false }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const deadline = normalizeDeadline(rsvpContent?.rsvpDeadline) || '';

  const save = async (next) => {
    setSaving(true);
    setError('');
    try {
      const merged = mergedRsvpContent(rsvpContent, next);
      await putMyWeddingDetails({ rsvpContent: merged });
      onSaved?.(merged);
    } catch {
      // SAID, NOT SWALLOWED. A date that looks saved and is not would send
      // guests to a form the couple thinks is closing.
      setError(DEADLINE_SAVE_ERROR);
    }
    setSaving(false);
  };

  const line = deadline
    ? <span>{deadlineClosesLine(deadline)}</span>
    : <span>{NO_DEADLINE_LINE}</span>;

  if (readOnly) {
    return (
      <div data-rsvp-deadline-shown style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap',
        fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: 'rgba(10,10,10,0.6)' }}>
        <span style={{ fontWeight: 700, color: '#0A0A0A' }}>{DEADLINE_LABEL}</span>
        {line}
      </div>
    );
  }

  return (
    <div data-rsvp-deadline style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
      fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: 'rgba(10,10,10,0.6)' }}>
      <label htmlFor="rsvp-deadline" style={{ fontWeight: 700, color: '#0A0A0A' }}>
        {DEADLINE_LABEL}
      </label>
      <input
        id="rsvp-deadline"
        type="date"
        value={deadline}
        disabled={saving}
        onChange={(e) => save(e.target.value)}
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13,
                 padding: '7px 10px', minHeight: 36, border: '1px solid rgba(10,10,10,0.2)',
                 background: '#fff', color: '#0A0A0A' }}
      />
      {line}
      {/* CLEARING REOPENS THE FORM, with nothing else to do. Spelled as its own
          control because a date input gives no obvious way to empty itself. */}
      {deadline && (
        <button
          type="button"
          onClick={() => save('')}
          disabled={saving}
          style={{ background: 'none', border: 'none', padding: '7px 4px', minHeight: 36,
                   cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                   fontSize: 13, color: 'rgba(10,10,10,0.6)', textDecoration: 'underline' }}
        >
          Clear
        </button>
      )}
      {error && <span style={{ color: '#E03553' }}>{error}</span>}
    </div>
  );
}
