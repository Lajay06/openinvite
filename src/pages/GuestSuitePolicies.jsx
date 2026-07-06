import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';
import { Loader2, Camera, Share2, Baby, Utensils, Gift, Shirt, Clock, FileText, Check, ClipboardList } from 'lucide-react';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import DetailsSection from '@/components/event-details/DetailsSection';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';
import toast from 'react-hot-toast';

const PJS = "'Plus Jakarta Sans', sans-serif";

const inputStyle = {
  width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 14, color: '#0A0A0A',
  fontFamily: PJS, outline: 'none', padding: '6px 0', boxSizing: 'border-box',
};
const textareaStyle = {
  width: '100%', border: '1px solid rgba(10,10,10,0.1)',
  padding: '10px 12px', fontSize: 14, outline: 'none', resize: 'vertical',
  boxSizing: 'border-box', fontFamily: PJS, lineHeight: 1.6, minHeight: 80, color: '#0A0A0A',
};
const fieldLabel = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
  color: 'rgba(10,10,10,0.4)', display: 'block', marginBottom: 6, fontFamily: PJS,
};

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: value ? '#22C55E' : '#DDDDDD', position: 'relative', padding: 0,
        flexShrink: 0, transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', width: 18, height: 18, borderRadius: '50%',
        background: '#fff', top: 3, left: value ? 23 : 3,
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

function DisplayToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(10,10,10,0.06)' }}>
      <Toggle value={value} onChange={onChange} />
      <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', fontFamily: PJS }}>Display on website</span>
    </div>
  );
}

const EMPTY = {
  photography: { unplugged: false, message: '', display: false },
  socialMedia:  { noCeremony: false, tagUs: false, hashtag: '', message: '', display: false },
  children:     { option: 'all', message: '', display: false },
  dietary:      { description: '', contactName: '', contactEmail: '', display: false },
  gifts:        { option: 'welcome', registryUrl: '', message: '', display: false },
  dressCode:    { guidance: '', weatherNote: '', display: false },
  lateArrival:  { policy: '', display: false },
  other:        { text: '', display: false },
  stylingQuestionnaire: { enabled: false },
};

