import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, Plus, Phone, Mail, Pencil, X } from 'lucide-react';
import VendorForm from '@/components/vendors/VendorForm';
import PageConsiderations from '@/components/shared/PageConsiderations';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';

export const PJS = "'Plus Jakarta Sans', sans-serif";

export const labelStyle = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
  color: 'rgba(10,10,10,0.6)', fontFamily: PJS,
};

export const inputStyle = {
  width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: PJS,
  outline: 'none', padding: '6px 0', boxSizing: 'border-box',
};

const STATUS_STYLES = {
  booked:      { background: '#DDF762', color: '#0A1930' },
  quoted:      { background: '#803D81', color: '#FFFFFF' },
  contacted:   { background: '#0A1930', color: '#FFFFFF' },
  researching: { background: 'rgba(10,10,10,0.07)', color: 'rgba(10,10,10,0.6)', border: '1px solid rgba(10,10,10,0.15)' },
  rejected:    { background: 'rgba(224,53,83,0.08)', color: '#E03553', border: '1px solid rgba(224,53,83,0.2)' },
};

/* ── Mock top-level chrome: header + Ava button (unchanged position) + tabs ── */
export function MockPageHeader({ title, subtitle, onAva }) {
  return (
    <>
      <DashboardPageHeader title={title} subtitle={subtitle} />
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <AvaButton label={`Ask Ava to help with ${title.toLowerCase()}`} onClick={onAva} />
      </div>
    </>
  );
}

