import React, { useState, useEffect, useRef, useMemo } from "react";
import AvaModal from '@/components/layout/AvaModal';
import toast from 'react-hot-toast';
import { differenceInDays, parseISO } from "date-fns";
import { Loader2, Search, FileText, Check, Plane, Hotel, Map } from "lucide-react";
import DetailsSection from "../components/event-details/DetailsSection";
import SectionInput from "../components/event-details/SectionInput";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { base44 } from "@/api/base44Client";
import AvaButton from '@/components/shared/AvaButton';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { createMyWeddingDetails } from '@/lib/createMyWeddingDetails';
const WeddingDetails = base44.entities.WeddingDetails;

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  color: 'rgba(10,10,10,0.6)',
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
            style={{ color: 'rgba(10,10,10,0.45)', flexShrink: 0, display: 'flex', alignItems: 'center', paddingBottom: 7 }}
            onMouseEnter={e => e.currentTarget.style.color = '#E03553'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.45)'}>
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


const TABS = [
  { key: 'travel',       label: 'Travel' },
  { key: 'accommodation',label: 'Stay' },
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
    } catch (e) { console.error(e); toast.error('Failed to load — please refresh and try again.'); }
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
          const c = await createMyWeddingDetails(full);
          setRecordId(c.id);
          latestRef.current = { ...full, id: c.id };
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch { setSaveStatus('idle'); toast.error('Save failed. Please try again.'); }
    }, 1200);
  };

  // persist() writes only this page's own field — a full-object write would
  // silently clobber whatever another page currently holds in local state
  // (e.g. an encrypted budget/contactPerson decrypted into that page's
  // memory).
  const update = (patch) => {
    const next = { ...data, ...patch };
    setData(next);
    latestRef.current = { ...latestRef.current, honeymoonDetails: next };
    persist({ honeymoonDetails: next });
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
      <DashboardPageHeader title="Honeymoon" subtitle="Plan your post-wedding trip, where you stay, and activities" />

      {/* Ava button + save indicator */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <AvaButton label="Ask Ava to plan your honeymoon" onClick={() => setShowAva(true)} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", color: saveStatus === 'saved' ? '#6b7700' : 'rgba(10,10,10,0.6)', minWidth: 80 }}>
          {saveStatus === 'saving' && <><Loader2 size={12} className="animate-spin" />Saving…</>}
          {saveStatus === 'saved' && <><Check size={12} />Saved</>}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid rgba(10,10,10,0.12)', display: 'flex', padding: '0 32px' }}>
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
          <DetailsSection title="Travel" icon={Plane}>
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

          {/* Stay */}
          {activeTab === 'accommodation' && (
          <DetailsSection title="Stay" icon={Hotel}>
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
          <DetailsSection title="Planning" icon={Map}>
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
          <DetailsSection title="Notes" icon={FileText}>
            <SectionInput label="Additional notes" isTextarea value={data.notes} onChange={e => update({ notes: e.target.value })} placeholder="Anything else about the honeymoon…" />
          </DetailsSection>
          )}
        </div>
      </div>

      {/* ONE SHELL (owner ruling, Run 5 T3). This page carried its own navy
          dialog — the fourth Ava — whose InvokeLLM call sent
          "<context>: <question>" and nothing else: no wedding, no history, no
          action mirror. So the window with the most confident branding knew
          the least about the couple. Its four prompts are not lost; they are
          the quick actions below, answered by the shell that reads the
          couple's actual record. */}
      <AvaModal
        isOpen={showAva}
        onClose={() => setShowAva(false)}
        pageTitle="Honeymoon"
        systemPrompt="You are Ava, helping a couple plan the honeymoon — where to go, when to book it, and what it takes to travel. Answer from what their record already says where it says anything, and keep it to what they can act on next."
        quickActions={AVA_PROMPTS}
      />
    </div>
  );
}
