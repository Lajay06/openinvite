import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Check } from "lucide-react";
import DatePicker from "@/components/shared/DatePicker";
import EventsSection from "@/components/event-details/EventsSection";
import FoodBeverageSection from "@/components/event-details/FoodBeverageSection";
import QnaSection from "@/components/event-details/QnaSection";
import ThemeSection from "@/components/event-details/ThemeSection";
import VenueSearch from "@/components/event-details/VenueSearch";

const TABS = [
  { key: 'details', label: 'Details' },
  { key: 'events',  label: 'Events' },
  { key: 'venue',   label: 'Venue' },
  { key: 'theme',   label: 'Theme' },
  { key: 'food',    label: 'Food & beverage' },
  { key: 'qna',     label: 'Q&A' },
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

const FEATURES = [
  { id: 'guest_management', label: 'Guest management', emoji: '👥' },
  { id: 'budget',           label: 'Budget',           emoji: '💰' },
  { id: 'invitations',      label: 'Invitations',      emoji: '✉️' },
  { id: 'music',            label: 'Music',            emoji: '🎵' },
  { id: 'vendors',          label: 'Vendors',          emoji: '🏪' },
  { id: 'all',              label: 'All of it',        emoji: '✨' },
];

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 6,
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
          color: '#0A0A0A', outline: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif",
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
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('idle');
      }
    }, 1500);
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
  const theme = { ...DEFAULT_THEME, ...(r.theme || {}) };
  const foodBeverage = r.foodBeverage || {};
  const qna = r.qna || [];

  const toggleStyle = (s) => {
    const arr = r.weddingStyle || [];
    update({ weddingStyle: arr.includes(s) ? arr.filter(x => x !== s) : [...arr, s] });
  };

  const toggleFeature = (f) => {
    const arr = r.importantFeatures || [];
    update({ importantFeatures: arr.includes(f) ? arr.filter(x => x !== f) : [...arr, f] });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Sub-header */}
      <div style={{ height: 48, background: '#FFFFFF', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Event details</span>
      </div>
      {/* Descriptor strip */}
      <div style={{ background: '#F5F5F5', padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(10,10,10,0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Manage your wedding event information</span>
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)', background: '#FFFFFF', overflowX: 'auto' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '14px 14px', border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600,
                  color: tab === t.key ? '#E03553' : '#444444',
                  borderBottom: tab === t.key ? '2px solid #E03553' : '2px solid transparent',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: 'color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ flexShrink: 0, paddingLeft: 16 }}>
            {saveStatus === 'saving' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#888' }}>
                <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…
              </span>
            )}
            {saveStatus === 'saved' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#22C55E', fontWeight: 600 }}>
                <Check size={13} /> Saved
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 32px 80px' }}>

        {/* ── Details tab ─────────────────────────────────────── */}
        {tab === 'details' && (
          <>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: '0 0 20px' }}>Couple</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <UInput label="Partner 1 name" value={r.couple1Name} onChange={e => update({ couple1Name: e.target.value })} placeholder="e.g. Sophie" />
              <UInput label="Partner 2 name" value={r.couple2Name} onChange={e => update({ couple2Name: e.target.value })} placeholder="e.g. James" />
            </div>

            <div style={divider} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: '0 0 16px' }}>The date</p>
            <div style={labelStyle}>Wedding date</div>
            <DatePicker value={r.weddingDate} onChange={v => update({ weddingDate: v })} placeholder="Select your wedding date" />

            <div style={divider} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: '0 0 16px' }}>Guest count</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              {GUEST_TYPES.map(g => {
                const sel = r.guestType === g.id;
                return (
                  <div
                    key={g.id}
                    onClick={() => update({ guestType: sel ? '' : g.id })}
                    style={{ border: `2px solid ${sel ? '#E03553' : 'rgba(10,10,10,0.1)'}`, borderRadius: 0, padding: '14px 12px', cursor: 'pointer', background: sel ? 'rgba(224,53,83,0.04)' : '#FAFAFA', textAlign: 'center', transition: 'all 0.15s' }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 700, color: sel ? '#E03553' : '#0A0A0A', margin: '0 0 2px' }}>{g.label}</p>
                    <p style={{ fontSize: 11, fontWeight: 600, color: sel ? '#E03553' : '#444444', margin: '0 0 4px' }}>{g.range}</p>
                    <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: 0 }}>{g.desc}</p>
                  </div>
                );
              })}
            </div>
            <UInput label="Exact guest count" type="number" value={r.guestCount} onChange={e => update({ guestCount: e.target.value })} placeholder="e.g. 120" />

            <div style={divider} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: '0 0 16px' }}>Wedding style</p>
            {STYLE_GROUPS.map(group => (
              <div key={group.label} style={{ marginBottom: 20 }}>
                <div style={{ ...labelStyle, marginBottom: 10 }}>{group.label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {group.options.map(opt => {
                    const sel = styles.includes(opt);
                    return (
                      <button key={opt} onClick={() => toggleStyle(opt)} style={{
                        padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                        border: sel ? 'none' : '1px solid rgba(10,10,10,0.15)',
                        background: sel ? 'linear-gradient(135deg,#E03553,#803D81)' : 'transparent',
                        color: sel ? '#FFFFFF' : '#444444', transition: 'all 0.15s',
                      }}>{opt}</button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div style={divider} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: '0 0 16px' }}>What matters most</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
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
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: '0 0 20px' }}>Ceremony venue</p>
            <VenueSearch
              label="Ceremony venue"
              venueName={mc.venueName || ''}
              address={mc.address || ''}
              onVenueSelect={v => updateNested('mainCeremony', { venueName: v.venueName || '', address: v.address || '' })}
              placeholder="Search for ceremony venue…"
            />
            <UInput label="Ceremony time" type="time" value={mc.startTime} onChange={e => updateNested('mainCeremony', { startTime: e.target.value })} />
            <UInput label="Dress code" value={mc.dressCode} onChange={e => updateNested('mainCeremony', { dressCode: e.target.value })} placeholder="e.g. Black tie" />

            <div style={divider} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: '0 0 20px' }}>Reception venue</p>
            <VenueSearch
              label="Reception venue"
              venueName={rc.venueName || ''}
              address={rc.address || ''}
              onVenueSelect={v => updateNested('reception', { venueName: v.venueName || '', address: v.address || '' })}
              placeholder="Search for reception venue…"
            />
            <UInput label="Reception time" type="time" value={rc.startTime} onChange={e => updateNested('reception', { startTime: e.target.value })} />
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

        {/* ── Food & beverage tab ─────────────────────────────── */}
        {tab === 'food' && (
          <FoodBeverageSection
            data={foodBeverage}
            onChange={(field, value) => updateNested('foodBeverage', { [field]: value })}
          />
        )}

        {/* ── Q&A tab ─────────────────────────────────────────── */}
        {tab === 'qna' && (
          <QnaSection
            qna={qna}
            onQnaChange={newQna => update({ qna: newQna })}
          />
        )}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
