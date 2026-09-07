import React from 'react';

const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * THE HERO — the big topic sentence at the top of the daily update.
 *
 * Owner: "The whole idea of the topic sentence is Ava is talking to you and
 * giving you your morning update." So it is two short sentences in her voice —
 * a greeting by local time of day, then the state — and NOTHING ELSE. The
 * "Today's edition" eyebrow and the line underneath are gone on the same
 * ruling: "get rid of the subtext for the main topic sentence", and "there is
 * too much going on".
 *
 * THE WORDS ARE COMPUTED, NOT WRITTEN. avaSentence resolves them per state
 * with the couple's own numbers in the slots, and Overall renders the same
 * string. A model-written greeting could not be shared, so the two pages would
 * drift the moment either reloaded. Column B is where the model writes.
 *
 * THE EYEBROW IS TODAY'S DATE — "so it feels like it is for today". Same
 * style the old "Today's edition" eyebrow used, and nothing else in it.
 *
 * 42px/800, as the pre-#654 page had it (e2c087a:574), and NO max-width: the
 * owner's note is "why is it so condensed, there is so much space for the top
 * line so let it go wider". It spans the content column and wraps naturally.
 */
/** "Monday 7 September" — weekday, day, month, no year. */
function todayLabel(now = new Date()) {
  const weekday = now.toLocaleDateString(undefined, { weekday: 'long' });
  const day = now.getDate();
  const month = now.toLocaleDateString(undefined, { month: 'long' });
  return `${weekday} ${day} ${month}`;
}

export default function Briefing({ sentence, loading, now = new Date() }) {
  const dateLabel = todayLabel(now);
  if (loading) {
    return (
      <div style={{ background: '#FFFFFF', padding: '48px 40px 40px', borderBottom: '1px solid #E8E8E5', minHeight: 140 }}>
        <div style={{ width: 520, maxWidth: '80%', height: 40, background: 'rgba(10,10,10,0.06)' }} />
      </div>
    );
  }

  return (
    <div style={{ background: '#FFFFFF', padding: '48px 40px 40px', borderBottom: '1px solid #E8E8E5' }}>
      <p style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, color: '#E03553', margin: '0 0 16px' }}>
        {dateLabel}
      </p>
      <h1 style={{
        fontFamily: PJS, fontSize: 42, fontWeight: 800, color: '#0A0A0A',
        lineHeight: 1.15, margin: 0,
      }}>
        {sentence}
      </h1>
    </div>
  );
}
