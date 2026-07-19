import React, { useState } from 'react';
import { X, Search, Check } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { interactiveDivProps, useModalFocusTrap } from '@/lib/a11y';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function CurrencyModal({ onClose }) {
  const { currencyCode, currencies, updateCurrency } = useCurrency();
  const [selected, setSelected] = useState(currencyCode);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = currencies.filter(c =>
    c.code.toLowerCase().includes(query.toLowerCase()) ||
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSave = async () => {
    setSaving(true);
    await updateCurrency(selected);
    setSaving(false);
    onClose();
  };

  const dialogRef = useModalFocusTrap(onClose);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999]"
      style={{ background: 'rgba(0,0,0,0.55)', padding: 24 }}
      onClick={onClose}
      {...interactiveDivProps(onClose, { label: 'Close currency modal' })}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{ background: '#FFFFFF', border: '1px solid #E5E5E5', width: '100%', maxWidth: 400, padding: 32 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: 0 }}>Currency</h2>
          <button onClick={onClose} aria-label="Close currency modal" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={13} style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', color: 'rgba(10,10,10,0.35)', pointerEvents: 'none' }} />
          <input
            placeholder="Search currency…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', background: 'none', paddingLeft: 20, paddingBottom: 8, fontSize: 14, fontFamily: PJS, outline: 'none', color: '#0A0A0A', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid rgba(10,10,10,0.08)', marginBottom: 24 }}>
          {filtered.map(c => (
            <button
              key={c.code}
              onClick={() => setSelected(c.code)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 16px',
                background: selected === c.code ? 'rgba(224,53,83,0.06)' : 'transparent',
                border: 'none', borderBottom: '1px solid rgba(10,10,10,0.05)',
                cursor: 'pointer', fontFamily: PJS, textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', minWidth: 52 }}>{c.symbol} {c.code}</span>
              <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.5)', flex: 1 }}>{c.name}</span>
              {selected === c.code && <Check size={13} style={{ color: '#E03553', flexShrink: 0 }} />}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ background: 'none', border: '1px solid #E5E5E5', borderRadius: 999, padding: '7px 18px', fontSize: 12, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(10,10,10,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
            style={{ fontSize: 12, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
