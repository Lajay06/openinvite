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
 * 42px/800, as the pre-#654 page had it (e2c087a:574).
 */
export default function Briefing({ sentence, loading }) {
  if (loading) {
    return (
      <div style={{ background: '#FFFFFF', padding: '48px 40px 40px', borderBottom: '1px solid #E8E8E5', minHeight: 140 }}>
        <div style={{ width: 520, maxWidth: '80%', height: 40, background: 'rgba(10,10,10,0.06)' }} />
      </div>
    );
  }

  return (
    <div style={{ background: '#FFFFFF', padding: '48px 40px 40px', borderBottom: '1px solid #E8E8E5' }}>
      <h1 style={{
        fontFamily: PJS, fontSize: 42, fontWeight: 800, color: '#0A0A0A',
        letterSpacing: '-0.03em', lineHeight: 1.15, maxWidth: 800, margin: 0,
      }}>
        {sentence}
      </h1>
    </div>
  );
}
