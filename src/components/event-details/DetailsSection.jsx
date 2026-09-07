import React, { useState } from 'react';
import { Save, ChevronDown, ChevronUp } from 'lucide-react';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

/**
 * A COLLAPSED SECTION SAYS WHAT IS IN IT.
 *
 * Owner ruling 2026-09-07: every accordion in the dashboard is collapsed by
 * default and its header carries a one-line summary of the selection or the
 * content. Forty-three call sites across nine pages passed `defaultOpen`, so
 * Ceremony details, Transport, Accommodation, Emergency contact, Honeymoon,
 * Wedding favours, Entertainment and Good to know all opened every section at
 * once — which is most of why those pages scroll forever.
 *
 * `defaultOpen` SURVIVES AS A PROP, with no caller passing it, because a
 * section holding a validation error must be able to open itself. Removing the
 * prop would mean adding it back the first time a form needs to show one.
 *
 * `summary` is a string or a list. Empty or absent renders the not-set line,
 * so a collapsed section is never silent about whether it holds anything.
 */
export default function DetailsSection({ title, icon: Icon, children, sectionKey, onSave, isSaving, defaultOpen = false, summary }) {
  const [open, setOpen] = useState(defaultOpen);
  const summaryText = Array.isArray(summary) ? summary.filter(Boolean).join(' · ') : (summary || '');

  return (
    <div style={{ borderBottom: '1px solid rgba(10,10,10,0.12)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {Icon && <Icon size={16} style={{ color: 'rgba(10,10,10,0.5)', flexShrink: 0 }} />}
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</span>
          {!open && summary !== undefined && (
            <span style={{
              fontSize: 12, fontWeight: 500, color: 'rgba(10,10,10,0.6)',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
            }}>
              {summaryText || 'Not set yet'}
            </span>
          )}
        </div>
        {open ? <ChevronUp size={14} style={{ color: 'rgba(10,10,10,0.6)', flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: 'rgba(10,10,10,0.6)', flexShrink: 0 }} />}
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
