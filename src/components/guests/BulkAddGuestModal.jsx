import React, { useState, useMemo } from 'react';
import { X, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';

const Guest = base44.entities.Guest;
const PJS = "'Plus Jakarta Sans', sans-serif";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseLine(raw) {
  const line = raw.trim();
  if (!line) return null;

  // Split on comma or tab
  const parts = line.split(/[,\t]/).map(p => p.trim()).filter(Boolean);

  if (parts.length >= 2) {
    const emailPart = parts.find(p => EMAIL_RE.test(p)) || null;
    const namePart = parts.filter(p => !EMAIL_RE.test(p)).join(' ').trim() || null;
    if (namePart || emailPart) return { name: namePart, email: emailPart };
  }

  // Single token
  if (EMAIL_RE.test(line)) return { name: null, email: line };
  return { name: line, email: null };
}

export default function BulkAddGuestModal({ onClose, onImported }) {
  const [text, setText] = useState('');
  const [importing, setImporting] = useState(false);

  const parsed = useMemo(() => {
    return text
      .split('\n')
      .map(parseLine)
      .filter(Boolean);
  }, [text]);

  const handleImport = async () => {
    if (parsed.length === 0) return;
    setImporting(true);
    const tid = toast.loading(`Adding ${parsed.length} guest${parsed.length > 1 ? 's' : ''}…`);
    try {
      await Promise.all(
        parsed.map(g =>
          Guest.create({
            name: g.name || g.email,
            email: g.email || undefined,
            rsvp_status: 'pending',
          })
        )
      );
      toast.success(`${parsed.length} guest${parsed.length > 1 ? 's' : ''} added`, { id: tid });
      onImported();
      onClose();
    } catch (e) {
      toast.error(e?.message || 'Import failed', { id: tid });
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
        width: '100%', maxWidth: 540,
        border: '1px solid rgba(10,10,10,0.10)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={16} style={{ color: '#E03553' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>Bulk add guests</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', color: 'rgba(10,10,10,0.4)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <textarea
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`Paste names and emails, one per line. Examples:\nSarah Johnson, sarah@gmail.com\nMichael Chen\nemily@gmail.com`}
            rows={7}
            style={{
              width: '100%', boxSizing: 'border-box',
              border: '1px solid rgba(10,10,10,0.15)',
              padding: '12px 14px',
              fontSize: 13, fontFamily: PJS, color: '#0A0A0A',
              lineHeight: 1.6,
              resize: 'vertical', outline: 'none',
              background: '#FAFAFA',
            }}
            onFocus={e => { e.target.style.borderColor = '#E03553'; e.target.style.background = '#FFFFFF'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(10,10,10,0.15)'; e.target.style.background = '#FAFAFA'; }}
          />

          {/* Preview */}
          {parsed.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 0 10px' }}>
                {parsed.length} guest{parsed.length > 1 ? 's' : ''} ready to import
              </p>
              <div style={{ border: '1px solid rgba(10,10,10,0.08)', maxHeight: 220, overflowY: 'auto' }}>
                {parsed.map((g, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px',
                      borderBottom: i < parsed.length - 1 ? '1px solid rgba(10,10,10,0.06)' : 'none',
                      background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                    }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F0F0EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>
                        {(g.name || g.email || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {g.name && (
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {g.name}
                        </p>
                      )}
                      {g.email && (
                        <p style={{ margin: 0, fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {g.email}
                        </p>
                      )}
                      {!g.name && !g.email && (
                        <p style={{ margin: 0, fontSize: 12, color: '#E03553', fontFamily: PJS }}>Could not parse</p>
                      )}
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(10,10,10,0.3)', fontFamily: PJS, flexShrink: 0 }}>pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid rgba(10,10,10,0.08)' }}>
          <button onClick={onClose} className="btn-editorial-secondary" style={{ fontSize: 13 }}>
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={parsed.length === 0 || importing}
            className="btn-primary"
            style={{ fontSize: 13, opacity: parsed.length === 0 || importing ? 0.5 : 1, cursor: parsed.length === 0 || importing ? 'not-allowed' : 'pointer' }}
          >
            {importing ? 'Adding…' : `Import ${parsed.length > 0 ? parsed.length : ''} guest${parsed.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
