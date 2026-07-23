import React, { useState, useEffect, useRef } from "react";
import { Plus, Star, X, Check, Loader2 } from "lucide-react";
import toast from 'react-hot-toast';

import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';
import VendorFormModal from '../components/vendors/VendorFormModal';
import VendorContactSection from '../components/vendors/VendorContactSection';
import VendorList from '../components/vendors/VendorList';
import PageConsiderations from '../components/shared/PageConsiderations';
import { base44 } from "@/api/base44Client";
import { getMyWeddingDetails, getMyRecords } from "@/lib/resolveMyWedding";
const WeddingDetails = base44.entities.WeddingDetails;
const Vendor = base44.entities.Vendor;

const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
  color: 'rgba(10,10,10,0.6)', fontFamily: PJS,
};
const inputStyle = {
  width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 14, color: '#0A0A0A',
  fontFamily: PJS, outline: 'none', padding: '6px 0', boxSizing: 'border-box',
};
const textareaStyle = {
  ...inputStyle,
  resize: 'vertical', minHeight: 72,
};


function CountUp({ to, duration = 1200, format }) {
  const [value, setValue] = useState(0);
  const startRef = useRef(null);
  useEffect(() => {
    if (to === 0) { setValue(0); return; }
    startRef.current = null;
    let raf;
    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * to));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{format ? format(value) : value}</>;
}

function StarRating({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          aria-label={`Rate ${n} star${n === 1 ? '' : 's'}`}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
        >
          <Star
            size={16}
            fill={n <= value ? '#E03553' : 'none'}
            style={{ color: n <= value ? '#E03553' : 'rgba(10,10,10,0.25)' }}
          />
        </button>
      ))}
    </div>
  );
}

const TABS = [
  { key: 'hair-makeup',   label: 'Hair & makeup' },
  { key: 'skincare',      label: 'Skincare timeline' },
  { key: 'beauty-team',   label: 'Beauty team' },
  { key: 'trials',        label: 'Trial planning' },
  { key: 'considerations',label: 'Considerations' },
];

