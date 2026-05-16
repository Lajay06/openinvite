import React, { useEffect } from 'react';
import { WEBSITE_THEMES, TYPOGRAPHY_PAIRINGS, TRANSITION_OPTIONS, SCROLL_ANIMATION_OPTIONS, HERO_EFFECT_OPTIONS } from '@/lib/websiteThemes';

const THEMES = WEBSITE_THEMES;
const TYPOGRAPHIES = TYPOGRAPHY_PAIRINGS;

function SLabel({ children }) {
  return <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#888888', margin: '0 0 12px' }}>{children}</p>;
}
function SubLabel({ children }) {
  return <p style={{ fontSize: 11, fontWeight: 500, color: '#444444', margin: '0 0 8px' }}>{children}</p>;
}
function Divider() {
  return <div style={{ height: 1, background: '#F0F0F0', margin: '20px 0' }} />;
}

function PillGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(opt => {
        const sel = value === opt.id;
        return (
          <button key={opt.id} onClick={() => onChange(opt.id)} style={{
            padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
            borderRadius: 100, border: '1px solid ' + (sel ? '#0A0A0A' : '#DDDDDD'),
            background: sel ? '#0A0A0A' : 'transparent', color: sel ? '#fff' : '#444',
            transition: 'all 0.15s',
          }}>{opt.name}</button>
        );
      })}
    </div>
  );
}

// Inject Google Fonts for typography preview
function InjectFont({ font }) {
  useEffect(() => {
    if (!font || font.includes('Plus Jakarta')) return;
    const id = 'font-' + font.replace(/\s+/g, '-');
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@300;400;700;800&display=swap`;
    document.head.appendChild(link);
  }, [font]);
  return null;
}

export default function WSDesignTab({ details, onChange }) {
  const activeTheme = details.activeTheme || 'still';
  const activeTypo = details.activeTypography || 'classic';

  return (
    <div>
      {/* COLOUR THEME */}
      <SLabel>Colour Theme</SLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {THEMES.map(t => {
          const sel = activeTheme === t.id;
          return (
            <div key={t.id} onClick={() => onChange('activeTheme', t.id)} style={{ cursor: 'pointer' }}>
              <div style={{
                borderRadius: 6, overflow: 'hidden', position: 'relative',
                aspectRatio: '3/2',
                outline: sel ? '2px solid #0A0A0A' : '2px solid transparent',
                outlineOffset: 1,
                transition: 'transform 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ height: '65%', background: t.darkBg }} />
                <div style={{ height: '35%', background: t.lightBg }} />
                <div style={{ position: 'absolute', bottom: 5, right: 5, width: 9, height: 9, borderRadius: '50%', background: t.accent, border: '1px solid rgba(0,0,0,0.12)' }} />
                {sel && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#0A0A0A' }}>✓</span>
                    </div>
                  </div>
                )}
              </div>
              <p style={{ fontSize: 9, fontWeight: 700, color: '#0A0A0A', textAlign: 'center', margin: '4px 0 1px' }}>{t.name}</p>
              <p style={{ fontSize: 8, color: '#AAAAAA', textAlign: 'center', margin: 0 }}>{t.mood}</p>
            </div>
          );
        })}
      </div>

      <Divider />

      {/* TYPOGRAPHY */}
      <SLabel>Typography</SLabel>
      {TYPOGRAPHIES.map(t => <InjectFont key={t.id} font={t.headingFont} />)}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {TYPOGRAPHIES.map(t => {
          const sel = activeTypo === t.id;
          return (
            <div key={t.id} onClick={() => onChange('activeTypography', t.id)} style={{
              border: sel ? '2px solid #0A0A0A' : '1px solid #EEEEEE',
              borderRadius: 8, padding: 14, cursor: 'pointer', position: 'relative',
              background: sel ? '#FAFAFA' : '#fff', transition: 'border-color 0.15s',
            }}>
              {sel && (
                <div style={{ position: 'absolute', top: 7, right: 7, width: 15, height: 15, borderRadius: '50%', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 8, color: '#fff', fontWeight: 700 }}>✓</span>
                </div>
              )}
              <p style={{ fontFamily: t.headingFont + ', serif', fontSize: 16, fontWeight: t.headingWeight || 400, color: '#0A0A0A', margin: '0 0 3px', lineHeight: 1.2 }}>
                Sarah & James
              </p>
              <p style={{ fontFamily: t.bodyFont + ', sans-serif', fontSize: 11, color: '#888888', margin: '0 0 8px' }}>
                Together forever.
              </p>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#0A0A0A', margin: '0 0 2px' }}>{t.name}</p>
              <p style={{ fontSize: 10, color: '#AAAAAA', margin: 0 }}>{t.mood}</p>
            </div>
          );
        })}
      </div>

      <Divider />

      {/* ANIMATIONS */}
      <SLabel>Animations</SLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <SubLabel>Page Transition</SubLabel>
          <PillGroup options={TRANSITION_OPTIONS} value={details.pageTransition || 'fade'} onChange={v => onChange('pageTransition', v)} />
        </div>
        <div>
          <SubLabel>Scroll Animation</SubLabel>
          <PillGroup options={SCROLL_ANIMATION_OPTIONS} value={details.scrollAnimation || 'subtle'} onChange={v => onChange('scrollAnimation', v)} />
        </div>
        <div>
          <SubLabel>Hero Effect</SubLabel>
          <PillGroup options={HERO_EFFECT_OPTIONS} value={details.heroEffect || 'static'} onChange={v => onChange('heroEffect', v)} />
        </div>
      </div>
    </div>
  );
}