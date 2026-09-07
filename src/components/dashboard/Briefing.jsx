import React from 'react';

const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * THE HERO — the big topic sentence at the top of the daily update.
 *
 * The owner rejected the previous layout and named what he wanted back:
 * "three columns, big topic sentence at the top, far right column had stats."
 * This is the top of that page, restored from the pre-#654 file
 * (src/pages/DailyUpdate.jsx at e2c087a, lines 524-590): an eyebrow reading
 * "Today's edition" in strawberry, a 42px/800 headline, and one line under it.
 *
 * WHAT CHANGED UNDER IT, and nothing else. The old headline was written by a
 * model on every load — eleven generated fields, cached per day. This one is
 * `day.headline` off resolveDayState, so the sentence at the top of this page
 * and the sentence on Overall are the same string from the same computation
 * and cannot disagree. The look is the old page's; the brain is the one this
 * PR built.
 */
export default function Briefing({ day, loading }) {
  if (loading) {
    return (
      <div style={{ background: '#FFFFFF', padding: '48px 40px 40px', borderBottom: '1px solid #E8E8E5', minHeight: 140 }}>
        <div style={{ width: 120, height: 12, background: 'rgba(10,10,10,0.06)', marginBottom: 20 }} />
        <div style={{ width: 420, height: 40, background: 'rgba(10,10,10,0.06)' }} />
      </div>
    );
  }

  return (
    <div style={{ background: '#FFFFFF', padding: '48px 40px 40px', borderBottom: '1px solid #E8E8E5' }}>
      <p style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: '#E03553', margin: '0 0 16px' }}>
        Today&apos;s edition
      </p>
      <h1 style={{
        fontFamily: PJS, fontSize: 42, fontWeight: 800, color: '#0A0A0A',
        letterSpacing: '-0.03em', lineHeight: 1.15, maxWidth: 800, margin: 0,
      }}>
        {day.headline}
      </h1>
      {day.lines[0] && (
        <p style={{
          fontFamily: PJS, fontSize: 16, fontWeight: 400, color: '#444444',
          lineHeight: 1.6, maxWidth: 680, marginTop: 16, marginBottom: 0,
        }}>
          {day.lines[0].text}
        </p>
      )}
    </div>
  );
}
