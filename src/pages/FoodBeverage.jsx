import React, { useState, useEffect, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UtensilsCrossed, Wine, Loader2, Plus, X, Search, FileText, BookOpen, Check } from "lucide-react";
import PageConsiderations from '../components/shared/PageConsiderations';
import DetailsSection from "../components/event-details/DetailsSection";
import SectionInput from "../components/event-details/SectionInput";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';
import { base44 } from "@/api/base44Client";
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

export default function FoodBeveragePage() {
  const [data, setData] = useState({});
  const [menuItems, setMenuItems] = useState([]);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
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

      {/* Ava button */}
      <div style={{ padding: '16px 32px' }}>
        <AvaButton label="Ask Ava to plan your menu" onClick={() => setAvaOpen(true)} />
      </div>

      <div style={{ padding: '32px 32px 48px' }}>
        <Tabs defaultValue="details">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="details">Food & beverage details</TabsTrigger>
            <TabsTrigger value="considerations">Considerations</TabsTrigger>
          </TabsList>

          <TabsContent value="considerations" className="mt-8" style={{ maxWidth: 860 }}>
            <PageConsiderations pageKey="food" />
          </TabsContent>

          <TabsContent value="details" className="mt-6">
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 28 }}>
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
          </TabsContent>
        </Tabs>
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
