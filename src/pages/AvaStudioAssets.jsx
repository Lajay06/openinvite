import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails, getMyRecords } from '@/lib/resolveMyWedding';
import { ASSET_PREVIEW_MAP } from '@/components/website-builder/AssetPreviews';
import { MediaLibraryContext } from '@/components/website-builder/SectionEditorFields';
import MediaLibraryModal from '@/components/website-builder/MediaLibraryModal';
import toast from 'react-hot-toast';
import { interactiveDivProps } from '@/lib/a11y';

const sans = "'Plus Jakarta Sans', sans-serif";

function AvaInput({ label, value, onChange, placeholder, rows, mode }) {
  const dark = mode === 'dark';
  const shared = { width: '100%', background: 'transparent', fontFamily: sans, fontSize: 15, color: dark ? '#FFF' : '#0A0A0A', outline: 'none', boxSizing: 'border-box', border: 'none', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.15)' : '#DDDDDD'}`, padding: '8px 0' };
  return (
    <div style={{ marginBottom: 18 }}>
      {label && <p style={{ fontSize: 11, fontWeight: 600, color: dark ? 'rgba(255,255,255,0.35)' : '#999', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 8px' }}>{label}</p>}
      {rows ? (
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
          style={{ ...shared, resize: 'vertical', lineHeight: 1.6 }}
          onFocus={e => e.target.style.borderBottomColor = '#E03553'}
          onBlur={e => e.target.style.borderBottomColor = dark ? 'rgba(255,255,255,0.15)' : '#DDDDDD'}
        />
      ) : (
        <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={shared}
          onFocus={e => e.target.style.borderBottomColor = '#E03553'}
          onBlur={e => e.target.style.borderBottomColor = dark ? 'rgba(255,255,255,0.15)' : '#DDDDDD'}
        />
      )}
    </div>
  );
}

function AvaMediaPicker({ label, value, onChange, mode }) {
  const dark = mode === 'dark';
  const ctx = React.useContext(MediaLibraryContext);
  return (
    <div style={{ marginBottom: 18 }}>
      {label && <p style={{ fontSize: 11, fontWeight: 600, color: dark ? 'rgba(255,255,255,0.35)' : '#999', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 8px' }}>{label}</p>}
      {value ? (
        <div style={{ position: 'relative', borderRadius: 4, overflow: 'hidden', aspectRatio: '16/9' }}>
          <img src={value} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
          <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 6 }}>
            <button onClick={() => ctx?.open(onChange)} style={{ background: 'rgba(0,0,0,0.75)', color: '#FFF', border: 'none', padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600, fontFamily: sans }}>Change</button>
            <button onClick={() => onChange('')} aria-label="Remove image" style={{ background: 'rgba(200,0,0,0.8)', color: '#FFF', border: 'none', padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: sans }}>×</button>
          </div>
        </div>
      ) : (
        <div onClick={() => ctx?.open(onChange)} {...interactiveDivProps(() => ctx?.open(onChange), { label: label || 'Select a photo' })} style={{ border: `2px dashed ${dark ? 'rgba(255,255,255,0.15)' : '#DDDDDD'}`, padding: '28px 16px', textAlign: 'center', cursor: 'pointer', borderRadius: 4 }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#E03553'}
          onMouseLeave={e => e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.15)' : '#DDDDDD'}
        >
          <div style={{ fontSize: 26, marginBottom: 8 }}>🖼</div>
          <p style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,0.35)' : '#888', margin: 0 }}>Click to select a photo</p>
        </div>
      )}
    </div>
  );
}

// ── ASSET STEP DEFINITIONS ────────────────────────────────────
const ASSET_STEPS = [
  { key: 'saveTheDate', emoji: '📅', title: 'Save the Date', avaPrompt: "Let's create your Save the Date.", avaHint: "This is the first thing guests will receive. Choose a photo that captures you both perfectly.", fields: ['photoUrl', 'mainText', 'subtitle', 'date'] },
  { key: 'weddingInvitation', emoji: '✉️', title: 'Wedding Invitation', avaPrompt: "Now let's craft your wedding invitation.", avaHint: "Your invitation sets the tone for your entire wedding. Keep it elegant and informative.", fields: ['photoUrl', 'headline', 'bodyText', 'dressCode'] },
  { key: 'rsvpCard', emoji: '📋', title: 'RSVP Card', avaPrompt: "Create your RSVP card.", avaHint: "Make it easy for guests to respond. Include a clear deadline.", fields: ['headline', 'deadline', 'mealOptions', 'replyAddress'] },
  { key: 'menuCard', emoji: '🍽️', title: 'Menu Card', avaPrompt: "Design your menu card.", avaHint: "Give your guests a preview of your delicious reception menu.", fields: ['starterItem', 'mainItem', 'dessertItem', 'drinkItem', 'footerNote'] },
  { key: 'placeCard', emoji: '🪑', title: 'Place Card', avaPrompt: "Set up your place card template.", avaHint: "These sit at each guest's seat. Keep it simple and elegant.", fields: ['style', 'backgroundUrl'] },
  { key: 'welcomeSignage', emoji: '🪧', title: 'Welcome Signage', avaPrompt: "Create your welcome sign.", avaHint: "Guests see this as they arrive — make it warm and welcoming.", fields: ['headline', 'subtext', 'backgroundUrl', 'layout'] },
  { key: 'programCard', emoji: '📜', title: 'Ceremony Program', avaPrompt: "Build your ceremony program.", avaHint: "Help guests follow along with the ceremony order and key moments.", fields: ['title', 'orderOfService', 'readingsText', 'closingNote'] },
  { key: 'thankYouCard', emoji: '💌', title: 'Thank You Card', avaPrompt: "Design your thank you card.", avaHint: "A beautiful way to express gratitude after your big day.", fields: ['headline', 'bodyText', 'photoUrl'] },
  { key: 'mealChoice', emoji: '🍷', title: 'Meal Choice Card', avaPrompt: "Set up your meal choice card.", avaHint: "Help your catering team by collecting meal preferences from guests.", fields: ['option1', 'option2', 'option3', 'note'] },
  { key: 'seatingChart', emoji: '🗺️', title: 'Seating Chart', avaPrompt: "Create your seating chart display.", avaHint: "Help guests find their seats quickly and elegantly.", fields: ['headline', 'backgroundUrl', 'note'] },
];

const FIELD_META = {
  photoUrl: { type: 'media', label: 'PHOTO' },
  backgroundUrl: { type: 'media', label: 'BACKGROUND IMAGE' },
  mainText: { label: 'MAIN TEXT', placeholder: 'Save the Date' },
  subtitle: { label: 'SUBTITLE', placeholder: 'Formal invitation to follow' },
  date: { label: 'DATE TEXT', placeholder: 'June 14, 2026' },
  headline: { label: 'HEADLINE', placeholder: 'Together with their families...' },
  bodyText: { label: 'BODY TEXT', placeholder: 'Write your message...', rows: 4 },
  dressCode: { label: 'DRESS CODE', placeholder: 'Black tie optional' },
  deadline: { label: 'RSVP DEADLINE', placeholder: 'Kindly respond by May 1, 2026' },
  mealOptions: { label: 'MEAL OPTIONS', placeholder: 'Beef · Chicken · Vegetarian', rows: 2 },
  replyAddress: { label: 'REPLY ADDRESS / EMAIL', placeholder: 'rsvp@yourwedding.com' },
  starterItem: { label: 'STARTER', placeholder: 'Roasted beetroot salad' },
  mainItem: { label: 'MAIN COURSE', placeholder: 'Herb-crusted lamb' },
  dessertItem: { label: 'DESSERT', placeholder: 'Lemon tart' },
  drinkItem: { label: 'DRINKS', placeholder: 'Wine pairing available' },
  footerNote: { label: 'FOOTER NOTE', placeholder: 'Please inform us of any dietary requirements' },
  style: { label: 'STYLE', placeholder: 'e.g. Minimal, Classic, Rustic' },
  layout: { label: 'LAYOUT', placeholder: 'e.g. Portrait, Landscape' },
  title: { label: 'TITLE', placeholder: 'Order of Service' },
  orderOfService: { label: 'ORDER OF SERVICE', placeholder: 'Processional · Opening Words · Exchange of Vows...', rows: 5 },
  readingsText: { label: 'READINGS', placeholder: 'Reading by...' },
  closingNote: { label: 'CLOSING NOTE', placeholder: 'Reception to follow at...' },
  option1: { label: 'OPTION 1', placeholder: 'Beef tenderloin' },
  option2: { label: 'OPTION 2', placeholder: 'Pan-seared salmon' },
  option3: { label: 'OPTION 3', placeholder: 'Mushroom risotto (V)' },
  note: { label: 'NOTE', placeholder: 'Please inform us of any dietary restrictions' },
  subtext: { label: 'SUBTEXT', placeholder: 'We\'re so glad you\'re here' },
};

export default function AvaStudioAssets() {
  const navigate = useNavigate();
  const { step: stepParam } = useParams();
  const [stepIndex, setStepIndex] = useState(parseInt(stepParam || '0', 10));
  const [mode] = useState(() => localStorage.getItem('ava-studio-mode') || 'dark');
  const [details, setDetails] = useState(null);
  const [detailsId, setDetailsId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [animDir, setAnimDir] = useState('up');
  const [complete, setComplete] = useState(false);
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaCallback, setMediaCallback] = useState(null);

  const dark = mode === 'dark';
  const bg = dark ? '#0A0A0A' : '#FFFFFF';
  const fg = dark ? '#FFFFFF' : '#0A0A0A';
  const sub = dark ? 'rgba(255,255,255,0.4)' : '#888';

  useEffect(() => {
    getMyWeddingDetails().then(r => {
      if (r) { setDetails(r); setDetailsId(r.id); }
      else setDetails({ assetContent: {} });
    });
    getMyRecords('Photo', '-created_date', 100).then(photos => {
      setMediaLibrary(photos.map(p => ({ id: p.id, url: p.url || p.photo_url || '', thumbnail: p.url || p.photo_url || '', type: 'photo', name: p.caption || 'Photo' })).filter(p => p.url));
    }).catch(() => {});
  }, []);

  const updateAsset = useCallback((assetKey, field, value) => {
    setDetails(prev => ({
      ...prev,
      assetContent: {
        ...(prev.assetContent || {}),
        [assetKey]: {
          ...(prev.assetContent?.[assetKey] || {}),
          [field]: value,
        }
      }
    }));
  }, []);

  const save = async () => {
    if (!details) return;
    setSaving(true);
    try {
      if (detailsId) await base44.entities.WeddingDetails.update(detailsId, details);
      else { const r = await base44.entities.WeddingDetails.create(details); setDetailsId(r.id); }
    } catch { toast.error('Save failed'); }
    setSaving(false);
  };

  const goNext = async () => {
    await save();
    if (stepIndex >= ASSET_STEPS.length - 1) {
      setComplete(true);
    } else {
      setAnimDir('up');
      setAnimKey(k => k + 1);
      setStepIndex(s => s + 1);
    }
  };

  const goPrev = async () => {
    if (stepIndex === 0) { navigate('/studio'); return; }
    setAnimDir('down');
    setAnimKey(k => k + 1);
    setStepIndex(s => s - 1);
  };

  const openMediaLibrary = (callback) => { setMediaCallback(() => callback); setMediaModalOpen(true); };

  if (!details) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <div style={{ width: 24, height: 24, border: `2px solid ${dark ? 'rgba(255,255,255,0.1)' : '#EEE'}`, borderTopColor: '#E03553', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const step = ASSET_STEPS[stepIndex];
  if (!step) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <div style={{ width: 24, height: 24, border: `2px solid ${dark ? 'rgba(255,255,255,0.1)' : '#EEE'}`, borderTopColor: '#E03553', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  const assetContent = details.assetContent?.[step.key] || {};
  const PreviewComp = ASSET_PREVIEW_MAP[step.key];
  const coupleName = details?.coupleNames || `${details?.couple1Name || 'You'} & ${details?.couple2Name || 'Your Partner'}`;

  if (complete) {
    return (
      <div style={{ minHeight: '100vh', background: bg, fontFamily: sans, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '0 40px' }}>
          <div style={{ fontSize: 72, marginBottom: 24 }}>✨</div>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 700, color: fg, margin: '0 0 16px' }}>Your assets are ready!</h2>
          <p style={{ fontSize: 16, color: sub, margin: '0 0 40px' }}>All 10 assets created for {coupleName}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/studio/guest-suite/share')} style={{ padding: '14px 32px', background: 'linear-gradient(135deg, #E03553, #803D81)', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: sans }}>
              Share with Guests →
            </button>
            <button onClick={() => navigate('/studio/ava')} style={{ padding: '14px 32px', border: `1px solid ${fg}`, background: 'transparent', color: fg, fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: sans }}>
              Back to Ava's Studio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MediaLibraryContext.Provider value={{ open: openMediaLibrary }}>
      <div style={{ minHeight: '100vh', background: bg, fontFamily: sans, display: 'flex', flexDirection: 'column' }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: dark ? 'rgba(255,255,255,0.08)' : '#EEEEEE', flexShrink: 0 }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg, #803D81, #E03553)', width: `${((stepIndex + 1) / ASSET_STEPS.length) * 100}%`, transition: 'width 0.5s ease' }} />
        </div>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', flexShrink: 0 }}>
          <button onClick={goPrev} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: sub, fontFamily: sans }}>
            {stepIndex === 0 ? '← Studio' : '← Previous'}
          </button>
          <span style={{ fontSize: 12, color: sub }}>{step.emoji} {step.title} · {stepIndex + 1} of {ASSET_STEPS.length}</span>
          <button onClick={async () => { await save(); navigate('/studio/ava'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: sub, fontFamily: sans }}>
            {saving ? 'Saving…' : 'Save & Exit'}
          </button>
        </div>

        {/* Two-column layout */}
        <div key={animKey} style={{ flex: 1, display: 'flex', gap: 0, padding: '0 40px 60px', animation: `slideIn${animDir === 'up' ? 'Up' : 'Down'} 0.35s cubic-bezier(0.16,1,0.3,1)` }}>

          {/* LEFT — inputs */}
          <div style={{ flex: 1, maxWidth: 560, paddingRight: 40, paddingTop: 40 }}>
            {/* Ava prompt */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 36 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #E03553, #803D81)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>✦</div>
              <div>
                <p style={{ fontSize: 11, color: sub, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>Ava</p>
                <h2 style={{ fontSize: 'clamp(20px,2.5vw,30px)', fontWeight: 700, color: fg, lineHeight: 1.3, margin: '0 0 10px' }}>{step.avaPrompt}</h2>
                <p style={{ fontSize: 13, color: sub, lineHeight: 1.65, margin: 0 }}>{step.avaHint}</p>
              </div>
            </div>

            {/* Fields */}
            {step.fields.map(fieldKey => {
              const meta = FIELD_META[fieldKey] || { label: fieldKey.toUpperCase() };
              if (meta.type === 'media') {
                return <AvaMediaPicker key={fieldKey} label={meta.label} value={assetContent[fieldKey] || ''} onChange={v => updateAsset(step.key, fieldKey, v)} mode={mode} />;
              }
              return <AvaInput key={fieldKey} label={meta.label} value={assetContent[fieldKey] || ''} onChange={v => updateAsset(step.key, fieldKey, v)} placeholder={meta.placeholder} rows={meta.rows} mode={mode} />;
            })}

            {/* Buttons */}
            <button onClick={goNext} style={{ padding: '15px 0', background: 'linear-gradient(135deg, #E03553, #803D81)', color: '#FFF', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: sans, width: '100%', marginBottom: 12, marginTop: 8 }}>
              {stepIndex === ASSET_STEPS.length - 1 ? 'Complete Assets →' : 'Continue →'}
            </button>
            <button onClick={goNext} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: sub, fontFamily: sans, display: 'block', margin: '0 auto' }}>
              Skip for now
            </button>
          </div>

          {/* RIGHT — live mini preview */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 40 }}>
            {PreviewComp ? (
              <div style={{ transform: 'scale(0.55)', transformOrigin: 'top center' }}>
                <PreviewComp details={details} content={assetContent} />
              </div>
            ) : (
              <div style={{ width: 360, height: 260, border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#EEEEEE'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: sub, fontSize: 13 }}>
                Preview coming soon
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes slideInUp { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
          @keyframes slideInDown { from { opacity:0; transform:translateY(-32px); } to { opacity:1; transform:translateY(0); } }
        `}</style>
      </div>

      {mediaModalOpen && (
        <MediaLibraryModal
          library={mediaLibrary}
          onClose={() => setMediaModalOpen(false)}
          onSelect={(url) => { if (mediaCallback) mediaCallback(url); setMediaModalOpen(false); }}
          onUploaded={(item) => setMediaLibrary(prev => [{ id: Date.now() + '', ...item }, ...prev])}
        />
      )}
    </MediaLibraryContext.Provider>
  );
}