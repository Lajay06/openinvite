import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, X, Trash2, Music } from 'lucide-react';
import { ASSET_EDITOR_MAP } from './AssetEditors';
import { TRANSITION_OPTIONS, SCROLL_ANIMATION_OPTIONS, normalizeUniverseKey } from '@/lib/websiteThemes';
import { CURATED_FONTS, FONT_CATALOG, UNIVERSE_DEFAULT_FONT_IDS, universePairingPresets } from '@/lib/curatedFonts';
import { useWebsitePasswordGate } from '@/lib/websitePasswordGate';
import toast from 'react-hot-toast';
import { base44 } from '@/api/base44Client';
import { validateUploadFile } from '@/lib/uploadValidation';
import {
  FLabel, UInput, MediaPicker,
  Toggle, Divider, AddBtn,
} from './SectionEditorFields';
import { BlockFields } from './BlockFields';
import { blockLabel } from '@/components/guest-website/blocks/blockTypes';
import { TEXT_COLOR_OPTIONS, BACKGROUND_OPTIONS, SPACING_OPTIONS, JUSTIFY_CAPABLE_TYPES, FONT_STYLE_OPTIONS, FONT_STYLE_CAPABLE_TYPES } from '@/components/guest-website/blocks/UniverseBlocks';
import { interactiveDivProps } from '@/lib/a11y';
import { loadFontFamilies, familiesFromGoogleSpec } from '@/lib/selfHostedFonts';
import { flattenOver, readableInkOn, contrastRatio } from '@/lib/surfaceTint';

