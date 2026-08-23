import React, { useState, useEffect, Suspense } from "react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from "react-router-dom";
import { X, Sparkles, Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, Users, LogOut, Loader2, User, Bell, CreditCard, HelpCircle } from "lucide-react";
import { getWeddingWeather, WEATHER_OK } from '@/lib/weather';
import { track, reset as analyticsReset } from '@/lib/analytics';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AnimatedSidebar, MobileSidebarContent } from "./components/layout/AnimatedSidebar";
import TipsModal from "./components/dashboard/TipsModal";
import NotificationBell from "./components/layout/NotificationBell";
import CollaborateModal from "./components/layout/CollaborateModal";
import AvaChatPod from "./components/layout/AvaChatPod";
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails, getMyInvitation, getMyRecords } from '@/lib/resolveMyWedding';
import { createPageUrl } from '@/utils';
import { Toaster } from 'react-hot-toast';
import { CollaboratorProvider, useCollaboratorContext, permissionKeyForPageName, hasPagePermission } from '@/lib/collaboratorContext';
import { getTrialStatus } from '@/lib/trialStatus';
import TopBarSearch from './components/layout/TopBarSearch';

const SIDEBAR_WIDTH = 200;
const TOP_BAR_H = 48;

// fix/dashboard-round6: the app used to have ONE top-level <Suspense> (in
// App.jsx) wrapping the entire authenticated tree, sidebar and top bar
// included. Since a Suspense boundary unmounts everything beneath it — not
// just the node that's actually suspending — every in-app navigation to a
// not-yet-downloaded page chunk blanked the whole screen (sidebar/top bar
// disappeared too) behind a full-white fallback, then remounted everything
// once the chunk arrived. This local boundary, placed around ONLY the
// content slot below, means a lazy page chunk suspends just that slot —
// the sidebar/top bar (siblings outside it) never unmount.
function ContentAreaFallback() {
  return (
    <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={20} style={{ color: 'rgba(10,10,10,0.25)', animation: 'oi-content-spin 0.8s linear infinite' }} />
      <style>{'@keyframes oi-content-spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}

// AUDIT_2026-07.md S3/S4: exported so any component that mutates data the
// layout shell displays (unread message count, wedding name/countdown)
// can invalidate this exact query after its own mutation — e.g.
// Messages.jsx after marking a message read. A prefix match
// (queryClient.invalidateQueries({ queryKey: [LAYOUT_QUERY_KEY] }))
// invalidates every variant regardless of the isCollaborating suffix.
export const LAYOUT_QUERY_KEY = 'layoutData';

const noLayoutPages = [
  "Home", "Features", "Pricing",
  "Onboarding", "PaymentWall",
];

const PJS = "'Plus Jakarta Sans', sans-serif";

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('oi_user') || '{}'); } catch { return {}; }
}

