import React, { useRef, useState } from 'react';
import { PillButton, SmartImage } from '../../ui';
import { imageUrl } from '../../images';

const SLIDES = [
  { key: 'welcome1', headline: 'Your wedding, in your pocket', line: 'Guests, budget, the day itself. All of it, wherever you are.' },
  { key: 'welcome2', headline: 'Know the moment someone replies', line: 'Replies, messages and requests land here as they happen.' },
  { key: 'welcome3', headline: 'Ava keeps an eye on the details', line: 'One short update each morning, and a hand whenever you ask.' },
];

/**
 * Three full-screen swipeable slides with a photo from the manifest, dots,
 * and the two ways in. Shown once; the container records that locally.
 */
export default function WelcomeScreen({ onStart, onLogin }) {
  const ref = useRef(null);
  const [index, setIndex] = useState(0);
  const onScroll = () => { const el = ref.current; if (!el) return; setIndex(Math.round(el.scrollLeft / el.clientWidth)); };
  return (
    <div className="oi-m-welcome" role="region" aria-label="Welcome">
      <div className="oi-m-welcome__slides" ref={ref} onScroll={onScroll}>
        {SLIDES.map((s) => (
          <section key={s.key} className="oi-m-welcome__slide" aria-roledescription="slide">
            <SmartImage src={imageUrl(s.key)} alt="" width={390} ratio="4/5" square eager tone="ink" style={{ position: 'absolute', inset: 0, height: '100%', aspectRatio: 'auto' }} />
            <div className="oi-m-hero__scrim" style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.5) 45%, rgba(10,10,10,0.1) 100%)' }} />
            <div className="oi-m-welcome__text">
              <h1 className="oi-m-title oi-m-on-dark">{s.headline}</h1>
              <p className="oi-m-body oi-m-on-dark-2">{s.line}</p>
            </div>
          </section>
        ))}
      </div>
      <div className="oi-m-welcome__foot">
        <div className="oi-m-dots" aria-hidden="true">
          {SLIDES.map((s, i) => <span key={s.key} className={`oi-m-dots__dot${i === index ? ' oi-m-dots__dot--on' : ''}`} style={{ background: i === index ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }} />)}
        </div>
        <PillButton variant="primary" block onClick={onStart}>Get started</PillButton>
        <PillButton variant="light" block onClick={onLogin}>I already have an account</PillButton>
      </div>
    </div>
  );
}
