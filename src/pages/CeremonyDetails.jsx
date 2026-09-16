import React, { useState, useEffect, useRef } from "react";
import AvaModal from '@/components/layout/AvaModal';
import toast from 'react-hot-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, FileText, Check, UserCheck, Heart, Scale } from "lucide-react";
import DetailsSection from "../components/event-details/DetailsSection";
import SectionInput from "../components/event-details/SectionInput";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { base44 } from "@/api/base44Client";
import AvaButton from '@/components/shared/AvaButton';
import { getMyWeddingDetails, putMyWeddingDetails } from '@/lib/resolveMyWedding';
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

const AVA_PROMPTS = [
  "What should I include in a wedding ceremony order of service?",
  "Suggest meaningful ceremony readings for a romantic wedding",
  "What questions should I ask a wedding celebrant?",
  "How do we write personal wedding vows?",
];


const TABS = [
  { key: 'celebrant', label: 'Celebrant' },
  { key: 'legal',     label: 'Legal' },
  { key: 'ceremony',  label: 'Ceremony' },
  { key: 'notes',     label: 'Notes' },
];

// persist() writes only these fields — this page's declared edit surface,
// mirroring loadData()'s own destructuring below — instead of the whole
// loaded WeddingDetails record. Anything not listed here (budget,
// contactPerson, ...) is owned by another page; a full-object write would
// silently clobber whatever that page currently holds in local state.
//
// Split into two lists because they take two different write paths (Step
// 2b). ENCRYPTED_WRITABLE_FIELDS are AES-256-GCM ciphertext at rest and can
// only be written server-side via /api/my-wedding-details; the rest are
// plaintext and still go direct. Both halves together are this page's edit
// surface — keep them in sync with loadData().
const ENCRYPTED_WRITABLE_FIELDS = ['celebrant', 'license'];
const PLAINTEXT_WRITABLE_FIELDS = [
  'ceremonyType', 'ceremonyMusic', 'ceremonyReadings',
  'vowsNotes', 'ringBearerDetails', 'flowerGirlDetails', 'orderOfServiceNotes',
  'additionalNotes',
];
const WRITABLE_FIELDS = [...ENCRYPTED_WRITABLE_FIELDS, ...PLAINTEXT_WRITABLE_FIELDS];

export default function CeremonyDetailsPage() {
  const [data, setData] = useState({});
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showAva, setShowAva] = useState(false);
  const [activeTab, setActiveTab] = useState('celebrant');
  const autoSaveRef = useRef(null);
  const latestRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const r = (await getMyWeddingDetails()) || {};
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
        additionalNotes: r.additionalNotes || '',
      });
      setRecordId(r.id || null);
      latestRef.current = r;
    } catch (e) { console.error(e); toast.error('Failed to load — please refresh and try again.'); }
    setLoading(false);
  };

  // Two writes, deliberately ordered (Step 2b). The encrypted pair goes
  // first through /api/my-wedding-details, because that call is what creates
  // the WeddingDetails record when the couple has none yet — it returns the
  // id the plaintext write then needs. Doing it the other way round on a
  // first-ever save would create two records.
  const persist = (full) => {
    clearTimeout(autoSaveRef.current);
    setSaveStatus('saving');
    autoSaveRef.current = setTimeout(async () => {
      try {
        const encrypted = {};
        for (const field of ENCRYPTED_WRITABLE_FIELDS) {
          if (field in full) encrypted[field] = full[field];
        }
        const plaintext = {};
        for (const field of PLAINTEXT_WRITABLE_FIELDS) {
          if (field in full) plaintext[field] = full[field];
        }

        let id = recordId;
        if (Object.keys(encrypted).length > 0) {
          id = await putMyWeddingDetails(encrypted);
          if (!recordId) {
            setRecordId(id);
            latestRef.current = { ...latestRef.current, id };
          }
        }

        if (Object.keys(plaintext).length > 0) {
          if (id) {
            await WeddingDetails.update(id, plaintext);
          } else {
            const c = await createMyWeddingDetails(plaintext);
            setRecordId(c.id);
            latestRef.current = { ...latestRef.current, ...plaintext, id: c.id };
          }
        }

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (e) {
        console.error('[CeremonyDetails] save failed:', e.message);
        setSaveStatus('idle');
        toast.error('Save failed. Please try again.');
      }
    }, 1200);
  };

  const update = (patch) => {
    const next = { ...data, ...patch };
    setData(next);
    const merged = { ...latestRef.current, ...next };
    latestRef.current = merged;
    const full = {};
    for (const field of WRITABLE_FIELDS) {
      if (field in merged) full[field] = merged[field];
    }
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

      {/* Ava button + save indicator */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <AvaButton label="Ask Ava about your ceremony" onClick={() => setShowAva(true)} />
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
          {/* Celebrant */}
          {activeTab === 'celebrant' && (
          <DetailsSection title="Celebrant" icon={UserCheck} summary={[cel.name, cel.type]}>
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
          )}

          {/* Legal */}
          {activeTab === 'legal' && (
          <DetailsSection title="Legal" icon={Scale} summary={[lic.type, lic.number && `No. ${lic.number}`]}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SectionInput label="Marriage license issuing office" value={lic.issuingOffice} onChange={e => updateNested('license', { issuingOffice: e.target.value })} placeholder="Registry office name" />
              <SectionInput label="License number" value={lic.licenseNumber} onChange={e => updateNested('license', { licenseNumber: e.target.value })} />
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
            <SectionInput label="Legal notes" isTextarea value={lic.notes} onChange={e => updateNested('license', { notes: e.target.value })} placeholder="Anything else about licenses, witnesses, legal requirements…" />
          </DetailsSection>
          )}

          {/* Ceremony */}
          {activeTab === 'ceremony' && (
          <DetailsSection title="Ceremony" icon={Heart} summary={[data.vowsNotes && 'Vows noted', data.orderOfServiceNotes && 'Order of service noted']}>
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
          )}

          {/* Notes */}
          {activeTab === 'notes' && (
          <DetailsSection title="Notes" icon={FileText} summary={data.additionalNotes ? 'Notes added' : ''}>
            <SectionInput label="Additional ceremony notes" isTextarea value={data.additionalNotes} onChange={e => update({ additionalNotes: e.target.value })} placeholder="Anything else about the ceremony…" />
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
        pageTitle="Ceremony details"
        systemPrompt="You are Ava, helping a couple plan a wedding ceremony — the order of service, readings, celebrant and vows. Answer from what their record already says where it says anything, and keep it to what they can act on next."
        quickActions={AVA_PROMPTS}
      />
    </div>
  );
}
