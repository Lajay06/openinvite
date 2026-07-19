import React, { useState } from 'react';
import { Plus, X, Star } from 'lucide-react';
import {
  MockPageHeader, MockTabBar, AccordionSection, VendorTabMock, NotesTabMock, ConsiderationsTabMock,
  PJS, labelStyle, inputStyle, SAMPLE_MY_VENDORS,
} from '@/components/mocks/VendorTemplateMock';

const TABS = [
  { key: 'beauty', label: 'Beauty' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'notes', label: 'Notes' },
  { key: 'considerations', label: 'Considerations' },
];

const FILLED_DATA = {
  hairArtist: 'Studio Bella Hair',
  makeupArtist: 'Glow Beauty Collective',
  styleNotes: 'Soft romantic waves, natural glam makeup — dewy skin, not too much contour.',
  hairInspo: 'Pinterest board: "soft bridal waves 2026" — leaning towards a low side-swept style with a few loose face-framing pieces.',
  gettingReadyPeople: [
    { id: 1, name: 'Ava Chen', role: 'Bride', service: 'both' },
    { id: 2, name: 'Priya Shah', role: 'Maid of honour', service: 'both' },
    { id: 3, name: 'Ruby Nguyen', role: 'Bridesmaid', service: 'hair' },
    { id: 4, name: 'Mum', role: 'Mother of the bride', service: 'makeup' },
  ],
  skincareTimeline: [
    { id: 'm1', timeframe: '6 months before', treatment: 'Start monthly facials', notes: '', done: true },
    { id: 'm2', timeframe: '2 weeks before', treatment: 'Final facial, no extractions', notes: 'Book with usual therapist', done: false },
  ],
  trials: [
    { id: 1, date: '2026-08-14', artist: 'Studio Bella Hair', lookDescription: 'Soft waves with a braided crown detail', rating: 4, notes: 'Loved it — book this exact look' },
  ],
  notes: '',
};

const EMPTY_DATA = {
  hairArtist: '', makeupArtist: '', styleNotes: '', hairInspo: '',
  gettingReadyPeople: [], skincareTimeline: [], trials: [], notes: '',
};

function StarRow({ value }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} size={13} fill={n <= value ? '#E03553' : 'none'} style={{ color: n <= value ? '#E03553' : 'rgba(10,10,10,0.2)' }} />
      ))}
    </div>
  );
}

