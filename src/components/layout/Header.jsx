import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind, X } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Guest } from '@/entities/Guest';
import { Budget } from '@/entities/Budget';
import { Schedule } from '@/entities/Schedule';

const PJS = "'Plus Jakarta Sans', sans-serif";

function WeatherIcon({ code, size = 16 }) {
  const s = { strokeWidth: 1.8 };
  if (code === 0 || code === 1)  return <Sun size={size} {...s} />;
  if (code <= 3)                 return <Cloud size={size} {...s} />;
  if (code <= 48)                return <Wind size={size} {...s} />;
  if (code <= 67)                return <CloudRain size={size} {...s} />;
  if (code <= 77)                return <CloudSnow size={size} {...s} />;
  if (code <= 82)                return <CloudRain size={size} {...s} />;
  if (code <= 86)                return <CloudSnow size={size} {...s} />;
  return <CloudLightning size={size} {...s} />;
}

function Sep() {
  return <div style={{ width: 1, height: 20, background: 'rgba(10,10,10,0.1)', flexShrink: 0 }} />;
}

function getCoupleInfo() {
  const name = localStorage.getItem('oi_couple_name') || '';
  const dateStr = localStorage.getItem('oi_wedding_date') || '';
  if (!dateStr) return { name, formattedDate: '', daysToGo: null };
  const d = new Date(dateStr);
  const daysToGo = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
  const formattedDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return { name, formattedDate, daysToGo };
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('oi_user') || '{}'); } catch { return {}; }
}

