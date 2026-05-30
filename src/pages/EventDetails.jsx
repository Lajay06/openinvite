import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Check } from "lucide-react";
import DashboardPageHeader from '../components/layout/DashboardPageHeader';
import AvaButton from "@/components/shared/AvaButton";
import DatePicker from "@/components/shared/DatePicker";
import EventsSection from "@/components/event-details/EventsSection";
import ThemeSection from "@/components/event-details/ThemeSection";
import VenueSearch from "@/components/event-details/VenueSearch";

const PJS = "'Plus Jakarta Sans', sans-serif";

const TABS = [
  { key: 'details', label: 'Details' },
  { key: 'events',  label: 'Events' },
  { key: 'venue',   label: 'Venue' },
  { key: 'theme',   label: 'Theme' },
];

const GUEST_TYPES = [
  { id: 'intimate',    label: 'Intimate',    range: 'Under 50', desc: 'Small and personal' },
  { id: 'celebration', label: 'Celebration', range: '50–150',   desc: 'The perfect balance' },
  { id: 'grand',       label: 'Grand',       range: '150+',     desc: 'Big and festive' },
];

const STYLE_GROUPS = [
  { label: 'Style', options: ['Traditional', 'Modern', 'Minimalist', 'Maximalist', 'Bohemian', 'Luxury'] },
  { label: 'Cultural / religious', options: ['Christian', 'Catholic', 'Jewish', 'Muslim', 'Hindu', 'Sikh', 'Buddhist', 'Civil', 'Cultural Fusion', 'Non-religious'] },
  { label: 'Vibe', options: ['Intimate & romantic', 'Party & dancing', 'Outdoor & nature', 'Destination', 'Multi-day', 'Elopement'] },
];

const labelStyle = {
  fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
  color: 'rgba(10,10,10,0.4)',
  fontFamily: PJS, marginBottom: 6,
};

const divider = { height: 1, background: 'rgba(10,10,10,0.08)', margin: '28px 0' };

function UInput({ label, value, onChange, placeholder = '', type = 'text' }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      {label && <div style={labelStyle}>{label}</div>}
      <input
        type={type}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', border: 'none',
          borderBottom: `${focused ? 2 : 1}px solid ${focused ? '#E03553' : 'rgba(10,10,10,0.18)'}`,
          background: 'transparent', padding: '6px 0', fontSize: 14, fontWeight: 500,
          color: '#0A0A0A', outline: 'none', fontFamily: PJS,
          boxSizing: 'border-box', transition: 'border-color 0.2s',
        }}
      />
    </div>
  );
}

const DEFAULT_THEME = {
  vibes: [], season: '', setting: '',
  is_religious: false, religious_details: '',
  is_cultural: false, cultural_details: '',
};

