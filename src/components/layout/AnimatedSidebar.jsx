import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard, Calendar, CheckSquare, ListTodo,
  Users, UserCheck, LayoutGrid, MessageCircle,
  Wallet, Gift, Package,
  Palette, Music2, Image, FileText, Camera,
  Store, ShoppingBag,
  Clock, Heart, Radio, UtensilsCrossed,
  Plane, Hotel, Car, Phone, Globe,
  Settings, UserPlus, LogOut, HelpCircle, Lightbulb, CreditCard,
  Sparkles,
  BarChart2,
} from "lucide-react";

const PJS = "'Plus Jakarta Sans', sans-serif";

const NAV_SECTIONS = [
  {
    label: "Planning",
    items: [
      { icon: Sparkles,        label: "Daily update", url: createPageUrl("DailyUpdate") },
      { icon: LayoutDashboard, label: "Overall",      url: createPageUrl("Dashboard") },
      { icon: Calendar,        label: "Calendar",     url: createPageUrl("Calendar") },
      { icon: CheckSquare,     label: "Checklist",    url: createPageUrl("Checklist") },
      { icon: ListTodo,        label: "To do list",   url: createPageUrl("TodoList") },
    ],
  },
  {
    label: "Guests",
    items: [
      { icon: Users,         label: "Guest list",    url: createPageUrl("Guests") },
      { icon: UserCheck,     label: "Wedding party", url: "/wedding-party" },
      { icon: LayoutGrid,    label: "Seating",       url: createPageUrl("Seating") },
      { icon: MessageCircle, label: "Messages",      url: createPageUrl("Messages") },
      { icon: BarChart2,     label: "Guest polls",   url: createPageUrl("Polls") },
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
      { icon: Palette,         label: "Styling",         url: createPageUrl("Styling") },
      { icon: Camera,          label: "Photography",      url: createPageUrl("Photography") },
      { icon: Sparkles,        label: "Beauty",           url: createPageUrl("Beauty") },
      { icon: Music2,          label: "Music",            url: createPageUrl("Music") },
      { icon: Image,           label: "Moodboard",        url: createPageUrl("Moodboard") },
      { icon: FileText,        label: "Vows & speeches",  url: createPageUrl("VowsSpeeches") },
      { icon: Package,         label: "Wedding favours",  url: "/wedding-favours" },
      { icon: UtensilsCrossed, label: "Food & beverage",  url: createPageUrl("FoodBeverage") },
    ],
  },
  {
    label: "Vendors",
    items: [
      { icon: Store,       label: "My vendors",  url: createPageUrl("Vendors") },
      { icon: ShoppingBag, label: "Marketplace", url: createPageUrl("VendorMarketplace") },
    ],
  },
  {
    label: "Day of",
    items: [
      { icon: Clock,   label: "Schedule",          url: createPageUrl("Schedule") },
      { icon: Heart,   label: "Ceremony details",  url: "/ceremony-details" },
      { icon: Hotel,   label: "Accommodation",     url: "/accommodation" },
      { icon: Car,     label: "Transport",         url: "/transport" },
      { icon: Phone,   label: "Emergency contact", url: "/emergency-contact" },
    ],
  },
  {
    label: "Guest Suite",
    guestSuite: true,
    items: [
      { icon: Globe,      label: "Overview",              url: createPageUrl("GuestSuite") },
      { icon: Clock,      label: "Schedule preview",      url: createPageUrl("Schedule") },
      { icon: HelpCircle, label: "Q&A",                   url: createPageUrl("QandA") },
      { icon: Gift,       label: "Registry",              url: createPageUrl("Registry") },
      { icon: Hotel,      label: "Accommodation preview", url: "/accommodation" },
      { icon: Car,        label: "Transport preview",     url: "/transport" },
      { icon: Radio,      label: "Live stream",           url: createPageUrl("LiveStreaming") },
      { icon: BarChart2,  label: "Guest polls preview",   url: createPageUrl("Polls") },
    ],
  },
  {
    label: "Extras",
    items: [
      { icon: Plane,     label: "Honeymoon",      url: "/honeymoon" },
      { icon: Lightbulb, label: "Considerations", url: createPageUrl("Considerations") },
    ],
  },
];

