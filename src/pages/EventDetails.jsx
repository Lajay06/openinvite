import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Check, Plus, X, ChevronDown, ChevronUp, MapPin, Trash2 } from "lucide-react";
import DashboardPageHeader from '../components/layout/DashboardPageHeader';
import AvaButton from "@/components/shared/AvaButton";
import DatePicker from "@/components/shared/DatePicker";
import ThemeSection from "@/components/event-details/ThemeSection";
import VenueSearchPanel from "@/components/shared/VenueSearchPanel";
import toast from 'react-hot-toast';

const PJS = "'Plus Jakarta Sans', sans-serif";

const TABS = [
  { key: 'details', label: 'Details' },
  { key: 'events',  label: 'Events' },
  { key: 'theme',   label: 'Theme' },
];

const GUEST_TYPES = [
  { id: 'intimate',    label: 'Intimate',    range: 'Under 50', desc: 'Small and personal' },
  { id: 'celebration', label: 'Celebration', range: '50–150',   desc: 'The perfect balance' },
  { id: 'grand',       label: 'Grand',       range: '150+',     desc: 'Big and festive' },
];

// ── Theme migration helpers ────────────────────────────────────────────────────
// Maps old weddingStyle[] flat array and legacy theme.* into the consolidated theme.
// Runs once on mount, only fills empty fields — never overwrites existing values.

const _STYLE_TO_AESTHETIC = { Traditional:'Classic', Modern:'Modern', Minimalist:'Minimalist', Bohemian:'Boho', Luxury:'Luxury' };
const _STYLE_TO_FAITH = {
  Christian:'Christian', Catholic:'Catholic', Jewish:'Jewish', Muslim:'Muslim',
  Hindu:'Hindu', Sikh:'Sikh', Buddhist:'Buddhist', 'Non-religious':'Non-religious',
  'Cultural Fusion':'Interfaith', Civil:'Non-religious',
};
const _STYLE_TO_ATMOSPHERE = {
  'Intimate & romantic':'Intimate & relaxed', 'Party & dancing':'Big party',
  'Outdoor & nature':'Outdoor & nature', Destination:'Destination',
  'Multi-day':'Multi-day', Elopement:'Intimate & relaxed',
};
const _VIBE_TO_AESTHETIC = {
  Romantic:'Romantic', Modern:'Modern', Classic:'Classic', Rustic:'Rustic',
  Boho:'Boho', Glamorous:'Glamorous', Vintage:'Vintage', Minimalist:'Minimalist',
  Garden:'Garden', Beach:'Beach',
};
const _KNOWN_CULTURES = ['Indian','Chinese','Vietnamese','Korean','Filipino','Greek','Italian','Lebanese/Arabic','Persian','Pacific Islander','Latin American','African'];
const _SETTING_MAP = { Both:'Mix of both' };
const _FAITH_ORDER = ['Hindu','Muslim','Sikh','Jewish','Catholic','Christian','Buddhist','Non-religious','Cultural Fusion','Civil'];

function migrateThemeFields(wd, tdEntity) {
  const existing = wd?.theme || {};
  const ws = wd?.weddingStyle || [];
  const td = tdEntity || {};
  let next = { ...existing };

  if (!next.aesthetic?.length) {
    const fromWS    = ws.flatMap(s => _STYLE_TO_AESTHETIC[s] ? [_STYLE_TO_AESTHETIC[s]] : []);
    const fromVibes = (existing.vibes || td.vibes || []).flatMap(v => _VIBE_TO_AESTHETIC[v] ? [_VIBE_TO_AESTHETIC[v]] : []);
    const combined  = [...new Set([...fromWS, ...fromVibes])].filter(Boolean);
    if (combined.length) next.aesthetic = combined;
  }

  if (!next.faith) {
    for (const opt of _FAITH_ORDER) {
      if (ws.includes(opt) && _STYLE_TO_FAITH[opt]) { next.faith = _STYLE_TO_FAITH[opt]; break; }
    }
    if (!next.faith) {
      const src = existing.is_religious !== undefined ? existing : td;
      if (src.is_religious && src.religious_details) next.faith = src.religious_details;
    }
  }

  if (!next.culture?.length && !next.cultureOther) {
    const src = existing.is_cultural !== undefined ? existing : td;
    if (src.is_cultural && src.cultural_details) {
      if (_KNOWN_CULTURES.includes(src.cultural_details)) next.culture = [src.cultural_details];
      else if (src.cultural_details) next.cultureOther = src.cultural_details;
    }
  }

  if (!next.atmosphere?.length) {
    const fromWS = ws.flatMap(s => _STYLE_TO_ATMOSPHERE[s] ? [_STYLE_TO_ATMOSPHERE[s]] : []);
    if (fromWS.length) next.atmosphere = [...new Set(fromWS)];
  }

  if (!next.season) next.season = existing.season || td.season || '';
  if (!next.setting) {
    const raw = existing.setting || td.setting || '';
    next.setting = _SETTING_MAP[raw] || raw;
  }

  return next;
}

