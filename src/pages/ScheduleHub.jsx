/**
 * ScheduleHub — canonical layout: header → stat cards → action bar → tabs → content
 * Matches the Budget page structure exactly.
 */
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader";
import AvaButton from "@/components/shared/AvaButton";
import AvaModal from "@/components/layout/AvaModal";
import ScheduleForm from "../components/schedule/ScheduleForm";
import CalendarPage from "./Calendar";
import SchedulePage from "./Schedule";
import { base44 } from "@/api/base44Client";
import { getMyRecords } from "@/lib/resolveMyWedding";
import { useCollaboratorContext } from "@/lib/collaboratorContext";
import { buildIcsCalendar, downloadIcs } from "@/lib/ics";
import toast from "react-hot-toast";
import CountUp from "@/components/shared/CountUp";

import { sortScheduleItems } from '@/lib/scheduleOrder';
import { buildScheduleEvents } from '@/lib/scheduleEvents';
import ScheduleDayList from '../components/schedule/ScheduleDayList';
import { getMyInvitation } from '@/lib/resolveMyWedding';
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


/**
 * THE PAGE OPENS AS A LIST.
 *
 * Owner ruling: "Get rid of the visual builder and have the calendar as a list
 * of events with an option to view it as calendar view. It is too much."
 *
 * It was four tabs — Calendar, Visual builder, Run sheet, Considerations —
 * and three of them were the same events drawn three ways, defaulting to the
 * one with the most machinery in it. The couple's first question is "what is
 * happening and when", and a drag-and-drop hour grid answers it last.
 *
 * List is first and is the default. Calendar is the one toggle. Considerations
 * stays because it is not a view of the events at all — it is the page's own
 * notes, and every planner page has one; removing it was not asked for.
 *
 * "visual" IS GONE FROM THIS LIST AND THE COMPONENT IS STILL IN THE REPO.
 * WeddingDayTimelineBuilder.jsx is unreachable from the UI, not deleted —
 * the owner asked to see the screenshots before anything is removed. The file
 * list to delete on that word is in the PR body.
 */
const TABS = [
  { key: "list",           label: "List" },
  { key: "calendar",       label: "Calendar" },
  { key: "considerations", label: "Considerations" },
];

