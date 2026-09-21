import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, MapPin, Pencil, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import Screen from '../../shell/Screen';
import { PillButton, ErrorState, Skeleton, EmptyState, BottomSheet, TextField, SmartImage, StatusPill } from '../../ui';
import PillChoice from '../../ui/PillChoice';
import Segments, { useSegment } from '../../ui/Segments';
import { useConfirm } from '../../ui/ConfirmSheet';
import FormSheet from '../../features/FormSheet';
import { openExternal } from '../../native';
import { dateLong, timeLabel } from '../../lib/format';
import { canonicalSlug } from '@/lib/weddingAddress';
import { FAITH_OPTIONS, FAITH_FOR_INTERFAITH, CULTURE_REGIONS, CULTURE_CROSS_CUTTING } from '@/lib/weddingThemeOptions';

/* The option lists are EventDetails.jsx's and ThemeSection.jsx's, verbatim. */
const SEGMENTS = [{ key: 'details', label: 'Details' }, { key: 'events', label: 'Events' }, { key: 'theme', label: 'Theme' }];
const GUEST_TYPES = [{ value: 'intimate', label: 'Intimate, under 50' }, { value: 'celebration', label: 'Celebration, 50 to 150' }, { value: 'grand', label: 'Grand, 150 and up' }];
const PRE_WEDDING_TYPES = ['Engagement Party', 'Bridal Shower', 'Bachelor Party', 'Bachelorette Party', 'Rehearsal Dinner', 'Welcome Cocktails', 'Other'];
const POST_WEDDING_TYPES = ['After Party', 'Next-Day Brunch', 'Farewell Brunch', 'Thank You Reception', 'Other'];
const AESTHETIC_OPTIONS = ['Beach', 'Boho', 'Classic', 'Garden', 'Glamorous', 'Luxury', 'Minimalist', 'Modern', 'Romantic', 'Rustic', 'Vintage'];
const ATMOSPHERE_OPTIONS = ['Big party', 'Destination', 'Formal & elegant', 'Intimate & relaxed', 'Multi-day', 'Outdoor & nature'];
const SEASON_OPTIONS = ['Autumn', 'Spring', 'Summer', 'Winter'];
const SETTING_OPTIONS = ['Indoor', 'Mix of both', 'Outdoor'];

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * Event details: the desktop page's three tabs. Details auto-save 900ms
 * after the last change (EventDetails.jsx waits 2.5s; the phone keyboard
 * makes shorter pauses natural). Event and theme edits save when their
 * sheet or button is confirmed, exactly the keys the desktop writes.
 *
 * props: details, onSave(key|null, value), onChangeAddress(newSlug),
 * onInvitePrompt(event) after a new custom event, loading, error, onRetry, back
 */
export default function EventDetailsScreen({ details, onSave, onChangeAddress, onInvitePrompt, loading, error, onRetry, back }) {
  const [segment, setSegment] = useSegment(SEGMENTS);
  const [status, setStatus] = useState('idle');
  const d = details || {};
  const subtitle = status === 'saving' ? 'Saving' : status === 'saved' ? 'Saved' : status === 'failed' ? 'Could not save. Check your connection.' : '';
  const flag = async (p) => { setStatus('saving'); try { await p; setStatus('saved'); setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1500); } catch { setStatus('failed'); throw new Error('save'); } };
  return (
    <Screen title="Event details" subtitle={subtitle} back={back}>
      <Segments options={SEGMENTS} value={segment} onChange={setSegment} />
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} timedOut={error?.timedOut} /> : loading ? (<><Skeleton kind="block" /><Skeleton kind="block" /></>) : (
          <>
            {segment === 'details' && <DetailsSegment d={d} onSave={(patch) => flag(onSave(null, patch))} onChangeAddress={onChangeAddress} />}
            {segment === 'events' && <EventsSegment d={d} onSave={(key, value) => flag(onSave(key, value))} onInvitePrompt={onInvitePrompt} />}
            {segment === 'theme' && <ThemeSegment theme={d.theme || {}} onSave={(theme) => flag(onSave('theme', theme))} />}
          </>
        )}
      </div>
    </Screen>
  );
}