export default function GuestSuitePolicies() {
  const [details, setDetails] = useState(null);
  const [policies, setPolicies] = useState(EMPTY);
  const [detailsId, setDetailsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [avaOpen, setAvaOpen] = useState(false);

  useEffect(() => {
    getMyWeddingDetails()
      .then(d => {
        setDetails(d);
        if (d) {
          setDetailsId(d.id);
          if (d.weddingPolicies) setPolicies(prev => ({ ...prev, ...d.weddingPolicies }));
        }
      })
      .catch(e => console.error('GuestSuitePolicies load error', e))
      .finally(() => setLoading(false));
  }, []);

  const set = (section, field, value) => {
    setPolicies(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  };

  const handleSave = async () => {
    if (!detailsId) { toast.error('No wedding details found'); return; }
    setSaveStatus('saving');
    try {
      await base44.entities.WeddingDetails.update(detailsId, { weddingPolicies: policies });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      toast.error('Failed to save');
      setSaveStatus('idle');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={24} style={{ color: '#E03553' }} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Policies" subtitle="Set clear expectations for your guests" />

      <div style={{ padding: '32px 32px 48px', maxWidth: 760, margin: '0 auto' }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <AvaButton label="Ask Ava" onClick={() => setAvaOpen(true)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: PJS, color: saveStatus === 'saved' ? '#6b7700' : 'rgba(10,10,10,0.35)', minWidth: 80 }}>
            {saveStatus === 'saving' && <><Loader2 size={12} className="animate-spin" />Saving…</>}
            {saveStatus === 'saved' && <><Check size={12} />Saved</>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>

          {/* Photography */}
          <DetailsSection title="Photography policy" icon={Camera}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <Toggle value={policies.photography.unplugged} onChange={v => set('photography', 'unplugged', v)} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS }}>Unplugged ceremony (no phones during ceremony)</span>
            </div>
            <div>
              <label style={fieldLabel}>Custom message</label>
              <textarea style={textareaStyle} value={policies.photography.message} onChange={e => set('photography', 'message', e.target.value)} placeholder="We'd love for you to be fully present during our ceremony…" />
            </div>
            <DisplayToggle value={policies.photography.display} onChange={v => set('photography', 'display', v)} />
          </DetailsSection>

          {/* Social media */}
          <DetailsSection title="Social media policy" icon={Share2}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <Toggle value={policies.socialMedia.noCeremony} onChange={v => set('socialMedia', 'noCeremony', v)} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS }}>No social media during ceremony</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <Toggle value={policies.socialMedia.tagUs} onChange={v => set('socialMedia', 'tagUs', v)} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS }}>Please tag us</span>
            </div>
            {policies.socialMedia.tagUs && (
              <div>
                <label style={fieldLabel}>Hashtag</label>
                <input style={inputStyle} value={policies.socialMedia.hashtag} onChange={e => set('socialMedia', 'hashtag', e.target.value)} placeholder="#JohnAndSarah2026" />
              </div>
            )}
            <div>
              <label style={fieldLabel}>Custom message</label>
              <textarea style={textareaStyle} value={policies.socialMedia.message} onChange={e => set('socialMedia', 'message', e.target.value)} placeholder="Feel free to share your memories after the ceremony…" />
            </div>
            <DisplayToggle value={policies.socialMedia.display} onChange={v => set('socialMedia', 'display', v)} />
          </DetailsSection>

          {/* Children */}
          <DetailsSection title="Children policy" icon={Baby}>
            <div>
              <label style={fieldLabel}>Policy</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
                {[
                  { value: 'all',           label: 'All children welcome' },
                  { value: 'wedding_party', label: 'Children of wedding party only' },
                  { value: 'adults_only',   label: 'Adults only' },
                ].map(opt => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#0A0A0A', fontFamily: PJS }}>
                    <input type="radio" name="children" value={opt.value} checked={policies.children.option === opt.value} onChange={() => set('children', 'option', opt.value)} style={{ accentColor: '#E03553' }} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={fieldLabel}>Custom message</label>
              <textarea style={textareaStyle} value={policies.children.message} onChange={e => set('children', 'message', e.target.value)} placeholder="We love your little ones…" rows={2} />
            </div>
            <DisplayToggle value={policies.children.display} onChange={v => set('children', 'display', v)} />
          </DetailsSection>

          {/* Dietary */}
          <DetailsSection title="Dietary & allergies" icon={Utensils}>
            <div>
              <label style={fieldLabel}>Available options</label>
              <textarea style={textareaStyle} value={policies.dietary.description} onChange={e => set('dietary', 'description', e.target.value)} placeholder="We offer vegetarian, vegan, and gluten-free options…" rows={2} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={fieldLabel}>Contact name</label>
                <input style={inputStyle} value={policies.dietary.contactName} onChange={e => set('dietary', 'contactName', e.target.value)} placeholder="Name" />
              </div>
              <div>
                <label style={fieldLabel}>Contact email</label>
                <input style={inputStyle} value={policies.dietary.contactEmail} onChange={e => set('dietary', 'contactEmail', e.target.value)} placeholder="email@example.com" />
              </div>
            </div>
            <DisplayToggle value={policies.dietary.display} onChange={v => set('dietary', 'display', v)} />
          </DetailsSection>

          {/* Gift */}
          <DetailsSection title="Gift policy" icon={Gift}>
            <div>
              <label style={fieldLabel}>Policy</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
                {[
                  { value: 'welcome',      label: 'Gifts welcome' },
                  { value: 'no_gifts',     label: 'No gifts please' },
                  { value: 'charity',      label: 'Charity donation preferred' },
                  { value: 'wishing_well', label: 'Wishing well (cash)' },
                ].map(opt => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#0A0A0A', fontFamily: PJS }}>
                    <input type="radio" name="gifts" value={opt.value} checked={policies.gifts.option === opt.value} onChange={() => set('gifts', 'option', opt.value)} style={{ accentColor: '#E03553' }} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            {policies.gifts.option === 'welcome' && (
              <div>
                <label style={fieldLabel}>Registry URL</label>
                <input style={inputStyle} value={policies.gifts.registryUrl} onChange={e => set('gifts', 'registryUrl', e.target.value)} placeholder="https://…" />
              </div>
            )}
            <div>
              <label style={fieldLabel}>Custom message</label>
              <textarea style={textareaStyle} value={policies.gifts.message} onChange={e => set('gifts', 'message', e.target.value)} placeholder="Your presence is the greatest gift…" rows={2} />
            </div>
            <DisplayToggle value={policies.gifts.display} onChange={v => set('gifts', 'display', v)} />
          </DetailsSection>

          {/* Dress code */}
          <DetailsSection title="Dress code" icon={Shirt}>
            <div>
              <label style={fieldLabel}>From event details</label>
              <input style={{ ...inputStyle, color: 'rgba(10,10,10,0.45)' }} value={details?.mainCeremony?.dressCode || ''} readOnly placeholder="Set in Event Details" />
            </div>
            <div>
              <label style={fieldLabel}>Expanded guidance</label>
              <textarea style={textareaStyle} value={policies.dressCode.guidance} onChange={e => set('dressCode', 'guidance', e.target.value)} placeholder="Formal attire — suits and ties for men, cocktail or formal dresses for women…" />
            </div>
            <div>
              <label style={fieldLabel}>Weather note</label>
              <input style={inputStyle} value={policies.dressCode.weatherNote} onChange={e => set('dressCode', 'weatherNote', e.target.value)} placeholder="e.g. Outdoor ceremony — flat heels recommended" />
            </div>
            <DisplayToggle value={policies.dressCode.display} onChange={v => set('dressCode', 'display', v)} />
          </DetailsSection>

          {/* Guest styling questionnaire */}
          <DetailsSection title="Guest styling questionnaire" icon={ClipboardList}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <Toggle value={policies.stylingQuestionnaire.enabled} onChange={v => set('stylingQuestionnaire', 'enabled', v)} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: PJS }}>Show a quick "what to wear" questionnaire on the Styling page</span>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', margin: 0, fontFamily: PJS, lineHeight: 1.6 }}>
              Guests pick the events they're attending, their style, and their budget — we instantly suggest an outfit based on your dress codes. No account needed, nothing is saved.
            </p>
          </DetailsSection>

          {/* Late arrival */}
          <DetailsSection title="Late arrival" icon={Clock}>
            <div>
              <label style={fieldLabel}>Policy</label>
              <textarea style={textareaStyle} value={policies.lateArrival.policy} onChange={e => set('lateArrival', 'policy', e.target.value)} placeholder="Our ceremony begins promptly at 3:00 PM. Please arrive by 2:45 PM." rows={2} />
            </div>
            <DisplayToggle value={policies.lateArrival.display} onChange={v => set('lateArrival', 'display', v)} />
          </DetailsSection>

          {/* Other */}
          <DetailsSection title="Other policies" icon={FileText}>
            <div>
              <textarea style={textareaStyle} value={policies.other.text} onChange={e => set('other', 'text', e.target.value)} placeholder="Any additional policies or information for your guests…" rows={4} />
            </div>
            <DisplayToggle value={policies.other.display} onChange={v => set('other', 'display', v)} />
          </DetailsSection>

        </div>

        <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.4)', margin: '20px 0 16px', fontStyle: 'italic', fontFamily: PJS }}>
          Policies marked "Display on website" will appear in the Policies section of your wedding website and Experience Guide.
        </p>

        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="btn-primary"
          style={{ opacity: saveStatus === 'saving' ? 0.6 : 1 }}
        >
          {saveStatus === 'saving' ? 'Saving…' : 'Save policies'}
        </button>
      </div>

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Wedding policies"
        systemPrompt="You are Ava, a wedding planning expert. Help the couple write clear, warm, and professional wedding policies for their guests — covering photography, social media, children, dietary needs, gifts, dress code, and late arrival. Keep policies friendly but clear."
        quickActions={[
          'Write an unplugged ceremony message',
          'Draft a children policy for adults-only wedding',
          'Suggest a dress code note for outdoor venue',
          'Write a polite no-gifts policy message',
        ]}
      />
    </div>
  );
}
