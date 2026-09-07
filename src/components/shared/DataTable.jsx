import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import SortableHead from '@/components/shared/SortableHead';
import { PILL_BASE, CELL_TEXT } from '@/lib/tablePills';

const PJS = "'Plus Jakarta Sans', sans-serif";

/**
 * src/components/shared/DataTable.jsx — R37: ONE TABLE SHELL FOR THE DASHBOARD.
 *
 * Owner: "Anything that is like a list should have a consistent table visual
 * with all columns sortable, neat pill filters etc."
 *
 * The shell is the guest list's, lifted rather than imitated: the 1px
 * container border with overflow hidden, the #FAFAFA header band, the
 * horizontal scroll wrapper, the 36px checkbox column, the 48px trailing
 * actions column, and the "···" dropdown in it. Every value here was read off
 * GuestList.jsx and is asserted pixel-identical against a screenshot taken
 * before the extraction.
 *
 * WHAT THIS OWNS AND WHAT IT DOES NOT. It owns the frame. It does not own the
 * CELLS: a guest's name cell has an avatar and a case-suggestion prompt, an
 * event's date cell is a formatted day, and neither belongs to the other. Each
 * column declares its own `render`, so the shell can be shared without
 * flattening the tables into one another.
 *
 * ── THE PILL VOCABULARY IS SHARED TOO ──────────────────────────────────────
 *
 * `Pill` below is GuestList's `pillBase` — 10px, 700, 0.08em letterspacing,
 * fully rounded — so a Type on the schedule reads as the same object as a
 * Category on the guest list rather than as a filled red badge that shouts.
 */

export { PILL_BASE, OUTLINE_PILL, CELL_TEXT, CELL_STRONG, CELL_MUTED, CELL_NOWRAP } from '@/lib/tablePills';

/** The row-level pill, from the shared vocabulary. */
export const Pill = ({ style, children }) => (
  <span style={{ ...PILL_BASE, ...style }}>{children}</span>
);

/**
 * @param {object}   props
 * @param {Array}    props.columns   [{ key, label, sortable, width, render, head }]
 * @param {Array}    props.rows
 * @param {Function} props.rowKey
 * @param {object}   props.sortState / props.onSort   omit both to disable sorting
 * @param {Set}      props.selectedIds  omit to hide the checkbox column
 * @param {Array}    props.actions    [{ label, onClick, danger, disabled }] per row, as a function of the row
 * @param {Node}     props.empty      what the body says when there are no rows
 * @param {Node}     props.footerRow  a persistent row under the body (the inline add row)
 * @param {Node}     props.children   a fully custom body. When given, `rows` is
 *                                    ignored and this is rendered instead.
 *
 * CHILDREN EXISTS FOR THE GUEST LIST, and the reason is worth stating rather
 * than hiding: its body is not a flat map. Rows expand into per-event
 * sub-rows, a persistent quick-add row sits under them, and one row can carry
 * a name-case suggestion. Rewriting that into a column API to force it through
 * `rows` would be a large change to a heavily-guarded page in a commit whose
 * whole promise is ZERO visual change. So the shell owns the frame — the
 * border, the header band, the scroll wrapper, the column widths — and the
 * guest list keeps its own body inside it.
 */
export default function DataTable({
  columns, rows, rowKey = (r) => r.id, sortState, onSort,
  selectedIds, onToggleSelect, onToggleSelectAll,
  actions, empty, footerRow, loading, rowStyle, readOnly, children,
  // A ROW THAT CANNOT BE ACTED ON GETS NO CHECKBOX, rather than one that
  // does nothing. The schedule's timeline carries rows read from the to-do
  // list, the vendors and the wedding record; selecting those here would
  // offer a bulk action on data this page does not own.
  isSelectable,
}) {
  // SELECTION IS OPTIONAL AND THIS LINE FORGOT IT. `selectable` is computed
  // from whether the caller passed `selectedIds` — and then the next line
  // dereferenced `selectedIds.has` regardless, so ANY consumer that renders
  // rows without a selection model threw
  // `Cannot read properties of undefined (reading 'has')` and the page went to
  // the error boundary. The run sheet is exactly that consumer: a run sheet
  // has no bulk actions, so it passes no selection, and the owner's Schedule
  // has rows — which is the second half of the condition. An empty run sheet
  // never crashed, so every empty-state check passed.
  const selectable = !!selectedIds;
  const selectableRows = (rows || []).filter((r) => !isSelectable || isSelectable(r));
  const allSelected = selectable && selectableRows.length > 0
    && selectableRows.every((r) => selectedIds.has(rowKey(r)));
  const span = columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0);

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.12)', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <Table>
          <TableHeader>
            <TableRow style={{ background: '#FAFAFA' }}>
              {selectable && (
                <TableHead style={{ width: 36 }}>
                  {!readOnly && (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => onToggleSelectAll?.(selectableRows.map(rowKey))}
                      style={{ width: 14, height: 14, accentColor: '#E03553' }}
                    />
                  )}
                </TableHead>
              )}
              {columns.map((c) => (
                c.sortable && onSort
                  ? <SortableHead key={c.key} field={c.key} label={c.label} sortState={sortState} onSort={onSort} />
                  : <TableHead key={c.key} style={c.width ? { width: c.width } : undefined}>{c.label}</TableHead>
              ))}
              {actions && <TableHead style={{ width: 48 }} />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {children}
            {!children && loading && (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: span }).map((__, j) => (
                    <TableCell key={j}><div className="skeleton-row" style={{ height: 14 }} /></TableCell>
                  ))}
                </TableRow>
              ))
            )}
            {!children && !loading && (rows || []).length === 0 && empty && (
              // THE EMPTY STATE LIVES INSIDE THE BODY, not instead of the
              // table: the header stays, so the couple can see what the
              // columns will be before there is anything in them.
              <TableRow>
                <TableCell colSpan={span} style={{ padding: '48px 16px', textAlign: 'center', fontFamily: PJS, fontSize: 13, color: '#444444' }}>
                  {empty}
                </TableCell>
              </TableRow>
            )}
            {!children && !loading && (rows || []).map((row) => {
              const id = rowKey(row);
              const rowActions = typeof actions === 'function' ? actions(row) : actions;
              return (
                <TableRow key={id} style={rowStyle?.(row)}>
                  {selectable && (
                    <TableCell className="align-middle">
                      {(!isSelectable || isSelectable(row)) && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(id)}
                          onChange={() => onToggleSelect?.(id)}
                          style={{ width: 14, height: 14, accentColor: '#E03553' }}
                        />
                      )}
                    </TableCell>
                  )}
                  {columns.map((c) => (
                    <TableCell key={c.key} style={{ ...CELL_TEXT, ...c.cellStyle }}>
                      {c.render ? c.render(row) : row[c.key]}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell className="text-right">
                      {rowActions?.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.45)', padding: 4 }}>
                              <MoreHorizontal size={15} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {rowActions.map((a) => (
                              <DropdownMenuItem
                                key={a.label}
                                onClick={a.onClick}
                                disabled={a.disabled}
                                style={a.danger ? { color: '#E03553' } : undefined}
                              >
                                {a.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {footerRow}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
