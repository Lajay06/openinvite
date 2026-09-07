import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { hasPagePermission } from "@/lib/collaboratorContext";
import { COLLABORATOR_PAGE_MAP, COLLABORATOR_PERMISSION_KEYS } from "@/lib/collaboratorPageMap";
import { canAccessUltra as canAccessUltraFor } from "@/lib/trialStatus";
import { preloadPageChunk } from "@/pagePreload";

/**
 * AUDIT_2026-07.md B2: every nav row here is a styled <div onClick>, not a
 * real <button> — invisible to keyboard/screen-reader users. Spread onto
 * each row alongside its existing onClick to make Enter/Space activate it
 * exactly like a real button, without changing its click behavior or look.
 */
function interactiveRowProps(onClick, disabled = false) {
  if (!onClick || disabled) return { role: 'button', 'aria-disabled': disabled || undefined, tabIndex: -1 };
  return {
    role: 'button',
    tabIndex: 0,
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(e);
      }
    },
  };
}

/**
 * Builds the collaborator's own nav sections directly from
 * COLLABORATOR_PAGE_MAP, grouped by navSection, in map-declaration order —
 * deliberately NOT filtered from NAV_SECTIONS below, since several granted
 * pages (Invitations, Notes) have no entry there at all (see
 * collaboratorPageMap.js's header for why), and "Event Details" needs to
 * render as a standalone top item, not inside a section, same as it does
 * for the owner.
 */
function buildCollaboratorNav(permissions) {
  const granted = COLLABORATOR_PERMISSION_KEYS.filter(key => hasPagePermission(permissions, key, 'view'));
  const topLevel = [];
  const sections = new Map();
  for (const key of granted) {
    const entry = COLLABORATOR_PAGE_MAP[key];
    // Reshaped to match NAV_SECTIONS' own item shape ({icon, label, url})
    // so the existing render loop below needs no branching for either case.
    const item = { icon: COLLABORATOR_ICONS[entry.icon] || FileText, label: entry.navLabel, url: entry.route };
    if (entry.navSection === null) {
      topLevel.push(item);
      continue;
    }
    if (!sections.has(entry.navSection)) sections.set(entry.navSection, []);
    sections.get(entry.navSection).push(item);
  }
  return { topLevel, sections: [...sections.entries()].map(([label, items]) => ({ label, items })) };
}
import { BarChart2, Calendar, Camera, Car, Clock, CreditCard, FileText, Gift, Globe, Heart, HelpCircle, Hotel, Image, LayoutDashboard, LayoutGrid, Lightbulb, ListTodo, LogOut, MapPin, MessageCircle, Music2, Package, Palette, Phone, Plane, ScrollText, Send, ShoppingBag, Sparkles, StickyNote, Store, UserCheck, UserPlus, Users, UtensilsCrossed, Wallet } from 'lucide-react';

// Maps collaboratorPageMap.js's icon name strings to the actual lucide
// components — kept out of that shared file so it stays framework-neutral
// (api/collaborator-data.js also imports it, server-side).
const COLLABORATOR_ICONS = {
  LayoutDashboard, Users, Wallet, Calendar, Music2, Send, LayoutGrid, Gift, Store, Image, FileText, StickyNote,
};

const PJS = "'Plus Jakarta Sans', sans-serif";

// Exported so TopBarSearch.jsx can search "pages/sections by name" against
// the exact same list the sidebar renders — one source of truth, no risk of
// a page existing in one but not the other.
/**
 * THE FIVE GROUPS — the calm pass's PR2, applied.
 *
 * Owner ruling 2026-09-07. Eight groups became five, off the proposal recorded
 * in DECISION-LOG.md (2026-09-04): Foundations · Guests · The day ·
 * Money & vendors · Website & invitations. Nothing was invented here; the
 * mapping is that list against the real inventory.
 *
 * WHAT MOVED, AND THE TWO THINGS THE PROPOSAL LEFT OPEN:
 *
 *   "Daily update has no home in the five groups." It is now the FIRST item in
 *   the sidebar and the landing page, ungrouped, above the groups — which is
 *   the slot Overall used to hold. Overall is gone (owner: "the Overall in
 *   planning is still there, that needs to go").
 *
 *   "Event details" is not in the proposal either. It was a top-level link
 *   beside Design studio, and it stays ungrouped beside To do rather than
 *   being filed under a group that would bury the page a couple opens first.
 *   JUDGMENT CALL, marked in the PR.
 *
 * Design studio leaves the top slot for Website & invitations, as its first
 * item — it is Ultra-only, and that is the group that already carries the
 * Ultra treatment on its label.
 */
