import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import SortableHead from '@/components/shared/SortableHead';
import { naturalCompare, sortRows, nextSortState } from '@/lib/tableSort';
import { WHEN_LABEL, WHEN_RANK } from '@/lib/scheduleEvents';

const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * THE SCHEDULE AS A SORTABLE TABLE — owner: "All I need is List as a table
 * that can sort like Guest List. This is a list of all events with a date
 * including planning, later on the day etc."
 *
 * SAME SORT AS THE GUEST LIST, not a second one that looks like it. The
 * compare, the blanks-always-last rule and the asc → desc → unsorted header
 * cycle all come from src/lib/tableSort.js, which is where they moved out of
 * GuestList.jsx for exactly this.
 *
 * WHAT IS THIS TABLE'S OWN is the column map below: which fields sort and how
 * each reads off a row. Two of them are not plain strings —
 *
 *   Date  sorts on the raw YYYY-MM-DD, never the printed label. "7 September"
 *         against "12 March" is a lexical coin toss; the stored string is not.
 *   Type  sorts in the order the wedding runs — Planning, Wedding day, After —
 *         not alphabetically, where After would come first.
 *
 * DEFAULT IS DATE ASCENDING, and it is a real sort rather than the incoming
 * order, so the third click of a header returns here rather than to whatever
 * order the stores happened to resolve in.
 */
const COLUMNS = {
  date:     { getValue: (e) => e.date || '', compare: naturalCompare },
  time:     { getValue: (e) => e.time || '', compare: naturalCompare },
  title:    { getValue: (e) => e.title || '', compare: naturalCompare },
  when:     { getValue: (e) => (e.when ? WHEN_RANK[e.when] : null), compare: (a, b) => a - b },
  location: { getValue: (e) => e.location || '', compare: naturalCompare },
  notes:    { getValue: (e) => e.notes || e.description || '', compare: naturalCompare },
};

const HEADS = [
  ['date', 'Date'], ['time', 'Time'], ['title', 'Event'],
  ['when', 'Type'], ['location', 'Location'], ['notes', 'Notes'],
];

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

const TYPE_STYLE = {
  planning:      { background: 'rgba(10,10,10,0.06)', color: '#444444' },
  'wedding-day': { background: '#E03553', color: '#FFFFFF' },
  after:         { background: 'rgba(224,53,83,0.14)', color: '#E03553' },
};

export default function ScheduleTable({ events = [], onEdit, loading }) {
  const [sortState, setSortState] = useState({ field: 'date', direction: 'asc' });
  const handleSort = (field) => setSortState((prev) => nextSortState(field, prev));

  // The default order is date ascending, then time — so the third click of a
  // header lands somewhere meaningful rather than on the stores' resolve order.
  const base = [...events].sort((a, b) =>
    naturalCompare(a.date || '', b.date || '') || naturalCompare(a.time || '', b.time || ''));
  const rows = sortRows(base, sortState, COLUMNS);

  if (loading) {
    return (
      <div style={{ padding: '32px 32px 48px' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton-row" style={{ height: 18, marginBottom: 14 }} />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div style={{ padding: '48px 32px', fontFamily: PJS, fontSize: 14, color: 'rgba(10,10,10,0.6)' }}>
        Nothing on the schedule yet. Use “Add event” to put the first thing on it.
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px 48px', overflowX: 'auto' }}>
      <Table>
        <TableHeader>
          <TableRow>
            {HEADS.map(([field, label]) => (
              <SortableHead key={field} field={field} label={label} sortState={sortState} onSort={handleSort} />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((e) => {
            // Only the couple's own schedule rows can be opened; the rest are
            // read-outs of data that lives on another page and is edited there.
            const editable = e.type === 'schedule' && !!onEdit;
            return (
              <TableRow
                key={e.id}
                onClick={editable ? () => onEdit(e) : undefined}
                style={{ cursor: editable ? 'pointer' : 'default' }}
              >
                <TableCell style={{ whiteSpace: 'nowrap' }}>{dateLabel(e.date)}</TableCell>
                <TableCell style={{ whiteSpace: 'nowrap', color: e.time ? '#0A0A0A' : 'rgba(10,10,10,0.45)' }}>
                  {timeLabel(e.time)}
                </TableCell>
                <TableCell style={{ fontWeight: 600 }}>{e.title}</TableCell>
                <TableCell>
                  <span style={{
                    ...TYPE_STYLE[e.when], borderRadius: 999, padding: '3px 10px',
                    fontSize: 11, fontWeight: 700, fontFamily: PJS, whiteSpace: 'nowrap',
                  }}>
                    {WHEN_LABEL[e.when] || '—'}
                  </span>
                </TableCell>
                <TableCell style={{ color: 'rgba(10,10,10,0.6)' }}>{e.location || '—'}</TableCell>
                <TableCell style={{ color: 'rgba(10,10,10,0.6)' }}>{e.notes || e.description || '—'}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
