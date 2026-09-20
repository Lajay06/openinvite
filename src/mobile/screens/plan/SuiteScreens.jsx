import React, { useState } from 'react';
import { HelpCircle, Plus, MapPin, Hotel, Car, ScrollText, Clock, UserCheck, ShoppingBag, Search, Monitor } from 'lucide-react';
import Screen from '../../shell/Screen';
import { Row, RowGroup, EmptyState, ErrorState, SkeletonRows, Switch, PanelCard, PillButton, TextField, SelectField, StatusPill, BottomSheet } from '../../ui';
import FormSheet from '../../features/FormSheet';
import { timeLabel, dateShort, initials } from '../../lib/format';
import { openExternal } from '../../native';

/* ── Q&A: WeddingDetails.qna, [{ question, answer }] ─────────────────── */
const QNA_FIELDS = [{ name: 'question', label: 'Question', type: 'text' }, { name: 'answer', label: 'Answer', type: 'textarea' }];

export function QnaScreen({ qna = [], onSave, loading, error, onRetry, back }) {
  const [sheet, setSheet] = useState(null); // index or -1
  return (
    <Screen title="Q&A" subtitle={loading ? '' : `${qna.length} question${qna.length === 1 ? '' : 's'} on your site`} back={back} actions={[{ icon: Plus, label: 'Add question', onClick: () => setSheet(-1) }]}>
      <div className="oi-m-stack">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={4} /> : qna.length === 0 ? (
          <EmptyState icon={HelpCircle} text="No questions yet. Dress code, parking and timing are the ones guests always ask." actionLabel="Add a question" onAction={() => setSheet(-1)} />
        ) : (
          <RowGroup>
            {qna.map((q, i) => <Row key={i} icon={HelpCircle} tile="sand" label={q.question} sub={q.answer || 'No answer yet'} wrap onClick={() => setSheet(i)} />)}
          </RowGroup>
        )}
      </div>
      {sheet != null && (
        <FormSheet open title={sheet < 0 ? 'Add question' : 'Edit question'} fields={QNA_FIELDS} initial={sheet < 0 ? null : qna[sheet]} required={['question']} onClose={() => setSheet(null)}
          onSave={async (v) => { const next = [...qna]; if (sheet < 0) next.push(v); else next[sheet] = { ...next[sheet], ...v }; await onSave(next); }}
          onDelete={sheet < 0 ? undefined : async () => { await onSave(qna.filter((_, i) => i !== sheet)); setSheet(null); }} />
      )}
    </Screen>
  );
}

/* ── Good to know: WeddingDetails.weddingPolicies, one toggle + note per key ── */
const POLICY_KEYS = [
  { key: 'photography', label: 'Photography', sub: 'An unplugged ceremony, or snap away' },
  { key: 'socialMedia', label: 'Social media', sub: 'Whether to post on the day' },
  { key: 'children', label: 'Children', sub: 'Little ones welcome, or a night off' },
  { key: 'dietary', label: 'Dietary', sub: 'How guests tell you what they need' },
  { key: 'gifts', label: 'Gifts', sub: 'Registry, cash, or your presence is enough' },
  { key: 'dressCode', label: 'Dress code', sub: 'What to wear' },
  { key: 'lateArrival', label: 'Late arrival', sub: 'What happens if someone is running late' },
];

