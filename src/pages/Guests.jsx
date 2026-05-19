import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
const Guest = base44.entities.Guest;
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import toast from 'react-hot-toast';

import GuestForm from "../components/guests/GuestForm";
import GuestList from "../components/guests/GuestList";
import RSVPManagement from "../components/guests/RSVPManagement";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader";
import AvaButton from "@/components/shared/AvaButton";
import AvaModal from "@/components/layout/AvaModal";
import EmailTemplates from "../components/guests/EmailTemplates";
import PageConsiderations from '../components/shared/PageConsiderations';

function CountUp({ to, duration = 1200, suffix = '' }) {
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
  return <>{value}{suffix}</>;
}

function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`filter-pill${active ? ' active' : ''}`}
    >
      {label}
    </button>
  );
}

const statLabelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, marginBottom: 10,
};
const statValueStyle = {
  fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700,
  color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif",
  lineHeight: 1, margin: 0,
};

export default function Guests() {
  const [guests, setGuests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("list");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avaOpen, setAvaOpen] = useState(false);

  useEffect(() => { loadGuests(); }, []);

  const loadGuests = async () => {
    try {
      const data = await Guest.list('-created_date');
      setGuests(data);
    } catch {
      toast.error("Failed to load guests");
    }
    setLoading(false);
  };

  const handleSubmit = async (guestData) => {
    setSaving(true);
    const tid = toast.loading(editingGuest ? 'Updating guest…' : 'Adding guest…');
    try {
      if (editingGuest) {
        await Guest.update(editingGuest.id, guestData);
        toast.success('Guest updated', { id: tid });
      } else {
        await Guest.create(guestData);
        toast.success('Guest added', { id: tid });
      }
      setShowForm(false);
      setEditingGuest(null);
      loadGuests();
    } catch (e) {
      toast.error(e?.message || 'Failed to save guest', { id: tid });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (guest) => { setEditingGuest(guest); setShowForm(true); };

  const handleDelete = async (guestId) => {
    if (!window.confirm("Delete this guest?")) return;
    const tid = toast.loading('Deleting…');
    try {
      await Guest.delete(guestId);
      toast.success('Guest deleted', { id: tid });
      loadGuests();
    } catch (e) {
      toast.error(e?.message || 'Failed to delete guest', { id: tid });
    }
  };

  const stats = React.useMemo(() => {
    const total = guests.length;
    const attending = guests.filter(g => g.rsvp_status === 'attending').length;
    const declined = guests.filter(g => g.rsvp_status === 'declined').length;
    const pending = guests.filter(g => g.rsvp_status === 'pending' || !g.rsvp_status).length;
    return { total, attending, declined, pending };
  }, [guests]);

  const filteredGuests = guests.filter(guest => {
    const matchesSearch = guest.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          guest.email?.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeFilter === "all") return matchesSearch;
    return matchesSearch && guest.rsvp_status === activeFilter;
  });

  const exportGuestList = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Category', 'RSVP Status', 'Meal Choice', 'Table Assignment', 'Plus One', 'Plus One Name', 'Dietary Restrictions'].join(','),
      ...guests.map(g => [
        g.name, g.email || '', g.phone || '', g.category || '',
        g.rsvp_status || '', g.meal_choice || '', g.table_assignment || '',
        g.plus_one ? 'Yes' : 'No', g.plus_one_name || '', g.dietary_restrictions || ''
      ].map(f => `"${f}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'guest-list.csv'; link.click();
    URL.revokeObjectURL(url);
    toast.success('Guest list exported');
  };

  const FILTERS = [
    { val: 'all',      label: `All (${stats.total})` },
    { val: 'pending',  label: `Pending (${stats.pending})` },
    { val: 'attending',label: `Attending (${stats.attending})` },
    { val: 'declined', label: `Declined (${stats.declined})` },
  ];

  const STAT_CARDS = [
    { label: 'Total guests',   value: stats.total },
    { label: 'Attending',      value: stats.attending },
    { label: 'Declined',       value: stats.declined },
    { label: 'Awaiting reply', value: stats.pending },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>

      <DashboardPageHeader title="Guest list" subtitle="Manage your guests, RSVPs and meal selections" />

      {/* Stat strip */}
      <div style={{ display: 'flex', width: '100%', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {STAT_CARDS.map((s, i) => (
          <div key={s.label} style={{ flex: 1, padding: '24px 32px', minHeight: 80, borderRight: i < STAT_CARDS.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none', borderRadius: 0, boxShadow: 'none' }}>
            <p style={statLabelStyle}>{s.label}</p>
            {loading
              ? <div style={{ width: 60, height: 36, background: 'rgba(10,10,10,0.06)' }} />
              : <p style={statValueStyle}><CountUp to={s.value} /></p>
            }
          </div>
        ))}
      </div>

      {/* Ava button */}
      <div style={{ padding: '16px 32px' }}>
        <AvaButton label="Ask Ava to help manage your guest list" onClick={() => setAvaOpen(true)} />
      </div>

      {/* Content */}
      <div style={{ padding: '32px 32px 48px' }}>

        {/* Page toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingBottom: 20, borderBottom: '1px solid rgba(10,10,10,0.08)', marginBottom: 24 }}>
          <button
            onClick={exportGuestList}
            disabled={guests.length === 0}
            className="btn-editorial-secondary"
            style={{ opacity: guests.length === 0 ? 0.4 : 1 }}
          >
            Export CSV
          </button>
          <button onClick={() => { setEditingGuest(null); setShowForm(true); setActiveTab('list'); }} className="btn-primary">
            + Add guest
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="list">Guest list</TabsTrigger>
            <TabsTrigger value="rsvp">RSVP management</TabsTrigger>
            <TabsTrigger value="emails">Email templates</TabsTrigger>
            <TabsTrigger value="considerations">Considerations</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-8 space-y-6">
            {/* Search + filter row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
                <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
                <Input
                  placeholder="Search by name or email…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: 20 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {FILTERS.map(f => (
                  <FilterPill key={f.val} label={f.label} active={activeFilter === f.val} onClick={() => setActiveFilter(f.val)} />
                ))}
              </div>
            </div>

            {showForm && (
              <GuestForm
                guest={editingGuest}
                onSubmit={handleSubmit}
                onCancel={() => { setShowForm(false); setEditingGuest(null); }}
                saving={saving}
              />
            )}

            <GuestList guests={filteredGuests} onEdit={handleEdit} onDelete={handleDelete} loading={loading} />
          </TabsContent>

          <TabsContent value="rsvp" className="mt-8">
            <RSVPManagement guests={guests} />
          </TabsContent>

          <TabsContent value="emails" className="mt-8">
            <EmailTemplates guests={guests} />
          </TabsContent>

          <TabsContent value="considerations" className="mt-8" style={{ maxWidth: 860 }}>
            <PageConsiderations pageKey="guests" />
          </TabsContent>
        </Tabs>
      </div>

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Guest list management"
        systemPrompt="You are Ava, helping manage a wedding guest list. Help with RSVPs, dietary requirements, plus ones, and seating considerations."
        quickActions={["How should I handle plus ones?", "Draft an RSVP reminder message", "What dietary options should I offer?", "Help me organise my guest groups"]}
      />
    </div>
  );
}
