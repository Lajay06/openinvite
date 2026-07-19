import React, { useState, useEffect, useRef } from "react";
import { InvokeLLM } from "@/integrations/Core";
import { Lightbulb, Loader2, X, FileText, Check, Plus, Phone, Users, Building2 } from "lucide-react";
import DetailsSection from "../components/event-details/DetailsSection";
import SectionInput from "../components/event-details/SectionInput";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { base44 } from "@/api/base44Client";
import { getMyWeddingDetails } from "@/lib/resolveMyWedding";
import { interactiveDivProps } from "@/lib/a11y";
import AvaButton from '@/components/shared/AvaButton';
const WeddingDetails = base44.entities.WeddingDetails;

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const inputStyle = {
  width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 14, color: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0',
  boxSizing: 'border-box',
};

const AVA_PROMPTS = [
  "What contacts should every wedding couple have on hand on the day?",
  "How do I brief my day-of coordinator?",
  "What should I include in an emergency kit for the wedding day?",
  "Who should be my primary point of contact on the wedding day?",
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
      const res = await InvokeLLM({ prompt: `Wedding day emergency planning: ${question}` });
      setResponse(typeof res === 'string' ? res : JSON.stringify(res));
    } catch { setResponse('Something went wrong. Please try again.'); }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
      {...interactiveDivProps(onClose, { label: 'Close' })}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#FFFFFF', width: '100%', maxWidth: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#0A1930', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lightbulb size={16} style={{ color: '#DDF762' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Ask Ava — emergency contacts</span>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', padding: 4 }}><X size={16} /></button>
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
  { key: 'contacts', label: 'Contacts' },
  { key: 'vendors',  label: 'Vendors' },
  { key: 'notes',    label: 'Notes' },
];

export default function EmergencyContactPage() {
  const [data, setData] = useState({});
  const [vendorContacts, setVendorContacts] = useState([]);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showAva, setShowAva] = useState(false);
  const [activeTab, setActiveTab] = useState('contacts');
  const autoSaveRef = useRef(null);
  const latestRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const r = (await getMyWeddingDetails()) || {};
      setData(r.emergencyContacts || {});
      setVendorContacts(r.dayVendorContacts || []);
      setRecordId(r.id || null);
      latestRef.current = r;
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const persist = (dataOverride, vendorsOverride) => {
    const full = { ...latestRef.current, emergencyContacts: dataOverride ?? data, dayVendorContacts: vendorsOverride ?? vendorContacts };
    latestRef.current = full;
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
    persist(next, null);
  };

  const updateNested = (key, patch) => {
    update({ [key]: { ...(data[key] || {}), ...patch } });
  };

  const addVendor = () => {
    const updated = [...vendorContacts, { name: '', phone: '', role: '' }];
    setVendorContacts(updated);
    persist(null, updated);
  };

  const removeVendor = (i) => {
    const updated = vendorContacts.filter((_, idx) => idx !== i);
    setVendorContacts(updated);
    persist(null, updated);
  };

  const updateVendor = (i, field, val) => {
    const updated = vendorContacts.map((v, idx) => idx === i ? { ...v, [field]: val } : v);
    setVendorContacts(updated);
    persist(null, updated);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} style={{ color: '#E03553' }} className="animate-spin" />
    </div>
  );

  const primary = data.primary || {};
  const backup = data.backup || {};
  const venue = data.venue || {};

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Emergency contacts" subtitle="Key contacts and vendor numbers for the wedding day" />

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
          {/* Contacts tab: primary + backup + venue */}
          {activeTab === 'contacts' && (
          <>
          <DetailsSection title="On-the-day contact" icon={Phone} defaultOpen>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SectionInput label="Name" value={primary.name} onChange={e => updateNested('primary', { name: e.target.value })} placeholder="Full name" />
              <SectionInput label="Phone" value={primary.phone} onChange={e => updateNested('primary', { phone: e.target.value })} placeholder="+1 555 000 0000" />
            </div>
            <SectionInput label="Role / relationship" value={primary.role} onChange={e => updateNested('primary', { role: e.target.value })} placeholder="e.g. Maid of honour, wedding planner" />
          </DetailsSection>

          <DetailsSection title="Backup contact" icon={Users} defaultOpen>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SectionInput label="Name" value={backup.name} onChange={e => updateNested('backup', { name: e.target.value })} placeholder="Full name" />
              <SectionInput label="Phone" value={backup.phone} onChange={e => updateNested('backup', { phone: e.target.value })} placeholder="+1 555 000 0000" />
            </div>
            <SectionInput label="Role / relationship" value={backup.role} onChange={e => updateNested('backup', { role: e.target.value })} placeholder="e.g. Best man, parent" />
          </DetailsSection>

          <DetailsSection title="Venue contact" icon={Building2} defaultOpen>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SectionInput label="Venue coordinator name" value={venue.name} onChange={e => updateNested('venue', { name: e.target.value })} />
              <SectionInput label="Phone" value={venue.phone} onChange={e => updateNested('venue', { phone: e.target.value })} placeholder="+1 555 000 0000" />
            </div>
          </DetailsSection>
          </>
          )}

          {/* Vendor contacts */}
          {activeTab === 'vendors' && (
          <DetailsSection title="Key vendors on the day" icon={Phone} defaultOpen>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {vendorContacts.map((v, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
                  <input value={v.name || ''} onChange={e => updateVendor(i, 'name', e.target.value)} placeholder="Vendor name"
                    style={inputStyle} />
                  <input value={v.phone || ''} onChange={e => updateVendor(i, 'phone', e.target.value)} placeholder="Phone"
                    style={inputStyle} />
                  <input value={v.role || ''} onChange={e => updateVendor(i, 'role', e.target.value)} placeholder="Role"
                    style={inputStyle} />
                  <button onClick={() => removeVendor(i)} aria-label="Remove vendor contact" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.45)', display: 'flex', padding: '0 0 7px' }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button onClick={addVendor}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#E03553', fontWeight: 700, background: 'none', border: '1px dashed rgba(224,53,83,0.4)', borderRadius: 999, padding: '7px 14px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", width: 'fit-content', marginTop: 4 }}>
                <Plus size={12} />Add vendor contact
              </button>
            </div>
          </DetailsSection>
          )}

          {/* Notes */}
          {activeTab === 'notes' && (
          <DetailsSection title="Notes" icon={FileText} defaultOpen>
            <SectionInput label="Other emergency notes" isTextarea value={data.otherNotes} onChange={e => update({ otherNotes: e.target.value })} placeholder="Medical contacts, allergy kit location, nearby hospital…" />
          </DetailsSection>
          )}
        </div>
      </div>

      {showAva && <AvaModal onClose={() => setShowAva(false)} />}
    </div>
  );
}
