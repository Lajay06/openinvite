import React, { useState } from 'react';
import { Calendar, Mail, CheckSquare, UtensilsCrossed, Grid3X3, Play, Smartphone, MapPin, Tag, Heart, X, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { ASSET_PREVIEW_MAP } from '@/components/website-builder/AssetPreviews';

const ICON_MAP = { Calendar, Mail, CheckSquare, UtensilsCrossed, Grid3X3, Play, Smartphone, MapPin, Tag, Heart };

const assets = [
  { key: 'saveTheDate', name: 'Save the Date', description: 'Your first announcement to guests', icon: 'Calendar' },
  { key: 'digitalInvitation', name: 'Digital Invitation', description: 'Full invitation design with RSVP link', icon: 'Mail' },
  { key: 'rsvpCard', name: 'RSVP Card', description: 'Styled response card for your guests', icon: 'CheckSquare' },
  { key: 'menuCard', name: 'Menu Card', description: 'Typeset dinner menu for each table', icon: 'UtensilsCrossed' },
  { key: 'seatingChart', name: 'Seating Chart', description: 'Guest table assignments from your list', icon: 'Grid3X3' },
  { key: 'motionGraphic', name: 'Motion Graphic', description: 'Animated digital asset for sharing', icon: 'Play' },
  { key: 'instagramStoryKit', name: 'Instagram Story Kit', description: '5 story designs for social media', icon: 'Smartphone' },
  { key: 'welcomeSignage', name: 'Welcome Signage', description: 'Large format A1 venue signage', icon: 'MapPin' },
  { key: 'guestTags', name: 'Guest Tags', description: 'Name tags, 6 per A4 sheet, print-ready', icon: 'Tag' },
  { key: 'thankYouNotes', name: 'Thank You Notes', description: 'Personalised post-wedding thank you cards', icon: 'Heart' },
];

function AssetMiniPreview({ assetKey, details }) {
  const PreviewComp = ASSET_PREVIEW_MAP?.[assetKey];
  if (PreviewComp) {
    return (
      <div style={{ transform: 'scale(0.45)', transformOrigin: 'top center', width: '222%', height: '222%', pointerEvents: 'none' }}>
        <PreviewComp details={details} content={details?.assetContent?.[assetKey] || {}} />
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>✦</div>
        <p style={{ fontSize: 12, color: '#AAAAAA', margin: 0 }}>Preview</p>
      </div>
    </div>
  );
}

function AssetEditorOverlay({ asset, details, onClose }) {
  const PreviewComp = ASSET_PREVIEW_MAP?.[asset.key];
  const content = details?.assetContent?.[asset.key] || {};
  const Icon = ICON_MAP[asset.icon] || Calendar;

  const downloadAsset = () => {
    // Simple download trigger — opens asset in new tab
    alert('Download coming soon. Right-click the preview and save the image.');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#FFFFFF', display: 'flex', flexDirection: 'column', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Top bar */}
      <div style={{ height: 56, borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', padding: '0 20px', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
          ← Back
        </button>
        <p style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 16, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>{asset.name}</p>
        <button onClick={downloadAsset} style={{ marginLeft: 'auto', padding: '7px 16px', border: '1px solid #CCCCCC', background: 'transparent', color: '#444', fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: 4 }}>
          ↓ Download
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left — editor fields */}
        <div style={{ width: 340, borderRight: '1px solid #EEEEEE', overflowY: 'auto', padding: 24, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
              <Icon size={18} color="#0A0A0A" strokeWidth={1.5} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0A0A0A' }}>{asset.name}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#888' }}>{asset.description}</p>
            </div>
          </div>

          <div style={{ background: '#F8F8F8', border: '1px solid #EEEEEE', padding: 16, marginBottom: 24 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#888', lineHeight: 1.6 }}>
              This asset is personalised with your couple names, wedding date, and venue from Event Details.
              Edit content using the fields below.
            </p>
          </div>

          <p style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>CUSTOM TEXT</p>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: '#555', fontWeight: 600, display: 'block', marginBottom: 6 }}>Subtitle / Tagline</label>
            <input
              defaultValue={content.subtitle || ''}
              placeholder="e.g. Formal invitation to follow"
              style={{ width: '100%', borderBottom: '1px solid #DDD', border: 'none', padding: '8px 0', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: '#555', fontWeight: 600, display: 'block', marginBottom: 6 }}>Additional Note</label>
            <textarea
              defaultValue={content.additionalNote || ''}
              placeholder="Any additional text for this asset..."
              rows={3}
              style={{ width: '100%', border: '1px solid #EEEEEE', padding: '10px', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.5 }}
            />
          </div>

          <p style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>LAYOUT</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
            {['Centered', 'Split', 'Minimal', 'Bold'].map(layout => (
              <button
                key={layout}
                style={{ padding: '10px', border: `1px solid ${(content.layout || 'Centered') === layout ? '#0A0A0A' : '#EEEEEE'}`, background: (content.layout || 'Centered') === layout ? '#0A0A0A' : '#FFF', color: (content.layout || 'Centered') === layout ? '#FFF' : '#444', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {layout}
              </button>
            ))}
          </div>

          <button
            onClick={downloadAsset}
            style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #E03553, #803D81)', color: '#FFF', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Download PNG
          </button>
        </div>

        {/* Center — live preview */}
        <div style={{ flex: 1, background: '#F0F0F0', overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 40 }}>
          {PreviewComp ? (
            <PreviewComp details={details} content={content} />
          ) : (
            <div style={{ background: '#FFF', padding: 80, textAlign: 'center', color: '#888', fontSize: 14 }}>
              <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.2 }}>✦</div>
              <p style={{ margin: 0 }}>Preview not available yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudioAssetsTab({ details }) {
  const [openAsset, setOpenAsset] = useState(null);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>GUEST SUITE ASSETS</p>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', margin: '0 0 6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Your 10 Design Pieces</h2>
        <p style={{ fontSize: 14, color: '#888', margin: 0 }}>Every piece is personalised with your wedding details and designed in your chosen universe aesthetic.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {assets.map(asset => {
          const Icon = ICON_MAP[asset.icon] || Calendar;
          return (
            <div
              key={asset.key}
              style={{ border: '1px solid #EEEEEE', background: '#FFFFFF', overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.2s ease' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#0A0A0A'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#EEEEEE'}
              onClick={() => setOpenAsset(asset)}
            >
              {/* Preview area */}
              <div style={{ height: 200, background: '#F8F8F8', position: 'relative', overflow: 'hidden', borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                <AssetMiniPreview assetKey={asset.key} details={details} />
                {!ASSET_PREVIEW_MAP?.[asset.key] && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <Icon size={32} color="#CCCCCC" strokeWidth={1} />
                    <p style={{ fontSize: 11, color: '#CCCCCC', margin: '8px 0 0', fontWeight: 500 }}>{asset.name}</p>
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{asset.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{asset.description}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                  <button
                    onClick={e => { e.stopPropagation(); setOpenAsset(asset); }}
                    style={{ padding: '6px 14px', border: '1px solid #0A0A0A', background: 'transparent', color: '#0A0A0A', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); alert('Download coming soon.'); }}
                    style={{ padding: '6px 14px', border: '1px solid #EEEEEE', background: 'transparent', color: '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    ↓
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {openAsset && (
        <AssetEditorOverlay
          asset={openAsset}
          details={details}
          onClose={() => setOpenAsset(null)}
        />
      )}
    </div>
  );
}