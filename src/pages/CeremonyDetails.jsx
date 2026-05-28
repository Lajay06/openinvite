import React, { useState, useEffect, useRef } from "react";
import { InvokeLLM } from "@/integrations/Core";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lightbulb, Loader2, X, Search, FileText, Check, UserCheck, Heart, Scale } from "lucide-react";
import DetailsSection from "../components/event-details/DetailsSection";
import SectionInput from "../components/event-details/SectionInput";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { base44 } from "@/api/base44Client";
import AvaButton from '@/components/shared/AvaButton';
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

const AVA_PROMPTS = [
  "What should I include in a wedding ceremony order of service?",
  "Suggest meaningful ceremony readings for a romantic wedding",
  "What questions should I ask a wedding celebrant?",
  "How do we write personal wedding vows?",
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
      const res = await InvokeLLM({ prompt: `Wedding ceremony planning: ${question}` });
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
            <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Ask Ava — ceremony</span>
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

export default function CeremonyDetailsPage() {
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
      setData({
        celebrant: r.celebrant || {},
        license: r.license || {},
        ceremonyType: r.ceremonyType || '',
        ceremonyMusic: r.ceremonyMusic || '',
        ceremonyReadings: r.ceremonyReadings || '',
        vowsNotes: r.vowsNotes || '',
        ringBearerDetails: r.ringBearerDetails || '',
        flowerGirlDetails: r.flowerGirlDetails || '',
        orderOfServiceNotes: r.orderOfServiceNotes || '',
      });
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
    const full = { ...latestRef.current, ...next };
    latestRef.current = full;
    persist(full);
  };

  const updateNested = (key, patch) => {
    update({ [key]: { ...(data[key] || {}), ...patch } });
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} style={{ color: '#E03553' }} className="animate-spin" />
    </div>
  );

  const cel = data.celebrant || {};
  const lic = data.license || {};

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Ceremony details" subtitle="Plan your celebrant, legal requirements, and ceremony order" />

      <div style={{ padding: '32px 32px 48px' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <AvaButton label="Ask Ava" onClick={() => setShowAva(true)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", color: saveStatus === 'saved' ? '#6b7700' : 'rgba(10,10,10,0.35)', minWidth: 80 }}>
            {saveStatus === 'saving' && <><Loader2 size={12} className="animate-spin" />Saving…</>}
            {saveStatus === 'saved' && <><Check size={12} />Saved</>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Celebrant */}
          <DetailsSection title="Celebrant" icon={UserCheck}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <GoogleField label="Celebrant name" value={cel.name} onChange={e => updateNested('celebrant', { name: e.target.value })} placeholder="e.g. Rev. Sarah Connelly" />
              <SectionInput label="Title" value={cel.title} onChange={e => updateNested('celebrant', { title: e.target.value })} placeholder="e.g. Rev., Dr., Mx." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SectionInput label="Phone" value={cel.phone} onChange={e => updateNested('celebrant', { phone: e.target.value })} />
              <SectionInput label="Email" value={cel.email} onChange={e => updateNested('celebrant', { email: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Celebrant type</label>
              <Select value={cel.type || ''} onValueChange={v => updateNested('celebrant', { type: v })}>
                <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="religious">Religious</SelectItem>
                  <SelectItem value="civil">Civil</SelectItem>
                  <SelectItem value="humanist">Humanist</SelectItem>
                  <SelectItem value="celebrant">Professional celebrant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SectionInput label="Celebrant notes" isTextarea value={cel.notes} onChange={e => updateNested('celebrant', { notes: e.target.value })} placeholder="Meeting notes, preferences, requirements…" />
          </DetailsSection>

          {/* Legal */}
          <DetailsSection title="Legal" icon={Scale}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SectionInput label="Marriage licence issuing office" value={lic.issuingOffice} onChange={e => updateNested('license', { issuingOffice: e.target.value })} placeholder="Registry office name" />
              <SectionInput label="Licence number" value={lic.licenseNumber} onChange={e => updateNested('license', { licenseNumber: e.target.value })} />
            </div>
            <SectionInput label="Witnesses required" value={lic.witnessesRequired} onChange={e => updateNested('license', { witnessesRequired: e.target.value })} placeholder="e.g. 2" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Application date</label>
                <input type="date" value={lic.applicationDate || ''} onChange={e => updateNested('license', { applicationDate: e.target.value })}
                  style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Issue date</label>
                <input type="date" value={lic.issueDate || ''} onChange={e => updateNested('license', { issueDate: e.target.value })}
                  style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Expiry date</label>
                <input type="date" value={lic.expiryDate || ''} onChange={e => updateNested('license', { expiryDate: e.target.value })}
                  style={inputStyle} />
              </div>
            </div>
            <SectionInput label="Legal notes" isTextarea value={lic.notes} onChange={e => updateNested('license', { notes: e.target.value })} placeholder="Anything else about licences, witnesses, legal requirements…" />
          </DetailsSection>

          {/* Ceremony */}
          <DetailsSection title="Ceremony" icon={Heart}>
            <SectionInput label="Ceremony type" value={data.ceremonyType} onChange={e => update({ ceremonyType: e.target.value })} placeholder="e.g. religious, civil, humanist, unity ceremony" />
            <SectionInput label="Ceremony music" isTextarea value={data.ceremonyMusic} onChange={e => update({ ceremonyMusic: e.target.value })} placeholder="Processional, recessional, interlude songs, live band or DJ…" />
            <SectionInput label="Ceremony readings" isTextarea value={data.ceremonyReadings} onChange={e => update({ ceremonyReadings: e.target.value })} placeholder="Readers, passages, poems, scripture…" />
            <SectionInput label="Vows notes" isTextarea value={data.vowsNotes} onChange={e => update({ vowsNotes: e.target.value })} placeholder="Writing your own? Exchanging traditional vows? Notes here…" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SectionInput label="Ring bearer details" value={data.ringBearerDetails} onChange={e => update({ ringBearerDetails: e.target.value })} placeholder="Name, age, role…" />
              <SectionInput label="Flower girl details" value={data.flowerGirlDetails} onChange={e => update({ flowerGirlDetails: e.target.value })} placeholder="Name, age, role…" />
            </div>
            <SectionInput label="Order of service notes" isTextarea value={data.orderOfServiceNotes} onChange={e => update({ orderOfServiceNotes: e.target.value })} placeholder="Full order of ceremony events from start to finish…" />
          </DetailsSection>

          {/* Notes */}
          <DetailsSection title="Notes" icon={FileText}>
            <SectionInput label="Additional ceremony notes" isTextarea value={data.additionalNotes} onChange={e => update({ additionalNotes: e.target.value })} placeholder="Anything else about the ceremony…" />
          </DetailsSection>
        </div>
      </div>

      {showAva && <AvaModal onClose={() => setShowAva(false)} />}
    </div>
  );
}
