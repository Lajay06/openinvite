import React, { useState, useEffect, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UtensilsCrossed, Wine, Loader2, Plus, X, FileText, BookOpen, Check } from "lucide-react";
import PageConsiderations from '../components/shared/PageConsiderations';
import DetailsSection from "../components/event-details/DetailsSection";
import SectionInput from "../components/event-details/SectionInput";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';
import { base44 } from "@/api/base44Client";
const WeddingDetails = base44.entities.WeddingDetails;

const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: PJS,
};

const inputStyle = {
  width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 14, color: '#0A0A0A',
  fontFamily: PJS, outline: 'none', padding: '6px 0',
  boxSizing: 'border-box',
};

const TABS = [
  { key: 'catering',       label: 'Catering' },
  { key: 'menu',           label: 'Menu' },
  { key: 'bar',            label: 'Bar & drinks' },
  { key: 'notes',          label: 'Notes' },
  { key: 'considerations', label: 'Considerations' },
];

export default function FoodBeveragePage() {
  const [data, setData] = useState({});
  const [menuItems, setMenuItems] = useState([]);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [activeTab, setActiveTab] = useState('catering');
  const [avaOpen, setAvaOpen] = useState(false);
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

      {/* Ava button + save indicator */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <AvaButton label="Ask Ava to plan your menu" onClick={() => setAvaOpen(true)} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: PJS, color: saveStatus === 'saved' ? '#6b7700' : 'rgba(10,10,10,0.35)', minWidth: 80 }}>
          {saveStatus === 'saving' && <><Loader2 size={12} className="animate-spin" />Saving…</>}
          {saveStatus === 'saved' && <><Check size={12} />Saved</>}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', padding: '0 32px' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding: '14px 0', marginRight: 32, fontSize: 13, fontWeight: 700, fontFamily: PJS, background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.key ? '#E03553' : '#444444',
              borderBottom: activeTab === tab.key ? '2px solid #E03553' : '2px solid transparent',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '32px 32px 48px' }}>

        {/* Catering tab */}
        {activeTab === 'catering' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <DetailsSection title="Catering" icon={UtensilsCrossed} defaultOpen>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <SectionInput label="Caterer name" value={data.catererName} onChange={e => update({ catererName: e.target.value })} placeholder="e.g. Fine Foods Co." />
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
          </div>
        )}

        {/* Menu tab */}
        {activeTab === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <DetailsSection title="Menu" icon={BookOpen} defaultOpen>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Menu items</label>
                {menuItems.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 10, alignItems: 'flex-end' }}>
                    <input value={item.name || ''} onChange={e => updateMenuItem(i, 'name', e.target.value)} placeholder="Item name" style={{ ...inputStyle }} />
                    <input value={item.description || ''} onChange={e => updateMenuItem(i, 'description', e.target.value)} placeholder="Description" style={{ ...inputStyle }} />
                    <button onClick={() => removeMenuItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.3)', display: 'flex', padding: '0 0 7px' }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button onClick={addMenuItem}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#E03553', fontWeight: 700, background: 'none', border: '1px dashed rgba(224,53,83,0.4)', borderRadius: 999, padding: '7px 14px', cursor: 'pointer', fontFamily: PJS, width: 'fit-content', marginTop: 4 }}>
                  <Plus size={12} />Add menu item
                </button>
              </div>
              <SectionInput label="Wedding cake details" isTextarea value={data.weddingCakeDetails} onChange={e => update({ weddingCakeDetails: e.target.value })} placeholder="Flavour, design, tiers, baker…" />
            </DetailsSection>
          </div>
        )}

        {/* Bar tab */}
        {activeTab === 'bar' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <DetailsSection title="Bar & drinks" icon={Wine} defaultOpen>
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
          </div>
        )}

        {/* Notes tab */}
        {activeTab === 'notes' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <DetailsSection title="Notes" icon={FileText} defaultOpen>
              <SectionInput label="Additional catering notes" isTextarea value={data.additionalNotes} onChange={e => update({ additionalNotes: e.target.value })} placeholder="Anything else your caterer should know…" />
            </DetailsSection>
          </div>
        )}

        {/* Considerations tab */}
        {activeTab === 'considerations' && (
          <PageConsiderations pageKey="food" />
        )}
      </div>

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Catering advisor"
        systemPrompt="You are Ava, a wedding catering advisor. Help plan menus, drinks and dietary requirements."
        quickActions={["Suggest a wedding menu", "How much food per person?", "Signature cocktail ideas", "Handle dietary restrictions"]}
      />
    </div>
  );
}