export function GoodToKnowScreen({ policies = {}, onSave, loading, error, onRetry, back }) {
  const [edit, setEdit] = useState(null); // key
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const toggle = async (key, on) => { await onSave({ ...policies, [key]: { ...(policies[key] || {}), enabled: on } }); };
  const saveNote = async () => { setSaving(true); try { await onSave({ ...policies, [edit]: { ...(policies[edit] || {}), message: note } }); setEdit(null); } finally { setSaving(false); } };
  return (
    <Screen title="Good to know" subtitle="What guests see before the day" back={back}>
      <div className="oi-m-stack">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={6} /> : (
          <RowGroup>
            {POLICY_KEYS.map((p) => {
              const v = policies[p.key] || {};
              return (
                <div key={p.key} className="oi-m-row" style={{ minHeight: 68 }}>
                  <button type="button" className="oi-m-row__body" style={{ textAlign: 'left' }} onClick={() => { setEdit(p.key); setNote(v.message || ''); }}>
                    <div className="oi-m-row__label">{p.label}</div>
                    <div className="oi-m-row__sub">{v.message || p.sub}</div>
                  </button>
                  <Switch on={!!v.enabled} onChange={(on) => toggle(p.key, on)} label={p.label} />
                </div>
              );
            })}
          </RowGroup>
        )}
        <p className="oi-m-meta">Tap a row to write the note guests read. The switch shows or hides it on your site.</p>
      </div>
      <BottomSheet open={!!edit} onClose={() => setEdit(null)} title={POLICY_KEYS.find((p) => p.key === edit)?.label || ''} footer={(
        <>
          <PillButton variant="secondary" onClick={() => setEdit(null)} disabled={saving}>Cancel</PillButton>
          <PillButton variant="primary" onClick={saveNote} disabled={saving} style={{ flex: 1 }}>{saving ? 'Saving' : 'Save'}</PillButton>
        </>
      )}>
        <TextField label="What guests read" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Keep it short and kind" />
      </BottomSheet>
    </Screen>
  );
}

/* ── Places lists: guestSuiteAccommodation.places, guestSuiteTransport.places, experienceGuide.couplePicks ── */
const PLACE_FIELDS = [{ name: 'name', label: 'Name', type: 'text' }, { name: 'address', label: 'Address', type: 'text' }, { name: 'note', label: 'A note for guests', type: 'textarea' }, { name: 'url', label: 'Website', type: 'url' }];

export function PlacesScreen({ title, icon: Icon = MapPin, places = [], onSave, loading, error, onRetry, back, intro, onDesktop }) {
  const [sheet, setSheet] = useState(null);
  return (
    <Screen title={title} subtitle={loading ? '' : `${places.length} place${places.length === 1 ? '' : 's'} on your site`} back={back} actions={[{ icon: Plus, label: 'Add place', onClick: () => setSheet(-1) }]}>
      <div className="oi-m-stack oi-m-stack--24">
        {intro && <PanelCard tone="sand" body={intro} action={onDesktop ? 'Search nearby on desktop' : undefined} onClick={onDesktop} />}
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={4} /> : places.length === 0 ? (
          <EmptyState icon={Icon} text="Nothing added yet. Add a place by hand here, or search nearby on desktop." actionLabel="Add a place" onAction={() => setSheet(-1)} />
        ) : (
          <RowGroup>
            {places.map((p, i) => <Row key={p.place_id || p.id || i} icon={Icon} tile="sand" label={p.name} sub={p.note || p.address} onClick={() => setSheet(i)} trailing={p.is_couple_pick ? <StatusPill tone="ok">Our pick</StatusPill> : undefined} />)}
          </RowGroup>
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
    <Screen title="Schedule" subtitle="As guests see it on your site" back={back}>
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={5} /> : items.length === 0 ? (
          <EmptyState icon={Clock} text="Nothing on the schedule yet." actionLabel="Add events" onAction={onEdit} />
        ) : (
          days.map((d) => (
            <section key={d || 'none'}>
              <h2 className="oi-m-section" style={{ marginBottom: 12 }}>{d ? dateShort(d) : 'No date'}</h2>
              <RowGroup>
                {items.filter((it) => dayOf(it) === d).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')).map((it) => (
                  <div key={it.id} className="oi-m-row">
                    <span className="oi-m-meta oi-m-strong" style={{ width: 72, flexShrink: 0 }}>{timeLabel(it.start_time)}</span>
                    <div className="oi-m-row__body"><div className="oi-m-row__label">{it.event_name}</div>{it.location && <div className="oi-m-row__sub">{it.location}</div>}</div>
                  </div>
                ))}
              </RowGroup>
            </section>
          ))
        )}
        {items.length > 0 && <PillButton variant="secondary" block onClick={onEdit}>Edit the schedule</PillButton>}
      </div>
    </Screen>
  );
}