export default function MockVendorTemplateBeauty() {
  const [filled, setFilled] = useState(true);
  const [tab, setTab] = useState('beauty');
  const [vendor, setVendor] = useState(null);
  const [data, setData] = useState(filled ? FILLED_DATA : EMPTY_DATA);

  const toggleFilled = () => {
    const next = !filled;
    setFilled(next);
    setData(next ? FILLED_DATA : EMPTY_DATA);
    setVendor(next ? SAMPLE_MY_VENDORS[0] : null);
  };

  const update = (patch) => setData(prev => ({ ...prev, ...patch }));

  const hairMakeupSummary = data.hairArtist || data.makeupArtist
    ? [data.hairArtist && `Hair: ${data.hairArtist}`, data.makeupArtist && `Makeup: ${data.makeupArtist}`].filter(Boolean).join(' · ')
    : 'Not started';

  const partySummary = data.gettingReadyPeople.length > 0
    ? `${data.gettingReadyPeople.length} ${data.gettingReadyPeople.length === 1 ? 'person' : 'people'} in the getting-ready schedule`
    : 'No one added yet';

  const skincareSummary = data.skincareTimeline.length > 0
    ? `${data.skincareTimeline.length} milestone${data.skincareTimeline.length === 1 ? '' : 's'} · ${data.skincareTimeline.filter(m => m.done).length} completed`
    : 'No milestones yet';

  const trialsSummary = data.trials.length > 0
    ? `${data.trials.length} trial${data.trials.length === 1 ? '' : 's'} scheduled`
    : 'No trials scheduled yet';

  const hairCount = data.gettingReadyPeople.filter(p => p.service === 'hair' || p.service === 'both').length;
  const makeupCount = data.gettingReadyPeople.filter(p => p.service === 'makeup' || p.service === 'both').length;

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <div style={{ padding: '10px 32px', background: 'rgba(224,53,83,0.04)', borderBottom: '1px solid rgba(224,53,83,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#E03553', fontFamily: PJS }}>MOCK — vendor template preview (Beauty)</span>
        <button onClick={toggleFilled} className="btn-editorial-secondary" style={{ fontSize: 11 }}>
          {filled ? 'Show empty (first-time) state' : 'Show filled example'}
        </button>
      </div>

      <MockPageHeader title="Beauty" subtitle="Hair, makeup and beauty planning for your wedding day" />
      <MockTabBar tabs={TABS} active={tab} onChange={setTab} />

      <div style={{ padding: '32px 32px 48px' }}>
        {tab === 'beauty' && (
          <div style={{ maxWidth: 760 }}>
            <AccordionSection title="Hair & makeup" summary={hairMakeupSummary}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Hair artist</label>
                  <input style={{ ...inputStyle, marginTop: 6 }} value={data.hairArtist} onChange={e => update({ hairArtist: e.target.value })} placeholder="Hair artist name" />
                </div>
                <div>
                  <label style={labelStyle}>Makeup artist</label>
                  <input style={{ ...inputStyle, marginTop: 6 }} value={data.makeupArtist} onChange={e => update({ makeupArtist: e.target.value })} placeholder="Makeup artist name" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Style notes</label>
                <textarea style={{ ...inputStyle, marginTop: 6, resize: 'vertical', minHeight: 60 }} value={data.styleNotes} onChange={e => update({ styleNotes: e.target.value })} placeholder="Describe your desired look…" />
              </div>
              <div>
                <label style={labelStyle}>Hair inspiration</label>
                <textarea style={{ ...inputStyle, marginTop: 6, resize: 'vertical', minHeight: 60 }} value={data.hairInspo} onChange={e => update({ hairInspo: e.target.value })} placeholder="Paste Pinterest links, describe styles…" />
              </div>
            </AccordionSection>

            <AccordionSection title="Wedding party" summary={partySummary}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>Who's getting hair and/or makeup done</span>
                <button className="btn-primary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Plus size={11} />Add person
                </button>
              </div>
              {data.gettingReadyPeople.length === 0 ? (
                <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>No one added yet. Click "Add person" to start building your getting ready list.</p>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px 24px', gap: 10, padding: '0 0 8px', borderBottom: '1px solid rgba(10,10,10,0.08)', marginBottom: 8 }}>
                    {['Name', 'Role', 'Service', ''].map(h => <span key={h} style={{ ...labelStyle, fontSize: 10 }}>{h}</span>)}
                  </div>
                  {data.gettingReadyPeople.map(p => (
                    <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px 24px', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontFamily: PJS, color: '#0A0A0A' }}>{p.name}</span>
                      <span style={{ fontSize: 13, fontFamily: PJS, color: '#444444' }}>{p.role}</span>
                      <span style={{ fontSize: 12, fontFamily: PJS, color: 'rgba(10,10,10,0.5)', textTransform: 'capitalize' }}>{p.service}</span>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.3)', display: 'flex' }}><X size={13} /></button>
                    </div>
                  ))}
                  <div style={{ background: 'rgba(10,10,10,0.03)', padding: '12px 14px', marginTop: 10 }}>
                    <p style={{ fontSize: 13, fontFamily: PJS, color: '#0A0A0A', margin: 0 }}>
                      Getting ready time: <strong>{hairCount * 60 + makeupCount * 45} min</strong> ({hairCount} hair × 60, {makeupCount} makeup × 45)
                    </p>
                  </div>
                </div>
              )}
            </AccordionSection>

            <AccordionSection title="Skincare timeline" summary={skincareSummary}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <button className="btn-primary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Plus size={11} />Add milestone
                </button>
              </div>
              {data.skincareTimeline.length === 0 ? (
                <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>No milestones yet.</p>
              ) : (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 50px', gap: 14, padding: '0 0 8px', borderBottom: '1px solid rgba(10,10,10,0.08)', marginBottom: 8 }}>
                    {['Timeframe', 'Treatment', 'Notes', 'Done'].map(h => <span key={h} style={{ ...labelStyle, fontSize: 10 }}>{h}</span>)}
                  </div>
                  {data.skincareTimeline.map(m => (
                    <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 50px', gap: 14, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(10,10,10,0.05)' }}>
                      <span style={{ fontSize: 13, fontFamily: PJS, color: '#0A0A0A' }}>{m.timeframe}</span>
                      <span style={{ fontSize: 13, fontFamily: PJS, color: '#444444' }}>{m.treatment}</span>
                      <span style={{ fontSize: 12, fontFamily: PJS, color: 'rgba(10,10,10,0.6)' }}>{m.notes || '—'}</span>
                      <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${m.done ? '#E03553' : 'rgba(10,10,10,0.25)'}`, background: m.done ? '#E03553' : 'transparent' }} />
                    </div>
                  ))}
                </div>
              )}
            </AccordionSection>

            <AccordionSection title="Trials" summary={trialsSummary}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <button className="btn-primary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Plus size={11} />Schedule trial
                </button>
              </div>
              {data.trials.length === 0 ? (
                <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS }}>No trials scheduled yet.</p>
              ) : (
                data.trials.map(t => (
                  <div key={t.id} style={{ padding: '14px 0', borderBottom: '1px solid rgba(10,10,10,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: 0 }}>{t.artist}</p>
                        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: '2px 0 0' }}>{t.date}</p>
                      </div>
                      <StarRow value={t.rating} />
                    </div>
                    <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, margin: 0 }}>{t.lookDescription}</p>
                  </div>
                ))
              )}
            </AccordionSection>
          </div>
        )}

        {tab === 'vendor' && (
          <VendorTabMock category="beauty" vendor={vendor} setVendor={setVendor} myVendors={SAMPLE_MY_VENDORS} />
        )}

        {tab === 'notes' && (
          <NotesTabMock value={data.notes} onChange={v => update({ notes: v })} placeholder="Anything else about your beauty plans…" />
        )}

        {tab === 'considerations' && <ConsiderationsTabMock pageKey="beauty" />}
      </div>
    </div>
  );
}
