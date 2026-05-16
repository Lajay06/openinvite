import React, { useState, useEffect, useRef } from "react";
import { WeddingDetails } from "@/entities/WeddingDetails";
import { InvokeLLM } from "@/integrations/Core";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UtensilsCrossed, Wine, Lightbulb, Loader2, Plus, X, Search, FileText, BookOpen, Check } from "lucide-react";
import DetailsSection from "../components/event-details/DetailsSection";
import SectionInput from "../components/event-details/SectionInput";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
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
  "Suggest a 3-course wedding menu with dietary options",
  "What questions should I ask a caterer before booking?",
  "How do I calculate catering portions for a wedding?",
  "Give me ideas for signature cocktails at a wedding",
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
      const res = await InvokeLLM({ prompt: `Wedding food & beverage planning: ${question}` });
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
            <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Ask Ava — food & beverage</span>
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

export default function FoodBeveragePage() {
  const [data, setData] = useState({});
  const [menuItems, setMenuItems] = useState([]);
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
      setData(r.foodBeverage || {});
      setMenuItems(r.menuItems || []);
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
    const full = { ...latestRef.current, foodBeverage: next };
    latestRef.current = full;
    persist(full);
  };

  const addMenuItem = () => {
    const updated = [...menuItems, { name: '', description: '' }];
    setMenuItems(updated);
    const full = { ...latestRef.current, menuItems: updated };
    latestRef.current = full;
    persist(full);
  };

  const removeMenuItem = (i) => {
    const updated = menuItems.filter((_, idx) => idx !== i);
    setMenuItems(updated);
    const full = { ...latestRef.current, menuItems: updated };
    latestRef.current = full;
    persist(full);
  };

  const updateMenuItem = (i, field, val) => {
    const updated = menuItems.map((item, idx) => idx === i ? { ...item, [field]: val } : item);
    setMenuItems(updated);
    const full = { ...latestRef.current, menuItems: updated };
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
      <DashboardPageHeader title="Food & beverage" subtitle="Plan your wedding catering, menu, and bar" />

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
          {/* Catering */}
          <DetailsSection title="Catering" icon={UtensilsCrossed}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <GoogleField label="Caterer name" value={data.catererName} onChange={e => update({ catererName: e.target.value })} placeholder="e.g. Fine Foods Co." />
              <SectionInput label="Contact person" value={data.contactPerson} onChange={e => update({ contactPerson: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <SectionInput label="Phone" value={data.phone} onChange={e => update({ phone: e.target.value })} />
              <SectionInput label="Email" value={data.email} onChange={e => update({ email: e.target.value })} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Service style</label>
              <Select value={data.serviceStyle || ''} onValueChange={v => update({ serviceStyle: v })}>
                <SelectTrigger><SelectValue placeholder="Select style…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="plated">Plated</SelectItem>
                  <SelectItem value="buffet">Buffet</SelectItem>
                  <SelectItem value="cocktail">Cocktail</SelectItem>
                  <SelectItem value="stations">Food stations</SelectItem>
                  <SelectItem value="family_style">Family style</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SectionInput label="Dietary requirements overview" isTextarea value={data.dietaryRequirements} onChange={e => update({ dietaryRequirements: e.target.value })} placeholder="Overall dietary needs for guest list…" />
          </DetailsSection>

          {/* Menu */}
          <DetailsSection title="Menu" icon={BookOpen}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Menu items</label>
              {menuItems.map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 10, alignItems: 'flex-end' }}>
                  <input value={item.name || ''} onChange={e => updateMenuItem(i, 'name', e.target.value)} placeholder="Item name"
                    style={{ ...inputStyle }} />
                  <input value={item.description || ''} onChange={e => updateMenuItem(i, 'description', e.target.value)} placeholder="Description"
                    style={{ ...inputStyle }} />
                  <button onClick={() => removeMenuItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.3)', display: 'flex', padding: '0 0 7px' }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button onClick={addMenuItem}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#E03553', fontWeight: 700, background: 'none', border: '1px dashed rgba(224,53,83,0.4)', borderRadius: 999, padding: '7px 14px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", width: 'fit-content', marginTop: 4 }}>
                <Plus size={12} />Add menu item
              </button>
            </div>
            <SectionInput label="Wedding cake details" isTextarea value={data.weddingCakeDetails} onChange={e => update({ weddingCakeDetails: e.target.value })} placeholder="Flavour, design, tiers, baker…" />
          </DetailsSection>

          {/* Bar */}
          <DetailsSection title="Bar & drinks" icon={Wine}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Bar type</label>
              <Select value={data.barType || ''} onValueChange={v => update({ barType: v })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_bar">Full bar</SelectItem>
                  <SelectItem value="beer_wine">Beer & wine only</SelectItem>
                  <SelectItem value="dry">Dry (no alcohol)</SelectItem>
                  <SelectItem value="byo">BYO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SectionInput label="Signature cocktail" value={data.signatureCocktail} onChange={e => update({ signatureCocktail: e.target.value })} placeholder="Name and description of your signature drink" />
            <SectionInput label="Drinks & bar notes" isTextarea value={data.barNotes} onChange={e => update({ barNotes: e.target.value })} placeholder="Open bar hours, wine selection, champagne toast…" />
          </DetailsSection>

          {/* Notes */}
          <DetailsSection title="Notes" icon={FileText}>
            <SectionInput label="Additional catering notes" isTextarea value={data.additionalNotes} onChange={e => update({ additionalNotes: e.target.value })} placeholder="Anything else your caterer should know…" />
          </DetailsSection>
        </div>
      </div>

      {showAva && <AvaModal onClose={() => setShowAva(false)} />}
    </div>
  );
}
