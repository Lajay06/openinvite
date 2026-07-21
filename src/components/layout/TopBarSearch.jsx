import React, { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, Store, ListTodo, FileText } from "lucide-react";
import { createPageUrl } from "@/utils";
import { getMyRecords } from "@/lib/resolveMyWedding";
import { NAV_SECTIONS } from "./AnimatedSidebar";
import { preloadPageChunk } from "@/pagePreload";

const PJS = "'Plus Jakarta Sans', sans-serif";
const MAX_PER_GROUP = 5;

// Flattened once at module load — same data the sidebar renders, so a page
// found by search is guaranteed to be a page that's actually reachable.
const SEARCHABLE_PAGES = NAV_SECTIONS.flatMap(section => section.items.map(item => ({
  type: 'page',
  id: item.url,
  label: item.label,
  sublabel: section.label,
  url: item.url,
  icon: item.icon,
})));

function TypeIcon({ type, icon: PageIcon }) {
  if (type === 'page') return <PageIcon size={13} strokeWidth={1.8} style={{ color: 'rgba(10,10,10,0.45)', flexShrink: 0 }} />;
  if (type === 'guest') return <Users size={13} strokeWidth={1.8} style={{ color: 'rgba(10,10,10,0.45)', flexShrink: 0 }} />;
  if (type === 'vendor') return <Store size={13} strokeWidth={1.8} style={{ color: 'rgba(10,10,10,0.45)', flexShrink: 0 }} />;
  return <ListTodo size={13} strokeWidth={1.8} style={{ color: 'rgba(10,10,10,0.45)', flexShrink: 0 }} />;
}

export default function TopBarSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasFocused, setHasFocused] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Fetched once, on first focus — not on every keystroke. Guests/vendors/
  // to-dos rarely change mid-session, and a stale-for-a-few-minutes result
  // is a fine tradeoff against re-fetching on every character typed.
  const { data } = useQuery({
    queryKey: ['topbarSearchData'],
    queryFn: async () => {
      const [guests, vendors, notes] = await Promise.all([
        getMyRecords('Guest', undefined, 500).catch(() => []),
        getMyRecords('Vendor').catch(() => []),
        getMyRecords('Note').catch(() => []),
      ]);
      return { guests, vendors, todos: notes.filter(n => n.view_type === 'todo') };
    },
    enabled: hasFocused,
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const pages = SEARCHABLE_PAGES
      .filter(p => p.label.toLowerCase().includes(q))
      .slice(0, MAX_PER_GROUP);

    const guests = (data?.guests || [])
      .filter(g => g.name?.toLowerCase().includes(q))
      .slice(0, MAX_PER_GROUP)
      .map(g => ({ type: 'guest', id: g.id, label: g.name, sublabel: g.rsvp_status ? g.rsvp_status[0].toUpperCase() + g.rsvp_status.slice(1) : 'Guest', url: createPageUrl('Guests') }));

    const vendors = (data?.vendors || [])
      .filter(v => v.name?.toLowerCase().includes(q))
      .slice(0, MAX_PER_GROUP)
      .map(v => ({ type: 'vendor', id: v.id, label: v.name, sublabel: v.category ? v.category[0].toUpperCase() + v.category.slice(1) : 'Vendor', url: createPageUrl('Vendors') }));

    const todos = (data?.todos || [])
      .filter(t => t.title?.toLowerCase().includes(q))
      .slice(0, MAX_PER_GROUP)
      .map(t => ({ type: 'todo', id: t.id, label: t.title, sublabel: t.status || 'To do', url: createPageUrl('TodoList') }));

    return [...pages, ...guests, ...vendors, ...todos];
  }, [query, data]);

  const groups = useMemo(() => {
    const order = ['page', 'guest', 'vendor', 'todo'];
    const labels = { page: 'Pages', guest: 'Guests', vendor: 'Vendors', todo: 'To-dos' };
    return order
      .map(type => ({ type, label: labels[type], items: results.filter(r => r.type === type) }))
      .filter(g => g.items.length > 0);
  }, [results]);

  const goTo = (result) => {
    if (!result) return;
    preloadPageChunk(result.url);
    navigate(result.url);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      goTo(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  useEffect(() => { setActiveIndex(0); }, [query]);

  let flatIndex = -1;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 999, padding: '5px 14px', width: 220 }}>
        <Search size={13} style={{ color: 'rgba(255,255,255,0.45)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          placeholder="Search…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setHasFocused(true); if (query.trim()) setOpen(true); }}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-autocomplete="list"
          aria-controls="topbar-search-results"
          style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 13, fontFamily: PJS, width: '100%' }}
        />
      </div>

      {open && query.trim() && (
        <div
          id="topbar-search-results"
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
            width: 320, maxHeight: 400, overflowY: 'auto',
            background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.08)',
            boxShadow: '0 8px 24px rgba(10,10,10,0.18)', zIndex: 200,
          }}
        >
          {groups.length === 0 ? (
            <div style={{ padding: '20px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0 }}>
                No results for "{query.trim()}"
              </p>
            </div>
          ) : groups.map(group => (
            <div key={group.type}>
              <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
                {group.label}
              </div>
              {group.items.map(item => {
                flatIndex++;
                const idx = flatIndex;
                const active = idx === activeIndex;
                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => goTo(item)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 14px', cursor: 'pointer',
                      background: active ? 'rgba(224,53,83,0.06)' : 'transparent',
                    }}
                  >
                    <TypeIcon type={item.type} icon={item.icon || FileText} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, color: '#0A0A0A', fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, flexShrink: 0 }}>
                      {item.sublabel}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
