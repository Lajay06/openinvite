import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UtensilsCrossed, Wine, Loader2, Plus, X, FileText, BookOpen, Check, Crown } from "lucide-react";
import PageConsiderations from '../components/shared/PageConsiderations';
import DetailsSection from "../components/event-details/DetailsSection";
import SectionInput from "../components/event-details/SectionInput";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';
import VendorContactSection from '../components/vendors/VendorContactSection';
import { base44 } from "@/api/base44Client";
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { useAuth } from '@/lib/AuthContext';
const WeddingDetails = base44.entities.WeddingDetails;

const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)',
  fontFamily: PJS,
};

const inputStyle = {
  width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 14, color: '#0A0A0A',
  fontFamily: PJS, outline: 'none', padding: '6px 0',
  boxSizing: 'border-box',
};

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

// Section-scoped Ultra paywall — src/components/shared/UltraGate.jsx is a
// full-page swap (blurred fake page chrome behind a centered upgrade card),
// built for gating an entire page (Design Studio, Guest Suite); dropping it
// into one section of an otherwise-accessible tab would render a fake page
// mockup inside a real one. Same "Ultra feature" look and upgrade action,
// sized for a section instead.
function MealOptionsUltraGate() {
  const navigate = useNavigate();
  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.1)', padding: '32px 28px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Crown size={20} color="#FFFFFF" strokeWidth={1.8} />
      </div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 800, color: '#F59E0B', letterSpacing: '0.06em', margin: '0 0 8px', fontFamily: PJS }}>Ultra feature</p>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: '0 0 6px', fontFamily: PJS }}>Guest meal options is an Ultra feature</p>
        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.55)', lineHeight: 1.6, margin: '0 auto', fontFamily: PJS, maxWidth: 380 }}>
          Define your own menu choices and guests pick from your list on the RSVP form, instead of a generic default.
        </p>
      </div>
      <button
        onClick={() => navigate('/account')}
        style={{ padding: '10px 22px', border: 'none', borderRadius: 999, background: 'linear-gradient(135deg, #FBBF24, #F59E0B)', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: PJS }}
      >
        Upgrade to Ultra
      </button>
    </div>
  );
}

const TABS = [
  { key: 'catering',       label: 'Catering' },
  { key: 'menu',           label: 'Menu' },
  { key: 'bar',            label: 'Bar & drinks' },
  { key: 'notes',          label: 'Notes' },
  { key: 'considerations', label: 'Considerations' },
];