export default function EventDetailsPage() {
  const [tab, setTab] = useState('details');
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
        window.dispatchEvent(new CustomEvent('weddingDetailsSaved'));
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('idle');
      }
    }, 1500);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'rgba(10,10,10,0.4)' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const r = record || {};
  const mc = r.mainCeremony || {};
  const rc = r.reception || {};
  const styles = r.weddingStyle || [];
  const theme = { ...DEFAULT_THEME, ...(r.theme || {}) };

  const toggleStyle = (s) => {
    const arr = r.weddingStyle || [];
    update({ weddingStyle: arr.includes(s) ? arr.filter(x => x !== s) : [...arr, s] });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>
      <DashboardPageHeader title="Event details" subtitle="Manage your wedding event information" />

      {/* Ava + actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 md:px-8 py-4" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <AvaButton label="Ask Ava to help plan your event details" />
        <div className="flex flex-wrap items-center gap-[10px]">
          {saveStatus === 'saving' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
              <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…
            </span>
          )}
          {saveStatus === 'saved' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#22C55E', fontWeight: 600, fontFamily: PJS }}>
              <Check size={13} /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', padding: '0 32px', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '12px 14px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              color: tab === t.key ? '#0A0A0A' : 'rgba(10,10,10,0.4)',
              borderBottom: tab === t.key ? '2px solid #0A0A0A' : '2px solid transparent',
              fontFamily: PJS, transition: 'color 0.15s', whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '32px 32px 48px', maxWidth: 760, margin: '0 auto' }}>

        {/* ── Details tab ─────────────────────────────────────── */}
        {tab === 'details' && (
          <>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 20px', fontFamily: PJS, textAlign: 'center' }}>Couple</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <UInput label="Partner 1 name" value={r.couple1Name} onChange={e => update({ couple1Name: e.target.value })} placeholder="e.g. Sophie" />
              <UInput label="Partner 2 name" value={r.couple2Name} onChange={e => update({ couple2Name: e.target.value })} placeholder="e.g. James" />
            </div>

            <div style={divider} />
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 16px', fontFamily: PJS, textAlign: 'center' }}>The date</p>
            <div style={labelStyle}>Wedding date</div>
            <DatePicker value={r.weddingDate} onChange={v => update({ weddingDate: v })} placeholder="Select your wedding date" />

            <div style={divider} />
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 16px', fontFamily: PJS, textAlign: 'center' }}>Guest count</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {GUEST_TYPES.map(g => {
                const sel = r.guestType === g.id;
                return (
                  <div
                    key={g.id}
                    onClick={() => update({ guestType: sel ? '' : g.id })}
                    style={{ border: `2px solid ${sel ? '#E03553' : 'rgba(10,10,10,0.1)'}`, borderRadius: 0, padding: '14px 12px', cursor: 'pointer', background: sel ? 'rgba(224,53,83,0.04)' : '#FAFAFA', textAlign: 'center', transition: 'all 0.15s' }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 700, color: sel ? '#E03553' : '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>{g.label}</p>
                    <p style={{ fontSize: 11, fontWeight: 600, color: sel ? '#E03553' : 'rgba(10,10,10,0.4)', margin: '0 0 4px', fontFamily: PJS }}>{g.range}</p>
                    <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: 0, fontFamily: PJS }}>{g.desc}</p>
                  </div>
                );
              })}
            </div>
            <UInput label="Exact guest count" type="number" value={r.guestCount} onChange={e => update({ guestCount: e.target.value })} placeholder="e.g. 120" />

          </>
        )}

        {/* ── Events tab ──────────────────────────────────────── */}
        {tab === 'events' && (
          <>
            <EventsSection
              events={r.preWeddingEvents || []}
              eventType="pre-wedding"
              onChange={events => update({ preWeddingEvents: events })}
            />
            <div style={divider} />
            <EventsSection
              events={r.postWeddingEvents || []}
              eventType="post-wedding"
              onChange={events => update({ postWeddingEvents: events })}
            />
          </>
        )}

        {/* ── Venue tab ───────────────────────────────────────── */}
        {tab === 'venue' && (
          <>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 20px', fontFamily: PJS, textAlign: 'center' }}>Ceremony venue</p>
            <VenueSearch
              label="Ceremony venue"
              venueName={mc.venueName || ''}
              address={mc.address || ''}
              venueDetails={mc}
              onVenueSelect={v => updateNested('mainCeremony', {
                venueName:         v.venueName         || '',
                address:           v.address           || '',
                phone:             v.phone             || '',
                website:           v.website           || '',
                mapsUrl:           v.mapsUrl           || '',
                photoUrl:          v.photoUrl          || '',
                rating:            v.rating            ?? null,
                openingHoursToday: v.openingHoursToday || '',
                // Auto-populate parking if field is currently empty
                ...(v.venueName && !mc.parkingInfo && v.parkingInfo ? { parkingInfo: v.parkingInfo } : {}),
              })}
              placeholder="Search for ceremony venue…"
            />
            <UInput label="Ceremony time" type="time" value={mc.startTime} onChange={e => updateNested('mainCeremony', { startTime: e.target.value })} />
            <UInput label="Dress code" value={mc.dressCode} onChange={e => updateNested('mainCeremony', { dressCode: e.target.value })} placeholder="e.g. Black tie" />
            <UInput label="Parking info" value={mc.parkingInfo} onChange={e => updateNested('mainCeremony', { parkingInfo: e.target.value })} placeholder="e.g. Street parking available on King St" />
            <UInput label="Accessibility notes" value={mc.accessibilityNotes} onChange={e => updateNested('mainCeremony', { accessibilityNotes: e.target.value })} placeholder="e.g. Wheelchair accessible entrance via side gate" />

            <div style={divider} />
            <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 20px', fontFamily: PJS, textAlign: 'center' }}>Reception venue</p>
            <VenueSearch
              label="Reception venue"
              venueName={rc.venueName || ''}
              address={rc.address || ''}
              venueDetails={rc}
              onVenueSelect={v => updateNested('reception', {
                venueName:         v.venueName         || '',
                address:           v.address           || '',
                phone:             v.phone             || '',
                website:           v.website           || '',
                mapsUrl:           v.mapsUrl           || '',
                photoUrl:          v.photoUrl          || '',
                rating:            v.rating            ?? null,
                openingHoursToday: v.openingHoursToday || '',
                // Auto-populate parking if field is currently empty
                ...(v.venueName && !rc.parkingInfo && v.parkingInfo ? { parkingInfo: v.parkingInfo } : {}),
              })}
              placeholder="Search for reception venue…"
            />
            <UInput label="Reception time" type="time" value={rc.startTime} onChange={e => updateNested('reception', { startTime: e.target.value })} />
            <UInput label="Parking info" value={rc.parkingInfo} onChange={e => updateNested('reception', { parkingInfo: e.target.value })} placeholder="e.g. On-site parking for 200 cars" />
            <UInput label="Accessibility notes" value={rc.accessibilityNotes} onChange={e => updateNested('reception', { accessibilityNotes: e.target.value })} placeholder="e.g. Step-free access throughout" />
          </>
        )}

        {/* ── Theme tab ───────────────────────────────────────── */}
        {tab === 'theme' && (
          <ThemeSection
            theme={theme}
            onThemeChange={(key, value) => updateNested('theme', { [key]: value })}
            onSave={triggerAutoSave}
          />
        )}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
