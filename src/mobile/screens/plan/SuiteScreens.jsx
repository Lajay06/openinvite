import React, { useState } from 'react';
import { HelpCircle, Plus, Sparkles, MapPin, Hotel, Car, ScrollText, Clock, UserCheck, ShoppingBag, Search, Monitor, ExternalLink, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import Screen from '../../shell/Screen';
import { Row, RowGroup, EmptyState, ErrorState, SkeletonRows, Switch, PanelCard, PillButton, TextField, SelectField, StatusPill, BottomSheet, ItemCard, ItemList, StatCard } from '../../ui';
import FormSheet from '../../features/FormSheet';
import { timeLabel, dateShort, initials } from '../../lib/format';
import { openExternal } from '../../native';
import { CATEGORY_LABEL } from '@/lib/scheduleEvents';

/* ── Q&A: WeddingDetails.qna, [{ question, answer }] ─────────────────── */
const QNA_FIELDS = [{ name: 'question', label: 'Question', type: 'text' }, { name: 'answer', label: 'Answer', type: 'textarea' }];

export function QnaScreen({ qna = [], onSave, onSuggest, loading, error, onRetry, back }) {
  const [sheet, setSheet] = useState(null); // index or -1
  const [ideas, setIdeas] = useState(null); // null | 'loading' | [{question, answer}]
  const ask = async () => {
    setIdeas('loading');
    try { const list = await onSuggest(); setIdeas(list); if (!list.length) toast('Ava had nothing to add. Your list covers it.'); }
    catch { setIdeas(null); toast.error('Ava could not answer just now. Try again.'); }
  };
  const addIdea = async (idea) => { await onSave([...qna, { id: Date.now(), question: idea.question, answer: idea.answer || '' }]); setIdeas((l) => (Array.isArray(l) ? l.filter((x) => x !== idea) : l)); };
  return (
    <Screen title="Q&A" subtitle={loading ? '' : `${qna.length} question${qna.length === 1 ? '' : 's'} on your guest suite`} back={back} actions={[{ icon: Plus, label: 'Add question', onClick: () => setSheet(-1) }]}>
      <div className="oi-m-stack">
        {!loading && !error && onSuggest && (
          <PanelCard tone="ink" label="Ava" body="What will your guests ask that you have not answered yet?">
            <PillButton variant="light" size="sm" icon={Sparkles} onClick={ask} disabled={ideas === 'loading'} style={{ alignSelf: 'flex-start', marginTop: 8 }}>{ideas === 'loading' ? 'Thinking' : 'Suggest questions'}</PillButton>
          </PanelCard>
        )}
        {Array.isArray(ideas) && ideas.length > 0 && (
          <section>
            <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Ava suggests</h2>
            <RowGroup>
              {ideas.map((idea, i) => (
                <div key={i} className="oi-m-row" style={{ minHeight: 68 }}>
                  <div className="oi-m-row__body"><div className="oi-m-row__label oi-m-row__label--wrap">{idea.question}</div><div className="oi-m-row__sub" style={{ whiteSpace: 'normal' }}>{idea.answer}</div></div>
                  <PillButton variant="secondary" size="sm" icon={Plus} onClick={() => addIdea(idea)}>Add</PillButton>
                </div>
              ))}
            </RowGroup>
          </section>
        )}
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={4} /> : qna.length === 0 ? (
          <EmptyState icon={HelpCircle} text="No questions yet. Dress code, parking and timing are the ones guests always ask." actionLabel="Add a question" onAction={() => setSheet(-1)} />
        ) : (
          <RowGroup>
            {qna.map((q, i) => <Row key={i} icon={HelpCircle} tile="neutral" label={q.question} sub={q.answer || 'No answer yet'} wrap onClick={() => setSheet(i)} />)}
          </RowGroup>
        )}
      </div>
      {sheet != null && (
        <FormSheet open title={sheet < 0 ? 'Add question' : 'Edit question'} fields={QNA_FIELDS} initial={sheet < 0 ? null : qna[sheet]} required={['question']} onClose={() => setSheet(null)}
          onSave={async (v) => { const next = [...qna]; if (sheet < 0) next.push({ id: Date.now(), ...v }); else next[sheet] = { ...next[sheet], ...v }; await onSave(next); }}
          onDelete={sheet < 0 ? undefined : async () => { await onSave(qna.filter((_, i) => i !== sheet)); setSheet(null); }} />
      )}
    </Screen>
  );
}

/* ── Places lists: guestSuiteAccommodation.places, guestSuiteTransport.places, experienceGuide.couplePicks ── */
const PLACE_FIELDS = [{ name: 'name', label: 'Name', type: 'text' }, { name: 'address', label: 'Address', type: 'text' }, { name: 'note', label: 'A note for guests', type: 'textarea' }, { name: 'url', label: 'Website', type: 'url' }];