// ── Shared style helpers ──────────────────────────────────────────────────────

const sectionLabelStyle = {
  fontSize: 10,
  fontWeight: 700,
  color: "rgba(10,10,10,0.4)",
  letterSpacing: "0.06em",
  padding: "0 16px",
  marginTop: 24,
  marginBottom: 2,
  display: "block",
  fontFamily: PJS,
};

function SectionLabel({ section }) {
  if (section.guestSuite) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 16px", marginTop: 24, marginBottom: 2 }}>
        <Globe size={10} style={{ color: "rgba(10,10,10,0.4)", flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(10,10,10,0.4)", letterSpacing: "0.06em", fontFamily: PJS }}>
          {section.label}
        </span>
        <span style={{
          fontSize: 8, fontWeight: 800, letterSpacing: "0.06em",
          background: "linear-gradient(135deg, #FBBF24, #F59E0B)",
          color: "#FFFFFF", padding: "1px 4px", borderRadius: 3, flexShrink: 0,
          fontFamily: PJS,
        }}>
          ULTRA
        </span>
      </div>
    );
  }
  return <span style={sectionLabelStyle}>{section.label}</span>;
}

function NavItem({ icon: Icon, label, url, onClick, isActive, showBadge, disabled, disabledTooltip }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      title={disabled ? disabledTooltip : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 12px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        borderLeft: isActive ? "2px solid #E03553" : "2px solid transparent",
        background: isActive ? "rgba(224,53,83,0.08)" : "transparent",
        transition: "background 0.15s ease",
      }}
      onMouseEnter={e => { if (!isActive && !disabled) e.currentTarget.style.background = "rgba(10,10,10,0.04)"; }}
      onMouseLeave={e => { if (!isActive && !disabled) e.currentTarget.style.background = "transparent"; }}
    >
      <Icon
        size={14}
        strokeWidth={1.8}
        style={{ color: isActive ? "#E03553" : "rgba(10,10,10,0.45)", flexShrink: 0 }}
      />
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: isActive ? "#E03553" : "#0A0A0A",
          flex: 1,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          fontFamily: PJS,
        }}
      >
        {label}
      </span>
      {showBadge && (
        <span style={{
          fontSize: 8, fontWeight: 800, letterSpacing: "0.06em",
          background: "linear-gradient(135deg, #FBBF24, #F59E0B)",
          color: "#FFFFFF", padding: "2px 5px", borderRadius: 3, flexShrink: 0,
          fontFamily: PJS,
        }}>
          ULTRA
        </span>
      )}
    </div>
  );
}

// ── Desktop sidebar ───────────────────────────────────────────────────────────

