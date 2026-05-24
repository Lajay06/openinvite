import React, { useState, useEffect, useRef } from "react";
import { InvokeLLM } from "@/integrations/Core";
import { Lightbulb, Loader2, X, FileText, Check, Plus, Users, Crown, Trash2 } from "lucide-react";
import DetailsSection from "../components/event-details/DetailsSection";
import SectionInput from "../components/event-details/SectionInput";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import { base44 } from "@/api/base44Client";
const WeddingDetails = base44.entities.WeddingDetails;

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const inputStyle = {
  width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 14, color: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0',
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#FFFFFF', width: '100%', maxWidth: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#0A1930', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lightbulb size={16} style={{ color: '#DDF762' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Ask Ava — wedding party</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', padding: 4 }}><X size={16} /></button>
        </div>
        <div style={{ padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {AVA_PROMPTS.map(p => (
              <button key={p} onClick={() => ask(p)} disabled={loading}
                style={{ textAlign: 'left', padding: '10px 14px', background: '#F5F5F5', border: 'none', borderLeft: '2px solid rgba(10,10,10,0.12)', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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
              <span style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Thinking…</span>
            </div>
          )}
          {response && (
            <div style={{ background: '#F5F5F5', padding: '14px 16px', fontSize: 13, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {response}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MemberRow({ member, onChange, onRemove }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end', borderBottom: '1px solid rgba(10,10,10,0.06)', paddingBottom: 10 }}>
      <input value={member.name || ''} onChange={e => onChange({ ...member, name: e.target.value })} placeholder="Full name" style={inputStyle} />
      <input value={member.phone || ''} onChange={e => onChange({ ...member, phone: e.target.value })} placeholder="Phone" style={inputStyle} />
      <input value={member.notes || ''} onChange={e => onChange({ ...member, notes: e.target.value })} placeholder="Notes" style={inputStyle} />
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.3)', display: 'flex', padding: '0 0 7px' }}>
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export default function WeddingPartyPage() {
  const [data, setData] = useState({});
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showAva, setShowAva] = useState(false);
  const autoSaveRef = useRef(null);
  const latestRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const rows = await WeddingDetails.list();
      const r = rows[0] || {};
      setData(r.weddingParty || {});
      setRecordId(r.id || null);
      latestRef.current = r;
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

  const addMember = (roleKey, singularLabel) => {
    const list = data[roleKey] || [];
    update({ [roleKey]: [...list, { name: '', phone: '', notes: '' }] });
  };

  const removeMember = (roleKey, i) => {
    const list = (data[roleKey] || []).filter((_, idx) => idx !== i);
    update({ [roleKey]: list });
  };

  const updateMember = (roleKey, i, member) => {
    const list = (data[roleKey] || []).map((m, idx) => idx === i ? member : m);
    update({ [roleKey]: list });
  };

  const totalMembers = ROLES.reduce((sum, r) => sum + (data[r.key] || []).length, 0);

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
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0A0A0A', marginTop: 4, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Ava button */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <AvaButton label="Ask Ava about your wedding party" onClick={() => setShowAva(true)} />
      </div>

      <div style={{ padding: '32px 32px 48px' }}>
        {/* Save status */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", color: saveStatus === 'saved' ? '#6b7700' : 'rgba(10,10,10,0.35)', minWidth: 80 }}>
            {saveStatus === 'saving' && <><Loader2 size={12} className="animate-spin" />Saving…</>}
            {saveStatus === 'saved' && <><Check size={12} />Saved</>}
          </div>
        </div>

        {/* Key roles */}
        <DetailsSection title="Key roles" icon={Crown}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <SectionInput label="Maid of honour / best person" value={data.maidOfHonour} onChange={e => update({ maidOfHonour: e.target.value })} placeholder="Name" />
            <SectionInput label="Best man / best person" value={data.bestMan} onChange={e => update({ bestMan: e.target.value })} placeholder="Name" />
          </div>
          <SectionInput label="Key role notes" isTextarea value={data.keyRoleNotes} onChange={e => update({ keyRoleNotes: e.target.value })} placeholder="Any notes about key roles and responsibilities…" />
        </DetailsSection>

        {/* Role groups */}
        {ROLES.map(role => (
          <DetailsSection key={role.key} title={role.label} icon={Users}>
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
                  onChange={m => updateMember(role.key, i, m)}
                  onRemove={() => removeMember(role.key, i)}
                />
              ))}
              <button onClick={() => addMember(role.key, role.singularLabel)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#E03553', fontWeight: 700, background: 'none', border: '1px dashed rgba(224,53,83,0.4)', borderRadius: 999, padding: '7px 14px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", width: 'fit-content', marginTop: 4 }}>
                <Plus size={12} />Add {role.singularLabel.toLowerCase()}
              </button>
            </div>
          </DetailsSection>
        ))}

        {/* Notes */}
        <DetailsSection title="Notes" icon={FileText}>
          <SectionInput label="Additional notes" isTextarea value={data.notes} onChange={e => update({ notes: e.target.value })} placeholder="Attire details, group photos, rehearsal dinner notes…" />
        </DetailsSection>
      </div>

      {showAva && <AvaModal onClose={() => setShowAva(false)} />}
    </div>
  );
}
