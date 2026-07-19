import React, { useState, useEffect, useRef } from "react";
import { Hotel, MapPin, FileText, Loader2, X, Plus, Check, Search, Edit, Trash2 } from "lucide-react";
import DetailsSection from "../components/event-details/DetailsSection";
import SectionInput from "../components/event-details/SectionInput";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';
import { base44 } from "@/api/base44Client";
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
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

function GoogleField({ label, value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <input style={{ ...inputStyle, flex: 1 }} value={value || ''} onChange={onChange} placeholder={placeholder} />
        {value && (
          <a href={`https://www.google.com/search?q=${encodeURIComponent(value)}`} target="_blank" rel="noopener noreferrer"
            title="Search on Google"
            style={{ color: 'rgba(10,10,10,0.45)', flexShrink: 0, display: 'flex', alignItems: 'center', paddingBottom: 7 }}
            onMouseEnter={e => e.currentTarget.style.color = '#E03553'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.45)'}>
            <Search size={13} />
          </a>
        )}
      </div>
    </div>
  );
}

const TAG_OPTIONS = [
  'Great for families', 'Closest to venue', 'Budget-friendly', 'Where most guests are staying',
  'Premium option', 'Great for groups', 'Near the city', 'Near the airport', 'Parking available', 'Walk to venue',
];

