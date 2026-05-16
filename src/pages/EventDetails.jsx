import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Check } from "lucide-react";
import DatePicker from "@/components/shared/DatePicker";
import LocationPicker from "@/components/shared/LocationPicker";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

function SectionLabel({ children }) {
  return (
    <div style={{ marginTop: 32, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(10,10,10,0.08)' }} />
      </div>
    </div>
  );
}

function UInput({ label, value, onChange, placeholder = '', type = 'text' }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <input
        type={type}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', border: 'none', borderBottom: `1px solid ${focused ? '#E03553' : '#DDDDDD'}`,
          background: 'transparent', padding: '8px 0', fontSize: 14,
          color: '#0A0A0A', outline: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif',
          boxSizing: 'border-box', transition: 'border-color 0.2s',
        }}
      />
    </div>
  );
}

const GUEST_TYPES = [
  { id: 'intimate', label: 'Intimate', range: 'Under 50', desc: 'Small and personal' },
  { id: 'celebration', label: 'Celebration', range: '50–150', desc: 'The perfect balance' },
  { id: 'grand', label: 'Grand', range: '150+', desc: 'Big and festive' },
];

const STYLE_GROUPS = [
  { label: 'Style', options: ['Traditional', 'Modern', 'Minimalist', 'Maximalist', 'Bohemian', 'Luxury'] },
  { label: 'Cultural / Religious', options: ['Christian', 'Catholic', 'Jewish', 'Muslim', 'Hindu', 'Sikh', 'Buddhist', 'Civil', 'Cultural Fusion', 'Non-religious'] },
  { label: 'Vibe', options: ['Intimate & romantic', 'Party & dancing', 'Outdoor & nature', 'Destination', 'Multi-day', 'Elopement'] },
];

const FEATURES = [
  { id: 'guest_management', label: 'Guest Management', emoji: '👥' },
  { id: 'budget', label: 'Budget', emoji: '💰' },
  { id: 'invitations', label: 'Invitations', emoji: '✉️' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'vendors', label: 'Vendors', emoji: '🏪' },
  { id: 'all', label: 'All of it', emoji: '✨' },
];