export const UNGROUPED_ITEMS = [
  { icon: Sparkles,  label: "Daily update",  url: createPageUrl("DailyUpdate") },
  { icon: FileText,  label: "Event details", url: "/event-details" },
];

/**
 * THE GROUPS ARE THE ONES THAT WERE THERE BEFORE — owner ruling on review,
 * 2026-09-07: revert the headings and the grouping, keep the collapsing.
 *
 * The five-group recut (Foundations · Guests · The day · Money & vendors ·
 * Website & invitations) is gone. What stays from that pass is the part the
 * owner kept: every group collapsed except the first, a group holding the
 * active page opens, and Design studio living inside the guest-suite group
 * rather than in the top slot.
 *
 * THREE DIFFERENCES FROM THE PRE-#697 SIDEBAR, each of them an earlier ruling
 * this review did not reverse:
 *
 *   Overall is gone, so "Planning" no longer opens with it.
 *   Daily update is the first item in the sidebar and the landing page, so it
 *   sits above the groups rather than second inside Planning.
 *   Event details stays ungrouped beside it — the judgment call the owner
 *   accepted by name.
 *
 * "Guest suite" is the brand name, exactly. It was "Guest Suite" before and
 * "Website & invitations" briefly; the owner named the spelling.
 *
 * EVERY GROUP CARRIES AN ICON so a collapsed sidebar is readable at a glance —
 * a column of seven identical carets tells you nothing. All eight come from
 * the icons this file already imports; none is invented.
 */
export const NAV_SECTIONS = [
  {
    label: "Planning",
    icon: LayoutDashboard,
    items: [
      { icon: Calendar,        label: "Schedule",     url: createPageUrl("Schedule") },
      { icon: ListTodo,        label: "To do",        url: createPageUrl("TodoList") },
    ],
  },
  {
    label: "Guests",
    icon: Users,
    items: [
      { icon: Users,         label: "Guest list",    url: createPageUrl("Guests") },
      { icon: BarChart2,     label: "Polls & games", url: createPageUrl("Polls") },
      { icon: MessageCircle, label: "Messages",      url: createPageUrl("Messages") },
      { icon: LayoutGrid,    label: "Seating",       url: createPageUrl("Seating") },
      { icon: UserCheck,     label: "Wedding party", url: "/wedding-party" },
    ],
  },
  {
    label: "Style & experience",
    icon: Palette,
    items: [
      { icon: Image,           label: "Moodboard",       url: createPageUrl("Moodboard") },
      { icon: Palette,         label: "Styling",         url: createPageUrl("Styling") },
      { icon: Sparkles,        label: "Beauty",          url: createPageUrl("Beauty") },
      { icon: UtensilsCrossed, label: "Food & beverage", url: createPageUrl("FoodBeverage") },
      { icon: Music2,          label: "Music",           url: createPageUrl("Music") },
      { icon: Camera,          label: "Photography",     url: createPageUrl("Photography") },
      { icon: FileText,        label: "Vows & speeches", url: createPageUrl("VowsSpeeches") },
      { icon: Package,         label: "Guest gifts",     url: "/wedding-favours" },
    ],
  },
  {
    label: "Vendors",
    icon: Store,
    items: [
      { icon: Store,       label: "My vendors",  url: createPageUrl("Vendors") },
      { icon: ShoppingBag, label: "Marketplace", url: createPageUrl("VendorMarketplace") },
    ],
  },
  {
    label: "On the day",
    icon: Clock,
    items: [
      { icon: Heart,   label: "Ceremony details",  url: "/ceremony-details" },
      { icon: Car,     label: "Transport",         url: "/transport" },
      { icon: Hotel,   label: "Accommodation",     url: "/accommodation" },
      { icon: Phone,   label: "Emergency contact", url: "/emergency-contact" },
    ],
  },
  {
    label: "Finances",
    icon: CreditCard,
    items: [
      { icon: Wallet, label: "Budget",   url: createPageUrl("Budget") },
      { icon: Gift,   label: "Registry", url: createPageUrl("Registry") },
    ],
  },
  {
    label: "Guest suite",
    icon: Globe,
    guestSuite: true,
    items: [
      { icon: Sparkles,   label: "Design studio",   url: "/studio", ultraBadge: true },
      { icon: Clock,      label: "Schedule",        url: createPageUrl("GuestSuiteSchedule") },
      { icon: HelpCircle, label: "Q&A",             url: createPageUrl("QandA") },
      { icon: Gift,       label: "Registry",        url: createPageUrl("GuestSuiteRegistry") },
      { icon: Hotel,      label: "Accommodation",   url: createPageUrl("GuestSuiteAccommodation") },
      { icon: Car,        label: "Transport",       url: createPageUrl("GuestSuiteTransport") },
      { icon: MapPin,     label: "Experience guide",url: createPageUrl("GuestSuiteExperience") },
      { icon: ScrollText, label: "Good to know",    url: createPageUrl("GuestSuitePolicies") },
      { icon: BarChart2,  label: "Guest polls",     url: createPageUrl("GuestSuitePolls") },
    ],
  },
  {
    label: "Extras",
    icon: StickyNote,
    items: [
      { icon: Plane,     label: "Honeymoon",      url: "/honeymoon" },
      { icon: Lightbulb, label: "Considerations", url: createPageUrl("Considerations") },
    ],
  },
];