export function PlacesScreen({ title, icon: Icon = MapPin, places = [], onSave, loading, error, onRetry, back, intro, onDesktop }) {
  const [sheet, setSheet] = useState(null);
  return (
    <Screen title={title} subtitle={loading ? '' : `${places.length} place${places.length === 1 ? '' : 's'} on your guest suite`} back={back} actions={[{ icon: Plus, label: 'Add place', onClick: () => setSheet(-1) }]}>
      <div className="oi-m-stack oi-m-stack--24">
        {intro && <PanelCard tone="neutral" body={intro} action={onDesktop ? 'Search nearby on desktop' : undefined} onClick={onDesktop} />}
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={4} /> : places.length === 0 ? (
          <EmptyState icon={Icon} text="Nothing added yet. Add a place by hand here, or search nearby on desktop." actionLabel="Add a place" onAction={() => setSheet(-1)} />
        ) : (
          <ItemList>
            {places.map((p, i) => <ItemCard key={p.place_id || p.id || i} icon={Icon} tile="neutral" title={p.name} meta={p.note || p.address} value={p.address && p.note ? p.address : undefined} badge={p.is_couple_pick ? 'Our pick' : undefined} badgeTone="ok" onClick={() => setSheet(i)} action={p.url ? { icon: ExternalLink, label: `Open ${p.name}`, onClick: () => openExternal(p.url) } : undefined} />)}
          </ItemList>
        )}
      </div>
      {sheet != null && (
        <FormSheet open title={sheet < 0 ? 'Add place' : 'Edit place'} fields={PLACE_FIELDS} initial={sheet < 0 ? null : places[sheet]} required={['name']} onClose={() => setSheet(null)}
          onSave={async (v) => { const next = [...places]; if (sheet < 0) next.push({ ...v, id: `m-${Date.now()}` }); else next[sheet] = { ...next[sheet], ...v }; await onSave(next); }}
          onDelete={sheet < 0 ? undefined : async () => { await onSave(places.filter((_, i) => i !== sheet)); setSheet(null); }} />
      )}
    </Screen>
  );
}

/* ── Guest suite schedule: the same Schedule records, as guests see them ── */
export function SuiteScheduleScreen({ items = [], loading, error, onRetry, back, onEdit }) {
  const dayOf = (it) => String(it.event_date || '').slice(0, 10);
  const days = [...new Set(items.map(dayOf))].sort();
  return (
    <Screen title="Schedule" subtitle="As guests see it on your guest suite" back={back}>
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={5} /> : items.length === 0 ? (
          <EmptyState icon={Clock} text="Nothing on the schedule yet." actionLabel="Add events" onAction={onEdit} />
        ) : (
          days.map((d) => (
            <section key={d || 'none'}>
              <h2 className="oi-m-section" style={{ marginBottom: 12 }}>{d ? dateShort(d) : 'No date'}</h2>
              <ItemList>
                {items.filter((it) => dayOf(it) === d).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')).map((it) => (
                  <ItemCard key={it.id} icon={Clock} tile="neutral" title={it.event_name} meta={[it.description, it.location].filter(Boolean).join(', ')} value={timeLabel(it.start_time)} badge={CATEGORY_LABEL[it.category] || it.category || undefined} badgeTone="neutral" />
                ))}
              </ItemList>
            </section>
          ))
        )}
        {items.length > 0 && <PillButton variant="secondary" block onClick={onEdit}>Edit the schedule</PillButton>}
      </div>
    </Screen>
  );
}

/* ── Wedding party: WeddingDetails.weddingParty, key roles plus { roleKey: [{ name, guestId, phone, notes }] } ── */
export const PARTY_ROLES = [
  { key: 'bridesmaids', label: 'Bridesmaids', singular: 'Bridesmaid' },
  { key: 'groomsmen', label: 'Groomsmen', singular: 'Groomsman' },
  { key: 'flowerGirls', label: 'Flower girls', singular: 'Flower girl' },
  { key: 'ringBearers', label: 'Ring bearers', singular: 'Ring bearer' },
  { key: 'readers', label: 'Readers', singular: 'Reader' },
  { key: 'ushers', label: 'Ushers', singular: 'Usher' },
  { key: 'other', label: 'Other roles', singular: 'Member' },
];
/** WeddingParty.jsx's MemberRow: a guest picked from the list or a typed name, phone, notes. */
const MEMBER_FIELDS = [{ name: 'who', label: 'Who', type: 'guest' }, { name: 'phone', label: 'Phone', type: 'tel' }, { name: 'notes', label: 'Notes', type: 'textarea' }];
const KEY_ROLES = [{ key: 'maidOfHonour', label: 'Maid of honor or best person' }, { key: 'bestMan', label: 'Best man or best person' }];
const asPick = (v) => (typeof v === 'string' ? (v ? { name: v, guestId: null } : null) : v && (v.name || v.guestId) ? { name: v.name || '', guestId: v.guestId || null } : null);