export default function ScheduleHub() {
  const location = useLocation();
  const navigate  = useNavigate();

  // ── Shared schedule data (for stat strip, Export CSV, Add event) ──────────
  const [scheduleItems, setScheduleItems] = useState([]);
  // The list and the calendar read ONE set of events, so "the list shows every
  // event the calendar shows" is a property rather than a coincidence. The
  // calendar aggregated five sources and the run sheet read one; they could
  // never have agreed. See src/lib/scheduleEvents.js.
  const [vendors, setVendors]         = useState([]);
  const [invitation, setInvitation]   = useState(null);
  const [loadingStats, setLoadingStats]   = useState(true);
  const [refreshKey, setRefreshKey]       = useState(0);

  // ── Add / Edit form ───────────────────────────────────────────────────────
  const [showForm,    setShowForm]    = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // ── Ava modal ─────────────────────────────────────────────────────────────
  const [avaOpen, setAvaOpen] = useState(false);

  // ── Active tab state ──────────────────────────────────────────────────────
  const [runsheetView, setRunsheetView] = useState("list");
  const isCalendar = location.pathname === "/Calendar";
  const activeTab  = isCalendar ? "calendar" : runsheetView;

  const collab = useCollaboratorContext();
  const isCollaborating = !!collab.ownerUserId;
  // Read-only regardless of the 'edit' permission bit — Schedule's
  // update/delete RLS is owner-scoped like every other entity here, so the
  // admin key 403s on a write regardless of what was granted (same
  // reasoning as Guests/Budget; see BASE44_PLATFORM_NOTES.md).
  const readOnly = isCollaborating;

  // Arriving from Recent activity with an event to land on: show the list,
  // which is now where events are read.
  //
  // THE HIGHLIGHT ITSELF IS LOST, and that is a real consequence of this
  // change rather than an oversight. The scroll-to-and-flash lived in
  // ScheduleList.jsx, the old run sheet table, which nothing mounts any more.
  // The deep link still lands on the list with the event on it — one screen,
  // in day order — so it is a dimmer version of the same answer, not a broken
  // one. Restoring it means teaching ScheduleDayList the same scrollToItemId /
  // highlightedItemId pair; not done here because the ruling was about
  // removing surface, and this is the one thing it costs.
  useEffect(() => {
    if (location.state?.highlightId) setRunsheetView('list');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.highlightId]);

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
        setScheduleItems(sortScheduleItems(data.Schedule));
      } else {
        const [data, vendorRows, inv] = await Promise.all([
          getMyRecords('Schedule', "start_time"),
          getMyRecords('Vendor').catch(() => []),
          getMyInvitation().catch(() => null),
        ]);
        setScheduleItems(data);
        setVendors(vendorRows);
        setInvitation(inv);
      }
    } catch {
      toast.error("Failed to load schedule");
    }
    setLoadingStats(false);
  };

  // Vendor and Invitation are NOT part of the 'Schedule' collaborator
  // permission — Vendor has its own key — so a collaborator's list carries the
  // schedule rows only, exactly as the calendar already restricted itself.
  // Same reasoning, one place now: Calendar.jsx:49.
  const events = React.useMemo(
    () => buildScheduleEvents({ scheduleItems, vendors, invitation }),
    [scheduleItems, vendors, invitation],
  );

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

  // ── Add to calendar (.ics) — full schedule ────────────────────────────────
  const exportScheduleIcs = () => {
    const ics = buildIcsCalendar(scheduleItems, "Wedding schedule");
    downloadIcs("wedding-schedule.ics", ics);
    toast.success("Calendar file downloaded");
  };

  // ── Add / Edit handlers ───────────────────────────────────────────────────
  const handleAddEvent  = () => { setEditingItem(null); setShowForm(true); };
  const handleEditEvent = (item) => { setEditingItem(item); setShowForm(true); };

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
      <div className="flex flex-wrap w-full" style={{ borderBottom: "1px solid rgba(10,10,10,0.12)" }}>
        {STAT_CARDS.map((s, i) => (
          <div
            key={s.label}
            className="grow shrink basis-1/2 min-w-0 lg:flex-1"
            style={{ padding: "24px 32px", minHeight: 80, borderRadius: 0, boxShadow: "none", borderRight: i < STAT_CARDS.length - 1 ? "1px solid rgba(10,10,10,0.12)" : "none" }}
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
        style={{ borderBottom: "1px solid rgba(10,10,10,0.12)" }}
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
          <button
            onClick={exportScheduleIcs}
            disabled={scheduleItems.length === 0}
            className="btn-editorial-secondary"
            style={{ opacity: scheduleItems.length === 0 ? 0.4 : 1 }}
          >
            Add to calendar (.ics)
          </button>
          {!readOnly && (
            <button onClick={handleAddEvent} className="btn-primary">
              + Add event
            </button>
          )}
        </div>
      </div>

      {/* 4 ── Tab bar */}
      <div style={{ borderBottom: "1px solid rgba(10,10,10,0.12)", padding: "0 32px", display: "flex" }}>
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
      {activeTab === "list" && (
        <div style={{ padding: "32px 32px 48px" }}>
          <ScheduleDayList
            events={events}
            onEdit={readOnly ? undefined : (e) => {
              const item = scheduleItems.find(i => i.id === e.sourceId);
              if (item) handleEditEvent(item);
            }}
          />
        </div>
      )}
      {activeTab === "calendar" && <CalendarPage embedded hideChrome />}
      {activeTab === "considerations" && (
        <SchedulePage embedded hideChrome activeView="considerations" refreshKey={refreshKey} />
      )}

      {/* Add / Edit form modal */}
      <Dialog open={!readOnly && showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingItem(null); } }}>
        <DialogContent hideClose title={editingItem ? 'Edit event' : 'Add event'} className="max-w-[600px] max-h-[90vh] overflow-y-auto p-0 gap-0">
          <ScheduleForm
            item={editingItem}
            onSubmit={handleFormSubmit}
            onCancel={() => { setShowForm(false); setEditingItem(null); }}
          />
        </DialogContent>
      </Dialog>

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