/* ── Details ─────────────────────────────────────────────────────────── */

function DetailsSegment({ d, onSave, onChangeAddress }) {
  const [v, setV] = useState({ couple1Name: d.couple1Name || '', couple2Name: d.couple2Name || '', weddingDate: d.weddingDate || '', guestType: d.guestType || '', guestCount: d.guestCount ?? '' });
  const timer = useRef(null);
  const pending = useRef({});
  useEffect(() => () => clearTimeout(timer.current), []);
  const queue = (patch) => {
    setV((s) => ({ ...s, ...patch }));
    pending.current = { ...pending.current, ...patch };
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => { const p = pending.current; pending.current = {}; try { await onSave(p); } catch { /* shown in the subtitle */ } }, 900);
  };
  const [addr, setAddr] = useState(false);
  return (
    <>
      <section>
        <h2 className="oi-m-section" style={{ marginBottom: 12 }}>The two of you</h2>
        <div className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <TextField label="Your name" value={v.couple1Name} onChange={(e) => queue({ couple1Name: e.target.value })} placeholder="Sophie" autoCapitalize="words" />
          <TextField label="Your partner's name" value={v.couple2Name} onChange={(e) => queue({ couple2Name: e.target.value })} placeholder="James" autoCapitalize="words" />
        </div>
      </section>
      <section>
        <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Your address</h2>
        <div className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {d.slug ? (
            <>
              <div className="oi-m-body oi-m-strong" style={{ overflowWrap: 'anywhere' }}>openinvite.com.au/w/{d.slug}</div>
              <PillButton variant="secondary" size="sm" onClick={() => setAddr(true)} style={{ alignSelf: 'flex-start' }}>Change address</PillButton>
            </>
          ) : <p className="oi-m-meta">Your address appears here once you have added both names.</p>}
        </div>
      </section>
      <section>
        <h2 className="oi-m-section" style={{ marginBottom: 12 }}>The date</h2>
        <div className="oi-m-card"><TextField label="Wedding date" type="date" value={v.weddingDate} onChange={(e) => queue({ weddingDate: e.target.value })} /></div>
      </section>
      <section>
        <h2 className="oi-m-section" style={{ marginBottom: 12 }}>How many</h2>
        <div className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <PillChoice label="Guest type" options={GUEST_TYPES} value={v.guestType} onChange={(val) => queue({ guestType: val })} />
          <TextField label="Exact guest count" type="number" inputMode="numeric" value={v.guestCount} onChange={(e) => queue({ guestCount: e.target.value })} placeholder="120" />
        </div>
      </section>
      <ChangeAddressSheet open={addr} currentSlug={d.slug} onClose={() => setAddr(false)} onChange={onChangeAddress} />
    </>
  );
}

/** ChangeAddressDialog.jsx, as a sheet: the same canonical form, the same refusals. */
function ChangeAddressSheet({ open, currentSlug, onClose, onChange }) {
  const [wanted, setWanted] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setWanted(''); setConfirm(''); setError(''); } }, [open]);
  const cleaned = canonicalSlug(wanted);
  const matches = cleaned && canonicalSlug(confirm) === cleaned;
  const same = cleaned && cleaned === canonicalSlug(currentSlug);
  const ready = !!cleaned && matches && !same && !busy;
  const submit = async () => {
    if (!ready) return;
    setBusy(true); setError('');
    try { await onChange(cleaned); onClose(); } catch (e) { setError(e?.message || 'The address could not be changed. Nothing was saved.'); } finally { setBusy(false); }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Change your address" footer={(
      <>
        <PillButton variant="secondary" onClick={onClose} disabled={busy}>Cancel</PillButton>
        <PillButton variant="primary" onClick={submit} disabled={!ready} style={{ flex: 1 }}>{busy ? 'Changing' : 'Change address'}</PillButton>
      </>
    )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p className="oi-m-meta">Your site is at openinvite.com.au/w/{currentSlug}. Links you have already shared keep working.</p>
        <TextField label="New address" value={wanted} onChange={(e) => setWanted(e.target.value)} placeholder="jay-ella" autoCapitalize="off" autoCorrect="off" />
        <TextField label="Type it again" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="jay-ella" autoCapitalize="off" autoCorrect="off" error={confirm && !matches ? 'The two do not match yet.' : same ? 'That is already your address.' : ''} />
        {cleaned && <p className="oi-m-meta">It will read openinvite.com.au/w/{cleaned}</p>}
        {error && <p className="oi-m-field__error" role="alert">{error}</p>}
      </div>
    </BottomSheet>
  );
}

