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
        borderBottom: '1px solid #222',
      }}>
        {/* Exit */}
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#888', fontSize: 13, fontWeight: 600, display: 'flex',
          alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 4,
          fontFamily: 'inherit', transition: 'color 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = '#E03553'}
          onMouseLeave={e => e.currentTarget.style.color = '#888'}
        >
          <X size={14} /> Exit Preview
        </button>

        {/* Device toggles — center */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 2 }}>
          {DEVICES.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setDevice(id)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              border: `1px solid ${device === id ? '#fff' : '#333'}`,
              background: device === id ? '#fff' : 'transparent',
              color: device === id ? '#0A0A0A' : '#888',
              borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Page selector */}
          <select
            value={currentPage}
            onChange={e => setCurrentPage(e.target.value)}
            style={{
              background: '#1A1A1A', border: '1px solid #333', color: '#ccc',
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
            <button onClick={() => window.open(previewUrl, '_blank')} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: '1px solid #333', color: '#888',
              padding: '5px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#888'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#888'; }}
            >
              Visit Live <ExternalLink size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Preview content */}
      <div style={{
        flex: 1, overflow: 'auto', display: 'flex',
        alignItems: device === 'desktop' ? 'stretch' : 'flex-start',
        justifyContent: 'center',
        background: device === 'desktop' ? '#fff' : '#2A2A2A',
        padding: device === 'desktop' ? 0 : '24px',
        position: 'relative',
      }}>
        {/* PREVIEW pill */}
        <div style={{
          position: 'absolute', top: 12, right: 16, zIndex: 10,
          background: 'rgba(0,0,0,0.5)', color: '#fff',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
          padding: '3px 8px', borderRadius: 100, pointerEvents: 'none',
        }}>PREVIEW</div>

        {device === 'desktop' ? (
          <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
            <WBWebsitePreview details={details} currentPage={currentPage} />
          </div>
        ) : device === 'tablet' ? (
          <div style={{
            width: 768, background: '#fff', minHeight: '100%',
            boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            borderRadius: 8, overflow: 'hidden',
          }}>
            <div style={{ overflowY: 'auto', maxHeight: '80vh' }}>
              <WBWebsitePreview details={details} currentPage={currentPage} />
            </div>
          </div>
        ) : (
          /* Mobile frame */
          <div style={{
            width: 390, height: 844,
            border: '8px solid #1D1D1F',
            borderRadius: 44,
            overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
            position: 'relative',
            background: '#000',
            flexShrink: 0,
          }}>
            {/* Dynamic island */}
            <div style={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
              width: 120, height: 34, background: '#000', borderRadius: 20, zIndex: 10,
            }} />
            <div style={{ width: '100%', height: '100%', overflowY: 'auto', background: '#fff' }}>
              <WBWebsitePreview details={details} currentPage={currentPage} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}