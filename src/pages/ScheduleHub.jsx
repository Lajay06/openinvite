/**
 * ScheduleHub — canonical layout: header → stat cards → action bar → tabs → content
 * Matches the Budget page structure exactly.
 */
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import DashboardPageHeader from "@/components/layout/DashboardPageHeader";
import AvaButton from "@/components/shared/AvaButton";
import AvaModal from "@/components/layout/AvaModal";
import ScheduleForm from "../components/schedule/ScheduleForm";
import CalendarPage from "./Calendar";
import SchedulePage from "./Schedule";
import { base44 } from "@/api/base44Client";
import { getMyRecords } from "@/lib/resolveMyWedding";
import { useCollaboratorContext } from "@/lib/collaboratorContext";
import toast from "react-hot-toast";

const Schedule = base44.entities.Schedule;
const PJS = "'Plus Jakarta Sans', sans-serif";

const statLabelStyle = {
  fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
  color: "rgba(10,10,10,0.6)", fontFamily: PJS, margin: 0, marginBottom: 10,
};
const statValueStyle = {
  fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 700, color: "#0A0A0A",
  fontFamily: PJS, lineHeight: 1, margin: 0,
};

function CountUp({ to, duration = 1200 }) {
  const [value, setValue] = useState(0);
  const startRef = React.useRef(null);
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

const TABS = [
  { key: "calendar",       label: "Calendar" },
  { key: "visual",         label: "Visual builder" },
  { key: "list",           label: "Run sheet" },
  { key: "considerations", label: "Considerations" },
];

export default function ScheduleHub() {
  const location = useLocation();
  const navigate  = useNavigate();

  // ── Shared schedule data (for stat strip, Export CSV, Add event) ──────────
  const [scheduleItems, setScheduleItems] = useState([]);
  const [loadingStats, setLoadingStats]   = useState(true);
  const [refreshKey, setRefreshKey]       = useState(0);

  // ── Add / Edit form ───────────────────────────────────────────────────────
  const [showForm,    setShowForm]    = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // ── Ava modal ─────────────────────────────────────────────────────────────
  const [avaOpen, setAvaOpen] = useState(false);

  // ── Active tab state ──────────────────────────────────────────────────────
  const [runsheetView, setRunsheetView] = useState("calendar");
  const isCalendar = location.pathname === "/Calendar";
  const activeTab  = isCalendar ? "calendar" : runsheetView;

  const collab = useCollaboratorContext();
  const isCollaborating = !!collab.ownerUserId;
  // Read-only regardless of the 'edit' permission bit — Schedule's
  // update/delete RLS is owner-scoped like every other entity here, so the
  // admin key 403s on a write regardless of what was granted (same
  // reasoning as Guests/Budget; see BASE44_PLATFORM_NOTES.md).
  const readOnly = isCollaborating;

  // ── Load schedule items ───────────────────────────────────────────────────
  useEffect(() => { loadItems(); }, [isCollaborating]);

  const loadItems = async () => {
    setLoadingStats(true);
    try {
      if (isCollaborating) {
        const res = await fetch(`/api/collaborator-data?ownerUserId=${encodeURIComponent(collab.ownerUserId)}&page=Schedule`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('base44_access_token')}` },
        });
        if (!res.ok) throw new Error('Failed to load schedule');
        const { data } = await res.json();
        setScheduleItems((data.Schedule || []).slice().sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')));
      } else {
        const data = await getMyRecords('Schedule', "start_time");
        setScheduleItems(data);
      }
    } catch {
      toast.error("Failed to load schedule");
    }
    setLoadingStats(false);
  };

  // ── Stats (mirrors Schedule.jsx STAT_CARDS) ───────────────────────────────
  const stats = React.useMemo(() => {
    const total     = scheduleItems.length;
    const ceremony  = scheduleItems.filter(i => i.category === "ceremony").length;
    const reception = scheduleItems.filter(i => i.category === "reception").length;
    const other     = total - ceremony - reception;
    return { total, ceremony, reception, other };
  }, [scheduleItems]);

  const STAT_CARDS = [
    { label: "Total events",   value: stats.total },
    { label: "Ceremony",       value: stats.ceremony },
    { label: "Reception",      value: stats.reception },
    { label: "Other events",   value: stats.other },
  ];

  // ── Export CSV ────────────────────────────────────────────────────────────
  const exportSchedule = () => {
    const csvContent = [
      ["Event Name","Date","Start Time","End Time","Location","Category","Responsible Person","Description","Notes"].join(","),
      ...scheduleItems.map(item =>
        [item.event_name, item.event_date || "", item.start_time, item.end_time || "",
         item.location || "", item.category || "", item.responsible_person || "",
         item.description || "", item.notes || ""]
        .map(f => `"${f}"`).join(",")
      ),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "wedding-schedule.csv"; link.click();
    URL.revokeObjectURL(url);
    toast.success("Schedule exported");
  };

  // ── Add / Edit handlers ───────────────────────────────────────────────────
  const handleAddEvent  = () => { setEditingItem(null); setShowForm(true); };

  const handleFormSubmit = async (itemData) => {
    const tid = toast.loading(editingItem?.id ? "Updating…" : "Adding event…");
    try {
      if (editingItem?.id) {
        await Schedule.update(editingItem.id, itemData);
        toast.success("Event updated", { id: tid });
      } else {
        await Schedule.create(itemData);
        toast.success("Event added", { id: tid });
      }
      setShowForm(false);
      setEditingItem(null);
      await loadItems();                     // refresh hub stat strip
      setRefreshKey(k => k + 1);            // signal Schedule.jsx to reload its views
    } catch {
      toast.error("Failed to save event", { id: tid });
    }
  };

  // ── Tab navigation ────────────────────────────────────────────────────────
  const handleTab = (key) => {
    if (key === "calendar") {
      navigate("/Calendar");
    } else {
      setRunsheetView(key);
      if (isCalendar) navigate("/Schedule");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>

      {/* 1 ── Page header */}
      <DashboardPageHeader
        title="Schedule"
        subtitle="Calendar and run sheet for your wedding"
      />

      {/* 2 ── Stat strip — identical wrapper to Budget */}
      <div className="flex flex-wrap w-full" style={{ borderBottom: "1px solid rgba(10,10,10,0.08)" }}>
        {STAT_CARDS.map((s, i) => (
          <div
            key={s.label}
            className="grow shrink basis-1/2 min-w-0 lg:flex-1"
            style={{ padding: "24px 32px", minHeight: 80, borderRadius: 0, boxShadow: "none", borderRight: i < STAT_CARDS.length - 1 ? "1px solid rgba(10,10,10,0.08)" : "none" }}
          >
            <p style={statLabelStyle}>{s.label}</p>
            {loadingStats
              ? <div style={{ width: 60, height: 32, background: "rgba(10,10,10,0.06)" }} />
              : <p style={statValueStyle}><CountUp to={s.value} /></p>
            }
          </div>
        ))}
      </div>

      {/* 3 ── Action bar — identical wrapper to Budget */}
      <div
        className="flex flex-wrap items-center justify-between gap-y-2 px-4 md:px-8 py-4"
        style={{ borderBottom: "1px solid rgba(10,10,10,0.08)" }}
      >
        {/* Left: Ava button + Guest Suite notice */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <AvaButton label="Ask Ava to build your wedding timeline" onClick={() => setAvaOpen(true)} />
          <span style={{ fontSize: 12, color: "rgba(10,10,10,0.45)", fontFamily: PJS }}>
            ✨ Visible to guests in your Guest Suite
          </span>
        </div>

        {/* Right: Export + Add */}
        <div className="flex flex-wrap items-center gap-[10px]">
          <button
            onClick={exportSchedule}
            disabled={scheduleItems.length === 0}
            className="btn-editorial-secondary"
            style={{ opacity: scheduleItems.length === 0 ? 0.4 : 1 }}
          >
            Export CSV
          </button>
          {!readOnly && (
            <button onClick={handleAddEvent} className="btn-primary">
              + Add event
            </button>
          )}
        </div>
      </div>

      {/* 4 ── Tab bar */}
      <div style={{ borderBottom: "1px solid rgba(10,10,10,0.08)", padding: "0 32px", display: "flex" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => handleTab(t.key)}
            style={{
              padding: "13px 0", marginRight: 28, fontSize: 13, fontWeight: 600,
              fontFamily: PJS, background: "none", border: "none", cursor: "pointer",
              color: activeTab === t.key ? "#E03553" : "#444444",
              borderBottom: activeTab === t.key ? "2px solid #E03553" : "2px solid transparent",
              transition: "color 0.12s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 5 ── Tab content */}
      {activeTab === "calendar" && <CalendarPage embedded />}
      {activeTab !== "calendar" && (
        <SchedulePage
          embedded
          hideChrome
          activeView={activeTab}
          refreshKey={refreshKey}
        />
      )}

      {/* Add / Edit form modal */}
      {!readOnly && showForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", background: "#FFFFFF", position: "relative" }}>
            <ScheduleForm
              item={editingItem}
              onSubmit={handleFormSubmit}
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
