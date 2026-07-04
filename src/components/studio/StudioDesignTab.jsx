import React from 'react';
import { WEBSITE_THEMES, TYPOGRAPHY_PAIRINGS, TRANSITION_OPTIONS, SCROLL_ANIMATION_OPTIONS, HERO_EFFECT_OPTIONS } from '@/lib/websiteThemes';

function SectionLabel({ children }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', margin: '0 0 12px', textTransform: 'uppercase' }}>
      {children}
    </p>
  );
}

function Divider() {
  return <div style={{ height: 1, background: '#F0F0F0', margin: '24px 0' }} />;
}

function PillGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(opt => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            style={{
              padding: '6px 16px', border: '1px solid ' + (selected ? '#0A0A0A' : '#DDDDDD'),
              background: selected ? '#0A0A0A' : 'transparent',
              color: selected ? '#FFFFFF' : '#666666',
              cursor: 'pointer', fontSize: 12, fontWeight: 600,
              borderRadius: 100, transition: 'all 0.15s ease',
            }}
          >
            {opt.name}
          </button>
        );
      })}
    </div>
  );
}

export default function StudioDesignTab({ wedding, onChange }) {
  const activeTheme = wedding.activeTheme || wedding.websiteTheme || 'still';
  const activeTypo = wedding.activeTypography || wedding.websiteTypography || 'classic';

  return (
    <div>
      {/* COLOUR THEMES */}
      <SectionLabel>Colour Theme</SectionLabel>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 10,
      }}
        className="theme-grid"
      >
        {WEBSITE_THEMES.map(theme => {
          const selected = activeTheme === theme.id;
          return (
            <div
              key={theme.id}
              onClick={() => onChange('activeTheme', theme.id)}
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              <div style={{
                aspectRatio: '3/2', borderRadius: 8, overflow: 'hidden', position: 'relative',
                outline: selected ? '2px solid #0A0A0A' : '2px solid transparent',
                outlineOffset: 1,
                transition: 'transform 0.15s ease',
                transform: 'scale(1)',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {/* Top 60% dark */}
                <div style={{ height: '60%', background: theme.darkBg }} />
                {/* Bottom 40% light */}
                <div style={{ height: '40%', background: theme.lightBg, position: 'relative' }}>
                  <div style={{
                    position: 'absolute', bottom: 5, right: 5,
                    width: 8, height: 8, borderRadius: '50%',
                    background: theme.accent, border: '1px solid rgba(0,0,0,0.15)'
                  }} />
                </div>
                {/* Checkmark overlay */}
                {selected && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.3)'
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', background: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A' }}>✓</span>
                    </div>
                  </div>
                )}
              </div>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#0A0A0A', margin: '4px 0 1px', textAlign: 'center' }}>{theme.name}</p>
              <p style={{ fontSize: 9, color: '#AAAAAA', margin: 0, textAlign: 'center' }}>{theme.mood}</p>
            </div>
          );
        })}
      </div>

      <Divider />

      {/* TYPOGRAPHY */}
      <SectionLabel>Typography</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }} className="typo-grid">
        {TYPOGRAPHY_PAIRINGS.map(typo => {
          const selected = activeTypo === typo.id;
          return (
            <div
              key={typo.id}
              onClick={() => onChange('activeTypography', typo.id)}
              style={{
                padding: 16, border: selected ? '2px solid #0A0A0A' : '1px solid #EEEEEE',
                borderRadius: 8, cursor: 'pointer', position: 'relative',
                background: selected ? '#FAFAFA' : '#FFFFFF',
                transition: 'border-color 0.15s ease',
              }}
            >
              {selected && (
                <div style={{ position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: '50%', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>✓</span>
                </div>
              )}
              <p style={{
                fontSize: 18, margin: '0 0 4px', lineHeight: 1.2,
                fontFamily: typo.headingFont + ', serif',
                fontWeight: typo.headingWeight || '400',
                fontStyle: typo.headingStyle || 'normal',
                color: '#0A0A0A'
              }}>
                Sarah & James
              </p>
              <p style={{
                fontSize: 12, margin: '0 0 8px', color: '#888888',
                fontFamily: typo.bodyFont + ', sans-serif',
              }}>
                Together forever.
              </p>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#0A0A0A', margin: '0 0 2px' }}>{typo.name}</p>
              <p style={{ fontSize: 10, color: '#AAAAAA', margin: 0 }}>{typo.mood}</p>
            </div>
          );
        })}
      </div>

      <Divider />

      {/* ANIMATIONS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <SectionLabel>Page Transition</SectionLabel>
          <PillGroup options={TRANSITION_OPTIONS} value={wedding.pageTransition || 'fade'} onChange={v => onChange('pageTransition', v)} />
        </div>
        <div>
          <SectionLabel>Scroll Animation</SectionLabel>
          <PillGroup options={SCROLL_ANIMATION_OPTIONS} value={wedding.scrollAnimation || 'subtle'} onChange={v => onChange('scrollAnimation', v)} />
        </div>
        <div>
          <SectionLabel>Hero Effect</SectionLabel>
          <PillGroup options={HERO_EFFECT_OPTIONS} value={wedding.heroEffect || 'static'} onChange={v => onChange('heroEffect', v)} />
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .theme-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .typo-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}