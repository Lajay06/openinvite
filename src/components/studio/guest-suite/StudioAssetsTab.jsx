import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, Mail, CheckSquare, UtensilsCrossed, Grid3X3, Play, Smartphone, MapPin, Tag, Heart, X, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getMyRecords } from '@/lib/resolveMyWedding';
import { resolveColors, resolveTypography, resolveUniverseConfig } from '@/lib/universeStyling';
import { ASSET_PREVIEW_MAP, GuestTag, DEFAULT_THEME, DEFAULT_TYPOGRAPHY } from '@/components/website-builder/AssetPreviews';
import { ASSET_EDITOR_MAP } from '@/components/website-builder/AssetEditors';
import { exportAsset, exportMultiPagePdf, ASSET_EXPORT_SPECS } from '@/lib/assetExport';
import { buildGuestTagList } from '@/lib/seatingChart';

const ICON_MAP = { Calendar, Mail, CheckSquare, UtensilsCrossed, Grid3X3, Play, Smartphone, MapPin, Tag, Heart };

const assets = [
  { key: 'saveTheDate', name: 'Save the Date', description: 'Your first announcement to guests', icon: 'Calendar' },
  { key: 'digitalInvitation', name: 'Digital Invitation', description: 'Full invitation design with RSVP link', icon: 'Mail' },
  { key: 'rsvpCard', name: 'RSVP Card', description: 'Styled response card for your guests', icon: 'CheckSquare' },
  { key: 'menuCard', name: 'Menu Card', description: 'Typeset dinner menu for each table', icon: 'UtensilsCrossed' },
  { key: 'seatingChart', name: 'Seating Chart', description: 'Guest table assignments from your list', icon: 'Grid3X3' },
  { key: 'motionGraphic', name: 'Motion Graphic', description: 'Animated digital asset for sharing', icon: 'Play' },
  // fix: was 'instagramStoryKit' — every other map in the asset system
  // (ASSET_PREVIEW_MAP/ASSET_EDITOR_MAP/ASSET_EXPORT_SPECS) keys this
  // 'instagramStory' — the mismatch meant this card's preview/editor/export
  // never resolved at all.
  { key: 'instagramStory', name: 'Instagram Story Kit', description: '5 story designs for social media', icon: 'Smartphone' },
  { key: 'welcomeSignage', name: 'Welcome Signage', description: 'Large format A1 venue signage', icon: 'MapPin' },
  { key: 'guestTags', name: 'Guest Tags', description: 'Name tags, 6 per A4 sheet, print-ready', icon: 'Tag' },
  { key: 'thankYouNotes', name: 'Thank You Notes', description: 'Personalised post-wedding thank you cards', icon: 'Heart' },
];

function AssetMiniPreview({ assetKey, details, theme, typography, tables, guests }) {
  const PreviewComp = ASSET_PREVIEW_MAP?.[assetKey];
  if (PreviewComp) {
    return (
      <div style={{ transform: 'scale(0.45)', transformOrigin: 'top center', width: '222%', height: '222%', pointerEvents: 'none' }}>
        <PreviewComp details={details} content={details?.assetContent?.[assetKey] || {}} theme={theme} typography={typography} tables={tables} guests={guests} />
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>✦</div>
        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: 0 }}>Preview</p>
      </div>
    </div>
  );
}

/**
 * Off-screen, print-formatted A4 grid of name tags — 6 per page, every
 * real guest across as many pages as needed (not just the handful shown
 * in the on-screen preview). Rendered invisibly so exportMultiPagePdf can
 * screenshot each page at real A4 dimensions.
 */
function GuestTagsPrintPages({ tagList, theme, typography, dark, showTable, pageRefs }) {
  const PAGE_SIZE = 6;
  const pages = [];
  for (let i = 0; i < tagList.length; i += PAGE_SIZE) pages.push(tagList.slice(i, i + PAGE_SIZE));

  return (
    <div style={{ position: 'fixed', left: -99999, top: 0 }} aria-hidden="true">
      {pages.map((pageTags, pageIndex) => (
        <div
          key={pageIndex}
          ref={el => { pageRefs.current[pageIndex] = el; }}
          style={{
            width: '210mm', height: '297mm', background: dark ? theme.darkBg : '#FFFFFF',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(3, 1fr)',
            gap: '10mm', padding: '15mm', boxSizing: 'border-box',
          }}
        >
          {pageTags.map((tag, i) => (
            <GuestTag key={i} name={tag.name} table={tag.table} theme={theme} typography={typography} dark={dark} showTable={showTable} />
          ))}
        </div>
      ))}
    </div>
  );
}

