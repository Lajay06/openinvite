import React, { useState } from 'react';
import { Save, ChevronDown, ChevronUp } from 'lucide-react';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function DetailsSection({ title, icon: Icon, children, sectionKey, onSave, isSaving, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {Icon && <Icon size={16} style={{ color: 'rgba(10,10,10,0.5)', flexShrink: 0 }} />}
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</span>
        </div>
        {open ? <ChevronUp size={14} style={{ color: 'rgba(10,10,10,0.4)' }} /> : <ChevronDown size={14} style={{ color: 'rgba(10,10,10,0.4)' }} />}
      </button>

      {open && (
        <div style={{ paddingBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {children}
          {onSave && sectionKey && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
              <button onClick={() => onSave(sectionKey)} disabled={isSaving}
                className="btn-primary"
                style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, opacity: isSaving ? 0.6 : 1 }}>
                <Save size={12} />Save {title.toLowerCase()}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
