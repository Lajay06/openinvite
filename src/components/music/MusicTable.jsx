import React, { useMemo, useState } from 'react';
import DataTable, { Pill } from '@/components/shared/DataTable';
import TableToolbar from '@/components/shared/TableToolbar';
import { OUTLINE_PILL, CELL_STRONG, CELL_MUTED, CELL_SECONDARY, CELL_NOWRAP } from '@/lib/tablePills';
import { naturalCompare, sortRows, nextSortState } from '@/lib/tableSort';
import { buildMusicRows, isActionable, TAG_LABEL, TAG_ORDER, KIND_LABEL, STATUS_LABEL } from '@/lib/musicRows';

/**
 * MUSIC › THE TABLE — the same table as the guest list, on the same shell.
 *
 * Round two, item 12: "Rebuild as a table like every other table in the
 * product: song, artist, tag … notes. … Guest requests appear in the same
 * table with Approve and Decline."
 *
 * Everything visual comes from DataTable and TableToolbar, as ScheduleTable
 * does. What is this table's own is the column map, the filters, and the two
 * columns that are not plain strings:
 *
 *   Tag     sorts the way the day runs — Ceremony, Cocktail hour, Dinner,
 *           Dancing, Special moments, General — not alphabetically, where
 *           Cocktail hour would come before Ceremony.
 *   From    says whether a row is the couple's or a guest's, because the two
 *           behave differently and a table that hid the difference would be
 *           offering Approve on something already approved.
 *
 * A REQUEST NOBODY HAS ANSWERED SORTS FIRST, above every tag. It is the only
 * row on the page asking the couple for something.
 */

const COLUMN_SORTS = {
  song:    { getValue: (r) => r.song || '', compare: naturalCompare },
  artist:  { getValue: (r) => r.artist || '', compare: naturalCompare },
  tag:     { getValue: (r) => (r.tag ? TAG_ORDER.indexOf(r.tag) : TAG_ORDER.length), compare: (a, b) => a - b },
  kind:    { getValue: (r) => KIND_LABEL[r.kind] || '', compare: naturalCompare },
  askedBy: { getValue: (r) => r.askedBy || '', compare: naturalCompare },
  notes:   { getValue: (r) => r.notes || '', compare: naturalCompare },
};

/** A guest request reads in the couple's own ink only once it is theirs. */
const KIND_INK = {
  track:   { ...OUTLINE_PILL },
  request: { ...OUTLINE_PILL, color: '#803D81', borderColor: 'rgba(128,61,129,0.45)' },
};

const FILTERS = [
  { val: 'all', label: 'All' },
  { val: 'waiting', label: 'Waiting on you' },
  { val: 'track', label: 'Your playlist' },
  { val: 'request', label: 'Guest requests' },
];

export default function MusicTable({
  tracks = [], requests = [], loading, readOnly = false,
  onEdit, onDelete, onApprove, onDecline,
}) {
  const [sortState, setSortState] = useState({ field: null, direction: 'asc' });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const base = useMemo(() => buildMusicRows({ tracks, requests }), [tracks, requests]);

  const counts = useMemo(() => ({
    all: base.length,
    waiting: base.filter(isActionable).length,
    track: base.filter((r) => r.kind === 'track').length,
    request: base.filter((r) => r.kind === 'request').length,
  }), [base]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return base.filter((r) => {
      if (filter === 'waiting' && !isActionable(r)) return false;
      if (filter === 'track' && r.kind !== 'track') return false;
      if (filter === 'request' && r.kind !== 'request') return false;
      if (!q) return true;
      return `${r.song} ${r.artist} ${r.askedBy}`.toLowerCase().includes(q);
    });
  }, [base, search, filter]);

  // The default order is buildMusicRows' own — waiting first, then the day's
  // order. sortRows only takes over once a header is pressed.
  const rows = sortRows(filtered, sortState, COLUMN_SORTS);

  const COLUMNS = [
    { key: 'song', label: 'Song', sortable: true, cellStyle: CELL_STRONG, render: (r) => r.song || '—' },
    { key: 'artist', label: 'Artist', sortable: true, cellStyle: CELL_SECONDARY, render: (r) => r.artist || '—' },
    {
      key: 'tag', label: 'Tag', sortable: true,
      render: (r) => (r.tag
        ? <Pill style={OUTLINE_PILL}>{TAG_LABEL[r.tag] || r.tag}</Pill>
        : <span style={CELL_MUTED}>—</span>),
    },
    {
      key: 'kind', label: 'From', sortable: true,
      render: (r) => (
        <Pill style={KIND_INK[r.kind] || OUTLINE_PILL}>
          {r.kind === 'request' ? (STATUS_LABEL[r.status] || KIND_LABEL.request) : KIND_LABEL.track}
        </Pill>
      ),
    },
    {
      key: 'askedBy', label: 'Asked by', sortable: true,
      cellStyle: { ...CELL_MUTED, ...CELL_NOWRAP },
      render: (r) => r.askedBy || '—',
    },
    {
      // THE ONE ROW ASKING FOR SOMETHING ANSWERS IN THE ROW.
      //
      // DataTable's row actions live behind a "···" menu, which is right for
      // Edit and Remove — you go looking for those. It is wrong for a request
      // waiting on a decision: the owner's walk-through reported Approve and
      // Decline as MISSING when they were merely conditional, and a menu is
      // one more place for them to be missing from. They render in the row,
      // and only on a request nobody has answered.
      key: 'answer', label: '', sortable: false,
      cellStyle: CELL_NOWRAP,
      render: (r) => (isActionable(r) && !readOnly ? (
        <span style={{ display: 'inline-flex', gap: 8 }}>
          <button onClick={() => onApprove && onApprove(r.sourceId)} className="btn-primary" style={{ fontSize: 11 }}>Approve</button>
          <button onClick={() => onDecline && onDecline(r.sourceId)} className="btn-editorial-secondary" style={{ fontSize: 11 }}>Decline</button>
        </span>
      ) : null),
    },
    {
      key: 'notes', label: 'Notes', sortable: true,
      // ONE LINE, WITH THE WHOLE THING ON HOVER — the same rule the schedule
      // table follows, so a long guest note does not make every other row
      // taller than it needs to be.
      cellStyle: { ...CELL_MUTED, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      render: (r) => <span title={r.notes || undefined}>{r.notes || '—'}</span>,
    },
  ];

  const toggle = (id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TableToolbar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search by song, artist or guest…"
        filters={FILTERS.map((f) => ({ ...f, label: `${f.label} (${counts[f.val]})` }))}
        activeFilter={filter}
        onFilter={setFilter}
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
        empty={base.length
          ? 'Nothing matches that search.'
          : 'No songs yet. Add one, or share your link and let your guests ask.'}
        // A GUEST'S REQUEST IS NOT THE COUPLE'S ROW TO BULK-EDIT. Selecting one
        // here would offer an action on something that is still a question.
        isSelectable={(r) => !readOnly && r.kind === 'track'}
        actions={(r) => {
          if (readOnly) return [];
          // A waiting request answers in its own row, above. Nothing goes in
          // the menu for it, so the menu does not appear at all.
          if (r.kind !== 'track') return [];
          return [
            ...(onEdit ? [{ label: 'Edit', onClick: () => onEdit(r.raw) }] : []),
            ...(onDelete ? [{ label: 'Remove', onClick: () => onDelete(r.sourceId), danger: true }] : []),
          ];
        }}
      />
    </div>
  );
}