export default function BeautyPage() {
  const [vendors, setVendors] = useState([]);
  const [beautyData, setBeautyData] = useState({});
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [activeTab, setActiveTab] = useState('hair-makeup');
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [showTrialForm, setShowTrialForm] = useState(false);
  const [avaOpen, setAvaOpen] = useState(false);

  const autoSaveRef = useRef(null);
  const latestRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  // The "Beauty team" tab's own vendor list can go stale after a vendor is
  // added via a VendorContactSection elsewhere on this page (hair/makeup
  // artist) — each owns its own fetch. Refresh on tab switch rather than
  // prop-drilling a shared list/refresh callback into every consumer.
  useEffect(() => {
    if (activeTab === 'beauty-team') {
      getMyRecords('Vendor').then(v => setVendors(v.filter(x => x.category === 'beauty'))).catch(() => {});
    }
  }, [activeTab]);

  const loadData = async () => {
    try {
      const [wd, vendorData] = await Promise.all([
        getMyWeddingDetails(),
        getMyRecords('Vendor'),
      ]);
      const r = wd || {};
      const bd = r.beauty || {};
      if (!bd.skincareTimeline) bd.skincareTimeline = [];
      if (!bd.gettingReadyPeople) bd.gettingReadyPeople = [];
      if (!bd.trials) bd.trials = [];
      setBeautyData(bd);
      setRecordId(r.id || null);
      latestRef.current = r;
      setVendors(vendorData.filter(v => v.category === 'beauty'));
    } catch (e) {
      console.error(e);
      toast.error('Failed to load beauty data');
    }
    setLoading(false);
  };

  const persist = (nextBeauty) => {
    clearTimeout(autoSaveRef.current);
    setSaveStatus('saving');
    autoSaveRef.current = setTimeout(async () => {
      try {
        const full = { ...latestRef.current, beauty: nextBeauty };
        if (recordId) {
          await WeddingDetails.update(recordId, full);
        } else {
          const c = await WeddingDetails.create(full);
          setRecordId(c.id);
          latestRef.current = { ...full, id: c.id };
        }
        latestRef.current = { ...latestRef.current, beauty: nextBeauty };
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch { setSaveStatus('idle'); }
    }, 900);
  };

  const update = (patch) => {
    const next = { ...beautyData, ...patch };
    setBeautyData(next);
    persist(next);
  };

  const beautyVendors = vendors;

  const gettingReadyPeople = beautyData.gettingReadyPeople || [];
  const hairCount = gettingReadyPeople.filter(p => p.service === 'hair' || p.service === 'both').length;
  const makeupCount = gettingReadyPeople.filter(p => p.service === 'makeup' || p.service === 'both').length;
  const totalMins = hairCount * 60 + makeupCount * 45;

  const STAT_CARDS = [
    { label: 'Artists booked',    value: beautyVendors.filter(v => v.status === 'booked').length },
    { label: 'Trials scheduled',  value: (beautyData.trials || []).length },
    { label: 'Getting ready time',value: totalMins, format: v => `${v} min` },
    { label: 'People in chair',   value: gettingReadyPeople.length },
  ];

  const addPerson = () => {
    const next = { ...beautyData, gettingReadyPeople: [...gettingReadyPeople, { id: Date.now(), name: '', role: '', service: 'both' }] };
    setBeautyData(next);
    persist(next);
  };

  const updatePerson = (id, field, val) => {
    const next = { ...beautyData, gettingReadyPeople: gettingReadyPeople.map(p => p.id === id ? { ...p, [field]: val } : p) };
    setBeautyData(next);
    persist(next);
  };

  const removePerson = (id) => {
    const next = { ...beautyData, gettingReadyPeople: gettingReadyPeople.filter(p => p.id !== id) };
    setBeautyData(next);
    persist(next);
  };

  const skincareTimeline = beautyData.skincareTimeline || [];

  const updateMilestone = (id, field, val) => {
    const next = { ...beautyData, skincareTimeline: skincareTimeline.map(m => m.id === id ? { ...m, [field]: val } : m) };
    setBeautyData(next);
    persist(next);
  };

  const addMilestone = () => {
    const next = { ...beautyData, skincareTimeline: [...skincareTimeline, { id: `m${Date.now()}`, timeframe: '', treatment: '', notes: '', done: false }] };
    setBeautyData(next);
    persist(next);
  };

  const trials = beautyData.trials || [];

  const addTrial = (trialData) => {
    const next = { ...beautyData, trials: [...trials, { id: Date.now(), ...trialData }] };
    setBeautyData(next);
    persist(next);
    setShowTrialForm(false);
  };

  const removeTrial = (id) => {
    const next = { ...beautyData, trials: trials.filter(t => t.id !== id) };
    setBeautyData(next);
    persist(next);
  };

  const handleVendorSubmit = async (vendorData) => {
    const tid = toast.loading(editingVendor ? 'Updating…' : 'Adding vendor…');
    try {
      let created;
      if (editingVendor) {
        await Vendor.update(editingVendor.id, vendorData);
        toast.success('Vendor updated', { id: tid });
      } else {
        created = await Vendor.create({ ...vendorData, category: 'beauty' });
        toast.success('Vendor added', { id: tid });
      }
      setShowVendorForm(false);
      setEditingVendor(null);
      const refreshed = await getMyRecords('Vendor');
      setVendors(refreshed.filter(v => v.category === 'beauty'));
    } catch { toast.error('Failed to save vendor', { id: tid }); }
  };

  const handleVendorEdit = (vendor) => { setEditingVendor(vendor); setShowVendorForm(true); };

  const handleVendorDelete = async (id) => {
    if (!window.confirm('Delete this vendor?')) return;
    const tid = toast.loading('Deleting…');
    try {
      await Vendor.delete(id);
      toast.success('Vendor deleted', { id: tid });
      setVendors(prev => prev.filter(v => v.id !== id));
    } catch { toast.error('Failed to delete', { id: tid }); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} style={{ color: '#E03553' }} className="animate-spin" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Beauty" subtitle="Hair, makeup and beauty planning for your wedding day" />

      {/* Stat strip */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {STAT_CARDS.map((s, i) => (
          <div key={s.label} style={{ flex: 1, padding: '20px 32px', borderRight: i < STAT_CARDS.length - 1 ? '1px solid rgba(10,10,10,0.08)' : undefined }}>
            <p style={{ ...labelStyle, marginBottom: 8 }}>{s.label}</p>
            <p style={{ fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, lineHeight: 1, margin: 0 }}>
              <CountUp to={s.value} format={s.format} />
            </p>
          </div>
        ))}
      </div>

      {/* Ava button */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <AvaButton label="Ask Ava to help plan your beauty day" onClick={() => setAvaOpen(true)} />
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', padding: '0 32px' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '14px 0', marginRight: 32, fontSize: 13, fontWeight: 700,
              fontFamily: PJS, background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.key ? '#E03553' : 'rgba(10,10,10,0.45)',
              borderBottom: activeTab === tab.key ? '2px solid #E03553' : '2px solid transparent',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Auto-save indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 32px 0', minHeight: 28 }}>
        {saveStatus === 'saving' && (
          <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.35)', fontFamily: PJS, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Loader2 size={11} className="animate-spin" />Saving…
          </span>
        )}
        {saveStatus === 'saved' && (
          <span style={{ fontSize: 12, color: '#6b7700', fontFamily: PJS, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Check size={11} />Saved
          </span>
        )}
      </div>

      <div style={{ padding: '24px 32px 64px' }}>

        {/* ── HAIR & MAKEUP ──────────────────────────────────────────────── */}
        {activeTab === 'hair-makeup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'start' }}>

              {/* Left — Bride/Partner 1 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: 0 }}>Bride / Partner 1</h3>

                {/* Hair artist */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Hair artist</label>
                  <VendorContactSection
                    category="beauty"
                    vendorId={beautyData.hairArtistVendorId}
                    onVendorIdChange={id => update({ hairArtistVendorId: id })}
                  />
                </div>

                {/* Makeup artist */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Makeup artist</label>
                  <VendorContactSection
                    category="beauty"
                    vendorId={beautyData.makeupArtistVendorId}
                    onVendorIdChange={id => update({ makeupArtistVendorId: id })}
                  />
                </div>

                {/* Style notes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Style notes</label>
                  <textarea
                    style={textareaStyle}
                    placeholder="Describe your desired look, references, inspiration…"
                    value={beautyData.styleNotes || ''}
                    onChange={e => update({ styleNotes: e.target.value })}
                  />
                </div>

                {/* Hair inspo */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Hair inspiration</label>
                  <textarea
                    style={textareaStyle}
                    placeholder="Paste Pinterest links, describe styles, or note references…"
                    value={beautyData.hairInspo || ''}
                    onChange={e => update({ hairInspo: e.target.value })}
                  />
                </div>
              </div>

              {/* Right — Wedding party */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: 0 }}>Wedding party</h3>
                  <button onClick={addPerson} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                    <Plus size={12} />Add person
                  </button>
                </div>

                {gettingReadyPeople.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>No one added yet. Click "Add person" to start building your getting ready list.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {/* Header row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px 28px', gap: 10, padding: '0 0 8px', borderBottom: '1px solid rgba(10,10,10,0.08)', marginBottom: 8 }}>
                      {['Name', 'Role', 'Service', ''].map(h => (
                        <span key={h} style={{ ...labelStyle, fontSize: 10 }}>{h}</span>
                      ))}
                    </div>
                    {gettingReadyPeople.map(p => (
                      <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px 28px', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                        <input
                          style={inputStyle}
                          placeholder="Name"
                          value={p.name || ''}
                          onChange={e => updatePerson(p.id, 'name', e.target.value)}
                        />
                        <input
                          style={inputStyle}
                          placeholder="Bridesmaid, mum…"
                          value={p.role || ''}
                          onChange={e => updatePerson(p.id, 'role', e.target.value)}
                        />
                        <select
                          value={p.service || 'both'}
                          onChange={e => updatePerson(p.id, 'service', e.target.value)}
                          style={{ ...inputStyle, cursor: 'pointer' }}
                        >
                          <option value="hair">Hair</option>
                          <option value="makeup">Makeup</option>
                          <option value="both">Both</option>
                        </select>
                        <button onClick={() => removePerson(p.id)} aria-label="Remove person"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Getting ready time calculator */}
                {gettingReadyPeople.length > 0 && (
                  <div style={{ background: 'rgba(10,10,10,0.03)', padding: '14px 16px', marginTop: 8 }}>
                    <p style={{ ...labelStyle, marginBottom: 10 }}>Getting ready calculator</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontFamily: PJS, color: '#0A0A0A' }}>
                        <span>Hair ({hairCount} {hairCount === 1 ? 'person' : 'people'} × 60 min)</span>
                        <span style={{ fontWeight: 600 }}>{hairCount * 60} min</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontFamily: PJS, color: '#0A0A0A' }}>
                        <span>Makeup ({makeupCount} {makeupCount === 1 ? 'person' : 'people'} × 45 min)</span>
                        <span style={{ fontWeight: 600 }}>{makeupCount * 45} min</span>
                      </div>
                      <div style={{ height: 1, background: 'rgba(10,10,10,0.08)', margin: '4px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontFamily: PJS, fontWeight: 700, color: '#0A0A0A' }}>
                        <span>Total getting ready time</span>
                        <span>{Math.floor(totalMins / 60)}h {totalMins % 60 > 0 ? `${totalMins % 60}m` : ''}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '4px 0 0' }}>
                        Recommended start time: at least {Math.ceil(totalMins / 60) + 1}h before ceremony
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── SKINCARE TIMELINE ─────────────────────────────────────────── */}
        {activeTab === 'skincare' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 860 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 20 }}>
              <button onClick={addMilestone} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                <Plus size={12} />Add milestone
              </button>
            </div>

            {skincareTimeline.length === 0 && (
              <div style={{ padding: '48px 0', textAlign: 'center' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 6 }}>No milestones yet</p>
                <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Add your first milestone above to start planning your skincare countdown.</p>
              </div>
            )}

            {/* Header */}
            {skincareTimeline.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 60px', gap: 16, padding: '0 0 10px', borderBottom: '1px solid rgba(10,10,10,0.08)', marginBottom: 4 }}>
                {['Timeframe', 'Treatment', 'Notes', 'Done'].map(h => (
                  <span key={h} style={labelStyle}>{h}</span>
                ))}
              </div>
            )}

            {skincareTimeline.map(m => (
              <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 60px', gap: 16, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(10,10,10,0.05)' }}>
                <input
                  style={inputStyle}
                  placeholder="e.g. 6 months before"
                  value={m.timeframe || ''}
                  onChange={e => updateMilestone(m.id, 'timeframe', e.target.value)}
                />
                <input
                  style={inputStyle}
                  placeholder="Treatment or task"
                  value={m.treatment || ''}
                  onChange={e => updateMilestone(m.id, 'treatment', e.target.value)}
                />
                <input
                  style={inputStyle}
                  placeholder="Optional notes"
                  value={m.notes || ''}
                  onChange={e => updateMilestone(m.id, 'notes', e.target.value)}
                />
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    onClick={() => updateMilestone(m.id, 'done', !m.done)}
                    aria-label={m.done ? 'Mark milestone as not done' : 'Mark milestone as done'}
                    style={{
                      width: 20, height: 20, borderRadius: 4, border: `2px solid ${m.done ? '#E03553' : 'rgba(10,10,10,0.25)'}`,
                      background: m.done ? '#E03553' : 'transparent', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    {m.done && <Check size={11} color="#FFFFFF" strokeWidth={3} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── BEAUTY TEAM ───────────────────────────────────────────────── */}
        {activeTab === 'beauty-team' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => { setEditingVendor(null); setShowVendorForm(true); }} className="btn-primary"
                style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={13} />Add beauty vendor
              </button>
            </div>
            {beautyVendors.length === 0 ? (
              <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, textAlign: 'center', padding: '40px 0' }}>
                No beauty vendors added yet. Click "Add beauty vendor" to get started.
              </p>
            ) : (
              <VendorList vendors={beautyVendors} onEdit={handleVendorEdit} onDelete={handleVendorDelete} />
            )}
          </div>
        )}

        {/* ── TRIAL PLANNING ────────────────────────────────────────────── */}
        {activeTab === 'trials' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowTrialForm(true)} className="btn-primary"
                style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={13} />Schedule trial
              </button>
            </div>

            {showTrialForm && <TrialForm onSubmit={addTrial} onCancel={() => setShowTrialForm(false)} />}

            {trials.length === 0 && !showTrialForm ? (
              <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, textAlign: 'center', padding: '32px 0' }}>
                No trials scheduled yet. Click "Schedule trial" to add one.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {trials.map(t => (
                  <div key={t.id} style={{ padding: '18px 0', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>{t.artist || 'Trial'}</span>
                        {t.date && <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>{t.date}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {t.rating > 0 && <StarRating value={t.rating} onChange={() => {}} />}
                        <button onClick={() => removeTrial(t.id)} aria-label="Remove trial"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.45)', display: 'flex', padding: 2 }}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    {t.lookDescription && (
                      <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0 }}>{t.lookDescription}</p>
                    )}
                    {t.notes && (
                      <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0, fontStyle: 'italic' }}>{t.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Tips */}
            <div style={{ background: 'rgba(10,10,10,0.03)', padding: '16px 20px', marginTop: 8 }}>
              <p style={{ ...labelStyle, marginBottom: 10 }}>Tips for your trial</p>
              <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                {[
                  'Book your hair trial 2–3 months before the wedding',
                  'Schedule your trial on a day you have plans so you can test how it wears',
                  'Bring inspiration photos, your veil, and any hair accessories',
                ].map((tip, i) => (
                  <li key={i} style={{ fontSize: 13, color: 'rgba(10,10,10,0.65)', fontFamily: PJS, marginBottom: i < 2 ? 6 : 0, lineHeight: 1.6 }}>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── CONSIDERATIONS ────────────────────────────────────────────── */}
        {activeTab === 'considerations' && (
          <div style={{ maxWidth: 860 }}>
            <PageConsiderations pageKey="beauty" />
          </div>
        )}
      </div>

      <VendorFormModal
        open={showVendorForm}
        vendor={editingVendor}
        defaultCategory="beauty"
        onSubmit={handleVendorSubmit}
        onCancel={() => { setShowVendorForm(false); setEditingVendor(null); }}
      />

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Beauty advisor"
        systemPrompt="You are Ava, a wedding beauty advisor. Help plan hair, makeup, skincare timelines, and getting-ready schedules."
        quickActions={["How long will getting ready take?", "Build a skincare countdown", "What should I ask a makeup artist?", "Tips for makeup longevity"]}
      />
    </div>
  );
}

function TrialForm({ onSubmit, onCancel }) {
  const [data, setData] = useState({ date: '', artist: '', lookDescription: '', rating: 0, notes: '' });
  const set = (k, v) => setData(prev => ({ ...prev, [k]: v }));
  return (
    <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: 24, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>Schedule a trial</span>
        <button onClick={onCancel} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', display: 'flex', padding: 4 }}><X size={15} /></button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>Date</label>
            <input type="date" value={data.date} onChange={e => set('date', e.target.value)}
              style={{ border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: PJS, outline: 'none', padding: '6px 0' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>Artist name</label>
            <input value={data.artist} onChange={e => set('artist', e.target.value)} placeholder="Artist"
              style={{ border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: PJS, outline: 'none', padding: '6px 0', width: '100%' }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>Look description</label>
          <textarea value={data.lookDescription} onChange={e => set('lookDescription', e.target.value)} placeholder="Describe the look discussed…"
            style={{ border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: PJS, outline: 'none', padding: '6px 0', resize: 'vertical', minHeight: 60, width: '100%' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>Rating</label>
          <StarRating value={data.rating} onChange={v => set('rating', v)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>Notes</label>
          <textarea value={data.notes} onChange={e => set('notes', e.target.value)} placeholder="Products used, feedback, things to change…"
            style={{ border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)', background: 'none', fontSize: 14, color: '#0A0A0A', fontFamily: PJS, outline: 'none', padding: '6px 0', resize: 'vertical', minHeight: 60, width: '100%' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 8 }}>
          <button type="button" onClick={onCancel} className="btn-editorial-secondary">Cancel</button>
          <button type="button" onClick={() => onSubmit(data)} className="btn-primary">Save trial</button>
        </div>
      </div>
    </div>
  );
}
