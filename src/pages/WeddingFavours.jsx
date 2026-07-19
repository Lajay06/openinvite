import React, { useState, useEffect, useRef } from "react";
import { InvokeLLM } from "@/integrations/Core";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, X, Search, FileText, Check, Plus, Gift, Package, Trash2, Lightbulb } from "lucide-react";
import DetailsSection from "../components/event-details/DetailsSection";
import SectionInput from "../components/event-details/SectionInput";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import { base44 } from "@/api/base44Client";
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { interactiveDivProps } from '@/lib/a11y';
const WeddingDetails = base44.entities.WeddingDetails;

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)',
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
  "Suggest unique wedding favour ideas for a garden wedding",
  "What are budget-friendly wedding favour options?",
  "How many wedding favours do I need to order?",
  "What should I write on wedding favour tags?",
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
      const res = await InvokeLLM({ prompt: `Wedding favours planning: ${question}` });
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
            <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Ask Ava — wedding favours</span>
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
  { key: 'overview',  label: 'Overview' },
  { key: 'items',     label: 'Favour items' },
  { key: 'packaging', label: 'Packaging & display' },
  { key: 'notes',     label: 'Notes' },
];

export default function WeddingFavoursPage() {
  const [data, setData] = useState({});
  const [favourItems, setFavourItems] = useState([]);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showAva, setShowAva] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const autoSaveRef = useRef(null);
  const latestRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const r = (await getMyWeddingDetails()) || {};
      setData(r.weddingFavours || {});
      setFavourItems(r.favourItems || []);
      setRecordId(r.id || null);
      latestRef.current = r;
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const persist = (dataOverride, itemsOverride) => {
    const full = { ...latestRef.current, weddingFavours: dataOverride ?? data, favourItems: itemsOverride ?? favourItems };
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

  const addItem = () => {
    const updated = [...favourItems, { name: '', quantity: '', costPerUnit: '', notes: '' }];
    setFavourItems(updated);
    persist(null, updated);
  };

  const removeItem = (i) => {
    const updated = favourItems.filter((_, idx) => idx !== i);
    setFavourItems(updated);
    persist(null, updated);
  };

  const updateItem = (i, field, val) => {
    const updated = favourItems.map((item, idx) => idx === i ? { ...item, [field]: val } : item);
    setFavourItems(updated);
    persist(null, updated);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} style={{ color: '#E03553' }} className="animate-spin" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Wedding favours" subtitle="Plan your wedding favours and gifts for guests" />

      {/* Ava + actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 md:px-8 py-4" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <button onClick={() => setShowAva(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 999, background: 'linear-gradient(135deg, #ec4899, #9333ea)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <Sparkles size={13} />Ask Ava
        </button>
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
          {/* Overview */}
          {activeTab === 'overview' && (
          <DetailsSection title="Overview" icon={Gift} defaultOpen>
            <GoogleField label="Supplier / maker name" value={data.supplierName} onChange={e => update({ supplierName: e.target.value })} placeholder="e.g. Etsy shop, local maker, craft store" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SectionInput label="Total budget" value={data.totalBudget} onChange={e => update({ totalBudget: e.target.value })} placeholder="e.g. £500" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Ordered</label>
                <Select value={data.orderedStatus || ''} onValueChange={v => update({ orderedStatus: v })}>
                  <SelectTrigger><SelectValue placeholder="Status…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not started</SelectItem>
                    <SelectItem value="researching">Researching</SelectItem>
                    <SelectItem value="ordered">Ordered</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="assembled">Assembled &amp; ready</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SectionInput label="Favour concept / description" isTextarea value={data.concept} onChange={e => update({ concept: e.target.value })} placeholder="What you're giving guests, the theme, any personalisation…" />
            <PillToggle label="Personalised / custom" value={data.personalised || false} onChange={v => update({ personalised: v })} />
            {data.personalised && (
              <SectionInput label="Personalisation details" isTextarea value={data.personalisationDetails} onChange={e => update({ personalisationDetails: e.target.value })} placeholder="Names, monograms, custom message, packaging…" />
            )}
          </DetailsSection>
          )}

          {/* Favour items */}
          {activeTab === 'items' && (
          <DetailsSection title="Favour items" icon={Package} defaultOpen>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {favourItems.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', gap: 12, marginBottom: 4 }}>
                  {['Item', 'Quantity', 'Cost each', 'Notes', ''].map(h => (
                    <span key={h} style={labelStyle}>{h}</span>
                  ))}
                </div>
              )}
              {favourItems.map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', gap: 12, alignItems: 'flex-end', borderBottom: '1px solid rgba(10,10,10,0.06)', paddingBottom: 10 }}>
                  <input value={item.name || ''} onChange={e => updateItem(i, 'name', e.target.value)} placeholder="e.g. Candle" style={inputStyle} />
                  <input value={item.quantity || ''} onChange={e => updateItem(i, 'quantity', e.target.value)} placeholder="100" style={inputStyle} />
                  <input value={item.costPerUnit || ''} onChange={e => updateItem(i, 'costPerUnit', e.target.value)} placeholder="£3.50" style={inputStyle} />
                  <input value={item.notes || ''} onChange={e => updateItem(i, 'notes', e.target.value)} placeholder="Packaging, colour…" style={inputStyle} />
                  <button onClick={() => removeItem(i)} aria-label="Remove favour item" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.45)', display: 'flex', padding: '0 0 7px' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button onClick={addItem}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#E03553', fontWeight: 700, background: 'none', border: '1px dashed rgba(224,53,83,0.4)', borderRadius: 999, padding: '7px 14px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", width: 'fit-content', marginTop: 4 }}>
                <Plus size={12} />Add favour item
              </button>
            </div>
          </DetailsSection>
          )}

          {/* Packaging & display */}
          {activeTab === 'packaging' && (
          <DetailsSection title="Packaging & display" icon={Package} defaultOpen>
            <SectionInput label="Packaging type" value={data.packagingType} onChange={e => update({ packagingType: e.target.value })} placeholder="e.g. kraft boxes, muslin bags, ribbon-tied" />
            <SectionInput label="Packaging supplier" value={data.packagingSupplier} onChange={e => update({ packagingSupplier: e.target.value })} placeholder="Where you're sourcing packaging" />
            <SectionInput label="Display / placement notes" isTextarea value={data.displayNotes} onChange={e => update({ displayNotes: e.target.value })} placeholder="Where favours will be placed, how they'll be arranged…" />
            <SectionInput label="Tags / labels" isTextarea value={data.tagsNotes} onChange={e => update({ tagsNotes: e.target.value })} placeholder="Tag text, font, design, who's printing them…" />
          </DetailsSection>
          )}

          {/* Notes */}
          {activeTab === 'notes' && (
          <DetailsSection title="Notes" icon={FileText} defaultOpen>
            <SectionInput label="Additional notes" isTextarea value={data.additionalNotes} onChange={e => update({ additionalNotes: e.target.value })} placeholder="Anything else about wedding favours…" />
          </DetailsSection>
          )}
        </div>
      </div>

      {showAva && <AvaModal onClose={() => setShowAva(false)} />}
    </div>
  );
}