import React, { useState, useRef, useCallback, useMemo } from 'react';
import { X, Users, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';

const Guest = base44.entities.Guest;
const PJS = "'Plus Jakarta Sans', sans-serif";

const COLS = [
  { key: 'firstName', label: 'First name' },
  { key: 'lastName',  label: 'Last name' },
  { key: 'email',     label: 'Email' },
  { key: 'phone',     label: 'Phone' },
];

const emptyRow = () => ({ firstName: '', lastName: '', email: '', phone: '' });

const isValid = r => r.firstName.trim() !== '' || r.email.trim() !== '';

export default function BulkAddGuestModal({ onClose, onImported }) {
  const [rows, setRows] = useState(() => Array.from({ length: 10 }, emptyRow));
  const [importing, setImporting] = useState(false);
  const cellRefs = useRef([]);

  const validCount = useMemo(() => rows.filter(isValid).length, [rows]);

  const updateCell = useCallback((rowIdx, key, value) => {
    setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, [key]: value } : r));
  }, []);

  const addRows = () => {
    setRows(prev => [...prev, ...Array.from({ length: 10 }, emptyRow)]);
  };

  const handlePaste = (e, rowIdx, colIdx) => {
    const text = e.clipboardData.getData('text');
    // Only intercept multi-cell paste (tabs or multiple lines)
    if (!text.includes('\t') && !text.includes('\n') && !text.includes('\r')) return;

    e.preventDefault();

    const pastedRows = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trimEnd()
      .split('\n')
      .map(line => line.split('\t'));

    setRows(prev => {
      const next = [...prev];
      const neededRows = rowIdx + pastedRows.length;
      while (next.length < neededRows) next.push(emptyRow());

      pastedRows.forEach((pastedCols, ri) => {
        const tr = rowIdx + ri;
        const updated = { ...next[tr] };
        pastedCols.forEach((val, ci) => {
          const tc = colIdx + ci;
          if (tc < COLS.length) updated[COLS[tc].key] = val.trim();
        });
        next[tr] = updated;
      });

      return next;
    });
  };

  const handleKeyDown = (e, rowIdx, colIdx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextRow = rowIdx + 1;
      if (nextRow < rows.length) {
        cellRefs.current[nextRow]?.[colIdx]?.focus();
      }
    }
  };

  const handleImport = async () => {
    const valid = rows.filter(isValid);
    if (valid.length === 0) return;
    setImporting(true);
    const tid = toast.loading(`Adding ${valid.length} guest${valid.length !== 1 ? 's' : ''}…`);
    try {
      await Promise.all(
        valid.map(r => {
          const firstName = r.firstName.trim();
          const lastName = r.lastName.trim();
          const name = [firstName, lastName].filter(Boolean).join(' ') || r.email.trim();
          return Guest.create({
            name,
            email:  r.email.trim()  || undefined,
            phone:  r.phone.trim()  || undefined,
            rsvp_status: 'pending',
          });
        })
      );
      toast.success(`${valid.length} guest${valid.length !== 1 ? 's' : ''} added`, { id: tid });
      onImported();
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Import failed', { id: tid });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#FFFFFF',
        width: '100%', maxWidth: 680,
        border: '1px solid rgba(10,10,10,0.10)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={15} style={{ color: '#E03553' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>Bulk add guests</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'rgba(10,10,10,0.4)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Grid */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 36 }} />
              {COLS.map(() => <col key={Math.random()} />)}
            </colgroup>

            {/* Column headers */}
            <thead>
              <tr style={{ background: '#F5F5F3', borderBottom: '2px solid rgba(10,10,10,0.10)' }}>
                <th style={{ padding: '8px 4px', textAlign: 'center' }} />
                {COLS.map((col, ci) => (
                  <th key={col.key} style={{
                    padding: '8px 10px', textAlign: 'left',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                    color: 'rgba(10,10,10,0.45)', fontFamily: PJS,
                    borderLeft: '1px solid rgba(10,10,10,0.08)',
                  }}>
                    {col.label}{ci > 1 ? <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(10,10,10,0.3)', marginLeft: 4 }}>optional</span> : null}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, rowIdx) => {
                const filled = isValid(row);
                return (
                  <tr
                    key={rowIdx}
                    style={{
                      borderBottom: '1px solid rgba(10,10,10,0.06)',
                      background: filled ? 'rgba(224,53,83,0.025)' : rowIdx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                    }}
                  >
                    {/* Row number */}
                    <td style={{ textAlign: 'center', fontSize: 10, color: 'rgba(10,10,10,0.22)', fontFamily: PJS, userSelect: 'none', borderRight: '1px solid rgba(10,10,10,0.08)' }}>
                      {rowIdx + 1}
                    </td>

                    {COLS.map((col, colIdx) => (
                      <td key={col.key} style={{ padding: 0, borderLeft: '1px solid rgba(10,10,10,0.06)' }}>
                        <input
                          ref={el => {
                            if (!cellRefs.current[rowIdx]) cellRefs.current[rowIdx] = [];
                            cellRefs.current[rowIdx][colIdx] = el;
                          }}
                          autoFocus={rowIdx === 0 && colIdx === 0}
                          type={col.key === 'email' ? 'email' : col.key === 'phone' ? 'tel' : 'text'}
                          value={row[col.key]}
                          onChange={e => updateCell(rowIdx, col.key, e.target.value)}
                          onPaste={e => handlePaste(e, rowIdx, colIdx)}
                          onKeyDown={e => handleKeyDown(e, rowIdx, colIdx)}
                          placeholder={rowIdx === 0 && colIdx === 0 ? 'Type or paste from Excel / Sheets' : ''}
                          style={{
                            width: '100%', height: 32, boxSizing: 'border-box',
                            border: 'none', padding: '0 10px',
                            fontSize: 13, fontFamily: PJS, color: '#0A0A0A',
                            background: 'transparent', outline: 'none',
                          }}
                          onFocus={e => { e.target.style.boxShadow = 'inset 0 0 0 2px #E03553'; e.target.style.background = 'rgba(224,53,83,0.04)'; }}
                          onBlur={e => { e.target.style.boxShadow = 'none'; e.target.style.background = 'transparent'; }}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Add more rows */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(10,10,10,0.06)' }}>
            <button
              onClick={addRows}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, color: 'rgba(10,10,10,0.4)',
                fontFamily: PJS, padding: '2px 0',
              }}
            >
              <Plus size={12} />
              Add 10 more rows
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 24px', borderTop: '1px solid rgba(10,10,10,0.08)', flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, color: validCount > 0 ? '#0A0A0A' : 'rgba(10,10,10,0.35)', fontFamily: PJS, fontWeight: validCount > 0 ? 600 : 400 }}>
            {validCount > 0 ? `${validCount} guest${validCount !== 1 ? 's' : ''} ready to import` : 'No guests yet — fill in at least a first name or email'}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} className="btn-editorial-secondary" style={{ fontSize: 12 }}>
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={validCount === 0 || importing}
              className="btn-primary"
              style={{ fontSize: 12, opacity: validCount === 0 || importing ? 0.45 : 1, cursor: validCount === 0 || importing ? 'not-allowed' : 'pointer' }}
            >
              {importing ? 'Adding…' : `Import ${validCount || ''} guest${validCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