// Background music: writing surface HIDDEN (owner decision, video-sound batch).
// guestExperienceSettings.backgroundMusic had two sources: 'curated' (the mood
// loops, dropped -- Openinvite licenses no music) and 'upload' (couple-supplied
// audio, also declined). Both were declined, so the control writes a field
// nothing should set. Sound on the guest site now comes only from the couple's
// own uploaded or linked video.
//
// A flag rather than a deletion: UI only, the schema field stays declared and
// stored values are untouched (undeclaring is on the post-launch list), and the
// markup stays reviewable if the decision is ever revisited.
const SHOW_BACKGROUND_MUSIC_UI = false;

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
            <button onClick={() => onRemove(i)} aria-label={`Remove ${it}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0, lineHeight: 1, fontSize: 14 }}>×</button>
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

// Loads every font in FONT_CATALOG on demand (only when the picker is
// actually opened), so a visitor to the published site never pays for
// fonts the couple didn't choose — see DesignTab's own effect for the
// eager, always-on load of just the 2 active fonts.
function loadCatalogFontsOnce() {
  if (loadCatalogFontsOnce._done) return;
  loadCatalogFontsOnce._done = true;
  const seen = new Set();
  FONT_CATALOG.forEach(font => {
    if (!font.googleFonts || seen.has(font.googleFonts)) return;
    seen.add(font.googleFonts);
    // Self-hosted (L1b): the picker's preview faces load from our own origin.
    loadFontFamilies(familiesFromGoogleSpec(font.googleFonts));
  });
}

// A single custom dropdown shared by the heading/body pickers — a native
// <select> can't render each option in its own font on most platforms, so
// this renders each option's own label set in its own font instead. Kept
// deliberately compact (small previewSize, tight row padding, ellipsis
// overflow) — a couple is scanning 30 options, not admiring a single big
// specimen.
function FontDropdown({ value, onChange, previewSize = 14 }) {
  const [open, setOpen] = useState(false);
  const active = CURATED_FONTS[value];
  const labelStyle = { display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

  const toggle = () => {
    if (!open) loadCatalogFontsOnce();
    setOpen(o => !o);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={toggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '7px 10px', border: '1px solid rgba(255,255,255,0.15)', background: open ? 'rgba(255,255,255,0.08)' : 'transparent',
          cursor: 'pointer', color: '#FFFFFF', fontFamily: 'inherit', minWidth: 0,
        }}
      >
        <span style={{ ...labelStyle, fontFamily: active?.family, fontSize: previewSize, lineHeight: 1.3 }}>
          {active?.label || 'Universe default'}
        </span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 4,
            maxHeight: 220, overflowY: 'auto', background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {FONT_CATALOG.map(font => {
            const sel = font.id === value;
            return (
              <div
                key={font.id}
                onClick={() => { onChange(font.id); setOpen(false); }}
                {...interactiveDivProps(() => { onChange(font.id); setOpen(false); }, { label: font.label })}
                style={{
                  padding: '6px 10px', cursor: 'pointer',
                  background: sel ? 'rgba(255,255,255,0.1)' : 'transparent',
                }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ ...labelStyle, fontFamily: font.family, fontWeight: font.weight || 400, fontSize: previewSize, color: '#FFFFFF', lineHeight: 1.3 }}>
                  {font.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── DESIGN TAB ────────────────────────────────────────────────
function DesignTab({ details, onChange, universeTheme }) {
  const navigate = useNavigate();

  const [typoOpen, setTypoOpen] = useState(false);

  // feat/block-styling-curated + feat/block-styling-v2: the universe (not
  // the generic activeTypography picker) governs typography by default —
  // see resolveTypography() in universeStyling.js. weddingDetails.
  // fontOverride = { headingFontId, bodyFontId } lets a couple choose ANY
  // of the 30 fonts in FONT_CATALOG for either role individually; unset
  // falls back to the universe's own default, unchanged. Pairing presets
  // stay per-universe curated shortcuts (universePairingPresets), not a
  // restriction on what the dropdowns themselves offer.
  const universeKey = normalizeUniverseKey(details.activeUniverse) || 'london';
  const universeDefaults = UNIVERSE_DEFAULT_FONT_IDS[universeKey] || UNIVERSE_DEFAULT_FONT_IDS.london;
  const pairingPresets = universePairingPresets(universeKey);

  const activeHeadingId = details.fontOverride?.headingFontId || universeDefaults.headingFontId;
  const activeBodyId = details.fontOverride?.bodyFontId || universeDefaults.bodyFontId;

  const setHeadingFont = (id) => onChange('fontOverride', { headingFontId: id, bodyFontId: activeBodyId });
  const setBodyFont = (id) => onChange('fontOverride', { headingFontId: activeHeadingId, bodyFontId: id });
  const setPairing = (preset) => onChange('fontOverride', { headingFontId: preset.headingFontId, bodyFontId: preset.bodyFontId });

  // Load Google Fonts for the two ACTIVE fonts only — not all 30 — so this
  // stays cheap regardless of catalog size (item 9: "load efficiently, only
  // selected fonts").
  useEffect(() => {
    [activeHeadingId, activeBodyId].forEach(id => {
      const gf = CURATED_FONTS[id]?.googleFonts;
      if (!gf) return;
        // Self-hosted (L1b).
      loadFontFamilies(familiesFromGoogleSpec(gf));
    });
  }, [activeHeadingId, activeBodyId]);

  const universeName    = universeTheme?.name    || 'London';
  const universeAccent  = universeTheme?.accent  || '#C4956A';
  const universeFeeling = universeTheme?.feeling || 'Quiet luxury';

  return (
    <div>

      {/* ── Universe — prominent global master ───────────────── */}
      {/* Governs color, fonts, and (in future) texture + motion */}
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
          {/* Accent swatch represents the universe's color identity */}
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

      <SLabel onClick={() => setTypoOpen(o => !o)} isOpen={typoOpen}>
        {`Typography · ${CURATED_FONTS[activeHeadingId]?.label || 'Universe default'}`}
      </SLabel>
      <div style={{ overflow: 'hidden', maxHeight: typoOpen ? '2000px' : '0px', transition: 'max-height 0.2s ease' }}>
        {/* Pairing presets — one-click combos, always includes this
            universe's own default as the first option. */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {pairingPresets.map(preset => {
            const sel = activeHeadingId === preset.headingFontId && activeBodyId === preset.bodyFontId;
            return (
              <button
                key={preset.id}
                onClick={() => setPairing(preset)}
                style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 999, border: '1px solid ' + (sel ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)'), background: sel ? 'rgba(255,255,255,0.12)' : 'transparent', color: sel ? '#fff' : 'rgba(255,255,255,0.5)', fontFamily: 'inherit' }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <FLabel>Heading font</FLabel>
        <FontDropdown value={activeHeadingId} onChange={setHeadingFont} previewSize={15} />

        <div style={{ marginTop: 14 }}>
          <FLabel>Body font</FLabel>
          <FontDropdown value={activeBodyId} onChange={setBodyFont} previewSize={13} />
        </div>

        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '10px 0 8px' }}>
          Choose from 30 curated fonts — every option stays within {universeTheme?.name || 'this universe'}'s palette and mood.
        </p>
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
  const [musicUploading, setMusicUploading] = useState(false);

  // The gate hook persists through /api/my-wedding-details immediately — the
  // credential is hashed server-side and must never ride StudioWebsite's
  // Save, which writes to base44 directly and would store plaintext over the
  // hash. This callback only mirrors the result into the local draft so the
  // panel re-renders; websitePassword/websitePasswordEnabled are excluded
  // from that page's WRITABLE_FIELDS for the same reason.
  const passwordGate = useWebsitePasswordGate(details, (patch) => {
    if ('websitePasswordEnabled' in patch) onChange('websitePasswordEnabled', patch.websitePasswordEnabled);
    if ('websitePassword' in patch) onChange('websitePasswordIsSet', !!patch.websitePassword?.trim());
  });
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const siteUrl = details.slug ? `${origin}/w/${details.slug}` : '';
  const copyLink = () => {
    if (!siteUrl) { toast.error('Set a URL slug first.'); return; }
    navigator.clipboard.writeText(siteUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Same guestExperienceSettings.backgroundMusic field GuestSuitePolicies.jsx
  // (Guest suite -> Policies -> Guest experience tab) reads/writes — one
  // setting, two places a couple might look for it. `details` here is the
  // same WeddingDetails record either way (StudioWebsite.jsx's doSave()
  // persists the whole details object on every save, so nothing about this
  // field gets dropped by editing it from this panel instead).
  const backgroundMusic = details.guestExperienceSettings?.backgroundMusic || { enabled: false, url: '', trackName: '' };
  const setBGMusic = (patch) => onChange('guestExperienceSettings', {
    ...(details.guestExperienceSettings || {}),
    backgroundMusic: { ...backgroundMusic, ...patch },
  });
  const handleMusicUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const err = validateUploadFile(file, 'audio');
    if (err) { toast.error(err); return; }
    setMusicUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setBGMusic({ enabled: true, source: 'upload', url: file_url, trackId: '', trackName: file.name });
      toast.success('Track uploaded');
    } catch {
      toast.error('Failed to upload track');
    }
    setMusicUploading(false);
  };


  return (
    <div>
      <SLabel>Your site URL</SLabel>
      {/* NOT AN INPUT. The address is built from the couple's names and follows
          them until the first invitation exists — see src/lib/weddingAddress.js.
          There was an editor here; the owner's question was "why do they HAVE to
          be able to edit?" and the answer was that they don't, and nobody had
          ever asked to. */}
      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', padding: '8px 10px', gap: 4 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>openinvite.com.au/w/</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#FFFFFF', wordBreak: 'break-all' }}>{details.slug || '\u2026'}</span>
      </div>
      <p style={{ fontSize: 11, lineHeight: 1.5, margin: '6px 0 0', color: 'rgba(255,255,255,0.45)' }}>
        Built from your names. Change a name and this follows &mdash; until your first invitation goes out, after which it stays put so links keep working.
      </p>
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
      {SHOW_BACKGROUND_MUSIC_UI && (<>
      <SLabel>Background music</SLabel>
      <Toggle label="Play music on your invite/website" value={backgroundMusic.enabled} onChange={v => setBGMusic({ enabled: v })} />
      {backgroundMusic.enabled && (
        <div style={{ marginTop: 10 }}>
          {backgroundMusic.url ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.08)', padding: '7px 10px' }}>
              <Music size={13} style={{ color: '#E03553', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {backgroundMusic.trackName || 'Selected track'}
              </span>
              <button
                onClick={() => setBGMusic({ enabled: false, source: '', url: '', trackId: '', trackName: '' })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', flexShrink: 0 }}
                aria-label="Remove track"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1px dashed rgba(255,255,255,0.2)', padding: '10px 0', cursor: musicUploading ? 'default' : 'pointer', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
              {musicUploading ? 'Uploading…' : 'Upload a track (MP3, WAV)'}
              <input type="file" accept="audio/*" onChange={handleMusicUpload} disabled={musicUploading} style={{ display: 'none' }} />
            </label>
          )}
        </div>
      )}
      </>)}
      <Divider />
      <SLabel>Password protection</SLabel>
      <Toggle label="Require password" value={passwordGate.wantsProtection} onChange={passwordGate.toggle} />
      {passwordGate.wantsProtection && (
        <>
          <UInput label={passwordGate.hasStoredPassword ? 'New password' : 'Password'} type="password" value={passwordGate.password} onChange={passwordGate.setPassword} onCommit={passwordGate.commitPassword} />
          {passwordGate.hasStoredPassword ? (
            <p style={{ margin: '-4px 0 8px', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
              A password is set and can&rsquo;t be shown again. Type a new one to replace it, or{' '}
              <button onClick={passwordGate.clearPassword} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', textDecoration: 'underline' }}>remove it</button>.
            </p>
          ) : passwordGate.incomplete && (
            <p style={{ margin: '-4px 0 8px', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Enter a password to turn protection on. Until you do, your site stays public.</p>
          )}
        </>
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
      {/* TWO FIELDS, NOT ONE. This was a single "Couple names" input writing
          `coupleNames` — the DERIVED copy — while EventDetails wrote the
          partner fields. Two writers, two answers, and the copy is what 40+
          surfaces read. Splitting it here means the builder and EventDetails
          now edit the same truth. */}
      <UInputDark
        label="Partner 1 name"
        value={details?.couple1Name || ''}
        onChange={v => onChange('couple1Name', v)}
        placeholder="Sarah"
      />
      <UInputDark
        label="Partner 2 name"
        value={details?.couple2Name || ''}
        onChange={v => onChange('couple2Name', v)}
        placeholder="James"
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
      {/* THE COUPLE'S MARK OVER THEIR OWN MEDIA. Sits directly under the hero
          fields because that is what it lands on — photo or video, whichever
          renders. The preview beside this panel composites it over the REAL
          media, not a placeholder: a monogram previewed over a gray box and
          shipped over a sunset is not a preview. */}
      <MediaPicker
        label="Monogram or mark"
        value={details?.homeContent?.overlay?.url}
        onChange={v => updateNested('homeContent', 'overlay', { ...(details?.homeContent?.overlay || {}), url: v })}
        aspectRatio="16/9"
      />
      {details?.homeContent?.overlay?.url && (
        <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { key: 'scale', label: 'Size',      min: 5,  max: 90,  def: 30, suffix: '% of width' },
            { key: 'x',     label: 'Across',    min: 0,  max: 100, def: 50, suffix: '%' },
            { key: 'y',     label: 'Down',      min: 0,  max: 100, def: 14, suffix: '%' },
            // DEFAULT 0 — off. A scrim is a dial the couple turns, not a value
            // we derive, and there is no automatic contrast rescue here.
            { key: 'scrim', label: 'Darken photo behind it', min: 0, max: 80, def: 0, suffix: '%' },
          ].map(f => {
            const cur = details?.homeContent?.overlay?.[f.key];
            const val = Number.isFinite(cur) ? cur : f.def;
            return (
              <label key={f.key} style={{ display: 'block' }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.5)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{f.label}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{val}{f.suffix === '%' ? '%' : ` ${f.suffix}`}</span>
                </span>
                <input
                  type="range" min={f.min} max={f.max} value={val}
                  onChange={e => updateNested('homeContent', 'overlay', {
                    ...(details?.homeContent?.overlay || {}), [f.key]: Number(e.target.value),
                  })}
                  style={{ width: '100%', accentColor: '#E03553' }}
                />
              </label>
            );
          })}
          <button
            onClick={() => updateNested('homeContent', 'overlay', undefined)}
            style={{ alignSelf: 'flex-start', fontSize: 12, color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >Remove mark</button>
        </div>
      )}
      <UTextarea
        label="Tagline"
        value={details?.homeContent?.tagline}
        onChange={v => updateNested('homeContent', 'tagline', v)}
        rows={2}
        // GUIDANCE, not a publishable sentence. This placeholder used to be the
        // exact string the site published when the field was empty — grayed
        // out, which reads as "example", while it actually went out to guests
        // in the couple's first person. The page publishes nothing now, so the
        // placeholder describes what to write instead of writing it for them.
        placeholder="A line to welcome your guests"
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
              <button onClick={() => onChange(photos.filter((_, j) => j !== i))} aria-label="Remove photo" style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer' }}>×</button>
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
          <button onClick={() => onChange(milestones.filter((_, j) => j !== i))} aria-label="Remove milestone" style={{ position: 'absolute', top: 6, right: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 16 }}>×</button>
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


// ── PER-BLOCK STYLE PANEL ──────────────────────────────────────
// feat/block-styling-v2: curated-only style controls for a selected block.
// Every option resolves against the ACTIVE UNIVERSE's own tokens
// (resolveColors output, read via universeTheme) — no free hex picker, no
// arbitrary px size, no custom font. TEXT_COLOR_OPTIONS/BACKGROUND_OPTIONS/
// SPACING_OPTIONS are imported from UniverseBlocks.jsx (not redefined here)
// so the swatch a couple clicks and the color that actually renders can
// never drift apart. See resolveBlockStyle() there for how these map back
// to real rendered styles, and BUILDER_BLOCK_SCOPE.md for the "freedom
// within beauty" principle this keeps intact at the per-block layer.
//
// Alignment and size only apply to text-forward block types (a gallery or
// countdown block has no meaningful "alignment" to change) — shown only
// when the selected block's type actually uses them, so nothing here can
// be clicked with no visible effect. Spacing, by contrast, is meaningful
// breathing room for EVERY block type, so it always shows.
const ALIGN_CAPABLE_TYPES = ['heading', 'subheading', 'paragraph', 'quote', 'list', 'two-column-text', 'dress-code'];
const SIZE_CAPABLE_TYPES = ['heading', 'subheading', 'paragraph', 'quote'];
// gallery/video/spacer have no meaningful text; button/quote-banner set
// their own fixed-contrast color deliberately (a colored label on an
// accent pill, pale text on a dark band) — a text-color override on
// theme.lightText would have no visible effect for any of these.
const NO_TEXT_COLOR_TYPES = ['gallery', 'video', 'spacer', 'button', 'quote-banner'];
const SIZE_STEPS = ['XS', 'S', 'M', 'L', 'XL'];

// Spacing now applies to every block type, so there's always at least one
// style control to show.
export function blockSupportsAnyStyle() {
  return true;
}

function BlockStylePanel({ block, theme, universeTheme, updateStyle }) {
  const style = block.style || {};
  const accent = universeTheme?.accent || '#C4956A';
  const supportsAlign = ALIGN_CAPABLE_TYPES.includes(block.type);
  const supportsJustify = JUSTIFY_CAPABLE_TYPES.includes(block.type);
  const supportsSize = SIZE_CAPABLE_TYPES.includes(block.type);
  const supportsTextColor = !NO_TEXT_COLOR_TYPES.includes(block.type);
  const supportsFontStyle = FONT_STYLE_CAPABLE_TYPES.includes(block.type);

  // No fallback-to-first-option in any of these: when the block has no
  // style override for a property, NOTHING is shown selected — that
  // honestly represents "using this block type's own default look" rather
  // than implying a specific option.
  const pillRow = (options, activeValue, key) => (
    <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
      {options.map(opt => {
        const sel = activeValue === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => updateStyle(key, sel ? undefined : opt.value)}
            title={opt.label}
            style={{
              flex: '1 0 auto', padding: '8px 10px', fontSize: 10, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
              border: sel ? `2px solid ${accent}` : '1px solid rgba(255,255,255,0.12)',
              background: sel ? 'rgba(255,255,255,0.08)' : 'transparent', color: sel ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  // WARN, NEVER BLOCK — it is their wedding. With no text color chosen the ink
  // is picked automatically to clear 4.5:1, so this can only fire on a
  // deliberate override. It names the measured ratio rather than saying
  // "poor contrast", because a number is actionable and an adjective is not.
  const contrastWarning = (() => {
    if (!style.background || style.background === 'none') return null;
    if (!style.textColor) return null;                    // auto-picked, always passes
    const t = theme || {};
    const isHex = /^#[0-9a-fA-F]{6}$/.test(style.background);
    const bgOpt = BACKGROUND_OPTIONS.find(o => o.value === style.background);
    const txOpt = TEXT_COLOR_OPTIONS.find(o => o.value === style.textColor);
    if ((!bgOpt && !isHex) || !txOpt) return null;
    const rawBg = isHex ? style.background : bgOpt.resolve(t);
    const ground = t.lightBg || '#FFFFFF';
    const solid = flattenOver(rawBg, ground);
    const ink = flattenOver(txOpt.resolve(t), solid);
    const ratio = contrastRatio(ink, solid);
    if (ratio >= 4.5) return null;
    const auto = readableInkOn(rawBg, t, ground);
    return (
      <div style={{
        display: 'flex', gap: 8, alignItems: 'flex-start',
        padding: '10px 12px', marginBottom: 14,
        background: 'rgba(224,53,83,0.10)', border: '1px solid rgba(224,53,83,0.35)',
        fontSize: 12, lineHeight: 1.5, color: 'rgba(255,255,255,0.88)',
      }}>
        <span aria-hidden="true" style={{ fontWeight: 700 }}>&#9650;</span>
        <span>
          This text sits at <strong>{ratio.toFixed(1)}:1</strong> on this background.
          Guests may struggle to read it below 4.5:1.
          {auto.passes && <> Clearing the text color uses one at {auto.ratio.toFixed(1)}:1.</>}
        </span>
      </div>
    );
  })();

  const colorSwatchGrid = (options, activeValue, key) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 14 }}>
      {options.map(opt => {
        const sel = activeValue === opt.value;
        // theme (resolveColors output: darkBg/lightBg/lightText/accent/
        // accentSecondary), NOT universeTheme — universeTheme is a
        // separate, legacy-shaped object (StudioWebsite.jsx) that renames
        // these same values to text/secondary/background/primary for its
        // own font-preview purposes. Passing universeTheme here silently
        // produced undefined for every text-*/accent2-* swatch, which is
        // why the grid looked identical (mostly blank) across universes —
        // only the 3 accent-* swatches happened to resolve at all, since
        // universeTheme.accent (not .lightText/.accentSecondary) is one of
        // the few fields it does carry over.
        // COMPOSITE OVER THE PAGE GROUND, not this panel's dark surface.
        // The tints carry alpha, and the same token over two different grounds
        // reads as two different colors: `#2B21181a` composites to near-black
        // over the panel and to a barely-there cream over the site. The swatch
        // was telling the couple a truth about the panel and a lie about their
        // wedding. A preview must composite over the ground of the thing it
        // previews.
        const raw = opt.resolve(theme || {});
        const hex = raw ? flattenOver(raw, (theme && theme.lightBg) || '#FFFFFF') : raw;
        return (
          <button
            key={opt.value}
            onClick={() => updateStyle(key, sel ? undefined : opt.value)}
            title={opt.label}
            aria-label={opt.label}
            style={{
              aspectRatio: '1', padding: 0, cursor: 'pointer',
              border: sel ? `2px solid ${accent}` : '1px solid rgba(255,255,255,0.15)',
              background: hex || 'transparent',
              backgroundImage: !hex
                ? 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.3) 40%, rgba(255,255,255,0.3) 60%, transparent 60%)'
                : undefined,
            }}
          />
        );
      })}
    </div>
  );

  return (
    <div>
      {supportsTextColor && (
        <>
          <FLabel>Text color</FLabel>
          {colorSwatchGrid(TEXT_COLOR_OPTIONS, style.textColor, 'textColor')}

          <FLabel>Background</FLabel>
          {colorSwatchGrid(BACKGROUND_OPTIONS, style.background, 'background')}
          {/* THE ESCAPE HATCH, alongside the swatches rather than instead of
              them: the swatches stay the fast path. Text color adapts to
              whatever is picked, so an arbitrary background still reads. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <input
              type="color"
              aria-label="Custom background color"
              value={/^#[0-9a-fA-F]{6}$/.test(style.background || '') ? style.background : ((theme && theme.lightBg) || '#FFFFFF')}
              onChange={e => updateStyle('background', e.target.value)}
              style={{ width: 34, height: 34, padding: 0, border: '1px solid rgba(255,255,255,0.15)', background: 'none', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
              {/^#[0-9a-fA-F]{6}$/.test(style.background || '')
                ? <>Custom <code>{style.background}</code></>
                : 'Or pick any color'}
            </span>
            {/^#[0-9a-fA-F]{6}$/.test(style.background || '') && (
              <button
                onClick={() => updateStyle('background', undefined)}
                style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >Clear</button>
            )}
          </div>
          {contrastWarning}
        </>
      )}

      {supportsSize && (
        <>
          <FLabel>Size</FLabel>
          {pillRow(SIZE_STEPS.map(s => ({ value: s, label: s })), style.size, 'size')}
        </>
      )}

      {supportsAlign && (
        <>
          <FLabel>Alignment</FLabel>
          {pillRow([
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' },
            ...(supportsJustify ? [{ value: 'justify', label: 'Justify' }] : []),
          ], style.align, 'align')}
        </>
      )}

      {supportsFontStyle && (
        <>
          {/* Beside Alignment, as the same kind of typographic choice. Nothing
              shows selected until the couple picks — the block's own default
              (italic) is not a stored override. */}
          <FLabel>Style</FLabel>
          {pillRow(FONT_STYLE_OPTIONS, style.fontStyle, 'fontStyle')}
        </>
      )}

      <FLabel>Spacing</FLabel>
      {pillRow(SPACING_OPTIONS, style.spacing, 'spacing')}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────
// MediaLibraryContext is provided by the parent (StudioWebsite.jsx), not
// here — it now also needs to wrap the on-canvas block editor
// (feat/component-library), which lives outside this panel, so ownership
// moved up to the one place both can share it.

export default function WBRightPanel({ details, theme, universeTheme, onChange, rightTab, onRightTabChange, selectedAsset, assetContent, onAssetChange, onClearAsset, selectedBlock, onUpdateSelectedBlockContent, onUpdateSelectedBlockStyle, onDeleteSelectedBlock, onClearSelectedBlock }) {
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
              <button onClick={onClearSelectedBlock} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4 }}><X size={16} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              <BlockFields block={selectedBlock} updateContent={onUpdateSelectedBlockContent} />
              {blockSupportsAnyStyle(selectedBlock.type) && (
                <>
                  <Divider />
                  <BlockStylePanel block={selectedBlock} theme={theme} universeTheme={universeTheme} updateStyle={onUpdateSelectedBlockStyle} />
                </>
              )}
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
              <button onClick={onClearAsset} aria-label="Back" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 2, display: 'flex', alignItems: 'center' }}><ChevronLeft size={16} /></button>
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
