import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Check } from "lucide-react";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

function SLabel({ children }) {
  return (
    <div style={{ marginTop: 32, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: '#EEEEEE' }} />
      </div>
    </div>
  );
}

function UInput({ label, value, onChange, placeholder = '' }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <input value={value || ''} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: '100%', border: 'none', borderBottom: `1px solid ${focused ? '#E03553' : '#DDDDDD'}`, background: 'transparent', padding: '8px 0', fontSize: 14, color: '#0A0A0A', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
      />
    </div>
  );
}

function UTextarea({ label, value, onChange, placeholder = '', rows = 3 }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <textarea value={value || ''} onChange={onChange} placeholder={placeholder} rows={rows}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: '100%', border: 'none', borderBottom: '1px solid ' + (focused ? '#E03553' : '#DDDDDD'), background: 'transparent', padding: '8px 0', fontSize: 14, color: '#0A0A0A', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s', resize: 'vertical' }}
      />
    </div>
  );
}

const PHOTO_STYLES = ['Candid', 'Editorial', 'Traditional', 'Documentary', 'Fine Art', 'Photojournalism'];

export default function PhotographyDetailsPage() {
  const [data, setData] = useState({});
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const autoSaveRef = useRef(null);
  const latestRef = useRef(null);

  useEffect(() => {
    base44.entities.WeddingDetails.list().then(rows => {
      const r = rows[0] || {};
      setData(r.photographyDetails || {});
      setRecordId(r.id || null);
      latestRef.current = r;
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const update = (patch) => {
    const next = { ...data, ...patch };
    setData(next);
    const full = { ...latestRef.current, photographyDetails: next };
    latestRef.current = full;
    clearTimeout(autoSaveRef.current);
    setSaveStatus('saving');
    autoSaveRef.current = setTimeout(async () => {
      try {
        if (recordId) { await base44.entities.WeddingDetails.update(recordId, full); }
        else { const c = await base44.entities.WeddingDetails.create(full); setRecordId(c.id); latestRef.current = { ...full, id: c.id }; }
        setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000);
      } catch { setSaveStatus('idle'); }
    }, 1500);
  };

  const toggleStyle = (s) => {
    const arr = data.stylePreferences || [];
    update({ stylePreferences: arr.includes(s) ? arr.filter(x => x !== s) : [...arr, s] });
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: '#888' }} /><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

  const styles = data.stylePreferences || [];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <DashboardPageHeader title="Photography & videography" subtitle="Plan your photography, videography, and visual storytelling" />
      <div style={{ padding: '32px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: saveStatus === 'saved' ? '#22C55E' : '#888', fontWeight: saveStatus === 'saved' ? 600 : 400 }}>
            {saveStatus === 'saving' && 'Saving…'}
            {saveStatus === 'saved' && '✓ Saved'}
          </div>
        </div>

        <SLabel>Photography</SLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <UInput label="Photographer Name" value={data.photographerName} onChange={e => update({ photographerName: e.target.value })} />
          <UInput label="Contact Person" value={data.photographerContact} onChange={e => update({ photographerContact: e.target.value })} />
          <UInput label="Phone" value={data.photographerPhone} onChange={e => update({ photographerPhone: e.target.value })} />
          <UInput label="Email" value={data.photographerEmail} onChange={e => update({ photographerEmail: e.target.value })} />
          <UInput label="Website" value={data.photographerWebsite} onChange={e => update({ photographerWebsite: e.target.value })} placeholder="https://…" />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {PHOTO_STYLES.map(s => {
            const sel = styles.includes(s);
            return (
              <button key={s} onClick={() => toggleStyle(s)} style={{ padding: '6px 14px', borderRadius: 0, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: sel ? 'none' : '1px solid #E5E5E5', background: sel ? 'linear-gradient(135deg,#E03553,#803D81)' : 'transparent', color: sel ? '#FFFFFF' : '#888888', transition: 'all 0.15s' }}>
                {s}
              </button>
            );
          })}
        </div>
        <UTextarea label="Must-Have Shots List" value={data.mustHaveShots} onChange={e => update({ mustHaveShots: e.target.value })} placeholder="List specific shots you don't want to miss…" rows={4} />
        <UTextarea label="Special Requests" value={data.photographySpecialRequests} onChange={e => update({ photographySpecialRequests: e.target.value })} placeholder="Any specific requirements or preferences…" />

        <SLabel>Videography</SLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <UInput label="Videographer Name" value={data.videographerName} onChange={e => update({ videographerName: e.target.value })} />
          <UInput label="Contact Person" value={data.videographerContact} onChange={e => update({ videographerContact: e.target.value })} />
          <UInput label="Phone" value={data.videographerPhone} onChange={e => update({ videographerPhone: e.target.value })} />
          <UInput label="Email" value={data.videographerEmail} onChange={e => update({ videographerEmail: e.target.value })} />
        </div>
        <UTextarea label="Videography Notes" value={data.videographyNotes} onChange={e => update({ videographyNotes: e.target.value })} placeholder="Highlight reel, drone footage, delivery timeline…" />

        <SLabel>General</SLabel>
        <UTextarea label="Package Details" value={data.packageDetails} onChange={e => update({ packageDetails: e.target.value })} placeholder="What's included in the package…" />
        <UInput label="Delivery Timeline" value={data.deliveryTimeline} onChange={e => update({ deliveryTimeline: e.target.value })} placeholder="e.g. 8 weeks after the wedding" />
        <UTextarea label="Notes" value={data.generalNotes} onChange={e => update({ generalNotes: e.target.value })} rows={4} />

        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}