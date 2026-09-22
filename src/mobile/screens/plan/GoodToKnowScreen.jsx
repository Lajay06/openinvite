import React, { useEffect, useRef, useState } from 'react';
import { Camera, Share2, Baby, Utensils, Gift, Shirt, Clock, FileText, Wand2, Users } from 'lucide-react';
import Screen from '../../shell/Screen';
import { RowGroup, ErrorState, SkeletonRows, Switch, BottomSheet, PillButton, TextField, TextAreaField } from '../../ui';
import PillChoice from '../../ui/PillChoice';
import { linesFor } from '@/lib/goodToKnow';

/* GuestSuitePolicies.jsx's shape, verbatim: each policy's own fields plus `display`. */
export const EMPTY_POLICIES = {
  photography: { unplugged: false, message: '', display: false },
  socialMedia: { noCeremony: false, tagUs: false, hashtag: '', message: '', display: false },
  children: { option: 'all', message: '', display: false },
  dietary: { description: '', contactName: '', contactEmail: '', display: false },
  gifts: { option: 'welcome', registryUrl: '', message: '', display: false },
  dressCode: { guidance: '', weatherNote: '', display: false },
  lateArrival: { policy: '', display: false },
  other: { text: '', display: false },
  stylingQuestionnaire: { enabled: false },
};
export const EMPTY_GUEST_EXPERIENCE = { backgroundMusic: { enabled: false, source: '', url: '', trackId: '', trackName: '' }, showAttending: false, showCircle: false };
const SECTIONS = [
  { key: 'photography', label: 'Photography', icon: Camera, sub: 'An unplugged ceremony, or snap away' },
  { key: 'socialMedia', label: 'Social media', icon: Share2, sub: 'Posting on the day, and your hashtag' },
  { key: 'children', label: 'Children', icon: Baby, sub: 'Little ones welcome, or a night off' },
  { key: 'dietary', label: 'Dietary', icon: Utensils, sub: 'What you cater for and who to tell' },
  { key: 'gifts', label: 'Gifts', icon: Gift, sub: 'Registry, wishing well, or your presence is enough' },
  { key: 'dressCode', label: 'Dress code', icon: Shirt, sub: 'What to wear and the weather' },
  { key: 'lateArrival', label: 'Late arrival', icon: Clock, sub: 'What happens if someone is running late' },
  { key: 'other', label: 'Other', icon: FileText, sub: 'Anything else guests should know' },
];
const CHILDREN = [['all', 'All children welcome'], ['wedding_party', 'Children of the wedding party only'], ['adults_only', 'Adults only']].map(([value, label]) => ({ value, label }));
const GIFTS = [['welcome', 'Gifts welcome'], ['no_gifts', 'No gifts please'], ['charity', 'Charity donation preferred'], ['wishing_well', 'Wishing well (cash)']].map(([value, label]) => ({ value, label }));
const STYLING_MODES = [
  { key: 'ai', enabled: false, name: 'Personal stylist', asks: 'who they are dressing, their style, how comfortable they want to be, their budget, and anything else they want to mention.', result: 'Writes them a personal outfit suggestion, with colors and fabrics.' },
  { key: 'quick', enabled: true, name: 'Quick guide', asks: 'which of your events they are attending, their style, and their budget.', result: 'Shows an instant what-to-wear guide built from your dress codes.' },
];

/**
 * Good to know, as GuestSuitePolicies.jsx: every policy with its own
 * fields and a Show in guest suite switch, the styling quiz mode, and the
 * guest experience settings (show who is attending, the circle; background
 * music is hidden on desktop by owner decision and so here). Saves `weddingPolicies` and
 * `guestExperienceSettings` as the desktop's Save does, 900ms after the
 * last change.
 */