/* ── Events ──────────────────────────────────────────────────────────── */

const mainFields = (locationBias) => [
  { name: 'venue', label: 'Venue', type: 'place', locationBias },
  { name: 'startTime', label: 'Start time', type: 'time' },
  { name: 'endTime', label: 'End time', type: 'time' },
  { name: 'dressCode', label: 'Dress code', type: 'text', placeholder: 'Black tie, smart casual' },
  { name: 'parkingInfo', label: 'Parking', type: 'text', placeholder: 'Free parking on Church St' },
  { name: 'accessibilityNotes', label: 'Accessibility', type: 'text', placeholder: 'Step-free through the north entrance' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];
const customFields = (locationBias, isNew) => [
  ...(isNew ? [{ name: 'kind', label: 'When', type: 'pills', options: [{ value: 'pre', label: 'Before the wedding' }, { value: 'post', label: 'After the wedding' }] }] : []),
  { name: 'name', label: 'Event name', type: 'text', placeholder: 'Welcome dinner' },
  { name: 'type', label: 'Type', type: 'select', options: [] },
  { name: 'date', label: 'Date', type: 'date' },
  ...mainFields(locationBias),
];

function venueOfMain(ev) {
  return ev?.venueName ? { name: ev.venueName, address: ev.address || '', mapsUrl: ev.mapsUrl || null, photoUrl: ev.photoUrl || null, placeId: ev.placeId || null } : null;
}
function venueOfCustom(ev) {
  return ev?.venueName ? { name: ev.venueName, address: ev.venueAddress || ev.address || '', mapsUrl: ev.venueMapsUrl || ev.mapsUrl || null, photoUrl: ev.venuePhotoUrl || ev.photoUrl || null, placeId: ev.venuePlaceId || ev.placeId || null } : null;
}

function EventsSegment({ d, onSave, onInvitePrompt }) {
  const [sheet, setSheet] = useState(null); // { fixed: 'ceremony'|'reception' } | { custom: ev, post } | { custom: null }
  const [confirm, confirmEl] = useConfirm();
  const mc = d.mainCeremony || {};
  const rc = d.reception || {};
  const bias = mc.address || '';
  const custom = useMemo(() => {
    const ms = (x) => { if (!x) return Infinity; const t = Date.parse(`${x}T00:00:00`); return Number.isNaN(t) ? Infinity : t; };
    return [...(d.preWeddingEvents || []).map((e) => ({ ...e, _kind: 'pre' })), ...(d.postWeddingEvents || []).map((e) => ({ ...e, _kind: 'post' }))]
      .sort((a, b) => (ms(a.date) - ms(b.date)) || String(a.startTime || a.time || '').localeCompare(String(b.startTime || b.time || '')));
  }, [d.preWeddingEvents, d.postWeddingEvents]);

  const saveFixed = async (values) => {
    const key = sheet.fixed === 'ceremony' ? 'mainCeremony' : 'reception';
    const cur = d[key] || {};
    const v = values.venue;
    await onSave(key, { ...cur, venueName: v?.name || '', address: v?.address || '', mapsUrl: v?.mapsUrl || null, photoUrl: v?.photoUrl || null, placeId: v?.placeId || null, startTime: values.startTime || '', endTime: values.endTime || '', dressCode: values.dressCode, parkingInfo: values.parkingInfo, accessibilityNotes: values.accessibilityNotes, notes: values.notes });
  };
  const saveCustom = async (values) => {
    const v = values.venue;
    const saved = {
      name: values.name, type: values.type, date: values.date, startTime: values.startTime || '', endTime: values.endTime || '', time: values.startTime || '',
      dressCode: values.dressCode, parkingInfo: values.parkingInfo, accessibilityNotes: values.accessibilityNotes, notes: values.notes, details: values.notes,
      venueName: v?.name || '', venueAddress: v?.address || '', venueMapsUrl: v?.mapsUrl || null, venuePhotoUrl: v?.photoUrl || null, venuePlaceId: v?.placeId || null, venue: v?.name || '', address: v?.address || '',
    };
    if (sheet.custom?.id) {
      const key = sheet.custom._kind === 'post' ? 'postWeddingEvents' : 'preWeddingEvents';
      await onSave(key, (d[key] || []).map((e) => (e.id === sheet.custom.id ? { ...e, ...saved, id: e.id, event_id: e.event_id || e.id } : e)));
    } else {
      const key = values.kind === 'post' ? 'postWeddingEvents' : 'preWeddingEvents';
      const eid = uid();
      await onSave(key, [...(d[key] || []), { ...saved, kind: values.kind, id: eid, event_id: eid }]);
      onInvitePrompt?.({ event_id: eid, name: values.name || 'this event' });
    }
  };
  const removeCustom = async (ev) => {
    if (!(await confirm({ title: 'Remove this event', body: `${ev.name || 'This event'} comes off your site and every guest's invitation list.`, action: 'Remove' }))) return;
    const key = ev._kind === 'post' ? 'postWeddingEvents' : 'preWeddingEvents';
    await onSave(key, (d[key] || []).filter((e) => e.id !== ev.id));
    setSheet(null);
  };

  const [kindDraft, setKindDraft] = useState('pre');
  const fieldsFor = () => {
    if (sheet?.fixed) return mainFields(bias);
    const f = customFields(bias, !sheet?.custom?.id);
    const kind = sheet?.custom?.id ? sheet.custom._kind : kindDraft;
    const typeField = f.find((x) => x.name === 'type');
    typeField.options = (kind === 'post' ? POST_WEDDING_TYPES : PRE_WEDDING_TYPES).map((t) => ({ value: t, label: t }));
    return f;
  };
  const initialFor = () => {
    if (sheet?.fixed) { const ev = sheet.fixed === 'ceremony' ? mc : rc; return { ...ev, venue: venueOfMain(ev) }; }
    if (sheet?.custom?.id) { const ev = sheet.custom; return { ...ev, startTime: ev.startTime || ev.time || '', notes: ev.details || ev.notes || '', venue: venueOfCustom(ev) }; }
    return { kind: 'pre', type: PRE_WEDDING_TYPES[0] };
  };

  return (
    <>
      <section>
        <h2 className="oi-m-section" style={{ marginBottom: 12 }}>The day</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <EventCard title="Ceremony" ev={mc} venue={venueOfMain(mc)} date={d.weddingDate} onEdit={() => setSheet({ fixed: 'ceremony' })} />
          <EventCard title="Reception" ev={rc} venue={venueOfMain(rc)} date={d.weddingDate} onEdit={() => setSheet({ fixed: 'reception' })} />
        </div>
      </section>
      <section>
        <div className="oi-m-section-head">
          <h2 className="oi-m-section">Around it</h2>
          <button type="button" className="oi-m-block__link" onClick={() => { setKindDraft('pre'); setSheet({ custom: null }); }}>Add event</button>
        </div>
        {custom.length === 0 ? (
          <EmptyState icon={Plus} text="No other events yet. A welcome dinner, a recovery brunch, the hens and the bucks all go here." actionLabel="Add an event" onAction={() => { setKindDraft('pre'); setSheet({ custom: null }); }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {custom.map((ev) => <EventCard key={ev.id} title={ev.name || ev.type || 'Untitled event'} ev={{ ...ev, startTime: ev.startTime || ev.time }} venue={venueOfCustom(ev)} date={ev.date} badge={ev._kind === 'post' ? 'After' : 'Before'} onEdit={() => setSheet({ custom: ev })} onRemove={() => removeCustom(ev)} />)}
          </div>
        )}
      </section>
      {sheet && (
        <FormSheet
          open
          full
          title={sheet.fixed ? (sheet.fixed === 'ceremony' ? 'Edit ceremony' : 'Edit reception') : sheet.custom?.id ? 'Edit event' : 'Add event'}
          fields={fieldsFor()}
          initial={initialFor()}
          required={sheet.fixed ? [] : ['name']}
          onClose={() => setSheet(null)}
          onSave={sheet.fixed ? saveFixed : saveCustom}
          onDelete={sheet.custom?.id ? () => removeCustom(sheet.custom) : undefined}
          saveLabel={sheet.fixed || sheet.custom?.id ? 'Save' : 'Add event'}
          onValuesChange={(v, setV) => { if (!sheet.fixed && !sheet.custom?.id && v.kind && v.kind !== kindDraft) { setKindDraft(v.kind); setV((s) => ({ ...s, type: (v.kind === 'post' ? POST_WEDDING_TYPES : PRE_WEDDING_TYPES)[0] })); } }}
        />
      )}
      {confirmEl}
    </>
  );
}

function EventCard({ title, ev, venue, date, badge, onEdit, onRemove }) {
  const when = [date ? dateLong(date) : '', ev?.startTime ? `${timeLabel(ev.startTime)}${ev.endTime ? ` to ${timeLabel(ev.endTime)}` : ''}` : ''].filter(Boolean).join(', ');
  return (
    <div className="oi-m-place">
      {venue?.photoUrl && <SmartImage src={venue.photoUrl} alt={venue.name} width={358} ratio="16/9" />}
      <div className="oi-m-place__body">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
          <div className="oi-m-item__title" style={{ whiteSpace: 'normal' }}>{title}</div>
          {badge && <StatusPill tone="neutral">{badge}</StatusPill>}
        </div>
        {venue?.name ? <div className="oi-m-body">{venue.name}</div> : <div className="oi-m-meta">No venue yet</div>}
        {venue?.address && <div className="oi-m-meta">{venue.address}</div>}
        {when && <div className="oi-m-meta">{when}</div>}
        {ev?.dressCode && <div className="oi-m-meta">Dress code: {ev.dressCode}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <PillButton variant="secondary" size="sm" icon={Pencil} onClick={onEdit}>Edit</PillButton>
          {venue?.mapsUrl && <PillButton variant="secondary" size="sm" icon={MapPin} onClick={() => openExternal(venue.mapsUrl)}>Open in Maps</PillButton>}
          {onRemove && <PillButton variant="ghost" size="sm" icon={Trash2} onClick={onRemove}>Remove</PillButton>}
        </div>
      </div>
    </div>
  );
}

/* ── Theme ───────────────────────────────────────────────────────────── */

function ThemeSegment({ theme, onSave }) {
  const [local, setLocal] = useState({ aesthetic: [], faith: '', faithSecondary: '', culture: [], cultureOther: '', atmosphere: [], season: '', setting: '', vibes: [], is_religious: false, religious_details: '', is_cultural: false, cultural_details: '', ...theme });
  const [picks, setPicks] = useState(() => (theme?.faith === 'Interfaith' && theme?.faithSecondary ? theme.faithSecondary.split(' and ').filter(Boolean) : []));
  const [cultureQ, setCultureQ] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setLocal((s) => ({ ...s, [k]: v }));
  const setFaith = (v) => { set('faith', v); if (v !== 'Interfaith') setPicks([]); };
  const togglePick = (v) => setPicks((p) => (p.includes(v) ? p.filter((x) => x !== v) : p.length >= 2 ? p : [...p, v]));
  const cultureOptions = useMemo(() => {
    const q = cultureQ.trim().toLowerCase();
    const groups = CULTURE_REGIONS.map((g) => ({ region: g.region, items: g.items.filter((i) => !q || i.toLowerCase().includes(q)) })).filter((g) => g.items.length);
    return groups;
  }, [cultureQ]);
  const save = async () => {
    if (local.faith === 'Interfaith' && picks.length !== 2) { setErr('Choose exactly two faiths for Interfaith.'); return; }
    setErr(''); setSaving(true);
    try { await onSave({ ...local, faithSecondary: local.faith === 'Interfaith' ? picks.join(' and ') : '' }); toast.success('Theme saved'); } catch { toast.error('Could not save the theme.'); } finally { setSaving(false); }
  };
  return (
    <>
      <section><div className="oi-m-card"><PillChoice label="What is the aesthetic" options={AESTHETIC_OPTIONS} value={local.aesthetic || []} onChange={(v) => set('aesthetic', v)} multi /></div></section>
      <section>
        <div className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <PillChoice label="Faith" options={FAITH_OPTIONS} value={local.faith || ''} onChange={setFaith} />
          {local.faith === 'Interfaith' && <PillChoice label="Which two" options={FAITH_FOR_INTERFAITH} value={picks} onChange={(v) => setPicks(v.slice(-2))} multi hint="Exactly two." />}
        </div>
      </section>
      <section>
        <div className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="oi-m-field">
            <span className="oi-m-field__label">Culture</span>
            <div style={{ position: 'relative' }}>
              <Search size={18} strokeWidth={1.75} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--m-text-2)', pointerEvents: 'none' }} />
              <input className="oi-m-input" style={{ paddingLeft: 42 }} value={cultureQ} onChange={(e) => setCultureQ(e.target.value)} placeholder="Find a culture" />
            </div>
          </div>
          {(local.culture || []).length > 0 && <PillChoice label="Chosen" options={local.culture} value={local.culture} onChange={(v) => set('culture', v)} multi />}
          {cultureOptions.map((g) => <PillChoice key={g.region} label={g.region} options={g.items} value={local.culture || []} onChange={(v) => set('culture', v)} multi />)}
          <PillChoice label="Also" options={CULTURE_CROSS_CUTTING} value={local.culture || []} onChange={(v) => set('culture', v)} multi />
          <TextField label="Another culture" value={local.cultureOther || ''} onChange={(e) => set('cultureOther', e.target.value)} placeholder="Type it if it is not in the list" />
        </div>
      </section>
      <section><div className="oi-m-card"><PillChoice label="The atmosphere" options={ATMOSPHERE_OPTIONS} value={local.atmosphere || []} onChange={(v) => set('atmosphere', v)} multi /></div></section>
      <section>
        <div className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <PillChoice label="Season" options={SEASON_OPTIONS} value={local.season || ''} onChange={(v) => set('season', v)} />
          <PillChoice label="Setting" options={SETTING_OPTIONS} value={local.setting || ''} onChange={(v) => set('setting', v)} />
        </div>
      </section>
      {err && <p className="oi-m-field__error" role="alert">{err}</p>}
      <PillButton variant="primary" block onClick={save} disabled={saving}>{saving ? 'Saving' : 'Save theme'}</PillButton>
    </>
  );
}

/** "Who is invited to X?" after a new custom event, as EventDetails.jsx asks. */
export function InvitePromptSheet({ event, onClose, onEveryone, onChoose }) {
  return (
    <BottomSheet open={!!event} onClose={onClose} title={event ? `Who is invited to ${event.name}?` : ''}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p className="oi-m-meta">Guests only see an event they are invited to. Until you choose, nobody is invited to this one.</p>
        <PillButton variant="primary" block onClick={onEveryone}>Everyone on the guest list</PillButton>
        <PillButton variant="secondary" block onClick={onChoose}>Choose guests</PillButton>
        <PillButton variant="ghost" block onClick={onClose}>Decide later</PillButton>
      </div>
    </BottomSheet>
  );
}
