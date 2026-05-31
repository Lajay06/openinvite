import React from 'react';
import { Home, BookOpen, Star, CheckSquare, Gift, Music, Camera, HelpCircle, Hotel, Car, Compass } from 'lucide-react';

const ALL_PAGES = [
  { id: 'home',       label: 'Home',             Icon: Home,        path: '' },
  { id: 'our-story',  label: 'Our Story',         Icon: BookOpen,    path: '/our-story' },
  { id: 'celebration',label: 'Celebration',       Icon: Star,        path: '/celebration' },
  { id: 'rsvp',       label: 'RSVP',              Icon: CheckSquare, path: '/rsvp' },
  { id: 'registry',   label: 'Registry',          Icon: Gift,        path: '/registry' },
  { id: 'music',      label: 'Music',             Icon: Music,       path: '/music' },
  { id: 'photos',     label: 'Photos',            Icon: Camera,      path: '/photos' },
  { id: 'faq',        label: 'FAQ',               Icon: HelpCircle,  path: '/faq' },
  { id: 'stay',       label: 'Where to stay',     Icon: Hotel,       path: '/stay',      note: 'Guest Suite · Accommodation' },
  { id: 'transport',  label: 'Getting here',      Icon: Car,         path: '/transport', note: 'Guest Suite · Transport' },
  { id: 'experience', label: 'Experience guide',  Icon: Compass,     path: '/experience',note: 'Guest Suite · Experience Guide' },
];

export default function WSPagesTab({ details, onChange }) {
  const slug = details.slug || 'your-wedding';
  const enabledPages = details.enabledPages || ['home', 'our-story', 'celebration', 'rsvp'];

  const toggle = (id) => {
    if (id === 'home') return;
    const next = enabledPages.includes(id) ? enabledPages.filter(p => p !== id) : [...enabledPages, id];
    onChange('enabledPages', next);
  };

  const move = (id, dir) => {
    const idx = enabledPages.indexOf(id);
    if (idx < 0) return;
    const arr = [...enabledPages];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    onChange('enabledPages', arr);
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: '#888888', marginBottom: 16 }}>
        Manage which pages appear in your site navigation.
      </p>

      <div>
        {ALL_PAGES.map(page => {
          const { id, label, Icon, path } = page;
          const enabled = enabledPages.includes(id);
          const isHome = id === 'home';

          return (
            <div key={id} style={{
              height: 52, display: 'flex', alignItems: 'center', gap: 10,
              borderBottom: '1px solid #F0F0F0', opacity: enabled ? 1 : 0.45,
            }}>
              {/* Up/down handles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                <button onClick={() => move(id, -1)} disabled={!enabled || isHome} style={arrowBtn}>▲</button>
                <button onClick={() => move(id, 1)} disabled={!enabled || isHome} style={arrowBtn}>▼</button>
              </div>

              {/* Drag handle decorative */}
              <span style={{ color: '#CCCCCC', fontSize: 14, flexShrink: 0, lineHeight: 1 }}>⠿</span>

              {/* Icon */}
              <Icon size={15} color="#888888" strokeWidth={1.5} style={{ flexShrink: 0 }} />

              {/* Name + URL */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', margin: 0, lineHeight: 1.2 }}>{label}</p>
                <p style={{ fontSize: 11, color: '#AAAAAA', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {page.note ? page.note : `/w/${slug}${path}`}
                </p>
              </div>

              {/* Toggle or Required */}
              {isHome ? (
                <span style={{ fontSize: 10, color: '#888', background: '#F0F0F0', padding: '3px 8px', flexShrink: 0, fontWeight: 600 }}>Required</span>
              ) : (
                <button onClick={() => toggle(id)} style={{
                  width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                  background: enabled ? '#E03553' : '#DDDDDD', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}>
                  <div style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', background: '#fff', top: 2, left: enabled ? 20 : 2, transition: 'left 0.2s' }} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const arrowBtn = {
  background: 'none', border: 'none', cursor: 'pointer', color: '#CCCCCC',
  fontSize: 8, padding: '1px 3px', lineHeight: 1,
};