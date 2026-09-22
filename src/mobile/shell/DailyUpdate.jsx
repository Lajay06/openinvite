import React, { useEffect, useRef, useState } from 'react';
import { hapticLight, setStatusBarDark } from '../native';

/**
 * The daily update (goal 6, reshaped in goal 7, full screen in goal 8): the
 * desktop's briefing, said the same way, as a takeover that covers the whole
 * screen edge to edge. Nothing of the dashboard is visible behind it. The
 * photo fills the top 45 percent and runs under the status bar (a light
 * wash keeps the time and battery readable); it is one of the seven bundled
 * with the app (shell/dailyPhotos.js), so it is there the instant the
 * takeover is. The brand-red panel fills the bottom 55 percent and meets the
 * photo with a 28px rounded top edge: the date, the greeting, the status
 * line and the first move.
 *
 * Three ways out, all the same close: "Let's go" (the white pill), a swipe
 * down anywhere on it, and "Not again today" (the text button), which also
 * asks the host to keep it away until the next calendar day. Closing fades
 * the takeover out over the dashboard.
 *
 * Bold on purpose. The type here (40/46 greeting, 20/28 lines) is the one
 * screen allowed above the app's scale; the dashboard after it is calm.
 * The panel is the brand red under an 8 percent ink wash (mobile.css), which
 * is what takes white text from 4.37:1 to 5:1 against it (AA needs 4.5).
 */
const CLOSE_MS = 240;
const SWIPE_PX = 80;

export default function DailyUpdate({ photo, alt = '', dateLabel, greeting, lines = [], onGo, onNotToday }) {
  const [phase, setPhase] = useState('closed'); // closed | open | closing
  const cardRef = useRef(null);
  const innerRef = useRef(null);
  const drag = useRef({ y: 0, dy: 0, on: false });
  const done = useRef(null);

  // Fades in on the frame after mount. The photo runs under the status bar,
  // so its content turns light for as long as the takeover is up and back
  // to dark (the page) when it goes.
  useEffect(() => {
    const t = setTimeout(() => setPhase('open'), 20);
    setStatusBarDark(true);
    return () => { clearTimeout(t); setStatusBarDark(false); };
  }, []);

  const close = (cb) => {
    if (phase === 'closing') return;
    done.current = cb;
    hapticLight();
    setPhase('closing');
  };
  useEffect(() => {
    if (phase !== 'closing') return undefined;
    const t = setTimeout(() => done.current?.(), CLOSE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  // Swipe down closes it. The text panel scrolls when the type is large, so
  // a drag that starts inside a scrolled panel is a scroll, not a dismiss.
  // The takeover follows the finger; past the threshold it lets go into the
  // same fade as the buttons, from wherever it was dragged to.
  const onTouchStart = (e) => {
    const inScrolledPanel = innerRef.current && innerRef.current.contains(e.target) && innerRef.current.scrollTop > 0;
    drag.current = { y: e.touches[0].clientY, dy: 0, on: !inScrolledPanel };
  };
  const onTouchMove = (e) => {
    if (!drag.current.on || phase !== 'open') return;
    const dy = Math.max(0, e.touches[0].clientY - drag.current.y);
    drag.current.dy = dy;
    if (cardRef.current) cardRef.current.style.transform = `translateY(${dy}px)`;
  };
  const onTouchEnd = () => {
    if (!drag.current.on) return;
    const { dy } = drag.current;
    drag.current.on = false;
    if (dy > SWIPE_PX) { close(onGo); return; }
    if (cardRef.current) cardRef.current.style.transform = '';
  };

  return (
    <div className={`oi-m-daily-root oi-m-daily-root--${phase}`} role="dialog" aria-modal="true" aria-label="Your daily update">
      <div className="oi-m-daily" ref={cardRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div className="oi-m-daily__photo">
          {photo ? <img src={photo} alt={alt} width={800} height={800} decoding="sync" loading="eager" /> : <div className="oi-m-daily__blank" />}
          <div className="oi-m-daily__top-scrim" aria-hidden="true" />
          <span className="oi-m-daily__handle" aria-hidden="true" />
        </div>
        <div className="oi-m-daily__panel">
          <div className="oi-m-daily__inner" ref={innerRef}>
            <p className="oi-m-daily__date">{dateLabel}</p>
            <h1 className="oi-m-daily__greeting">{greeting}</h1>
            {lines.map((l, i) => <p key={i} className="oi-m-daily__line">{l}</p>)}
          </div>
          <button type="button" className="oi-m-pill oi-m-pill--block oi-m-daily__go" onClick={() => close(onGo)}>Let's go</button>
          <button type="button" className="oi-m-daily__skip" onClick={() => close(onNotToday || onGo)}>Not again today</button>
        </div>
      </div>
    </div>
  );
}
