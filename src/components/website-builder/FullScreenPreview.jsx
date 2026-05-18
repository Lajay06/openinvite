import React, { useState, useEffect } from 'react';
import { Monitor, Tablet, Smartphone, X, ExternalLink } from 'lucide-react';
import WBWebsitePreview from './WBWebsitePreview';
import { WEDDING_PAGES } from '@/lib/websiteThemes';

export default function FullScreenPreview({ details, onClose, initialPage = 'home' }) {
  const [device, setDevice] = useState('desktop');
  const [currentPage, setCurrentPage] = useState(initialPage);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      background: '#1A1A1A',
    }}>
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
        flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column',
        background: '#1A1A1A',
      }}>
        {/* URL bar — desktop and tablet only */}
        {device !== 'mobile' && (
          <div style={{ padding: '10px 0', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 999, padding: '6px 16px', width: 300, textAlign: 'center' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                openinvite.com/w/{details.slug || 'your-wedding'}{currentPage !== 'home' ? `/${currentPage}` : ''}
              </span>
            </div>
          </div>
        )}

        {device === 'desktop' ? (
          <div style={{ flex: 1, background: '#fff', overflow: 'auto' }}>
            <WBWebsitePreview details={details} currentPage={currentPage} />
          </div>
        ) : device === 'tablet' ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 24px 24px', flex: 1 }}>
            <div style={{ width: 768, background: '#fff', flexShrink: 0, overflow: 'hidden' }}>
              <div style={{ overflowY: 'auto', height: 'calc(100vh - 160px)' }}>
                <WBWebsitePreview details={details} currentPage={currentPage} />
              </div>
            </div>
          </div>
        ) : (
          /* Mobile phone chrome */
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px', flex: 1 }}>
            <div style={{ width: 414, background: '#1A1A1A', borderRadius: 44, padding: 12, boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 24px 48px rgba(0,0,0,0.5)', flexShrink: 0, alignSelf: 'flex-start' }}>
              <div style={{ height: 32, background: '#0A0A0A', borderRadius: '32px 32px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 80, height: 24, background: '#0A0A0A', borderRadius: 999, border: '2px solid rgba(255,255,255,0.08)' }} />
              </div>
              <div style={{ width: '390px', height: 'calc(100vh - 200px)', overflowY: 'auto', overflowX: 'hidden', background: '#fff' }}>
                <WBWebsitePreview details={details} currentPage={currentPage} />
              </div>
              <div style={{ height: 24, background: '#0A0A0A', borderRadius: '0 0 32px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 100, height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 999 }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}