export default function GoodToKnowScreen({ policies = {}, guestExperience = {}, eventDressCode = '', onSave, loading, error, onRetry, back }) {
  const [p, setP] = useState(() => merge(policies));
  const [ge, setGe] = useState(() => ({ ...EMPTY_GUEST_EXPERIENCE, ...guestExperience, backgroundMusic: { ...EMPTY_GUEST_EXPERIENCE.backgroundMusic, ...(guestExperience.backgroundMusic || {}) } }));
  const [edit, setEdit] = useState(null); // section key
  const [status, setStatus] = useState('idle');
  const timer = useRef(null);
  const pending = useRef(null);
  useEffect(() => { setP(merge(policies)); }, [policies]);
  useEffect(() => { setGe({ ...EMPTY_GUEST_EXPERIENCE, ...guestExperience, backgroundMusic: { ...EMPTY_GUEST_EXPERIENCE.backgroundMusic, ...(guestExperience.backgroundMusic || {}) } }); }, [guestExperience]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const queue = (nextP, nextGe) => {
    pending.current = { policies: nextP, guestExperience: nextGe };
    setStatus('saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => { const job = pending.current; pending.current = null; try { await onSave(job.policies, job.guestExperience); setStatus('saved'); setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1500); } catch { setStatus('failed'); } }, 900);
  };
  const set = (key, field, value) => { const next = { ...p, [key]: { ...(p[key] || {}), [field]: value } }; setP(next); queue(next, ge); };
  const setGE = (field, value) => { const next = { ...ge, [field]: value }; setGe(next); queue(p, next); };
  const shown = SECTIONS.filter((s) => p[s.key]?.display).length;
  const subtitle = status === 'saving' ? 'Saving' : status === 'saved' ? 'Saved' : status === 'failed' ? 'Could not save. Check your connection.' : loading ? '' : `${shown} shown to guests`;
  const summaryOf = (key) => {
    const v = p[key] || {};
    switch (key) {
      // PR #831: the couple's note REPLACES the platform's unplugged sentence,
      // so the row cannot report the toggle — it reports the line guests read,
      // through the same linesFor() the guest site and both web editors use.
      // It used to say "Unplugged ceremony" over a note that said something
      // else entirely, and never showed the couple their own words.
      case 'photography': return linesFor('photography', v).join(' ') || 'Snap away';
      case 'socialMedia': return [v.noCeremony ? 'No posts from the ceremony' : '', v.tagUs ? 'Tag us' : '', v.hashtag].filter(Boolean).join(', ') || v.message || 'Not set';
      case 'children': return CHILDREN.find((c) => c.value === v.option)?.label || 'Not set';
      case 'dietary': return v.description || 'Not set';
      case 'gifts': return GIFTS.find((g) => g.value === v.option)?.label || 'Not set';
      case 'dressCode': return v.guidance || eventDressCode || 'Not set';
      case 'lateArrival': return v.policy || 'Not set';
      case 'other': return v.text || 'Not set';
      default: return '';
    }
  };

  return (
    <Screen title="Good to know" subtitle={subtitle} back={back}>
      <div className="oi-m-stack oi-m-stack--24">
        {error && !loading ? <ErrorState onRetry={onRetry} /> : loading ? <SkeletonRows count={6} /> : (
          <>
            <section>
              <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Policies</h2>
              <RowGroup>
                {SECTIONS.map((s) => (
                  <div key={s.key} className="oi-m-row" style={{ minHeight: 68 }}>
                    <span className="oi-m-row__tile oi-m-row__tile--neutral"><s.icon size={19} strokeWidth={1.75} /></span>
                    <button type="button" className="oi-m-row__body" style={{ textAlign: 'left', minHeight: 44 }} onClick={() => setEdit(s.key)}>
                      <div className="oi-m-row__label">{s.label}</div>
                      <div className="oi-m-row__sub">{summaryOf(s.key)}</div>
                    </button>
                    <Switch on={!!p[s.key]?.display} onChange={(on) => set(s.key, 'display', on)} label={`Show ${s.label.toLowerCase()} in the guest suite`} />
                  </div>
                ))}
              </RowGroup>
              <p className="oi-m-meta" style={{ marginTop: 8 }}>The switch shows a section on your guest suite. Tap a row to write it.</p>
            </section>
            <section>
              <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Styling quiz</h2>
              <RowGroup>
                {STYLING_MODES.map((m) => { const on = !!p.stylingQuestionnaire?.enabled === m.enabled; return (
                  <button key={m.key} type="button" className="oi-m-row oi-m-row--pressable" onClick={() => set('stylingQuestionnaire', 'enabled', m.enabled)} aria-pressed={on}>
                    <span className={`oi-m-row__tile${on ? ' oi-m-row__tile--primary' : ' oi-m-row__tile--neutral'}`}><Wand2 size={19} strokeWidth={1.75} /></span>
                    <div className="oi-m-row__body"><div className="oi-m-row__label">{m.name}</div><div className="oi-m-row__sub" style={{ whiteSpace: 'normal' }}>Asks {m.asks} {m.result}</div></div>
                  </button>
                ); })}
              </RowGroup>
            </section>
            <section>
              <h2 className="oi-m-section" style={{ marginBottom: 12 }}>Guest experience</h2>
              <RowGroup>
                {/* Background music stays hidden, as GuestSuitePolicies.jsx's SHOW_BACKGROUND_MUSIC_UI = false (owner decision: both sources declined). The stored value is left untouched. */}
                <div className="oi-m-row" style={{ minHeight: 68 }}>
                  <span className="oi-m-row__tile oi-m-row__tile--neutral"><Users size={19} strokeWidth={1.75} /></span>
                  <div className="oi-m-row__body"><div className="oi-m-row__label">Show who is attending</div><div className="oi-m-row__sub" style={{ whiteSpace: 'normal' }}>Guests see the names of everyone who has said yes</div></div>
                  <Switch on={!!ge.showAttending} onChange={(on) => setGE('showAttending', on)} label="Show who is attending" />
                </div>
                <div className="oi-m-row" style={{ minHeight: 68 }}>
                  <span className="oi-m-row__tile oi-m-row__tile--neutral"><Users size={19} strokeWidth={1.75} /></span>
                  <div className="oi-m-row__body"><div className="oi-m-row__label">The circle</div><div className="oi-m-row__sub" style={{ whiteSpace: 'normal' }}>Show guests the wedding party on your guest suite</div></div>
                  <Switch on={!!ge.showCircle} onChange={(on) => setGE('showCircle', on)} label="Show the circle" />
                </div>
              </RowGroup>
            </section>
          </>
        )}
      </div>
      {edit && <PolicySheet section={SECTIONS.find((s) => s.key === edit)} value={p[edit] || {}} eventDressCode={eventDressCode} onChange={(field, v) => set(edit, field, v)} onClose={() => setEdit(null)} />}
    </Screen>
  );
}

function merge(policies) {
  const out = {};
  for (const k of Object.keys(EMPTY_POLICIES)) out[k] = { ...EMPTY_POLICIES[k], ...(policies[k] || {}) };
  return out;
}

/**
 * The line guests will read under Photographs, computed by the site's own
 * rule. Because the couple's note replaces the platform's unplugged
 * sentence (PR #831), a couple whose note is not about phones would lose
 * that sentence without knowing; this is where they see it go. Display
 * only, nothing is saved. GuestSuitePolicies.jsx and the studio's
 * PoliciesTab.jsx show the same thing in the same words.
 */
function GuestsWillSee({ lines }) {
  return (
    <div>
      <span className="oi-m-field__label">On the site</span>
      <p className="oi-m-body" style={{ margin: '4px 0 0', paddingLeft: 4, color: lines.length ? 'var(--m-text)' : 'var(--m-text-2)' }}>
        {lines.length ? lines.join(' ') : 'Nothing under Photographs until the toggle is on or a message is written.'}
      </p>
    </div>
  );
}

/** One policy's own fields, edited in place; every change queues a save. */
function PolicySheet({ section, value: v, eventDressCode, onChange, onClose }) {
  const toggle = (field, label) => <div className="oi-m-row" style={{ padding: '8px 4px', background: 'transparent' }}><div className="oi-m-row__body"><div className="oi-m-row__label oi-m-row__label--wrap">{label}</div></div><Switch on={!!v[field]} onChange={(on) => onChange(field, on)} label={label} /></div>;
  const text = (field, label, extra = {}) => <TextField label={label} value={v[field] || ''} onChange={(e) => onChange(field, e.target.value)} {...extra} />;
  const area = (field, label, extra = {}) => <TextAreaField label={label} value={v[field] || ''} onChange={(e) => onChange(field, e.target.value)} rows={3} {...extra} />;
  return (
    <BottomSheet open onClose={onClose} title={section.label} full footer={<PillButton variant="primary" block onClick={onClose}>Done</PillButton>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {section.key === 'photography' && <>{toggle('unplugged', 'Unplugged ceremony')}{area('message', 'Custom message', { placeholder: 'Phones away for the ceremony, then snap away.' })}<GuestsWillSee lines={linesFor('photography', v)} /></>}
        {section.key === 'socialMedia' && <>{toggle('noCeremony', 'No posting during the ceremony')}{toggle('tagUs', 'Tag us in your photos')}{text('hashtag', 'Hashtag', { placeholder: '#OurWedding', autoCapitalize: 'off' })}{area('message', 'Custom message')}</>}
        {section.key === 'children' && <><PillChoice label="Children" options={CHILDREN} value={v.option || 'all'} onChange={(o) => o && onChange('option', o)} />{area('message', 'Custom message', { placeholder: 'Little ones are welcome all day.' })}</>}
        {section.key === 'dietary' && <>{area('description', 'Available options', { placeholder: 'We offer vegetarian, vegan and gluten free options.' })}{text('contactName', 'Contact name', { autoCapitalize: 'words' })}{text('contactEmail', 'Contact email', { type: 'email', inputMode: 'email', autoCapitalize: 'off' })}</>}
        {section.key === 'gifts' && <><PillChoice label="Gifts" options={GIFTS} value={v.option || 'welcome'} onChange={(o) => o && onChange('option', o)} />{text('registryUrl', 'Registry link', { type: 'url', inputMode: 'url', autoCapitalize: 'off', placeholder: 'https://' })}{area('message', 'Custom message')}</>}
        {section.key === 'dressCode' && <><TextField label="From event details" value={eventDressCode} readOnly placeholder="Set in Event details" />{area('guidance', 'Expanded guidance', { placeholder: 'Formal attire, cocktail dresses, the ceremony is on grass' })}{text('weatherNote', 'Weather note', { placeholder: 'Outdoor ceremony, flat heels recommended' })}</>}
        {section.key === 'lateArrival' && area('policy', 'Policy', { placeholder: 'If you are running late, wait at the back until the vows are done.' })}
        {section.key === 'other' && area('text', 'Anything else', { rows: 5 })}
        {toggle('display', 'Show in the guest suite')}
      </div>
    </BottomSheet>
  );
}
