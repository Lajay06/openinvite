import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import toast from 'react-hot-toast';

import ScheduleForm from "../components/schedule/ScheduleForm";
import ScheduleList from "../components/schedule/ScheduleList";
import ScheduleTimeline from "../components/schedule/ScheduleTimeline";
import WeddingDayTimelineBuilder from "../components/schedule/WeddingDayTimelineBuilder";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader";
import AvaButton from "@/components/shared/AvaButton";
import AvaModal from "@/components/layout/AvaModal";
import PageConsiderations from '../components/shared/PageConsiderations';
import { base44 } from "@/api/base44Client";
const Schedule = base44.entities.Schedule;

function CountUp({ to, duration = 1200, format }) {
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
  return <>{format ? format(value) : value}</>;
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
  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
  color: 'rgba(10,10,10,0.4)', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, marginBottom: 10,
};
const statValueStyle = {
  fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1, margin: 0,
};

const CATEGORIES = [
  "all", "ceremony", "reception", "photography", "preparation",
  "transportation", "rehearsal", "pre_wedding", "post_wedding", "other",
];

export default function SchedulePage({
  embedded    = false,
  activeView  = null,
  hideChrome  = false,   // when true: suppress stat strip, banner, action bar (hub owns them)
  refreshKey  = 0,       // hub increments to trigger a fresh data load after it modifies items
}) {
  const [scheduleItems, setScheduleItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("visual");
  const [loading, setLoading] = useState(true);
  const [avaOpen, setAvaOpen] = useState(false);
  // When the hub drives the view externally, use that; otherwise use internal state
  const effectiveTab = activeView ?? activeTab;

  useEffect(() => { loadScheduleItems(); }, []);
  useEffect(() => { if (refreshKey > 0) loadScheduleItems(); }, [refreshKey]);

  const loadScheduleItems = async () => {
    try {
      const data = await Schedule.list('start_time');
      setScheduleItems(data);
    } catch {
      toast.error("Failed to load schedule");
    }
    setLoading(false);
  };

  const handleSubmit = async (itemData) => {
    const tid = toast.loading(editingItem?.id ? 'Updating…' : 'Adding event…');
    try {
      if (editingItem?.id) {
        await Schedule.update(editingItem.id, itemData);
        toast.success('Event updated', { id: tid });
      } else {
        await Schedule.create(itemData);
        toast.success('Event added', { id: tid });
      }
      setShowForm(false);
      setEditingItem(null);
      loadScheduleItems();
    } catch {
      toast.error('Failed to save event', { id: tid });
    }
  };

  const handleEdit = (item) => { setEditingItem(item); setShowForm(true); };
  const handleAddEvent = () => { setEditingItem(null); setShowForm(true); };

  const handleAddSuggestion = (suggestion) => {
    setEditingItem({ event_name: suggestion.event_name, category: suggestion.category, description: suggestion.description, event_date: "", start_time: "", end_time: "" });
    setShowAvaModal(false);
    setShowForm(true);
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm("Delete this event?")) return;
    const tid = toast.loading('Deleting…');
    try {
      await Schedule.delete(itemId);
      toast.success('Event deleted', { id: tid });
      loadScheduleItems();
    } catch {
      toast.error('Failed to delete', { id: tid });
    }
  };

  const handleTimeUpdate = async (itemId, newStartTime, newEndTime) => {
    try {
      await Schedule.update(itemId, { start_time: newStartTime, end_time: newEndTime });
      loadScheduleItems();
    } catch {
      toast.error('Failed to update event time');
    }
  };

  const stats = React.useMemo(() => {
    const total = scheduleItems.length;
    const ceremony = scheduleItems.filter(i => i.category === 'ceremony').length;
    const reception = scheduleItems.filter(i => i.category === 'reception').length;
    const other = total - ceremony - reception;
    return { total, ceremony, reception, other };
  }, [scheduleItems]);

  const filteredItems = scheduleItems.filter(item => {
    const matchesSearch =
      item.event_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.responsible_person?.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeCategory === "all") return matchesSearch;
    return matchesSearch && item.category === activeCategory;
  });

  const exportSchedule = () => {
    const csvContent = [
      ['Event Name', 'Date', 'Start Time', 'End Time', 'Location', 'Category', 'Responsible Person', 'Description', 'Notes'].join(','),
      ...scheduleItems.map(item => [
        item.event_name, item.event_date || '', item.start_time, item.end_time || '',
        item.location || '', item.category || '', item.responsible_person || '',
        item.description || '', item.notes || '',
      ].map(f => `"${f}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'wedding-schedule.csv'; link.click();
    URL.revokeObjectURL(url);
    toast.success('Schedule exported');
  };

  const STAT_CARDS = [
    { label: 'Total events',   value: stats.total },
    { label: 'Ceremony',       value: stats.ceremony },
    { label: 'Reception',      value: stats.reception },
    { label: 'Other events',   value: stats.other },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>

      {!embedded && <DashboardPageHeader title="Schedule" subtitle="Build, visualise and optimise your wedding day timeline" />}

      {/* Stat strip — hidden when hub owns it above the tab row */}
      {!hideChrome && (
        <div className="flex flex-wrap w-full" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          {STAT_CARDS.map((s, i) => (
            <div key={s.label} className="grow shrink basis-1/2 min-w-0 lg:flex-1" style={{ padding: '24px 32px', minHeight: 80, borderRadius: 0, boxShadow: 'none', borderRight: i < STAT_CARDS.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
              <p style={statLabelStyle}>{s.label}</p>
              {loading
                ? <div style={{ width: 60, height: 32, background: 'rgba(10,10,10,0.06)' }} />
                : <p style={statValueStyle}><CountUp to={s.value} /></p>
              }
            </div>
          ))}
        </div>
      )}

      {/* Guest Suite visibility banner — hidden when hub owns it */}
      {!hideChrome && (
        <div style={{ padding: '8px 32px', background: 'rgba(10,10,10,0.02)', borderBottom: '1px solid rgba(10,10,10,0.05)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            ✨ This schedule is visible to guests in your Guest Suite
          </span>
        </div>
      )}

      {/* Ava + actions bar — hidden when hub owns it */}
      {!hideChrome && (
        <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 md:px-8 py-4" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          <AvaButton label="Ask Ava to build your wedding timeline" onClick={() => setAvaOpen(true)} />
          <div className="flex flex-wrap items-center gap-[10px]">
            <button
              onClick={exportSchedule}
              disabled={scheduleItems.length === 0}
              className="btn-editorial-secondary"
              style={{ opacity: scheduleItems.length === 0 ? 0.4 : 1 }}
            >
              Export CSV
            </button>
            <button onClick={handleAddEvent} className="btn-primary">+ Add event</button>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '32px 32px 48px' }}>

        <Tabs value={effectiveTab} onValueChange={setActiveTab}>
          {activeView === null && (
            <TabsList className="w-full justify-start">
              <TabsTrigger value="visual">Timeline</TabsTrigger>
              <TabsTrigger value="timeline">Timeline view</TabsTrigger>
              <TabsTrigger value="list">List view</TabsTrigger>
              <TabsTrigger value="considerations">Considerations</TabsTrigger>
            </TabsList>
          )}

          {/* Timeline */}
          <TabsContent value="visual" className="mt-8">
            <div style={{ padding: '10px 16px', background: 'rgba(10,10,10,0.03)', borderLeft: '2px solid #E03553', marginBottom: 24 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(10,10,10,0.55)', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.5 }}>
                [CONFIRMED COPY HERE]
              </p>
            </div>
            <WeddingDayTimelineBuilder
              scheduleItems={scheduleItems}
              onEdit={handleEdit}
              onAddEvent={handleAddEvent}
              onTimeUpdate={handleTimeUpdate}
            />
          </TabsContent>

          {/* Timeline View */}
          <TabsContent value="timeline" className="mt-8">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ position: 'relative', maxWidth: 400 }}>
                  <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
                  <Input
                    placeholder="Search events…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: 20 }}
                  />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CATEGORIES.map(cat => (
                    <FilterPill
                      key={cat}
                      label={cat === 'all' ? 'All' : cat.replace(/_/g, ' ')}
                      active={activeCategory === cat}
                      onClick={() => setActiveCategory(cat)}
                    />
                  ))}
                </div>
              </div>
              <ScheduleTimeline items={filteredItems} onEdit={handleEdit} onDelete={handleDelete} />
            </div>
          </TabsContent>

          {/* Considerations */}
          <TabsContent value="considerations" className="mt-8" style={{ maxWidth: 860 }}>
            <PageConsiderations pageKey="schedule" />
          </TabsContent>

          {/* List View */}
          <TabsContent value="list" className="mt-8">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ position: 'relative', maxWidth: 400 }}>
                  <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
                  <Input
                    placeholder="Search events…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: 20 }}
                  />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {CATEGORIES.map(cat => (
                    <FilterPill
                      key={cat}
                      label={cat === 'all' ? 'All' : cat.replace(/_/g, ' ')}
                      active={activeCategory === cat}
                      onClick={() => setActiveCategory(cat)}
                    />
                  ))}
                </div>
              </div>
              <ScheduleList items={filteredItems} onEdit={handleEdit} onDelete={handleDelete} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add / Edit Event modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', position: 'relative' }}>
            <ScheduleForm
              item={editingItem}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditingItem(null); }}
            />
          </div>
        </div>
      )}

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Wedding timeline expert"
        systemPrompt="You are Ava, a wedding day timeline expert. Help build a realistic wedding day schedule."
        quickActions={["Build me a wedding day timeline", "How long should each part take?", "What time should I start getting ready?", "Add buffer time suggestions"]}
      />


    </div>
  );
}
