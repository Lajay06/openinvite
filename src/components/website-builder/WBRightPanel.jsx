import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, X, Trash2 } from 'lucide-react';
import { ASSET_EDITOR_MAP } from './AssetEditors';
import { WEBSITE_THEMES, TYPOGRAPHY_PAIRINGS, TRANSITION_OPTIONS, SCROLL_ANIMATION_OPTIONS } from '@/lib/websiteThemes';
import toast from 'react-hot-toast';
import {
  FLabel, UInput, MediaPicker,
  Toggle, Divider, AddBtn,
} from './SectionEditorFields';
import { BlockFields } from './BlockFields';
import { blockLabel } from '@/components/guest-website/blocks/blockTypes';

// ── Extra primitives used only here ───────────────────────────
function SLabel({ children, onClick, isOpen }) {
  const collapsible = typeof isOpen === 'boolean';
  return (
    <p
      onClick={onClick}
      style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.4)',
        margin: '0 0 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: collapsible ? 'pointer' : 'default', userSelect: 'none',
      }}
    >
      <span>{children}</span>
      {collapsible && <span style={{ fontSize: 10 }}>{isOpen ? '▼' : '▶'}</span>}
    </p>
  );
}
function UTextarea({ label, value, onChange, rows = 3, placeholder = '' }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <FLabel>{label}</FLabel>}
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        style={{ width: '100%', border: '1px solid rgba(255,255,255,0.08)', padding: '8px', fontSize: 13, color: '#FFFFFF', outline: 'none', fontFamily: 'inherit', resize: 'vertical', background: 'rgba(255,255,255,0.08)', boxSizing: 'border-box', borderRadius: 0 }}
        onFocus={e => e.target.style.borderColor = '#E03553'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
      />
    </div>
  );
}
function PillGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(opt => {
        const sel = value === opt.id;
        return (
          <button key={opt.id} onClick={() => onChange(opt.id)} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', borderRadius: 999, border: '1px solid ' + (sel ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)'), background: sel ? 'rgba(255,255,255,0.12)' : 'transparent', color: sel ? '#fff' : 'rgba(255,255,255,0.5)', fontFamily: 'inherit' }}>{opt.name}</button>
        );
      })}
    </div>
  );
}
function ChipInput({ label, items = [], onAdd, onRemove }) {
  const [val, setVal] = useState('');
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <FLabel>{label}</FLabel>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.08)', padding: '4px 10px', fontSize: 12, borderRadius: 999 }}>
            <span style={{ color: '#FFFFFF' }}>{it}</span>
            <button onClick={() => onRemove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0, lineHeight: 1, fontSize: 14 }}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal(''); } }}
          placeholder="Type and press Enter" style={{ flex: 1, border: 'none', borderBottom: '1px solid rgba(255,255,255,0.12)', padding: '5px 0', fontSize: 12, outline: 'none', background: 'transparent', fontFamily: 'inherit', color: '#FFFFFF' }} />
        <button onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(''); } }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#E03553', fontWeight: 700, fontSize: 12, fontFamily: 'inherit' }}>+ Add</button>
      </div>
    </div>
  );
}

const selectStyle = {
  width: '100%',
  background: '#2C2C2E',
  color: '#FFFFFF',
  border: '1px solid rgba(255,255,255,0.1)',
  padding: '8px 12px',
  fontSize: 13,
  fontFamily: '"Plus Jakarta Sans", sans-serif',
  borderRadius: 4,
  outline: 'none',
  cursor: 'pointer',
  boxSizing: 'border-box',
};