function getInitials(weddingName, email) {
  if (weddingName) {
    const parts = weddingName.split(/\s*[&+,]\s*/);
    return parts.map(p => p.trim()[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  }
  return (email || 'U').slice(0, 2).toUpperCase();
}

export default function Header({ weddingName, onAccountSettings, unreadCount }) {
  const [weather, setWeather] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('oi_weather') || 'null');
      if (cached && Date.now() - cached.ts < 30 * 60 * 1000) return cached.data;
    } catch {}
    return null;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchData, setSearchData] = useState({ guests: [], budget: [], schedule: [] });
  const [avatarOpen, setAvatarOpen] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const avatarRef = useRef(null);

  const { name: coupleName, formattedDate, daysToGo } = getCoupleInfo();
  const displayName = coupleName || weddingName || 'Your wedding';
  const storedUser = getStoredUser();
  const initials = getInitials(displayName, storedUser.email);

  useEffect(() => {
    loadSearchData();
    if (!weather) loadWeather();

    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchQuery(''); setSearchResults([]);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadSearchData = async () => {
    try {
      const [guests, budget, schedule] = await Promise.all([Guest.list(), Budget.list(), Schedule.list()]);
      setSearchData({ guests, budget, schedule });
    } catch {}
  };

  const loadWeather = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current_weather=true`);
        const data = await res.json();
        const w = { temp: Math.round(data.current_weather.temperature), code: data.current_weather.weathercode };
        setWeather(w);
        localStorage.setItem('oi_weather', JSON.stringify({ data: w, ts: Date.now() }));
      } catch {}
    }, () => {});
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); return; }
    const q = query.toLowerCase();
    const results = [];
    searchData.guests.forEach(g => {
      if (g.name?.toLowerCase().includes(q) || g.email?.toLowerCase().includes(q))
        results.push({ type: 'Guest', title: g.name, sub: g.email, url: createPageUrl('Guests') });
    });
    searchData.budget.forEach(b => {
      if (b.item_name?.toLowerCase().includes(q))
        results.push({ type: 'Budget', title: b.item_name, sub: b.category, url: createPageUrl('Budget') });
    });
    searchData.schedule.forEach(s => {
      if (s.event_name?.toLowerCase().includes(q))
        results.push({ type: 'Schedule', title: s.event_name, sub: s.event_date, url: createPageUrl('Schedule') });
    });
    setSearchResults(results.slice(0, 8));
  };

  const handleLogout = () => {
    localStorage.removeItem('oi_auth');
    localStorage.removeItem('oi_user');
    window.location.href = '/login';
  };

  return (
    <div style={{
      height: 64,
      background: '#FFFFFF',
      borderBottom: '1px solid rgba(10,10,10,0.08)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 20,
      flexShrink: 0,
    }}>

      {/* Left: couple name + date + days-to-go */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.01em', fontFamily: PJS, lineHeight: 1.2 }}>
          {displayName}
        </span>
        {formattedDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>{formattedDate}</span>
            {daysToGo !== null && (
              <>
                <span style={{ width: 2, height: 2, borderRadius: '50%', background: 'rgba(10,10,10,0.25)', display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#E03553', fontFamily: PJS }}>
                  {daysToGo > 0 ? `${daysToGo} days to go` : daysToGo === 0 ? 'Today!' : 'Past'}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Centre: search */}
      <div ref={searchRef} style={{ flex: 1, maxWidth: 360, position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search guests, budget, events…"
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid rgba(10,10,10,0.18)',
            borderRadius: 0,
            outline: 'none',
            padding: '6px 20px 6px 0',
            fontSize: 14,
            fontWeight: 500,
            color: '#0A0A0A',
            fontFamily: PJS,
            transition: 'border-color 0.2s, border-width 0.2s',
          }}
          onFocus={e => { e.target.style.borderBottomColor = '#E03553'; e.target.style.borderBottomWidth = '2px'; }}
          onBlur={e => { e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'; e.target.style.borderBottomWidth = '1px'; }}
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); setSearchResults([]); }}
            style={{ position: 'absolute', right: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.35)', padding: 2, display: 'flex' }}
          >
            <X size={13} strokeWidth={2} />
          </button>
        )}
        {(searchResults.length > 0 || (searchQuery && searchResults.length === 0)) && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.1)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.09)', zIndex: 200, maxHeight: 280, overflowY: 'auto',
          }}>
            {searchResults.length === 0 ? (
              <p style={{ padding: '12px 16px', fontSize: 13, color: '#444444', margin: 0 }}>No results for "{searchQuery}"</p>
            ) : searchResults.map((r, i) => (
              <React.Fragment key={i}>
                {i > 0 && <div style={{ height: 1, background: 'rgba(10,10,10,0.06)', margin: '0 12px' }} />}
                <div
                  onClick={() => { navigate(r.url); setSearchQuery(''); setSearchResults([]); }}
                  style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10,10,10,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: 0 }}>{r.title}</p>
                    {r.sub && <p style={{ fontSize: 11, color: '#444444', margin: 0 }}>{r.sub}</p>}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(10,10,10,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{r.type}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Right cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>

        {weather && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(10,10,10,0.6)' }}>
              <WeatherIcon code={weather.code} size={15} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS }}>{weather.temp}°</span>
            </div>
            <Sep />
          </>
        )}

        {/* Bell */}
        <button
          onClick={() => navigate(createPageUrl('Messages'))}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'rgba(10,10,10,0.45)', padding: 6, borderRadius: 999,
            display: 'flex', alignItems: 'center', position: 'relative',
            transition: 'color 0.2s, background 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#0A0A0A'; e.currentTarget.style.background = 'rgba(10,10,10,0.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(10,10,10,0.45)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <Bell size={17} strokeWidth={1.8} />
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: 5, right: 5, width: 5, height: 5, borderRadius: '50%', background: '#E03553' }} />
          )}
        </button>

        <Sep />

        {/* Avatar + dropdown */}
        <div ref={avatarRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setAvatarOpen(prev => !prev)}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #E03553, #803D81)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: PJS,
              letterSpacing: '0.02em',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {initials}
          </button>

          {avatarOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.1)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.09)', zIndex: 400, minWidth: 220,
            }}>
              {/* User info */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: 0 }}>
                  {storedUser.full_name || displayName}
                </p>
                {storedUser.email && (
                  <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '2px 0 0' }}>
                    {storedUser.email}
                  </p>
                )}
              </div>

              {/* Account settings */}
              <button
                onClick={() => { setAvatarOpen(false); onAccountSettings(); }}
                style={{ width: '100%', textAlign: 'left', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#0A0A0A', fontFamily: PJS, display: 'block' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10,10,10,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
              >
                Account settings
              </button>

              <div style={{ height: 1, background: 'rgba(10,10,10,0.08)', margin: '2px 0' }} />

              {/* Log out */}
              <button
                onClick={handleLogout}
                style={{ width: '100%', textAlign: 'left', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#E03553', fontFamily: PJS, display: 'block' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,53,83,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
