import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Sparkles } from "lucide-react";
import toast from 'react-hot-toast';

import VendorForm from "../components/vendors/VendorForm";
import VendorList from "../components/vendors/VendorList";
import VendorDetailPanel from "../components/vendors/VendorDetailPanel";
import VendorSearch from "../components/vendors/VendorSearch";
import AIWeddingAssistant from "../components/shared/AIWeddingAssistant";
import AIVendorAssistant from "../components/vendors/AIVendorAssistant";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader";
import { base44 } from "@/api/base44Client";
const Vendor = base44.entities.Vendor;

function CountUp({ to, duration = 1200 }) {
  const [value, setValue] = useState(0);
  const startRef = useRef(null);
  useEffect(() => {
    if (to === 0) { setValue(0); return; }
    startRef.current = null;
    let raf;
    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * to));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{value}</>;
}

function FilterPill({ label, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '5px 12px', borderRadius: 999,
        border: active ? '1px solid #0A0A0A' : '1px solid rgba(10,10,10,0.18)',
        background: active ? '#0A0A0A' : hovered ? 'rgba(10,10,10,0.04)' : 'transparent',
        color: active ? '#FFFFFF' : '#444444', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </button>
  );
}

const statLabelStyle = {
  color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, marginBottom: 10,
};
const statValueStyle = {
  fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 700, color: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1, margin: 0,
};

const CATEGORIES = [
  "all", "attire", "bakery", "beauty", "catering", "decorations", "entertainment",
  "flowers", "music", "other", "photography", "planning", "transportation", "venue", "videography",
];

