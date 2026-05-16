import React, { useState, useEffect, useRef } from "react";
import { WeddingDetails } from "@/entities/WeddingDetails";
import { InvokeLLM } from "@/integrations/Core";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Bus, Car, Truck, FileText, Lightbulb, Loader2, X, Plus, Check, Search } from "lucide-react";
import DetailsSection from "../components/event-details/DetailsSection";
import SectionInput from "../components/event-details/SectionInput";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const inputStyle = {
  width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 14, color: '#0A0A0A',
  fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', padding: '6px 0',
  boxSizing: 'border-box',
};

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function PillToggle({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      <button type="button" onClick={() => onChange(!value)}
        style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Plus Jakarta Sans', sans-serif", width: 'fit-content',
          background: value ? '#0A0A0A' : 'transparent',
          color: value ? '#FFFFFF' : '#0A0A0A',
          border: `1.5px solid ${value ? '#0A0A0A' : 'rgba(10,10,10,0.2)'}`,
        }}>
        {value ? 'Yes' : 'No'}
      </button>
    </div>
  );
}

function GoogleField({ label, value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <input style={{ ...inputStyle, flex: 1 }} value={value || ''} onChange={onChange} placeholder={placeholder} />
        {value && (
          <a href={`https://www.google.com/search?q=${encodeURIComponent(value)}`} target="_blank" rel="noopener noreferrer"
            title="Search on Google"
            style={{ color: 'rgba(10,10,10,0.3)', flexShrink: 0, display: 'flex', alignItems: 'center', paddingBottom: 7 }}
            onMouseEnter={e => e.currentTarget.style.color = '#E03553'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.3)'}>
            <Search size={13} />
          </a>
        )}
      </div>
    </div>
  );
}

