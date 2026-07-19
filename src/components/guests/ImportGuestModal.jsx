import React, { useState, useRef } from 'react';
import { X, Upload, Download, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getMyRecords } from '@/lib/resolveMyWedding';
import toast from 'react-hot-toast';

const Guest = base44.entities.Guest;
const PJS = "'Plus Jakarta Sans', sans-serif";

// feat/guestlist-editable: simplified to exactly what a couple needs to get
// guests in fast — category, RSVP, table, and dietary are all editable
// in-place afterwards (single cell, or bulk-edit for many at once), so
// they're no longer import-time fields at all.
const TEMPLATE_HEADERS = ['Name', 'Email', 'Phone', 'Plus one (Y/blank)'];

const VALID_RSVP = ['attending', 'declined', 'pending', 'maybe'];

function rowToGuest(row) {
  const name = String(row['Name'] ?? '').trim();
  if (!name) throw new Error('Name is required');

  // Support the current 'Plus one (Y/blank)' header and older exports'
  // 'Plus one' / '+1'.
  const plusOneRaw = String(row['Plus one (Y/blank)'] ?? row['Plus one'] ?? row['+1'] ?? '').toLowerCase().trim();
  const plusOne = ['yes', 'true', '1', 'x', 'y'].includes(plusOneRaw);

  // RSVP/table/dietary are tolerated from an older-format file for backward
  // compatibility, but are no longer part of the template. Category is
  // deliberately NEVER read from any import — an imported guest's category
  // is always blank, set afterwards via inline or bulk edit, never guessed
  // or defaulted (was silently landing on the schema's old 'family'
  // default; that default has been removed).
  const rsvpRaw = String(row['RSVP'] ?? '').toLowerCase().trim();
  const rsvpStatus = VALID_RSVP.includes(rsvpRaw) ? rsvpRaw : 'pending';

  return {
    name,
    email: String(row['Email'] ?? '').trim() || undefined,
    phone: String(row['Phone'] ?? '').trim() || undefined,
    rsvp_status: rsvpStatus,
    table_assignment: String(row['Table'] ?? '').trim() || undefined,
    plus_one: plusOne,
    plus_one_name: String(row['Plus one name'] ?? row['+1 Name'] ?? '').trim() || undefined,
    dietary_restrictions: String(row['Dietary requirements'] ?? '').trim() || undefined,
  };
}