export function AnimatedSidebar({ weddingName, onOpenTips, topOffset = 48 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const _plan = user?.plan || 'free';
  const canAccessUltra = _plan === 'ultra' || _plan === 'free';
  const isProPlan = _plan === 'pro';

  const isActive = (url) => {
    const path = url.split("?")[0];
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: topOffset,
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
      {/* Scrollable nav */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 8 }}>

        <NavItem
          icon={Sparkles}
          label="Design studio"
          url="/studio"
          isActive={isActive("/studio")}
          onClick={() => navigate("/studio")}
        />
        <NavItem
          icon={FileText}
          label="Event details"
          url="/event-details"
          isActive={isActive("/event-details")}
          onClick={() => navigate("/event-details")}
        />

        {/* Nav sections */}
        {NAV_SECTIONS.map((section, si) => {
          const guestSuiteDisabled = section.guestSuite && isProPlan;
          return (
            <div key={si}>
              <SectionLabel section={section} />
              {section.items.map((item, ii) => (
                <NavItem
                  key={ii}
                  icon={item.icon}
                  label={item.label}
                  url={item.url}
                  isActive={!guestSuiteDisabled && isActive(item.url)}
                  onClick={() => navigate(item.url.split("?")[0])}
                  showBadge={item.ultraBadge && !canAccessUltra}
                  disabled={guestSuiteDisabled}
                  disabledTooltip="Upgrade to Ultra to unlock your wedding website"
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Bottom static actions */}
      <div style={{ borderTop: "1px solid rgba(10,10,10,0.08)", paddingTop: 4, paddingBottom: 4, flexShrink: 0 }}>

        {/* Quick tips */}
        {onOpenTips && (
          <div
            onClick={onOpenTips}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 12px", cursor: "pointer",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(10,10,10,0.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <HelpCircle size={14} strokeWidth={1.8} style={{ color: "rgba(10,10,10,0.45)", flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#0A0A0A", fontFamily: PJS }}>
              Quick tips
            </span>
          </div>
        )}

        {/* Account & billing */}
        <div
          onClick={() => navigate("/account")}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 12px", cursor: "pointer",
            borderLeft: isActive("/account") ? "2px solid #E03553" : "2px solid transparent",
            background: isActive("/account") ? "rgba(224,53,83,0.08)" : "transparent",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={e => { if (!isActive("/account")) e.currentTarget.style.background = "rgba(10,10,10,0.04)"; }}
          onMouseLeave={e => { if (!isActive("/account")) e.currentTarget.style.background = "transparent"; }}
        >
          <CreditCard size={14} strokeWidth={1.8} style={{ color: isActive("/account") ? "#E03553" : "rgba(10,10,10,0.45)", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: isActive("/account") ? "#E03553" : "#0A0A0A", fontFamily: PJS }}>
            Account & billing
          </span>
        </div>

        {/* Help Centre */}
        <div
          onClick={() => navigate("/help")}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 12px", cursor: "pointer",
            borderLeft: isActive("/help") ? "2px solid #E03553" : "2px solid transparent",
            background: isActive("/help") ? "rgba(224,53,83,0.08)" : "transparent",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={e => { if (!isActive("/help")) e.currentTarget.style.background = "rgba(10,10,10,0.04)"; }}
          onMouseLeave={e => { if (!isActive("/help")) e.currentTarget.style.background = "transparent"; }}
        >
          <HelpCircle size={14} strokeWidth={1.8} style={{ color: isActive("/help") ? "#E03553" : "rgba(10,10,10,0.45)", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: isActive("/help") ? "#E03553" : "#0A0A0A", fontFamily: PJS }}>
            Help centre
          </span>
        </div>

        {/* Leave Dashboard */}
        <div
          onClick={() => { window.location.href = createPageUrl("Home"); }}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 12px", cursor: "pointer",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(224,53,83,0.04)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          <LogOut size={14} strokeWidth={1.8} style={{ color: "#E03553", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#E03553", fontFamily: PJS }}>
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
  const { user } = useAuth();
  const _planM = user?.plan || 'free';
  const canAccessUltraMobile = _planM === 'ultra' || _planM === 'free';
  const isProPlanMobile = _planM === 'pro';

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

        {/* Design studio link */}
        {(() => {
          const active = isActive("/studio");
          return (
            <div
              onClick={() => handleNav("/studio")}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 16px", cursor: "pointer",
                borderLeft: active ? "2px solid #E03553" : "2px solid transparent",
                background: active ? "rgba(224,53,83,0.08)" : "transparent",
                transition: "background 0.15s ease",
              }}
            >
              <Sparkles size={18} strokeWidth={1.8} style={{ color: active ? "#E03553" : "rgba(10,10,10,0.45)", flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: active ? "#E03553" : "#0A0A0A", fontFamily: PJS }}>
                Design studio
              </span>
            </div>
          );
        })()}

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
              <span style={{ fontSize: 14, fontWeight: 600, color: active ? "#E03553" : "#0A0A0A", fontFamily: PJS }}>
                Event details
              </span>
            </div>
          );
        })()}

        {NAV_SECTIONS.map((section, si) => {
          const guestSuiteDisabled = section.guestSuite && isProPlanMobile;
          return (
            <div key={si}>
              {/* Section label */}
              {section.guestSuite ? (
                <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 16px", marginTop: 24, marginBottom: 2 }}>
                  <Globe size={10} style={{ color: "rgba(10,10,10,0.4)", flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(10,10,10,0.4)", letterSpacing: "0.06em", fontFamily: PJS }}>
                    {section.label}
                  </span>
                  <span style={{
                    fontSize: 8, fontWeight: 800, letterSpacing: "0.06em",
                    background: "linear-gradient(135deg, #FBBF24, #F59E0B)",
                    color: "#FFFFFF", padding: "1px 4px", borderRadius: 3, flexShrink: 0,
                    fontFamily: PJS,
                  }}>
                    ULTRA
                  </span>
                </div>
              ) : (
                <span style={sectionLabelStyle}>{section.label}</span>
              )}

              {section.items.map((item, ii) => {
                const active = !guestSuiteDisabled && isActive(item.url);
                return (
                  <div
                    key={ii}
                    onClick={guestSuiteDisabled ? undefined : () => handleNav(item.url)}
                    title={guestSuiteDisabled ? "Upgrade to Ultra to unlock your wedding website" : undefined}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 16px",
                      cursor: guestSuiteDisabled ? "not-allowed" : "pointer",
                      opacity: guestSuiteDisabled ? 0.4 : 1,
                      borderLeft: active ? "2px solid #E03553" : "2px solid transparent",
                      background: active ? "rgba(224,53,83,0.08)" : "transparent",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <item.icon size={18} strokeWidth={1.8} style={{ color: active ? "#E03553" : "rgba(10,10,10,0.45)", flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: active ? "#E03553" : "#0A0A0A", fontFamily: PJS, flex: 1 }}>
                      {item.label}
                    </span>
                    {item.ultraBadge && !canAccessUltraMobile && (
                      <span style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
                        background: "linear-gradient(135deg, #FBBF24, #F59E0B)",
                        color: "#FFFFFF", padding: "2px 6px", borderRadius: 3, flexShrink: 0,
                        fontFamily: PJS,
                      }}>
                        ULTRA
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
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
            fontFamily: PJS,
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#0A0A0A", margin: 0, fontFamily: PJS, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {storedUser.full_name || "Your account"}
            </p>
            {storedUser.email && (
              <p style={{ fontSize: 11, color: "rgba(10,10,10,0.4)", margin: "1px 0 0", fontFamily: PJS, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {storedUser.email}
              </p>
            )}
          </div>
        </div>
        <div style={{ height: 1, background: "rgba(10,10,10,0.08)", margin: "0 16px" }} />
        {/* Account settings + Collaborate */}
        {[
          { icon: CreditCard, label: "Account & billing", action: () => { onClose?.(); navigate("/account"); } },
          { icon: Settings,   label: "Account settings",  action: () => { onClose?.(); navigate("/AccountSettings"); } },
          { icon: UserPlus,   label: "Collaborate",        action: () => { onClose?.(); navigate("/Collaborate"); } },
        ].map((item, i) => (
          <div
            key={i}
            onClick={item.action}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", cursor: "pointer", transition: "background 0.15s ease" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(10,10,10,0.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <item.icon size={16} strokeWidth={1.8} style={{ color: "rgba(10,10,10,0.45)", flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A", fontFamily: PJS }}>
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
          <span style={{ fontSize: 13, fontWeight: 600, color: "#E03553", fontFamily: PJS }}>
            Log out
          </span>
        </div>
      </div>
    </div>
  );
}
