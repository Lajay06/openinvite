import React, { useMemo, useState } from 'react';
import DataTable from '@/components/shared/DataTable';
import TableToolbar from '@/components/shared/TableToolbar';
import { Pill } from '@/components/shared/DataTable';
import { OUTLINE_PILL, CELL_STRONG, CELL_MUTED, CELL_NOWRAP } from '@/lib/tablePills';
import { naturalCompare, sortRows, nextSortState } from '@/lib/tableSort';
import { WHEN_LABEL, WHEN_RANK, ROW_HOME } from '@/lib/scheduleEvents';

/**
 * SCHEDULE › LIST — the same table as the guest list, on the same shell (R37).
 *
 * Owner: "All I need is List as a table that can sort like Guest List... Use
 * the same brand styling and column formats for this."
 *
 * Everything visual comes from DataTable and TableToolbar. What is this
 * table's own is the column map, the filters, and the two columns that are not
 * plain strings:
 *
 *   Date  sorts on the stored YYYY-MM-DD, never the printed label. "7
 *         September" against "12 March" is a lexical coin toss.
 *   Type  sorts the way the wedding runs — Planning, Wedding day, After — not
 *         alphabetically, where After would come first.
 *
 * THE TYPE PILL IS OUTLINED, not the filled strawberry badge it was. A Type is
 * a category, and it should read like the guest list's Category rather than
 * shouting louder than the event name beside it.
 */

const COLUMN_SORTS = {
  date:     { getValue: (e) => e.date || '', compare: naturalCompare },
  time:     { getValue: (e) => e.time || '', compare: naturalCompare },
  title:    { getValue: (e) => e.title || '', compare: naturalCompare },
  when:     { getValue: (e) => (e.when ? WHEN_RANK[e.when] : null), compare: (a, b) => a - b },
  location: { getValue: (e) => e.location || '', compare: naturalCompare },
  notes:    { getValue: (e) => e.notes || e.description || '', compare: naturalCompare },
};

/** "Sat 3 Jul 2027" from a plain date string, read as a LOCAL day. */
function dateLabel(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(key || ''));
  if (!m) return '—';
  const [, y, mo, d] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d))
    .toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** "3:00 PM" from "15:00". */