export default function FoodBeveragePage() {
  const { user } = useAuth();
  // Menu Phase 1 — same Ultra-gate pattern as UniverseStudio.jsx/
  // StudioGuestSuite.jsx (#287): only 'pro' is excluded, 'free' (trial)
  // gets full access same as every other Ultra-gated feature.
  const plan = user?.plan || 'free';
  const canAccessUltra = plan === 'ultra' || plan === 'free';

  const [data, setData] = useState({});
  const [menuItems, setMenuItems] = useState([]);
  const [mealOptions, setMealOptions] = useState([]);
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
      const r = (await getMyWeddingDetails()) || {};
      setData(r.foodBeverage || {});
      setMenuItems(r.menuItems || []);
      setMealOptions(r.mealOptions || []);
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
          const c = await WeddingDetails.create(full);
          setRecordId(c.id);
          latestRef.current = { ...full, id: c.id };
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch { setSaveStatus('idle'); toast.error('Save failed. Please try again.'); }
    }, 1200);
  };

  // Every save below writes only this page's own fields (foodBeverage,
  // menuItems, mealOptions) — a full-object write would silently clobber
  // whatever another page currently holds in local state (e.g. an
  // encrypted budget/contactPerson decrypted into that page's memory).
  const update = (patch) => {
    const next = { ...data, ...patch };
    setData(next);
    latestRef.current = { ...latestRef.current, foodBeverage: next };
    persist({ foodBeverage: next });
  };

  const addMenuItem = () => {
    const updated = [...menuItems, { name: '', description: '' }];
    setMenuItems(updated);
    latestRef.current = { ...latestRef.current, menuItems: updated };
    persist({ menuItems: updated });
  };

  const removeMenuItem = (i) => {
    const updated = menuItems.filter((_, idx) => idx !== i);
    setMenuItems(updated);
    latestRef.current = { ...latestRef.current, menuItems: updated };
    persist({ menuItems: updated });
  };

  const updateMenuItem = (i, field, val) => {
    const updated = menuItems.map((item, idx) => idx === i ? { ...item, [field]: val } : item);
    setMenuItems(updated);
    latestRef.current = { ...latestRef.current, menuItems: updated };
    persist({ menuItems: updated });
  };

  // Menu Phase 1 (Ultra) — couple-defined guest meal options for the RSVP
  // form. id is generated once and never changes, distinct from label, so
  // renaming a label never orphans a stored RsvpResponse.meal_choice value.
  const addMealOption = () => {
    const updated = [...mealOptions, { id: uid(), label: '' }];
    setMealOptions(updated);
    latestRef.current = { ...latestRef.current, mealOptions: updated };
    persist({ mealOptions: updated });
  };

  const removeMealOption = (id) => {
    const updated = mealOptions.filter(o => o.id !== id);
    setMealOptions(updated);
    latestRef.current = { ...latestRef.current, mealOptions: updated };
    persist({ mealOptions: updated });
  };

  const updateMealOptionLabel = (id, label) => {
    const updated = mealOptions.map(o => o.id === id ? { ...o, label } : o);
    setMealOptions(updated);
    latestRef.current = { ...latestRef.current, mealOptions: updated };
    persist({ mealOptions: updated });
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
            <DetailsSection title="Catering" icon={UtensilsCrossed}>
              <VendorContactSection
                category="catering"
                vendorId={data.vendorId}
                onVendorIdChange={id => update({ vendorId: id })}
              />
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
            <DetailsSection title="Menu" icon={BookOpen}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={labelStyle}>Menu items</label>
                {menuItems.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 10, alignItems: 'flex-end' }}>
                    <input value={item.name || ''} onChange={e => updateMenuItem(i, 'name', e.target.value)} placeholder="Item name" style={{ ...inputStyle }} />
                    <input value={item.description || ''} onChange={e => updateMenuItem(i, 'description', e.target.value)} placeholder="Description" style={{ ...inputStyle }} />
                    <button onClick={() => removeMenuItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.45)', display: 'flex', padding: '0 0 7px' }}>
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

            <DetailsSection title="Guest meal options" icon={UtensilsCrossed}>
              {canAccessUltra ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Meal choices guests can pick on your RSVP form</label>
                  <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 4px' }}>
                    Leave this empty and guests will see a default list (chicken, beef, fish, vegetarian, vegan, kids meal).
                  </p>
                  {mealOptions.map((opt) => (
                    <div key={opt.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'flex-end' }}>
                      <input value={opt.label || ''} onChange={e => updateMealOptionLabel(opt.id, e.target.value)} placeholder="e.g. Herb-roasted chicken" style={{ ...inputStyle }} />
                      <button onClick={() => removeMealOption(opt.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.45)', display: 'flex', padding: '0 0 7px' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button onClick={addMealOption}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#E03553', fontWeight: 700, background: 'none', border: '1px dashed rgba(224,53,83,0.4)', borderRadius: 999, padding: '7px 14px', cursor: 'pointer', fontFamily: PJS, width: 'fit-content', marginTop: 4 }}>
                    <Plus size={12} />Add meal option
                  </button>
                </div>
              ) : (
                <MealOptionsUltraGate />
              )}
            </DetailsSection>
          </div>
        )}

        {/* Bar tab */}
        {activeTab === 'bar' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
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
          </div>
        )}

        {/* Notes tab */}
        {activeTab === 'notes' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <DetailsSection title="Notes" icon={FileText}>
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
        systemPrompt="You are Ava, a wedding catering advisor. Help plan menus, drinks and dietary requirements. If the couple has selected cultures and traditions, suggest culturally-relevant dishes/menu elements and any ceremonial food customs (e.g. a tea ceremony's tea selection for Chinese heritage) where relevant."
        quickActions={["Suggest a wedding menu", "How much food per person?", "Signature cocktail ideas", "Handle dietary restrictions"]}
      />
    </div>
  );
}
