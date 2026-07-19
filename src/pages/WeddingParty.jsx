import React, { useState, useEffect, useRef, useMemo } from "react";
import { InvokeLLM } from "@/integrations/Core";
import { Lightbulb, Loader2, X, FileText, Check, Plus, Users, Crown, Trash2 } from "lucide-react";
import DetailsSection from "../components/event-details/DetailsSection";
import SectionInput from "../components/event-details/SectionInput";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import { base44 } from "@/api/base44Client";
import { getMyWeddingDetails, getMyGuestsWithRsvp } from "@/lib/resolveMyWedding";
import { isAttending } from "@/lib/guestRsvpTally";
const WeddingDetails = base44.entities.WeddingDetails;

const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)',
  fontFamily: PJS,
};

const inputStyle = {
  width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 14, color: '#0A0A0A',
  fontFamily: PJS, outline: 'none', padding: '6px 0',
  boxSizing: 'border-box',
};

const ROLES = [
  { key: 'bridesmaids', label: 'Bridesmaids', singularLabel: 'Bridesmaid' },
  { key: 'groomsmen', label: 'Groomsmen', singularLabel: 'Groomsman' },
  { key: 'flowerGirls', label: 'Flower girls', singularLabel: 'Flower girl' },
  { key: 'ringBearers', label: 'Ring bearers', singularLabel: 'Ring bearer' },
  { key: 'readers', label: 'Readers', singularLabel: 'Reader' },
  { key: 'ushers', label: 'Ushers', singularLabel: 'Usher' },
  { key: 'other', label: 'Other roles', singularLabel: 'Member' },
];

const AVA_PROMPTS = [
  "What are typical duties of a maid of honour?",
  "How do I choose my wedding party size?",
  "What should groomsmen wear for a beach wedding?",
  "How do I handle a wedding party member who drops out?",
];

/* ── Normalise old string values to { name, guestId } ── */
function toMember(v) {
  if (!v) return null;
  if (typeof v === 'string') return v ? { name: v, guestId: null } : null;
  return v;
}

function getInitials(name) {
  return (name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

/* ── Guest chip — selected state ── */
function GuestChip({ name, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: '#F5F4F0', borderRadius: 999, padding: '4px 8px 4px 4px',
      border: '1px solid rgba(10,10,10,0.08)',
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: '50%', background: '#E03553',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <span style={{ fontSize: 8, fontWeight: 700, color: '#FFFFFF', fontFamily: PJS }}>
          {getInitials(name)}
        </span>
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS }}>
        {name}
      </span>
      <button
        type="button"
        onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.35)', display: 'flex', padding: 0, marginLeft: 2 }}
      >
        <X size={11} />
      </button>
    </span>
  );
}

