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
import { ASSET } from '@/components/public/OpeninviteLogo';
import { PRODUCT_SHORT, ROUTES } from '@/lib/professionalBrand';
import EventSwitcher from './EventSwitcher';
import { PRO, PJS } from './proTheme';
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

/** The full logo, the asset itself on the dark bar, and "Professional" at the wordmark's size and weight. */
export function ProLogo({ size = 18 }) {
  const scale = size / (ASSET.mark.y1 - ASSET.mark.y0 + 1);
  const wordH = (ASSET.word.y1 - ASSET.word.y0 + 1) * scale;
  const fontSize = Math.round(wordH / 0.95);
  const drop = Math.round(((ASSET.word.y0 + ASSET.word.y1) / 2 - (ASSET.mark.y0 + ASSET.mark.y1) / 2) * scale);
  return (
    <Link to={A} aria-label={`Openinvite ${PRODUCT_SHORT}`} style={{ display: 'inline-flex', alignItems: 'flex-start', gap: Math.round(44 * scale) + 2, textDecoration: 'none', flexShrink: 0 }}>
      <img src="/openinvite-logo.png" alt="Openinvite" style={{ height: Math.round(ASSET.height * scale), width: 'auto', display: 'block' }} />
      <span style={{ marginTop: drop - Math.round(fontSize / 2) + Math.round(size / 2) - 1, fontSize, lineHeight: 1, fontWeight: 700, color: PRO.onDark, fontFamily: PJS, whiteSpace: 'nowrap' }}>
        {PRODUCT_SHORT}
      </span>
    </Link>
  );
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
            borderLeft: `2px solid ${isActive ? PRO.red : 'transparent'}`,
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
    <div style={{ minHeight: '100vh', background: PRO.work, fontFamily: PJS, color: PRO.text }}>
      <header
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: PRO.barHeight, zIndex: 50, background: PRO.bar,
          display: 'flex', alignItems: 'center', gap: mobile ? 10 : 20, padding: mobile ? '0 12px' : '0 16px',
          borderBottom: `1px solid ${PRO.onDarkLine}`,
        }}
      >
        {mobile && (
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            style={{ background: 'transparent', border: 'none', color: PRO.onDark, padding: 4, cursor: 'pointer', display: 'flex' }}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        )}
        <ProLogo size={mobile ? 16 : 18} />
        <EventSwitcher compact={mobile} />
      </header>

      {!mobile && (
        <aside style={{ position: 'fixed', top: PRO.barHeight, left: 0, bottom: 0, width: PRO.sideWidth, background: PRO.bar, overflowY: 'auto' }}>
          <SideNav />
        </aside>
      )}
      {mobile && open && (
        <div role="dialog" aria-label="Menu" style={{ position: 'fixed', top: PRO.barHeight, left: 0, right: 0, bottom: 0, zIndex: 49, background: PRO.bar, overflowY: 'auto' }}>
          <SideNav onNavigate={() => setOpen(false)} />
        </div>
      )}

      <main style={{ paddingTop: PRO.barHeight, marginLeft: mobile ? 0 : PRO.sideWidth, minWidth: 0 }}>
        {notice}
        <div style={{ maxWidth: dayOf ? 520 : undefined, margin: dayOf ? '0 auto' : undefined }}>{children}</div>
      </main>
    </div>
  );
}