// ── DESIGN TAB ────────────────────────────────────────────────
function DesignTab({ details, onChange, universeTheme }) {
  const navigate = useNavigate();

  // Theme starts collapsed — it's a secondary refinement, not the headline choice
  const [themeOpen, setThemeOpen] = useState(false);
  const [typoOpen, setTypoOpen] = useState(false);

  const activeTypoId = details.activeTypography || 'classic';
  const activeTypo = TYPOGRAPHY_PAIRINGS.find(t => t.id === activeTypoId) || TYPOGRAPHY_PAIRINGS[0];

  // Load Google Fonts for the selected pairing so the Aa preview renders correctly
  useEffect(() => {
    if (!activeTypo.googleFonts) return;
    const href = `https://fonts.googleapis.com/css2?family=${activeTypo.googleFonts}&display=swap`;
    if (document.head.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = href;
    document.head.appendChild(link);
  }, [activeTypo.googleFonts]);

  const universeName    = universeTheme?.name    || 'Aman';
  const universeAccent  = universeTheme?.accent  || '#C4956A';
  const universeFeeling = universeTheme?.feeling || 'Quiet luxury';

  return (
    <div>

      {/* ── Universe — prominent global master ───────────────── */}
      {/* Governs colour, fonts, and (in future) texture + motion */}
      <div style={{
        borderLeft: `3px solid ${universeAccent}`,
        background: 'rgba(255,255,255,0.04)',
        padding: '12px 12px 12px 14px',
        marginBottom: 16,
      }}>
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', margin: '0 0 8px', fontFamily: 'inherit' }}>
          Universe
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Accent swatch represents the universe's colour identity */}
          <div style={{ width: 28, height: 28, background: universeAccent, flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', margin: 0, lineHeight: 1.2, fontFamily: 'inherit' }}>
              {universeName}
            </p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0', fontFamily: 'inherit' }}>
              {universeFeeling}
            </p>
          </div>
          <button
            onClick={() => navigate('/studio/universe')}
            style={{
              padding: '5px 12px', background: '#E03553', color: '#FFFFFF',
              border: 'none', borderRadius: 999, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
            }}
          >
            Change
          </button>
        </div>
      </div>

      {/* ── Fine-tune palette — collapsed by default, secondary ─ */}
      <SLabel onClick={() => setThemeOpen(o => !o)} isOpen={themeOpen}>Fine-tune palette</SLabel>
      <div style={{ overflow: 'hidden', maxHeight: themeOpen ? '2000px' : '0px', transition: 'max-height 0.2s ease' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 8 }}>
        {WEBSITE_THEMES.map(t => {
          const sel = (details.activeTheme || 'still') === t.id;
          return (
            <div key={t.id} onClick={() => onChange('activeTheme', t.id)} style={{ cursor: 'pointer' }}>
              <div
                style={{ overflow: 'hidden', position: 'relative', aspectRatio: '3/2', border: sel ? '2px solid #FFFFFF' : '1px solid rgba(255,255,255,0.1)', transition: 'transform 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ height: '65%', background: t.darkBg }} />
                <div style={{ height: '35%', background: t.lightBg }} />
                <div style={{ position: 'absolute', bottom: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: t.accent, border: '1px solid rgba(0,0,0,0.15)' }} />
                {sel && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>✓</span>
                </div>}
              </div>
              <p style={{ fontSize: 10, fontWeight: 600, textAlign: 'center', margin: '3px 0 0', color: 'rgba(255,255,255,0.4)' }}>{t.name}</p>
            </div>
          );
        })}
      </div>
      </div>
      <Divider />
      <SLabel onClick={() => setTypoOpen(o => !o)} isOpen={typoOpen}>
        {`Typography · ${activeTypo.name}`}
      </SLabel>
      <div style={{ overflow: 'hidden', maxHeight: typoOpen ? '700px' : '0px', transition: 'max-height 0.2s ease' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 8 }}>
          {TYPOGRAPHY_PAIRINGS.map(t => {
            const sel = activeTypoId === t.id;
            return (
              <div
                key={t.id}
                onClick={() => onChange('activeTypography', t.id)}
                style={{
                  border: sel ? '2px solid rgba(255,255,255,0.7)' : '1px solid rgba(255,255,255,0.1)',
                  padding: '10px 12px', cursor: 'pointer',
                  background: sel ? 'rgba(255,255,255,0.08)' : 'transparent',
                  position: 'relative', transition: 'border-color 0.15s',
                }}
              >
                {sel && (
                  <div style={{ position: 'absolute', top: 5, right: 5, width: 13, height: 13, borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: '#0A0A0A', lineHeight: 1 }}>✓</span>
                  </div>
                )}
                <p style={{ fontFamily: t.fontDisplay, fontSize: 18, fontWeight: 400, color: '#FFFFFF', margin: '0 0 2px', lineHeight: 1 }}>Aa</p>
                <p style={{ fontSize: 10, fontWeight: 700, color: sel ? '#FFFFFF' : 'rgba(255,255,255,0.6)', margin: '0 0 1px', fontFamily: 'inherit' }}>{t.name}</p>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', margin: 0, fontFamily: 'inherit' }}>{t.description}</p>
              </div>
            );
          })}
        </div>
      </div>
      <Divider />
      <SLabel>Animations</SLabel>
      <div style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.5)', margin: '0 0 6px' }}>Page transition</p>
        <PillGroup options={TRANSITION_OPTIONS} value={details.pageTransition || 'fade'} onChange={v => onChange('pageTransition', v)} />
      </div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.5)', margin: '0 0 6px' }}>Scroll animation</p>
        <PillGroup options={SCROLL_ANIMATION_OPTIONS} value={details.scrollAnimation || 'subtle'} onChange={v => onChange('scrollAnimation', v)} />
      </div>
    </div>
  );
}

// ── SETTINGS TAB ──────────────────────────────────────────────
function SettingsTab({ details, onChange }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const siteUrl = details.slug ? `${origin}/w/${details.slug}` : '';
  const copyLink = () => {
    if (!siteUrl) { toast.error('Set a URL slug first.'); return; }
    navigator.clipboard.writeText(siteUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div>
      <SLabel>Your site URL</SLabel>
      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.08)', padding: '7px 10px', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>openinvite.com.au/w/</span>
        <input value={details.slug || ''} onChange={e => onChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
          placeholder="your-names" style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: '#FFFFFF', outline: 'none', fontFamily: 'inherit' }} />
      </div>
      {siteUrl && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', padding: '6px 10px', marginBottom: 16 }}>
          <span style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)', wordBreak: 'break-all' }}>{siteUrl}</span>
          <button onClick={copyLink} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: copied ? '#22C55E' : 'rgba(255,255,255,0.4)', fontWeight: 700, flexShrink: 0, fontFamily: 'inherit' }}>{copied ? 'Copied!' : 'Copy'}</button>
        </div>
      )}
      <Divider />
      <SLabel>Status</SLabel>
      <Toggle label={`Website is ${details.websiteEnabled ? 'Live' : 'Hidden'}`} value={details.websiteEnabled} onChange={v => onChange('websiteEnabled', v)} />
      <Divider />
      <SLabel>Password protection</SLabel>
      <Toggle label="Require password" value={!!(details.websitePassword?.trim())} onChange={v => onChange('websitePassword', v ? ' ' : '')} />
      {details.websitePassword?.trim() && (
        <UInput label="Password" value={details.websitePassword} onChange={v => onChange('websitePassword', v)} />
      )}
      <Divider />
      {siteUrl && (
        <>
          <button onClick={copyLink} style={{ width: '100%', padding: '10px 0', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 13, fontWeight: 600, borderRadius: 999, marginBottom: 8, fontFamily: 'inherit' }}>
            {copied ? '✓ Copied!' : 'Copy link'}
          </button>
          <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent("You're invited! " + siteUrl)}`, '_blank')}
            style={{ width: '100%', padding: '10px 0', border: 'none', background: '#25D366', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, borderRadius: 999, marginBottom: 12, fontFamily: 'inherit' }}>
            Share on WhatsApp
          </button>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(siteUrl)}&size=120x120&margin=8`} width={120} height={120} alt="QR" />
          </div>
        </>
      )}
    </div>
  );
}