export default function ImportGuestModal({ onClose, onImported }) {
  const [rows, setRows] = useState(null);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Guests');
    XLSX.writeFile(wb, 'guest-list-template.csv');
  };

  const parseFile = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx');
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (jsonRows.length === 0) {
          toast.error('File is empty or has no data rows');
          return;
        }
        const parsed = jsonRows.map((row, i) => {
          try {
            return { ...rowToGuest(row), _rowIndex: i + 2, _error: null };
          } catch (err) {
            return { _rowIndex: i + 2, _error: err.message, name: '—', rsvp_status: '—', plus_one: false };
          }
        });
        setRows(parsed);
      } catch {
        toast.error('Failed to parse file — check it is a valid CSV or XLSX');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFile = (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }
    parseFile(file);
  };

  const handleImport = async () => {
    if (!rows) return;
    const validRows = rows.filter(r => !r._error);
    if (validRows.length === 0) { toast.error('No valid rows to import'); return; }
    setImporting(true);
    const tid = toast.loading(`Importing ${validRows.length} guests…`);

    // Skip rows whose email already matches an existing guest — importing
    // the same list twice (a common re-export/re-import habit) would
    // otherwise silently double every guest.
    const existingGuests = await getMyRecords('Guest').catch(() => []);
    const existingEmails = new Set(
      existingGuests.map(g => g.email?.trim().toLowerCase()).filter(Boolean)
    );

    const toImport = [];
    const duplicates = [];
    for (const row of validRows) {
      const email = row.email?.trim().toLowerCase();
      if (email && existingEmails.has(email)) {
        duplicates.push(row._rowIndex);
      } else {
        toImport.push(row);
        if (email) existingEmails.add(email); // guard against duplicate emails within the same file
      }
    }

    const failed = [];
    await Promise.all(toImport.map(async (row) => {
      const { _rowIndex, _error, ...guestData } = row;
      try {
        await Guest.create(guestData);
      } catch (err) {
        failed.push(_rowIndex);
      }
    }));
    setImporting(false);

    const importedCount = toImport.length - failed.length;
    if (failed.length === 0 && duplicates.length === 0) {
      toast.success(`${importedCount} guests imported`, { id: tid });
      onImported();
      onClose();
    } else {
      const parts = [];
      if (importedCount > 0) parts.push(`${importedCount} imported`);
      if (duplicates.length > 0) parts.push(`${duplicates.length} skipped (already on your list)`);
      if (failed.length > 0) parts.push(`${failed.length} failed`);
      toast(parts.join(' · '), { id: tid, icon: duplicates.length > 0 || failed.length > 0 ? '⚠️' : undefined });
      setRows(prev => prev.map(r => {
        if (failed.includes(r._rowIndex)) return { ...r, _error: 'Failed to save' };
        if (duplicates.includes(r._rowIndex)) return { ...r, _error: 'Already on your guest list — skipped' };
        return r;
      }));
      if (importedCount > 0) onImported();
      if (failed.length === 0) {
        // Only genuine duplicates remain flagged — nothing left to retry, safe to close.
        onClose();
      }
    }
  };

  const errorRows = rows ? rows.filter(r => r._error) : [];
  const validCount = rows ? rows.filter(r => !r._error).length : 0;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.55)', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 660, maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', border: '1px solid #E5E5E5', borderRadius: 0, padding: 32 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: 0 }}>Import guest list</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', padding: 4, marginTop: -2 }}>
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.5)', fontFamily: PJS, margin: '0 0 24px' }}>
          Upload an Excel (.xlsx) or CSV file to add guests in bulk.
        </p>

        {/* Download template */}
        <button
          onClick={downloadTemplate}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid #E5E5E5', borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, cursor: 'pointer', marginBottom: 24, transition: 'background 0.12s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F5F4F0'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        >
          <Download size={13} />Download template
        </button>

        {/* Drop zone — only shown before file is chosen */}
        {!rows && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? '#E03553' : 'rgba(10,10,10,0.15)'}`,
              borderRadius: 0,
              padding: '48px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'rgba(224,53,83,0.03)' : 'transparent',
              transition: 'border-color 0.15s, background 0.15s',
              marginBottom: 24,
            }}
          >
            <Upload size={24} style={{ color: 'rgba(10,10,10,0.2)', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 4px' }}>Drag and drop or click to upload</p>
            <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: 0 }}>Accepts .csv and .xlsx</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])}
            />
          </div>
        )}

        {/* Preview table */}
        {rows && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: 0 }}>
                Preview — {validCount} of {rows.length} rows valid
              </p>
              <button
                onClick={() => setRows(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#E03553', fontFamily: PJS, padding: 0 }}
              >
                Change file
              </button>
            </div>
            <div style={{ border: '1px solid rgba(10,10,10,0.08)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto', maxHeight: 280, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: PJS }}>
                  <thead style={{ position: 'sticky', top: 0 }}>
                    <tr style={{ background: '#FAFAFA', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
                      {['Name', 'Email', 'Phone', '+1', 'Status'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.4)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(10,10,10,0.05)', background: row._error ? 'rgba(224,53,83,0.04)' : 'transparent' }}>
                        <td style={{ padding: '8px 12px', color: '#0A0A0A', fontWeight: 600, verticalAlign: 'middle' }}>{row.name || '—'}</td>
                        <td style={{ padding: '8px 12px', color: '#444', verticalAlign: 'middle' }}>{row.email || '—'}</td>
                        <td style={{ padding: '8px 12px', color: '#444', verticalAlign: 'middle' }}>{row.phone || '—'}</td>
                        <td style={{ padding: '8px 12px', color: '#444', verticalAlign: 'middle' }}>{row.plus_one ? 'Yes' : 'No'}</td>
                        <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                          {row._error
                            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#E03553', fontSize: 11, fontWeight: 600 }}><AlertCircle size={11} />{row._error}</span>
                            : <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 600 }}>OK</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Error summary */}
        {errorRows.length > 0 && (
          <div style={{ background: 'rgba(224,53,83,0.05)', border: '1px solid rgba(224,53,83,0.18)', padding: '12px 16px', marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#E03553', fontFamily: PJS, margin: '0 0 6px' }}>
              {errorRows.length} row{errorRows.length > 1 ? 's' : ''} with issues (will be skipped)
            </p>
            {errorRows.slice(0, 5).map((e, i) => (
              <p key={i} style={{ fontSize: 12, color: '#E03553', fontFamily: PJS, margin: '2px 0' }}>
                Row {e._rowIndex}: {e._error}
              </p>
            ))}
            {errorRows.length > 5 && (
              <p style={{ fontSize: 12, color: '#E03553', fontFamily: PJS, margin: '4px 0 0' }}>…and {errorRows.length - 5} more</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ background: 'none', border: '1px solid #E5E5E5', borderRadius: 999, padding: '7px 18px', fontSize: 12, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F5F4F0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            Cancel
          </button>
          {rows && validCount > 0 && (
            <button
              onClick={handleImport}
              disabled={importing}
              style={{ background: '#E03553', border: 'none', borderRadius: 999, padding: '7px 18px', fontSize: 12, fontWeight: 600, color: '#FFFFFF', fontFamily: PJS, cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.7 : 1 }}
            >
              {importing ? 'Importing…' : `Import ${validCount} guest${validCount !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
