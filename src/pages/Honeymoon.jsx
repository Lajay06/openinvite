import React, { useState, useEffect, useRef, useMemo } from "react";
import { InvokeLLM } from "@/integrations/Core";
import { differenceInDays, parseISO } from "date-fns";
import { Lightbulb, Loader2, X, Search, FileText, Check, Plane, Hotel, Map } from "lucide-react";
import DetailsSection from "../components/event-details/DetailsSection";
import SectionInput from "../components/event-details/SectionInput";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { base44 } from "@/api/base44Client";
import AvaButton from '@/components/shared/AvaButton';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
const WeddingDetails = base44.entities.WeddingDetails;

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
  "Suggest romantic honeymoon destinations for a beach lover",
  "What should I pack for a tropical honeymoon?",
  "How far in advance should I book honeymoon travel?",
  "What travel insurance do I need for a honeymoon abroad?",
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
      const res = await InvokeLLM({ prompt: `Honeymoon planning: ${question}` });
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
            <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Ask Ava — honeymoon</span>
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

const TABS = [
  { key: 'travel',       label: 'Travel' },
  { key: 'accommodation',label: 'Accommodation' },
  { key: 'planning',     label: 'Planning' },
  { key: 'notes',        label: 'Notes' },
];

export default function HoneymoonPage() {
  const [data, setData] = useState({});
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showAva, setShowAva] = useState(false);
  const [activeTab, setActiveTab] = useState('travel');
  const autoSaveRef = useRef(null);
  const latestRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const r = (await getMyWeddingDetails()) || {};
      setData(r.honeymoonDetails || {});
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
    const full = { ...latestRef.current, honeymoonDetails: next };
    latestRef.current = full;
    persist(full);
  };

  const duration = useMemo(() => {
    if (!data.departureDate || !data.returnDate) return null;
    try { return differenceInDays(parseISO(data.returnDate), parseISO(data.departureDate)); } catch { return null; }
  }, [data.departureDate, data.returnDate]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} style={{ color: '#E03553' }} className="animate-spin" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Honeymoon" subtitle="Plan your post-wedding trip, accommodation, and activities" />

      {/* Ava button + save indicator */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <AvaButton label="Ask Ava" onClick={() => setShowAva(true)} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", color: saveStatus === 'saved' ? '#6b7700' : 'rgba(10,10,10,0.35)', minWidth: 80 }}>
          {saveStatus === 'saving' && <><Loader2 size={12} className="animate-spin" />Saving…</>}
          {saveStatus === 'saved' && <><Check size={12} />Saved</>}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', padding: '0 32px' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding: '14px 0', marginRight: 32, fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.key ? '#E03553' : '#444444',
              borderBottom: activeTab === tab.key ? '2px solid #E03553' : '2px solid transparent',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '32px 32px 48px', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Travel */}
          {activeTab === 'travel' && (
          <DetailsSection title="Travel" icon={Plane} defaultOpen>
            <GoogleField label="Destination" value={data.destination} onChange={e => update({ destination: e.target.value })} placeholder="e.g. Bali, Maldives, Tuscany" />
            <SectionInput label="Departure airport" value={data.departureAirport} onChange={e => update({ departureAirport: e.target.value })} placeholder="e.g. LHR, JFK, SYD" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Departure date</label>
                <input type="date" value={data.departureDate || ''} onChange={e => update({ departureDate: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Return date</label>
                <input type="date" value={data.returnDate || ''} onChange={e => update({ returnDate: e.target.value })} style={inputStyle} />
              </div>
            </div>
            {duration !== null && (
              <div style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Duration: <span style={{ fontWeight: 700, color: '#0A0A0A' }}>{duration} nights</span>
              </div>
            )}
            <SectionInput label="Flight / booking reference" value={data.flightReference} onChange={e => update({ flightReference: e.target.value })} placeholder="e.g. ABC123" />
          </DetailsSection>
          )}

          {/* Accommodation */}
          {activeTab === 'accommodation' && (
          <DetailsSection title="Accommodation" icon={Hotel} defaultOpen>
            <GoogleField label="Hotel / resort name" value={data.hotelName} onChange={e => update({ hotelName: e.target.value })} placeholder="e.g. Four Seasons Bali" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SectionInput label="Booking reference" value={data.bookingReference} onChange={e => update({ bookingReference: e.target.value })} />
              <SectionInput label="Confirmation number" value={data.confirmationNumber} onChange={e => update({ confirmationNumber: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Check-in date</label>
                <input type="date" value={data.checkInDate || ''} onChange={e => update({ checkInDate: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Check-out date</label>
                <input type="date" value={data.checkOutDate || ''} onChange={e => update({ checkOutDate: e.target.value })} style={inputStyle} />
              </div>
            </div>
          </DetailsSection>
          )}

          {/* Planning */}
          {activeTab === 'planning' && (
          <DetailsSection title="Planning" icon={Map} defaultOpen>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Budget</label>
              <input type="number" value={data.budget || ''} onChange={e => update({ budget: e.target.value })}
                placeholder="e.g. 5000" style={inputStyle} />
            </div>
            <SectionInput label="Activities planned" isTextarea value={data.activitiesPlanned} onChange={e => update({ activitiesPlanned: e.target.value })} placeholder="Excursions, experiences, restaurants, spa…" />
            <SectionInput label="Packing notes" isTextarea value={data.packingNotes} onChange={e => update({ packingNotes: e.target.value })} placeholder="What to bring, climate, dress code…" />
            <PillToggle label="Travel insurance" value={data.travelInsurance || false} onChange={v => update({ travelInsurance: v })} />
            {data.travelInsurance && (
              <SectionInput label="Insurance details" isTextarea value={data.travelInsuranceDetails} onChange={e => update({ travelInsuranceDetails: e.target.value })} placeholder="Provider, policy number, coverage, emergency number…" />
            )}
          </DetailsSection>
          )}

          {/* Notes */}
          {activeTab === 'notes' && (
          <DetailsSection title="Notes" icon={FileText} defaultOpen>
            <SectionInput label="Additional notes" isTextarea value={data.notes} onChange={e => update({ notes: e.target.value })} placeholder="Anything else about the honeymoon…" />
          </DetailsSection>
          )}
        </div>
      </div>

      {showAva && <AvaModal onClose={() => setShowAva(false)} />}
    </div>
  );
}
