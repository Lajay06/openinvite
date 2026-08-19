import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Download, AlertCircle } from 'lucide-react';
import { downloadGuestTemplate, parseGuestFile } from '@/lib/guestImport';

const PJS = "'Plus Jakarta Sans', sans-serif";

// Was a broken stub — took the first 4 raw lines of any uploaded file
// (header row included) and stored each whole line as a single guest's
// name, with no real column parsing despite the UI claiming "Expected
// columns: Name, Email, Phone, Group". Now shares the dashboard's real
// template-download + XLSX/CSV column-mapped parser + row-validation
// preview (src/lib/guestImport.js, also used by ImportGuestModal.jsx),
// so a couple who imports here sees the exact same, correct behaviour
// they'd get from Guests.jsx later.
export default function OnboardingPathAGuestList({ onNext }) {
  const [rows, setRows] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [parseError, setParseError] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setParseError('Please upload a CSV or Excel file');
      return;
    }
    try {
      setParseError('');
      setRows(await parseGuestFile(file));
    } catch (err) {
      setParseError(err.message);
    }
  };

  const handleSubmit = () => {
    const validGuests = (rows || [])
      .filter(r => !r._error)
      .map(({ _rowIndex, _error, ...guest }) => guest);
    onNext({ guestList: validGuests });
  };

  const errorRows = rows ? rows.filter(r => r._error) : [];
  const validCount = rows ? rows.filter(r => !r._error).length : 0;

  return (
    <div className="w-full max-w-2xl">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-bold text-[#0A0A0A] mb-3"
        style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}
      >
        Let's add your guests.
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-12 text-left"
      >
        <button
          type="button"
          onClick={downloadGuestTemplate}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid rgba(10,10,10,0.18)', borderRadius: 999, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, cursor: 'pointer', marginBottom: 20 }}
        >
          <Download size={13} />Download template
        </button>

        {!rows && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? '#E03553' : 'rgba(10,10,10,0.18)'}`,
              padding: '48px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragOver ? 'rgba(224,53,83,0.03)' : 'transparent',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <Upload size={24} style={{ color: 'rgba(10,10,10,0.2)', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 4px' }}>Drag and drop or click to upload</p>
            <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0 }}>Accepts .csv and .xlsx (download the template above if you're starting from scratch)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])}
            />
          </div>
        )}

        {parseError && (
          <p style={{ fontSize: 13, color: '#E03553', fontFamily: PJS, margin: '10px 0 0' }}>{parseError}</p>
        )}

        {rows && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0 }}>
                Preview ({validCount} of {rows.length} rows valid)
              </p>
              <button
                onClick={() => setRows(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#E03553', fontFamily: PJS, padding: 0 }}
              >
                Change file
              </button>
            </div>
            <div style={{ border: '1px solid rgba(10,10,10,0.12)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto', maxHeight: 240, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: PJS }}>
                  <thead style={{ position: 'sticky', top: 0 }}>
                    <tr style={{ background: '#FAFAFA', borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
                      {['Name', 'Email', 'Phone', '+1', 'Status'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.6)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(10,10,10,0.05)', background: row._error ? 'rgba(224,53,83,0.04)' : 'transparent' }}>
                        <td style={{ padding: '8px 12px', color: '#0A0A0A', fontWeight: 600 }}>{row.name || '(none)'}</td>
                        <td style={{ padding: '8px 12px', color: '#444' }}>{row.email || '(none)'}</td>
                        <td style={{ padding: '8px 12px', color: '#444' }}>{row.phone || '(none)'}</td>
                        <td style={{ padding: '8px 12px', color: '#444' }}>{row.plus_one ? 'Yes' : 'No'}</td>
                        <td style={{ padding: '8px 12px' }}>
                          {row._error
                            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#E03553', fontSize: 11, fontWeight: 600 }}><AlertCircle size={11} />{row._error}</span>
                            : <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 600 }}>OK</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {errorRows.length > 0 && (
              <p style={{ fontSize: 12, color: '#E03553', fontFamily: PJS, margin: '10px 0 0' }}>
                {errorRows.length} row{errorRows.length > 1 ? 's' : ''} will be skipped. Fix and re-upload if needed.
              </p>
            )}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <button
          onClick={handleSubmit}
          className="px-8 py-3 rounded-full text-white text-sm font-medium tracking-widest bg-[#E03553] hover:bg-black active:bg-neutral-900 transition-colors duration-150"
        >
          Continue →
        </button>

        <button
          onClick={() => onNext({ guestList: [] })}
          className="block text-[rgba(10,10,10,0.6)] hover:text-[#0A0A0A] text-sm transition-colors"
        >
          Skip for now →
        </button>
      </motion.div>
    </div>
  );
}
