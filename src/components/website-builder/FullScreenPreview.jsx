import React, { useState } from 'react';
import { Monitor, Tablet, Smartphone, X, ExternalLink } from 'lucide-react';
import RealWebsitePreview from './RealWebsitePreview';
import { WEDDING_PAGES } from '@/lib/websiteThemes';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export default function FullScreenPreview({ details, onClose, initialPage = 'home' }) {
  const [device, setDevice] = useState('desktop');
  const [currentPage, setCurrentPage] = useState(initialPage);
  // Escape-to-close now comes from Dialog's own onOpenChange (Radix handles
  // the keydown listener) — no need for a manual window listener any more.

  const DEVICES = [
    { id: 'desktop', icon: Monitor, label: 'Desktop' },
    { id: 'tablet', icon: Tablet, label: 'Tablet' },
    { id: 'mobile', icon: Smartphone, label: 'Mobile' },
  ];

  const enabledPages = details.enabledPages || ['home'];
  const customPages = details.customPages || [];
  const allPages = [
    ...WEDDING_PAGES.filter(p => enabledPages.includes(p.slug)),
    ...customPages.map(p => ({ slug: p.slug, label: p.name, icon: '★' })),
  ];

  const previewUrl = details.slug ? `/w/${details.slug}?preview=true` : null;

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent fullBleed hideClose title="Website preview" className="p-0 flex flex-col" style={{ background: '#1A1A1A' }}>
      {/* Toolbar */}
      <div style={{
        height: 48, background: '#0A0A0A', display: 'flex',
        alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Exit */}
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 500, display: 'flex',
          alignItems: 'center', gap: 6, padding: '4px 8px',
          fontFamily: 'inherit', transition: 'color 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          <X size={14} /> Exit preview
        </button>

        {/* Device toggles — center */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.3)', borderRadius: 999, padding: 3 }}>
            {DEVICES.map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setDevice(id)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                borderRadius: 999,
                background: device === id ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: device === id ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}>
                <Icon size={13} strokeWidth={1.5} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Page selector */}
          <select
            value={currentPage}
            onChange={e => setCurrentPage(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)',
              padding: '5px 8px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
              outline: 'none', fontFamily: 'inherit',
            }}
          >
            {allPages.map(p => (
              <option key={p.slug} value={p.slug}>{p.label}</option>
            ))}
          </select>

          {/* Visit live */}
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecoration: 'none', transition: 'color 0.15s', padding: '5px 4px' }}
              onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
              title="Open in new tab"
            >
              Open in tab <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>

      {/* Preview content */}
      <div style={{
        flex: 1, background: '#111111',
        display: 'flex', alignItems: device === 'desktop' ? 'flex-start' : 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* THE FRAME SCROLLS ITS OWN CONTENT, AND THE MENU OPENS INSIDE IT.
            Two defects, one element.

            The phone frame carried `overflow: hidden`, so a guest site taller
            than 693px could not be scrolled at all — the preview showed the
            top of the page and nothing else, on the device where almost every
            page is taller than the screen.

            And the guest nav's mobile menu is `position: fixed`
            (WeddingWebsiteNav:287), which resolves against the VIEWPORT — so
            opening it in the preview covered the whole builder window rather
            than the phone. `transform` on this element makes it the containing
            block for fixed descendants, which is what keeps the menu inside
            the frame. translateZ(0) is the no-op transform that buys that
            without moving anything by a pixel; `contain: paint` would do it
            too, at the cost of clipping the frame's own shadow.

            Both devices get the same treatment: a tablet's menu escaped just
            as happily, and the two had drifted apart for no reason anyone
            wrote down. */}
        <div
          data-preview-frame={device}
          className={device === 'mobile' ? 'mobile-preview-frame' : undefined}
          style={{
            width: device === 'desktop' ? '100%' : device === 'tablet' ? '768px' : '390px',
            height: device === 'mobile' ? '693px' : '100%',
            background: '#fff',
            flexShrink: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            // The scrollbar is hidden on the phone only: a visible one there
            // is 15px of chrome a real phone does not have, and it changes the
            // width the site lays out into.
            ...(device === 'mobile' ? { scrollbarWidth: 'none', msOverflowStyle: 'none' } : {}),
            // Only where there IS a frame. On desktop the preview fills the
            // window and a containing block would change nothing except to
            // make `position: fixed` behave differently from the real site.
            ...(device === 'desktop' ? {} : { transform: 'translateZ(0)' }),
          }}
        >
          <RealWebsitePreview details={details} currentPage={currentPage} onNavigate={setCurrentPage} />
        </div>
      </div>
      </DialogContent>
    </Dialog>
  );
}