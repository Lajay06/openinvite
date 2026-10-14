/**
 * src/components/professional/event/RunSheetTab.jsx
 *
 * THE RUN SHEET. goals/2026-10-14-professional.md, What a professional gets, 3.
 * 15-minute rows from 7:00 to midnight by default (5 or 30 on a switch),
 * several sheets, shift everything after a row, drag to reorder, clash and gap
 * warnings, the couple's own schedule as a read-only lane when they share it,
 * a vendor filter, PDF (A4 and Letter, landscape) and CSV.
 *
 * Keyboard: arrows move between rows, Enter edits, Escape cancels, Cmd or
 * Ctrl+D duplicates.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, GripVertical, Plus } from 'lucide-react';
import { useProStore, create, update, remove, bulk } from '@/lib/professionalStore';
import { can } from '@/lib/professionalAccess';
import {
  STEPS, STATUS, DEFAULT_SHEETS, fmtTime, parseTime, fmtDuration, grid, ordered, sheetsOf, shiftAfter, moveTo,
  duplicateOf, findIssues, vendorRows, CSV_HEADERS,
} from '@/lib/professionalRunSheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { FilterPill } from '@/components/shared/TableToolbar';
import { downloadCsv, downloadTablePdf, fileSlug } from '../proExport';
import { linkedFeedFor } from '@/lib/professionalFeedClient';
import { Pill } from '../ProPage';
import { s, PRO } from '../proTheme';
import { TYPE } from '@/styles/typeScale';

const BLANK = { item: '', location: '', owner_ref: '', cue: '', notes: '', duration_minutes: 15 };

export default function RunSheetTab({ event, me, readOnly }) {
  const store = useProStore();
  const mobile = useIsMobile();
  const all = store.RunSheetRow.filter((r) => r.event_id === event.id);
  const sheets = sheetsOf(all).length ? sheetsOf(all) : ['Ceremony'];
  const [sheet, setSheet] = useState(sheets[0]);
  const [step, setStep] = useState(15);
  const [view, setView] = useState('grid');
  const [vendor, setVendor] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [shiftBy, setShiftBy] = useState('15');
  const [dragId, setDragId] = useState(null);
  const tableRef = useRef(null);
  const editable = !readOnly && can(me, 'runsheet.edit', event);
  const canTick = !readOnly && can(me, 'runsheet.tick', event);

  const bookings = store.ProVendorBooking.filter((b) => b.event_id === event.id);
  const vendors = bookings.map((b) => store.VendorContact.find((v) => v.id === b.vendor_id)).filter(Boolean);
  const team = store.ProMember.filter((m) => m.role === 'owner' || (event.assigned_member_ids || []).includes(m.id) || (m.assigned_event_ids || []).includes(event.id));
  const nameOf = (ref) => team.find((m) => m.id === ref)?.name || store.ProMember.find((m) => m.id === ref)?.name || store.VendorContact.find((v) => v.id === ref)?.company || '';

  const sheetRows = useMemo(() => {
    const rows = vendor ? vendorRows(all, vendor) : ordered(all.filter((r) => r.sheet === sheet));
    return rows;
  }, [all, sheet, vendor]);
  const issues = findIssues(all, nameOf);
  const issueIds = new Set(issues.flatMap((i) => i.rowIds));
  const coupleLane = linkedFeedFor(event, store)?.schedule || null;

  const slots = view === 'grid' && !vendor ? grid(sheetRows, { step }) : null;
  const flat = slots ? slots.flatMap((sl) => (sl.rows.length ? sl.rows.map((r) => ({ type: 'row', row: r, minute: sl.minute })) : [{ type: 'slot', minute: sl.minute }])) : sheetRows.map((r) => ({ type: 'row', row: r }));
  const itemIds = flat.filter((x) => x.type === 'row').map((x) => x.row.id);

  const addAt = (minute, sheetName = sheet) => {
    if (!editable) return;
    const row = create('RunSheetRow', { ...BLANK, event_id: event.id, sheet: sheetName, start_minute: minute, status: 'todo', sort: all.length, is_test: true });
    setSelected(row.id);
    setEditing({ ...row, time: fmtTime(minute) });
  };
  const startEdit = (row) => { if (editable) setEditing({ ...row, time: fmtTime(row.start_minute) }); };
  const saveEdit = () => {
    if (!editing) return;
    const minute = parseTime(editing.time);
    update('RunSheetRow', editing.id, {
      item: editing.item.trim() || 'Untitled', location: editing.location, owner_ref: editing.owner_ref, cue: editing.cue, notes: editing.notes,
      duration_minutes: Math.max(0, Number(editing.duration_minutes) || 0), ...(minute !== null ? { start_minute: minute } : {}),
    });
    setEditing(null);
    tableRef.current?.focus();
  };
  const duplicate = (id) => {
    const row = all.find((r) => r.id === id);
    if (!row || !editable) return;
    const copy = create('RunSheetRow', duplicateOf(row));
    setSelected(copy.id);
  };
  const doShift = () => {
    const n = Number(shiftBy);
    if (!selected || !n) return;
    bulk(() => shiftAfter(all, selected, n).forEach((p) => update('RunSheetRow', p.id, { start_minute: p.start_minute })));
  };
  const drop = (targetId) => {
    if (!dragId || !editable) return;
    bulk(() => moveTo(all.filter((r) => r.sheet === sheet), dragId, targetId).forEach((p) => update('RunSheetRow', p.id, p)));
    setDragId(null);
  };
  const tick = (row) => { if (canTick) update('RunSheetRow', row.id, { status: row.status === 'done' ? 'todo' : 'done' }); };

  const onKey = (e) => {
    if (editing) return;
    const at = itemIds.indexOf(selected);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = itemIds[Math.min(itemIds.length - 1, Math.max(0, (at < 0 ? -1 : at) + (e.key === 'ArrowDown' ? 1 : -1)))];
      if (next) setSelected(next);
    } else if (e.key === 'Enter' && selected) {
      e.preventDefault();
      startEdit(all.find((r) => r.id === selected));
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd' && selected) {
      e.preventDefault();
      duplicate(selected);
    }
  };
  useEffect(() => { if (!sheets.includes(sheet) && !vendor) setSheet(sheets[0]); }, [sheets, sheet, vendor]);

  const exportRows = (rows) => rows.map((r) => [fmtTime(r.start_minute), fmtDuration(r.duration_minutes || 0), r.item, r.location, nameOf(r.owner_ref), r.cue, r.notes, (STATUS.find((x) => x.key === r.status) || STATUS[0]).label]);
  const pdf = (format) => downloadTablePdf({
    title: `${event.couple_names}: ${vendor ? `${nameOf(vendor)}'s run sheet` : 'run sheet'}`,
    subtitle: [event.event_date, event.venue].filter(Boolean).join(', '),
    columns: [{ label: 'Time', weight: 0.8 }, { label: 'Length', weight: 0.8 }, { label: 'Item', weight: 2.4 }, { label: 'Location', weight: 1.4 }, { label: 'Responsible', weight: 1.4 }, { label: 'Cue', weight: 1.6 }, { label: 'Notes', weight: 1.8 }, { label: 'Status', weight: 0.7 }],
    rows: [],
    groups: vendor ? [{ label: '', rows: exportRows(sheetRows) }] : sheetsOf(all).map((sh) => ({ label: sh, rows: exportRows(ordered(all.filter((r) => r.sheet === sh))) })),
    format,
    filename: `${fileSlug(`${event.couple_names} run sheet ${vendor ? nameOf(vendor) : ''}`)}-${format}.pdf`,
  });
  const csv = () => downloadCsv(
    `${fileSlug(`${event.couple_names} run sheet`)}.csv`,
    CSV_HEADERS,
    (vendor ? sheetRows : sheetsOf(all).flatMap((sh) => ordered(all.filter((r) => r.sheet === sh)))).map((r) => [r.sheet, fmtTime(r.start_minute), fmtTime(r.start_minute + (r.duration_minutes || 0)), fmtDuration(r.duration_minutes || 0), r.item, r.location, nameOf(r.owner_ref), r.cue, r.notes, (STATUS.find((x) => x.key === r.status) || STATUS[0]).label]),
  );
  const addSheet = () => {
    const next = [...DEFAULT_SHEETS, 'Custom'].find((n) => !sheets.includes(n)) || `Sheet ${sheets.length + 1}`;
    addAt(9 * 60, next);
    setSheet(next);
  };

  const cellInput = (k, props = {}) => (
    <input
      aria-label={k}
      value={editing?.[k] ?? ''}
      onChange={(e) => setEditing((d) => ({ ...d, [k]: e.target.value }))}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(); } if (e.key === 'Escape') { e.preventDefault(); setEditing(null); } }}
      style={{ ...s.input, fontSize: TYPE.body, padding: '4px 0' }}
      {...props}
    />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <div role="tablist" aria-label="Sheets" style={{ display: 'flex', overflowX: 'auto', borderBottom: `1px solid ${PRO.border}`, maxWidth: '100%' }}>
          {sheets.map((sh) => (
            <button key={sh} role="tab" type="button" aria-selected={!vendor && sh === sheet} onClick={() => { setVendor(''); setSheet(sh); }} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${!vendor && sh === sheet ? PRO.text : 'transparent'}`, padding: '8px 10px', fontSize: TYPE.body, fontWeight: 600, color: !vendor && sh === sheet ? PRO.text : PRO.muted, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{sh}</button>
          ))}
          {editable && <button type="button" onClick={addSheet} style={{ ...s.btnQuiet, display: 'inline-flex', gap: 4, alignItems: 'center', color: PRO.muted }}><Plus size={13} /> Sheet</button>}
        </div>
        <span style={{ flex: 1 }} />
        <button type="button" style={s.btnSecondary} onClick={csv}>CSV</button>
        <button type="button" style={s.btnSecondary} onClick={() => pdf('a4')}>PDF, A4</button>
        <button type="button" style={s.btnSecondary} onClick={() => pdf('letter')}>PDF, Letter</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <span style={s.label}>Rows every</span>
        {STEPS.map((n) => <FilterPill key={n} label={`${n} min`} active={view === 'grid' && step === n} onClick={() => { setView('grid'); setStep(n); }} />)}
        <FilterPill label="Items only" active={view === 'items'} onClick={() => setView('items')} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', marginLeft: mobile ? 0 : 8 }}>
          <span style={s.label}>Show</span>
          <select aria-label="Filter by vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} style={{ ...s.input, width: 'auto', fontSize: TYPE.pill }}>
            <option value="">The whole sheet</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.company}&apos;s items only</option>)}
          </select>
        </span>
        {editable && selected && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: mobile ? 0 : 8 }}>
            <span style={s.label}>Shift everything after this row by</span>
            <input aria-label="Minutes to shift" inputMode="numeric" value={shiftBy} onChange={(e) => setShiftBy(e.target.value)} style={{ ...s.input, width: 48, fontSize: TYPE.body }} />
            <span style={s.secondary}>min</span>
            <button type="button" style={s.btnSecondary} onClick={doShift}>Shift</button>
          </span>
        )}
      </div>

      {issues.length > 0 && (
        <div role="status" style={{ ...s.card, padding: '10px 14px', borderLeft: '3px solid #854d0e', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {issues.map((i) => (
            <span key={i.kind + i.rowIds.join()} style={{ ...s.body, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <AlertTriangle size={13} color="#854d0e" style={{ marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
              <span><strong style={{ fontWeight: 600 }}>{i.kind === 'clash' ? 'Clash' : 'Gap'}.</strong> {i.text}</span>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexDirection: mobile ? 'column' : 'row' }}>
        <div
          ref={tableRef}
          tabIndex={0}
          onKeyDown={onKey}
          aria-label="Run sheet. Arrows to move, Enter to edit, Command or Control D to duplicate."
          style={{ flex: 1, minWidth: 0, background: mobile ? 'transparent' : '#FFFFFF', border: mobile ? 'none' : `1px solid ${PRO.border}`, overflow: mobile ? 'visible' : 'auto', maxHeight: mobile ? 'none' : '70vh', outline: 'none', width: '100%' }}
        >
          {mobile ? (
            // AT 390, STACKED CARDS, NO SIDEWAYS SCROLL (owner ruling 2026-10-14):
            // time, item, length, then the rest.
            <div role="list" aria-label="Run sheet rows" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {flat.length === 0 && <p style={{ ...s.secondary, margin: 0 }}>{vendor ? 'Nothing on this sheet for this vendor yet.' : 'No rows yet.'}</p>}
              {flat.map((x) => {
                if (x.type === 'slot') {
                  return (
                    <button key={`slot${x.minute}`} type="button" role="listitem" onClick={() => addAt(x.minute)} disabled={!editable} style={{ display: 'flex', gap: 12, alignItems: 'center', minHeight: 36, padding: '0 12px', background: '#FFFFFF', border: `1px solid ${PRO.border}`, fontFamily: 'inherit', textAlign: 'left', cursor: editable ? 'pointer' : 'default' }}>
                      <span style={{ ...s.secondary, width: 64 }}>{fmtTime(x.minute)}</span>
                      <span style={{ fontSize: TYPE.secondary, color: PRO.placeholder }}>{editable ? 'Add an item' : ''}</span>
                    </button>
                  );
                }
                const r = x.row;
                if (editing?.id === r.id) {
                  return (
                    <div key={r.id} role="listitem" style={{ ...s.card, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[['time', 'Time'], ['item', 'Item'], ['duration_minutes', 'Length in minutes'], ['location', 'Location'], ['cue', 'Cue'], ['notes', 'Notes']].map(([k, label]) => (
                        <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={s.label}>{label}</span>{cellInput(k, { autoFocus: k === 'time' })}</label>
                      ))}
                      <label style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={s.label}>Responsible</span>
                        <select aria-label="Responsible" value={editing.owner_ref || ''} onChange={(e) => setEditing((d) => ({ ...d, owner_ref: e.target.value }))} style={{ ...s.input, fontSize: TYPE.input }}>
                          <option value="">Nobody yet</option>
                          <optgroup label="Team">{team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</optgroup>
                          <optgroup label="Vendors">{vendors.map((v) => <option key={v.id} value={v.id}>{v.company}</option>)}</optgroup>
                        </select>
                      </label>
                      <span style={{ display: 'flex', gap: 8 }}>
                        <button type="button" style={s.btnPrimary} onClick={saveEdit}>Save</button>
                        <button type="button" style={s.btnSecondary} onClick={() => setEditing(null)}>Cancel</button>
                        <button type="button" style={s.btnQuiet} onClick={() => { remove('RunSheetRow', r.id); setEditing(null); }}>Delete</button>
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={r.id} role="listitem" onClick={() => setSelected(r.id)} style={{ ...s.card, padding: 14, display: 'flex', flexDirection: 'column', gap: 4, outline: selected === r.id ? `1px solid ${PRO.text}` : 'none', outlineOffset: -1, opacity: r.status === 'skipped' ? 0.6 : 1 }}>
                    <span style={{ fontSize: TYPE.input, fontWeight: 700 }}>{fmtTime(r.start_minute)}</span>
                    <span style={{ fontSize: TYPE.input, fontWeight: 600, overflowWrap: 'anywhere' }}>
                      {issueIds.has(r.id) && <AlertTriangle size={12} color="#854d0e" aria-label="See the warning above" style={{ marginRight: 4, verticalAlign: '-1px' }} />}
                      {r.item}
                    </span>
                    <span style={s.secondary}>{fmtDuration(r.duration_minutes || 0)}{vendor ? `, ${r.sheet}` : ''}</span>
                    {(r.location || r.owner_ref) && <span style={s.body}>{[r.location, nameOf(r.owner_ref)].filter(Boolean).join(', ')}</span>}
                    {r.cue && <span style={s.body}>Cue: {r.cue}</span>}
                    {r.notes && <span style={{ ...s.secondary, overflowWrap: 'anywhere' }}>{r.notes}</span>}
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                      <button type="button" disabled={!canTick} onClick={(e) => { e.stopPropagation(); tick(r); }} style={{ background: 'none', border: 'none', padding: 0, cursor: canTick ? 'pointer' : 'default' }} aria-label={r.status === 'done' ? `Mark ${r.item} not done` : `Mark ${r.item} done`}>
                        <Pill tone={r.status === 'done' ? 'good' : r.status === 'skipped' ? 'plain' : 'wait'}>{(STATUS.find((x2) => x2.key === r.status) || STATUS[0]).label}</Pill>
                      </button>
                      {editable && <button type="button" style={s.btnQuiet} onClick={(e) => { e.stopPropagation(); setSelected(r.id); startEdit(r); }}>Edit</button>}
                      {editable && <button type="button" style={s.btnQuiet} onClick={(e) => { e.stopPropagation(); duplicate(r.id); }}>Duplicate</button>}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr>
                {['', 'Time', 'Length', 'Item', 'Location', 'Responsible', 'Cue', 'Notes', 'Status'].map((h) => <th key={h || 'grip'} style={{ ...s.th, width: h === '' ? 24 : undefined }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {flat.length === 0 && (
                <tr><td colSpan={9} style={{ ...s.td, color: PRO.muted }}>{vendor ? 'Nothing on this sheet for this vendor yet.' : 'No rows yet. Switch to a grid to add one at a time.'}</td></tr>
              )}
              {flat.map((x) => {
                if (x.type === 'slot') {
                  return (
                    <tr key={`slot${x.minute}`} onClick={() => addAt(x.minute)} style={{ cursor: editable ? 'pointer' : 'default' }}>
                      <td style={{ ...s.td, height: 28 }} />
                      <td style={{ ...s.td, height: 28, color: PRO.muted, fontSize: TYPE.secondary }}>{fmtTime(x.minute)}</td>
                      <td colSpan={7} style={{ ...s.td, height: 28, color: PRO.placeholder, fontSize: TYPE.secondary }}>{editable ? 'Add an item' : ''}</td>
                    </tr>
                  );
                }
                const r = x.row;
                const isSel = selected === r.id;
                if (editing?.id === r.id) {
                  return (
                    <tr key={r.id} style={{ background: 'rgba(224,53,83,0.04)' }}>
                      <td style={s.td} />
                      <td style={s.td}>{cellInput('time', { autoFocus: true, style: { ...s.input, width: 80, fontSize: TYPE.body } })}</td>
                      <td style={s.td}>{cellInput('duration_minutes', { inputMode: 'numeric', style: { ...s.input, width: 48, fontSize: TYPE.body } })}</td>
                      <td style={s.td}>{cellInput('item')}</td>
                      <td style={s.td}>{cellInput('location')}</td>
                      <td style={s.td}>
                        <select aria-label="Responsible" value={editing.owner_ref || ''} onChange={(e) => setEditing((d) => ({ ...d, owner_ref: e.target.value }))} style={{ ...s.input, fontSize: TYPE.body }}>
                          <option value="">Nobody yet</option>
                          <optgroup label="Team">{team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</optgroup>
                          <optgroup label="Vendors">{vendors.map((v) => <option key={v.id} value={v.id}>{v.company}</option>)}</optgroup>
                        </select>
                      </td>
                      <td style={s.td}>{cellInput('cue')}</td>
                      <td style={s.td}>{cellInput('notes')}</td>
                      <td style={{ ...s.td, display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button type="button" style={s.btnPrimary} onClick={saveEdit}>Save</button>
                        <button type="button" style={s.btnQuiet} onClick={() => { remove('RunSheetRow', r.id); setEditing(null); }}>Delete</button>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr
                    key={r.id}
                    draggable={editable}
                    onDragStart={() => setDragId(r.id)}
                    onDragOver={(e) => { if (dragId) e.preventDefault(); }}
                    onDrop={() => drop(r.id)}
                    onClick={() => setSelected(r.id)}
                    onDoubleClick={() => startEdit(r)}
                    aria-selected={isSel}
                    style={{ background: isSel ? 'rgba(10,10,10,0.04)' : 'transparent', outline: isSel ? `1px solid ${PRO.text}` : 'none', outlineOffset: -1, opacity: r.status === 'skipped' ? 0.6 : 1 }}
                  >
                    <td style={{ ...s.td, color: PRO.icon, cursor: editable ? 'grab' : 'default' }}>{editable && <GripVertical size={13} aria-hidden="true" />}</td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{fmtTime(r.start_minute)}</td>
                    <td style={{ ...s.td, color: PRO.muted }}>{fmtDuration(r.duration_minutes || 0)}</td>
                    <td style={{ ...s.td, whiteSpace: 'normal', minWidth: 180 }}>
                      {issueIds.has(r.id) && <AlertTriangle size={12} color="#854d0e" aria-label="See the warning above" style={{ marginRight: 4, verticalAlign: '-1px' }} />}
                      {vendor && <span style={{ ...s.secondary, marginRight: 6 }}>{r.sheet}</span>}
                      {r.item}
                    </td>
                    <td style={{ ...s.td, whiteSpace: 'normal' }}>{r.location}</td>
                    <td style={s.td}>{nameOf(r.owner_ref)}</td>
                    <td style={{ ...s.td, whiteSpace: 'normal', color: PRO.muted }}>{r.cue}</td>
                    <td style={{ ...s.td, whiteSpace: 'normal', color: PRO.muted }}>{r.notes}</td>
                    <td style={s.td}>
                      <button type="button" disabled={!canTick} onClick={(e) => { e.stopPropagation(); tick(r); }} style={{ background: 'none', border: 'none', padding: 0, cursor: canTick ? 'pointer' : 'default' }} aria-label={r.status === 'done' ? `Mark ${r.item} not done` : `Mark ${r.item} done`}>
                        <Pill tone={r.status === 'done' ? 'good' : r.status === 'skipped' ? 'plain' : 'wait'}>{(STATUS.find((x2) => x2.key === r.status) || STATUS[0]).label}</Pill>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>

        {coupleLane && (
          <aside aria-label="The couple's schedule" style={{ ...s.card, width: mobile ? '100%' : 260, flexShrink: 0, padding: 14 }}>
            <h3 style={{ ...s.cardTitle, marginBottom: 4 }}>The couple&apos;s schedule</h3>
            <p style={{ ...s.secondary, margin: '0 0 10px' }}>Shared from their Openinvite. Read-only.</p>
            {coupleLane.length === 0 ? <p style={{ ...s.secondary, margin: 0 }}>Nothing on it yet.</p> : coupleLane.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderTop: i ? `1px solid ${PRO.border}` : 'none' }}>
                <span style={{ ...s.secondary, width: 64, flexShrink: 0 }}>{c.time}</span>
                <span style={s.body}>{c.title}{c.location ? <span style={s.secondary}>, {c.location}</span> : null}</span>
              </div>
            ))}
          </aside>
        )}
      </div>
      {editable && <p style={{ ...s.secondary, margin: 0 }}>Click a row to select it, double-click or press Enter to edit, drag to reorder. Cmd or Ctrl+D duplicates.</p>}
    </div>
  );
}