// ── CONTENT TAB ─────────────────────────────────────────────────
// The real per-field content editor — writes directly to the exact
// fields the published page components read (coupleNames, weddingDate,
// homeContent.tagline, ourStoryContent.storyText), the same way
// DesignTab's coverPhoto/heroVideoUrl fields already do. This replaces
// the old section-content editor (WBRightPanel's per-section form,
// reachable only by clicking a rendered section) as the actual editing
// surface for this content — that editor became unreachable once the
// builder preview stopped rendering pageSections (fix/builder-preview-
// parity), and even before that, section edits wrote to
// pageSections[page][i].content, a field the real guest-facing pages
// have never read since the published render tree stopped consuming
// pageSections. This is NOT a return to the section canvas: it writes
// straight to homeContent/ourStoryContent/etc., not to pageSections.
//
// Ceremony/reception venue, times, dress code, and pre/post-wedding
// events already have a real, working editor — EventDetails.jsx (the
// /event-details planner page) — so those are surfaced here as a
// read-only reference + link out, not rebuilt as a second, divergent
// write path onto the same mainCeremony/reception fields.
function ContentTab({ details, onChange }) {
  const updateNested = (field, key, value) => {
    onChange(field, { ...(details?.[field] || {}), [key]: value });
  };
  const enabledPages = details?.enabledPages || ['home'];

  const storyPhotos = details?.ourStoryContent?.photos || [];
  const setStoryPhotos = (photos) => updateNested('ourStoryContent', 'photos', photos);

  const milestones = details?.ourStoryContent?.milestones || [];
  const setMilestones = (next) => updateNested('ourStoryContent', 'milestones', next);

  const gallery = details?.photosContent?.gallery || [];
  const setGallery = (photos) => updateNested('photosContent', 'gallery', photos);

  return (
    <div>
      <SLabel>The couple</SLabel>
      <UInputDark
        label="Couple names"
        value={details?.coupleNames}
        onChange={v => onChange('coupleNames', v)}
        placeholder="Sarah &amp; James"
      />
      <UInputDark
        label="Wedding date"
        type="date"
        value={details?.weddingDate}
        onChange={v => onChange('weddingDate', v)}
      />
      <Divider />

      <SLabel>Home page</SLabel>
      <MediaPicker
        label="Hero photo"
        value={details?.coverPhoto}
        onChange={v => onChange('coverPhoto', v)}
        aspectRatio="16/9"
      />
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.5)', margin: '0 0 6px' }}>Hero video URL</p>
        <input
          type="text" value={details?.heroVideoUrl || ''} onChange={e => onChange('heroVideoUrl', e.target.value)}
          placeholder="Direct .mp4 file, YouTube, or Vimeo URL"
          style={{ width: '100%', border: '1px solid rgba(255,255,255,0.08)', padding: '8px', fontSize: 13, color: '#FFFFFF', outline: 'none', fontFamily: 'inherit', background: 'rgba(255,255,255,0.08)', boxSizing: 'border-box', borderRadius: 0 }}
          onFocus={e => e.target.style.borderColor = '#E03553'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
        />
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: '6px 0 0' }}>
          Takes priority over the hero photo when set. Falls back to the photo if the video fails to load.
        </p>
      </div>
      <UTextarea
        label="Tagline"
        value={details?.homeContent?.tagline}
        onChange={v => updateNested('homeContent', 'tagline', v)}
        rows={2}
        placeholder="We are overjoyed to celebrate with you."
      />
      <Divider />

      <SLabel>Our story</SLabel>
      <UTextarea
        label="Story"
        value={details?.ourStoryContent?.storyText}
        onChange={v => updateNested('ourStoryContent', 'storyText', v)}
        rows={6}
        placeholder="How you met, your journey together..."
      />
      <FLabel>Story photos</FLabel>
      <PhotoGrid photos={storyPhotos} onChange={setStoryPhotos} />
      <div style={{ marginBottom: 14 }} />
      <MilestoneEditor milestones={milestones} onChange={setMilestones} />
      <Divider />

      {enabledPages.includes('photos') && (
        <>
          <SLabel>Photos page</SLabel>
          <FLabel>Gallery</FLabel>
          <PhotoGrid photos={gallery} onChange={setGallery} />
          <Divider />
        </>
      )}

      <SLabel>Ceremony &amp; reception</SLabel>
      <MasterDataReferenceDark
        label="Ceremony venue"
        value={details?.mainCeremony?.venueName}
        detail={formatWhen(details?.mainCeremony)}
      />
      <MasterDataReferenceDark
        label="Reception venue"
        value={details?.reception?.venueName}
        detail={formatWhen(details?.reception)}
      />
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '-6px 0 0' }}>
        Venue, times, dress code, and other events are set in the wedding planner (with address lookup and maps) — not duplicated here to avoid two places to keep in sync.
      </p>
    </div>
  );
}