// ── Shared style helpers ──────────────────────────────────────────────────────


/**
 * A GROUP OPENS WHEN IT HAS SOMETHING TO SAY.
 *
 * Owner: every group collapsed by default except the first, and a group
 * holding the page you are on opens. That last clause is the one that makes
 * the rule usable rather than annoying — you never land on a page whose own
 * group is shut, and the nav does not reset itself around you as you move.
 *
 * The state is per mount and deliberately not persisted: a remembered
 * accordion is a different feature, and a couple who opens four groups and
 * comes back tomorrow to four open groups has the eight-group sidebar again.
 */
function useGroupOpen(sections, isActive, holdsActive) {
  const firstOpen = React.useMemo(() => {
    const open = {};
    sections.forEach((sec, i) => { open[sec.label] = i === 0 || holdsActive(sec); });
    return open;
    // Recomputed when the active page changes so the new page's group opens.
  }, [sections, holdsActive]);
  const [manual, setManual] = React.useState({});
  const isOpen = (sec) => (sec.label in manual ? manual[sec.label] : firstOpen[sec.label]);
  const toggle = (sec) => setManual((m) => ({ ...m, [sec.label]: !isOpen(sec) }));
  return { isOpen, toggle };
}

/** The group's header row: its label, and a caret that says which way it is. */
function GroupHeader({ section, open, onToggle }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-label={section.label}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
      style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 16px", marginTop: 24, marginBottom: 2, cursor: "pointer" }}
    >
      {/* THE GROUP'S OWN ICON, so a collapsed sidebar is readable at a glance
          — a column of identical carets tells a couple nothing about what is
          inside each one. */}
      {section.icon && <section.icon size={11} strokeWidth={1.8} style={{ color: "rgba(10,10,10,0.6)", flexShrink: 0 }} />}
      <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(10,10,10,0.6)", fontFamily: PJS }}>
        {section.label}
      </span>
      {section.guestSuite && (
        <span style={{
          fontSize: 8, fontWeight: 800,
          background: "linear-gradient(135deg, #FBBF24, #F59E0B)",
          color: "#FFFFFF", padding: "1px 4px", borderRadius: 3, flexShrink: 0,
          fontFamily: PJS,
        }}>
          Ultra
        </span>
      )}
      {/* A text-presentation caret, not an emoji glyph: it inherits the
          typeface and currentColor, which is the rule's actual test. */}
      <span aria-hidden="true" style={{ marginLeft: "auto", fontSize: 9, color: "rgba(10,10,10,0.45)", fontFamily: PJS }}>
        {open ? "\u25BC" : "\u25B6"}
      </span>
    </div>
  );
}