export default function EventDetailsPage() {
  const [record, setRecord] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const autoSaveRef = useRef(null);
  const latestRef = useRef(null);

  useEffect(() => {
    base44.entities.WeddingDetails.list().then(rows => {
      const r = rows[0] || {};
      setRecord(r);
      setRecordId(r.id || null);
      latestRef.current = r;
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const update = (patch) => {
    setRecord(prev => {
      const next = { ...prev, ...patch };
      latestRef.current = next;
      return next;
    });
    triggerAutoSave();
  };

  const updateNested = (key, patch) => {
    setRecord(prev => {
      const next = { ...prev, [key]: { ...(prev?.[key] || {}), ...patch } };
      latestRef.current = next;
      return next;
    });
    triggerAutoSave();
  };

  const triggerAutoSave = () => {
    clearTimeout(autoSaveRef.current);
    setSaveStatus('saving');
    autoSaveRef.current = setTimeout(async () => {
      const data = latestRef.current;
      try {
        if (recordId) {
          await base44.entities.WeddingDetails.update(recordId, data);
        } else {
          const created = await base44.entities.WeddingDetails.create(data);
          setRecordId(created.id);
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('idle');
      }
    }, 1500);
  };

  const toggleStyle = (s) => {
    const arr = record?.weddingStyle || [];
    update({ weddingStyle: arr.includes(s) ? arr.filter(x => x !== s) : [...arr, s] });
  };

  const toggleFeature = (f) => {
    const arr = record?.importantFeatures || [];
    update({ importantFeatures: arr.includes(f) ? arr.filter(x => x !== f) : [...arr, f] });
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: '#888' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const r = record || {};
  const mc = r.mainCeremony || {};
  const rc = r.reception || {};
  const styles = r.weddingStyle || [];
  const features = r.importantFeatures || [];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <DashboardPageHeader title="Event details" subtitle="Manage your ceremony, reception, and venue details" />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 32px 80px' }}>

        <div style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 4 }}>
          {saveStatus === 'saving' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888' }}>
              <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…
            </div>
          )}
          {saveStatus === 'saved' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#22C55E', fontWeight: 600 }}>
              <Check size={13} /> Saved ✓
            </div>
          )}
        </div>

        <div style={{ background: 'linear-gradient(135deg,rgba(224,53,83,0.06),rgba(128,61,129,0.06))', border: '1px solid rgba(224,53,83,0.15)', borderRadius: 0, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E03553" strokeWidth="1.8" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p style={{ margin: 0, fontSize: 13, color: '#444' }}><b style={{ color: '#0A0A0A' }}>Changes here update everywhere</b> — your website, invitations, and planner all stay in sync automatically.</p>
        </div>

        {/* COUPLE */}
        <SectionLabel>Couple</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <UInput label="Partner 1 Name" value={r.couple1Name} onChange={e => update({ couple1Name: e.target.value })} placeholder="e.g. Sophie" />
          <UInput label="Partner 2 Name" value={r.couple2Name} onChange={e => update({ couple2Name: e.target.value })} placeholder="e.g. James" />
        </div>

        {/* THE DATE */}
        <SectionLabel>The Date</SectionLabel>
        <DatePicker label="Wedding Date" value={r.weddingDate} onChange={v => update({ weddingDate: v })} placeholder="Select your wedding date" />

        {/* CEREMONY VENUE */}
        <SectionLabel>The Venue</SectionLabel>
        <LocationPicker
          label="Ceremony Venue"
          value={mc.venueName || ''}
          onChange={val => {
            if (typeof val === 'object' && val) {
              updateNested('mainCeremony', { venueName: val.name || val.fullAddress, address: val.fullAddress || val.address });
            } else {
              updateNested('mainCeremony', { venueName: val || '' });
            }
          }}
          placeholder="Search for ceremony venue…"
        />
        <UInput label="Ceremony Address" value={mc.address} onChange={e => updateNested('mainCeremony', { address: e.target.value })} placeholder="Full address" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <UInput label="Ceremony Time" type="time" value={mc.startTime} onChange={e => updateNested('mainCeremony', { startTime: e.target.value })} />
          <UInput label="Dress Code" value={mc.dressCode} onChange={e => updateNested('mainCeremony', { dressCode: e.target.value })} placeholder="e.g. Black tie" />
        </div>

        {/* RECEPTION */}
        <SectionLabel>Reception</SectionLabel>
        <LocationPicker
          label="Reception Venue"
          value={rc.venueName || ''}
          onChange={val => {
            if (typeof val === 'object' && val) {
              updateNested('reception', { venueName: val.name || val.fullAddress, address: val.fullAddress || val.address });
            } else {
              updateNested('reception', { venueName: val || '' });
            }
          }}
          placeholder="Search for reception venue…"
        />
        <UInput label="Reception Address" value={rc.address} onChange={e => updateNested('reception', { address: e.target.value })} placeholder="Full address" />
        <UInput label="Reception Time" type="time" value={rc.startTime} onChange={e => updateNested('reception', { startTime: e.target.value })} />

        {/* GUESTS */}
        <SectionLabel>Guests</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {GUEST_TYPES.map(g => {
            const sel = r.guestType === g.id;
            return (
              <div key={g.id} onClick={() => update({ guestType: sel ? '' : g.id })} style={{ border: `2px solid ${sel ? '#E03553' : 'rgba(10,10,10,0.1)'}`, borderRadius: 0, padding: '14px 12px', cursor: 'pointer', background: sel ? 'rgba(224,53,83,0.04)' : '#FAFAFA', textAlign: 'center', transition: 'all 0.15s' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: sel ? '#E03553' : '#0A0A0A', margin: '0 0 2px' }}>{g.label}</p>
                <p style={{ fontSize: 11, fontWeight: 600, color: sel ? '#E03553' : '#444444', margin: '0 0 4px' }}>{g.range}</p>
                <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: 0 }}>{g.desc}</p>
              </div>
            );
          })}
        </div>
        <UInput label="Exact Guest Count" type="number" value={r.guestCount} onChange={e => update({ guestCount: e.target.value })} placeholder="e.g. 120" />

        {/* WEDDING STYLE */}
        <SectionLabel>Your Wedding Style</SectionLabel>
        {STYLE_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {group.options.map(opt => {
                const sel = styles.includes(opt);
                return (
                  <button key={opt} onClick={() => toggleStyle(opt)} style={{
                    padding: '7px 14px', borderRadius: 100, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                    border: sel ? 'none' : '1px solid #DDDDDD',
                    background: sel ? 'linear-gradient(135deg,#E03553,#803D81)' : 'transparent',
                    color: sel ? '#FFFFFF' : '#444444', transition: 'all 0.15s',
                  }}>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* WHAT MATTERS MOST */}
        <SectionLabel>What Matters Most</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 8 }}>
          {FEATURES.map(f => {
            const sel = features.includes(f.id);
            return (
              <div key={f.id} onClick={() => toggleFeature(f.id)} style={{ border: `2px solid ${sel ? '#E03553' : 'rgba(10,10,10,0.1)'}`, borderRadius: 0, padding: '14px 10px', cursor: 'pointer', background: sel ? 'rgba(224,53,83,0.04)' : '#FAFAFA', textAlign: 'center', transition: 'all 0.15s' }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{f.emoji}</div>
                <p style={{ fontSize: 12, fontWeight: 600, color: sel ? '#E03553' : '#444', margin: 0 }}>{f.label}</p>
              </div>
            );
          })}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}