/* ── Guest search dropdown ── */
function GuestSearch({ value, guests, onSelect, onClear, placeholder = 'Type a name or @ to search…' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  // Strip leading @ before filtering so "@ava" finds "Ava"
  const searchTerm = query.startsWith('@') ? query.slice(1) : query;

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return guests.slice(0, 7);
    return guests.filter(g => g.name?.toLowerCase().includes(q)).slice(0, 7);
  }, [searchTerm, guests]);

  const customName = query.startsWith('@') ? null : query.trim(); // no custom when using @ mode
  const showCustom = customName && !filtered.some(
    g => g.name?.toLowerCase() === customName.toLowerCase()
  );

  // When @ is typed, immediately open the guest dropdown
  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
  };

  // Show the hint tooltip only when the field is focused and empty (no text, no chip)
  const showHint = focused && query === '' && !value?.name;

  if (value?.name) {
    return <GuestChip name={value.name} onRemove={onClear} />;
  }

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <input
        value={query}
        onChange={handleChange}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onBlur={() => { setFocused(false); setTimeout(() => setOpen(false), 160); }}
        placeholder={placeholder}
        style={{ ...inputStyle, fontSize: 13 }}
      />
      {/* @ hint tooltip */}
      {showHint && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0,
          background: 'rgba(10,10,10,0.75)', color: '#FFFFFF',
          fontSize: 11, fontFamily: PJS, fontWeight: 500,
          padding: '4px 9px', borderRadius: 5,
          pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 400,
          letterSpacing: '0.01em',
        }}>
          Type @ to search your guest list
        </div>
      )}
      {open && !showHint && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 3px)', left: 0, right: 0,
          background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.12)',
          zIndex: 300, maxHeight: 240, overflowY: 'auto',
          boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
        }}>
          {filtered.length === 0 && !showCustom && (
            <div style={{ padding: '10px 14px', fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>
              {searchTerm ? 'No matching guests' : 'Start typing a name…'}
            </div>
          )}
          {filtered.map(g => (
            <button
              key={g.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onSelect({ name: g.name, guestId: g.id }); setQuery(''); setOpen(false); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid rgba(10,10,10,0.04)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F5F4F0'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#E03553', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#FFFFFF', fontFamily: PJS }}>{getInitials(g.name)}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A', fontFamily: PJS, flex: 1 }}>{g.name}</span>
              {isAttending(g) && (
                <span style={{ fontSize: 9, fontWeight: 700, color: '#065F46', background: '#D1FAE5', padding: '1px 6px', borderRadius: 999, fontFamily: PJS, flexShrink: 0 }}>
                  Attending
                </span>
              )}
            </button>
          ))}
          {showCustom && (
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onSelect({ name: customName, guestId: null }); setQuery(''); setOpen(false); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderTop: filtered.length > 0 ? '1px solid rgba(10,10,10,0.06)' : 'none' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
            >
              <Plus size={12} style={{ color: '#E03553', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#E03553', fontFamily: PJS, fontWeight: 600 }}>
                Add "{customName}" as custom
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Role member row ── */
function MemberRow({ member, onChange, onRemove, guests }) {
  const nameValue = (member.name || member.guestId)
    ? { name: member.name, guestId: member.guestId || null }
    : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end', borderBottom: '1px solid rgba(10,10,10,0.06)', paddingBottom: 10 }}>
      <GuestSearch
        value={nameValue}
        guests={guests}
        onSelect={sel => onChange({ ...member, name: sel.name, guestId: sel.guestId || null })}
        onClear={() => onChange({ ...member, name: '', guestId: null })}
      />
      <input
        value={member.phone || ''}
        onChange={e => onChange({ ...member, phone: e.target.value })}
        placeholder="Phone"
        style={inputStyle}
      />
      <input
        value={member.notes || ''}
        onChange={e => onChange({ ...member, notes: e.target.value })}
        placeholder="Notes"
        style={inputStyle}
      />
      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.45)', display: 'flex', padding: '0 0 7px' }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

/* ── Ava modal ── */
function AvaModal({ onClose }) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async (q) => {
    const question = (q || prompt).trim();
    if (!question) return;
    setLoading(true); setResponse('');
    try {
      const res = await InvokeLLM({ prompt: `Wedding party planning: ${question}` });
      setResponse(typeof res === 'string' ? res : JSON.stringify(res));
    } catch { setResponse('Something went wrong. Please try again.'); }
    setLoading(false);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: '#FFFFFF', width: '100%', maxWidth: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#0A1930', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lightbulb size={16} style={{ color: '#DDF762' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontFamily: PJS }}>Ask Ava — wedding party</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', padding: 4 }}><X size={16} /></button>
        </div>
        <div style={{ padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {AVA_PROMPTS.map(p => (
              <button key={p} onClick={() => ask(p)} disabled={loading}
                style={{ textAlign: 'left', padding: '10px 14px', background: '#F5F5F5', border: 'none', borderLeft: '2px solid rgba(10,10,10,0.12)', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, color: '#0A0A0A', fontFamily: PJS }}>
                {p}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask()} disabled={loading}
              placeholder="Or ask your own question…" style={{ ...inputStyle, flex: 1 }} />
            <button onClick={() => ask()} disabled={loading || !prompt.trim()} className="btn-primary" style={{ fontSize: 12, flexShrink: 0 }}>Ask</button>
          </div>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={14} style={{ color: '#E03553' }} className="animate-spin" />
              <span style={{ fontSize: 13, color: '#444444', fontFamily: PJS }}>Thinking…</span>
            </div>
          )}
          {response && (
            <div style={{ background: '#F5F5F5', padding: '14px 16px', fontSize: 13, color: '#0A0A0A', fontFamily: PJS, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {response}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Page ──
   "Key roles" and "Wedding party" used to be separate tabs, but deciding
   who's in the wedding party and what role each person has is really one
   job — splitting it made people bounce between tabs. Merged into a
   single "Key roles" tab: the key-roles pickers/notes first, then the
   full member roster below. "Notes" stays separate. */
const TABS = [
  { key: 'keyRoles', label: 'Key roles' },
  { key: 'notes',    label: 'Notes' },
];

export default function WeddingPartyPage() {
  const [data, setData] = useState({});
  const [guests, setGuests] = useState([]);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showAva, setShowAva] = useState(false);
  const [activeTab, setActiveTab] = useState('keyRoles');
  const autoSaveRef = useRef(null);
  const latestRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [wd, guestData] = await Promise.all([
        getMyWeddingDetails(),
        getMyGuestsWithRsvp('-created_date', 500),
      ]);
      const r = wd || {};
      setData(r.weddingParty || {});
      setRecordId(r.id || null);
      latestRef.current = r;
      setGuests(guestData);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const persist = (full) => {
    clearTimeout(autoSaveRef.current);
    setSaveStatus('saving');
    autoSaveRef.current = setTimeout(async () => {
      try {
        if (recordId) {
          await WeddingDetails.update(recordId, full);
        } else {
          const c = await WeddingDetails.create(full);
          setRecordId(c.id);
          latestRef.current = { ...full, id: c.id };
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch { setSaveStatus('idle'); }
    }, 1200);
  };

  const update = (patch) => {
    const next = { ...data, ...patch };
    setData(next);
    const full = { ...latestRef.current, weddingParty: next };
    latestRef.current = full;
    persist(full);
  };

  const addMember = (roleKey) => {
    const list = data[roleKey] || [];
    update({ [roleKey]: [...list, { name: '', guestId: null, phone: '', notes: '' }] });
  };

  const removeMember = (roleKey, i) => {
    const list = (data[roleKey] || []).filter((_, idx) => idx !== i);
    update({ [roleKey]: list });
  };

  const updateMember = (roleKey, i, member) => {
    const list = (data[roleKey] || []).map((m, idx) => idx === i ? member : m);
    update({ [roleKey]: list });
  };

  const totalMembers = ROLES.reduce((sum, r) => sum + (data[r.key] || []).length, 0)
    + (data.maidOfHonour ? 1 : 0) + (data.bestMan ? 1 : 0);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} style={{ color: '#E03553' }} className="animate-spin" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Wedding party" subtitle="Manage your wedding party members and their details" />

      {/* Stat strip */}
      <div style={{ display: 'flex', borderTop: '1px solid rgba(10,10,10,0.08)', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {[
          { label: 'Total members', value: totalMembers },
          { label: 'Bridesmaids', value: (data.bridesmaids || []).length },
          { label: 'Groomsmen', value: (data.groomsmen || []).length },
        ].map((stat, i, arr) => (
          <div key={stat.label} style={{ flex: 1, padding: '20px 24px', borderRight: i < arr.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
            <div style={labelStyle}>{stat.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0A0A0A', marginTop: 4, fontFamily: PJS }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Ava button + save indicator */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <AvaButton label="Ask Ava about your wedding party" onClick={() => setShowAva(true)} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: PJS, color: saveStatus === 'saved' ? '#6b7700' : 'rgba(10,10,10,0.35)', minWidth: 80 }}>
          {saveStatus === 'saving' && <><Loader2 size={12} className="animate-spin" />Saving…</>}
          {saveStatus === 'saved' && <><Check size={12} />Saved</>}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', padding: '0 32px' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding: '14px 0', marginRight: 32, fontSize: 13, fontWeight: 700, fontFamily: PJS, background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.key ? '#E03553' : '#444444',
              borderBottom: activeTab === tab.key ? '2px solid #E03553' : '2px solid transparent',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '32px 32px 48px', maxWidth: 760, margin: '0 auto' }}>
        {/* Key roles — merged tab: key-role pickers/notes first, then the
            full member roster below, one continuous flow instead of two
            separate tabs a couple used to have to bounce between. */}
        {activeTab === 'keyRoles' && (
        <>
        <DetailsSection title="Key roles" icon={Crown} defaultOpen>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={labelStyle}>Maid of honour / best person</span>
              <GuestSearch
                value={toMember(data.maidOfHonour)}
                guests={guests}
                onSelect={sel => update({ maidOfHonour: sel })}
                onClear={() => update({ maidOfHonour: null })}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={labelStyle}>Best man / best person</span>
              <GuestSearch
                value={toMember(data.bestMan)}
                guests={guests}
                onSelect={sel => update({ bestMan: sel })}
                onClear={() => update({ bestMan: null })}
              />
            </div>
          </div>
          <SectionInput label="Key role notes" isTextarea value={data.keyRoleNotes} onChange={e => update({ keyRoleNotes: e.target.value })} placeholder="Any notes about key roles and responsibilities…" />
        </DetailsSection>

        {/* Section break — a heading rather than a card, so the two groups
            read as one flat flow (per DESIGN_SPEC: no cards-within-cards),
            just clearly labelled where "who's in the wedding party" starts. */}
        <div style={{ marginTop: 32, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>
            Wedding party members
          </span>
          <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '4px 0 0' }}>
            Bridesmaids, groomsmen, and everyone else standing with you on the day.
          </p>
        </div>

        {/* Every role group visible together (not an accordion-of-
            accordions), so comparing rosters across roles never requires
            opening/closing several collapsed sections. */}
        {ROLES.map(role => (
          <DetailsSection key={role.key} title={role.label} icon={Users} defaultOpen>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(data[role.key] || []).length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, marginBottom: 4 }}>
                  {['Name', 'Phone', 'Notes', ''].map(h => (
                    <span key={h} style={labelStyle}>{h}</span>
                  ))}
                </div>
              )}
              {(data[role.key] || []).map((member, i) => (
                <MemberRow
                  key={i}
                  member={member}
                  guests={guests}
                  onChange={m => updateMember(role.key, i, m)}
                  onRemove={() => removeMember(role.key, i)}
                />
              ))}
              <button
                onClick={() => addMember(role.key)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#E03553', fontWeight: 700, background: 'none', border: '1px dashed rgba(224,53,83,0.4)', borderRadius: 999, padding: '7px 14px', cursor: 'pointer', fontFamily: PJS, width: 'fit-content', marginTop: 4 }}
              >
                <Plus size={12} />Add {role.singularLabel.toLowerCase()}
              </button>
            </div>
          </DetailsSection>
        ))}
        </>
        )}

        {/* Notes */}
        {activeTab === 'notes' && (
        <DetailsSection title="Notes" icon={FileText} defaultOpen>
          <SectionInput label="Additional notes" isTextarea value={data.notes} onChange={e => update({ notes: e.target.value })} placeholder="Attire details, group photos, rehearsal dinner notes…" />
        </DetailsSection>
        )}
      </div>

      {showAva && <AvaModal onClose={() => setShowAva(false)} />}
    </div>
  );
}
