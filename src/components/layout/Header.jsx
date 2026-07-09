import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { getMyRecords } from '@/lib/resolveMyWedding';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function Header({ weddingName }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchData, setSearchData] = useState({ guests: [], budget: [], schedule: [] });
  const navigate = useNavigate();
  const searchRef = useRef(null);

  useEffect(() => {
    loadSearchData();
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchQuery(''); setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadSearchData = async () => {
    try {
      const [guests, budget, schedule] = await Promise.all([getMyRecords('Guest'), getMyRecords('Budget'), getMyRecords('Schedule')]);
      setSearchData({ guests, budget, schedule });
    } catch {}
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

  return (
    <div style={{
      height: 48,
      background: '#FFFFFF',
      borderBottom: '1px solid rgba(10,10,10,0.08)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 20,
    }}>
      {/* Left: wedding name / page context */}
      <span style={{
        fontSize: 13, fontWeight: 700, color: '#0A0A0A',
        letterSpacing: '-0.01em', whiteSpace: 'nowrap', flexShrink: 0,
        fontFamily: PJS,
      }}>
        {weddingName || 'Your wedding'}
      </span>

      {/* Centre: search */}
      <div ref={searchRef} style={{ flex: 1, maxWidth: 400, position: 'relative', display: 'flex', alignItems: 'center' }}>
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
            padding: '4px 20px 4px 0',
            fontSize: 13,
            fontWeight: 500,
            color: '#0A0A0A',
            fontFamily: PJS,
          }}
          onFocus={e => { e.target.style.borderBottomColor = '#E03553'; e.target.style.borderBottomWidth = '2px'; }}
          onBlur={e => { e.target.style.borderBottomColor = 'rgba(10,10,10,0.18)'; e.target.style.borderBottomWidth = '1px'; }}
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); setSearchResults([]); }}
            style={{ position: 'absolute', right: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.35)', padding: 2, display: 'flex' }}
          >
            <X size={12} strokeWidth={2} />
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
                  style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10,10,10,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: 0 }}>{r.title}</p>
                    {r.sub && <p style={{ fontSize: 11, color: '#444444', margin: 0 }}>{r.sub}</p>}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