function PropertyModal({ property, onSave, onClose }) {
  const [form, setForm] = useState(property || {
    id: `prop_${Date.now()}`, name: '', address: '', description: '',
    website: '', phone: '', bookingCode: '', coupleNote: '', tags: [],
    isMainGuestHotel: false, isClosestToVenue: false, isBestValue: false, isPinned: false, photoUrl: '',
  });

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const toggleTag = (tag) => set('tags', form.tags.includes(tag) ? form.tags.filter(t => t !== tag) : [...form.tags, tag]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#FFFFFF', width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#0A1930', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Hotel size={16} style={{ color: '#DDF762' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontFamily: PJS }}>
              {property ? 'Edit property' : 'Add property'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', padding: 4 }}><X size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Photo URL</label>
            <input value={form.photoUrl} onChange={e => set('photoUrl', e.target.value)} placeholder="https://…" style={inputStyle} />
            {form.photoUrl && <img src={form.photoUrl} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', marginTop: 6 }} onError={e => e.target.style.display = 'none'} />}
          </div>
          <GoogleField label="Property name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. The Grand Hotel" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Address</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full address" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Website</label>
              <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://…" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+61 2 …" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Group booking code</label>
            <input value={form.bookingCode} onChange={e => set('bookingCode', e.target.value)} placeholder="e.g. SMITHWEDDING2026" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Tags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TAG_OPTIONS.map(tag => {
                const active = form.tags.includes(tag);
                return (
                  <button key={tag} type="button" onClick={() => toggleTag(tag)}
                    style={{ padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: PJS,
                      background: active ? '#0A0A0A' : 'transparent',
                      color: active ? '#FFFFFF' : '#444444',
                      border: `1.5px solid ${active ? '#0A0A0A' : 'rgba(10,10,10,0.2)'}`,
                    }}>
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
          {[
            { key: 'isMainGuestHotel', label: 'Main guest hotel', desc: 'Where most guests are staying' },
            { key: 'isClosestToVenue', label: 'Closest to venue', desc: 'Featured as nearest option' },
            { key: 'isBestValue', label: 'Best value', desc: 'Featured as budget-friendly pick' },
            { key: 'isPinned', label: 'Pin to top', desc: 'Always show first' },
          ].map(opt => (
            <div key={opt.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid rgba(10,10,10,0.06)' }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>{opt.label}</span>
                <p style={{ margin: 0, fontSize: 12, color: '#444444', fontFamily: PJS }}>{opt.desc}</p>
              </div>
              <button type="button" onClick={() => set(opt.key, !form[opt.key])}
                style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: PJS,
                  background: form[opt.key] ? '#0A0A0A' : 'transparent',
                  color: form[opt.key] ? '#FFFFFF' : '#0A0A0A',
                  border: `1.5px solid ${form[opt.key] ? '#0A0A0A' : 'rgba(10,10,10,0.2)'}`,
                }}>
                {form[opt.key] ? 'Yes' : 'No'}
              </button>
            </div>
          ))}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(10,10,10,0.08)', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} className="btn-editorial-secondary" style={{ flex: 1, fontSize: 13 }}>Cancel</button>
          <button onClick={() => onSave(form)} className="btn-primary" style={{ flex: 2, fontSize: 13 }}>Save property</button>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { key: 'properties', label: 'Properties' },
  { key: 'overview',   label: 'Overview' },
  { key: 'notes',      label: 'Notes' },
];

export default function AccommodationPage() {
  const [accom, setAccom] = useState({});
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [activeTab, setActiveTab] = useState('properties');
  const [avaOpen, setAvaOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const autoSaveRef = useRef(null);
  const latestRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const r = (await getMyWeddingDetails()) || {};
      setAccom(r.accommodation || {});
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
    const next = { ...accom, ...patch };
    setAccom(next);
    const full = { ...latestRef.current, accommodation: next };
    latestRef.current = full;
    persist(full);
  };

  const properties = accom.manualProperties || [];

  const saveProperty = (prop) => {
    const updated = editingProperty
      ? properties.map(p => p.id === prop.id ? prop : p)
      : [...properties, prop];
    update({ manualProperties: updated });
    setShowModal(false);
    setEditingProperty(null);
  };

  const deleteProperty = (id) => {
    update({ manualProperties: properties.filter(p => p.id !== id) });
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} style={{ color: '#E03553' }} className="animate-spin" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Accommodation" subtitle="Plan and organise accommodation options for your wedding weekend" />

      {/* Ava button + save indicator */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <AvaButton label="Ask Ava about guest accommodation" onClick={() => setAvaOpen(true)} />
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

      <div style={{ padding: '32px 32px 48px' }}>

        {/* Properties tab */}
        {activeTab === 'properties' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <DetailsSection title="Accommodation options" icon={MapPin} defaultOpen>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {properties.length === 0 && (
                  <div style={{ padding: '32px 0', textAlign: 'center', border: '1px dashed rgba(10,10,10,0.15)' }}>
                    <p style={{ fontSize: 14, color: '#444444', fontFamily: PJS, margin: 0 }}>No properties added yet.</p>
                  </div>
                )}
                {properties.map(property => (
                  <div key={property.id} style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '14px 16px', display: 'flex', gap: 14 }}>
                    {property.photoUrl && (
                      <img src={property.photoUrl} alt={property.name} style={{ width: 80, height: 80, objectFit: 'cover', flexShrink: 0 }} onError={e => e.target.style.display = 'none'} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS }}>{property.name}</span>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button onClick={() => { setEditingProperty(property); setShowModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.6)', display: 'flex', padding: 4 }}><Edit size={13} /></button>
                          <button onClick={() => deleteProperty(property.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E03553', display: 'flex', padding: 4 }}><Trash2 size={13} /></button>
                        </div>
                      </div>
                      {property.address && <p style={{ margin: '0 0 6px', fontSize: 12, color: '#444444', fontFamily: PJS }}>{property.address}</p>}
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {property.tags?.slice(0, 3).map(tag => (
                          <span key={tag} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', padding: '2px 8px', background: 'rgba(10,10,10,0.06)', borderRadius: 999, color: '#444444', fontFamily: PJS }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => { setEditingProperty(null); setShowModal(true); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#E03553', fontWeight: 700, background: 'none', border: '1px dashed rgba(224,53,83,0.4)', borderRadius: 999, padding: '7px 14px', cursor: 'pointer', fontFamily: PJS, width: 'fit-content' }}>
                  <Plus size={12} />Add property
                </button>
              </div>
            </DetailsSection>
          </div>
        )}

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <DetailsSection title="Overview" icon={Hotel} defaultOpen>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Suggested check-in date</label>
                  <input type="date" style={inputStyle} value={accom.checkInDate || ''} onChange={e => update({ checkInDate: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={labelStyle}>Suggested check-out date</label>
                  <input type="date" style={inputStyle} value={accom.checkOutDate || ''} onChange={e => update({ checkOutDate: e.target.value })} />
                </div>
              </div>
              <SectionInput label="Note to guests" isTextarea value={accom.coupleNote} onChange={e => update({ coupleNote: e.target.value })} placeholder="We've gathered a few nearby places to stay for the wedding weekend…" />
            </DetailsSection>
          </div>
        )}

        {/* Notes tab */}
        {activeTab === 'notes' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <DetailsSection title="Notes" icon={FileText} defaultOpen>
              <SectionInput label="Additional accommodation notes" isTextarea value={accom.additionalNotes} onChange={e => update({ additionalNotes: e.target.value })} placeholder="Anything else guests should know about accommodation…" />
            </DetailsSection>
          </div>
        )}
      </div>

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Accommodation advisor"
        systemPrompt="You are Ava, a wedding accommodation advisor. Help recommend places to stay and plan guest accommodation."
        quickActions={["What should I consider when recommending accommodation?", "How do I negotiate a group rate at a hotel?", "What information should I include in an accommodation guide?", "Tips for guests travelling from interstate or overseas"]}
      />
      {showModal && <PropertyModal property={editingProperty} onSave={saveProperty} onClose={() => { setShowModal(false); setEditingProperty(null); }} />}
    </div>
  );
}
