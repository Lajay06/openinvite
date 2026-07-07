/**
 * FeatureRows — the 40/60 heading/description row grid, hairline-divided.
 * Used inside a Block's children for the Universes and Ava detail sections.
 * No motion of its own — Block's fade-up reveal already covers `children`
 * as one group; this file just contributes layout/typography.
 */
import React from 'react';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function FeatureRows({ rows, textColor, hairline }) {
  return (
    <div>
      {rows.map((row, i) => (
        <div
          key={row.heading}
          style={{
            borderTop: `1px solid ${hairline}`,
            borderBottom: i === rows.length - 1 ? `1px solid ${hairline}` : 'none',
            padding: '32px 0',
            display: 'grid',
            gridTemplateColumns: '40% 60%',
            gap: 32,
            alignItems: 'start',
          }}
          className="home-block-row"
        >
          <h3 style={{
            fontFamily: PJS, fontSize: 'clamp(20px, 2.4vw, 30px)', fontWeight: 700,
            color: textColor, margin: 0, lineHeight: 1.2, letterSpacing: '-0.01em',
          }}>
            {row.heading}
          </h3>
          <p style={{
            fontFamily: PJS, fontSize: 16, fontWeight: 600, lineHeight: 1.8,
            color: textColor, opacity: 0.7, margin: 0,
          }}>
            {row.description}
          </p>
        </div>
      ))}
    </div>
  );
}