function timeLabel(t) {
  if (!t) return '—';
  const [h, m] = String(t).split(':').map(Number);
  if (Number.isNaN(h)) return t;
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** Each Type keeps the guest list's outlined shape; only the ink differs. */
const TYPE_INK = {
  planning:      { ...OUTLINE_PILL },
  'wedding-day': { ...OUTLINE_PILL, color: '#E03553', borderColor: 'rgba(224,53,83,0.45)' },
  after:         { ...OUTLINE_PILL, color: '#803D81', borderColor: 'rgba(128,61,129,0.45)' },
  todo:          { ...OUTLINE_PILL, color: '#0A1930', borderColor: 'rgba(10,25,48,0.45)' },
  vendor:        { ...OUTLINE_PILL },
  deadline:      { ...OUTLINE_PILL, color: '#E03553', borderColor: 'rgba(224,53,83,0.45)' },
};

/** Every Type, in the order the wedding runs and then by where it comes from. */
const TYPE_ORDER = ['planning', 'wedding-day', 'after', 'todo', 'vendor', 'deadline'];

export default function ScheduleTable({ events = [], onEdit, onDelete, onOpen, loading }) {
  const [sortState, setSortState] = useState({ field: 'date', direction: 'asc' });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const counts = useMemo(() => {
    const c = { all: events.length };
    for (const t of TYPE_ORDER) c[t] = events.filter((e) => e.when === t).length;
    return c;
  }, [events]);

  const locations = useMemo(
    () => [...new Set(events.map((e) => e.location).filter(Boolean))].sort((a, b) => naturalCompare(a, b)),
    [events]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      if (typeFilter !== 'all' && e.when !== typeFilter) return false;
      if (locationFilter !== 'all' && e.location !== locationFilter) return false;
      if (!q) return true;
      return `${e.title || ''} ${e.location || ''}`.toLowerCase().includes(q);
    });
  }, [events, search, typeFilter, locationFilter]);

  // Default order is date then time, so the third click of a header lands
  // somewhere meaningful rather than on the stores' resolve order.
  const base = useMemo(() => [...filtered].sort((a, b) =>
    naturalCompare(a.date || '', b.date || '') || naturalCompare(a.time || '', b.time || '')), [filtered]);
  const rows = sortRows(base, sortState, COLUMN_SORTS);

  const COLUMNS = [
    { key: 'date',  label: 'Date',  sortable: true, cellStyle: CELL_NOWRAP, render: (e) => dateLabel(e.date) },
    { key: 'time',  label: 'Time',  sortable: true, cellStyle: CELL_NOWRAP, render: (e) => timeLabel(e.time) },
    { key: 'title', label: 'Event', sortable: true, cellStyle: CELL_STRONG, render: (e) => e.title },
    { key: 'when',  label: 'Type',  sortable: true, render: (e) => <Pill style={TYPE_INK[e.when] || OUTLINE_PILL}>{WHEN_LABEL[e.when] || '—'}</Pill> },
    {
      // LOCATION OR SOURCE. A to-do has no venue; what it has is a home, and
      // naming it is more use than an em dash.
      key: 'location', label: 'Location', sortable: true, cellStyle: CELL_MUTED,
      render: (e) => e.location || (e.readOnly ? e.source : '') || '—',
    },
    {
      key: 'notes', label: 'Notes', sortable: true,
      // ONE LINE, WITH THE WHOLE THING ON HOVER. A note that wraps to four
      // lines makes every other row in the table taller than it needs to be.
      cellStyle: { ...CELL_MUTED, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      render: (e) => {
        const text = e.notes || e.description || '';
        return <span title={text || undefined}>{text || '—'}</span>;
      },
    },
  ];

  const toggle = (id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div style={{ padding: '24px 32px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TableToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search by event or location…"
        filters={[
          { val: 'all', label: `All (${counts.all})` },
          ...TYPE_ORDER.map((t) => ({ val: t, label: `${WHEN_LABEL[t]} (${counts[t]})` })),
        ]}
        activeFilter={typeFilter}
        onFilter={setTypeFilter}
        select={locations.length > 0 ? {
          value: locationFilter, onChange: setLocationFilter, placeholder: 'All locations',
          options: [{ value: 'all', label: 'All locations' }, ...locations.map((l) => ({ value: l, label: l }))],
        } : null}
      />

      <DataTable
        columns={COLUMNS}
        rows={rows}
        loading={loading}
        sortState={sortState}
        onSort={(field) => setSortState((prev) => nextSortState(field, prev))}
        selectedIds={selectedIds}
        onToggleSelect={toggle}
        onToggleSelectAll={(ids) => setSelectedIds((prev) => (prev.size === ids.length ? new Set() : new Set(ids)))}
        empty={events.length
          ? 'Nothing matches that search.'
          : 'Nothing on the schedule yet — use “Add event” to put the first thing on it.'}
        // A ROW THIS PAGE DOES NOT OWN GETS NO CHECKBOX. Selecting a to-do
        // here would offer a bulk action on the to-do list.
        isSelectable={(e) => e.type === 'schedule'}
        actions={(e) => {
          // The couple's own schedule rows are edited here. Everything else is
          // edited at home, and the row offers the way there and nothing else.
          if (e.type === 'schedule') {
            return [
              ...(onEdit ? [{ label: 'Edit', onClick: () => onEdit(e) }] : []),
              ...(onDelete ? [{ label: 'Delete', onClick: () => onDelete(e), danger: true }] : []),
            ];
          }
          const home = ROW_HOME[e.kind];
          return home && onOpen ? [{ label: home.label, onClick: () => onOpen(home.to) }] : [];
        }}
      />
    </div>
  );
}
