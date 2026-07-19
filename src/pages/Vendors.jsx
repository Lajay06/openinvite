import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import PageConsiderations from '../components/shared/PageConsiderations';
import toast from 'react-hot-toast';

import VendorForm from "../components/vendors/VendorForm";
import VendorList from "../components/vendors/VendorList";
import VendorDetailPanel from "../components/vendors/VendorDetailPanel";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader";
import AvaButton from "@/components/shared/AvaButton";
import AvaModal from "@/components/layout/AvaModal";
import { base44 } from "@/api/base44Client";
import { getMyRecords } from "@/lib/resolveMyWedding";
import { useCollaboratorContext } from "@/lib/collaboratorContext";
const Vendor = base44.entities.Vendor;

const PJS = "'Plus Jakarta Sans', sans-serif";

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

const STATUS_FILTERS = [
  { key: "all",         label: "All statuses" },
  { key: "booked",      label: "Booked" },
  { key: "contacted",   label: "Contacted" },
  { key: "quoted",      label: "Quoted" },
  { key: "rejected",    label: "Rejected" },
  { key: "researching", label: "Researching" },
];

const CATEGORY_FILTERS = [
  { key: "all",           label: "All categories" },
  { key: "venue",         label: "Venue" },
  { key: "catering",      label: "Catering" },
  { key: "photography",   label: "Photography" },
  { key: "videography",   label: "Videography" },
  { key: "flowers",       label: "Florals" },
  { key: "attire",        label: "Styling" },
  { key: "beauty",        label: "Hair & makeup" },
  { key: "music",         label: "Music & DJ" },
  { key: "transportation","label": "Transport" },
  { key: "planning",      label: "Celebrant" },
  { key: "other",         label: "Other" },
];

const statLabelStyle = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
  color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0, marginBottom: 8,
};
const statValueStyle = {
  fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 700, color: '#0A0A0A',
  fontFamily: PJS, lineHeight: 1, margin: 0,
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [avaOpen, setAvaOpen] = useState(false);
  const [managingVendor, setManagingVendor] = useState(null);
  const [activeTab, setActiveTab] = useState("vendors");

  const collab = useCollaboratorContext();
  const isCollaborating = !!collab.ownerUserId;
  // Read-only regardless of the 'edit' permission bit — Vendor's update/
  // delete RLS is owner-scoped, same as every other entity here, so the
  // admin key 403s on a write no matter what was granted (see
  // api/collaborator-guests.js's header / BASE44_PLATFORM_NOTES.md).
  const readOnly = isCollaborating;

  useEffect(() => { loadVendors(); }, [isCollaborating]);

  const loadVendors = async () => {
    try {
      if (isCollaborating) {
        const res = await fetch(`/api/collaborator-data?ownerUserId=${encodeURIComponent(collab.ownerUserId)}&page=Vendors`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('base44_access_token')}` },
        });
        if (!res.ok) throw new Error('Failed to load vendors');
        const { data } = await res.json();
        setVendors(data.Vendor || []);
      } else {
        const data = await getMyRecords('Vendor', '-created_date');
        setVendors(data);
      }
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

  const filteredVendors = vendors.filter(v => {
    const matchesSearch =
      v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.contact_person?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || v.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const stats = React.useMemo(() => ({
    total:       vendors.length,
    booked:      vendors.filter(v => v.status === 'booked').length,
    quoted:      vendors.filter(v => v.status === 'quoted').length,
    researching: vendors.filter(v => v.status === 'researching').length,
  }), [vendors]);

  const STAT_CARDS = [
    { label: 'Total vendors',  value: stats.total },
    { label: 'Booked',         value: stats.booked },
    { label: 'Quoted',         value: stats.quoted },
    { label: 'Researching',    value: stats.researching },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>

      <DashboardPageHeader title="My vendors" subtitle="Research, track and manage all your wedding service providers" />

      {/* Stat strip */}
      <div className="flex flex-wrap w-full" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {STAT_CARDS.map((s, i) => (
          <div key={s.label} className="grow shrink basis-1/2 min-w-0 lg:flex-1" style={{
            padding: '20px 32px',
            borderRight: i < STAT_CARDS.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none',
          }}>
            <p style={statLabelStyle}>{s.label}</p>
            {loading
              ? <div style={{ width: 48, height: 28, background: 'rgba(10,10,10,0.06)' }} />
              : <p style={statValueStyle}><CountUp to={s.value} /></p>
            }
          </div>
        ))}
      </div>

      {/* Ava + Add vendor — same row */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 md:px-8 py-4">
        {!isCollaborating ? <AvaButton label="Ask Ava to find the perfect vendors" onClick={() => setAvaOpen(true)} /> : <div />}
        {!readOnly && (
          <button
            onClick={() => { setEditingVendor(null); setShowForm(true); }}
            className="btn-primary"
          >
            + Add vendor
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 32px 48px' }}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="considerations">Considerations</TabsTrigger>
          </TabsList>

          <TabsContent value="vendors" className="mt-6">
            {/* Search */}
            <div style={{ position: 'relative', maxWidth: 400, marginBottom: 14 }}>
              <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
              <Input
                placeholder="Search vendors…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ paddingLeft: 20 }}
              />
            </div>

            {/* Row 1 — Status filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`filter-pill${statusFilter === f.key ? ' active' : ''}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Row 2 — Category filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
              {CATEGORY_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setCategoryFilter(f.key)}
                  className={`filter-pill${categoryFilter === f.key ? ' active' : ''}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Vendor list */}
            {vendors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 32px', border: '1px solid rgba(10,10,10,0.06)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', border: '1.5px dashed rgba(10,10,10,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Search size={20} style={{ color: 'rgba(10,10,10,0.2)' }} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 6px' }}>No vendors added yet</p>
                {!readOnly && (
                  <>
                    <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 20px' }}>Click + Add vendor to start tracking your suppliers</p>
                    <button onClick={() => { setEditingVendor(null); setShowForm(true); }} className="btn-primary">
                      + Add vendor
                    </button>
                  </>
                )}
              </div>
            ) : (
              <VendorList
                vendors={filteredVendors}
                onEdit={readOnly ? undefined : handleEdit}
                onDelete={readOnly ? undefined : handleDelete}
                onManage={readOnly ? undefined : setManagingVendor}
              />
            )}
          </TabsContent>

          <TabsContent value="considerations" className="mt-8" style={{ maxWidth: 860 }}>
            <PageConsiderations pageKey="vendors" />
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

      {managingVendor && (
        <VendorDetailPanel vendor={managingVendor} onClose={() => setManagingVendor(null)} />
      )}
    </div>
  );
}
