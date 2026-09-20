import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, ListChecks, Globe, UserRound } from 'lucide-react';
import { hapticLight } from '../native';

export const TABS = [
  { key: 'home', label: 'Home', icon: Home, path: '' },
  { key: 'guests', label: 'Guests', icon: Users, path: 'guests' },
  { key: 'plan', label: 'Plan', icon: ListChecks, path: 'plan' },
  { key: 'site', label: 'Site', icon: Globe, path: 'site' },
  { key: 'account', label: 'Account', icon: UserRound, path: 'account' },
];

/** Which tab a path under `base` belongs to. */
export function activeTabFor(pathname, base) {
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  const first = rest.replace(/^\/+/, '').split('/')[0] || '';
  return TABS.find((t) => t.path === first)?.key || 'home';
}

/** Five tabs. Active: primary text, weight 600, a 2px #E03553 line above the icon. */
export default function TabBar({ base }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = activeTabFor(pathname, base);
  return (
    <nav className="oi-m-tabbar" aria-label="Main">
      {TABS.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            className={`oi-m-tab${on ? ' oi-m-tab--on' : ''}`}
            aria-current={on ? 'page' : undefined}
            onClick={() => {
              if (!on) hapticLight();
              navigate(`${base}${t.path ? `/${t.path}` : ''}`);
            }}
          >
            <t.icon size={24} strokeWidth={on ? 2 : 1.5} />
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
