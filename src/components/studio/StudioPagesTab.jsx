import React from 'react';
import { WEDDING_PAGES } from '@/lib/websiteThemes';

export default function StudioPagesTab({ wedding, onChange }) {
  const enabledPages = wedding.enabledPages || ['home', 'our-story', 'celebration', 'rsvp'];
  const slug = wedding.slug || 'your-wedding';

  const togglePage = (pageSlug) => {
    if (pageSlug === 'home') return; // always on
    if (enabledPages.includes(pageSlug)) {
      onChange('enabledPages', enabledPages.filter(p => p !== pageSlug));
    } else {
      // insert in canonical order
      const allSlugs = WEDDING_PAGES.map(p => p.slug);
      const newPages = allSlugs.filter(s => enabledPages.includes(s) || s === pageSlug);
      onChange('enabledPages', newPages);
    }
  };

  const moveUp = (i) => {
    if (i === 0) return;
    const arr = [...enabledPages];
    [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    onChange('enabledPages', arr);
  };

  const moveDown = (i) => {
    if (i === enabledPages.length - 1) return;
    const arr = [...enabledPages];
    [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
    onChange('enabledPages', arr);
  };

  return (
    <div>
      <p style={{ fontSize: 12, color: '#888888', marginBottom: 20, lineHeight: 1.5 }}>
        Toggle pages on/off and reorder using the arrows.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {WEDDING_PAGES.map((page, idx) => {
          const isEnabled = enabledPages.includes(page.slug);
          const isHome = page.slug === 'home';
          const pageUrl = `openinvite.com/w/${slug}${page.slug === 'home' ? '' : '/' + page.slug}`;

          return (
            <div
              key={page.slug}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px',
                background: isEnabled ? '#FAFAFA' : '#F8F8F8',
                border: '1px solid ' + (isEnabled ? '#EEEEEE' : '#F0F0F0'),
                opacity: isEnabled ? 1 : 0.55
              }}
            >
              {/* Move buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button
                  onClick={() => moveUp(enabledPages.indexOf(page.slug))}
                  disabled={!isEnabled || enabledPages.indexOf(page.slug) <= 0}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', fontSize: 10, padding: '1px 4px', lineHeight: 1 }}
                >▲</button>
                <button
                  onClick={() => moveDown(enabledPages.indexOf(page.slug))}
                  disabled={!isEnabled || enabledPages.indexOf(page.slug) === enabledPages.length - 1}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', fontSize: 10, padding: '1px 4px', lineHeight: 1 }}
                >▼</button>
              </div>

              {/* Page info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: 0 }}>{page.label}</p>
                <p style={{ fontSize: 10, color: '#AAAAAA', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pageUrl}</p>
              </div>

              {/* Toggle */}
              {isHome ? (
                <p style={{ fontSize: 10, color: '#AAAAAA', margin: 0, whiteSpace: 'nowrap' }}>Always on</p>
              ) : (
                <button
                  onClick={() => togglePage(page.slug)}
                  style={{
                    width: 40, height: 22, borderRadius: 11, border: 'none',
                    background: isEnabled ? '#E03553' : '#DDDDDD',
                    cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0
                  }}
                >
                  <div style={{
                    position: 'absolute', width: 18, height: 18, borderRadius: '50%',
                    background: '#fff', top: 2, left: isEnabled ? 20 : 2, transition: 'left 0.2s'
                  }} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}