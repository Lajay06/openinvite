import React from 'react';

const THEMES = [
  {
    id: 'still',
    name: 'STILL',
    mood: 'Quiet Luxury',
    darkBg: '#0A0A0A',
    lightBg: '#F8F7F5',
  },
  {
    id: 'dusk',
    name: 'DUSK',
    mood: 'Golden Hour',
    darkBg: '#1C1410',
    lightBg: '#F5F0EA',
  },
  {
    id: 'sage',
    name: 'SAGE',
    mood: 'Garden',
    darkBg: '#1A2018',
    lightBg: '#F4F6F0',
  },
  {
    id: 'slate',
    name: 'SLATE',
    mood: 'Modern',
    darkBg: '#141820',
    lightBg: '#F0F2F5',
  },
  {
    id: 'blush',
    name: 'BLUSH',
    mood: 'Romance',
    darkBg: '#1E1418',
    lightBg: '#FBF5F5',
  },
  {
    id: 'noir',
    name: 'NOIR',
    mood: 'Editorial',
    darkBg: '#0A0A0A',
    lightBg: '#FFFFFF',
  },
];

const TYPOGRAPHY = [
  { id: 'classic', name: 'Classic', headings: 'Cormorant Garamond', body: 'Plus Jakarta Sans' },
  { id: 'modern', name: 'Modern', headings: 'Playfair Display', body: 'Plus Jakarta Sans' },
  { id: 'minimal', name: 'Minimal', headings: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans' },
];

export default function DesignTab({ wedding, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* COLOUR THEMES */}
      <div>
        <p style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888888', letterSpacing: '0.15em', margin: '0 0 12px', fontWeight: 600 }}>
          Colour Theme
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {THEMES.map(theme => (
            <button
              key={theme.id}
              onClick={() => onChange('websiteTheme', theme.id)}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: wedding.websiteTheme === theme.id ? '2px solid #0A0A0A' : '1px solid #EEEEEE',
                background: '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', height: '40px', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ flex: 1, background: theme.darkBg }} />
                <div style={{ flex: 1, background: theme.lightBg }} />
              </div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0A', margin: '0 0 2px' }}>
                {theme.name}
              </p>
              <p style={{ fontSize: '11px', color: '#888888', margin: 0 }}>
                {theme.mood}
              </p>
              {wedding.websiteTheme === theme.id && (
                <div style={{ position: 'absolute', top: '8px', right: '8px', width: '20px', height: '20px', background: '#E03553', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '12px' }}>✓</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* TYPOGRAPHY */}
      <div>
        <p style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888888', letterSpacing: '0.15em', margin: '0 0 12px', fontWeight: 600 }}>
          Typography Style
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {TYPOGRAPHY.map(font => (
            <button
              key={font.id}
              onClick={() => onChange('websiteTypography', font.id)}
              style={{
                padding: '12px',
                borderRadius: '4px',
                border: wedding.websiteTypography === font.id ? '2px solid #E03553' : '1px solid #EEEEEE',
                background: '#FFFFFF',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
            >
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#0A0A0A', margin: '0 0 4px' }}>
                {font.name}
              </p>
              <p style={{ fontSize: '11px', color: '#888888', margin: '0 0 6px' }}>
                {font.headings} / {font.body}
              </p>
              <p style={{ fontSize: '14px', color: '#0A0A0A', margin: 0 }}>
                Sarah & James
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}