const PRE_WEDDING_TYPES  = ['Engagement Party', 'Bridal Shower', 'Bachelor Party', 'Bachelorette Party', 'Rehearsal Dinner', 'Welcome Cocktails', 'Other'];
const POST_WEDDING_TYPES = ['After Party', 'Next-Day Brunch', 'Farewell Brunch', 'Thank You Reception', 'Other'];

const DEFAULT_THEME = { vibes: [], season: '', setting: '', is_religious: false, religious_details: '', is_cultural: false, cultural_details: '' };

const sLabel = { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 8, display: 'block' };
const divider = { height: 1, background: 'rgba(10,10,10,0.08)', margin: '28px 0' };

function photoProxy(ref, w = 600) {
  if (!ref) return null;
  return `/api/places-photo?ref=${encodeURIComponent(ref)}&maxwidth=${w}`;
}
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function fmtDate(d) {
  if (!d) return '';
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

// ── Shared field components ───────────────────────────────────────────────────

function UInput({ label, value, onChange, placeholder = '', type = 'text', half }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20, ...(half ? {} : {}) }}>
      {label && <span style={sLabel}>{label}</span>}
      <input type={type} value={value || ''} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: '100%', border: 'none', borderBottom: `${focused ? 2 : 1}px solid ${focused ? '#E03553' : 'rgba(10,10,10,0.18)'}`, background: 'transparent', padding: '6px 0', fontSize: 14, fontWeight: 500, color: '#0A0A0A', outline: 'none', fontFamily: PJS, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
      />
    </div>
  );
}

function UTextarea({ label, value, onChange, placeholder = '', rows = 3 }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      {label && <span style={sLabel}>{label}</span>}
      <textarea value={value || ''} onChange={onChange} placeholder={placeholder} rows={rows}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: '100%', border: 'none', borderBottom: `${focused ? 2 : 1}px solid ${focused ? '#E03553' : 'rgba(10,10,10,0.18)'}`, background: 'transparent', padding: '6px 0', fontSize: 14, fontWeight: 500, color: '#0A0A0A', outline: 'none', fontFamily: PJS, boxSizing: 'border-box', resize: 'vertical', display: 'block', lineHeight: 1.6 }}
      />
    </div>
  );
}


// ── Event accordion card ──────────────────────────────────────────────────────

