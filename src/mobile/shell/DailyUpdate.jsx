import React, { useState } from 'react';
import SmartImage from '../ui/SmartImage';
import { hapticLight } from '../native';

/**
 * The daily update (goal 6, item 4): the desktop's briefing, said the same
 * way, on the first open of each calendar day. Top third is one of the
 * couple's own photos; the rest is the brand-red panel with the date, the
 * greeting, the status line and the first move, then "Let's go".
 *
 * Bold on purpose. The type here (40/46 greeting, 20/28 lines) is the one
 * screen allowed above the app's scale; the dashboard after it is calm.
 * The panel is the brand red under an 8 percent ink wash (mobile.css), which
 * is what takes white text from 4.37:1 to 5:1 against it (AA needs 4.5).
 */
export default function DailyUpdate({ photo, alt = '', dateLabel, greeting, lines = [], onGo, leaving = false }) {
  const [busy, setBusy] = useState(false);
  const go = () => { if (busy) return; setBusy(true); hapticLight(); onGo?.(); };
  return (
    <div className={`oi-m-daily${leaving ? ' oi-m-daily--leaving' : ''}`} role="dialog" aria-label="Your daily update">
      <div className="oi-m-daily__photo">
        {photo ? <SmartImage src={photo} alt={alt} width={390} height={300} eager tone="ink" /> : <div className="oi-m-daily__blank" />}
      </div>
      <div className="oi-m-daily__panel">
        <div className="oi-m-daily__inner">
          <p className="oi-m-daily__date">{dateLabel}</p>
          <h1 className="oi-m-daily__greeting">{greeting}</h1>
          {lines.map((l, i) => <p key={i} className="oi-m-daily__line">{l}</p>)}
        </div>
        <button type="button" className="oi-m-pill oi-m-pill--block oi-m-daily__go" onClick={go}>Let's go</button>
      </div>
    </div>
  );
}
