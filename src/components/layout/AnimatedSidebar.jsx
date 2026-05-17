import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, Calendar, CheckSquare, ListTodo,
  Users, UserCheck, LayoutGrid, MessageCircle,
  Wallet, Gift, Package,
  Palette, Music2, Image, FileText,
  Store,
  Clock, Heart, Radio,
  Plane, Hotel, Car, Phone,
  Settings, UserPlus, LogOut, HelpCircle,
  Sparkles,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "Planning",
    items: [
      { icon: LayoutDashboard, label: "Overall",     url: createPageUrl("Dashboard") },
      { icon: Calendar,        label: "Calendar",    url: createPageUrl("Calendar") },
      { icon: CheckSquare,     label: "Checklist",   url: createPageUrl("Checklist") },
      { icon: ListTodo,        label: "To do list",  url: createPageUrl("Notes") },
    ],
  },
  {
    label: "Guests",
    items: [
      { icon: Users,         label: "Guest list",    url: createPageUrl("Guests") },
      { icon: UserCheck,     label: "Wedding party", url: "/wedding-party" },
      { icon: LayoutGrid,    label: "Seating",       url: createPageUrl("Seating") },
      { icon: MessageCircle, label: "Messages",      url: createPageUrl("Messages") },
    ],
  },
  {
    label: "Finances",
    items: [
      { icon: Wallet, label: "Budget",   url: createPageUrl("Budget") },
      { icon: Gift,   label: "Registry", url: createPageUrl("Registry") },
    ],
  },
  {
    label: "Creative",
    items: [
      { icon: Palette,  label: "Styling",          url: createPageUrl("Styling") },
      { icon: Music2,   label: "Music",             url: createPageUrl("Music") },
      { icon: Image,    label: "Moodboard",         url: createPageUrl("Moodboard") },
      { icon: FileText, label: "Vows & speeches",   url: createPageUrl("VowsSpeeches") },
      { icon: Package,  label: "Wedding favours",   url: "/wedding-favours" },
    ],
  },
  {
    label: "Vendors",
    items: [
      { icon: Store, label: "Vendors", url: createPageUrl("Vendors") },
    ],
  },
  {
    label: "Day of",
    items: [
      { icon: Clock,  label: "Schedule",          url: createPageUrl("Schedule") },
      { icon: Heart,  label: "Ceremony details",  url: "/ceremony-details" },
      { icon: Radio,  label: "Live stream",       url: createPageUrl("LiveStreaming") },
    ],
  },
  {
    label: "Extras",
    items: [
      { icon: Plane, label: "Honeymoon",         url: "/honeymoon" },
      { icon: Hotel, label: "Accommodation",     url: "/accommodation" },
      { icon: Car,   label: "Transport",         url: "/transport" },
      { icon: Phone, label: "Emergency contact", url: "/emergency-contact" },
    ],
  },
];

const BOTTOM_ACTIONS = [
  { icon: Settings, label: "Account settings", key: "account" },
  { icon: UserPlus, label: "Collaborate",       key: "collaborate" },
];

// ── Shared style helpers ──────────────────────────────────────────────────────

const sectionLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: "rgba(10,10,10,0.4)",
  letterSpacing: "0.08em",
  padding: "0 16px",
  marginTop: 24,
  marginBottom: 2,
  display: "block",
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

