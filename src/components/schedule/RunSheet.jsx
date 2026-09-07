import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { newRunSheetItem, normalizeRunSheet, moveRunSheetItem, runSheetRoundTripped } from '@/lib/runSheet';

const PJS = "'Plus Jakarta Sans', sans-serif";
const CELL = {
  border: 'none', borderBottom: '1px solid rgba(10,10,10,0.12)', background: 'none',
  fontFamily: PJS, fontSize: 14, color: '#0A0A0A', outline: 'none', padding: '6px 0', width: '100%',
};

/**
 * ONE EVENT'S ORDER OF PROCEEDINGS — time · item · who · notes.
 *
 * This is what the deleted visual timeline was for, without its overlapping
 * blocks: a plain ordered list, edited in place, reordered by two arrows. A
 * ceremony is a sequence, not a set of rectangles competing for the same
 * minutes.
 *
 * ── IT REFUSES TO SAVE INTO A FIELD THAT IS NOT THERE ──────────────────────
 *
 * Schedule.run_sheet does not exist on the live entity yet. Base44 accepts a
 * write of an undeclared field with 200 and discards it, so a couple would
 * type out their whole ceremony, see a success toast, and find it gone. The
 * save writes, reads back and compares; on a mismatch it says so and keeps
 * what they typed on screen rather than clearing it.
 */
export default function RunSheet({ event, items, onSave, readOnly }) {
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
        // NAMED, not "something went wrong". The couple can act on "it is not
        // switched on"; they cannot act on a shrug.
        : { tone: 'bad', text: `Run sheet isn't switched on yet — ${reason}. Nothing was saved.` });
    } catch (err) {
      setStatus({ tone: 'bad', text: `Run sheet isn't switched on yet — ${err?.message || 'the save was refused'}. Nothing was saved.` });
    } finally {
      setSaving(false);
    }
  };

  if (!event) {
    return (
      <p style={{ fontFamily: PJS, fontSize: 14, color: 'rgba(10,10,10,0.6)', margin: 0 }}>
        Pick an event above to write its run sheet.
      </p>
    );
  }

  return (
    <div style={{ fontFamily: PJS }}>
      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 160px 1fr 72px', gap: 12, alignItems: 'center',
        paddingBottom: 8, borderBottom: '3px solid #0A0A0A' }}>
        {['Time', 'Item', 'Who', 'Notes', ''].map((h) => (
          <span key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#0A0A0A' }}>{h}</span>
        ))}
      </div>

      {rows.length === 0 && (
        <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.6)', margin: '20px 0' }}>
          Nothing in this run sheet yet. Add the first moment below.
        </p>
      )}

      {rows.map((r, i) => (
        <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 160px 1fr 72px', gap: 12,
          alignItems: 'center', padding: '4px 0' }}>
          <input type="time" value={r.time} disabled={readOnly} style={CELL}
            onChange={(e) => update(r.id, 'time', e.target.value)} />
          <input value={r.item} placeholder="Processional" disabled={readOnly} style={CELL}
            onChange={(e) => update(r.id, 'item', e.target.value)} />
          <input value={r.who} placeholder="Celebrant" disabled={readOnly} style={CELL}
            onChange={(e) => update(r.id, 'who', e.target.value)} />
          <input value={r.notes} placeholder="Music cued" disabled={readOnly} style={CELL}
            onChange={(e) => update(r.id, 'notes', e.target.value)} />
          {!readOnly && (
            <span style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <button aria-label="Move up" disabled={i === 0} onClick={() => setRows(moveRunSheetItem(rows, r.id, 'up'))}
                style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.3 : 1, padding: 2 }}>
                <ChevronUp size={14} />
              </button>
              <button aria-label="Move down" disabled={i === rows.length - 1} onClick={() => setRows(moveRunSheetItem(rows, r.id, 'down'))}
                style={{ background: 'none', border: 'none', cursor: i === rows.length - 1 ? 'default' : 'pointer', opacity: i === rows.length - 1 ? 0.3 : 1, padding: 2 }}>
                <ChevronDown size={14} />
              </button>
              <button aria-label="Remove" onClick={() => setRows(normalizeRunSheet(rows.filter((x) => x.id !== r.id)))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'rgba(10,10,10,0.45)' }}>
                <Trash2 size={13} />
              </button>
            </span>
          )}
        </div>
      ))}

      {!readOnly && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <button className="btn-editorial-secondary" onClick={() => setRows([...rows, newRunSheetItem(rows)])}>
            Add a moment
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save run sheet'}
          </button>
          {status && (
            <span style={{ fontSize: 13, color: status.tone === 'ok' ? '#10B981' : '#E03553' }}>
              {status.text}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
