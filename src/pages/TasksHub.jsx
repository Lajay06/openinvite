import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardPageHeader from "@/components/layout/DashboardPageHeader";
import TodoList from "./TodoList";
import ChecklistPage from "./Checklist";

const PJS = "'Plus Jakarta Sans', sans-serif";

const TABS = [
  { key: "todo",      label: "To do",     path: "/TodoList" },
  { key: "checklist", label: "Checklist", path: "/Checklist" },
];

export default function TasksHub() {
  const location = useLocation();
  const navigate  = useNavigate();

  // /Checklist → checklist tab; everything else (/TodoList) → to do tab
  const activeTab = location.pathname === "/Checklist" ? "checklist" : "todo";

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      <DashboardPageHeader
        title="To do"
        subtitle="Tasks, to-dos and wedding checklist"
      />

      {/* Outer tab bar */}
      <div style={{
        borderBottom: "1px solid rgba(10,10,10,0.08)",
        padding: "0 32px",
        display: "flex",
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => navigate(t.path)}
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

      {/* Tab panels — existing components rendered 100% unchanged */}
      {activeTab === "todo"      && <TodoList embedded />}
      {activeTab === "checklist" && <ChecklistPage embedded />}
    </div>
  );
}
