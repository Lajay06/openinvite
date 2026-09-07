import React from 'react';
import { TableHead } from '@/components/ui/table';

/**
 * A clickable column header, shared by every sortable dashboard table.
 *
 * Lifted out of GuestList.jsx unchanged so the schedule's List tab uses the
 * same control rather than a second one that looks like it: same caret
 * glyphs, same strawberry when active, same asc → desc → unsorted cycle
 * (nextSortState in src/lib/tableSort.js).
 *
 * The carets are text-presentation marks — ▲ ▼ ⇅ inherit our typeface and
 * currentColor, so they are not emoji under the presentation rule.
 */
export default function SortableHead({ field, label, sortState, onSort, style }) {
  const active = sortState?.field === field;
  const direction = active ? sortState.direction : null;
  return (
    <TableHead
      onClick={() => onSort(field)}
      style={{ cursor: 'pointer', userSelect: 'none', ...style }}
      title={`Sort by ${label.toLowerCase()}`}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        <span style={{ fontSize: 10, color: active ? '#E03553' : 'rgba(10,10,10,0.25)', lineHeight: 1 }}>
          {active ? (direction === 'desc' ? '▼' : '▲') : '⇅'}
        </span>
      </span>
    </TableHead>
  );
}
