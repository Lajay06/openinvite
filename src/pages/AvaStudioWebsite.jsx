import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { MediaLibraryContext } from '@/components/website-builder/SectionEditorFields';
import MediaLibraryModal from '@/components/website-builder/MediaLibraryModal';
import toast from 'react-hot-toast';

const sans = "'Plus Jakarta Sans', sans-serif";

// ── Shared primitives ─────────────────────────────────────────
function Label({ children, mode }) {
  const dark = mode === 'dark';
  return <p style={{ fontSize: 11, fontWeight: 600, color: dark ? 'rgba(255,255,255,0.35)' : '#999', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 8px' }}>{children}</p>;
}

function AvaInput({ label, value, onChange, placeholder, rows, mode }) {
  const dark = mode === 'dark';
  const shared = { width: '100%', background: 'transparent', fontFamily: sans, fontSize: 15, color: dark ? '#FFF' : '#0A0A0A', outline: 'none', boxSizing: 'border-box' };
  return (
    <div style={{ marginBottom: 20 }}>
      {label && <Label mode={mode}>{label}</Label>}
      {rows ? (
        <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
          style={{ ...shared, border: 'none', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.15)' : '#DDDDDD'}`, padding: '8px 0', resize: 'vertical', lineHeight: 1.6 }}
          onFocus={e => e.target.style.borderBottomColor = '#E03553'}
          onBlur={e => e.target.style.borderBottomColor = dark ? 'rgba(255,255,255,0.15)' : '#DDDDDD'}
        />
      ) : (
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ ...shared, border: 'none', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.15)' : '#DDDDDD'}`, padding: '8px 0' }}
          onFocus={e => e.target.style.borderBottomColor = '#E03553'}
          onBlur={e => e.target.style.borderBottomColor = dark ? 'rgba(255,255,255,0.15)' : '#DDDDDD'}
        />
      )}
    </div>
  );
}

function AvaToggleRow({ label, value, onChange, mode }) {
  const dark = mode === 'dark';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#F5F5F5'}` }}>
      <span style={{ fontSize: 14, color: dark ? 'rgba(255,255,255,0.75)' : '#333' }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', background: value ? '#E03553' : dark ? 'rgba(255,255,255,0.15)' : '#DDD', position: 'relative', flexShrink: 0, transition: 'background 0.2s', padding: 0 }}>
        <div style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#fff', top: 3, left: value ? 21 : 3, transition: 'left 0.2s' }} />
      </button>
    </div>
  );
}

function AvaMediaPicker({ label, value, onChange, mode }) {
  const dark = mode === 'dark';
  const ctx = React.useContext(MediaLibraryContext);
  return (
    <div style={{ marginBottom: 20 }}>
      {label && <Label mode={mode}>{label}</Label>}
      {value ? (
        <div style={{ position: 'relative', borderRadius: 4, overflow: 'hidden', aspectRatio: '16/9' }}>
          <img src={value} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
          <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 6 }}>
            <button onClick={() => ctx?.open(onChange)} style={{ background: 'rgba(0,0,0,0.75)', color: '#FFF', border: 'none', padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600, fontFamily: sans }}>Change</button>
            <button onClick={() => onChange('')} style={{ background: 'rgba(200,0,0,0.8)', color: '#FFF', border: 'none', padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: sans }}>×</button>
          </div>
        </div>
      ) : (
        <div onClick={() => ctx?.open(onChange)} style={{ border: `2px dashed ${dark ? 'rgba(255,255,255,0.15)' : '#DDDDDD'}`, padding: '32px 16px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', borderRadius: 4 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#E03553'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.15)' : '#DDDDDD'; }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>🖼</div>
          <p style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,0.4)' : '#888', margin: 0 }}>Click to select a photo</p>
        </div>
      )}
    </div>
  );
}

function MasterRef({ label, value, mode }) {
  const dark = mode === 'dark';
  return (
    <div style={{ marginBottom: 16, padding: '12px 16px', background: dark ? 'rgba(255,255,255,0.04)' : '#F8F8F8', border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#EEEEEE'}` }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: dark ? 'rgba(255,255,255,0.3)' : '#999', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 14, color: value ? (dark ? '#FFFFFF' : '#0A0A0A') : (dark ? 'rgba(255,255,255,0.25)' : '#AAAAAA'), margin: 0 }}>{value || 'Not set in planner'}</p>
    </div>
  );
}

// ── STEP DEFINITIONS ──────────────────────────────────────────
const makeSteps = (data, update, mode) => [
  {
    avaPrompt: "Let's start with your hero — the first thing guests see.",
    avaHint: "Upload a beautiful photo of you two. This sets the entire mood of your website.",
    avaSuggestion: null,
    renderInput: () => <AvaMediaPicker label="COVER PHOTO" value={data.coverPhoto} onChange={v => update('coverPhoto', v)} mode={mode} />,
  },
  {
    avaPrompt: "What's your welcome message?",
    avaHint: "A short, warm message for your guests when they land on your site.",
    avaSuggestion: "We're so happy you're here. Can't wait to celebrate with you.",
    field: 'welcomeMessage',
    renderInput: () => (
      <div>
        <AvaInput label="WELCOME MESSAGE" value={data.welcomeMessage} onChange={v => update('welcomeMessage', v)} placeholder="Write a warm message to your guests..." rows={3} mode={mode} />
        <p style={{ fontSize: 12, color: mode === 'dark' ? 'rgba(255,255,255,0.3)' : '#AAA', marginTop: -8 }}>Keep it short and personal. 1-2 sentences is perfect.</p>
      </div>
    ),
  },
  {
    avaPrompt: "Tell us your love story.",
    avaHint: "How did you meet? What's a moment that defined your relationship? Write from the heart.",
    avaSuggestion: null, // AI generated
    field: 'coupleStory',
    aiGenerate: true,
    renderInput: () => <AvaInput label="YOUR STORY" value={data.coupleStory} onChange={v => update('coupleStory', v)} placeholder="We met on..." rows={6} mode={mode} />,
  },
  {
    avaPrompt: "Tell guests about your ceremony.",
    avaHint: "These details come from your planner. Confirm they're correct.",
    avaSuggestion: null,
    renderInput: () => (
      <div>
        <MasterRef label="CEREMONY VENUE" value={data?.mainCeremony?.venueName} mode={mode} />
        <MasterRef label="DATE & TIME" value={data?.weddingDate ? `${data.weddingDate}${data?.mainCeremony?.startTime ? ' · ' + data.mainCeremony.startTime : ''}` : null} mode={mode} />
        <MasterRef label="DRESS CODE" value={data?.mainCeremony?.dressCode} mode={mode} />
        <a href="/EventDetails" style={{ fontSize: 12, color: '#E03553', fontWeight: 600, textDecoration: 'none' }}>Edit in Planner →</a>
      </div>
    ),
  },
  {
    avaPrompt: "Now the reception details.",
    avaHint: "Where are you celebrating after the ceremony?",
    avaSuggestion: null,
    renderInput: () => (
      <div>
        <MasterRef label="RECEPTION VENUE" value={data?.reception?.venueName} mode={mode} />
        <MasterRef label="START TIME" value={data?.reception?.startTime} mode={mode} />
      </div>
    ),
  },
  {
    avaPrompt: "Set up your RSVP.",
    avaHint: "When do you need responses by? Enable the features that matter to you.",
    avaSuggestion: null,
    renderInput: () => {
      const rc = data.rsvpContent || {};
      const upd = (k, v) => update('rsvpContent', { ...rc, [k]: v });
      return (
        <div>
          <AvaInput label="RSVP DEADLINE" value={rc.rsvpDeadline} onChange={v => upd('rsvpDeadline', v)} placeholder="e.g. May 1, 2026" mode={mode} />
          <div style={{ marginTop: 8 }}>
            {[
              { key: 'enablePlusOnes', label: 'Enable plus ones' },
              { key: 'enableDietaryField', label: 'Enable dietary restrictions field' },
              { key: 'enableSongRequest', label: 'Enable song requests' },
              { key: 'enableMessage', label: 'Enable guest message' },
            ].map(opt => (
              <AvaToggleRow key={opt.key} label={opt.label} value={rc[opt.key] ?? true} onChange={v => upd(opt.key, v)} mode={mode} />
            ))}
          </div>
        </div>
      );
    },
  },
  {
    avaPrompt: "Help your guests get there.",
    avaHint: "Add travel notes, parking info, and recommended hotels.",
    avaSuggestion: "Add 2-3 nearby hotel options at different price points.",
    field: 'accommodationNotes',
    renderInput: () => <AvaInput label="TRAVEL & ACCOMMODATION NOTES" value={data.accommodationNotes} onChange={v => update('accommodationNotes', v)} placeholder="Parking is available at the venue. We recommend staying at..." rows={4} mode={mode} />,
  },
  {
    avaPrompt: "Share your registry.",
    avaHint: "Where have you registered? Add your links here.",
    avaSuggestion: "Your presence is the greatest gift we could ask for. However, if you'd like to give a gift, we've registered at a few places.",
    field: 'registryContent',
    renderInput: () => {
      const rc = data.registryContent || {};
      const upd = (k, v) => update('registryContent', { ...rc, [k]: v });
      const links = rc.registryLinks || [];
      return (
        <div>
          <AvaInput label="REGISTRY MESSAGE" value={rc.registryMessage} onChange={v => upd('registryMessage', v)} placeholder="Your presence is the greatest gift..." rows={2} mode={mode} />
          <Label mode={mode}>REGISTRY LINKS</Label>
          {links.map((link, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input value={link.label || ''} onChange={e => { const n = [...links]; n[i] = { ...link, label: e.target.value }; upd('registryLinks', n); }} placeholder="Store name"
                style={{ flex: 1, border: 'none', borderBottom: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.15)' : '#DDD'}`, background: 'transparent', color: mode === 'dark' ? '#FFF' : '#0A0A0A', padding: '6px 0', fontSize: 13, outline: 'none', fontFamily: sans }} />
              <input value={link.url || ''} onChange={e => { const n = [...links]; n[i] = { ...link, url: e.target.value }; upd('registryLinks', n); }} placeholder="https://..."
                style={{ flex: 2, border: 'none', borderBottom: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.15)' : '#DDD'}`, background: 'transparent', color: mode === 'dark' ? '#FFF' : '#0A0A0A', padding: '6px 0', fontSize: 13, outline: 'none', fontFamily: sans }} />
              <button onClick={() => upd('registryLinks', links.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#E03553', cursor: 'pointer', fontSize: 18, padding: 0 }}>×</button>
            </div>
          ))}
          <button onClick={() => upd('registryLinks', [...links, { label: '', url: '' }])} style={{ background: 'transparent', border: `1px dashed ${mode === 'dark' ? 'rgba(255,255,255,0.15)' : '#DDD'}`, color: mode === 'dark' ? 'rgba(255,255,255,0.4)' : '#888', padding: '8px 16px', fontSize: 12, cursor: 'pointer', fontFamily: sans, width: '100%', marginTop: 4 }}>
            + Add Registry
          </button>
        </div>
      );
    },
  },
  {
    avaPrompt: "Set up the music experience.",
    avaHint: "Add your Spotify playlist and let guests request songs.",
    avaSuggestion: "https://open.spotify.com/playlist/",
    field: 'musicContent',
    renderInput: () => {
      const mc = data.musicContent || {};
      const upd = (k, v) => update('musicContent', { ...mc, [k]: v });
      return (
        <div>
          <AvaInput label="SPOTIFY PLAYLIST URL" value={mc.spotifyPlaylistUrl} onChange={v => upd('spotifyPlaylistUrl', v)} placeholder="https://open.spotify.com/playlist/..." mode={mode} />
          <AvaToggleRow label="Enable guest song requests" value={mc.enableGuestRequests || false} onChange={v => upd('enableGuestRequests', v)} mode={mode} />
        </div>
      );
    },
  },
  {
    avaPrompt: "Add some frequently asked questions.",
    avaHint: "Save your guests from awkward moments by answering common questions upfront.",
    avaSuggestion: "What should I wear?::Check our dress code section above.\nIs there parking?::Yes, ample parking is available at the venue.\nCan I bring children?::We love your little ones, but this is an adults-only event.\nWhat time should I arrive?::Please aim to be seated 15 minutes before the ceremony begins.",
    field: 'qna',
    renderInput: () => {
      const items = data.qna || [];
      const upd = (newItems) => update('qna', newItems);
      return (
        <div>
          {items.map((item, i) => (
            <div key={i} style={{ border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#EEEEEE'}`, padding: 16, marginBottom: 10, position: 'relative' }}>
              <button onClick={() => upd(items.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', color: mode === 'dark' ? 'rgba(255,255,255,0.3)' : '#CCC', fontSize: 18, cursor: 'pointer' }}>×</button>
              <AvaInput label="QUESTION" value={item.question} onChange={v => { const n = [...items]; n[i] = { ...item, question: v }; upd(n); }} mode={mode} />
              <AvaInput label="ANSWER" value={item.answer} onChange={v => { const n = [...items]; n[i] = { ...item, answer: v }; upd(n); }} rows={2} mode={mode} />
            </div>
          ))}
          <button onClick={() => upd([...items, { question: '', answer: '' }])} style={{ background: 'transparent', border: `1px dashed ${mode === 'dark' ? 'rgba(255,255,255,0.15)' : '#DDD'}`, color: mode === 'dark' ? 'rgba(255,255,255,0.4)' : '#888', padding: '10px 16px', fontSize: 12, cursor: 'pointer', fontFamily: sans, width: '100%' }}>
            + Add FAQ
          </button>
        </div>
      );
    },
  },
];

export default function AvaStudioWebsite() {
  const navigate = useNavigate();
  const { step: stepParam } = useParams();
  const [stepIndex, setStepIndex] = useState(parseInt(stepParam || '0', 10));
  const [mode] = useState(() => localStorage.getItem('ava-studio-mode') || 'dark');
  const [details, setDetails] = useState(null);
  const [detailsId, setDetailsId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [avaLoading, setAvaLoading] = useState(false);
  const [avaUsed, setAvaUsed] = useState(false);
  const [animDir, setAnimDir] = useState('up');
  const [animKey, setAnimKey] = useState(0);
  const [complete, setComplete] = useState(false);
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaCallback, setMediaCallback] = useState(null);

  const dark = mode === 'dark';
  const bg = dark ? '#0A0A0A' : '#FFFFFF';
  const fg = dark ? '#FFFFFF' : '#0A0A0A';
  const sub = dark ? 'rgba(255,255,255,0.4)' : '#888';

  useEffect(() => {
    getMyWeddingDetails().then(details => {
      if (details) { setDetails(details); setDetailsId(details.id); }
      else setDetails({});
    });
    base44.entities.Photo.list('-created_date', 100).then(photos => {
      setMediaLibrary(photos.map(p => ({ id: p.id, url: p.url || p.photo_url || '', thumbnail: p.url || p.photo_url || '', type: 'photo', name: p.caption || 'Photo' })).filter(p => p.url));
    }).catch(() => {});
  }, []);

  const updateField = useCallback((field, value) => {
    setDetails(prev => ({ ...prev, [field]: value }));
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
    const steps = makeSteps(details || {}, updateField, mode);
    if (stepIndex >= steps.length - 1) {
      setComplete(true);
    } else {
      setAnimDir('up');
      setAnimKey(k => k + 1);
      setStepIndex(s => s + 1);
      setAvaUsed(false);
    }
  };

  const goPrev = async () => {
    if (stepIndex === 0) { navigate('/studio'); return; }
    setAnimDir('down');
    setAnimKey(k => k + 1);
    setStepIndex(s => s - 1);
    setAvaUsed(false);
  };

  const handleAva = async () => {
    const steps = makeSteps(details || {}, updateField, mode);
    const step = steps[stepIndex];
    if (!step) return;

    if (step.avaSuggestion && !step.aiGenerate) {
      // FAQ step — parse the pipe-delimited format
      if (step.field === 'qna') {
        const items = step.avaSuggestion.split('\n').map(line => {
          const [q, a] = line.split('::');
          return { question: q || '', answer: a || '' };
        });
        updateField('qna', items);
      } else if (step.field) {
        updateField(step.field, step.avaSuggestion);
      } else if (step.field === 'registryContent') {
        updateField('registryContent', { ...details?.registryContent, registryMessage: step.avaSuggestion });
      }
      toast.success("✦ Ava filled this in — edit it to make it yours.");
      setAvaUsed(true);
      return;
    }

    // AI story generation
    if (step.aiGenerate) {
      setAvaLoading(true);
      const coupleName = details?.coupleNames || `${details?.couple1Name || ''} & ${details?.couple2Name || ''}`;
      try {
        const story = await base44.integrations.Core.InvokeLLM({
          prompt: `Write a warm, personal 3-paragraph love story for a wedding website. Keep it genuine and heartfelt, not cheesy. Couple: ${coupleName}. Wedding date: ${details?.weddingDate || 'upcoming'}. Wedding style: ${JSON.stringify(details?.weddingStyle || [])}. Any notes: ${details?.coupleStory || 'none provided'}. Write in first person plural ("We..."). Keep each paragraph 2-3 sentences. End on the wedding. Output only the story text, no headings.`,
        });
        updateField('coupleStory', story);
        toast.success("✦ Ava wrote this for you — make it yours.");
        setAvaUsed(true);
      } catch {
        toast.error('Could not generate story. Please try again.');
      }
      setAvaLoading(false);
    }
  };

  const openMediaLibrary = (callback) => { setMediaCallback(() => callback); setMediaModalOpen(true); };

  if (!details) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <div style={{ width: 24, height: 24, border: `2px solid ${dark ? 'rgba(255,255,255,0.1)' : '#EEE'}`, borderTopColor: '#E03553', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const steps = makeSteps(details, updateField, mode);
  const step = steps[stepIndex];
  const total = steps.length;
  const coupleName = details?.coupleNames || `${details?.couple1Name || 'You'} & ${details?.couple2Name || 'Your Partner'}`;

  if (complete) {
    return (
      <div style={{ minHeight: '100vh', background: bg, fontFamily: sans, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '0 40px' }}>
          <div style={{ fontSize: 72, marginBottom: 24 }}>🎉</div>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 700, color: fg, margin: '0 0 16px' }}>Your website is ready!</h2>
          <p style={{ fontSize: 16, color: sub, margin: '0 0 40px' }}>{coupleName} · openinvite.com.au/w/{details?.slug || 'your-wedding'}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/studio/share')} style={{ padding: '14px 32px', background: 'linear-gradient(135deg, #E03553, #803D81)', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: sans }}>
              Share with Guests →
            </button>
            <button onClick={() => navigate('/studio/ava/assets')} style={{ padding: '14px 32px', border: `1px solid ${fg}`, background: 'transparent', color: fg, fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: sans }}>
              Create Assets →
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
          <div style={{ height: '100%', background: 'linear-gradient(90deg, #E03553, #803D81)', width: `${((stepIndex + 1) / total) * 100}%`, transition: 'width 0.5s ease' }} />
        </div>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', flexShrink: 0 }}>
          <button onClick={goPrev} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: sub, fontFamily: sans }}>
            {stepIndex === 0 ? '← Studio' : '← Previous'}
          </button>
          <span style={{ fontSize: 12, color: sub }}>{stepIndex + 1} of {total}</span>
          <button onClick={async () => { await save(); navigate('/studio/ava'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: sub, fontFamily: sans }}>
            {saving ? 'Saving…' : 'Save & Exit'}
          </button>
        </div>

        {/* Step content */}
        <div key={animKey} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 40px 60px', animation: `slideIn${animDir === 'up' ? 'Up' : 'Down'} 0.35s cubic-bezier(0.16,1,0.3,1)` }}>
          <div style={{ width: '100%', maxWidth: 640 }}>

            {/* Ava prompt */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 40 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #E03553, #803D81)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>✦</div>
              <div>
                <p style={{ fontSize: 11, color: sub, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>Ava</p>
                <h2 style={{ fontSize: 'clamp(22px,3vw,34px)', fontWeight: 700, color: fg, lineHeight: 1.25, margin: '0 0 12px' }}>{step.avaPrompt}</h2>
                <p style={{ fontSize: 14, color: sub, lineHeight: 1.65, margin: 0 }}>{step.avaHint}</p>
              </div>
            </div>

            {/* Input area */}
            <div style={{ marginBottom: 28 }}>
              {step.renderInput()}
            </div>

            {/* Ava suggest button */}
            {(step.avaSuggestion !== undefined) && (
              <button onClick={handleAva} disabled={avaLoading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', border: `1px solid ${avaUsed ? '#22C55E' : 'rgba(224,53,83,0.3)'}`, borderRadius: 100, background: 'transparent', color: avaUsed ? '#22C55E' : '#E03553', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: sans, marginBottom: 24, transition: 'all 0.2s' }}>
                ✦ {avaLoading ? 'Ava is writing…' : avaUsed ? 'Ava filled this in ✓' : "Use Ava's suggestion"}
              </button>
            )}

            {/* Continue */}
            <button onClick={goNext} style={{ padding: '16px 0', background: 'linear-gradient(135deg, #E03553, #803D81)', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: sans, width: '100%', marginBottom: 12 }}>
              {stepIndex === total - 1 ? 'Complete Website →' : 'Continue →'}
            </button>

            <button onClick={goNext} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: sub, fontFamily: sans, display: 'block', margin: '0 auto' }}>
              Skip for now
            </button>
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