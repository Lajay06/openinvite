import React from 'react';
import { Link } from 'react-router-dom';

const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * The briefing block at the top of Overall.
 *
 * ── THE DAY STATE IS COMPUTED ONCE AND RENDERED TWICE ───────────────────────
 *
 * Badge and headline both derive from `state` below, so they cannot disagree.
 * A badge reading "Clear" above a headline naming two overdue tasks is the
 * failure this shape exists to make impossible.
 *
 * Precedence, highest first:
 *
 *   overdue    something was due and is not done
 *   today      something is due today
 *   waiting    nothing is due, but replies are outstanding
 *   clear      nothing needs the couple
 *
 * ── AVA WOULD RATHER BE VISIBLY LIMITED THAN QUIETLY WRONG ──────────────────
 *
 * `unseen` names the stores that did not load. A store that failed to fetch is
 * NOT an empty store, and the difference matters most on exactly the screen
 * that summarises everything: "Nothing needs you today" computed from a failed
 * request is a lie the couple has no way to detect. When something is unseen
 * the block says so and does not claim to be complete.
 *
 * A fact this wedding does not have is stated as not set, with where it would
 * live — never inferred, never filled from a norm.
 *
 * One headline, at most three lines, one action. No percentages, no progress,
 * no pleasantries, no congratulation.
 */

const STATE_LABEL = {
  overdue: 'Overdue',
  today: 'Due today',
  waiting: 'Waiting',
  clear: 'Clear',
};

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** @returns {{state:string, lines:Array<{text:string,to:string}>, unseen:string[]}} */
export function buildBriefing({ tasks = [], schedule = [], guests = [], budget = [], vendors = [], unseen = [] }) {
  const today = startOfDay(new Date());
  const dueDate = (t) => {
    const raw = t.due_date || t.dueDate || t.date;
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : startOfDay(d);
  };
  const open = tasks.filter((t) => !t.completed);
  const overdue = open.filter((t) => { const d = dueDate(t); return d !== null && d < today; });
  const dueToday = open.filter((t) => { const d = dueDate(t); return d !== null && d === today; });
  const eventsToday = schedule.filter((e) => { const d = dueDate(e); return d !== null && d === today; });
  const unreplied = guests.filter((g) => !g.rsvp_status || g.rsvp_status === 'pending').length;

  const state = overdue.length > 0 ? 'overdue'
    : (dueToday.length > 0 || eventsToday.length > 0) ? 'today'
    : unreplied > 0 ? 'waiting'
    : 'clear';

  // Facts only, in priority order, capped at three. Each line names a number
  // and links to the page that resolves it.
  const lines = [];
  const name = (items) => items.slice(0, 2).map((t) => t.title || t.name || t.event_name).filter(Boolean).join(', ');
  if (overdue.length) {
    const n = name(overdue);
    lines.push({ text: `${overdue.length} task${overdue.length === 1 ? '' : 's'} overdue${n ? `: ${n}` : ''}.`, to: '/TodoList' });
  }
  if (dueToday.length) {
    const n = name(dueToday);
    lines.push({ text: `${dueToday.length} due today${n ? `: ${n}` : ''}.`, to: '/TodoList' });
  }
  if (eventsToday.length) {
    lines.push({ text: `${eventsToday.length} on the schedule today.`, to: '/Schedule' });
  }
  if (unreplied > 0 && lines.length < 3) {
    lines.push({ text: `${unreplied} guest${unreplied === 1 ? ' has' : 's have'} not replied.`, to: '/Guests' });
  }
  if (lines.length < 3 && budget.length === 0 && !unseen.includes('budget')) {
    lines.push({ text: 'No budget set. It lives on the Budget page.', to: '/Budget' });
  }
  if (lines.length < 3 && vendors.length === 0 && !unseen.includes('vendors')) {
    lines.push({ text: 'No vendors added. They live on the Vendors page.', to: '/Vendors' });
  }

  return { state, lines: lines.slice(0, 3), unseen };
}

export default function Briefing({ tasks, schedule, guests, budget, vendors, unseen = [], loading }) {
  if (loading) {
    return (
      <div style={{ padding: '28px 32px', borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
        <div style={{ width: 180, height: 22, background: 'rgba(10,10,10,0.06)' }} />
      </div>
    );
  }

  const { state, lines } = buildBriefing({ tasks, schedule, guests, budget, vendors, unseen });
  const headline = state === 'overdue' ? 'Something is overdue.'
    : state === 'today' ? 'Something is due today.'
    : state === 'waiting' ? 'Waiting on replies.'
    : 'Nothing else needs you today.';
  const action = lines[0]?.to || '/TodoList';
  const actionLabel = lines[0]?.to === '/Guests' ? 'Open guest list'
    : lines[0]?.to === '/Schedule' ? 'Open schedule'
    : lines[0]?.to === '/Budget' ? 'Open budget'
    : lines[0]?.to === '/Vendors' ? 'Open vendors'
    : 'Open to do';

  return (
    <div style={{ padding: '28px 32px', borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
      {/* Badge and headline, both from `state`. */}
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 8px' }}>
        {STATE_LABEL[state]}
      </p>
      <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: '#0A0A0A', fontFamily: PJS, margin: '0 0 10px' }}>
        {headline}
      </p>

      {lines.map((l, i) => (
        <p key={i} style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 4px' }}>
          {l.text}
        </p>
      ))}

      {/* Named as unseen, never counted as empty. */}
      {unseen.length > 0 && (
        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '10px 0 0' }}>
          {unseen.join(' and ')} could not be loaded, so this is not the whole picture.
        </p>
      )}

      <Link
        to={action}
        style={{
          display: 'inline-flex', marginTop: 18, background: '#E03553', color: '#FFFFFF',
          borderRadius: 999, padding: '10px 22px', fontSize: 14, fontWeight: 700,
          fontFamily: PJS, textDecoration: 'none',
        }}
      >
        {actionLabel}
      </Link>
    </div>
  );
}
