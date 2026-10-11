import React, { useState } from 'react';
import { putMyWeddingDetails } from '@/lib/resolveMyWedding';
import { normalizeDeadline, mergedRsvpContent } from '@/lib/rsvpDeadline';
import { formatDashboardDate } from '@/lib/dashboardDate';
import { Switch } from '@/components/ui/switch';
import {
  LABEL as REMINDERS_LABEL, reminderLine, switchAvailability, withRemindersSwitch,
} from '@/lib/rsvpReminders';

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
 * ── AND THE REMINDER SWITCH SITS BESIDE IT ─────────────────────────────────
 *
 * Item 1 of goals/2026-10-11-reply-by-reminders.md. The switch belongs next to
 * the date because it is about that date: "email anyone still to reply" has no
 * meaning without one, which is also why it is disabled until the date exists.
 *
 * OPERABLE IN BOTH MODES, WHICH IS NOT WHAT readOnly DOES TO THE DATE. The
 * item's own guard is "both surfaces show the same state after a change on
 * either", so the switch can be thrown from Event details as well as from the
 * Send invites step, while the DATE stays read-only there as #974 left it.
 * That asymmetry is deliberate and reported: one control is a decision the
 * couple can take from either page, the other is an edit with one home.
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

  // ONE WRITE, THE WHOLE OBJECT. The switch merges into the same rsvpContent
  // the date lives in, through the same put, so the two can never half-save.
  const saveSwitch = async (on) => {
    setSaving(true);
    setError('');
    try {
      const merged = withRemindersSwitch(rsvpContent, on);
      await putMyWeddingDetails({ rsvpContent: merged });
      onSaved?.(merged);
    } catch {
      setError(DEADLINE_SAVE_ERROR);
    }
    setSaving(false);
  };

  const availability = switchAvailability(deadline);
  const remindersOn = !!rsvpContent?.remindersOn;
  // DISABLED WHEN IT CANNOT BE TURNED ON, and never when it is already on:
  // the couple must always be able to switch it back off.
  const switchDisabled = saving || (!remindersOn && !availability.ok);

  const reminders = (
    <div data-rsvp-reminders style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: switchDisabled ? 'default' : 'pointer' }}>
        <Switch
          data-rsvp-reminders-switch
          checked={remindersOn}
          disabled={switchDisabled}
          onCheckedChange={saveSwitch}
          aria-label={REMINDERS_LABEL}
        />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {REMINDERS_LABEL}
        </span>
      </label>
      <span data-rsvp-reminders-line style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {reminderLine(rsvpContent)}
      </span>
    </div>
  );

  const line = deadline
    ? <span>{deadlineClosesLine(deadline)}</span>
    : <span>{NO_DEADLINE_LINE}</span>;

  if (readOnly) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div data-rsvp-deadline-shown style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap',
          fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: 'rgba(10,10,10,0.6)' }}>
          <span style={{ fontWeight: 700, color: '#0A0A0A' }}>{DEADLINE_LABEL}</span>
          {line}
        </div>
        {reminders}
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
      <div style={{ flexBasis: '100%' }}>{reminders}</div>
    </div>
  );
}