export function MockTabBar({ tabs, active, onChange }) {
  return (
    <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', padding: '0 32px' }}>
      {tabs.map(tab => (
        <button key={tab.key} onClick={() => onChange(tab.key)}
          style={{
            padding: '14px 0', marginRight: 32, fontSize: 13, fontWeight: 700,
            fontFamily: PJS, background: 'none', border: 'none', cursor: 'pointer',
            color: active === tab.key ? '#E03553' : 'rgba(10,10,10,0.45)',
            borderBottom: active === tab.key ? '2px solid #E03553' : '2px solid transparent',
          }}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/* ── Accordion section — collapsed one-line summary, expanded real fields.
   Collapsed by default (CLAUDE.md: all accordions defaultValue={[]}). ────── */
export function AccordionSection({ title, summary, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', marginBottom: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, flexShrink: 0 }}>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {!open && (
            <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {summary}
            </span>
          )}
          {open ? <ChevronUp size={14} style={{ color: 'rgba(10,10,10,0.6)', flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: 'rgba(10,10,10,0.6)', flexShrink: 0 }} />}
        </div>
      </button>
      {open && <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>}
    </div>
  );
}

/* ── Vendor tab — identical mechanic on every page ─────────────────────────
   Add vendor → New vendor (inline VendorForm) or From my vendors (picker).
   Selected vendor renders as a card (name, contact, status) with change/remove. */
export function VendorTabMock({ category, vendor, setVendor, myVendors }) {
  const [mode, setMode] = useState(null); // null | 'choose' | 'new' | 'existing'
  const [pickedId, setPickedId] = useState('');

  const categoryVendors = myVendors.filter(v => v.category === category);

  const handleNewVendorSubmit = (data) => {
    setVendor({ ...data, id: `mock-${Date.now()}` });
    setMode(null);
  };

  const handlePickExisting = () => {
    const v = myVendors.find(v => v.id === pickedId);
    if (v) { setVendor(v); setMode(null); setPickedId(''); }
  };

  if (vendor) {
    const statusStyle = STATUS_STYLES[vendor.status] || STATUS_STYLES.researching;
    return (
      <div style={{ maxWidth: 560 }}>
        <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 6px' }}>{vendor.name}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
                {vendor.contact_person && (
                  <span style={{ fontSize: 12, color: '#444444', fontFamily: PJS }}>{vendor.contact_person}</span>
                )}
                {vendor.phone && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#444444', fontFamily: PJS }}>
                    <Phone size={11} style={{ color: 'rgba(10,10,10,0.6)' }} />{vendor.phone}
                  </span>
                )}
                {vendor.email && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#444444', fontFamily: PJS }}>
                    <Mail size={11} style={{ color: 'rgba(10,10,10,0.6)' }} />{vendor.email}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', padding: '3px 10px', borderRadius: 999, fontFamily: PJS, ...statusStyle }}>
                {vendor.status || 'researching'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(10,10,10,0.06)' }}>
            <button onClick={() => setMode('choose')} className="btn-editorial-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Pencil size={11} />Change vendor
            </button>
            <button onClick={() => setVendor(null)} style={{ fontSize: 12, color: '#E03553', background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <X size={11} />Remove
            </button>
          </div>
        </div>
        {mode === 'choose' && (
          <VendorChoiceMock
            categoryVendors={categoryVendors}
            pickedId={pickedId}
            setPickedId={setPickedId}
            onPickExisting={handlePickExisting}
            onNew={() => setMode('new')}
            onCancel={() => setMode(null)}
          />
        )}
        {mode === 'new' && (
          <div style={{ border: '1px solid rgba(10,10,10,0.08)', marginTop: 16 }}>
            <VendorForm defaultCategory={category} onSubmit={handleNewVendorSubmit} onCancel={() => setMode(null)} />
          </div>
        )}
      </div>
    );
  }

  // ── Empty state — no vendor yet ──────────────────────────────────────────
  return (
    <div style={{ maxWidth: 560 }}>
      {mode === null && (
        <div style={{ border: '1px dashed rgba(10,10,10,0.18)', padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '0 0 16px' }}>
            No vendor added yet.
          </p>
          <button onClick={() => setMode('choose')} className="btn-primary" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={12} />Add vendor
          </button>
        </div>
      )}
      {mode === 'choose' && (
        <VendorChoiceMock
          categoryVendors={categoryVendors}
          pickedId={pickedId}
          setPickedId={setPickedId}
          onPickExisting={handlePickExisting}
          onNew={() => setMode('new')}
          onCancel={() => setMode(null)}
        />
      )}
      {mode === 'new' && (
        <div style={{ border: '1px solid rgba(10,10,10,0.08)' }}>
          <VendorForm defaultCategory={category} onSubmit={handleNewVendorSubmit} onCancel={() => setMode(null)} />
        </div>
      )}
    </div>
  );
}

function VendorChoiceMock({ categoryVendors, pickedId, setPickedId, onPickExisting, onNew, onCancel }) {
  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: 20, marginTop: 16 }}>
      <p style={{ ...labelStyle, marginBottom: 14 }}>Add vendor</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 8px' }}>From my vendors</p>
          {categoryVendors.length === 0 ? (
            <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0 }}>No matching vendors in My vendors yet.</p>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <Select value={pickedId} onValueChange={setPickedId}>
                  <SelectTrigger><SelectValue placeholder="Select a vendor" /></SelectTrigger>
                  <SelectContent>
                    {categoryVendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <button onClick={onPickExisting} disabled={!pickedId} className="btn-primary" style={{ fontSize: 12, opacity: pickedId ? 1 : 0.4 }}>
                Select
              </button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(10,10,10,0.08)' }} />
          <span style={{ fontSize: 11, color: 'rgba(10,10,10,0.35)', fontFamily: PJS }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(10,10,10,0.08)' }} />
        </div>
        <button onClick={onNew} className="btn-editorial-secondary" style={{ fontSize: 12, alignSelf: 'flex-start' }}>
          New vendor
        </button>
      </div>
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(10,10,10,0.06)' }}>
        <button onClick={onCancel} style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: PJS, fontWeight: 600 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function NotesTabMock({ value, onChange, placeholder }) {
  return (
    <div style={{ maxWidth: 760 }}>
      <label style={labelStyle}>Notes</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={8}
        style={{ ...inputStyle, marginTop: 8, resize: 'vertical', border: '1px solid rgba(10,10,10,0.15)', padding: '10px 12px' }}
      />
    </div>
  );
}

export function ConsiderationsTabMock({ pageKey }) {
  return (
    <div style={{ maxWidth: 860 }}>
      <PageConsiderations pageKey={pageKey} />
    </div>
  );
}

/* ── Sample "My vendors" list — shared across both mock pages, matching the
   real Vendor entity shape (base44/entities/Vendor.jsonc). ─────────────── */
export const SAMPLE_MY_VENDORS = [
  { id: 'v1', name: 'Glow Beauty Collective', category: 'beauty', contact_person: 'Priya Shah', phone: '0412 345 678', email: 'priya@glowbeauty.com.au', status: 'booked' },
  { id: 'v2', name: 'Studio Bella Hair', category: 'beauty', contact_person: 'Bella Nguyen', phone: '0400 111 222', email: 'hello@studiobella.com.au', status: 'quoted' },
  { id: 'v3', name: 'Feast & Field Catering', category: 'catering', contact_person: 'Marcus Webb', phone: '0433 987 654', email: 'marcus@feastfield.com.au', status: 'booked' },
  { id: 'v4', name: 'The Grazing Table Co.', category: 'catering', contact_person: 'Lily Chen', phone: '0455 222 111', email: 'lily@grazingtable.com.au', status: 'researching' },
];