// ── Full-width top navigation bar ────────────────────────────────────────────
function TopBar({ weddingDetails, user, overrideCoupleName }) {
  const navigate = useNavigate();
  // The full discriminated result. `weather` below is just its data, so every
  // existing render path is unchanged; the state field is what a future copy
  // change branches on.
  const [weatherResult, setWeatherResult] = useState(null);

  // Derive couple name from entity fields — a collaborator session has no
  // WeddingDetails record of their own to read (it belongs to the owner),
  // so overrideCoupleName (from the collaborator-context endpoint) wins
  // when present.
  const couple1 = weddingDetails?.couple1Name || '';
  const couple2 = weddingDetails?.couple2Name || '';
  const coupleName = overrideCoupleName || (couple1 && couple2 ? `${couple1} & ${couple2}` : couple1 || couple2 || '');

  // Derive date + countdown from entity
  const dateStr = weddingDetails?.weddingDate || '';
  const daysToGo = dateStr ? Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const formattedDate = dateStr
    ? new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  // User info
  const storedUser = getStoredUser();
  const initials = coupleName
    ? coupleName.split(/\s*[&+,]\s*/).map(n => n.trim()[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    : (storedUser.email || 'U').slice(0, 2).toUpperCase();

  // Wedding-day weather: seasonal summary if far out, real forecast if within
  // range, current conditions on/near the day.
  //
  // getWeddingWeather returns a DISCRIMINATED result, never a bare null, so
  // this can distinguish "nothing to show" from "something broke". The
  // `.catch(() => {})` that used to sit on this call is gone: it discarded
  // the outcome before the caller could branch on it, which would have made
  // the discriminated return pointless. It also swallowed real errors
  // silently — and no-empty did not flag it, because an empty ARROW body is
  // no-empty-function, which this repo does not enable.
  //
  // getWeddingWeather resolves on every path and does not reject, so there is
  // nothing left to catch; an unexpected throw should surface rather than be
  // hidden, and the root error boundary + client-error beacon will report it.
  useEffect(() => {
    let cancelled = false;
    getWeddingWeather(weddingDetails).then(r => { if (!cancelled) setWeatherResult(r); });
    return () => { cancelled = true; };
  }, [weddingDetails?.mainCeremony?.address, weddingDetails?.reception?.address, weddingDetails?.weddingDate]);

  const WEATHER_ICONS = { Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning };
  const weather = weatherResult?.state === WEATHER_OK ? weatherResult.data : null;
  const WeatherIcon = weather ? (WEATHER_ICONS[weather.icon] || Cloud) : null;
  // weather.js always fetches Celsius (Open-Meteo default) — the °F toggle in
  // Account → Settings only affects this display conversion, not the fetch.
  const tempUnit = storedUser.tempUnit === 'F' ? 'F' : 'C';
  const toDisplayTemp = (c) => tempUnit === 'F' ? Math.round(c * 9 / 5 + 32) : Math.round(c);
  // Seasonal is worded here rather than in weather.js because this is where the
  // other two modes are already worded (degree signs, separator, unit). It reads
  // "Usually 18°/9°C" instead of the old "18°/9°C · Typical for this time of
  // year": same information, less than half the width. The long form was 218px
  // in a slot that has roughly 130px at 1280 beside a long couple name, so it
  // truncated to "18…" and told the reader nothing.
  const weatherText = weather
    ? weather.mode === 'current'
      ? `${toDisplayTemp(weather.temp)}°${tempUnit}${weather.label ? ` · ${weather.label}` : ''}`
      : weather.mode === 'seasonal'
        ? `Usually ${toDisplayTemp(weather.high)}°/${toDisplayTemp(weather.low)}°${tempUnit}`
        : `${toDisplayTemp(weather.high)}°/${toDisplayTemp(weather.low)}°${tempUnit}${weather.label ? ` · ${weather.label}` : ''}`
    : '';

  const handleLogout = () => {
    track('user_logged_out');
    analyticsReset();
    localStorage.removeItem('oi_auth');
    localStorage.removeItem('oi_user');
    localStorage.removeItem('base44_access_token');
    localStorage.removeItem('token');
    localStorage.removeItem('oi_couple_name');
    localStorage.removeItem('oi_wedding_date');
    window.location.href = '/login';
  };

  const pinkDot = <span style={{ color: '#ec4899', fontFamily: PJS, lineHeight: 1, flexShrink: 0 }}>·</span>;

  return (
    // Three equal-ended columns, NOT flex + an absolutely positioned centre.
    //
    // The centre pill used to be `position:absolute; left:50%`, i.e. out of
    // flow. That meant the left group had nothing bounding it: it grew past
    // the pill and drew UNDERNEATH it, and because the pill paints later it
    // simply swallowed the tail of the text. The left group's own
    // `overflow:hidden` never engaged, so nothing ellipsized and nothing
    // looked wrong to a bounds check — the text just vanished. Measured: with
    // a long couple name the left group ended at 700px at every width and
    // overlapped the pill from 1024 all the way to 1440.
    //
    // As a grid track, the same boundary becomes a real edge, so the existing
    // overflow/ellipsis finally have something to act against. Equal `1fr`
    // tracks keep the pill centred by construction rather than by arithmetic,
    // which is why this is a grid and not a `max-width: calc(50% - 110px)`:
    // that 110 is half the pill's intrinsic width and would rot silently the
    // first time the pill's padding changed.
    //
    // minmax(0, 1fr), not 1fr: a bare `1fr` is `minmax(auto, 1fr)`, whose auto
    // minimum refuses to shrink below the content. It would reproduce the
    // exact overflow this change exists to remove.
    //
    // The two side tracks are COUPLED — they are always equal. The right group
    // is only a bell and a 36px avatar today, so track 3 is mostly empty; if
    // anything is ever added there, the left track shrinks by the same amount
    // and the couple name starts truncating earlier. That is the trade for
    // keeping the pill centred.
    //
    // `lg:grid`, not an inline display: the `hidden` class is what keeps this
    // bar off mobile, and an inline `display` would beat the class and render
    // it at every width.
    <div
      className="hidden lg:grid"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: TOP_BAR_H,
        zIndex: 50, background: '#0A0A0A',
        gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
        alignItems: 'center', columnGap: 16,
        padding: '0 24px',
      }}
    >
      {/* Left: logo + wedding info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, overflow: 'hidden' }}>
        {/* Logo */}
        <img
          src="/openinvite-logo.png"
          alt="Openinvite"
          onClick={() => navigate('/DailyUpdate')}
          style={{ height: 18, width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)', cursor: 'pointer', flexShrink: 0 }}
        />
        {coupleName && (
          <>
            <span style={{ color: 'rgba(255,255,255,0.18)', fontFamily: PJS, flexShrink: 0 }}>|</span>
            <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.65)', fontFamily: PJS, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 340 }}>
              {daysToGo !== null
                ? daysToGo > 0
                  ? `${coupleName} · ${daysToGo} days to go`
                  : 'Your wedding day has arrived!'
                : coupleName}
            </span>
            {/* flexShrink 1000, not 0: inside a now-BOUNDED track something
                has to yield, and it must not be the couple's names. Shrink is
                weighted by factor x base size, so a large factor makes the
                weather absorb the whole deficit before the name gives up a
                single pixel; the name only starts ellipsizing once the weather
                has gone. With flexShrink 0 here the priority inverted and a
                SHORT name truncated to a bare ellipsis at 1024. */}
            {weather && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.4)', fontFamily: PJS, whiteSpace: 'nowrap', flexShrink: 1000, minWidth: 0, overflow: 'hidden' }}>
                <WeatherIcon size={12} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                {/* Wrapped so it can ellipsize. A bare text node cannot be
                    styled, so the weather clipped mid-word against a hard edge
                    (111px of 218 at 1440) instead of degrading. */}
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{weatherText}</span>
              </span>
            )}
          </>
        )}
      </div>

      {/* Center: search pill. In flow now — it is the `auto` track. No
          overflow on this wrapper: the results panel is 320px wide and centred
          on a 220px pill, so it deliberately overhangs 50px each side. */}
      <div>
        <TopBarSearch />
      </div>

      {/* Right: bell + avatar. justifySelf:end because a grid item stretches
          to fill its track by default, where a flex child did not. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifySelf: 'end' }}>
        {/* Bell */}
        <NotificationBell userId={user?.id} />

        {/* Avatar + dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #ec4899, #9333ea)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: PJS,
                transition: 'transform 0.15s', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" style={{ minWidth: 240, borderRadius: 0, fontFamily: PJS }}>
            <DropdownMenuLabel style={{ fontFamily: PJS, padding: '10px 14px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>
                {storedUser.full_name || coupleName || 'Your account'}
              </p>
              {storedUser.email && (
                <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.6)', margin: '2px 0 0', fontWeight: 400 }}>
                  {storedUser.email}
                </p>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/account')} style={{ fontFamily: PJS, fontSize: 13, cursor: 'pointer' }}>
              <User size={14} style={{ marginRight: 8, color: 'rgba(10,10,10,0.5)' }} />
              Profile & account
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/account?tab=notifications')} style={{ fontFamily: PJS, fontSize: 13, cursor: 'pointer' }}>
              <Bell size={14} style={{ marginRight: 8, color: 'rgba(10,10,10,0.5)' }} />
              Notification preferences
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/account?tab=billing')} style={{ fontFamily: PJS, fontSize: 13, cursor: 'pointer' }}>
              <CreditCard size={14} style={{ marginRight: 8, color: 'rgba(10,10,10,0.5)' }} />
              Plan & billing
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/help')} style={{ fontFamily: PJS, fontSize: 13, cursor: 'pointer' }}>
              <HelpCircle size={14} style={{ marginRight: 8, color: 'rgba(10,10,10,0.5)' }} />
              Help centre
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} style={{ fontFamily: PJS, fontSize: 13, cursor: 'pointer', color: '#E03553' }}>
              <LogOut size={14} style={{ marginRight: 8, color: '#E03553' }} />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ── Persistent collaboration context banner ──────────────────────────────────
function CollaboratorBanner({ coupleNames, collaboratorEmail, topOffset }) {
  return (
    <div
      className="hidden lg:flex"
      style={{
        position: 'fixed', top: topOffset, left: SIDEBAR_WIDTH, right: 0, height: 32,
        zIndex: 45, background: 'rgba(224,53,83,0.06)', borderBottom: '1px solid rgba(224,53,83,0.15)',
        alignItems: 'center', justifyContent: 'space-between', padding: '0 32px',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#0A0A0A', fontFamily: PJS }}>
        <Users size={13} style={{ color: '#E03553', flexShrink: 0 }} />
        Collaborating on {coupleNames ? `${coupleNames}'s wedding` : 'this wedding'} as {collaboratorEmail}
      </span>
      <a
        href={createPageUrl('DailyUpdate')}
        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#E03553', fontFamily: PJS, textDecoration: 'none' }}
      >
        <LogOut size={12} />
        Exit collaboration
      </a>
    </div>
  );
}

// ── Clean "you don't have access" state — shown instead of page content,
// never instead of a server error; the real check already happened
// server-side (see api/collaborator-*.js) by the time this renders. ────────
function CollaboratorAccessDenied() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: 32 }}>
      <Users size={28} style={{ color: 'rgba(10,10,10,0.25)', marginBottom: 12 }} />
      <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 4px' }}>
        You don't have access to this page
      </p>
      <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0 }}>
        Ask the couple to grant you permission if you think this is a mistake.
      </p>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  if (noLayoutPages.includes(currentPageName)) return <>{children}</>;
  return (
    <CollaboratorProvider>
      <LayoutShell currentPageName={currentPageName}>{children}</LayoutShell>
    </CollaboratorProvider>
  );
}

function LayoutShell({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [showCollaborateModal, setShowCollaborateModal] = React.useState(false);
  const [showTipsModal, setShowTipsModal] = React.useState(false);
  const [chatOpen, setChatOpen] = React.useState(false);
  const collab = useCollaboratorContext();
  const isCollaborating = !!collab.ownerUserId;
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const handler = () => setChatOpen(true);
    window.addEventListener('openAva', handler);
    return () => window.removeEventListener('openAva', handler);
  }, []);

  // AUDIT_2026-07.md S3/S4: this used to refetch on every navigation
  // (location.pathname in the effect deps) — up to 7 requests per nav for
  // data that changes rarely within a session. React Query now caches it
  // across navigations and only refetches when genuinely stale or when
  // something explicitly invalidates LAYOUT_QUERY_KEY (the existing
  // weddingDetailsSaved event below, plus Messages.jsx after marking a
  // message read/replied).
  const { data: layoutData } = useQuery({
    queryKey: [LAYOUT_QUERY_KEY, isCollaborating],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      // A collaborator session has no WeddingDetails/Invitation/GuestMessage
      // of their own to read here — that data belongs to the owner, and is
      // fetched separately via collaborator-context.js/collaborator-*.js.
      // Reading these owner-scoped helpers under the collaborator's own
      // token would just return their own (irrelevant, usually empty) data.
      if (isCollaborating) {
        return { user: currentUser, unreadMessagesCount: 0, weddingName: '', weddingDetails: null };
      }
      const [messagesResult, invitationResult, weddingDetailsResult] = await Promise.allSettled([
        getMyRecords('GuestMessage'),
        getMyInvitation(),
        getMyWeddingDetails(),
      ]);
      const messages = messagesResult.status === 'fulfilled' ? messagesResult.value : [];
      const invitation = invitationResult.status === 'fulfilled' ? invitationResult.value : null;
      const weddingDetails = weddingDetailsResult.status === 'fulfilled' ? weddingDetailsResult.value : null;
      return {
        user: currentUser,
        unreadMessagesCount: messages.filter(m => !m.read).length,
        weddingName: invitation?.couple_names || '',
        weddingDetails,
      };
    },
    // This data (user plan, wedding name/date, unread count) rarely changes
    // within a session — real changes go through explicit invalidation
    // (weddingDetailsSaved event, Messages.jsx's mutations) rather than a
    // time-based refetch, so a generous staleTime just avoids the
    // per-navigation refetch without risking staleness after a real edit.
    staleTime: 5 * 60 * 1000,
  });

  const user = layoutData?.user ?? null;
  const weddingName = layoutData?.weddingName ?? '';
  const weddingDetails = layoutData?.weddingDetails ?? null;

  React.useEffect(() => {
    const invalidate = () => queryClient.invalidateQueries({ queryKey: [LAYOUT_QUERY_KEY] });
    window.addEventListener('weddingDetailsSaved', invalidate);
    return () => window.removeEventListener('weddingDetailsSaved', invalidate);
  }, [queryClient]);

  // Trial banner: about the logged-in account's OWN plan — meaningless (and
  // confusing) to show while borrowing someone else's wedding as a collaborator.
  const trialBanner = React.useMemo(() => {
    if (!user || isCollaborating) return null;
    // Shared with the access gates (src/lib/trialStatus.js). The maths used to
    // live here and drive only this banner, while the gates read the plan
    // string alone -- so the banner could say the trial had ended beside
    // features that still worked.
    const { isPaid, trialExpired, daysLeft } = getTrialStatus(user);
    if (isPaid) return null;
    return trialExpired ? { expired: true, daysLeft: 0 } : { expired: false, daysLeft };
  }, [user, isCollaborating]);

  // Resolving whether this is a real, accepted collaboration — brief, but
  // avoids a flash of the wrong sidebar/topbar before the real permission
  // check (server-side, collaborator-context.js) comes back.
  if (isCollaborating && collab.loading) {
    return <div className="min-h-screen" style={{ background: '#FFFFFF' }} />;
  }

  // Not an accepted collaborator on this owner at all — a clean dead end,
  // not the real dashboard shell. The actual gate already happened
  // server-side; this just presents the outcome.
  if (isCollaborating && !collab.loading && !collab.ok) {
    return (
      <div className="min-h-screen" style={{ background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 32, maxWidth: 360 }}>
          <Users size={28} style={{ color: 'rgba(10,10,10,0.25)', marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 6px' }}>
            You don't have access to this wedding
          </p>
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 20px' }}>
            This collaboration link isn't valid for your account, or the invite hasn't been accepted yet.
          </p>
          <a
            href={createPageUrl('DailyUpdate')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
              color: '#fff', background: '#E03553', borderRadius: 999, padding: '8px 18px',
              fontFamily: PJS, textDecoration: 'none',
            }}
          >
            Go to your own dashboard
          </a>
        </div>
      </div>
    );
  }

  const collaboratorPermissions = collab.ok ? collab.permissions : null;
  const bannerH = collab.ok ? 32 : 0;
  const contentTopOffset = TOP_BAR_H + (trialBanner ? 36 : 0) + bannerH;
  const currentPermissionKey = permissionKeyForPageName(currentPageName);
  const canViewCurrentPage = !isCollaborating || (
    !!currentPermissionKey &&
    hasPagePermission(collaboratorPermissions, currentPermissionKey, 'view')
  );

  return (
    <div className="min-h-screen" style={{ background: '#FFFFFF' }}>
      <Toaster
        toastOptions={{
          style: {
            fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: '13px',
            borderRadius: '0',
            background: '#111',
            color: '#fff',
            border: '1px solid #222',
          },
        }}
      />

      {/* ── Full-width top nav bar (desktop only) ─────────── */}
      <TopBar
        weddingDetails={weddingDetails}
        user={user}
        overrideCoupleName={collab.ok ? collab.coupleNames : undefined}
      />

      {/* ── Collaboration context banner (desktop only, below top bar) ── */}
      {collab.ok && (
        <CollaboratorBanner
          coupleNames={collab.coupleNames}
          collaboratorEmail={collab.collaboratorEmail}
          topOffset={TOP_BAR_H}
        />
      )}

      {/* ── Trial banner: EVERY width, below the top bar ─────────
          It was `hidden lg:flex` -- desktop only -- which was survivable
          while the banner was merely informational. It is now the only
          explanation an expired couple gets for why their edits stop
          saving, and most couples plan on a phone. Caught by the
          expired-state render pass at 390. */}
      {trialBanner && (
        <div
          className="flex"
          style={{
            position: 'fixed',
            top: TOP_BAR_H,
            left: 0,
            right: 0,
            minHeight: 36,
            zIndex: 49,
            padding: '6px 12px',
            flexWrap: 'wrap',
            textAlign: 'center',
            background: trialBanner.expired ? '#E03553' : 'rgba(10,10,10,0.93)',
            backdropFilter: 'blur(8px)',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontFamily: PJS }}>
            {trialBanner.expired
              // Canon: no data-hostage language. The couple's work is not
              // withheld or ransomed -- it is theirs, readable and exportable.
              // What ends is the ability to keep CHANGING it. "Unlock your
              // data" would be both hostile and untrue.
              ? 'Your free trial has ended. Your work is safe and yours — upgrade to keep planning.'
              : `14-day free trial — ${trialBanner.daysLeft} day${trialBanner.daysLeft !== 1 ? 's' : ''} remaining.`}
          </span>
          <a
            href="/pricing"
            style={{
              fontSize: 12, fontWeight: 700, color: '#FFFFFF',
              fontFamily: PJS, textDecoration: 'none',
              background: '#E03553', borderRadius: 999,
              padding: '3px 12px', lineHeight: 1.6,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            Upgrade
          </a>
        </div>
      )}

      {/* ── Desktop: fixed sidebar (below top bar) ──────────── */}
      <div className="hidden lg:block">
        <AnimatedSidebar
          weddingName={weddingName}
          onCollaborate={() => setShowCollaborateModal(true)}
          onOpenTips={() => setShowTipsModal(true)}
          topOffset={contentTopOffset}
          collaboratorPermissions={collaboratorPermissions}
        />
      </div>

      {/* ── Mobile: fixed top bar ───────────────────────── */}
      <div
        className="flex lg:hidden"
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 50,
          height: 64,
          background: '#FFFFFF',
          borderBottom: '1px solid rgba(10,10,10,0.12)',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        <img
          src="/openinvite-logo.png"
          alt="Openinvite"
          style={{ height: 20, width: 'auto', objectFit: 'contain' }}
        />
        <button
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#0A0A0A', padding: 8, borderRadius: 999,
            display: 'flex', alignItems: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* ── Mobile: nav sheet ──────────────────────────────── */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" title="Navigation menu" className="w-72 p-0" style={{ borderRight: '1px solid #E4E4E4' }}>
          <MobileSidebarContent
            weddingName={weddingName}
            onClose={() => setMobileMenuOpen(false)}
            onCollaborate={() => { setMobileMenuOpen(false); setShowCollaborateModal(true); }}
            collaboratorPermissions={collaboratorPermissions}
          />
        </SheetContent>
      </Sheet>

      {showCollaborateModal && <CollaborateModal onClose={() => setShowCollaborateModal(false)} />}
      {showTipsModal && <TipsModal onClose={() => setShowTipsModal(false)} />}

      {/* ── Floating Ava button ──────────────────────────── */}
      <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 8000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
        {chatOpen && <AvaChatPod onClose={() => setChatOpen(false)} />}
        <button
          onClick={() => setChatOpen(prev => !prev)}
          aria-label={chatOpen ? 'Close Ava' : 'Chat with Ava'}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: chatOpen ? '#0A0A0A' : 'linear-gradient(135deg, #ec4899, #9333ea)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(147,51,234,0.3)',
            transition: 'transform 0.2s ease, background 0.2s ease',
            color: '#FFFFFF',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {chatOpen ? <X size={16} /> : <Sparkles size={18} />}
        </button>
      </div>

      {/* ── Main content ─────────────────────────────────── */}
      {/*
        ONE tree, at every width.

        This used to be two: `hidden lg:block` and `lg:hidden`, each rendering
        {children}. Both are CSS visibility, not conditional mounts, so React
        mounted every dashboard page TWICE — two independent state trees, every
        effect firing twice, every loadData doubled, across 94 routes. Measured
        on the Guests page: 2 .page-content elements, 4 /api/my-guests calls,
        406 checkboxes in the DOM for 203 guests.

        The two containers were never structurally different. They rendered
        identical children and differed only in margin-left and padding-top, so
        the breakpoint belongs in CSS, not in a JS conditional. Doing it in JS
        would fix the mount count and introduce a worse bug: crossing 1024px
        would unmount and rebuild the page, losing unsaved form state and
        scroll position and re-firing every fetch. A media query cannot do that.

        The two values ride in as custom properties so JS stays the single
        source of truth for both numbers; index.css decides which applies.
        (`--page-content-top` used to be set here too and was never read by
        anything — deleted with the rewrite rather than carried forward.)
      */}
      <div
        className="page-content"
        style={{ '--content-top-desktop': `${contentTopOffset}px`, '--sidebar-width': `${SIDEBAR_WIDTH}px` }}
      >
        <Suspense fallback={<ContentAreaFallback />}>
          {canViewCurrentPage ? children : <CollaboratorAccessDenied />}
        </Suspense>
      </div>
    </div>
  );
}
