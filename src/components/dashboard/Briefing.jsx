import React from 'react';
import { Link } from 'react-router-dom';
import { resolveDayState } from '@/lib/dayState';

const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * The briefing block — badge, headline, up to three lines, one action.
 *
 * ── IT DECIDES NOTHING ─────────────────────────────────────────────────────
 *
 * Every judgment moved to src/lib/dayState.js, which has no React in it. This
 * file renders. That split is what lets Overall's one-line version and the
 * daily update page read the SAME resolved state rather than two copies of the
 * same reasoning, and what lets a guard in plain Node check that they do.
 *
 * ── AVA WOULD RATHER BE VISIBLY LIMITED THAN QUIETLY WRONG ─────────────────
 *
 * `unseen` names the stores that did not load. A store that failed to fetch is
 * NOT an empty store, and the difference matters most on the screen that
 * summarises everything: "Nothing needs you today" computed from a failed
 * request is a lie the couple has no way to detect. When something is unseen
 * there is no badge at all (spec 9.1) and the block says what it could not see.
 *
 * One headline, at most three lines, one action. No percentages, no progress,
 * no pleasantries, no congratulation.
 */
export default function Briefing({ tasks, schedule, guests, budget, vendors, unseen = [], loading }) {
  if (loading) {
    return (
      <div style={{ padding: '28px 32px', borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
        <div style={{ width: 180, height: 22, background: 'rgba(10,10,10,0.06)' }} />
      </div>
    );
  }

  const { badge, headline, lines, unseen: missing } = resolveDayState({ tasks, schedule, guests, budget, vendors, unseen });
  const action = lines[0]?.to || '/TodoList';
  const actionLabel = lines[0]?.to === '/Guests' ? 'Open guest list'
    : lines[0]?.to === '/Schedule' ? 'Open schedule'
    : lines[0]?.to === '/Budget' ? 'Open budget'
    : lines[0]?.to === '/Vendors' ? 'Open vendors'
    : 'Open to do';

  return (
    <div style={{ padding: '28px 32px', borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
      {badge && (
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 8px' }}>
          {badge}
        </p>
      )}
      <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: '#0A0A0A', fontFamily: PJS, margin: '0 0 10px' }}>
        {headline}
      </p>

      {lines.map((l, i) => (
        <p key={i} style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 4px' }}>
          {l.text}
        </p>
      ))}

      {/* Named as unseen, never counted as empty. */}
      {missing.length > 0 && (
        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '10px 0 0' }}>
          {missing.join(' and ')} could not be loaded, so this is not the whole picture.
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
