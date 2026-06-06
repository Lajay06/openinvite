import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Plus, X, MapPin, Trash2, Edit2, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const sLabel = { fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 8, display: 'block' };
const divider = { height: 1, background: 'rgba(10,10,10,0.08)', margin: '28px 0' };

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
}
function fmtDate(d) {
  if (!d) return '';
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

// ── Details tab shared field components ──────────────────────────────────────

function UInput({ label, value, onChange, placeholder = '', type = 'text' }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
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

// ── Event form modal (mirrors VendorForm pattern) ─────────────────────────────

function EventForm({ event, isFixed, fixedType, isPost, onSave, onCancel, locationBias }) {
  const initVenue = () => {
    if (!event?.venueName) return null;
    if (isFixed) {
      return { name: event.venueName, address: event.address || '', mapsUrl: event.mapsUrl || null, photoUrl: event.photoUrl || null, placeId: event.placeId || null };
    }
    return { name: event.venueName, address: event.venueAddress || event.address || '', mapsUrl: event.venueMapsUrl || event.mapsUrl || null, photoUrl: event.venuePhotoUrl || event.photoUrl || null, placeId: event.venuePlaceId || event.placeId || null };
  };

  const defaultKind = isPost ? 'post' : 'pre';
  const [kind, setKind] = useState(defaultKind);
  const [form, setForm] = useState({
    name: event?.name || '',
    type: event?.type || (isPost ? POST_WEDDING_TYPES[0] : PRE_WEDDING_TYPES[0]),
    date: event?.date || '',
    startTime: event?.startTime || event?.time || '',
    endTime: event?.endTime || '',
    venue: initVenue(),
    dressCode: event?.dressCode || '',
    parkingInfo: event?.parkingInfo || '',
    accessibilityNotes: event?.accessibilityNotes || '',
    notes: isFixed ? (event?.notes || '') : (event?.details || event?.notes || ''),
  });

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleKindChange = (k) => {
    setKind(k);
    set('type', k === 'pre' ? PRE_WEDDING_TYPES[0] : POST_WEDDING_TYPES[0]);
  };

  const handleSave = () => {
    const venueData = isFixed
      ? {
          venueName: form.venue?.name || '',
          address: form.venue?.address || '',
          mapsUrl: form.venue?.mapsUrl || null,
          photoUrl: form.venue?.photoUrl || null,
          placeId: form.venue?.placeId || null,
        }
      : {
          venueName: form.venue?.name || '',
          venueAddress: form.venue?.address || '',
          venueMapsUrl: form.venue?.mapsUrl || null,
          venuePhotoUrl: form.venue?.photoUrl || null,
          venuePlaceId: form.venue?.placeId || null,
          venue: form.venue?.name || '',
          address: form.venue?.address || '',
        };

    onSave({
      name: form.name,
      type: form.type,
      kind,
      date: form.date,
      startTime: form.startTime || '',
      endTime: form.endTime || '',
      time: form.startTime || '',
      dressCode: form.dressCode,
      parkingInfo: form.parkingInfo,
      accessibilityNotes: form.accessibilityNotes,
      notes: form.notes,
      details: form.notes,
      ...venueData,
    });
  };

  const typeOptions = kind === 'pre' ? PRE_WEDDING_TYPES : POST_WEDDING_TYPES;
  const modalTitle = isFixed
    ? (fixedType === 'ceremony' ? 'Edit ceremony' : 'Edit reception')
    : (event?.id ? 'Edit event' : 'Add event');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', background: '#FFFFFF', position: 'relative' }}>

        {/* Header — mirrors VendorForm */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)', position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>
            {modalTitle}
          </span>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', display: 'flex', padding: 4, borderRadius: 999 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 24 }}>

          {/* Custom event fields: name, type, date */}
          {!isFixed && (
            <>
              {/* Pre / Post toggle — only for new events */}
              {!event?.id && (
                <div style={{ marginBottom: 20 }}>
                  <span style={sLabel}>Event timing</span>
                  <div style={{ display: 'flex', gap: 0, border: '1px solid rgba(10,10,10,0.12)', borderRadius: 999, overflow: 'hidden', width: 'fit-content' }}>
                    {[['pre', 'Pre-wedding'], ['post', 'Post-wedding']].map(([k, lbl]) => (
                      <button key={k} type="button" onClick={() => handleKindChange(k)}
                        style={{ padding: '6px 18px', background: kind === k ? '#0A0A0A' : '#FFF', color: kind === k ? '#FFF' : 'rgba(10,10,10,0.55)', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: PJS, transition: 'all 0.15s' }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  <Label htmlFor="ev-name">Event name</Label>
                  <Input id="ev-name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Welcome dinner" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={v => set('type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {typeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                <Label>Date</Label>
                <DatePicker value={form.date} onChange={v => set('date', v)} placeholder="Select date" />
              </div>

              <div style={divider} />
            </>
          )}

          {/* Venue */}
          <VenueSearchPanel
            venue={form.venue}
            onChange={v => set('venue', v)}
            locationBias={locationBias}
          />

          <div style={divider} />

          {/* Timing — time inputs (native time picker, stores HH:MM strings) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <Label htmlFor="ev-start">Start time</Label>
              <Input id="ev-start" type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <Label htmlFor="ev-end">End time</Label>
              <Input id="ev-end" type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} />
            </div>
          </div>

          {/* Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 24, borderTop: '1px solid rgba(10,10,10,0.08)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="ev-dress">Dress code</Label>
              <Input id="ev-dress" value={form.dressCode} onChange={e => set('dressCode', e.target.value)} placeholder="e.g. Black tie, smart casual" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="ev-parking">Parking info</Label>
              <Input id="ev-parking" value={form.parkingInfo} onChange={e => set('parkingInfo', e.target.value)} placeholder="e.g. Free parking on Church St" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="ev-access">Accessibility notes</Label>
              <Input id="ev-access" value={form.accessibilityNotes} onChange={e => set('accessibilityNotes', e.target.value)} placeholder="e.g. Wheelchair accessible via north entrance" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Label htmlFor="ev-notes">Notes</Label>
              <Textarea id="ev-notes" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes about this event" />
            </div>
          </div>
        </div>

        {/* Footer — mirrors VendorForm */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid rgba(10,10,10,0.08)' }}>
          <button type="button" onClick={onCancel} className="btn-editorial-secondary">Cancel</button>
          <button type="button" onClick={handleSave} className="btn-primary">
            {!isFixed && !event?.id ? 'Add event' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Event card (horizontal card with right image panel) ──────────────────────

function EventCardRow({ event, isFixed, fixedType, isPost, weddingDate, onEdit, onDelete }) {
  const title = fixedType === 'ceremony' ? 'Ceremony'
    : fixedType === 'reception' ? 'Reception'
    : (event?.name || event?.type || 'Untitled event');

  const overline = isFixed
    ? 'Main event'
    : (event?.type || (isPost ? 'Post-wedding' : 'Pre-wedding'));
  const overlineColor = isFixed ? '#E03553' : 'rgba(10,10,10,0.4)';

  const photoUrl  = isFixed ? (event?.photoUrl || null) : (event?.venuePhotoUrl || event?.photoUrl || null);
  const venueName = isFixed ? (event?.venueName || '') : (event?.venueName || event?.venue || '');
  const address   = isFixed ? (event?.address || '') : (event?.venueAddress || event?.address || '');
  const locationLine = venueName || address;

  const date      = isFixed ? weddingDate : event?.date;
  const startTime = event?.startTime || event?.time || '';
  const endTime   = event?.endTime || '';
  const timeStr   = [fmtTime(startTime), endTime && fmtTime(endTime)].filter(Boolean).join(' – ');
  const dateStr   = fmtDate(date);
  const dateTimeStr = [dateStr, timeStr].filter(Boolean).join(' · ');

  return (
    <div className="ev-card">
      {/* ── Info panel ───────────────────────────────────────────────────── */}
      <div className="ev-info">
        {/* Type overline */}
        <p style={{ fontSize: 12, fontWeight: 600, color: overlineColor, fontFamily: PJS, margin: '0 0 8px', letterSpacing: '0.01em' }}>
          {overline}
        </p>

        {/* Event name */}
        <p style={{ fontSize: 26, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 16px', lineHeight: 1.1 }}>
          {title}
        </p>

        {/* Date · time */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 8 }}>
          <Calendar size={13} style={{ color: 'rgba(10,10,10,0.4)', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(10,10,10,0.55)', fontFamily: PJS, lineHeight: 1.3 }}>
            {dateTimeStr || 'Date to be confirmed'}
          </span>
        </div>

        {/* Location */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
          <MapPin size={13} style={{ color: 'rgba(10,10,10,0.4)', flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(10,10,10,0.55)', fontFamily: PJS, lineHeight: 1.3 }}>
            {locationLine || 'Location to be confirmed'}
          </span>
        </div>

        {/* Edit / Delete — pushed to bottom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 'auto', paddingTop: 20 }}>
          <button
            type="button"
            onClick={onEdit}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.45)', fontFamily: PJS, fontSize: 12, fontWeight: 600, padding: 0 }}
          >
            <Edit2 size={12} />
            Edit
          </button>
          {!isFixed && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onDelete(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, fontSize: 12, fontWeight: 600, padding: 0 }}
            >
              <Trash2 size={12} />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* ── Image panel ──────────────────────────────────────────────────── */}
      <div className="ev-photo">
        {/* Fallback sits in background; image covers it when loaded */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <MapPin size={20} color="rgba(10,10,10,0.18)" />
          {!photoUrl && (
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(10,10,10,0.25)', fontFamily: PJS }}>Add a photo</span>
          )}
        </div>
        {photoUrl && (
          <img
            src={photoUrl}
            alt={venueName || title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        )}
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
  const autoSaveRef  = useRef(null);
  const latestRef    = useRef(null);
  const recordIdRef  = useRef(null);

  // Modal state
  const [showEventForm, setShowEventForm]   = useState(false);
  const [editingEvent,  setEditingEvent]    = useState(null);   // null = new event
  const [editingFixed,  setEditingFixed]    = useState(false);  // true = ceremony or reception
  const [editingFType,  setEditingFType]    = useState(null);   // 'ceremony' | 'reception' | null
  const [editingIsPost, setEditingIsPost]   = useState(false);

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

      // One-time theme migration
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

  // ── Event form handlers ───────────────────────────────────────────────────

  const openAddEvent = () => {
    setEditingEvent(null);
    setEditingFixed(false);
    setEditingFType(null);
    setEditingIsPost(false);
    setShowEventForm(true);
  };

  const openEditFixed = (fType) => {
    const data = fType === 'ceremony' ? (latestRef.current?.mainCeremony || {}) : (latestRef.current?.reception || {});
    setEditingEvent(data);
    setEditingFixed(true);
    setEditingFType(fType);
    setEditingIsPost(false);
    setShowEventForm(true);
  };

  const openEditCustom = (ev, isPost) => {
    setEditingEvent(ev);
    setEditingFixed(false);
    setEditingFType(null);
    setEditingIsPost(isPost);
    setShowEventForm(true);
  };

  const closeEventForm = () => {
    setShowEventForm(false);
    setEditingEvent(null);
    setEditingFixed(false);
    setEditingFType(null);
    setEditingIsPost(false);
  };

  const handleSaveEvent = async (saved) => {
    // Compute the full next record explicitly so we save exactly what we computed,
    // never re-reading latestRef after an async gap.
    let nextData;

    if (editingFixed) {
      const key  = editingFType === 'ceremony' ? 'mainCeremony' : 'reception';
      const curr = latestRef.current || {};
      nextData = { ...curr, [key]: { ...(curr[key] || {}),
        venueName: saved.venueName,
        address:   saved.address,
        mapsUrl:   saved.mapsUrl,
        photoUrl:  saved.photoUrl,
        placeId:   saved.placeId,
        startTime: saved.startTime || '',
        endTime:   saved.endTime   || '',
        dressCode: saved.dressCode,
        parkingInfo: saved.parkingInfo,
        accessibilityNotes: saved.accessibilityNotes,
        notes: saved.notes,
      }};
    } else if (editingEvent?.id) {
      const key  = editingIsPost ? 'postWeddingEvents' : 'preWeddingEvents';
      const list = latestRef.current?.[key] || [];
      const next = list.map(e => e.id === editingEvent.id ? { ...e, ...saved, id: e.id } : e);
      nextData = { ...(latestRef.current || {}), [key]: next };
    } else {
      const key   = saved.kind === 'post' ? 'postWeddingEvents' : 'preWeddingEvents';
      const list  = latestRef.current?.[key] || [];
      const newEv = { ...saved, id: uid() };
      nextData = { ...(latestRef.current || {}), [key]: [...list, newEv] };
    }

    // Synchronously commit to ref + React state, then save with the explicit value.
    latestRef.current = nextData;
    setRecord(nextData);
    closeEventForm();

    clearTimeout(autoSaveRef.current);
    const id = recordIdRef.current;
    setSaveStatus('saving');
    try {
      if (id) {
        await base44.entities.WeddingDetails.update(id, nextData);
      } else {
        const created = await base44.entities.WeddingDetails.create(nextData);
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

  const handleDeleteCustom = (evId, isPost) => {
    if (!window.confirm('Remove this event?')) return;
    const key  = isPost ? 'postWeddingEvents' : 'preWeddingEvents';
    const list = latestRef.current?.[key] || [];
    update({ [key]: list.filter(e => e.id !== evId) });
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'rgba(10,10,10,0.4)' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const r  = record || {};
  const mc = r.mainCeremony || {};
  const rc = r.reception    || {};
  const theme        = r.theme || {};
  const locationBias = mc.address || '';

  const preEvents  = r.preWeddingEvents  || [];
  const postEvents = r.postWeddingEvents || [];

  // Sort custom events chronologically by date then start time
  const sortedCustom = [
    ...preEvents.map(e  => ({ ...e, _kind: 'pre'  })),
    ...postEvents.map(e => ({ ...e, _kind: 'post' })),
  ].sort((a, b) => {
    const da = a.date || '9999-12-31', db = b.date || '9999-12-31';
    if (da !== db) return da.localeCompare(db);
    const ta = a.startTime || a.time || '', tb = b.startTime || b.time || '';
    return ta.localeCompare(tb);
  });

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>
      <DashboardPageHeader title="Event details" subtitle="Manage your wedding event information" />

      {/* Ava + actions bar — Add event button appears on Events tab */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 md:px-8 py-4" style={{ borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <AvaButton label="Ask Ava to help plan your event details" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {tab === 'events' && (
            <button onClick={openAddEvent} className="btn-primary">
              + Add event
            </button>
          )}
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

          {/* Fixed events header */}
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '0 auto 12px', maxWidth: 680 }}>
            Main events
          </p>

          {/* Ceremony */}
          <EventCardRow
            event={mc}
            isFixed
            fixedType="ceremony"
            weddingDate={r.weddingDate}
            onEdit={() => openEditFixed('ceremony')}
          />

          {/* Reception */}
          <EventCardRow
            event={rc}
            isFixed
            fixedType="reception"
            weddingDate={r.weddingDate}
            onEdit={() => openEditFixed('reception')}
          />

          {/* Custom events — sorted chronologically */}
          {sortedCustom.length > 0 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, margin: '28px auto 12px', maxWidth: 680 }}>
                Additional events
              </p>
              {sortedCustom.map(ev => (
                <EventCardRow
                  key={ev.id}
                  event={ev}
                  isFixed={false}
                  isPost={ev._kind === 'post'}
                  weddingDate={r.weddingDate}
                  onEdit={() => openEditCustom(ev, ev._kind === 'post')}
                  onDelete={() => handleDeleteCustom(ev.id, ev._kind === 'post')}
                />
              ))}
            </>
          )}

          {/* Empty custom events state */}
          {sortedCustom.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed rgba(10,10,10,0.12)', marginTop: 24, maxWidth: 680, marginLeft: 'auto', marginRight: 'auto' }}>
              <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.35)', margin: '0 0 12px', fontFamily: PJS }}>
                No additional events yet — add an engagement party, rehearsal dinner, and more.
              </p>
              <button onClick={openAddEvent} className="btn-primary" style={{ fontSize: 12 }}>
                + Add event
              </button>
            </div>
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

      {/* Event form modal — mirrors Vendors.jsx modal structure */}
      {showEventForm && (
        <EventForm
          event={editingEvent}
          isFixed={editingFixed}
          fixedType={editingFType}
          isPost={editingIsPost}
          onSave={handleSaveEvent}
          onCancel={closeEventForm}
          locationBias={locationBias}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Event card — horizontal layout with right image panel */
        .ev-card {
          display: flex;
          max-width: 680px;
          margin: 0 auto 12px;
          border: 1px solid rgba(10,10,10,0.10);
          min-height: 180px;
        }
        .ev-info {
          flex: 1;
          padding: 28px 32px;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .ev-photo {
          flex: 0 0 230px;
          width: 230px;
          overflow: hidden;
          position: relative;
        }

        /* Mobile: image on top, info below */
        @media (max-width: 600px) {
          .ev-card { flex-direction: column; margin-bottom: 12px; }
          .ev-photo { order: -1; flex: none; width: 100%; height: 180px; }
          .ev-info { padding: 20px 20px 24px; }
        }
      `}</style>
    </div>
  );
}