function NavItem({ icon: Icon, label, url, onClick, isActive }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        cursor: "pointer",
        borderLeft: isActive ? "2px solid #E03553" : "2px solid transparent",
        background: isActive ? "rgba(224,53,83,0.08)" : "transparent",
        transition: "background 0.15s ease",
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(10,10,10,0.04)"; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
    >
      <Icon
        size={18}
        strokeWidth={1.8}
        style={{ color: isActive ? "#E03553" : "rgba(10,10,10,0.45)", flexShrink: 0 }}
      />
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: isActive ? "#E03553" : "#0A0A0A",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Desktop sidebar ───────────────────────────────────────────────────────────

export function AnimatedSidebar({ weddingName, onAccountSettings, onCollaborate, onOpenTips }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (url) => {
    const path = url.split("?")[0];
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const handleBottom = (key) => {
    if (key === "account")    onAccountSettings?.();
    if (key === "collaborate") onCollaborate?.();
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 48,
        bottom: 0,
        width: 200,
        zIndex: 40,
        background: "#FFFFFF",
        borderRight: "1px solid rgba(10,10,10,0.08)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div style={{ padding: 24, flexShrink: 0, cursor: "pointer" }} onClick={() => navigate(createPageUrl("Dashboard"))}>
        <img
          src="https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png"
          alt="Openinvite"
          style={{ height: 20, width: "auto", objectFit: "contain", objectPosition: "left", display: "block" }}
        />
      </div>

      {/* Scrollable nav */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 8 }}>

        {/* Studio section — pill button + Event details */}
        <div style={{ padding: "0 12px", marginTop: 4 }}>
          <span style={sectionLabelStyle}>Studio</span>
          <button
            onClick={() => navigate("/studio")}
            style={{
              width: "100%",
              background: "#E03553",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 999,
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginTop: 6,
              transition: "transform 0.2s ease, background 0.2s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.background = "#c42d47"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.background = "#E03553"; }}
          >
            <Sparkles size={14} strokeWidth={2} />
            Design studio
          </button>
        </div>
        <NavItem
          icon={FileText}
          label="Event details"
          url="/event-details"
          isActive={isActive("/event-details")}
          onClick={() => navigate("/event-details")}
        />

        {/* Nav sections */}
        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            <span style={sectionLabelStyle}>{section.label}</span>
            {section.items.map((item, ii) => (
              <NavItem
                key={ii}
                icon={item.icon}
                label={item.label}
                url={item.url}
                isActive={isActive(item.url)}
                onClick={() => navigate(item.url.split("?")[0])}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Bottom static actions */}
      <div style={{ borderTop: "1px solid rgba(10,10,10,0.08)", paddingTop: 4, paddingBottom: 4, flexShrink: 0 }}>

        {BOTTOM_ACTIONS.map(({ icon: Icon, label, key }) => (
          <div
            key={key}
            onClick={() => handleBottom(key)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 16px", cursor: "pointer",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(10,10,10,0.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <Icon size={18} strokeWidth={1.8} style={{ color: "rgba(10,10,10,0.45)", flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {label}
            </span>
          </div>
        ))}

        {/* Quick tips */}
        {onOpenTips && (
          <div
            onClick={onOpenTips}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 16px", cursor: "pointer",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(10,10,10,0.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <HelpCircle size={18} strokeWidth={1.8} style={{ color: "rgba(10,10,10,0.45)", flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Quick tips
            </span>
          </div>
        )}

        {/* Help Centre */}
        <div
          onClick={() => navigate("/help")}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 16px", cursor: "pointer",
            borderLeft: isActive("/help") ? "2px solid #E03553" : "2px solid transparent",
            background: isActive("/help") ? "rgba(224,53,83,0.08)" : "transparent",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={e => { if (!isActive("/help")) e.currentTarget.style.background = "rgba(10,10,10,0.04)"; }}
          onMouseLeave={e => { if (!isActive("/help")) e.currentTarget.style.background = "transparent"; }}
        >
          <HelpCircle size={18} strokeWidth={1.8} style={{ color: isActive("/help") ? "#E03553" : "rgba(10,10,10,0.45)", flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: isActive("/help") ? "#E03553" : "#0A0A0A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Help centre
          </span>
        </div>

        {/* Leave Dashboard */}
        <div
          onClick={() => { window.location.href = createPageUrl("Home"); }}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 16px", cursor: "pointer",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(224,53,83,0.04)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          <LogOut size={18} strokeWidth={1.8} style={{ color: "#E03553", flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#E03553", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Leave dashboard
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Mobile sidebar content (used inside Sheet) ────────────────────────────────

export function MobileSidebarContent({ weddingName, onClose, onAccountSettings, onCollaborate }) {
  const navigate = useNavigate();
  const location = useLocation();

  const storedUser = (() => { try { return JSON.parse(localStorage.getItem('oi_user') || '{}'); } catch { return {}; } })();
  const initials = (storedUser.full_name || storedUser.email || 'U')
    .split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U';

  const mobileLogout = () => {
    ['oi_auth', 'oi_user', 'base44_access_token', 'token', 'oi_couple_name', 'oi_wedding_date']
      .forEach(k => localStorage.removeItem(k));
    window.location.href = '/login';
  };

  const isActive = (url) => {
    const path = url.split("?")[0];
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const handleNav = (url) => {
    navigate(url.split("?")[0]);
    onClose?.();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#FFFFFF" }}>
      {/* Logo */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(10,10,10,0.08)", flexShrink: 0 }}>
        <img
          src="https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png"
          alt="Openinvite"
          style={{ height: 20, width: "auto", objectFit: "contain", objectPosition: "left", display: "block" }}
        />
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>

        {/* Studio button */}
        <div style={{ padding: "12px 12px 0" }}>
          <span style={sectionLabelStyle}>Studio</span>
          <button
            onClick={() => handleNav("/studio")}
            style={{
              width: "100%", background: "#E03553", color: "#FFFFFF", border: "none",
              borderRadius: 999, padding: "10px 16px", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6,
            }}
          >
            <Sparkles size={14} strokeWidth={2} />
            Design studio
          </button>
        </div>
        {/* Event details link */}
        {(() => {
          const active = isActive("/event-details");
          return (
            <div
              onClick={() => handleNav("/event-details")}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 16px", cursor: "pointer",
                borderLeft: active ? "2px solid #E03553" : "2px solid transparent",
                background: active ? "rgba(224,53,83,0.08)" : "transparent",
                transition: "background 0.15s ease",
              }}
            >
              <FileText size={18} strokeWidth={1.8} style={{ color: active ? "#E03553" : "rgba(10,10,10,0.45)", flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: active ? "#E03553" : "#0A0A0A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Event details
              </span>
            </div>
          );
        })()}

        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            <span style={sectionLabelStyle}>{section.label}</span>
            {section.items.map((item, ii) => {
              const active = isActive(item.url);
              return (
                <div
                  key={ii}
                  onClick={() => handleNav(item.url)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 16px", cursor: "pointer",
                    borderLeft: active ? "2px solid #E03553" : "2px solid transparent",
                    background: active ? "rgba(224,53,83,0.08)" : "transparent",
                    transition: "background 0.15s ease",
                  }}
                >
                  <item.icon size={18} strokeWidth={1.8} style={{ color: active ? "#E03553" : "rgba(10,10,10,0.45)", flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: active ? "#E03553" : "#0A0A0A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* User + account section */}
      <div style={{ borderTop: "1px solid rgba(10,10,10,0.08)", flexShrink: 0 }}>
        {/* Avatar + name/email */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 10px" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "linear-gradient(135deg, #ec4899, #9333ea)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#0A0A0A", margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {storedUser.full_name || "Your account"}
            </p>
            {storedUser.email && (
              <p style={{ fontSize: 11, color: "rgba(10,10,10,0.4)", margin: "1px 0 0", fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {storedUser.email}
              </p>
            )}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(10,10,10,0.08)", margin: "0 16px" }} />
        {/* Account settings + Collaborate */}
        {[
          { icon: Settings, label: "Account settings", action: () => { onClose?.(); navigate("/AccountSettings"); } },
          { icon: UserPlus, label: "Collaborate",       action: () => { onClose?.(); navigate("/Collaborate"); } },
        ].map((item, i) => (
          <div
            key={i}
            onClick={item.action}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", cursor: "pointer", transition: "background 0.15s ease" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(10,10,10,0.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <item.icon size={16} strokeWidth={1.8} style={{ color: "rgba(10,10,10,0.45)", flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {item.label}
            </span>
          </div>
        ))}
        <div style={{ height: 1, background: "rgba(10,10,10,0.08)", margin: "2px 16px" }} />
        {/* Log out */}
        <div
          onClick={mobileLogout}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px 14px", cursor: "pointer", transition: "background 0.15s ease" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(224,53,83,0.04)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          <LogOut size={16} strokeWidth={1.8} style={{ color: "#E03553", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#E03553", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Log out
          </span>
        </div>
      </div>
    </div>
  );
}