const AVA_PROMPTS = [
  "What transport should I arrange for wedding guests?",
  "How do I coordinate guest transport to a remote venue?",
  "Tips for organising a shuttle bus service for a wedding",
  "How much does wedding guest transport typically cost?",
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
      const res = await InvokeLLM({ prompt: `Wedding transport planning: ${question}` });
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
            <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Ask Ava — transport</span>
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

export default function TransportPage() {
  const [transport, setTransport] = useState({});
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
      setTransport(r.transport || {});
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
    const next = { ...transport, ...patch };
    setTransport(next);
    const full = { ...latestRef.current, transport: next };
    latestRef.current = full;
    persist(full);
  };

  const updateParking = (patch) => {
    update({ parking: { ...transport.parking, ...patch } });
  };

  const updatePublicTransport = (patch) => {
    update({ publicTransport: { ...transport.publicTransport, ...patch } });
  };

  const updateRideshare = (patch) => {
    update({ rideshare: { ...transport.rideshare, ...patch } });
  };

  const parking = transport.parking || {};
  const pt = transport.publicTransport || {};
  const rs = transport.rideshare || {};
  const shuttles = transport.shuttles || [];
  const carParks = parking.nearbyCarParks || [];
  const routes = pt.routes || [];

  const addCarPark = () => updateParking({ nearbyCarParks: [...carParks, { name: '', address: '', distance: '', cost: '' }] });
  const updateCarPark = (i, field, val) => {
    const updated = carParks.map((cp, idx) => idx === i ? { ...cp, [field]: val } : cp);
    updateParking({ nearbyCarParks: updated });
  };
  const removeCarPark = (i) => updateParking({ nearbyCarParks: carParks.filter((_, idx) => idx !== i) });

  const addRoute = () => updatePublicTransport({ routes: [...routes, { type: 'train', notes: '', totalTime: '' }] });
  const updateRoute = (i, field, val) => {
    const updated = routes.map((r, idx) => idx === i ? { ...r, [field]: val } : r);
    updatePublicTransport({ routes: updated });
  };
  const removeRoute = (i) => updatePublicTransport({ routes: routes.filter((_, idx) => idx !== i) });

  const addShuttle = () => update({ shuttles: [...shuttles, { id: `s_${Date.now()}`, name: '', type: 'coach', pickupLocation: '', pickupTime: '', returnTime: '', dropoffLocation: '', capacity: '', contact: '', notes: '' }] });
  const updateShuttle = (i, field, val) => {
    const updated = shuttles.map((s, idx) => idx === i ? { ...s, [field]: val } : s);
    update({ shuttles: updated });
  };
  const removeShuttle = (id) => update({ shuttles: shuttles.filter(s => s.id !== id) });

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} style={{ color: '#E03553' }} className="animate-spin" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Transport" subtitle="Help your guests get to and from your wedding" />

      <div style={{ padding: '32px 32px 48px' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <button onClick={() => setShowAva(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 999, background: '#0A1930', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <Lightbulb size={14} style={{ color: '#DDF762' }} />Ask Ava
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", color: saveStatus === 'saved' ? '#6b7700' : 'rgba(10,10,10,0.35)', minWidth: 80 }}>
            {saveStatus === 'saving' && <><Loader2 size={12} className="animate-spin" />Saving…</>}
            {saveStatus === 'saved' && <><Check size={12} />Saved</>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Overview */}
          <DetailsSection title="Overview" icon={MapPin}>
            <Field label="Note to guests">
              <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                value={transport.coupleNote || ''}
                onChange={e => update({ coupleNote: e.target.value })}
                placeholder="We've arranged the easiest ways to get to and from our wedding…" />
            </Field>
            <Field label="Recommended transport mode">
              <Select value={transport.recommendedMode || ''} onValueChange={v => update({ recommendedMode: v })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rideshare">Rideshare / taxi</SelectItem>
                  <SelectItem value="drive">Drive & park</SelectItem>
                  <SelectItem value="public">Public transport</SelectItem>
                  <SelectItem value="shuttle">Couple's shuttle</SelectItem>
                  <SelectItem value="walk">Walk</SelectItem>
                  <SelectItem value="hire">Car hire</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </DetailsSection>

          {/* Parking */}
          <DetailsSection title="Parking" icon={Car}>
            <PillToggle label="Parking available at venue" value={parking.venueParking || false} onChange={v => updateParking({ venueParking: v })} />
            {parking.venueParking && (
              <SectionInput label="Venue parking notes" isTextarea value={parking.venueParkingNotes} onChange={e => updateParking({ venueParkingNotes: e.target.value })} placeholder="e.g. 200 spaces, free for guests" />
            )}
            <SectionInput label="Street parking" isTextarea value={parking.streetParking} onChange={e => updateParking({ streetParking: e.target.value })} placeholder="e.g. Available on Church Street, free after 6pm" />
            <SectionInput label="Accessibility parking" value={parking.accessibilityNotes} onChange={e => updateParking({ accessibilityNotes: e.target.value })} placeholder="e.g. 4 accessible spaces at main entrance" />
            {/* Car parks list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={labelStyle}>Nearby car parks</label>
                <button onClick={addCarPark} style={{ fontSize: 12, color: '#E03553', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Plus size={11} />Add
                </button>
              </div>
              {carParks.map((cp, i) => (
                <div key={i} style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <input value={cp.name || ''} onChange={e => updateCarPark(i, 'name', e.target.value)} placeholder="Car park name" style={inputStyle} />
                    <input value={cp.address || ''} onChange={e => updateCarPark(i, 'address', e.target.value)} placeholder="Address" style={inputStyle} />
                    <input value={cp.distance || ''} onChange={e => updateCarPark(i, 'distance', e.target.value)} placeholder="Distance" style={inputStyle} />
                    <input value={cp.cost || ''} onChange={e => updateCarPark(i, 'cost', e.target.value)} placeholder="Cost" style={inputStyle} />
                  </div>
                  <button onClick={() => removeCarPark(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E03553', fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4, padding: 0, width: 'fit-content' }}>
                    <X size={12} />Remove
                  </button>
                </div>
              ))}
            </div>
          </DetailsSection>

          {/* Public transport */}
          <DetailsSection title="Public transport" icon={Bus}>
            <SectionInput label="General notes" isTextarea value={pt.generalNotes} onChange={e => updatePublicTransport({ generalNotes: e.target.value })} placeholder="e.g. Services run until midnight. Night buses available after that." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={labelStyle}>Routes</label>
                <button onClick={addRoute} style={{ fontSize: 12, color: '#E03553', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Plus size={11} />Add route
                </button>
              </div>
              {routes.map((route, i) => (
                <div key={i} style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 100px', gap: 12, alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={labelStyle}>Type</label>
                      <select value={route.type || 'train'} onChange={e => updateRoute(i, 'type', e.target.value)} style={{ ...inputStyle }}>
                        <option value="train">Train</option>
                        <option value="bus">Bus</option>
                        <option value="tram">Tram</option>
                        <option value="metro">Metro</option>
                        <option value="ferry">Ferry</option>
                      </select>
                    </div>
                    <input value={route.notes || ''} onChange={e => updateRoute(i, 'notes', e.target.value)} placeholder="Route summary" style={inputStyle} />
                    <input value={route.totalTime || ''} onChange={e => updateRoute(i, 'totalTime', e.target.value)} placeholder="Travel time" style={inputStyle} />
                  </div>
                  <button onClick={() => removeRoute(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E03553', fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4, padding: 0, width: 'fit-content' }}>
                    <X size={12} />Remove
                  </button>
                </div>
              ))}
            </div>
          </DetailsSection>

          {/* Rideshare */}
          <DetailsSection title="Rideshare & taxi" icon={Car}>
            <SectionInput label="Suggested pickup location" value={rs.pickupLocation} onChange={e => updateRideshare({ pickupLocation: e.target.value })} placeholder="e.g. Main entrance on Church St" />
            <SectionInput label="Suggested drop-off location" value={rs.dropoffLocation} onChange={e => updateRideshare({ dropoffLocation: e.target.value })} placeholder="e.g. Drop off on King St" />
            <SectionInput label="Late-night note" value={rs.lateNightNote} onChange={e => updateRideshare({ lateNightNote: e.target.value })} placeholder="e.g. Ubers can be limited after 11pm" />
          </DetailsSection>

          {/* Shuttles */}
          <DetailsSection title="Couple-arranged transport" icon={Truck}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {shuttles.map((shuttle, i) => (
                <div key={shuttle.id} style={{ border: '1px solid rgba(10,10,10,0.08)', padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{shuttle.name || `Transport ${i + 1}`}</span>
                    <button onClick={() => removeShuttle(shuttle.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E03553', display: 'flex', padding: 4 }}><X size={14} /></button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <GoogleField label="Service name" value={shuttle.name} onChange={e => updateShuttle(i, 'name', e.target.value)} placeholder="e.g. Coach Company Name" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={labelStyle}>Vehicle type</label>
                      <select value={shuttle.type || 'coach'} onChange={e => updateShuttle(i, 'type', e.target.value)} style={inputStyle}>
                        <option value="coach">Coach</option>
                        <option value="shuttle">Shuttle bus</option>
                        <option value="minibus">Minibus</option>
                        <option value="transfer">Transfer</option>
                        <option value="limo">Limousine</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={labelStyle}>Pickup location</label>
                      <input style={inputStyle} value={shuttle.pickupLocation || ''} onChange={e => updateShuttle(i, 'pickupLocation', e.target.value)} placeholder="e.g. The Grand Hotel lobby" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={labelStyle}>Pickup time</label>
                      <input style={inputStyle} value={shuttle.pickupTime || ''} onChange={e => updateShuttle(i, 'pickupTime', e.target.value)} placeholder="e.g. 2:45 PM" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={labelStyle}>Drop-off location</label>
                      <input style={inputStyle} value={shuttle.dropoffLocation || ''} onChange={e => updateShuttle(i, 'dropoffLocation', e.target.value)} placeholder="e.g. Ceremony venue" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={labelStyle}>Return time</label>
                      <input style={inputStyle} value={shuttle.returnTime || ''} onChange={e => updateShuttle(i, 'returnTime', e.target.value)} placeholder="e.g. 11:30 PM" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={labelStyle}>Capacity</label>
                      <input style={inputStyle} value={shuttle.capacity || ''} onChange={e => updateShuttle(i, 'capacity', e.target.value)} placeholder="e.g. 48 seats" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={labelStyle}>Contact</label>
                      <input style={inputStyle} value={shuttle.contact || ''} onChange={e => updateShuttle(i, 'contact', e.target.value)} placeholder="Name or phone number" />
                    </div>
                  </div>
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={labelStyle}>Notes to guests</label>
                    <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={shuttle.notes || ''} onChange={e => updateShuttle(i, 'notes', e.target.value)} placeholder="Any instructions for guests boarding this transport" />
                  </div>
                </div>
              ))}
              <button onClick={addShuttle}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#E03553', fontWeight: 700, background: 'none', border: '1px dashed rgba(224,53,83,0.4)', borderRadius: 999, padding: '7px 14px', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", width: 'fit-content' }}>
                <Plus size={12} />Add transport
              </button>
            </div>
          </DetailsSection>

          {/* Notes */}
          <DetailsSection title="Notes" icon={FileText}>
            <SectionInput label="Additional transport notes" isTextarea value={transport.freeTextNotes} onChange={e => update({ freeTextNotes: e.target.value })} placeholder="Any other transport details for guests…" />
          </DetailsSection>
        </div>
      </div>

      {showAva && <AvaModal onClose={() => setShowAva(false)} />}
    </div>
  );
}
