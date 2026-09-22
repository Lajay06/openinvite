import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Store, ListChecks, Calendar, Receipt, Gift, MessageCircle, History } from 'lucide-react';
import { SearchScreen, RowGroup, Row } from '../../ui';
import { FEATURES } from '../../features/registry';
import { initials, money, dateShort } from '../../lib/format';
import { budgetCategoryLabel } from '@/lib/budgetCategories';
import { prefGet, prefSet } from '../../native';

const RECENT_PREF = 'search_recent';
const RECENT_MAX = 5;

/**
 * Global search (goal 7): the entities the desktop's top bar searches
 * (planner pages, guests, vendors, to-dos) plus events, budget items,
 * registry items and messages. Every result navigates to its own
 * destination; the query rides in ?q= so back returns here with it intact.
 * Return (the keyboard's search key) opens the top result. With the field
 * empty, the last five searches show, with a clear button.
 *
 * Presentational over lists: the container passes real data, the preview
 * passes fixtures.
 */
export default function SearchScreenPage({ guests = [], tasks = [], vendors = [], schedule = [], budget = [], registry = [], messages = [], symbol = '$', base = '/m', onClose }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const setQ = (v) => { const next = new URLSearchParams(params); if (v) next.set('q', v); else next.delete('q'); setParams(next, { replace: true }); };
  const s = q.trim().toLowerCase();
  const hit = useCallback((v) => (v || '').toLowerCase().includes(s), [s]);

  const [recent, setRecent] = useState([]);
  useEffect(() => { prefGet(RECENT_PREF).then((v) => { try { setRecent(JSON.parse(v || '[]')); } catch { setRecent([]); } }); }, []);
  const remember = (term) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, RECENT_MAX);
    setRecent(next);
    prefSet(RECENT_PREF, JSON.stringify(next)).catch(() => {});
  };
  const clearRecent = () => { setRecent([]); prefSet(RECENT_PREF, '[]').catch(() => {}); };

  const featurePath = (f) => (f.path.startsWith('../') ? `${base}/${f.path.slice(3)}` : `${base}/plan/${f.path}`);
  const groups = useMemo(() => {
    if (!s) return null;
    const registryKind = { product: 'products', link: 'links', fund: 'funds' };
    const out = [
      { key: 'features', title: 'Planner', items: FEATURES.filter((f) => hit(f.label)).slice(0, 6).map((f) => ({ id: f.key, icon: f.icon, tile: 'neutral', label: f.label, to: featurePath(f) })) },
      { key: 'guests', title: 'Guests', items: guests.filter((g) => hit(g.name) || hit(g.email)).slice(0, 8).map((g) => ({ id: g.id, initials: initials(g.name), label: g.name, sub: g.email, to: `${base}/guests/${g.id}` })) },
      { key: 'tasks', title: 'Tasks', items: tasks.filter((t) => hit(t.title)).slice(0, 6).map((t) => ({ id: t.id, icon: ListChecks, tile: t.completed ? 'ok' : 'warn', label: t.title, sub: t.completed ? 'Done' : t.due_date ? `Due ${dateShort(t.due_date)}` : 'Open', to: `${base}/plan/checklist?task=${encodeURIComponent(t.id)}` })) },
      { key: 'events', title: 'Events', items: schedule.filter((e) => hit(e.event_name) || hit(e.location)).slice(0, 6).map((e) => ({ id: e.id, icon: Calendar, tile: 'neutral', label: e.event_name, sub: [e.event_date ? dateShort(e.event_date) : '', e.location].filter(Boolean).join(', '), to: `${base}/plan/schedule?event=${encodeURIComponent(e.id)}` })) },
      { key: 'vendors', title: 'Vendors', items: vendors.filter((v) => hit(v.name) || hit(v.category)).slice(0, 6).map((v) => ({ id: v.id, icon: Store, tile: 'ink', label: v.name, sub: v.category, to: `${base}/plan/vendors/${v.id}` })) },
      { key: 'budget', title: 'Budget', items: budget.filter((b) => hit(b.item_name) || hit(b.vendor) || hit(budgetCategoryLabel(b.category))).slice(0, 6).map((b) => ({ id: b.id, icon: Receipt, tile: b.paid ? 'ok' : 'warn', label: b.item_name, sub: [budgetCategoryLabel(b.category), b.vendor].filter(Boolean).join(', '), value: money(b.actual_amount || b.budgeted_amount, symbol), to: `${base}/plan/budget?expense=${encodeURIComponent(b.id)}` })) },
      { key: 'registry', title: 'Registry', items: registry.filter((r) => hit(r.name) || hit(r.store_name) || hit(r.title) || hit(r.registry_platform)).slice(0, 6).map((r) => ({ id: r.id, icon: Gift, tile: 'tint', label: r.name || r.store_name || r.title, sub: r.kind === 'product' ? [r.registry_platform, r.price ? money(r.price, symbol) : ''].filter(Boolean).join(', ') : r.kind === 'fund' ? 'Cash fund' : 'Registry platform', to: `${base}/plan/registry?segment=${registryKind[r.kind] || 'products'}&item=${encodeURIComponent(r.id)}` })) },
      { key: 'messages', title: 'Messages', items: messages.filter((m) => hit(m.guest_name) || hit(m.message) || hit(m.subject)).slice(0, 6).map((m) => ({ id: m.id, icon: MessageCircle, tile: m.read ? 'neutral' : 'primary', label: m.guest_name || 'A guest', sub: (m.subject || m.message || '').slice(0, 80), to: `${base}/plan/messages/${m.id}` })) },
    ];
    return out.filter((g) => g.items.length);
  }, [s, hit, guests, tasks, vendors, schedule, budget, registry, messages, symbol, base]);

  // Open a result: remember the query, go. Back returns here with ?q= intact.
  const go = (r) => { remember(q); navigate(r.to); };
  const top = groups?.[0]?.items?.[0] || null;

  return (
    <SearchScreen open onClose={onClose} value={q} onChange={setQ} onSubmit={() => { if (top) go(top); }} placeholder="Guests, tasks, vendors, events, budget">
      <div className="oi-m-stack oi-m-stack--24" style={{ paddingTop: 8 }}>
        {!groups ? (
          recent.length ? (
            <section>
              <div className="oi-m-section-head">
                <h2 className="oi-m-section">Recent</h2>
                <button type="button" className="oi-m-block__link" onClick={clearRecent}>Clear</button>
              </div>
              <RowGroup>{recent.map((r) => <Row key={r} icon={History} tile="neutral" label={r} onClick={() => setQ(r)} chevron={false} />)}</RowGroup>
            </section>
          ) : <p className="oi-m-meta">Try a guest's name, a task, a vendor, an event, an expense, or a part of the planner.</p>
        ) : groups.length === 0 ? (
          <p className="oi-m-meta">Nothing matches that.</p>
        ) : groups.map((g) => (
          <section key={g.key}>
            <h2 className="oi-m-section" style={{ marginBottom: 12 }}>{g.title}</h2>
            <RowGroup>{g.items.map((r) => <Row key={r.id} icon={r.icon} initials={r.initials} tile={r.tile} label={r.label} sub={r.sub} value={r.value} onClick={() => go(r)} />)}</RowGroup>
          </section>
        ))}
      </div>
    </SearchScreen>
  );
}