function AssetEditorOverlay({ asset, details, theme, typography, tables, guests, onSave, onClose }) {
  const PreviewComp = ASSET_PREVIEW_MAP?.[asset.key];
  const EditorComp = ASSET_EDITOR_MAP?.[asset.key];
  const Icon = ICON_MAP[asset.icon] || Calendar;
  const previewRef = useRef(null);
  const guestTagPageRefs = useRef([]);
  const [content, setContent] = useState(details?.assetContent?.[asset.key] || {});
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleChange = (field, value) => {
    const next = { ...content, [field]: value };
    setContent(next);
    onSave(asset.key, next); // debounced upstream — see StudioAssetsTab
  };

  const spec = ASSET_EXPORT_SPECS[asset.key];
  const isGuestTags = asset.key === 'guestTags';
  const tagList = isGuestTags ? buildGuestTagList(tables, guests) : [];

  const downloadAsset = async () => {
    setExporting(true);
    try {
      if (isGuestTags) {
        if (tagList.length === 0) {
          alert('No guests to print yet — add guests to your Guest List first.');
          return;
        }
        // Wait a tick for the off-screen print pages to mount/paint.
        await new Promise(r => setTimeout(r, 50));
        const pageElements = guestTagPageRefs.current.filter(Boolean);
        await exportMultiPagePdf(pageElements, { widthMm: spec.widthMm, heightMm: spec.heightMm }, `${asset.key}-name-tags`);
      } else {
        await exportAsset(previewRef.current, asset.key, asset.key);
      }
    } catch (err) {
      console.error('[StudioAssetsTab] export failed', err);
      alert('Export failed — please try again.');
    }
    setExporting(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#FFFFFF', display: 'flex', flexDirection: 'column', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Top bar */}
      <div style={{ height: 56, borderBottom: '1px solid #EEEEEE', display: 'flex', alignItems: 'center', padding: '0 20px', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
          ← Back
        </button>
        <p style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 16, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>{asset.name}</p>
        <button onClick={downloadAsset} disabled={exporting} style={{ marginLeft: 'auto', padding: '7px 16px', border: '1px solid #CCCCCC', background: 'transparent', color: '#444', fontSize: 13, fontWeight: 500, cursor: exporting ? 'default' : 'pointer', borderRadius: 4, opacity: exporting ? 0.6 : 1 }}>
          {exporting ? 'Exporting…' : `↓ Download ${spec?.format === 'png' ? 'PNG' : 'PDF'}`}
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
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(10,10,10,0.6)' }}>{asset.description}</p>
            </div>
          </div>

          <div style={{ background: '#F8F8F8', border: '1px solid #EEEEEE', padding: 16, marginBottom: 24 }}>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(10,10,10,0.6)', lineHeight: 1.6 }}>
              This asset is personalised with your couple names, wedding date, venue, and universe styling from Event Details.
            </p>
          </div>

          {EditorComp ? (
            <EditorComp content={content} onChange={handleChange} />
          ) : (
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)' }}>No editor for this asset yet.</p>
          )}
        </div>

        {/* Center — live preview (styled in the couple's active universe) */}
        <div style={{ flex: 1, background: '#F0F0F0', overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 40 }}>
          {PreviewComp ? (
            <div ref={previewRef}>
              <PreviewComp details={details} content={content} theme={theme} typography={typography} tables={tables} guests={guests} />
            </div>
          ) : (
            <div style={{ background: '#FFF', padding: 80, textAlign: 'center', color: 'rgba(10,10,10,0.6)', fontSize: 14 }}>
              <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.2 }}>✦</div>
              <p style={{ margin: 0 }}>Preview not available yet</p>
            </div>
          )}
        </div>
      </div>

      {isGuestTags && (
        <GuestTagsPrintPages
          tagList={tagList}
          theme={theme}
          typography={typography}
          dark={content.layout === 'dark'}
          showTable={content.showTable}
          pageRefs={guestTagPageRefs}
        />
      )}
    </div>
  );
}

export default function StudioAssetsTab({ details, onDetailsChange }) {
  const [openAsset, setOpenAsset] = useState(null);
  const [tables, setTables] = useState([]);
  const [guests, setGuests] = useState([]);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    Promise.all([getMyRecords('Table'), getMyRecords('Guest')])
      .then(([t, g]) => { setTables(t); setGuests(g); })
      .catch(() => {});
  }, []);

  const universeConfig = details ? resolveUniverseConfig(details) : null;
  const theme = universeConfig ? resolveColors(details) : DEFAULT_THEME;
  const typography = universeConfig ? resolveTypography(details) : DEFAULT_TYPOGRAPHY;

  const handleAssetContentChange = useCallback((assetKey, nextContent) => {
    if (!details?.id) return;
    const nextAssetContent = { ...(details.assetContent || {}), [assetKey]: nextContent };
    onDetailsChange?.({ ...details, assetContent: nextAssetContent });

    // Debounced persist — matches the autosave pattern used elsewhere in
    // the builder rather than writing on every keystroke.
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      base44.entities.WeddingDetails.update(details.id, { assetContent: nextAssetContent }).catch(err => {
        console.error('[StudioAssetsTab] save failed', err);
      });
    }, 600);
  }, [details, onDetailsChange]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', margin: '0 0 6px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Your 10 Design Pieces</h2>
        <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', margin: 0 }}>Every piece is personalised with your wedding details and designed in your chosen universe aesthetic.</p>
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
                <AssetMiniPreview assetKey={asset.key} details={details} theme={theme} typography={typography} tables={tables} guests={guests} />
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
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{asset.description}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                  <button
                    onClick={e => { e.stopPropagation(); setOpenAsset(asset); }}
                    style={{ padding: '6px 14px', border: '1px solid #0A0A0A', background: 'transparent', color: '#0A0A0A', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Edit
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
          theme={theme}
          typography={typography}
          tables={tables}
          guests={guests}
          onSave={handleAssetContentChange}
          onClose={() => setOpenAsset(null)}
        />
      )}
    </div>
  );
}
