import React, { useMemo, useState } from 'react';
import DataTable from '@/components/shared/DataTable';
import TableToolbar from '@/components/shared/TableToolbar';
import { CELL_STRONG, CELL_MUTED, CELL_NOWRAP } from '@/lib/tablePills';
import { eventsInSchedule, runSheetFor, unplaceableCount } from '@/lib/scheduleEvents';

const PJS = "'Plus Jakarta Sans', sans-serif";

/** "3:00 PM" from "15:00". */
function timeLabel(t) {
  if (!t) return '—';
  const [h, m] = String(t).split(':').map(Number);
  if (Number.isNaN(h)) return t;
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** Shifts a "HH:MM" by n minutes, for the reorder. */
function shift(time, minutes) {
  const [h, m] = String(time || '00:00').split(':').map(Number);
  const total = Math.max(0, Math.min(24 * 60 - 1, (h || 0) * 60 + (m || 0) + minutes));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * SCHEDULE › RUN SHEET — one event's order of proceedings.
 *
 * Owner: "run sheet is literally order of events for the specific event…
 * it should just have a filter for the event so it could be wedding,
 * reception, recovery etc… if there are multiple events it needs to be smart
 * to know it and then enable the user to select the specific event."
 *
 * ── IT IS A VIEW OF THE LIST, NOT A SECOND STORE ───────────────────────────
 *
 * Every row here is a Schedule row that is also in List. There is no
 * `run_sheet` field, no nested array, and nothing to keep in step — which is
 * why the couple's edits show up in both places without either being told to
 * refresh, and why the owner does not need to add a Base44 field after all.
 *
 * The select lists the events that ACTUALLY EXIST in their rows, most rows
 * first, so a wedding with one event never asks and a wedding with four opens
 * on the fullest.
 */
export default function RunSheet({ scheduleItems = [], category, onPickEvent, onEdit, onDelete, onAdd, onReorder, readOnly, loading }) {
  const events = useMemo(() => eventsInSchedule(scheduleItems), [scheduleItems]);
  const active = events.find((e) => e.key === category) || events[0] || null;
  const rows = useMemo(() => (active ? runSheetFor(scheduleItems, active.key) : []), [scheduleItems, active]);
  // ROWS WE COULD NOT READ ARE ADMITTED TO, NOT SWALLOWED. Skipping them
  // silently would be the same failure as crashing, only quieter: the couple
  // would count their items and find one missing with nothing to explain it.
  const unplaceable = useMemo(() => unplaceableCount(scheduleItems), [scheduleItems]);
  const [busy, setBusy] = useState(false);

  const COLUMNS = [
    { key: 'start_time', label: 'Time', width: 110, cellStyle: { ...CELL_MUTED, ...CELL_NOWRAP }, render: (r) => timeLabel(r.start_time) },
    { key: 'event_name', label: 'Item', cellStyle: CELL_STRONG, render: (r) => r.event_name },
    { key: 'responsible_person', label: 'Who', width: 180, cellStyle: CELL_MUTED, render: (r) => r.responsible_person || '—' },
    { key: 'notes', label: 'Notes', cellStyle: CELL_MUTED, render: (r) => r.notes || r.description || '—' },
  ];

  const move = async (row, dir) => {
    const i = rows.findIndex((r) => r.id === row.id);
    const j = i + (dir === 'up' ? -1 : 1);
    if (i < 0 || j < 0 || j >= rows.length) return;
    setBusy(true);
    // ORDER IS THE TIME, because that is what a run sheet is. Swapping two
    // rows swaps their start times rather than writing a separate order
    // column that could disagree with the clock beside it.
    try { await onReorder(row, rows[j]); } finally { setBusy(false); }
  };

  return (
    <div style={{ padding: '24px 32px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TableToolbar
        select={events.length > 0 ? {
          value: active?.key || '', onChange: onPickEvent, placeholder: 'Pick an event',
          options: events.map((e) => ({ value: e.key, label: `${e.label} (${e.count})` })),
        } : null}
        actions={!readOnly && active ? (
          <button className="btn-primary" onClick={() => onAdd(active)}>+ Add a moment</button>
        ) : null}
      />

      {unplaceable > 0 && (
        <p style={{ fontFamily: PJS, fontSize: 12, color: 'rgba(10,10,10,0.6)', margin: 0 }}>
          {unplaceable === 1
            ? '1 item couldn’t be placed on a run sheet — it has no event tag. Open it from List and choose what it is.'
            : `${unplaceable} items couldn’t be placed on a run sheet — they have no event tag. Open them from List and choose what they are.`}
        </p>
      )}

      {!active ? (
        <p style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.6)', margin: 0 }}>
          No events yet. Add one from List and tag it as part of an event — its run sheet appears here.
        </p>
      ) : (
        <DataTable
          columns={COLUMNS}
          rows={rows}
          loading={loading || busy}
          empty={`Nothing in the ${String(active.label).toLowerCase()} run sheet yet — “Add a moment” puts the first thing on it.`}
          actions={(r) => (readOnly ? [] : [
            { label: 'Edit', onClick: () => onEdit(r) },
            { label: 'Move up', onClick: () => move(r, 'up'), disabled: rows[0]?.id === r.id },
            { label: 'Move down', onClick: () => move(r, 'down'), disabled: rows[rows.length - 1]?.id === r.id },
            { label: 'Delete', onClick: () => onDelete(r), danger: true },
          ])}
        />
      )}
    </div>
  );
}

export { shift };