export function WeddingPartyScreen({ party = {}, onSave, loading, error, onRetry, back }) {
  const [sheet, setSheet] = useState(null); // { role, index }
  const [keyRole, setKeyRole] = useState(null); // key
  const [notes, setNotes] = useState(party.keyRoleNotes || '');
  const [general, setGeneral] = useState(party.notes || ''); // WeddingParty.jsx's Notes tab (weddingParty.notes)
  const notesTimer = React.useRef(null);
  React.useEffect(() => { setNotes(party.keyRoleNotes || ''); }, [party.keyRoleNotes]);
  React.useEffect(() => { setGeneral(party.notes || ''); }, [party.notes]);
  React.useEffect(() => () => clearTimeout(notesTimer.current), []);
  const total = PARTY_ROLES.reduce((s, r) => s + (party[r.key] || []).length, 0) + (party.maidOfHonour ? 1 : 0) + (party.bestMan ? 1 : 0);
  const bridesmaids = (party.bridesmaids || []).length;
  const groomsmen = (party.groomsmen || []).length;
  const [pick, setPick] = useState(false);
  const queueNotes = (v) => { setNotes(v); clearTimeout(notesTimer.current); notesTimer.current = setTimeout(() => onSave({ ...party, keyRoleNotes: v }, { quiet: true }), 900); };
  const queueGeneral = (v) => { setGeneral(v); clearTimeout(notesTimer.current); notesTimer.current = setTimeout(() => onSave({ ...party, notes: v }, { quiet: true }), 900); };
  return (
    <Screen title="Wedding party" subtitle={loading ? '' : total ? `${total} people` : ''} back={back} actions={[{ icon: Plus, label: 'Add someone', onClick: () => setPick(true) }]}>
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={5} /> : (
          <>
            <div className="oi-m-grid2">
              <StatCard icon={UserCheck} label="In the party" numeric={total} />
              <StatCard icon={UserCheck} label="Bridesmaids" numeric={bridesmaids} sub={`${groomsmen} groomsm${groomsmen === 1 ? 'an' : 'en'}`} ink />
            </div>
            <section>
              <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Key roles</h2>
              <RowGroup>
                {KEY_ROLES.map((k) => { const v = asPick(party[k.key]); return <Row key={k.key} initials={v ? initials(v.name) : undefined} icon={v ? undefined : UserCheck} tile="tint" label={v?.name || 'Not chosen yet'} sub={k.label} onClick={() => setKeyRole(k.key)} />; })}
              </RowGroup>
              <div className="oi-m-card" style={{ marginTop: 12 }}>
                <label className="oi-m-field__label" htmlFor="key-role-notes">Key role notes</label>
                <textarea id="key-role-notes" className="oi-m-input" rows={3} value={notes} onChange={(e) => queueNotes(e.target.value)} placeholder="Who has the rings, who is holding the speeches" />
              </div>
            </section>
            {total === 0 ? (
              <EmptyState icon={UserCheck} text="Nobody in the party yet. Start with the people standing beside you." actionLabel="Add someone" onAction={() => setPick(true)} />
            ) : (
              PARTY_ROLES.filter((r) => (party[r.key] || []).length).map((r) => (
                <section key={r.key}>
                  <h2 className="oi-m-section" style={{ marginBottom: 12 }}>{r.label}</h2>
                  <ItemList>
                    {(party[r.key] || []).map((m, i) => <ItemCard key={i} initials={initials(m.name || '?')} tile="tint" title={m.name || 'Unnamed'} meta={[m.guestId ? 'On the guest list' : '', m.notes].filter(Boolean).join(', ') || r.singular} value={m.phone || ''} onClick={() => setSheet({ role: r.key, index: i })} action={m.phone ? { icon: Phone, label: `Call ${m.name}`, onClick: () => openExternal(`tel:${m.phone}`) } : undefined} />)}
                  </ItemList>
                </section>
              ))
            )}
            <section>
              <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Notes</h2>
              <div className="oi-m-card">
                <label className="oi-m-field__label" htmlFor="party-notes">Additional notes</label>
                <textarea id="party-notes" className="oi-m-input" rows={4} value={general} onChange={(e) => queueGeneral(e.target.value)} placeholder="Attire details, group photos, rehearsal dinner notes" />
              </div>
            </section>
          </>
        )}
      </div>
      <BottomSheet open={pick} onClose={() => setPick(false)} title="Which role">
        <RowGroup>
          {PARTY_ROLES.map((r) => <Row key={r.key} label={r.label} onClick={() => { setPick(false); setSheet({ role: r.key, index: -1 }); }} />)}
        </RowGroup>
      </BottomSheet>
      {sheet && (
        <FormSheet open title={sheet.index < 0 ? `Add ${PARTY_ROLES.find((r) => r.key === sheet.role)?.singular.toLowerCase()}` : 'Edit'} fields={MEMBER_FIELDS} initial={sheet.index < 0 ? null : (() => { const m = (party[sheet.role] || [])[sheet.index]; return { ...m, who: asPick(m) }; })()} required={['who']} onClose={() => setSheet(null)}
          onSave={async (v) => { const list = [...(party[sheet.role] || [])]; const entry = { name: v.who?.name || '', guestId: v.who?.guestId || null, phone: v.phone || '', notes: v.notes || '' }; if (sheet.index < 0) list.push(entry); else list[sheet.index] = { ...list[sheet.index], ...entry }; await onSave({ ...party, [sheet.role]: list }); }}
          onDelete={sheet.index < 0 ? undefined : async () => { await onSave({ ...party, [sheet.role]: (party[sheet.role] || []).filter((_, i) => i !== sheet.index) }); setSheet(null); }} />
      )}
      {keyRole && (
        <FormSheet open title={KEY_ROLES.find((k) => k.key === keyRole)?.label} fields={[{ name: 'who', label: 'Who', type: 'guest' }]} initial={{ who: asPick(party[keyRole]) }} onClose={() => setKeyRole(null)}
          onSave={async (v) => { await onSave({ ...party, [keyRole]: v.who ? { name: v.who.name, guestId: v.who.guestId || null } : null }); }}
          onDelete={asPick(party[keyRole]) ? async () => { await onSave({ ...party, [keyRole]: null }); setKeyRole(null); } : undefined} deleteLabel="Clear" />
      )}
    </Screen>
  );
}

