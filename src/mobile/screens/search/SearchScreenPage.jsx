import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ListChecks } from 'lucide-react';
import { SearchScreen, RowGroup, Row } from '../../ui';
import { FEATURES } from '../../features/registry';
import { initials } from '../../lib/format';

/**
 * Global search over guests, tasks, vendors and features by name.
 * Presentational: takes the lists; the container passes real data, the
 * preview passes fixtures. Renders as the full-screen search view.
 */
export default function SearchScreenPage({ guests = [], tasks = [], vendors = [], base = '/m', onClose }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const s = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!s) return null;
    const hit = (v) => (v || '').toLowerCase().includes(s);
    return {
      features: FEATURES.filter((f) => hit(f.label)).slice(0, 6),
      guests: guests.filter((g) => hit(g.name) || hit(g.email)).slice(0, 8),
      tasks: tasks.filter((t) => hit(t.title)).slice(0, 6),
      vendors: vendors.filter((v) => hit(v.name) || hit(v.category)).slice(0, 6),
    };
  }, [s, guests, tasks, vendors]);
  const go = (path) => { onClose?.(); navigate(path); };
  const featurePath = (f) => (f.path.startsWith('../') ? `${base}/${f.path.slice(3)}` : `${base}/plan/${f.path}`);
  const empty = results && !results.features.length && !results.guests.length && !results.tasks.length && !results.vendors.length;
  return (
    <SearchScreen open onClose={onClose} value={q} onChange={setQ} placeholder="Guests, tasks, vendors, features">
      <div className="oi-m-stack oi-m-stack--24" style={{ paddingTop: 8 }}>
        {!results ? (
          <p className="oi-m-meta">Try a guest's name, a task, a vendor, or a part of the planner.</p>
        ) : empty ? (
          <p className="oi-m-meta">Nothing matches that.</p>
        ) : (
          <>
            {results.features.length > 0 && (
              <section>
                <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Planner</h2>
                <RowGroup>{results.features.map((f) => <Row key={f.key} icon={f.icon} tile="sand" label={f.label} onClick={() => go(featurePath(f))} />)}</RowGroup>
              </section>
            )}
            {results.guests.length > 0 && (
              <section>
                <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Guests</h2>
                <RowGroup>{results.guests.map((g) => <Row key={g.id} initials={initials(g.name)} label={g.name} sub={g.email} onClick={() => go(`${base}/guests/${g.id}`)} />)}</RowGroup>
              </section>
            )}
            {results.tasks.length > 0 && (
              <section>
                <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Tasks</h2>
                <RowGroup>{results.tasks.map((t) => <Row key={t.id} icon={ListChecks} tile={t.completed ? 'ok' : 'warn'} label={t.title} sub={t.completed ? 'Done' : 'Open'} onClick={() => go(`${base}/plan/checklist`)} />)}</RowGroup>
              </section>
            )}
            {results.vendors.length > 0 && (
              <section>
                <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Vendors</h2>
                <RowGroup>{results.vendors.map((v) => <Row key={v.id} icon={Store} tile="ink" label={v.name} sub={v.category} onClick={() => go(`${base}/plan/vendors`)} />)}</RowGroup>
              </section>
            )}
          </>
        )}
      </div>
    </SearchScreen>
  );
}
