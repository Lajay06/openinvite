import React, { useState } from 'react';
import DataTable from '@/components/shared/DataTable';
import TableToolbar from '@/components/shared/TableToolbar';
import { TableCell, TableRow } from '@/components/ui/table';
import { newRunSheetItem, normalizeRunSheet, moveRunSheetItem, runSheetRoundTripped } from '@/lib/runSheet';

const PJS = "'Plus Jakarta Sans', sans-serif";
const CELL = {
  border: 'none', borderBottom: '1px solid rgba(10,10,10,0.12)', background: 'none',
  fontFamily: PJS, fontSize: 14, color: '#0A0A0A', outline: 'none', padding: '4px 0', width: '100%',
};

/**
 * SCHEDULE › RUN SHEET — one event's order of proceedings, on the shared shell.
 *
 * Owner: "Same for run sheet... The wall of pills goes." One select naming the
 * wedding-day events, and the rows in the same table as everything else.
 *
 * ── IT REFUSES TO SAVE INTO A FIELD THAT IS NOT THERE ──────────────────────
 *
 * Schedule.run_sheet does not exist on the live entity yet. Base44 accepts a
 * write of an undeclared field with 200 and discards it, so a couple would
 * type out their whole ceremony, see a success toast, and find it gone. The
 * save writes, reads back and compares; on a mismatch it says so and keeps
 * what they typed on screen.
 */
export default function RunSheet({ events = [], eventId, onPickEvent, event, items, onSave, readOnly }) {
  const [rows, setRows] = useState(() => normalizeRunSheet(items));
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  const update = (id, field, value) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const readBack = await onSave(normalizeRunSheet(rows));
      const { ok, reason } = runSheetRoundTripped(rows, readBack);
      setStatus(ok
        ? { tone: 'ok', text: 'Saved.' }
        // NAMED, not "something went wrong". A couple can act on "it is not
        // switched on"; they cannot act on a shrug.
        : { tone: 'bad', text: `Run sheet isn't switched on yet — ${reason}. Nothing was saved.` });
    } catch (err) {
      setStatus({ tone: 'bad', text: `Run sheet isn't switched on yet — ${err?.message || 'the save was refused'}. Nothing was saved.` });
    } finally {
      setSaving(false);
    }
  };

  const COLUMNS = [
    { key: 'time', label: 'Time', width: 110, cellStyle: { whiteSpace: 'nowrap' },
      render: (r) => <input type="time" value={r.time} disabled={readOnly} style={CELL} onChange={(e) => update(r.id, 'time', e.target.value)} /> },
    { key: 'item', label: 'Item', cellStyle: { fontWeight: 600 },
      render: (r) => <input value={r.item} placeholder="Processional" disabled={readOnly} style={{ ...CELL, fontWeight: 600 }} onChange={(e) => update(r.id, 'item', e.target.value)} /> },
    { key: 'who', label: 'Who', width: 180,
      render: (r) => <input value={r.who} placeholder="Celebrant" disabled={readOnly} style={CELL} onChange={(e) => update(r.id, 'who', e.target.value)} /> },
    { key: 'notes', label: 'Notes',
      render: (r) => <input value={r.notes} placeholder="Music cued" disabled={readOnly} style={CELL} onChange={(e) => update(r.id, 'notes', e.target.value)} /> },
  ];

  const addRow = () => setRows((prev) => [...prev, newRunSheetItem(prev)]);

  return (
    <div style={{ padding: '24px 32px 48px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TableToolbar
        select={events.length > 0 ? {
          value: eventId || '', onChange: onPickEvent, placeholder: 'Pick an event',
          options: events.map((e) => ({ value: e.id, label: e.event_name })),
        } : null}
        actions={!readOnly && event ? (
          <>
            {status && (
              <span style={{ fontFamily: PJS, fontSize: 13, alignSelf: 'center',
                color: status.tone === 'ok' ? '#10B981' : '#E03553' }}>
                {status.text}
              </span>
            )}
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save run sheet'}
            </button>
          </>
        ) : null}
      />

      {!event ? (
        <p style={{ fontFamily: PJS, fontSize: 14, color: 'rgba(10,10,10,0.6)', margin: 0 }}>
          No events on the wedding day yet. Add one and its run sheet lives here.
        </p>
      ) : (
        <DataTable
          columns={COLUMNS}
          rows={rows}
          empty="Nothing in this run sheet yet — add the first moment below."
          actions={(r) => {
            const i = rows.findIndex((x) => x.id === r.id);
            return readOnly ? [] : [
              { label: 'Move up', onClick: () => setRows(moveRunSheetItem(rows, r.id, 'up')), disabled: i === 0 },
              { label: 'Move down', onClick: () => setRows(moveRunSheetItem(rows, r.id, 'down')), disabled: i === rows.length - 1 },
              { label: 'Delete', onClick: () => setRows(normalizeRunSheet(rows.filter((x) => x.id !== r.id))), danger: true },
            ];
          }}
          footerRow={!readOnly && (
            // THE ADD ROW IS A ROW, in the table's own style — not a button
            // floating under it. Same reason the guest list's quick-add sits
            // inside its body.
            <TableRow>
              <TableCell colSpan={COLUMNS.length + 1}>
                <button
                  onClick={addRow}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontFamily: PJS, fontSize: 13, fontWeight: 600, color: '#E03553' }}
                >
                  + Add a moment
                </button>
              </TableCell>
            </TableRow>
          )}
        />
      )}
    </div>
  );
}