/* ── Marketplace: /api/places-search, save through saveVendorFromPlaces ── */
const CATEGORY_OPTIONS = [['photography', 'Photography'], ['videography', 'Videography'], ['catering', 'Catering'], ['florals', 'Florals'], ['styling', 'Styling'], ['beauty', 'Hair & makeup'], ['music', 'Music & DJ'], ['venue', 'Venues'], ['cake', 'Cakes'], ['transport', 'Transport']].map(([value, label]) => ({ value, label }));

export function MarketplaceScreen({ results = [], searching, onSearch, onSave, savedIds = new Set(), back, error }) {
  const [category, setCategory] = useState('photography');
  const [location, setLocation] = useState('');
  return (
    <Screen title="Marketplace" subtitle="Real vendors near your venue" back={back}>
      <div className="oi-m-stack oi-m-stack--24">
        <div className="oi-m-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SelectField label="Looking for" value={category} onChange={(e) => setCategory(e.target.value)} options={CATEGORY_OPTIONS} />
          <TextField label="Near" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, region or postcode" />
          <PillButton variant="primary" icon={Search} onClick={() => onSearch({ category, location })} disabled={searching || !location.trim()}>{searching ? 'Searching' : 'Search'}</PillButton>
        </div>
        {error ? <ErrorState text={error} /> : results.length === 0 ? (
          <EmptyState icon={ShoppingBag} text="Choose what you need and where, and we will look nearby." />
        ) : (
          <ItemList>
            {results.map((v) => (
              <ItemCard key={v.place_id || v.id} icon={ShoppingBag} tile="neutral" title={v.name} meta={v.address || v.formatted_address || ''} value={v.rating ? `${v.rating} stars` : ''} badge={savedIds.has(v.place_id) ? 'Added' : undefined} badgeTone="ok" onClick={v.website ? () => openExternal(v.website) : undefined} action={savedIds.has(v.place_id) ? undefined : { icon: Plus, label: `Add ${v.name} to my vendors`, tone: 'primary', onClick: () => onSave(v) }} />
            ))}
          </ItemList>
        )}
      </div>
    </Screen>
  );
}

/* ── Desktop hand-off (invitations, send invites, considerations) ── */
export function DesktopFeatureScreen({ title, body, image, onDesktop, back, stat }) {
  return (
    <Screen title={title} back={back}>
      <div className="oi-m-stack oi-m-stack--24">
        <PanelCard tone="ink" label={stat} title="Best on a bigger screen" body={body} action="Open on desktop" onClick={onDesktop} />
        <div className="oi-m-meta" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Monitor size={16} /> Everything you change on desktop shows up here.</div>
      </div>
    </Screen>
  );
}

export { Hotel, Car, ScrollText };
