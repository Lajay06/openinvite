import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, Bell, Search, Sparkles, Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning } from "lucide-react";
import { getWeddingWeather } from '@/lib/weather';
import { track, reset as analyticsReset } from '@/lib/analytics';
import { resetSession as crispReset } from '@/lib/crisp';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AnimatedSidebar, MobileSidebarContent } from "./components/layout/AnimatedSidebar";
import TipsModal from "./components/dashboard/TipsModal";
import CollaborateModal from "./components/layout/CollaborateModal";
import AvaChatPod from "./components/layout/AvaChatPod";
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails, getMyInvitation, getMyRecords } from '@/lib/resolveMyWedding';
import { createPageUrl } from '@/utils';
import { Toaster } from 'react-hot-toast';

const SIDEBAR_WIDTH = 200;
const TOP_BAR_H = 48;

const noLayoutPages = [
  "Home", "Features", "Pricing", "CouplesStudio", "PlanSelection",
  "Onboarding", "PaymentWall",
];

const PJS = "'Plus Jakarta Sans', sans-serif";

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('oi_user') || '{}'); } catch { return {}; }
}

// ── Full-width top navigation bar ────────────────────────────────────────────
function TopBar({ weddingDetails, unreadCount, onCollaborate }) {
  const navigate = useNavigate();
  const [weather, setWeather] = useState(null);

  // Derive couple name from entity fields
  const couple1 = weddingDetails?.couple1Name || '';
  const couple2 = weddingDetails?.couple2Name || '';
  const coupleName = couple1 && couple2 ? `${couple1} & ${couple2}` : couple1 || couple2 || '';

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
  // range, current conditions on/near the day. Never throws — a failure at
  // any stage (no address, geocoding miss, API error) just leaves it unset.
  useEffect(() => {
    let cancelled = false;
    getWeddingWeather(weddingDetails).then(w => { if (!cancelled) setWeather(w); }).catch(() => {});
    return () => { cancelled = true; };
  }, [weddingDetails?.mainCeremony?.address, weddingDetails?.reception?.address, weddingDetails?.weddingDate]);

  const WEATHER_ICONS = { Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning };
  const WeatherIcon = weather ? (WEATHER_ICONS[weather.icon] || Cloud) : null;
  // weather.js always fetches Celsius (Open-Meteo default) — the °F toggle in
  // Account → Settings only affects this display conversion, not the fetch.
  const tempUnit = storedUser.tempUnit === 'F' ? 'F' : 'C';
  const toDisplayTemp = (c) => tempUnit === 'F' ? Math.round(c * 9 / 5 + 32) : Math.round(c);
  const weatherText = weather
    ? weather.mode === 'current'
      ? `${toDisplayTemp(weather.temp)}°${tempUnit}${weather.label ? ` · ${weather.label}` : ''}`
      : `${toDisplayTemp(weather.high)}°/${toDisplayTemp(weather.low)}°${tempUnit}${weather.label ? ` · ${weather.label}` : ''}`
    : '';

  const handleLogout = () => {
    track('user_logged_out');
    analyticsReset();
    crispReset();
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
    <div
      className="hidden lg:flex"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: TOP_BAR_H,
        zIndex: 50, background: '#0A0A0A',
        alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      {/* Left: logo + wedding info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, overflow: 'hidden' }}>
        {/* Logo */}
        <img
          src="https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png"
          alt="Openinvite"
          onClick={() => navigate('/Dashboard')}
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
            {weather && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.4)', fontFamily: PJS, whiteSpace: 'nowrap', flexShrink: 0 }}>
                <WeatherIcon size={12} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                {weatherText}
              </span>
            )}
          </>
        )}
      </div>

      {/* Center: search pill */}
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 999, padding: '5px 14px', width: 220 }}>
          <Search size={13} style={{ color: 'rgba(255,255,255,0.45)', flexShrink: 0 }} />
          <input
            placeholder="Search…"
            style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13, fontFamily: PJS, width: '100%' }}
          />
        </div>
      </div>

      {/* Right: bell + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Bell */}
        <button
          onClick={() => navigate(createPageUrl('Messages'))}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.55)', padding: 6, borderRadius: 999,
            display: 'flex', alignItems: 'center', position: 'relative',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
        >
          <Bell size={16} strokeWidth={1.8} />
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: 5, right: 5, width: 5, height: 5, borderRadius: '50%', background: '#E03553' }} />
          )}
        </button>

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
          <DropdownMenuContent align="end" style={{ minWidth: 220, borderRadius: 0, fontFamily: PJS }}>
            <DropdownMenuLabel style={{ fontFamily: PJS, padding: '10px 14px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>
                {storedUser.full_name || coupleName || 'Your account'}
              </p>
              {storedUser.email && (
                <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: '2px 0 0', fontWeight: 400 }}>
                  {storedUser.email}
                </p>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/account')} style={{ fontFamily: PJS, fontSize: 13, cursor: 'pointer' }}>
              Account
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCollaborate} style={{ fontFamily: PJS, fontSize: 13, cursor: 'pointer' }}>
              Collaborate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} style={{ fontFamily: PJS, fontSize: 13, cursor: 'pointer', color: '#E03553' }}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [showCollaborateModal, setShowCollaborateModal] = React.useState(false);
  const [showTipsModal, setShowTipsModal] = React.useState(false);
  const [chatOpen, setChatOpen] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = React.useState(0);
  const [weddingName, setWeddingName] = React.useState('');
  const [weddingDetails, setWeddingDetails] = React.useState(null);

  React.useEffect(() => {
    const handler = () => setChatOpen(true);
    window.addEventListener('openAva', handler);
    return () => window.removeEventListener('openAva', handler);
  }, []);

  const fetchData = React.useCallback(async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      try {
        const messages = await getMyRecords('GuestMessage');
        setUnreadMessagesCount(messages.filter(m => !m.read).length);
      } catch {}
      try {
        const invitation = await getMyInvitation();
        if (invitation) setWeddingName(invitation.couple_names);
      } catch {}
      try {
        setWeddingDetails(await getMyWeddingDetails());
      } catch {}
    } catch {}
  }, []);

  React.useEffect(() => { fetchData(); }, [fetchData, location.pathname]);

  React.useEffect(() => {
    window.addEventListener('weddingDetailsSaved', fetchData);
    return () => window.removeEventListener('weddingDetailsSaved', fetchData);
  }, [fetchData]);

  // Trial banner: show only when user is on trial (no paid plan) and trial hasn't expired
  const trialBanner = React.useMemo(() => {
    if (!user) return null;
    const plan = user.plan;
    if (plan === 'pro' || plan === 'ultra') return null; // paid — no banner

    const trialStart = user.trialStartedAt ? new Date(user.trialStartedAt) : null;
    const trialStartFallback = user.created_date ? new Date(user.created_date) : new Date();
    const start = trialStart || trialStartFallback;
    const trialEnd = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.max(0, Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24)));

    if (daysLeft === 0) return { expired: true, daysLeft: 0 };
    return { expired: false, daysLeft };
  }, [user]);

  if (noLayoutPages.includes(currentPageName)) return <>{children}</>;

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
        unreadCount={unreadMessagesCount}
        onCollaborate={() => setShowCollaborateModal(true)}
      />

      {/* ── Trial banner (desktop only, below top bar) ───────── */}
      {trialBanner && (
        <div
          className="hidden lg:flex"
          style={{
            position: 'fixed',
            top: TOP_BAR_H,
            left: 0,
            right: 0,
            height: 36,
            zIndex: 49,
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
              ? 'Your free trial has ended.'
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
          topOffset={TOP_BAR_H + (trialBanner ? 36 : 0)}
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
          borderBottom: '1px solid rgba(10,10,10,0.08)',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        <img
          src="https://static.wixstatic.com/media/d2df22_ed803ca7c6de491a90af0df6d06a8e54~mv2.png"
          alt="Openinvite"
          style={{ height: 20, width: 'auto', objectFit: 'contain' }}
        />
        <button
          onClick={() => setMobileMenuOpen(true)}
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
        <SheetContent side="left" className="w-72 p-0" style={{ borderRight: '1px solid #E4E4E4' }}>
          <MobileSidebarContent
            weddingName={weddingName}
            onClose={() => setMobileMenuOpen(false)}
            onCollaborate={() => { setMobileMenuOpen(false); setShowCollaborateModal(true); }}
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
      {/* Desktop: right of sidebar, below top bar (+ trial banner if active) */}
      <div
        className="hidden lg:block page-content"
        style={{ marginLeft: SIDEBAR_WIDTH, paddingTop: TOP_BAR_H + (trialBanner ? 36 : 0) }}
      >
        {children}
      </div>

      {/* Mobile: full width, below mobile top bar */}
      <div
        className="lg:hidden page-content"
        style={{ paddingTop: 64 }}
      >
        {children}
      </div>
    </div>
  );
}
