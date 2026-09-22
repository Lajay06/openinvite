import React, { useEffect, useMemo, useState } from 'react';
import { Plus, MapPin, Globe, Trash2, Sparkles, Star, Heart, Coffee, Utensils, Wine, Compass, Mountain, Waves, Bus, ShoppingBag, Sun, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Screen from '../../shell/Screen';
import { EmptyState, ErrorState, SkeletonRows, BottomSheet, PillButton, TextField, TextAreaField, SelectField, SmartImage, StatusPill, RowGroup, Row, Switch, FilterPills, PanelCard } from '../../ui';
import PlaceField from '../../ui/PlaceField';
import PillChoice from '../../ui/PillChoice';
import Segments, { useSegment } from '../../ui/Segments';
import { useConfirm } from '../../ui/ConfirmSheet';
import { useApi } from '../../data/api';
import { openExternal } from '../../native';

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const SEGMENTS = [{ key: 'places', label: 'Places' }, { key: 'itinerary', label: 'Itinerary' }, { key: 'publish', label: 'Publish' }];
/* ExperienceGuideTab.jsx's categories (keys are stored, never renamed), vibes, blocks and lengths, verbatim. */
export const CATEGORIES = [['mustEat', 'Eat', Utensils], ['coffee', 'Coffee', Coffee], ['hiddenGems', 'Hidden gems', Star], ['luxuryDining', 'Fine dining', Wine], ['nature', 'Outdoors', Mountain], ['nightlife', 'Drink', Wine], ['thingsToDo', 'Do', Compass], ['wellness', 'Wellness', Waves], ['dayTrips', 'Day trips', Bus], ['shopping', 'Shopping', ShoppingBag], ['weddingWeekend', 'The wedding weekend', Sun]];
const VIBE_OPTIONS = ['Coastal luxury', 'Late-night food scene', 'Historic architecture', 'Relaxed beach culture', 'World-class dining', 'Art & culture hub', 'Hidden local gems', 'Outdoor adventure', 'Urban sophistication', 'Wine country', 'Tropical paradise', 'Mountain escape', 'Fashion & shopping', 'Wellness & spa', 'Vibrant nightlife'];
const TIME_BLOCKS = ['morning', 'afternoon', 'evening'];
const ITINERARY_LENGTHS = [1, 3, 5];
const labelOf = (key) => CATEGORIES.find(([k]) => k === key)?.[1] || key;

function buildSchedule(numDays, existing) {
  return Array.from({ length: numDays }, (_, i) => { const ex = existing.find((d) => d.day === i + 1) || {}; return { day: i + 1, title: ex.title || `Day ${i + 1}`, summary: ex.summary || '', blocks: { morning: ex.blocks?.morning || [], afternoon: ex.blocks?.afternoon || [], evening: ex.blocks?.evening || [] } }; });
}

/**
 * The experience guide, as the studio's ExperienceGuideTab: Places per
 * category (Places search, a note, the couple's pick, add by hand,
 * remove, toggle the pick), Itinerary (1, 3 or 5 days with morning,
 * afternoon and evening; add an activity from a saved place or custom;
 * remove; Ava plans it; Save), Publish (hero photo, the editorial intro
 * with Ava, the vibes, the published switch). Saved whole on
 * `experienceGuide`, with couplePicks mirrored as the guest page reads it.
 */
export default function ExperienceScreen({ guide = {}, destination = '', onSave, loading, error, onRetry, back }) {
  const api = useApi();
  const [segment, setSegment] = useSegment(SEGMENTS);
  const [confirm, confirmEl] = useConfirm();
  const categories = guide.categories || {};
  const allSaved = useMemo(() => CATEGORIES.flatMap(([key, label]) => (categories[key]?.places || []).map((p) => ({ ...p, categoryKey: key, categoryLabel: label }))), [categories]);
  const photoOf = (p) => (p.photo_url ? p.photo_url : p.photo_ref ? api.places.photo(p.photo_ref, 800) : '');
  const save = (patch) => onSave({ ...guide, ...patch });

  /* ── Places ── */
  // Land on the first category with something in it (the desktop's first tab is Eat, often empty) until the couple picks one.
  const [chosenCat, setCat] = useState(null);
  const cat = chosenCat || (CATEGORIES.find(([key]) => (categories[key]?.places || []).length) || CATEGORIES[0])[0];
  const [adding, setAdding] = useState(false);
  const withPick = (next, catKey, placeId, nextPick) => {
    const places = next.categories?.[catKey]?.places || [];
    const place = places.find((p) => p.place_id === placeId);
    const cats = { ...(next.categories || {}), [catKey]: { ...(next.categories?.[catKey] || {}), places: places.map((p) => (p.place_id === placeId ? { ...p, is_couple_pick: nextPick } : p)) } };
    const without = (next.couplePicks || []).filter((p) => p.place_id !== placeId);
    return { ...next, categories: cats, couplePicks: nextPick && place ? [...without, { ...place, is_couple_pick: true, category: labelOf(catKey) }] : without };
  };
  const addPlace = async (place, note, isPick, catKey) => {
    const list = categories[catKey]?.places || [];
    const pid = place.placeId || `manual-${uid()}`;
    if (list.find((p) => p.place_id === pid)) { toast.error('Already added to this category'); return; }
    let website_url = place.website_url || null;
    if (!website_url && place.placeId) { try { const d = await api.places.details(place.placeId); website_url = d?.website || null; } catch { /* without it */ } }
    const saved = { place_id: pid, name: place.name, address: place.address || '', rating: place.rating ?? null, price_level: place.price_level ?? null, photo_ref: place.photoReference || null, maps_url: place.mapsUrl || null, website_url, note: note || '', is_couple_pick: !!isPick };
    let next = { ...guide, categories: { ...categories, [catKey]: { ...(categories[catKey] || {}), places: [...list, saved] } } };
    if (isPick) next = withPick(next, catKey, pid, true);
    await onSave(next);
    toast.success(`Added to ${labelOf(catKey)}`);
  };
  const removePlace = async (catKey, p) => {
    if (!(await confirm({ title: `Remove ${p.name}`, body: 'It comes off the guide.', action: 'Remove' }))) return;
    const cats = { ...categories, [catKey]: { ...(categories[catKey] || {}), places: (categories[catKey]?.places || []).filter((x) => x.place_id !== p.place_id) } };
    await onSave({ ...guide, categories: cats, couplePicks: (guide.couplePicks || []).filter((x) => x.place_id !== p.place_id) });
  };
  const togglePick = async (catKey, p) => { await onSave(withPick(guide, catKey, p.place_id, !p.is_couple_pick)); };

  /* ── Itinerary ── */
  const itinerary = guide.itinerary || { days: 3, schedule: [] };
  const [days, setDays] = useState(itinerary.days || 3);
  const [schedule, setSchedule] = useState(() => buildSchedule(itinerary.days || 3, itinerary.schedule || []));
  const [dirty, setDirty] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activitySheet, setActivitySheet] = useState(null); // { dayIdx, block }
  useEffect(() => { if (!dirty) { setDays(itinerary.days || 3); setSchedule(buildSchedule(itinerary.days || 3, itinerary.schedule || [])); } }, [guide.itinerary]); // eslint-disable-line react-hooks/exhaustive-deps
  const changeDays = (n) => { setDays(n); setSchedule((s) => buildSchedule(n, s)); setDirty(true); };
  const addActivity = (dayIdx, block, act) => { setSchedule((s) => s.map((d, i) => (i === dayIdx ? { ...d, blocks: { ...d.blocks, [block]: [...d.blocks[block], { ...act, id: uid() }] } } : d))); setDirty(true); };
  const removeActivity = (dayIdx, block, id) => { setSchedule((s) => s.map((d, i) => (i === dayIdx ? { ...d, blocks: { ...d.blocks, [block]: d.blocks[block].filter((a) => a.id !== id) } } : d))); setDirty(true); };
  const saveItinerary = async () => { await save({ itinerary: { days, schedule } }); setDirty(false); toast.success('Itinerary saved'); };
  const generate = async () => {
    setGenerating(true);
    const tid = toast.loading('Ava is planning the days');
    try {
      const placesSummary = allSaved.map((p) => ({ place_id: p.place_id, name: p.name, category: p.categoryLabel }));
      const dayContext = days >= 3 ? 'Day 1 = arrival/settling in and exploring the local area. Middle days = deeper exploration, food, activities. Last day = relaxed farewell morning.' : days === 1 ? 'Single day: pack in highlights, a morning coffee spot, afternoon sightseeing, evening dinner.' : 'Two days: Day 1 = arrival and orientation; Day 2 = deeper exploration.';
      const prompt = `You are planning a premium ${days}-day wedding destination itinerary for guests visiting ${destination || 'the wedding destination'}. ${dayContext}\n\nCurated places the couple has saved (use as many as fit naturally):\n${JSON.stringify(placesSummary)}\n\nReturn ONLY valid JSON, no markdown fences, no explanation:\n{\n  "schedule": [\n    {\n      "day": 1,\n      "blocks": {\n        "morning": [\n          {\n            "type": "place",\n            "place_id": "exact_place_id_from_list",\n            "place_name": "Place name",\n            "category": "Category label",\n            "time": "9:00 AM",\n            "duration": "~1.5 hrs",\n            "description": "1-2 vivid sentences: what to do, why it's special, one insider tip."\n          }\n        ],\n        "afternoon": [ ... ],\n        "evening": [ ... ]\n      }\n    }\n  ]\n}\n\nRules:\n- 2-3 activities per time block, flowing logically\n- Mix food, sightseeing, experiences, and downtime\n- For saved places: use type "place" with exact place_id; omit place_id for custom\n- For custom/filler activities: use type "custom", place_name = activity title, no place_id\n- Times must flow (morning before afternoon, etc.)\n- Descriptions must be warm, specific, and helpful, like a well-travelled local friend\n- Durations where natural (e.g. "~2 hrs", "~45 min", "all evening")\n- Do not write a day title or a day summary. The page names each day itself.`;
      const response = await api.llm(prompt);
      const text = typeof response === 'string' ? response : JSON.stringify(response);
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('No JSON');
      const parsed = JSON.parse(m[0]);
      if (!parsed.schedule?.length) throw new Error('Empty');
      const raw = parsed.schedule.slice(0, days).map((d, i) => ({ day: i + 1, title: d.title || `Day ${i + 1}`, summary: d.summary || '', blocks: Object.fromEntries(TIME_BLOCKS.map((b) => [b, (d.blocks?.[b] || []).map((a) => ({ ...a, id: uid() }))])) }));
      // Photos as the studio attaches them: the saved place's own, else the first Places result for the name.
      const enriched = await Promise.all(raw.map(async (day) => ({ ...day, blocks: Object.fromEntries(await Promise.all(TIME_BLOCKS.map(async (b) => [b, await Promise.all(day.blocks[b].map(async (act) => {
        if (act.photo_url) return act;
        const sp = act.type === 'place' && act.place_id ? allSaved.find((p) => p.place_id === act.place_id) : null;
        if (sp?.photo_ref) return { ...act, photo_url: api.places.photo(sp.photo_ref, 800) };
        const name = act.place_name || act.custom_text || '';
        if (!name) return act;
        try { const found = await api.places.search(destination ? { q: name, location: destination } : { q: name }); const ref = found?.[0]?.photo_reference; return ref ? { ...act, photo_url: api.places.photo(ref, 800) } : act; } catch { return act; }
      }))]))) })));
      setSchedule(buildSchedule(days, enriched)); setDirty(true);
      toast.success('Itinerary ready. Review it and save.', { id: tid });
    } catch { toast.error('Ava could not plan that. Try again.', { id: tid }); } finally { setGenerating(false); }
  };

  /* ── Publish ── */
  const [intro, setIntro] = useState(guide.editorialIntro || '');
  const [hero, setHero] = useState(guide.heroPhotoUrl || '');
  const [introBusy, setIntroBusy] = useState(false);
  useEffect(() => { setIntro(guide.editorialIntro || ''); setHero(guide.heroPhotoUrl || ''); }, [guide.editorialIntro, guide.heroPhotoUrl]);
  const generateIntro = async () => {
    setIntroBusy(true);
    try { const r = await api.llm(`Write a 2-3 sentence editorial introduction for a wedding guest guide to ${guide.destination || destination || 'our destination'}. Tone: Vogue travel guide meets Airbnb Experiences. Human, evocative, not robotic.`); if (typeof r === 'string' && r.trim()) { setIntro(r.trim()); await save({ editorialIntro: r.trim() }); } } catch { toast.error('Ava could not write that just now.'); } finally { setIntroBusy(false); }
  };

  const catList = categories[cat]?.places || [];
  const counts = Object.fromEntries(CATEGORIES.map(([k]) => [k, (categories[k]?.places || []).length]));
  const totalPlaces = allSaved.length;

  return (
    <Screen title="Experience guide" subtitle={loading ? '' : `${totalPlaces} place${totalPlaces === 1 ? '' : 's'}, ${(guide.couplePicks || []).length} pick${(guide.couplePicks || []).length === 1 ? '' : 's'}${guide.published ? ', published' : ', not published'}`} back={back} actions={segment === 'places' ? [{ icon: Plus, label: 'Add a place', onClick: () => setAdding(true) }] : segment === 'itinerary' ? [{ icon: Sparkles, label: 'Ask Ava to plan', onClick: generate }] : []}>
      <Segments options={SEGMENTS} value={segment} onChange={setSegment} />
      {segment === 'places' && <FilterPills options={CATEGORIES.map(([key, label]) => ({ key, label, count: counts[key] || undefined }))} value={cat} onChange={setCat} />}
      <div className="oi-m-stack oi-m-stack--24" style={{ paddingTop: segment === 'places' ? 16 : 0 }}>
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={4} /> : segment === 'places' ? (
          catList.length === 0 ? <EmptyState icon={MapPin} text={`Nothing under ${labelOf(cat)} yet. Search for a place, or add one by hand.`} actionLabel="Add a place" onAction={() => setAdding(true)} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {catList.map((p) => (
                <div key={p.place_id} className="oi-m-place">
                  {photoOf(p) && <SmartImage src={photoOf(p)} alt={p.name} width={358} ratio="16/9" />}
                  <div className="oi-m-place__body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                      <div className="oi-m-item__title" style={{ whiteSpace: 'normal' }}>{p.name}</div>
                      {p.is_couple_pick && <StatusPill tone="light">Our pick</StatusPill>}
                    </div>
                    {p.address && <div className="oi-m-meta">{p.address}</div>}
                    {p.rating && <div className="oi-m-meta">{p.rating} stars on Google</div>}
                    {p.note && <p className="oi-m-body" style={{ marginTop: 4 }}>{p.note}</p>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      <PillButton variant={p.is_couple_pick ? 'primary' : 'secondary'} size="sm" icon={Heart} onClick={() => togglePick(cat, p)}>{p.is_couple_pick ? 'Our pick' : 'Make it our pick'}</PillButton>
                      {p.maps_url && <PillButton variant="secondary" size="sm" icon={MapPin} onClick={() => openExternal(p.maps_url)}>Maps</PillButton>}
                      {p.website_url && <PillButton variant="secondary" size="sm" icon={Globe} onClick={() => openExternal(p.website_url)}>Website</PillButton>}
                      <PillButton variant="ghost" size="sm" icon={Trash2} onClick={() => removePlace(cat, p)}>Remove</PillButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : segment === 'itinerary' ? (
          <>
            <PillChoice label="How long are guests staying" options={ITINERARY_LENGTHS.map((n) => ({ value: String(n), label: `${n} ${n === 1 ? 'day' : 'days'}` }))} value={String(days)} onChange={(v) => v && changeDays(Number(v))} />
            {allSaved.length === 0 && <p className="oi-m-meta">Add places first and Ava uses them to build a personal itinerary.</p>}
            {schedule.map((day, dayIdx) => (
              <section key={day.day}>
                <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Day {day.day}{day.title && day.title !== `Day ${day.day}` ? `, ${day.title}` : ''}</h2>
                {day.summary && <p className="oi-m-meta" style={{ marginBottom: 12 }}>{day.summary}</p>}
                <div className="oi-m-card oi-m-card--flush">
                  {TIME_BLOCKS.map((block) => (
                    <div key={block} style={{ padding: '12px 16px', borderTop: block === 'morning' ? 0 : '1px solid var(--m-line)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <div className="oi-m-meta oi-m-strong" style={{ color: 'var(--m-text)' }}>{block.charAt(0).toUpperCase() + block.slice(1)}</div>
                        <button type="button" className="oi-m-block__link" style={{ margin: 0, minHeight: 44, minWidth: 44, justifyContent: "center" }} onClick={() => setActivitySheet({ dayIdx, block })}>Add</button>
                      </div>
                      {day.blocks[block].length === 0 ? <div className="oi-m-meta">Nothing yet</div> : day.blocks[block].map((a) => (
                        <div key={a.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 0' }}>
                          {a.photo_url && <SmartImage src={a.photo_url} alt="" width={48} height={48} style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="oi-m-body oi-m-strong">{a.place_name || a.custom_text || 'Activity'}</div>
                            <div className="oi-m-meta">{[a.time, a.duration, a.category].filter(Boolean).join(', ')}</div>
                            {(a.description || a.note) && <div className="oi-m-meta" style={{ color: 'var(--m-text)', whiteSpace: 'normal' }}>{a.description || a.note}</div>}
                          </div>
                          <button type="button" className="oi-m-iconbtn oi-m-iconbtn--ghost" aria-label="Remove activity" onClick={() => removeActivity(dayIdx, block, a.id)}><X size={18} strokeWidth={1.75} /></button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <PillButton variant="secondary" icon={Sparkles} onClick={generate} disabled={generating}>{generating ? 'Planning' : 'Ask Ava to plan'}</PillButton>
              <PillButton variant="primary" style={{ flex: 1 }} onClick={saveItinerary} disabled={!dirty}>{dirty ? 'Save itinerary' : 'Saved'}</PillButton>
            </div>
          </>
        ) : (
          <>
            <div className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="oi-m-row" style={{ padding: 0, background: 'transparent' }}><div className="oi-m-row__body"><div className="oi-m-row__label">Published</div><div className="oi-m-row__sub">Guests see the guide on your guest suite</div></div><Switch on={!!guide.published} onChange={(v) => save({ published: v })} label="Published" /></div>
            </div>
            <div className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <TextField label="Hero photo link" type="url" inputMode="url" autoCapitalize="off" value={hero} onChange={(e) => setHero(e.target.value)} onBlur={() => hero !== (guide.heroPhotoUrl || '') && save({ heroPhotoUrl: hero })} placeholder="https://" />
              {hero && <SmartImage src={hero} alt="Hero" width={318} ratio="16/9" />}
              <TextAreaField label="Editorial intro" value={intro} onChange={(e) => setIntro(e.target.value)} onBlur={() => intro !== (guide.editorialIntro || '') && save({ editorialIntro: intro })} rows={4} placeholder="Write an inspiring introduction to your wedding destination" />
              <PillButton variant="secondary" size="sm" icon={Sparkles} onClick={generateIntro} disabled={introBusy} style={{ alignSelf: 'flex-start' }}>{introBusy ? 'Ava is writing' : 'Ask Ava to write it'}</PillButton>
            </div>
            <div className="oi-m-card"><PillChoice label="Destination vibes" options={VIBE_OPTIONS} value={guide.vibes || []} onChange={(v) => save({ vibes: v })} multi /></div>
            <PanelCard tone="neutral" label="Destination" body={destination || 'Set your venue in Event details and the guide knows where it is.'} />
          </>
        )}
      </div>

      {adding && <AddPlaceSheet cat={cat} destination={destination} onClose={() => setAdding(false)} onAdd={async (place, note, isPick, catKey) => { await addPlace(place, note, isPick, catKey); setAdding(false); }} />}
      {activitySheet && <ActivitySheet allSaved={allSaved} onClose={() => setActivitySheet(null)} onAdd={(act) => { addActivity(activitySheet.dayIdx, activitySheet.block, act); setActivitySheet(null); }} />}
      {confirmEl}
    </Screen>
  );
}

function AddPlaceSheet({ cat, destination, onClose, onAdd }) {
  const [place, setPlace] = useState(null);
  const [note, setNote] = useState('');
  const [pick, setPick] = useState(false);
  const [catKey, setCatKey] = useState(cat);
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <BottomSheet open onClose={onClose} title="Add a place" full footer={(
      <>
        <PillButton variant="secondary" onClick={onClose} disabled={busy}>Cancel</PillButton>
        <PillButton variant="primary" icon={Plus} style={{ flex: 1 }} disabled={!place?.name || busy} onClick={async () => { setBusy(true); try { await onAdd({ ...place, website_url: website.trim() || null }, note.trim(), pick, catKey); } finally { setBusy(false); } }}>{busy ? 'Adding' : `Add to ${labelOf(catKey)}`}</PillButton>
      </>
    )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SelectField label="Category" value={catKey} onChange={(e) => setCatKey(e.target.value)} options={CATEGORIES.map(([value, label]) => ({ value, label }))} />
        <PlaceField label="Place" value={place} onChange={setPlace} locationBias={destination} placeholder="Rooftop bar, ramen, a walk" manualFields={<TextField label="Website" type="url" inputMode="url" autoCapitalize="off" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />} />
        <TextField label="Your tip for guests" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Go early, order the ramen" />
        <div className="oi-m-row" style={{ padding: '8px 4px', background: 'transparent' }}><div className="oi-m-row__body"><div className="oi-m-row__label">Our pick</div><div className="oi-m-row__sub">Shown first, with your name on it</div></div><Switch on={pick} onChange={setPick} label="Our pick" /></div>
      </div>
    </BottomSheet>
  );
}

/** AddActivityInline: a saved place by category, or a custom activity, with an optional tip. */
function ActivitySheet({ allSaved, onClose, onAdd }) {
  const api = useApi();
  const [mode, setMode] = useState(allSaved.length ? 'place' : 'custom');
  const [placeId, setPlaceId] = useState('');
  const [custom, setCustom] = useState('');
  const [note, setNote] = useState('');
  const add = () => {
    if (mode === 'place') { const p = allSaved.find((x) => x.place_id === placeId); if (!p) return; onAdd({ type: 'place', place_id: p.place_id, place_name: p.name, category: p.categoryLabel, note, maps_url: p.maps_url || null, website_url: p.website_url || p.website || null, photo_url: p.photo_ref ? api.places.photo(p.photo_ref, 800) : (p.photo_url || null) }); }
    else { if (!custom.trim()) return; onAdd({ type: 'custom', place_name: custom.trim(), note }); }
  };
  return (
    <BottomSheet open onClose={onClose} title="Add an activity" footer={(
      <>
        <PillButton variant="secondary" onClick={onClose}>Cancel</PillButton>
        <PillButton variant="primary" style={{ flex: 1 }} onClick={add} disabled={mode === 'place' ? !placeId : !custom.trim()}>Add</PillButton>
      </>
    )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <PillChoice options={[{ value: 'place', label: 'A saved place' }, { value: 'custom', label: 'Something else' }]} value={mode} onChange={(v) => v && setMode(v)} />
        {mode === 'place' ? (
          allSaved.length === 0 ? <p className="oi-m-meta">No saved places yet. Add some under Places first.</p> : (
            <RowGroup>{allSaved.map((p) => <Row key={p.place_id} label={p.name} sub={p.categoryLabel} tile={placeId === p.place_id ? 'primary' : 'neutral'} icon={MapPin} onClick={() => setPlaceId(p.place_id)} chevron={false} trailing={placeId === p.place_id ? <StatusPill tone="ok">Chosen</StatusPill> : undefined} />)}</RowGroup>
          )
        ) : <TextField label="Activity" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Check in to the hotel, welcome barbecue at the venue" />}
        <TextField label="A tip for guests" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
      </div>
    </BottomSheet>
  );
}
