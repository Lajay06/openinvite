import React, { useState } from 'react';
import { Plus, Hotel, Car, MapPin, Globe, Trash2, Sparkles, StickyNote } from 'lucide-react';
import toast from 'react-hot-toast';
import Screen from '../../shell/Screen';
import { EmptyState, ErrorState, SkeletonRows, BottomSheet, PillButton, TextField, TextAreaField, SelectField, SmartImage, StatusPill, RowGroup, Row, PanelCard } from '../../ui';
import PlaceField from '../../ui/PlaceField';
import Segments, { useSegment } from '../../ui/Segments';
import { useConfirm } from '../../ui/ConfirmSheet';
import { useApi } from '../../data/api';
import { openExternal } from '../../native';

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
/* GuestSuiteAccommodation.jsx's badges and GuestSuiteTransport.jsx's types, verbatim. */
export const BADGE_OPTIONS = ['Closest to venue', 'Best value', 'Where most guests are staying', 'Luxury pick', 'Budget friendly'];
export const TRANSPORT_TYPES = [['airport', 'Airport'], ['train_station', 'Train station'], ['bus_station', 'Bus or coach station'], ['car_rental', 'Car rental'], ['ferry', 'Ferry terminal'], ['other', 'Other']];
const typeLabel = (t) => TRANSPORT_TYPES.find(([k]) => k === t)?.[1] || 'Transport';

/**
 * The guest suite's Accommodation and Transport editors, as the desktop
 * pages: Google Places search (through PlaceField, with Use my location
 * and add by hand), a note for guests, a badge (accommodation) or a type
 * (transport), the website from place details at add time, cards with
 * the photo, Open in Maps, the website, remove; transport's notes with
 * add, edit and remove; and Ava's recommendations, each resolved through
 * Places search and added one by one, as the desktop does.
 *
 * props: kind 'accommodation' | 'transport', places, notes (transport),
 * destination (the ceremony address), onSave(places, notes), ...
 */