function EventCard({ eventType, data, weddingDate, isPost, isExpanded, onToggle, onUpdate, onDelete, locationBias }) {
  const isFixed = eventType === 'ceremony' || eventType === 'reception';
  const title = eventType === 'ceremony' ? 'Ceremony' : eventType === 'reception' ? 'Reception' : (data.name || 'Untitled event');

  // Venue object — shape is consistent for all event types
  const venue = data.venueName
    ? { name: data.venueName, address: data.venueAddress || data.address || '', mapsUrl: data.venueMapsUrl || data.mapsUrl || null, photoUrl: data.venuePhotoUrl || data.photoUrl || null, placeId: data.venuePlaceId || data.placeId || null }
    : null;

  const startTime = data.startTime || data.time || '';
  const endTime   = data.endTime || '';
  const eventDate = isFixed ? weddingDate : data.date;

  const timeStr = [fmtTime(startTime), endTime && fmtTime(endTime)].filter(Boolean).join(' – ');
  const dateStr = fmtDate(eventDate);
  const summaryParts = [dateStr, timeStr, venue?.name].filter(Boolean);

  const handleVenueChange = (v) => {
    if (isFixed) {
      // ceremony/reception — write directly to the flat mainCeremony/reception fields
      onUpdate({
        venueName: v?.name  || '',
        address:   v?.address || '',
        mapsUrl:   v?.mapsUrl || null,
        photoUrl:  v?.photoUrl || null,
        placeId:   v?.placeId || null,
      });
    } else {
      // custom event — prefix venue fields to avoid collision with legacy 'address' field
      onUpdate({
        venueName:    v?.name    || '',
        venueAddress: v?.address  || '',
        venueMapsUrl: v?.mapsUrl  || null,
        venuePhotoUrl:v?.photoUrl || null,
        venuePlaceId: v?.placeId  || null,
        // keep legacy field in sync for any existing guest-site readers
        venue:   v?.name    || '',
        address: v?.address || '',
      });
    }
  };

  const typeBadge = isFixed
    ? null
    : (data.type || (isPost ? 'Post-wedding' : 'Pre-wedding'));

  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.1)', borderRadius: 8, overflow: 'visible', marginBottom: 10, background: '#FFF' }}>
      {/* Collapsed header */}
      <button type="button" onClick={onToggle}
        style={{ width: '100%', display: 'flex', gap: 14, padding: '16px 20px', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: isExpanded ? '8px 8px 0 0' : 8 }}>
        {venue?.photoUrl ? (
          <img src={venue.photoUrl} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
            onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <div style={{ width: 44, height: 44, background: 'rgba(10,10,10,0.04)', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={18} color="rgba(10,10,10,0.2)" />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: 0, fontFamily: PJS }}>{title}</p>
            {typeBadge && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'rgba(10,10,10,0.06)', color: 'rgba(10,10,10,0.45)', fontFamily: PJS, flexShrink: 0 }}>
                {typeBadge}
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', margin: 0, fontFamily: PJS, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {summaryParts.join(' · ') || 'Tap to add details'}
          </p>
        </div>
        <div style={{ color: 'rgba(10,10,10,0.35)', flexShrink: 0 }}>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded body */}
      {isExpanded && (
        <div style={{ padding: '20px 24px 24px', borderTop: '1px solid rgba(10,10,10,0.06)' }}>

          {/* Custom event meta (name + type + date) */}
          {!isFixed && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <UInput label="Event name" value={data.name} onChange={e => onUpdate({ name: e.target.value })} placeholder="e.g. Welcome dinner" />
                <div style={{ marginBottom: 20 }}>
                  <span style={sLabel}>Type</span>
                  <select value={data.type || ''} onChange={e => onUpdate({ type: e.target.value })}
                    style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', padding: '6px 0', fontSize: 14, fontWeight: 500, color: '#0A0A0A', outline: 'none', fontFamily: PJS, cursor: 'pointer' }}>
                    {(isPost ? POST_WEDDING_TYPES : PRE_WEDDING_TYPES).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <span style={sLabel}>Date</span>
                <DatePicker value={data.date} onChange={v => onUpdate({ date: v })} placeholder="Select event date" />
              </div>
              <div style={divider} />
            </>
          )}

          {/* Venue */}
          <VenueSearchPanel
            venue={venue}
            onChange={handleVenueChange}
            locationBias={locationBias}
          />

          {/* Timing */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
            <UInput label="Start time" type="time" value={startTime}
              onChange={e => onUpdate(isFixed ? { startTime: e.target.value } : { startTime: e.target.value, time: e.target.value })} />
            <UInput label="End time" type="time" value={endTime}
              onChange={e => onUpdate({ endTime: e.target.value })} />
          </div>

          {/* Details fields */}
          <div style={{ ...divider, margin: '8px 0 20px' }} />
          <UInput label="Dress code" value={data.dressCode}
            onChange={e => onUpdate({ dressCode: e.target.value })} placeholder="e.g. Black tie, smart casual" />
          <UInput label="Parking info" value={data.parkingInfo}
            onChange={e => onUpdate({ parkingInfo: e.target.value })} placeholder="e.g. Free parking on Church St" />
          <UInput label="Accessibility notes" value={data.accessibilityNotes}
            onChange={e => onUpdate({ accessibilityNotes: e.target.value })} placeholder="e.g. Wheelchair accessible via north entrance" />
          <UTextarea label="Notes" rows={3}
            value={isFixed ? (data.notes || '') : (data.details || data.notes || '')}
            onChange={e => onUpdate(isFixed ? { notes: e.target.value } : { details: e.target.value, notes: e.target.value })}
            placeholder="e.g. Outdoor setting — dress for warm weather, ceremony runs ~40 minutes" />

          {/* Delete — only for custom events */}
          {!isFixed && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
              <button type="button" onClick={onDelete}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS, fontWeight: 600, padding: 0 }}>
                <Trash2 size={13} /> Remove event
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add event inline form ─────────────────────────────────────────────────────

function AddEventForm({ onAdd, onCancel }) {
  const [kind, setKind] = useState('pre');
  const [eventType, setEventType] = useState(PRE_WEDDING_TYPES[0]);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');

  const types = kind === 'pre' ? PRE_WEDDING_TYPES : POST_WEDDING_TYPES;

  const handleKindChange = (k) => {
    setKind(k);
    setEventType(k === 'pre' ? PRE_WEDDING_TYPES[0] : POST_WEDDING_TYPES[0]);
  };

  const handleCreate = () => {
    onAdd({
      id: uid(),
      name: name.trim() || eventType,
      type: eventType,
      date: date || '',
      startTime: '', endTime: '',
      venueName: '', venueAddress: '', venueMapsUrl: null, venuePhotoUrl: null, venuePlaceId: null,
      dressCode: '', parkingInfo: '', accessibilityNotes: '', details: '',
      // legacy compat fields
      time: '', venue: '', address: '', notes: '',
      isCustomType: false,
    }, kind);
  };

  return (
    <div style={{ border: '1px solid rgba(224,53,83,0.2)', borderRadius: 8, padding: '20px 24px', marginBottom: 10, background: 'rgba(224,53,83,0.02)' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 16px' }}>New event</p>

      {/* Pre / Post toggle */}
      <div style={{ display: 'flex', gap: 0, border: '1px solid rgba(10,10,10,0.12)', borderRadius: 6, overflow: 'hidden', marginBottom: 18, width: 'fit-content' }}>
        {[['pre', 'Pre-wedding'], ['post', 'Post-wedding']].map(([k, label]) => (
          <button key={k} type="button" onClick={() => handleKindChange(k)}
            style={{ padding: '7px 18px', background: kind === k ? '#0A0A0A' : '#FFF', color: kind === k ? '#FFF' : 'rgba(10,10,10,0.55)', border: 'none', borderRight: k === 'pre' ? '1px solid rgba(10,10,10,0.12)' : 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: PJS, transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
        <UInput label="Event name" value={name} onChange={e => setName(e.target.value)} placeholder={eventType} />
        <div style={{ marginBottom: 20 }}>
          <span style={sLabel}>Type</span>
          <select value={eventType} onChange={e => setEventType(e.target.value)}
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', padding: '6px 0', fontSize: 14, fontWeight: 500, color: '#0A0A0A', outline: 'none', fontFamily: PJS, cursor: 'pointer' }}>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 20 }}>
          <span style={sLabel}>Date</span>
          <DatePicker value={date} onChange={setDate} placeholder="Select date" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel}
          style={{ background: 'none', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'rgba(10,10,10,0.55)', fontFamily: PJS, padding: '7px 16px' }}>
          Cancel
        </button>
        <button type="button" onClick={handleCreate} className="btn-primary" style={{ fontSize: 12, padding: '7px 18px' }}>
          <Plus size={13} /> Create event
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EventDetailsPage() {
  const [tab, setTab] = useState('details');
  const [record, setRecord] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const autoSaveRef = useRef(null);
  const latestRef   = useRef(null);
  const recordIdRef = useRef(null); // ref copy of recordId — avoids stale closure in save callbacks
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.WeddingDetails.list(),
      (base44.entities.ThemeDetails?.list() || Promise.resolve([])).catch(() => []),
    ]).then(([wdRows, tdRows]) => {
      const r  = wdRows[0] || {};
      const td = tdRows[0] || null;
      setRecord(r);
      setRecordId(r.id || null);
      recordIdRef.current = r.id || null;
      latestRef.current = r;
      setLoading(false);

      // One-time promotion: copy attire.dressCode → mainCeremony.dressCode if canonical is empty
      if (r.id && !r.mainCeremony?.dressCode && r.attire?.dressCode) {
        const promoted = { ...r, mainCeremony: { ...(r.mainCeremony || {}), dressCode: r.attire.dressCode } };
        base44.entities.WeddingDetails.update(r.id, { mainCeremony: promoted.mainCeremony })
          .catch(e => console.warn('Dress code promotion failed:', e));
        setRecord(promoted);
        latestRef.current = promoted;
      }

      // One-time theme migration: fold weddingStyle[] + legacy theme.* + ThemeDetails entity
      // into the consolidated WeddingDetails.theme.* fields.
      // Only runs when the new fields are all empty (first load after this deploy).
      if (r.id) {
        const existing = r.theme || {};
        const needsMigration = !existing.aesthetic?.length && !existing.faith && !existing.atmosphere?.length;
        if (needsMigration) {
          const migratedTheme = migrateThemeFields(r, td);
          const hasChanges =
            migratedTheme.aesthetic?.length ||
            migratedTheme.faith ||
            migratedTheme.atmosphere?.length ||
            migratedTheme.season ||
            migratedTheme.setting;
          if (hasChanges) {
            console.log('[Theme migration] Promoting old data:', migratedTheme);
            base44.entities.WeddingDetails.update(r.id, { theme: migratedTheme })
              .catch(e => console.warn('Theme migration failed:', e));
            const migrated = { ...r, theme: migratedTheme };
            setRecord(migrated);
            latestRef.current = migrated;
          }
        }
      }
    }).catch(() => setLoading(false));
  }, []);

  const update = (patch) => {
    const next = { ...(latestRef.current || {}), ...patch };
    latestRef.current = next;
    setRecord(next);
    triggerAutoSave();
  };

  const updateNested = (key, patch) => {
    const curr = latestRef.current || {};
    const next = { ...curr, [key]: { ...(curr[key] || {}), ...patch } };
    latestRef.current = next;
    setRecord(next);
    triggerAutoSave();
  };

  const doSave = async () => {
    clearTimeout(autoSaveRef.current);
    const data = latestRef.current;
    const id   = recordIdRef.current;
    if (!data) return;
    setSaveStatus('saving');
    try {
      if (id) {
        await base44.entities.WeddingDetails.update(id, data);
      } else {
        const created = await base44.entities.WeddingDetails.create(data);
        setRecordId(created.id);
        recordIdRef.current = created.id;
      }
      setSaveStatus('saved');
      window.dispatchEvent(new CustomEvent('weddingDetailsSaved'));
      setTimeout(() => setSaveStatus(s => s === 'saved' ? 'idle' : s), 2000);
    } catch {
      setSaveStatus('idle');
      toast.error('Save failed. Please try again.');
    }
  };

  const triggerAutoSave = () => {
    clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(doSave, 2500);
  };

  const toggleExpanded = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddEvent = (newEvent, kind) => {
    if (kind === 'pre') {
      update({ preWeddingEvents:  [...((record?.preWeddingEvents  || [])), newEvent] });
    } else {
      update({ postWeddingEvents: [...((record?.postWeddingEvents || [])), newEvent] });
    }
    setShowAddForm(false);
    setExpandedIds(prev => new Set([...prev, newEvent.id]));
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'rgba(10,10,10,0.4)' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const r            = record || {};
  const mc           = r.mainCeremony || {};
  const rc           = r.reception    || {};
  const theme        = r.theme || {};
  const locationBias = mc.address || '';

  const preEvents  = r.preWeddingEvents  || [];
  const postEvents = r.postWeddingEvents || [];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>
      <DashboardPageHeader title="Event details" subtitle="Manage your wedding event information" />

      {/* Ava + action bar */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 md:px-8 py-4" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <AvaButton label="Ask Ava to help plan your event details" />
        <div className="flex items-center gap-[10px]">
          {saveStatus === 'saving' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>
              <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…
            </span>
          )}
          <button
            onClick={doSave}
            disabled={saveStatus === 'saving'}
            className="btn-primary"
            style={{ padding: '7px 20px', fontSize: 13 }}
          >
            {saveStatus === 'saved'
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Check size={13} />Saved</span>
              : 'Save'}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', padding: '0 32px', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '12px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: tab === t.key ? '#0A0A0A' : 'rgba(10,10,10,0.4)', borderBottom: tab === t.key ? '2px solid #0A0A0A' : '2px solid transparent', fontFamily: PJS, transition: 'color 0.15s', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Details tab ──────────────────────────────────────────────────────── */}
      {tab === 'details' && (
        <div style={{ padding: '32px 32px 80px', maxWidth: 640, margin: '0 auto' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 20px', fontFamily: PJS, textAlign: 'center' }}>Couple</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <UInput label="Partner 1 name" value={r.couple1Name} onChange={e => update({ couple1Name: e.target.value })} placeholder="e.g. Sophie" />
            <UInput label="Partner 2 name" value={r.couple2Name} onChange={e => update({ couple2Name: e.target.value })} placeholder="e.g. James" />
          </div>

          <div style={divider} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 16px', fontFamily: PJS, textAlign: 'center' }}>The date</p>
          <span style={sLabel}>Wedding date</span>
          <DatePicker value={r.weddingDate} onChange={v => update({ weddingDate: v })} placeholder="Select your wedding date" />

          <div style={divider} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', margin: '0 0 16px', fontFamily: PJS, textAlign: 'center' }}>Guest count</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {GUEST_TYPES.map(g => {
              const sel = r.guestType === g.id;
              return (
                <div key={g.id} onClick={() => update({ guestType: sel ? '' : g.id })}
                  style={{ border: `2px solid ${sel ? '#E03553' : 'rgba(10,10,10,0.1)'}`, borderRadius: 0, padding: '14px 12px', cursor: 'pointer', background: sel ? 'rgba(224,53,83,0.04)' : '#FAFAFA', textAlign: 'center', transition: 'all 0.15s' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: sel ? '#E03553' : '#0A0A0A', margin: '0 0 2px', fontFamily: PJS }}>{g.label}</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: sel ? '#E03553' : 'rgba(10,10,10,0.4)', margin: '0 0 4px', fontFamily: PJS }}>{g.range}</p>
                  <p style={{ fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: 0, fontFamily: PJS }}>{g.desc}</p>
                </div>
              );
            })}
          </div>
          <UInput label="Exact guest count" type="number" value={r.guestCount} onChange={e => update({ guestCount: e.target.value })} placeholder="e.g. 120" />
        </div>
      )}

      {/* ── Events tab ───────────────────────────────────────────────────────── */}
      {tab === 'events' && (
        <div style={{ padding: '32px 32px 80px' }}>
          {/* Ceremony (fixed) */}
          <EventCard
            eventType="ceremony"
            data={mc}
            weddingDate={r.weddingDate}
            isExpanded={expandedIds.has('ceremony')}
            onToggle={() => toggleExpanded('ceremony')}
            onUpdate={patch => updateNested('mainCeremony', patch)}
            locationBias={locationBias}
          />

          {/* Reception (fixed) */}
          <EventCard
            eventType="reception"
            data={rc}
            weddingDate={r.weddingDate}
            isExpanded={expandedIds.has('reception')}
            onToggle={() => toggleExpanded('reception')}
            onUpdate={patch => updateNested('reception', patch)}
            locationBias={locationBias}
          />

          {/* Pre-wedding custom events */}
          {preEvents.map(ev => (
            <EventCard
              key={ev.id}
              eventType="custom"
              data={ev}
              weddingDate={r.weddingDate}
              isPost={false}
              isExpanded={expandedIds.has(ev.id)}
              onToggle={() => toggleExpanded(ev.id)}
              onUpdate={patch => {
                const next = preEvents.map(e => e.id === ev.id ? { ...e, ...patch } : e);
                update({ preWeddingEvents: next });
              }}
              onDelete={() => update({ preWeddingEvents: preEvents.filter(e => e.id !== ev.id) })}
              locationBias={locationBias}
            />
          ))}

          {/* Post-wedding custom events */}
          {postEvents.map(ev => (
            <EventCard
              key={ev.id}
              eventType="custom"
              data={ev}
              weddingDate={r.weddingDate}
              isPost={true}
              isExpanded={expandedIds.has(ev.id)}
              onToggle={() => toggleExpanded(ev.id)}
              onUpdate={patch => {
                const next = postEvents.map(e => e.id === ev.id ? { ...e, ...patch } : e);
                update({ postWeddingEvents: next });
              }}
              onDelete={() => update({ postWeddingEvents: postEvents.filter(e => e.id !== ev.id) })}
              locationBias={locationBias}
            />
          ))}

          {/* Add event form or button */}
          {showAddForm ? (
            <AddEventForm onAdd={handleAddEvent} onCancel={() => setShowAddForm(false)} />
          ) : (
            <button type="button" onClick={() => setShowAddForm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', border: '1px dashed rgba(10,10,10,0.18)', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'rgba(10,10,10,0.45)', fontFamily: PJS, width: '100%', justifyContent: 'center', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#E03553'; e.currentTarget.style.color = '#E03553'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(10,10,10,0.18)'; e.currentTarget.style.color = 'rgba(10,10,10,0.45)'; }}>
              <Plus size={16} /> Add event
            </button>
          )}
        </div>
      )}

      {/* ── Theme tab ────────────────────────────────────────────────────────── */}
      {tab === 'theme' && (
        <div style={{ padding: '32px 32px 80px', maxWidth: 640, margin: '0 auto' }}>
          <ThemeSection
            theme={theme}
            onSave={(nextTheme) => {
              const next = { ...(latestRef.current || {}), theme: nextTheme };
              latestRef.current = next;
              setRecord(next);
              triggerAutoSave();
            }}
          />
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
