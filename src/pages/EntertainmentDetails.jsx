import React, { useState, useEffect, useRef } from "react";
import { WeddingDetails } from "@/entities/WeddingDetails";
import { InvokeLLM } from "@/integrations/Core";
import { Lightbulb, Loader2, X, Search, FileText, Check, Music4, Mic2, Sparkles } from "lucide-react";
import DetailsSection from "../components/event-details/DetailsSection";
import SectionInput from "../components/event-details/SectionInput";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const inputStyle = {
  width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 14, color: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0',
  boxSizing: 'border-box',
};

function GoogleField({ label, value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <input style={{ ...inputStyle, flex: 1 }} value={value || ''} onChange={onChange} placeholder={placeholder} />
        {value && (
          <a href={`https://www.google.com/search?q=${encodeURIComponent(value)}`} target="_blank" rel="noopener noreferrer"
            title="Search on Google"
            style={{ color: 'rgba(10,10,10,0.3)', flexShrink: 0, display: 'flex', alignItems: 'center', paddingBottom: 7 }}
            onMouseEnter={e => e.currentTarget.style.color = '#E03553'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.3)'}>
            <Search size={13} />
          </a>
        )}
      </div>
    </div>
  );
}

function PillToggle({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      <button type="button" onClick={() => onChange(!value)}
        style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans', sans-serif", width: 'fit-content',
          background: value ? '#0A0A0A' : 'transparent',
          color: value ? '#FFFFFF' : '#0A0A0A',
          border: `1.5px solid ${value ? '#0A0A0A' : 'rgba(10,10,10,0.2)'}`,
        }}>
        {value ? 'Yes' : 'No'}
      </button>
    </div>
  );
}

const AVA_PROMPTS = [
  "What should I look for when hiring a wedding DJ?",
  "Suggest unique entertainment ideas beyond a DJ or band",
  "How do I build a do-not-play list for my wedding?",
  "What's the difference between a band and DJ for weddings?",
];

