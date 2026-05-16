import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Sparkles } from "lucide-react";
import toast from 'react-hot-toast';

import ScheduleForm from "../components/schedule/ScheduleForm";
import ScheduleList from "../components/schedule/ScheduleList";
import ScheduleTimeline from "../components/schedule/ScheduleTimeline";
import ScheduleAvaModal from "../components/schedule/ScheduleSuggestionsModal";
import WeddingDayTimelineBuilder from "../components/schedule/WeddingDayTimelineBuilder";
import AIWeddingAssistant from "../components/shared/AIWeddingAssistant";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader";
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
  "all", "ceremony", "reception", "photography", "preparation",
  "transportation", "rehearsal", "pre_wedding", "post_wedding", "other",
];

export default function SchedulePage() {
  const [scheduleItems, setScheduleItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("visual");
  const [loading, setLoading] = useState(true);
  const [showAvaModal, setShowAvaModal] = useState(false);

  useEffect(() => { loadScheduleItems(); }, []);

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

      <DashboardPageHeader title="Schedule" subtitle="Build, visualise and optimise your wedding day timeline" />

      {/* Stat strip */}
      <div style={{ display: 'flex', width: '100%', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {STAT_CARDS.map((s, i) => (
          <div key={s.label} style={{ flex: 1, padding: '24px 32px', minHeight: 80, borderRadius: 0, boxShadow: 'none', borderRight: i < STAT_CARDS.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
            <p style={statLabelStyle}>{s.label}</p>
            {loading
              ? <div style={{ width: 60, height: 32, background: 'rgba(10,10,10,0.06)' }} />
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
            onClick={() => setShowAvaModal(true)}
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
            Ask Ava — optimise my schedule
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="visual">Visual builder</TabsTrigger>
            <TabsTrigger value="timeline">Timeline view</TabsTrigger>
            <TabsTrigger value="list">List view</TabsTrigger>
          </TabsList>

          {/* Visual Builder */}
          <TabsContent value="visual" className="mt-8">
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

      {/* Ask Ava modal */}
      <ScheduleAvaModal
        isOpen={showAvaModal}
        onClose={() => setShowAvaModal(false)}
        onAddSuggestion={handleAddSuggestion}
        scheduleItems={scheduleItems}
      />

      <AIWeddingAssistant />
    </div>
  );
}