export default function SuitePlacesScreen({ kind, places = [], notes = [], destination = '', onSave, loading, error, onRetry, back }) {
  const api = useApi();
  const isStay = kind === 'accommodation';
  const segments = isStay ? null : [{ key: 'places', label: 'Places' }, { key: 'notes', label: 'Notes' }];
  const [segment, setSegment] = useSegment(segments || [{ key: 'places', label: 'Places' }]);
  const [adding, setAdding] = useState(false);
  const [noteSheet, setNoteSheet] = useState(null); // { note } | { note: null }
  const [ava, setAva] = useState(null); // { busy } | { suggestions }
  const [confirm, confirmEl] = useConfirm();
  const title = isStay ? 'Accommodation' : 'Transport';

  const remove = async (p) => { if (!(await confirm({ title: `Remove ${p.name}`, body: 'It comes off your site.', action: 'Remove' }))) return; await onSave(places.filter((x) => (x.id || x.place_id) !== (p.id || p.place_id)), notes); };
  const addPlace = async (place, extra) => {
    // The website comes from place details at add time, as the desktop pages fetch it.
    let website_url = null;
    if (place.placeId) { try { const d = await api.places.details(place.placeId); website_url = d?.website || null; } catch { /* added without it */ } }
    const saved = isStay
      ? { id: uid(), place_id: place.placeId || undefined, name: place.name, address: place.address, rating: place.rating ?? undefined, price_level: place.price_level ?? undefined, photo_url: place.photoUrl || null, maps_url: place.mapsUrl || null, website_url: extra.website_url || website_url, note: extra.note || '', badge: extra.badge || null }
      : { id: uid(), place_id: place.placeId || undefined, name: place.name, type: extra.type || 'other', address: place.address || '', photo_url: place.photoUrl || null, maps_url: place.mapsUrl || null, website_url: extra.website_url || website_url, note: extra.note || '' };
    await onSave([...places, saved], notes);
    toast.success(`${place.name} added`);
  };
  const recommend = async () => {
    if (!destination) { toast.error('Add your venue address in Event details first'); return; }
    setAva({ busy: true });
    try {
      const prompt = isStay
        ? `Recommend 4 accommodation options for wedding guests staying near ${destination}. Include one luxury hotel, one mid-range hotel, one budget hotel, and one boutique/unique stay. For each suggest a REAL property that likely exists near this location.\n\nReturn ONLY valid JSON, no markdown:\n{"suggestions":[\n  {"name":"Exact hotel name","area":"neighborhood or distance from venue","priceRange":"$200-300/night","description":"2 sentences: why it's great for wedding guests, any standout feature","badge":"Luxury pick"},\n  ...\n]}\n\nBadge options: "Luxury pick", "Best value", "Closest to venue", "Budget friendly", "Boutique pick"`
        : `Give transport advice for wedding guests getting to and around ${destination}. Cover: nearest airport(s), how to get from airport to venue area, public transport, rideshare/taxi tips, parking, and any wedding-day transport note.\n\nReturn ONLY valid JSON, no markdown:\n{"suggestions":[\n  {"type":"airport","name":"Exact airport name","description":"1-2 sentences: distance, transport options to venue area","isPlace":true},\n  {"type":"rideshare","name":"Rideshare & taxi","description":"Rideshare availability, estimated fare, pickup tips","isPlace":false},\n  {"type":"public_transport","name":"Public transport","description":"Best public transport routes to the venue area","isPlace":false},\n  {"type":"parking","name":"Parking","description":"Venue parking availability and nearby options","isPlace":false},\n  {"type":"tip","name":"Wedding day shuttle","description":"Recommend couples arrange a shuttle if venue is remote","isPlace":false}\n]}\n\nType options: "airport", "train_station", "rideshare", "public_transport", "parking", "tip"\nisPlace: true only for actual places (airports, stations) that can be found on Google Maps`;
      const response = await api.llm(prompt);
      const text = typeof response === 'string' ? response : JSON.stringify(response);
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('No JSON');
      const list = (JSON.parse(m[0]).suggestions || []).map((s, i) => ({ ...s, _avaId: `ava-${i}-${Date.now()}` }));
      if (!list.length) toast.error('No suggestions came back. Try again.');
      setAva({ suggestions: list });
    } catch { toast.error('Ava could not suggest anything just now. Try again.'); setAva(null); }
  };
  const addSuggestion = async (s) => {
    let top = null;
    try { const found = await api.places.search({ q: isStay ? `${s.name} hotel` : s.name, location: destination || '' }); top = found?.[0] || null; } catch { /* added without Places */ }
    const place = top ? { name: s.name, address: top.address || s.area || '', placeId: top.place_id, mapsUrl: top.maps_url, photoUrl: top.photo_reference ? api.places.photo(top.photo_reference) : null, rating: top.rating, price_level: top.price_level } : { name: s.name, address: s.area || '', placeId: null, mapsUrl: null, photoUrl: null };
    await addPlace(place, isStay ? { note: s.description || '', badge: s.badge && BADGE_OPTIONS.includes(s.badge) ? s.badge : null } : { type: s.type === 'airport' ? 'airport' : s.type === 'train_station' ? 'train_station' : 'other', note: s.description || '' });
    setAva((a) => (a?.suggestions ? { suggestions: a.suggestions.filter((x) => x._avaId !== s._avaId) } : a));
  };
  const addSuggestionNote = async (s) => { await onSave(places, [...notes, { id: uid(), title: s.name, text: s.description }]); setAva((a) => (a?.suggestions ? { suggestions: a.suggestions.filter((x) => x._avaId !== s._avaId) } : a)); toast.success(`${s.name} added to notes`); };

  return (
    <Screen title={title} subtitle={loading ? '' : isStay ? `${places.length} place${places.length === 1 ? '' : 's'} to stay on your site` : `${places.length} place${places.length === 1 ? '' : 's'}, ${notes.length} note${notes.length === 1 ? '' : 's'} on your site`} back={back} actions={[{ icon: Sparkles, label: 'Ask Ava to recommend', onClick: recommend }, { icon: Plus, label: segment === 'notes' ? 'Add a note' : 'Add a place', onClick: () => (segment === 'notes' ? setNoteSheet({ note: null }) : setAdding(true)) }]}>
      {segments && <Segments options={segments} value={segment} onChange={setSegment} />}
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={4} /> : segment === 'notes' ? (
          notes.length === 0 ? <EmptyState icon={StickyNote} text="No notes yet. Rideshare tips, the shuttle time, where to park." actionLabel="Add a note" onAction={() => setNoteSheet({ note: null })} /> : (
            <RowGroup>{notes.map((n) => <Row key={n.id} icon={StickyNote} tile="neutral" label={n.title} sub={n.text} wrap onClick={() => setNoteSheet({ note: n })} />)}</RowGroup>
          )
        ) : (
          <>
            <p className="oi-m-meta">{isStay ? 'Places guests can stay, shown on your site.' : 'How guests get there and around, shown on your site.'}</p>
            {places.length === 0 ? <EmptyState icon={isStay ? Hotel : Car} text={isStay ? 'No places yet. Search for the hotels near your venue, or ask Ava.' : 'No places yet. The airport, the station, a car hire, or ask Ava.'} actionLabel="Add a place" onAction={() => setAdding(true)} /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {places.map((p) => (
                  <div key={p.id || p.place_id} className="oi-m-place">
                    {p.photo_url && <SmartImage src={p.photo_url} alt={p.name} width={358} ratio="16/9" />}
                    <div className="oi-m-place__body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                        <div className="oi-m-item__title" style={{ whiteSpace: 'normal' }}>{p.name}</div>
                        {isStay ? (p.badge && <StatusPill tone="light">{p.badge}</StatusPill>) : <StatusPill tone="neutral">{typeLabel(p.type)}</StatusPill>}
                      </div>
                      {p.address && <div className="oi-m-meta">{p.address}</div>}
                      {p.rating && <div className="oi-m-meta">{p.rating} stars on Google</div>}
                      {p.note && <p className="oi-m-body" style={{ marginTop: 4 }}>{p.note}</p>}
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        {p.maps_url && <PillButton variant="secondary" size="sm" icon={MapPin} onClick={() => openExternal(p.maps_url)}>Open in Maps</PillButton>}
                        {p.website_url && <PillButton variant="secondary" size="sm" icon={Globe} onClick={() => openExternal(p.website_url)}>Website</PillButton>}
                        <PillButton variant="ghost" size="sm" icon={Trash2} onClick={() => remove(p)}>Remove</PillButton>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {destination ? <PanelCard tone="ink" mark="✦" label="From Ava" body={isStay ? 'Four real places near your venue: a luxury pick, a mid-range hotel, a budget option and something boutique.' : 'The nearest airport, how to get to the venue, public transport, rideshare, parking and a shuttle note.'} action="Ask Ava to recommend" onClick={recommend} /> : <p className="oi-m-meta">Add your venue address in Event details and Ava can recommend places near it.</p>}
          </>
        )}
      </div>

      {adding && <AddPlaceSheet isStay={isStay} destination={destination} onClose={() => setAdding(false)} onAdd={async (place, extra) => { await addPlace(place, extra); setAdding(false); }} />}
      {noteSheet && <NoteSheet note={noteSheet.note} onClose={() => setNoteSheet(null)} onSave={async (v) => { const next = noteSheet.note ? notes.map((n) => (n.id === noteSheet.note.id ? { ...n, ...v } : n)) : [...notes, { id: uid(), ...v }]; await onSave(places, next); setNoteSheet(null); }} onDelete={noteSheet.note ? async () => { await onSave(places, notes.filter((n) => n.id !== noteSheet.note.id)); setNoteSheet(null); } : undefined} />}
      {ava && (
        <BottomSheet open onClose={() => setAva(null)} title="Ava suggests" full>
          {ava.busy ? <p className="oi-m-body" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Sparkles size={16} /> Ava is looking around {destination}.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ava.suggestions.length === 0 && <p className="oi-m-meta">Everything Ava suggested is on your site.</p>}
              {ava.suggestions.map((s) => (
                <div key={s._avaId} className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span className="oi-m-body oi-m-strong">{s.name}</span>{(s.badge || s.type) && <StatusPill tone="light">{s.badge || typeLabel(s.type) || s.type}</StatusPill>}</div>
                  {(s.area || s.priceRange) && <div className="oi-m-meta">{[s.area, s.priceRange].filter(Boolean).join(', ')}</div>}
                  {s.description && <p className="oi-m-meta" style={{ color: 'var(--m-text)' }}>{s.description}</p>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(isStay || s.isPlace) && <PillButton variant="primary" size="sm" icon={Plus} onClick={() => addSuggestion(s)}>Add place</PillButton>}
                    {!isStay && <PillButton variant="secondary" size="sm" icon={StickyNote} onClick={() => addSuggestionNote(s)}>Add as a note</PillButton>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </BottomSheet>
      )}
      {confirmEl}
    </Screen>
  );
}

function AddPlaceSheet({ isStay, destination, onClose, onAdd }) {
  const [place, setPlace] = useState(null);
  const [note, setNote] = useState('');
  const [badge, setBadge] = useState('');
  const [type, setType] = useState('other');
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <BottomSheet open onClose={onClose} title={isStay ? 'Add a place to stay' : 'Add a place'} full footer={(
      <>
        <PillButton variant="secondary" onClick={onClose} disabled={busy}>Cancel</PillButton>
        <PillButton variant="primary" icon={Plus} style={{ flex: 1 }} disabled={!place?.name || busy} onClick={async () => { setBusy(true); try { await onAdd(place, { note: note.trim(), badge: badge || null, type, website_url: website.trim() || null }); } finally { setBusy(false); } }}>{busy ? 'Adding' : isStay ? 'Add accommodation' : 'Add place'}</PillButton>
      </>
    )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <PlaceField label={isStay ? 'Hotel or stay' : 'Airport, station, car hire'} value={place} onChange={setPlace} locationBias={destination} placeholder={isStay ? 'Hilton Sydney, boutique hotels' : 'The airport, the train station'} manualFields={<TextField label="Website" type="url" inputMode="url" autoCapitalize="off" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />} />
        {!isStay && <SelectField label="Type" value={type} onChange={(e) => setType(e.target.value)} options={TRANSPORT_TYPES.map(([value, label]) => ({ value, label }))} />}
        <TextField label="Note for guests" value={note} onChange={(e) => setNote(e.target.value)} placeholder={isStay ? 'Use code WEDDING for 15 percent off' : 'About 30 minutes from the venue'} />
        {isStay && <SelectField label="Highlight badge" value={badge} onChange={(e) => setBadge(e.target.value)} options={BADGE_OPTIONS.map((b) => ({ value: b, label: b }))} placeholder="No badge" />}
      </div>
    </BottomSheet>
  );
}

function NoteSheet({ note, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState(note?.title || '');
  const [text, setText] = useState(note?.text || '');
  const [busy, setBusy] = useState(false);
  return (
    <BottomSheet open onClose={onClose} title={note ? 'Edit note' : 'Add a note'} footer={(
      <>
        {onDelete && <PillButton variant="ghost" onClick={onDelete} disabled={busy} style={{ color: 'var(--m-primary)' }}>Remove</PillButton>}
        <PillButton variant="secondary" onClick={onClose} disabled={busy}>Cancel</PillButton>
        <PillButton variant="primary" style={{ flex: 1 }} disabled={!title.trim() || busy} onClick={async () => { setBusy(true); try { await onSave({ title: title.trim(), text: text.trim() }); } finally { setBusy(false); } }}>{busy ? 'Saving' : 'Save'}</PillButton>
      </>
    )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Rideshare" autoCapitalize="sentences" />
        <TextAreaField label="Note" value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Uber and DiDi both run here, but book ahead after 11pm" />
      </div>
    </BottomSheet>
  );
}

