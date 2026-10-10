import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, LayoutGrid, Globe, UserRound } from 'lucide-react';
import { hapticLight } from '../native';

export const TABS = [
  { key: 'home', label: 'Home', icon: Home, path: '' },
  { key: 'guests', label: 'Guests', icon: Users, path: 'guests' },
  { key: 'plan', label: 'Plan', icon: LayoutGrid, path: 'plan' },
  { key: 'site', label: 'Guest suite', icon: Globe, path: 'site' }, // Guest suite is the brand's name for the couple's guest-facing pages (goal 6)
  { key: 'account', label: 'Account', icon: UserRound, path: 'account' },
];

/** Which tab a path under `base` belongs to. */
export function activeTabFor(pathname, base) {
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  const first = rest.replace(/^\/+/, '').split('/')[0] || '';
  if (first === 'notifications' || first === 'search') return null;
  return TABS.find((t) => t.path === first)?.key || 'plan';
}

/** A floating white pill. Active: icon and label in primary with a small spring. */
export default function TabBar({ base }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = activeTabFor(pathname, base);
  return (
    <nav className="oi-m-tabbar" aria-label="Main" role="tablist">
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            className={`oi-m-tab${on ? ' oi-m-tab--on' : ''}`}
            role="tab"
            aria-selected={on}
            aria-current={on ? 'page' : undefined}
            onClick={() => { if (!on) hapticLight(); navigate(`${base}${t.path ? `/${t.path}` : ''}`); }}
          >
            <span className="oi-m-tab__icon"><t.icon size={24} strokeWidth={on ? 2.2 : 1.6} /></span>
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
