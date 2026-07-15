/**
 * ShanghaiMasthead — the "shanghai-glamour" layout's hero: a bold, jade/
 * gold/black centred composition, a ShanghaiCloud flourish beneath the
 * names — cinematic glamour kept to hairline weight.
 */
import React from 'react';
import ShanghaiCloud from './ShanghaiCloud';

export default function ShanghaiMasthead({ coupleNames, kicker, theme, typography, textColor, accentColor }) {
  const color = textColor || theme.lightText;
  const accent = accentColor || theme.accent;

  return (
    <div style={{ textAlign: 'center', width: '100%', maxWidth: 700, margin: '0 auto' }}>
      {kicker && (
        <p style={{ fontFamily: typography.bodyFont, fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', color, opacity: 0.7, margin: '0 0 22px' }}>
          {kicker}
        </p>
      )}
      <h1 style={{ fontFamily: typography.headingFont, fontWeight: typography.headingWeight, fontSize: 'clamp(2.4rem, 6.5vw, 4.6rem)', lineHeight: 1.1, color, margin: '0 0 28px' }}>
        {coupleNames}
      </h1>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <ShanghaiCloud color={accent} opacity={0.55} width={140} height={50} />
      </div>
    </div>
  );
}