const STATUSES = ["all", "booked", "contacted", "quoted", "rejected", "researching"];

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("my-vendors");
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [managingVendor, setManagingVendor] = useState(null);

  useEffect(() => { loadVendors(); }, []);

  const loadVendors = async () => {
    try {
      const data = await Vendor.list('-created_date');
      setVendors(data);
    } catch { toast.error("Failed to load vendors"); }
    setLoading(false);
  };

  const handleSubmit = async (vendorData) => {
    const tid = toast.loading(editingVendor ? 'Updating…' : 'Adding vendor…');
    try {
      if (editingVendor) {
        await Vendor.update(editingVendor.id, vendorData);
        toast.success('Vendor updated', { id: tid });
      } else {
        await Vendor.create(vendorData);
        toast.success('Vendor added', { id: tid });
      }
      setShowForm(false);
      setEditingVendor(null);
      loadVendors();
    } catch { toast.error('Failed to save vendor', { id: tid }); }
  };

  const handleEdit = (vendor) => { setEditingVendor(vendor); setShowForm(true); };

  const handleDelete = async (vendorId) => {
    if (!window.confirm("Delete this vendor?")) return;
    const tid = toast.loading('Deleting…');
    try {
      await Vendor.delete(vendorId);
      toast.success('Vendor deleted', { id: tid });
      loadVendors();
    } catch { toast.error('Failed to delete', { id: tid }); }
  };

  const handleAddFromSearch = async (searchResult) => {
    const tid = toast.loading('Adding vendor…');
    try {
      await Vendor.create({
        name: searchResult.name,
        category: searchResult.category || "other",
        address: searchResult.address,
        phone: searchResult.phone,
        website: searchResult.website,
        latitude: searchResult.latitude,
        longitude: searchResult.longitude,
        google_place_id: searchResult.place_id,
        google_rating: searchResult.rating,
        google_reviews_count: searchResult.user_ratings_total,
        image_url: searchResult.photo_url,
        rating: searchResult.rating,
        status: "researching",
      });
      toast.success('Vendor added', { id: tid });
      loadVendors();
      setActiveTab("my-vendors");
    } catch { toast.error('Failed to add vendor', { id: tid }); }
  };

  const handleVendorUpdateFromAI = (vendorData) => {
    setEditingVendor(vendorData);
    setShowForm(true);
    setShowAIAssistant(false);
  };

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.contact_person?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === "all" || v.category === activeCategory;
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = React.useMemo(() => ({
    total: vendors.length,
    booked: vendors.filter(v => v.status === 'booked').length,
    quoted: vendors.filter(v => v.status === 'quoted').length,
    researching: vendors.filter(v => v.status === 'researching').length,
  }), [vendors]);

  const STAT_CARDS = [
    { label: 'Total vendors',   value: stats.total },
    { label: 'Booked',          value: stats.booked },
    { label: 'Quoted',          value: stats.quoted },
    { label: 'Researching',     value: stats.researching },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>

      <DashboardPageHeader title="My vendors" subtitle="Research, track and manage all your wedding service providers" />

      {/* Stat strip */}
      <div style={{ display: 'flex', width: '100%', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {STAT_CARDS.map((s, i) => (
          <div key={s.label} style={{ flex: 1, padding: '24px 32px', minHeight: 80, borderRadius: 0, boxShadow: 'none', borderRight: i < STAT_CARDS.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
            <p style={statLabelStyle}>{s.label}</p>
            {loading
              ? <div style={{ width: 48, height: 32, background: 'rgba(10,10,10,0.06)' }} />
              : <p style={statValueStyle}><CountUp to={s.value} /></p>
            }
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '32px 32px 48px' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingBottom: 20, borderBottom: '1px solid rgba(10,10,10,0.08)', marginBottom: 24 }}>
          <button
            onClick={() => setShowAIAssistant(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
              borderRadius: 999, background: 'linear-gradient(135deg, #E03553, #803D81)', color: '#FFFFFF', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif",
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Sparkles size={14} />
            Ask Ava — manage my vendors
          </button>
          <button onClick={() => { setEditingVendor(null); setShowForm(true); }} className="btn-primary">
            + Add vendor
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="my-vendors">My vendors ({vendors.length})</TabsTrigger>
            <TabsTrigger value="find-vendors">Find vendors</TabsTrigger>
          </TabsList>

          {/* My Vendors */}
          <TabsContent value="my-vendors" className="mt-8">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Search */}
              <div style={{ position: 'relative', maxWidth: 400 }}>
                <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
                <Input
                  placeholder="Search vendors by name or contact…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: 20 }}
                />
              </div>

              {/* Category filter */}
              <div>
                <p style={{ ...statLabelStyle, marginBottom: 8 }}>Category</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CATEGORIES.map(cat => (
                    <FilterPill
                      key={cat}
                      label={cat === 'all' ? 'All' : cat}
                      active={activeCategory === cat}
                      onClick={() => setActiveCategory(cat)}
                    />
                  ))}
                </div>
              </div>

              {/* Status filter */}
              <div>
                <p style={{ ...statLabelStyle, marginBottom: 8 }}>Status</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {STATUSES.map(s => (
                    <FilterPill
                      key={s}
                      label={s === 'all' ? 'All' : s}
                      active={statusFilter === s}
                      onClick={() => setStatusFilter(s)}
                    />
                  ))}
                </div>
              </div>

              <VendorList
                vendors={filteredVendors}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onManage={setManagingVendor}
              />
            </div>
          </TabsContent>

          {/* Find Vendors */}
          <TabsContent value="find-vendors" className="mt-8">
            <VendorSearch onAddVendor={handleAddFromSearch} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add / Edit Vendor modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', position: 'relative' }}>
            <VendorForm
              vendor={editingVendor}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditingVendor(null); }}
            />
          </div>
        </div>
      )}

      {/* AI Vendor Assistant modal */}
      <AIVendorAssistant
        isOpen={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        vendors={vendors}
        onVendorUpdate={handleVendorUpdateFromAI}
      />

      {/* Vendor detail panel */}
      {managingVendor && (
        <VendorDetailPanel vendor={managingVendor} onClose={() => setManagingVendor(null)} />
      )}

      <AIWeddingAssistant />
    </div>
  );
}