function NavItem({ icon: Icon, label, url, onClick, isActive, showBadge, disabled, disabledTooltip }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      title={disabled ? disabledTooltip : undefined}
      aria-label={label}
      {...interactiveRowProps(onClick, disabled)}
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
      onMouseEnter={e => {
        if (!isActive && !disabled) e.currentTarget.style.background = "rgba(10,10,10,0.04)";
        if (!disabled) preloadPageChunk(url);
      }}
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
          Ultra
        </span>
      )}
    </div>
  );
}

// ── Desktop sidebar ───────────────────────────────────────────────────────────

export function AnimatedSidebar({ weddingName, onOpenTips, onCollaborate, topOffset = 48, collaboratorPermissions = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  // Ultra access follows the TRIAL, not the plan string. `plan === 'free'`
  // covers both an active trial and a long-expired one; gating on it alone
  // meant an expired account kept Ultra while a paying Pro customer had less.
  // See src/lib/trialStatus.js.
  const _plan = user?.plan || 'free';
  const canAccessUltra = canAccessUltraFor(user);
  const isProPlan = _plan === 'pro';

  // Collaborator sessions see only the pages they were granted, built
  // straight from COLLABORATOR_PAGE_MAP (not filtered from NAV_SECTIONS —
  // several granted pages, like Invitations/Notes, have no entry there at
  // all; see collaboratorPageMap.js's header).
  const isCollaborator = !!collaboratorPermissions;
  const collaboratorNav = isCollaborator ? buildCollaboratorNav(collaboratorPermissions) : null;
  const visibleSections = isCollaborator ? collaboratorNav.sections : NAV_SECTIONS;

  const isActive = (url) => {
    const path = url.split("?")[0];
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  // AFTER isActive, NOT BEFORE IT — the #429 class, caught again. The first
  // version of this block sat beside `visibleSections`, forty lines above
  // `const isActive = …`, and every dashboard page threw "Cannot access 'y'
  // before initialization" into the error boundary. `npm run lint` passed:
  // this file is inside the no-use-before-define carve-out, so the rule that
  // exists for exactly this was not looking. The render guard found it.
  const holdsActive = React.useCallback(
    (sec) => (sec.items || []).some((it) => isActive(it.url)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location.pathname],
  );
  const groupOpen = useGroupOpen(visibleSections, isActive, holdsActive);

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
        borderRight: "1px solid rgba(10,10,10,0.12)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Scrollable nav */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 8 }}>

        {!isCollaborator && (
          <>
            {/* DAILY UPDATE IS THE FIRST ITEM and the landing page. Design
                studio left this slot for the Website & invitations group,
                where its Ultra treatment already lives. */}
            {UNGROUPED_ITEMS.map((item) => (
              <NavItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                url={item.url}
                isActive={isActive(item.url)}
                onClick={() => navigate(item.url.split("?")[0])}
              />
            ))}
            {/* Event details is in UNGROUPED_ITEMS above. It was also a
                standalone NavItem here, and the sidebar rendered it TWICE —
                two identical rows, one of which was the row above it. */}
          </>
        )}

        {/* Collaborator top-level items — e.g. Event details, which has no
            section for the owner either (navSection: null in the map) */}
        {isCollaborator && collaboratorNav.topLevel.map((item, i) => (
          <NavItem
            key={i}
            icon={item.icon}
            label={item.label}
            url={item.url}
            isActive={isActive(item.url)}
            onClick={() => navigate(item.url)}
          />
        ))}

        {/* Nav sections */}
        {visibleSections.map((section, si) => {
          const guestSuiteDisabled = section.guestSuite && isProPlan;
          const open = groupOpen.isOpen(section);
          return (
            <div key={si}>
              <GroupHeader section={section} open={open} onToggle={() => groupOpen.toggle(section)} />
              {open && section.items.map((item, ii) => (
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
      <div style={{ borderTop: "1px solid rgba(10,10,10,0.12)", paddingTop: 4, paddingBottom: 4, flexShrink: 0 }}>

        {/* Quick tips */}
        {!isCollaborator && onOpenTips && (
          <div
            onClick={onOpenTips}
            aria-label="Quick tips"
            {...interactiveRowProps(onOpenTips)}
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

        {/* Help Centre */}
        <div
          onClick={() => navigate("/help")}
          aria-label="Help center"
          {...interactiveRowProps(() => navigate("/help"))}
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
            Help center
          </span>
        </div>

        {/* Collaborate — not shown in a collaborator's own borrowed session;
            it's for the couple to invite others onto THEIR wedding. */}
        {!isCollaborator && onCollaborate && (
          <div
            onClick={onCollaborate}
            aria-label="Collaborate"
            {...interactiveRowProps(onCollaborate)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 12px", cursor: "pointer",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(10,10,10,0.04)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >
            <UserPlus size={14} strokeWidth={1.8} style={{ color: "rgba(10,10,10,0.45)", flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#0A0A0A", fontFamily: PJS }}>
              Collaborate
            </span>
          </div>
        )}

        {/* Leave Dashboard / Exit collaboration */}
        <div
          onClick={() => { window.location.href = isCollaborator ? createPageUrl("DailyUpdate") : createPageUrl("Home"); }}
          aria-label={isCollaborator ? "Exit collaboration" : "Leave dashboard"}
          {...interactiveRowProps(() => { window.location.href = isCollaborator ? createPageUrl("DailyUpdate") : createPageUrl("Home"); })}
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
            {isCollaborator ? "Exit collaboration" : "Leave dashboard"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Mobile sidebar content (used inside Sheet) ────────────────────────────────

export function MobileSidebarContent({ weddingName, onClose, onCollaborate, collaboratorPermissions = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  // Same rule as the desktop nav above -- one shared source so the two can
  // never drift apart.
  const _planM = user?.plan || 'free';
  const canAccessUltraMobile = canAccessUltraFor(user);
  const isProPlanMobile = _planM === 'pro';

  const isCollaboratorMobile = !!collaboratorPermissions;
  const collaboratorNavMobile = isCollaboratorMobile ? buildCollaboratorNav(collaboratorPermissions) : null;
  const visibleSectionsMobile = isCollaboratorMobile ? collaboratorNavMobile.sections : NAV_SECTIONS;

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

  // AFTER isActive, NOT BEFORE IT — the #429 class, caught again. The first
  // version of this block sat beside `visibleSections`, forty lines above
  // `const isActive = …`, and every dashboard page threw "Cannot access 'y'
  // before initialization" into the error boundary. `npm run lint` passed:
  // this file is inside the no-use-before-define carve-out, so the rule that
  // exists for exactly this was not looking. The render guard found it.
  const holdsActiveMobile = React.useCallback(
    (sec) => (sec.items || []).some((it) => isActive(it.url)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location.pathname],
  );
  const groupOpenMobile = useGroupOpen(visibleSectionsMobile, isActive, holdsActiveMobile);

  const handleNav = (url) => {
    navigate(url.split("?")[0]);
    onClose?.();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#FFFFFF" }}>
      {/* Logo */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(10,10,10,0.12)", flexShrink: 0 }}>
        <img
          src="/openinvite-logo.png"
          alt="Openinvite"
          style={{ height: 20, width: "auto", objectFit: "contain", objectPosition: "left", display: "block" }}
        />
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>

        {/* DAILY UPDATE FIRST, then To do — the ungrouped items. Design
            studio moved into Website & invitations. */}
        {!isCollaboratorMobile && UNGROUPED_ITEMS.map((item) => {
          const active = isActive(item.url);
          return (
            <div
              key={item.label}
              onClick={() => handleNav(item.url)}
              aria-label={item.label}
              {...interactiveRowProps(() => handleNav(item.url))}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 16px", cursor: "pointer",
                borderLeft: active ? "2px solid #E03553" : "2px solid transparent",
                background: active ? "rgba(224,53,83,0.08)" : "transparent",
                transition: "background 0.15s ease",
              }}
            >
              <item.icon size={18} strokeWidth={1.8} style={{ color: active ? "#E03553" : "rgba(10,10,10,0.45)", flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: active ? "#E03553" : "#0A0A0A", fontFamily: PJS, flex: 1 }}>
                {item.label}
              </span>
            </div>
          );
        })}

        {/* Event details renders from UNGROUPED_ITEMS above, once. */}

        {/* Collaborator top-level items (e.g. Event details) */}
        {isCollaboratorMobile && collaboratorNavMobile.topLevel.map((item, i) => {
          const active = isActive(item.url);
          return (
            <div
              key={i}
              onClick={() => handleNav(item.url)}
              aria-label={item.label}
              {...interactiveRowProps(() => handleNav(item.url))}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 16px", cursor: "pointer",
                borderLeft: active ? "2px solid #E03553" : "2px solid transparent",
                background: active ? "rgba(224,53,83,0.08)" : "transparent",
                transition: "background 0.15s ease",
              }}
            >
              <item.icon size={18} strokeWidth={1.8} style={{ color: active ? "#E03553" : "rgba(10,10,10,0.45)", flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: active ? "#E03553" : "#0A0A0A", fontFamily: PJS }}>
                {item.label}
              </span>
            </div>
          );
        })}

        {visibleSectionsMobile.map((section, si) => {
          const guestSuiteDisabled = section.guestSuite && isProPlanMobile;
          const open = groupOpenMobile.isOpen(section);
          return (
            <div key={si}>
              <GroupHeader section={section} open={open} onToggle={() => groupOpenMobile.toggle(section)} />

              {open && section.items.map((item, ii) => {
                const active = !guestSuiteDisabled && isActive(item.url);
                return (
                  <div
                    key={ii}
                    onClick={guestSuiteDisabled ? undefined : () => handleNav(item.url)}
                    title={guestSuiteDisabled ? "Upgrade to Ultra to unlock your wedding website" : undefined}
                    aria-label={item.label}
                    {...interactiveRowProps(() => handleNav(item.url), guestSuiteDisabled)}
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
                        Ultra
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
      <div style={{ borderTop: "1px solid rgba(10,10,10,0.12)", flexShrink: 0 }}>
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
              <p style={{ fontSize: 11, color: "rgba(10,10,10,0.6)", margin: "1px 0 0", fontFamily: PJS, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {storedUser.email}
              </p>
            )}
          </div>
        </div>
        {/* Divider at 0.12 — advisor ruling 2026-08-20: dividers are ONE value
            regardless of implementation. This one is a background fill, not a
            border, so the feel-pass property guard skipped it; the guard is
            unchanged and this exemption lives here at the site. */}
        <div style={{ height: 1, background: "rgba(10,10,10,0.12)", margin: "0 16px" }} />
        {/* Account + Collaborate */}
        {[
          { icon: CreditCard, label: "Account",      action: () => { onClose?.(); navigate("/account"); } },
          ...(isCollaboratorMobile ? [] : [{ icon: UserPlus, label: "Collaborate", action: () => { onClose?.(); onCollaborate?.(); } }]),
        ].map((item, i) => (
          <div
            key={i}
            onClick={item.action}
            aria-label={item.label}
            {...interactiveRowProps(item.action)}
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
        {/* Divider at 0.12 — advisor ruling 2026-08-20: dividers are ONE value
            regardless of implementation. This one is a background fill, not a
            border, so the feel-pass property guard skipped it; the guard is
            unchanged and this exemption lives here at the site. */}
        <div style={{ height: 1, background: "rgba(10,10,10,0.12)", margin: "2px 16px" }} />
        {/* Log out */}
        <div
          onClick={mobileLogout}
          aria-label="Log out"
          {...interactiveRowProps(mobileLogout)}
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
