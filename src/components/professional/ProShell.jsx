/**
 * src/components/professional/ProShell.jsx
 *
 * THE WORKPLACE FRAME. A black top bar with the full logo, "Professional"
 * beside it in the same weight, and the event switcher always top left; a
 * black side bar; a #F5F5F5 work area. At 390 the side bar folds into a menu
 * behind a button in the top bar.
 */
import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  CalendarDays, LayoutGrid, ListChecks, Users, Wallet, BookCopy, Contact, Tag, Settings, Menu, X, Smartphone,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { PRODUCT_SHORT, ROUTES, MARK_PNG, BRAND } from '@/lib/professionalBrand';
import EventSwitcher from './EventSwitcher';
import ProAva from './ProAva';
import { PRO, PJS, FOCUS_CSS } from './proTheme';
import { TYPE } from '@/styles/typeScale';

const A = ROUTES.app;
export const NAV = [
  { to: A, label: 'Events', icon: LayoutGrid, end: true },
  { to: `${A}/calendar`, label: 'Calendar', icon: CalendarDays },
  { to: `${A}/tasks`, label: 'Tasks', icon: ListChecks },
  { to: `${A}/vendors`, label: 'Vendor book', icon: Contact },
  { to: `${A}/payments`, label: 'Payments', icon: Wallet },
  { to: `${A}/templates`, label: 'Templates', icon: BookCopy },
  { to: `${A}/day-of`, label: 'Day-of mode', icon: Smartphone },
  { to: `${A}/team`, label: 'Team', icon: Users },
  { to: `${A}/codes`, label: 'Partner codes', icon: Tag },
  { to: `${A}/settings`, label: 'Settings', icon: Settings },
];

/**
 * THE LOCKUP, "Openinvite | Professional" (owner ruling 2026-10-14): the real
 * brand mark recolored to Gilt (a PNG), the wordmark white on black or black
 * on white, a thin divider, and "Professional" in the same weight. No
 * tracking, per the dashboard sweep. `to={null}` renders it without a link
 * (a vendor's or a couple's page).
 */
export function ProLogo({ size = 18, ground = 'dark', to = A }) {
  const ink = ground === 'dark' ? '#FFFFFF' : PRO.text;
  const fontSize = Math.round(size * 0.9);
  const word = { fontSize, fontWeight: 700, color: ink, lineHeight: 1, whiteSpace: 'nowrap', fontFamily: PJS };
  const inner = (
    <span role="img" aria-label={`Openinvite ${PRODUCT_SHORT}`} style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.45), flexShrink: 0 }}>
      <img src={MARK_PNG} alt="" aria-hidden="true" data-pro-mark style={{ height: size, width: 'auto', display: 'block' }} />
      <span style={word}>Openinvite</span>
      <span aria-hidden="true" data-pro-divider style={{ width: 1, height: Math.round(size * 0.9), background: ink, opacity: 0.45 }} />
      <span style={word}>{PRODUCT_SHORT}</span>
    </span>
  );
  if (!to) return inner;
  return <Link to={to} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>{inner}</Link>;
}

function SideNav({ onNavigate }) {
  return (
    <nav aria-label="Professional" style={{ display: 'flex', flexDirection: 'column', padding: '12px 0' }}>
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', fontSize: TYPE.button,
            fontWeight: isActive ? 600 : 500, textDecoration: 'none', fontFamily: PJS,
            color: isActive ? PRO.onDark : PRO.onDarkMuted,
            background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
            borderLeft: `2px solid ${isActive ? BRAND.gilt : 'transparent'}`,
          })}
        >
          <Icon size={14} aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function ProShell({ children, notice = null }) {
  const mobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const dayOf = /\/day-of(\/|$)/.test(pathname);

  return (
    <div className="oi-pro" style={{ minHeight: '100vh', background: PRO.work, fontFamily: PJS, color: PRO.text }}>
      <style>{FOCUS_CSS}</style>
      <header
        className="oi-pro-dark"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: PRO.barHeight, zIndex: 50, background: PRO.bar,
          display: 'flex', alignItems: 'center', gap: mobile ? 10 : 20, padding: '0 16px', minWidth: 0,
          borderBottom: `1px solid ${PRO.onDarkLine}`,
        }}
      >
        {mobile && (
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            style={{ background: 'transparent', border: 'none', color: PRO.onDark, padding: 4, cursor: 'pointer', display: 'flex', flexShrink: 0 }}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        )}
        <ProLogo size={mobile ? 16 : 18} />
        <EventSwitcher compact={mobile} />
      </header>

      {!mobile && (
        <aside className="oi-pro-dark" style={{ position: 'fixed', top: PRO.barHeight, left: 0, bottom: 0, width: PRO.sideWidth, background: PRO.bar, overflowY: 'auto' }}>
          <SideNav />
        </aside>
      )}
      {mobile && open && (
        <div role="dialog" aria-label="Menu" className="oi-pro-dark" style={{ position: 'fixed', top: PRO.barHeight, left: 0, right: 0, bottom: 0, zIndex: 49, background: PRO.bar, overflowY: 'auto' }}>
          <SideNav onNavigate={() => setOpen(false)} />
        </div>
      )}

      <main style={{ paddingTop: PRO.barHeight, marginLeft: mobile ? 0 : PRO.sideWidth, minWidth: 0 }}>
        {notice}
        <div style={{ maxWidth: dayOf ? 520 : undefined, margin: dayOf ? '0 auto' : undefined }}>{children}</div>
      </main>
      <ProAva />
    </div>
  );
}
