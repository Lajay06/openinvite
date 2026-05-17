import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import toast from 'react-hot-toast';

import VendorForm from "../components/vendors/VendorForm";
import VendorList from "../components/vendors/VendorList";
import VendorDetailPanel from "../components/vendors/VendorDetailPanel";
import VendorSearch from "../components/vendors/VendorSearch";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader";
import AvaButton from "@/components/shared/AvaButton";
import AvaModal from "@/components/layout/AvaModal";
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

const CATEGORY_ORDER = [
  "venue", "catering", "photography", "videography", "flowers", "music",
  "bakery", "beauty", "attire", "transportation", "planning", "decorations", "entertainment", "other",
];

const CATEGORY_LABELS = {
  venue: "Venue", catering: "Catering", photography: "Photography", videography: "Videography",
  flowers: "Flowers & florist", music: "Music & DJ", bakery: "Bakery & cake",
  beauty: "Beauty & hair", attire: "Attire & fashion", transportation: "Transportation",
  planning: "Wedding planning", decorations: "Decorations", entertainment: "Entertainment", other: "Other",
};

const STATUSES = ["all", "booked", "contacted", "quoted", "rejected", "researching"];

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("my-vendors");
  const [avaOpen, setAvaOpen] = useState(false);
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
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
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

      {/* Ava button */}
      <div style={{ padding: '16px 32px' }}>
        <AvaButton label="Ask Ava to find the perfect vendors" onClick={() => setAvaOpen(true)} />
      </div>

      {/* Content */}
      <div style={{ padding: '32px 32px 48px' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingBottom: 20, borderBottom: '1px solid rgba(10,10,10,0.08)', marginBottom: 24 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Search + status filter row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 400 }}>
                  <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
                  <Input
                    placeholder="Search vendors…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: 20 }}
                  />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {STATUSES.map(s => (
                    <FilterPill key={s} label={s === 'all' ? 'All statuses' : s} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
                  ))}
                </div>
              </div>

              {/* Empty state */}
              {vendors.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 32px', border: '1px solid rgba(10,10,10,0.08)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', border: '1.5px dashed rgba(10,10,10,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Search size={20} style={{ color: 'rgba(10,10,10,0.2)' }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 6px' }}>No vendors added yet</p>
                  <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 20px' }}>Click + Add vendor to start tracking your suppliers</p>
                  <button onClick={() => { setEditingVendor(null); setShowForm(true); }} className="btn-primary" style={{ fontSize: 13 }}>+ Add vendor</button>
                </div>
              ) : filteredVendors.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 32px', border: '1px solid rgba(10,10,10,0.08)' }}>
                  <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>No vendors match your search or filter.</p>
                </div>
              ) : (
                /* Grouped by category */
                (() => {
                  const grouped = filteredVendors.reduce((acc, v) => {
                    const cat = v.category || 'other';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(v);
                    return acc;
                  }, {});
                  const visibleCategories = CATEGORY_ORDER.filter(c => grouped[c]?.length > 0);
                  const uncategorised = Object.keys(grouped).filter(c => !CATEGORY_ORDER.includes(c));
                  return [...visibleCategories, ...uncategorised].map(cat => (
                    <div key={cat}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {CATEGORY_LABELS[cat] || cat}
                        </span>
                        <span style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>({grouped[cat].length})</span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(10,10,10,0.08)' }} />
                      </div>
                      <VendorList
                        vendors={grouped[cat]}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onManage={setManagingVendor}
                      />
                    </div>
                  ));
                })()
              )}
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

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Vendor expert"
        systemPrompt="You are Ava, a wedding vendor expert. Help find, evaluate, and manage wedding vendors."
        quickActions={["What vendors do I still need?", "What questions should I ask vendors?", "Help me compare vendor quotes", "Draft a vendor enquiry email"]}
      />

      {/* Vendor detail panel */}
      {managingVendor && (
        <VendorDetailPanel vendor={managingVendor} onClose={() => setManagingVendor(null)} />
      )}


    </div>
  );
}