function formatWhen(eventLike) {
  const time = eventLike?.startTime || eventLike?.time;
  return time || null;
}

// Add/remove grid of photos backed by the shared media library +
// upload flow (base44.integrations.Core.UploadFile under the hood via
// MediaPicker's MediaLibraryContext) — same upload path used everywhere
// else in the builder, not a separate integration.
function PhotoGrid({ photos, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 10 }}>
          {photos.map((p, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', background: 'rgba(255,255,255,0.08)' }}>
              <img src={p} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              <button onClick={() => onChange(photos.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer' }}>×</button>
            </div>
          ))}
        </div>
      )}
      <MediaPicker label="" value="" onChange={v => v && onChange([...photos, v])} aspectRatio="1/1" />
    </div>
  );
}

function MilestoneEditor({ milestones, onChange }) {
  const update = (i, key, val) => {
    const next = [...milestones];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };
  return (
    <div style={{ marginBottom: 14 }}>
      <FLabel>Timeline milestones</FLabel>
      {milestones.map((m, i) => (
        <div key={i} style={{ border: '1px solid rgba(255,255,255,0.08)', padding: 10, marginBottom: 8, position: 'relative' }}>
          <button onClick={() => onChange(milestones.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 16 }}>×</button>
          <UInputDark label="Date" value={m.date} onChange={v => update(i, 'date', v)} placeholder="e.g. June 2021" />
          <UInputDark label="What happened" value={m.text} onChange={v => update(i, 'text', v)} placeholder="e.g. Our first date" />
        </div>
      ))}
      <AddBtn onClick={() => onChange([...milestones, { date: '', text: '' }])}>Add milestone</AddBtn>
    </div>
  );
}