/* ── Wedding party: WeddingDetails.weddingParty, { roleKey: [{ name, guestId, phone, notes }] } ── */
export const PARTY_ROLES = [
  { key: 'bridesmaids', label: 'Bridesmaids', singular: 'Bridesmaid' },
  { key: 'groomsmen', label: 'Groomsmen', singular: 'Groomsman' },
  { key: 'flowerGirls', label: 'Flower girls', singular: 'Flower girl' },
  { key: 'ringBearers', label: 'Ring bearers', singular: 'Ring bearer' },
  { key: 'readers', label: 'Readers', singular: 'Reader' },
  { key: 'ushers', label: 'Ushers', singular: 'Usher' },
  { key: 'other', label: 'Other roles', singular: 'Member' },
];
const MEMBER_FIELDS = [{ name: 'name', label: 'Name', type: 'text' }, { name: 'phone', label: 'Phone', type: 'tel' }, { name: 'notes', label: 'Notes', type: 'textarea' }];

export function WeddingPartyScreen({ party = {}, onSave, loading, error, onRetry, back }) {
  const [sheet, setSheet] = useState(null); // { role, index }
  const total = PARTY_ROLES.reduce((s, r) => s + (party[r.key] || []).length, 0);
  const [pick, setPick] = useState(false);
  return (
    <Screen title="Wedding party" subtitle={loading ? '' : total ? `${total} people` : ''} back={back} actions={[{ icon: Plus, label: 'Add someone', onClick: () => setPick(true) }]}>
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={5} /> : total === 0 ? (
          <EmptyState icon={UserCheck} text="Nobody in the party yet. Start with the people standing beside you." actionLabel="Add someone" onAction={() => setPick(true)} />
        ) : (
          PARTY_ROLES.filter((r) => (party[r.key] || []).length).map((r) => (
            <section key={r.key}>
              <h2 className="oi-m-section" style={{ marginBottom: 12 }}>{r.label}</h2>
              <RowGroup>
                {(party[r.key] || []).map((m, i) => <Row key={i} initials={initials(m.name || '?')} label={m.name || 'Unnamed'} sub={[m.phone, m.notes].filter(Boolean).join(' · ')} onClick={() => setSheet({ role: r.key, index: i })} />)}
              </RowGroup>
            </section>
          ))
        )}
      </div>
      <BottomSheet open={pick} onClose={() => setPick(false)} title="Which role">
        <RowGroup>
          {PARTY_ROLES.map((r) => <Row key={r.key} label={r.label} onClick={() => { setPick(false); setSheet({ role: r.key, index: -1 }); }} />)}
        </RowGroup>
      </BottomSheet>
      {sheet && (
        <FormSheet open title={sheet.index < 0 ? `Add ${PARTY_ROLES.find((r) => r.key === sheet.role)?.singular.toLowerCase()}` : 'Edit'} fields={MEMBER_FIELDS} initial={sheet.index < 0 ? null : (party[sheet.role] || [])[sheet.index]} required={['name']} onClose={() => setSheet(null)}
          onSave={async (v) => { const list = [...(party[sheet.role] || [])]; if (sheet.index < 0) list.push({ guestId: null, ...v }); else list[sheet.index] = { ...list[sheet.index], ...v }; await onSave({ ...party, [sheet.role]: list }); }}
          onDelete={sheet.index < 0 ? undefined : async () => { await onSave({ ...party, [sheet.role]: (party[sheet.role] || []).filter((_, i) => i !== sheet.index) }); setSheet(null); }} />
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
          <RowGroup>
            {results.map((v) => (
              <div key={v.place_id || v.id} className="oi-m-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                <span className="oi-m-row__tile oi-m-row__tile--sand"><ShoppingBag size={18} strokeWidth={1.75} /></span>
                <div className="oi-m-row__body">
                  <div className="oi-m-row__label">{v.name}</div>
                  <div className="oi-m-row__sub">{[v.rating ? `${v.rating} stars` : '', v.address || v.formatted_address].filter(Boolean).join(' · ')}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, width: '100%', paddingLeft: 52 }}>
                  {v.website && <PillButton variant="secondary" size="sm" onClick={() => openExternal(v.website)}>Website</PillButton>}
                  <PillButton variant={savedIds.has(v.place_id) ? 'ghost' : 'primary'} size="sm" onClick={() => onSave(v)} disabled={savedIds.has(v.place_id)}>{savedIds.has(v.place_id) ? 'Added' : 'Add to my vendors'}</PillButton>
                </div>
              </div>
            ))}
          </RowGroup>
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
