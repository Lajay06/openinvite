import React, { useMemo, useState } from 'react';
import { Armchair, Monitor, UserMinus } from 'lucide-react';
import Screen from '../../shell/Screen';
import { Row, RowGroup, PanelCard, EmptyState, ErrorState, SkeletonRows, BottomSheet, PillButton, SelectField } from '../../ui';
import { initials } from '../../lib/format';

/**
 * Seating, as lists: each table and who sits there, plus everyone
 * unassigned. The canvas stays on desktop. Moving a guest goes through a
 * sheet that calls `onMove(guestId, tableName | '')`, the desktop's own
 * assign / unassign helpers.
 */
export default function SeatingScreen({ tables = [], guests = [], onMove, loading, error, onRetry, back, onDesktop }) {
  const [sheet, setSheet] = useState(null); // guest
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);
  const byGuest = useMemo(() => {
    const m = new Map();
    for (const t of tables) for (const a of t.assigned_guests || []) m.set(a.guest_id, t);
    return m;
  }, [tables]);
  const attending = guests.filter((g) => g.rsvp_status === 'attending' || !g.rsvp_status || g.rsvp_status === 'pending');
  const unassigned = attending.filter((g) => !byGuest.has(g.id));
  const name = (id) => guests.find((g) => g.id === id)?.name || 'Guest';
  const options = [{ value: '', label: 'No table' }, ...tables.map((t) => ({ value: t.name, label: `${t.name} (${(t.assigned_guests || []).length} of ${t.capacity || 8})` }))];
  const move = async () => {
    setSaving(true);
    try { await onMove(sheet.id, target); setSheet(null); } finally { setSaving(false); }
  };
  return (
    <Screen title="Seating" subtitle={loading ? '' : `${tables.length} table${tables.length === 1 ? '' : 's'}, ${unassigned.length} unseated`} back={back}>
      <div className="oi-m-stack oi-m-stack--24">
        <PanelCard tone="sand" label="Best on desktop" body="The table layout is drawn on a bigger screen. Here you can see who sits where and move guests between tables." action={onDesktop ? 'Open the layout on desktop' : undefined} onClick={onDesktop} />
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={6} /> : tables.length === 0 ? (
          <EmptyState icon={Armchair} text="No tables yet. Add them on desktop and they show here." />
        ) : (
          <>
            {tables.map((t) => (
              <section key={t.id}>
                <div className="oi-m-section-head">
                  <h2 className="oi-m-section">{t.name}</h2>
                  <span className="oi-m-meta">{(t.assigned_guests || []).length} of {t.capacity || 8}</span>
                </div>
                <RowGroup>
                  {(t.assigned_guests || []).length === 0 ? (
                    <div className="oi-m-row"><div className="oi-m-row__body"><div className="oi-m-row__sub">Nobody seated yet</div></div></div>
                  ) : (t.assigned_guests || []).map((a) => (
                    <Row key={a.guest_id} initials={initials(name(a.guest_id))} label={name(a.guest_id)} sub={`Seat ${(a.seat_index ?? 0) + 1}`} onClick={() => { setSheet(guests.find((g) => g.id === a.guest_id) || { id: a.guest_id, name: name(a.guest_id) }); setTarget(t.name); }} />
                  ))}
                </RowGroup>
              </section>
            ))}
            <section>
              <div className="oi-m-section-head">
                <h2 className="oi-m-section">Not seated yet</h2>
                <span className="oi-m-meta">{unassigned.length}</span>
              </div>
              {unassigned.length === 0 ? (
                <EmptyState icon={Armchair} text="Everyone has a seat." />
              ) : (
                <RowGroup>
                  {unassigned.map((g) => <Row key={g.id} initials={initials(g.name)} label={g.name} sub={g.category ? g.category.replace(/_/g, ' ') : ''} onClick={() => { setSheet(g); setTarget(''); }} />)}
                </RowGroup>
              )}
            </section>
          </>
        )}
      </div>
      <BottomSheet open={!!sheet} onClose={() => setSheet(null)} title={sheet ? `Seat ${sheet.name}` : ''} footer={(
        <>
          <PillButton variant="secondary" onClick={() => setSheet(null)} disabled={saving}>Cancel</PillButton>
          <PillButton variant="primary" onClick={move} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving' : 'Move'}</PillButton>
        </>
      )}>
        <SelectField label="Table" value={target} onChange={(e) => setTarget(e.target.value)} options={options} />
        {sheet && byGuest.has(sheet.id) && <p className="oi-m-meta" style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}><UserMinus size={16} /> Choose "No table" to take them off {byGuest.get(sheet.id)?.name}.</p>}
        <p className="oi-m-meta" style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}><Monitor size={16} /> New tables are added on desktop.</p>
      </BottomSheet>
    </Screen>
  );
}
