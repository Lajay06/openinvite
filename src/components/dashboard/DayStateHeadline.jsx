import React from 'react';
import { Link } from 'react-router-dom';
import { resolveDayState } from '@/lib/dayState';

const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * OVERALL'S ONE LINE ABOUT TODAY, and a way to the page that says more.
 *
 * Overall keeps the at-a-glance stats and its place at the top of the nav. What
 * it no longer carries is a SECOND briefing: the full block — badge, three
 * lines, an action button — lived here and on the daily update page, which is
 * two answers to one question and the reason /DailyUpdate was redirected away
 * in the first place.
 *
 * This is the same resolved state, rendered as one sentence. Not a summary of
 * the briefing and not a shorter version of its reasoning — literally the same
 * `headline` string off the same `resolveDayState` call, so the two pages
 * cannot disagree about the day even in principle.
 */
export default function DayStateHeadline({ tasks, schedule, guests, budget, vendors, unseen = [], loading }) {
  if (loading) {
    return (
      <div style={{ padding: '20px 32px', borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
        <div style={{ width: 220, height: 18, background: 'rgba(10,10,10,0.06)' }} />
      </div>
    );
  }

  // The FIRST line as well as the headline, so Overall's one line paves
  // forward too: "Clear this week." on its own is the same dead end the owner
  // reviewed, one page over.
  const { badge, headline, lines } = resolveDayState({ tasks, schedule, guests, budget, vendors, unseen });
  const forward = lines[0]?.text || null;

  return (
    <div style={{
      padding: '20px 32px', borderBottom: '1px solid rgba(10,10,10,0.12)',
      display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap',
    }}>
      {badge && (
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
          {badge}
        </span>
      )}
      <span style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS }}>
        {headline}
      </span>
      {forward && (
        <span style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
          {forward}
        </span>
      )}
      <Link to="/DailyUpdate" style={{ fontSize: 13, fontWeight: 600, color: '#E03553', fontFamily: PJS, textDecoration: 'none' }}>
        Daily update
      </Link>
    </div>
  );
}