function UInputDark({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.5)', margin: '0 0 6px' }}>{label}</p>}
      <input
        type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', border: '1px solid rgba(255,255,255,0.08)', padding: '8px', fontSize: 13, color: '#FFFFFF', outline: 'none', fontFamily: 'inherit', background: 'rgba(255,255,255,0.08)', boxSizing: 'border-box', borderRadius: 0, colorScheme: 'dark' }}
        onFocus={e => e.target.style.borderColor = '#E03553'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
      />
    </div>
  );
}

function MasterDataReferenceDark({ label, value, detail }) {
  return (
    <div style={{ marginBottom: 8 }}>
      {label && <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.5)', margin: '0 0 6px' }}>{label}</p>}
      <a
        href="/event-details"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none' }}
      >
        <span style={{ fontSize: 13, color: value ? '#FFFFFF' : 'rgba(255,255,255,0.35)' }}>
          {value || 'Not set yet'}{detail ? ` · ${detail}` : ''}
        </span>
        <span style={{ fontSize: 11, color: '#E03553', fontWeight: 600, whiteSpace: 'nowrap' }}>Edit in Planner →</span>
      </a>
    </div>
  );
}


// ── MAIN COMPONENT ────────────────────────────────────────────
// MediaLibraryContext is provided by the parent (StudioWebsite.jsx), not
// here — it now also needs to wrap the on-canvas block editor
// (feat/component-library), which lives outside this panel, so ownership
// moved up to the one place both can share it.
export default function WBRightPanel({ details, universeTheme, onChange, rightTab, onRightTabChange, selectedAsset, assetContent, onAssetChange, onClearAsset, selectedBlock, onUpdateSelectedBlockContent, onDeleteSelectedBlock, onClearSelectedBlock }) {
  const AssetEditorComp = selectedAsset ? ASSET_EDITOR_MAP[selectedAsset] : null;

  return (
    <>
      <div style={{ width: '100%', flexShrink: 0, background: '#1C1C1E', borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflowY: (selectedAsset || selectedBlock) ? 'hidden' : 'auto', zIndex: 50, height: '100%', color: '#FFFFFF' }}>

        {selectedBlock ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.35)' }}>Editing block</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>{blockLabel(selectedBlock.type)}</p>
              </div>
              <button onClick={onClearSelectedBlock} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4 }}><X size={16} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              <BlockFields block={selectedBlock} updateContent={onUpdateSelectedBlockContent} />
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <button
                onClick={onDeleteSelectedBlock}
                style={{ width: '100%', padding: '8px', border: '1px solid rgba(224,53,83,0.4)', background: 'transparent', color: '#E03553', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Trash2 size={13} /> Delete block
              </button>
            </div>
          </div>
        ) : selectedAsset ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button onClick={onClearAsset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 2, display: 'flex', alignItems: 'center' }}><ChevronLeft size={16} /></button>
              <div>
                <p style={{ margin: '0 0 1px', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: 'rgba(255,255,255,0.35)' }}>Editing asset</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#FFFFFF', textTransform: 'capitalize' }}>{selectedAsset.replace(/([A-Z])/g, ' $1').trim()}</p>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {AssetEditorComp ? (
                <AssetEditorComp content={assetContent} onChange={(field, value) => onAssetChange(selectedAsset, field, value)} />
              ) : (
                <p style={{ padding: 16, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>No editor for this asset.</p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Design / Content / Settings tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, position: 'sticky', top: 0, background: '#1C1C1E', zIndex: 10 }}>
              {[{ id: 'design', label: 'Design' }, { id: 'content', label: 'Content' }, { id: 'settings', label: 'Settings' }].map(tab => (
                <button key={tab.id} onClick={() => onRightTabChange(tab.id)} style={{ flex: 1, height: 44, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: rightTab === tab.id ? '#FFFFFF' : 'rgba(255,255,255,0.35)', borderBottom: rightTab === tab.id ? '2px solid #FFFFFF' : '2px solid transparent', fontFamily: 'inherit' }}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
              {rightTab === 'design' ? (
                <DesignTab details={details} onChange={onChange} universeTheme={universeTheme} />
              ) : rightTab === 'content' ? (
                <ContentTab details={details} onChange={onChange} />
              ) : (
                <SettingsTab details={details} onChange={onChange} />
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
