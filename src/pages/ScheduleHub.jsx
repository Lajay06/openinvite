import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader";
import CalendarPage from "./Calendar";
import SchedulePage from "./Schedule";

const PJS = "'Plus Jakarta Sans', sans-serif";

// Five flat tabs — Calendar first, then the four run-sheet views
const TABS = [
  { key: "calendar",       label: "Calendar" },
  { key: "visual",         label: "Visual builder" },
  { key: "timeline",       label: "Timeline view" },
  { key: "list",           label: "List view" },
  { key: "considerations", label: "Considerations" },
];

export default function ScheduleHub() {
  const location = useLocation();
  const navigate  = useNavigate();

  // Remembers which run-sheet view was last active when the user switches
  // back from Calendar, so they return to where they were
  const [runsheetView, setRunsheetView] = useState("visual");

  // /Calendar → calendar tab; everything else (/Schedule) → the last run-sheet view
  const isCalendar = location.pathname === "/Calendar";
  const activeTab  = isCalendar ? "calendar" : runsheetView;

  const handleTab = (key) => {
    if (key === "calendar") {
      navigate("/Calendar");
    } else {
      setRunsheetView(key);
      if (isCalendar) navigate("/Schedule"); // leave /Calendar URL when entering run-sheet side
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      <DashboardPageHeader
        title="Schedule"
        subtitle="Calendar and run sheet for your wedding"
      />

      {/* Single flat tab row */}
      <div style={{
        borderBottom: "1px solid rgba(10,10,10,0.08)",
        padding: "0 32px",
        display: "flex",
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => handleTab(t.key)}
            style={{
              padding: "13px 0",
              marginRight: 28,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: PJS,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: activeTab === t.key ? "#E03553" : "#444444",
              borderBottom: activeTab === t.key
                ? "2px solid #E03553"
                : "2px solid transparent",
              transition: "color 0.12s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Calendar tab — full CalendarPage, no stat cards / run-sheet chrome */}
      {activeTab === "calendar" && <CalendarPage embedded />}

      {/* Run-sheet tabs — SchedulePage with its stat cards, Ava bar, Export, Add event;
          inner TabsList suppressed via activeView; this component owns the view selection */}
      {activeTab !== "calendar" && <SchedulePage embedded activeView={activeTab} />}
    </div>
  );
}