function AvaModal({ onClose }) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async (q) => {
    const question = (q || prompt).trim();
    if (!question) return;
    setLoading(true); setResponse('');
    try {
      const res = await InvokeLLM({ prompt: `Wedding entertainment planning: ${question}` });
      setResponse(typeof res === 'string' ? res : JSON.stringify(res));
    } catch { setResponse('Something went wrong. Please try again.'); }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#FFFFFF', width: '100%', maxWidth: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#0A1930', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lightbulb size={16} style={{ color: '#DDF762' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Ask Ava — entertainment</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', padding: 4 }}><X size={16} /></button>
        </div>
        <div style={{ padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {AVA_PROMPTS.map(p => (
              <button key={p} onClick={() => ask(p)} disabled={loading}
                style={{ textAlign: 'left', padding: '10px 14px', background: '#F5F5F5', border: 'none', borderLeft: '2px solid rgba(10,10,10,0.12)', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {p}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask()} disabled={loading}
              placeholder="Or ask your own question…" style={{ ...inputStyle, flex: 1 }} />
            <button onClick={() => ask()} disabled={loading || !prompt.trim()} className="btn-primary" style={{ fontSize: 12, flexShrink: 0 }}>Ask</button>
          </div>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={14} style={{ color: '#E03553' }} className="animate-spin" />
              <span style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Thinking…</span>
            </div>
          )}
          {response && (
            <div style={{ background: '#F5F5F5', padding: '14px 16px', fontSize: 13, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {response}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EntertainmentDetailsPage() {
  const [data, setData] = useState({});
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showAva, setShowAva] = useState(false);
  const autoSaveRef = useRef(null);
  const latestRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const rows = await WeddingDetails.list();
      const r = rows[0] || {};
      setData(r.entertainmentDetails || {});
      setRecordId(r.id || null);
      latestRef.current = r;
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const persist = (full) => {
    clearTimeout(autoSaveRef.current);
    setSaveStatus('saving');
    autoSaveRef.current = setTimeout(async () => {
      try {
        if (recordId) {
          await WeddingDetails.update(recordId, full);
        } else {
          const c = await WeddingDetails.create(full);
          setRecordId(c.id);
          latestRef.current = { ...full, id: c.id };
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch { setSaveStatus('idle'); }
    }, 1200);
  };

  const update = (patch) => {
    const next = { ...data, ...patch };
    setData(next);
    const full = { ...latestRef.current, entertainmentDetails: next };
    latestRef.current = full;
    persist(full);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} style={{ color: '#E03553' }} className="animate-spin" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Entertainment" subtitle="Plan your music, performances, and wedding atmosphere" />

      <div style={{ padding: '32px 32px 48px' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <button onClick={() => setShowAva(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 999, background: '#0A1930', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <Lightbulb size={14} style={{ color: '#DDF762' }} />Ask Ava
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", color: saveStatus === 'saved' ? '#6b7700' : 'rgba(10,10,10,0.35)', minWidth: 80 }}>
            {saveStatus === 'saving' && <><Loader2 size={12} className="animate-spin" />Saving…</>}
            {saveStatus === 'saved' && <><Check size={12} />Saved</>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Music & DJ */}
          <DetailsSection title="Music & DJ" icon={Music4}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <GoogleField label="Band / DJ name" value={data.bandDjName} onChange={e => update({ bandDjName: e.target.value })} placeholder="e.g. The Groove Masters" />
              <SectionInput label="Contact / booking" value={data.bandDjContact} onChange={e => update({ bandDjContact: e.target.value })} />
            </div>
            <SectionInput label="Band / DJ preference notes" isTextarea value={data.bandDjNotes} onChange={e => update({ bandDjNotes: e.target.value })} placeholder="Live band, DJ, genre preferences, set length…" />
            <SectionInput label="First dance song" value={data.firstDanceSong} onChange={e => update({ firstDanceSong: e.target.value })} placeholder="Song title & artist" />
            <SectionInput label="Parent dances" isTextarea value={data.parentDances} onChange={e => update({ parentDances: e.target.value })} placeholder="Father-daughter, mother-son songs…" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SectionInput label="First song (reception open)" value={data.openingSong} onChange={e => update({ openingSong: e.target.value })} placeholder="Song title & artist" />
              <SectionInput label="Last song of the night" value={data.lastSong} onChange={e => update({ lastSong: e.target.value })} placeholder="Song title & artist" />
            </div>
            <SectionInput label="Songs to avoid / do-not-play list" isTextarea value={data.doNotPlayList} onChange={e => update({ doNotPlayList: e.target.value })} placeholder="Songs you absolutely do not want played…" />
          </DetailsSection>

          {/* MC & Host */}
          <DetailsSection title="MC & host" icon={Mic2}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SectionInput label="MC / host name" value={data.mcName} onChange={e => update({ mcName: e.target.value })} placeholder="Name of your MC or host" />
              <SectionInput label="MC contact" value={data.mcContact} onChange={e => update({ mcContact: e.target.value })} />
            </div>
            <SectionInput label="MC briefing notes" isTextarea value={data.mcNotes} onChange={e => update({ mcNotes: e.target.value })} placeholder="Announcements, tone, key moments to introduce…" />
          </DetailsSection>

          {/* Extra entertainment */}
          <DetailsSection title="Entertainment extras" icon={Sparkles}>
            <PillToggle label="Photo booth" value={data.photoBooth || false} onChange={v => update({ photoBooth: v })} />
            {data.photoBooth && (
              <SectionInput label="Photo booth details" isTextarea value={data.photoBoothDetails} onChange={e => update({ photoBoothDetails: e.target.value })} placeholder="Provider, props, backdrop, print style…" />
            )}
            <SectionInput label="Special performances" isTextarea value={data.specialPerformances} onChange={e => update({ specialPerformances: e.target.value })} placeholder="Live performers, surprise acts, fireworks…" />
            <SectionInput label="Other entertainment" isTextarea value={data.otherEntertainment} onChange={e => update({ otherEntertainment: e.target.value })} placeholder="Lawn games, casino tables, magician…" />
          </DetailsSection>

          {/* Notes */}
          <DetailsSection title="Notes" icon={FileText}>
            <SectionInput label="Additional notes" isTextarea value={data.additionalNotes} onChange={e => update({ additionalNotes: e.target.value })} placeholder="Anything else about entertainment…" />
          </DetailsSection>
        </div>
      </div>

      {showAva && <AvaModal onClose={() => setShowAva(false)} />}
    </div>
  );
}
