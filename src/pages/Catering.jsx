import React, { useState, useEffect, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UtensilsCrossed, Plus, ChefHat, Coffee, Wine, Cake, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import toast from 'react-hot-toast';

import DashboardPageHeader from '../components/layout/DashboardPageHeader';
import AvaButton from '../components/shared/AvaButton';
import AvaModal from '../components/layout/AvaModal';
import VendorSearch from "../components/vendors/VendorSearch";
import SectionInput from "../components/event-details/SectionInput";
import DetailsSection from "../components/event-details/DetailsSection";
import { base44 } from "@/api/base44Client";

const Vendor = base44.entities.Vendor;
const WeddingDetails = base44.entities.WeddingDetails;

const PJS = "'Plus Jakarta Sans', sans-serif";
const labelStyle = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
  color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 6, display: 'block',
};

const TABS = [
  { key: 'planning', label: 'Catering planning' },
  { key: 'find-caterers', label: 'Find caterers' },
];

export default function CateringPage() {
  const [caterers, setCaterers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("planning");
  const [searchTerm, setSearchTerm] = useState("");
  const [avaOpen, setAvaOpen] = useState(false);

  const [details, setDetails] = useState({ foodAndBeverage: {} });
  const [detailsId, setDetailsId] = useState(null);
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  const autoSaveRef   = useRef(null);
  const detailsIdRef  = useRef(null); // ref so the debounced closure always reads the latest id
  const latestFabRef  = useRef({});   // always-current foodAndBeverage — avoids stale-state drops

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allVendors, detailsData] = await Promise.all([
        Vendor.list('-created_date'),
        WeddingDetails.list().catch(() => [])
      ]);
      setCaterers(allVendors.filter(v => v.category === 'catering'));
      if (detailsData.length > 0) {
        setDetails(detailsData[0]);
        setDetailsId(detailsData[0].id);
        detailsIdRef.current  = detailsData[0].id;
        latestFabRef.current  = detailsData[0].foodAndBeverage || {};
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    }
    setLoading(false);
  };

  const persist = (nextFoodAndBeverage) => {
    clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      const id = detailsIdRef.current;
      try {
        if (id) {
          await WeddingDetails.update(id, { foodAndBeverage: nextFoodAndBeverage });
        } else {
          const c = await WeddingDetails.create({ foodAndBeverage: nextFoodAndBeverage });
          setDetailsId(c.id);
          detailsIdRef.current = c.id;
        }
      } catch (e) {
        console.error('[Catering] autosave failed:', e);
      }
    }, 800);
  };

  const handleDetailsUpdate = (field, value) => {
    const next = { ...latestFabRef.current, [field]: value };
    latestFabRef.current = next;
    setDetails(prev => ({ ...prev, foodAndBeverage: next }));
    persist(next);
  };

  const handleVendorSelect = (vendorId) => {
    const vendor = caterers.find(v => v.id === vendorId);
    if (vendor) {
      handleDetailsUpdate('vendorId', vendorId);
      handleDetailsUpdate('caterer', vendor.name);
      handleDetailsUpdate('cateringContact', vendor.contact_person);
      handleDetailsUpdate('cateringPhone', vendor.phone);
      handleDetailsUpdate('cateringEmail', vendor.email);
    }
  };

  const handleDetailsSave = async () => {
    setIsSavingDetails(true);
    const toastId = toast.loading('Saving catering details...');
    try {
      if (!detailsId) {
        const newDetails = await WeddingDetails.create({ foodAndBeverage: latestFabRef.current });
        setDetailsId(newDetails.id);
        detailsIdRef.current = newDetails.id;
      } else {
        await WeddingDetails.update(detailsId, { foodAndBeverage: latestFabRef.current });
      }
      toast.success('Catering details saved!', { id: toastId });
    } catch (error) {
      console.error('Error saving catering details:', error);
      toast.error('Failed to save catering details.', { id: toastId });
    }
    setIsSavingDetails(false);
  };

  const handleAddFromSearch = async (searchResult) => {
    const toastId = toast.loading('Adding caterer...');
    try {
      await Vendor.create({
        name: searchResult.name,
        category: 'catering',
        address: searchResult.address,
        phone: searchResult.phone,
        website: searchResult.website,
        latitude: searchResult.latitude,
        longitude: searchResult.longitude,
        google_place_id: searchResult.place_id,
        rating: searchResult.rating,
        google_reviews_count: searchResult.user_ratings_total,
        image_url: searchResult.photo_url,
        price_range: searchResult.price_level ? '$'.repeat(searchResult.price_level) : '$$',
        status: "researching"
      });
      toast.success('Caterer added!', { id: toastId });
      loadData();
      setActiveTab("planning");
    } catch (error) {
      console.error("Error adding caterer from search:", error);
      toast.error('Failed to add caterer', { id: toastId });
    }
  };

  const stats = React.useMemo(() => ({
    total: caterers.length,
    booked: caterers.filter(c => c.status === 'booked').length,
    quoted: caterers.filter(c => c.status === 'quoted').length,
    totalSpent: caterers.filter(c => c.status === 'booked' && c.quoted_price).reduce((s, c) => s + (c.quoted_price || 0), 0),
  }), [caterers]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={22} style={{ color: '#E03553' }} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader
        title="Catering"
        subtitle="Plan your menu, caterers, and beverage services"
        actions={
          <button
            onClick={() => setActiveTab('find-caterers')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 999, background: '#E03553', color: '#FFFFFF', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: PJS }}
          >
            <Plus size={13} /> Add caterer
          </button>
        }
      />

      {/* Stat strip */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {[
          { label: 'Total caterers', value: stats.total },
          { label: 'Booked', value: stats.booked },
          { label: 'Quoted', value: stats.quoted },
          { label: 'Total spent', value: stats.totalSpent > 0 ? `$${(stats.totalSpent / 1000).toFixed(0)}k` : '$0' },
        ].map((s, i, arr) => (
          <div key={s.label} style={{ flex: 1, padding: '20px 32px', borderRight: i < arr.length - 1 ? '1px solid rgba(10,10,10,0.08)' : undefined }}>
            <div style={{ fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, letterSpacing: '-0.02em' }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Ava button */}
      <div style={{ padding: '16px 32px' }}>
        <AvaButton label="Ask Ava to find caterers" onClick={() => setAvaOpen(true)} />
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)', padding: '0 32px', display: 'flex' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{
              padding: '13px 0', marginRight: 28, fontSize: 13, fontWeight: 600,
              fontFamily: PJS, background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === t.key ? '#E03553' : '#444444',
              borderBottom: activeTab === t.key ? '2px solid #E03553' : '2px solid transparent',
              transition: 'color 0.12s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '28px 32px 48px' }}>

        {/* Planning tab */}
        {activeTab === 'planning' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            <DetailsSection title="Caterer / venue" icon={ChefHat} sectionKey="caterer" onSave={handleDetailsSave} isSaving={isSavingDetails}>
              <div>
                <label style={labelStyle}>Select caterer</label>
                {caterers.length > 0 ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <Select value={details.foodAndBeverage?.vendorId || ''} onValueChange={handleVendorSelect}>
                        <SelectTrigger><SelectValue placeholder="Select from your caterers" /></SelectTrigger>
                        <SelectContent>
                          {caterers.map(vendor => <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Link to={createPageUrl('Vendors')}>
                      <button style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid rgba(10,10,10,0.15)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0A0A' }}>
                        <Plus size={13} />
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      value={details.foodAndBeverage?.caterer || ''}
                      onChange={e => handleDetailsUpdate('caterer', e.target.value)}
                      placeholder="Caterer name"
                      style={{ flex: 1, border: 'none', borderBottom: '1px solid rgba(10,10,10,0.15)', background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: PJS, outline: 'none', padding: '6px 0' }}
                    />
                    <Link to={createPageUrl('Vendors')}>
                      <button style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid rgba(10,10,10,0.15)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0A0A0A' }}>
                        <Plus size={13} />
                      </button>
                    </Link>
                  </div>
                )}
                {caterers.length === 0 && (
                  <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginTop: 6 }}>No catering vendors added yet. Click + to add one.</p>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <SectionInput label="Contact person" value={details.foodAndBeverage?.cateringContact} onChange={e => handleDetailsUpdate('cateringContact', e.target.value)} placeholder="Contact name" />
                <SectionInput label="Phone" value={details.foodAndBeverage?.cateringPhone} onChange={e => handleDetailsUpdate('cateringPhone', e.target.value)} placeholder="Phone number" />
              </div>
              <SectionInput label="Email" type="email" value={details.foodAndBeverage?.cateringEmail} onChange={e => handleDetailsUpdate('cateringEmail', e.target.value)} placeholder="Email address" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Service style</label>
                  <Select value={details.foodAndBeverage?.serviceStyle || ''} onValueChange={v => handleDetailsUpdate('serviceStyle', v)}>
                    <SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buffet">Buffet</SelectItem>
                      <SelectItem value="plated">Plated</SelectItem>
                      <SelectItem value="family_style">Family style</SelectItem>
                      <SelectItem value="stations">Food stations</SelectItem>
                      <SelectItem value="cocktail">Cocktail reception</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <SectionInput label="Guest count" type="number" value={details.foodAndBeverage?.guestCount} onChange={e => handleDetailsUpdate('guestCount', e.target.value)} placeholder="Number of guests" />
              </div>
            </DetailsSection>

            <DetailsSection title="Menu & dishes" icon={UtensilsCrossed} sectionKey="menu" onSave={handleDetailsSave} isSaving={isSavingDetails}>
              <SectionInput label="Menu items" isTextarea value={details.foodAndBeverage?.menuItems?.map(item => `${item.name}: ${item.description}`).join('\n') || ''}
                onChange={e => {
                  const items = e.target.value.split('\n').map(line => { const [name, description] = line.split(':').map(s => s.trim()); return { name: name || '', description: description || '' }; }).filter(item => item.name);
                  handleDetailsUpdate('menuItems', items);
                }}
                placeholder="Enter menu items, one per line. Format: Dish name: Description" />
              <SectionInput label="Dietary options" isTextarea value={details.foodAndBeverage?.dietaryOptions?.join(', ') || ''}
                onChange={e => handleDetailsUpdate('dietaryOptions', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="Vegetarian, vegan, gluten-free, etc. (comma separated)" />
            </DetailsSection>

            <DetailsSection title="Bar & beverages" icon={Wine} sectionKey="bar" onSave={handleDetailsSave} isSaving={isSavingDetails}>
              <div>
                <label style={labelStyle}>Bar type</label>
                <Select value={details.foodAndBeverage?.barType || ''} onValueChange={v => handleDetailsUpdate('barType', v)}>
                  <SelectTrigger><SelectValue placeholder="Select bar type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open_bar">Open bar</SelectItem>
                    <SelectItem value="cash_bar">Cash bar</SelectItem>
                    <SelectItem value="limited_bar">Limited bar</SelectItem>
                    <SelectItem value="beer_wine_only">Beer & wine only</SelectItem>
                    <SelectItem value="signature_cocktails">Signature cocktails</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <SectionInput label="Cocktail menu" isTextarea value={details.foodAndBeverage?.cocktailItems?.map(item => `${item.name}: ${item.description}`).join('\n') || ''}
                onChange={e => {
                  const items = e.target.value.split('\n').map(line => { const [name, description] = line.split(':').map(s => s.trim()); return { name: name || '', description: description || '' }; }).filter(item => item.name);
                  handleDetailsUpdate('cocktailItems', items);
                }}
                placeholder="Signature cocktails, one per line. Format: Cocktail name: Description" />
              <SectionInput label="Bar notes" isTextarea value={details.foodAndBeverage?.barNotes} onChange={e => handleDetailsUpdate('barNotes', e.target.value)} placeholder="Bar preferences, restrictions, special requests" />
            </DetailsSection>

            <DetailsSection title="Dessert & cake" icon={Cake} sectionKey="dessert" onSave={handleDetailsSave} isSaving={isSavingDetails}>
              <SectionInput label="Wedding cake" isTextarea value={details.foodAndBeverage?.cake} onChange={e => handleDetailsUpdate('cake', e.target.value)} placeholder="Cake flavors, tiers, design details" />
              <SectionInput label="Additional desserts" isTextarea value={details.foodAndBeverage?.desserts} onChange={e => handleDetailsUpdate('desserts', e.target.value)} placeholder="Other dessert options (cookies, pastries, dessert bar, etc.)" />
            </DetailsSection>

            <DetailsSection title="Coffee & late night" icon={Coffee} sectionKey="latenight" onSave={handleDetailsSave} isSaving={isSavingDetails}>
              <SectionInput label="Coffee service" isTextarea value={details.foodAndBeverage?.coffee} onChange={e => handleDetailsUpdate('coffee', e.target.value)} placeholder="Coffee bar, espresso, specialty drinks" />
              <SectionInput label="Late night snacks" isTextarea value={details.foodAndBeverage?.lateNightSnacks} onChange={e => handleDetailsUpdate('lateNightSnacks', e.target.value)} placeholder="Pizza, sliders, donuts, or other late-night food" />
            </DetailsSection>
          </div>
        )}

        {/* Find caterers tab */}
        {activeTab === 'find-caterers' && (
          <VendorSearch
            onAddVendor={handleAddFromSearch}
            category="catering"
            searchPrompt="caterers, restaurants, food service providers"
          />
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
