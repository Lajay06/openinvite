import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import toast from 'react-hot-toast';

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: value ? '#22C55E' : '#DDDDDD', position: 'relative', padding: 0, flexShrink: 0, transition: 'background 0.2s' }}>
      <div style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', background: '#fff', top: 3, left: value ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

function PolicySection({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid #EEEEEE', marginBottom: 12 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: open ? '#FAFAFA' : '#FFFFFF', border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", borderBottom: open ? '1px solid #EEEEEE' : 'none' }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A' }}>{title}</span>
        {open ? <ChevronUp size={16} color="#888" /> : <ChevronDown size={16} color="#888" />}
      </button>
      {open && <div style={{ padding: '20px' }}>{children}</div>}
    </div>
  );
}

const inputStyle = { width: '100%', borderBottom: '1px solid #DDD', border: 'none', padding: '8px 0', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: "'Plus Jakarta Sans', sans-serif" };
const textareaStyle = { width: '100%', border: '1px solid #EEEEEE', padding: '10px 12px', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.6, minHeight: 80 };

function DisplayToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid #F5F5F5' }}>
      <Toggle value={value} onChange={onChange} />
      <span style={{ fontSize: 12, color: '#888', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Display on website</span>
    </div>
  );
}

export default function PoliciesTab({ details }) {
  const [policies, setPolicies] = useState({
    photography: { unplugged: false, message: '', display: false },
    socialMedia: { noCeremony: false, tagUs: false, hashtag: '', message: '', display: false },
    children: { option: 'all', message: '', display: false },
    dietary: { description: '', contactName: '', contactEmail: '', display: false },
    gifts: { option: 'welcome', registryUrl: '', message: '', display: false },
    dressCode: { guidance: '', weatherNote: '', display: false },
    lateArrival: { policy: '', display: false },
    other: { text: '', display: false },
  });
  const [saving, setSaving] = useState(false);
  const [detailsId, setDetailsId] = useState(null);

  useEffect(() => {
    if (details) {
      setDetailsId(details.id);
      if (details.weddingPolicies) {
        setPolicies(prev => ({ ...prev, ...details.weddingPolicies }));
      }
    }
  }, [details]);

  const set = (section, field, value) => {
    setPolicies(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.WeddingDetails.update(detailsId, { weddingPolicies: policies });
      toast.success('Policies saved');
    } catch {
      toast.error('Failed to save');
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: 24, maxWidth: 760, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>POLICIES</p>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', margin: '0 0 8px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Wedding Policies</h2>
        <p style={{ fontSize: 14, color: '#888', margin: 0 }}>Set clear expectations for your guests. These can be displayed on your wedding website and included in your Experience Guide.</p>
      </div>

      {/* Photography */}
      <PolicySection title="Photography Policy">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Toggle value={policies.photography.unplugged} onChange={v => set('photography', 'unplugged', v)} />
          <label style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>Unplugged ceremony (no phones during ceremony)</label>
        </div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Custom Message</label>
        <textarea style={textareaStyle} value={policies.photography.message} onChange={e => set('photography', 'message', e.target.value)} placeholder="We'd love for you to be fully present during our ceremony..." />
        <DisplayToggle value={policies.photography.display} onChange={v => set('photography', 'display', v)} />
      </PolicySection>

      {/* Social Media */}
      <PolicySection title="Social Media Policy">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Toggle value={policies.socialMedia.noCeremony} onChange={v => set('socialMedia', 'noCeremony', v)} />
          <label style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>No social media during ceremony</label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Toggle value={policies.socialMedia.tagUs} onChange={v => set('socialMedia', 'tagUs', v)} />
          <label style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>Please tag us</label>
        </div>
        {policies.socialMedia.tagUs && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Hashtag</label>
            <input style={inputStyle} value={policies.socialMedia.hashtag} onChange={e => set('socialMedia', 'hashtag', e.target.value)} placeholder="#JohnAndSarah2026" />
          </div>
        )}
        <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Custom Message</label>
        <textarea style={textareaStyle} value={policies.socialMedia.message} onChange={e => set('socialMedia', 'message', e.target.value)} placeholder="Feel free to share your memories after the ceremony..." />
        <DisplayToggle value={policies.socialMedia.display} onChange={v => set('socialMedia', 'display', v)} />
      </PolicySection>

      {/* Children */}
      <PolicySection title="Children Policy">
        <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>Policy</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {[
            { value: 'all', label: 'All children welcome' },
            { value: 'wedding_party', label: 'Children of wedding party only' },
            { value: 'adults_only', label: 'Adults only' },
          ].map(opt => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#0A0A0A' }}>
              <input type="radio" name="children" value={opt.value} checked={policies.children.option === opt.value} onChange={() => set('children', 'option', opt.value)} style={{ accentColor: '#E03553' }} />
              {opt.label}
            </label>
          ))}
        </div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Custom Message</label>
        <textarea style={textareaStyle} value={policies.children.message} onChange={e => set('children', 'message', e.target.value)} placeholder="We love your little ones..." rows={2} />
        <DisplayToggle value={policies.children.display} onChange={v => set('children', 'display', v)} />
      </PolicySection>

      {/* Dietary */}
      <PolicySection title="Dietary & Allergies">
        <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Available Options</label>
        <textarea style={textareaStyle} value={policies.dietary.description} onChange={e => set('dietary', 'description', e.target.value)} placeholder="We offer vegetarian, vegan, and gluten-free options..." rows={2} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Contact Name</label>
            <input style={inputStyle} value={policies.dietary.contactName} onChange={e => set('dietary', 'contactName', e.target.value)} placeholder="Name" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Contact Email</label>
            <input style={inputStyle} value={policies.dietary.contactEmail} onChange={e => set('dietary', 'contactEmail', e.target.value)} placeholder="email@example.com" />
          </div>
        </div>
        <DisplayToggle value={policies.dietary.display} onChange={v => set('dietary', 'display', v)} />
      </PolicySection>

      {/* Gifts */}
      <PolicySection title="Gift Policy">
        <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 8 }}>Policy</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {[
            { value: 'welcome', label: 'Gifts welcome' },
            { value: 'no_gifts', label: 'No gifts please' },
            { value: 'charity', label: 'Charity donation preferred' },
            { value: 'wishing_well', label: 'Wishing well (cash)' },
          ].map(opt => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#0A0A0A' }}>
              <input type="radio" name="gifts" value={opt.value} checked={policies.gifts.option === opt.value} onChange={() => set('gifts', 'option', opt.value)} style={{ accentColor: '#E03553' }} />
              {opt.label}
            </label>
          ))}
        </div>
        {policies.gifts.option === 'welcome' && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Registry URL</label>
            <input style={inputStyle} value={policies.gifts.registryUrl} onChange={e => set('gifts', 'registryUrl', e.target.value)} placeholder="https://..." />
          </div>
        )}
        <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Custom Message</label>
        <textarea style={textareaStyle} value={policies.gifts.message} onChange={e => set('gifts', 'message', e.target.value)} placeholder="Your presence is the greatest gift..." rows={2} />
        <DisplayToggle value={policies.gifts.display} onChange={v => set('gifts', 'display', v)} />
      </PolicySection>

      {/* Dress Code */}
      <PolicySection title="Dress Code">
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>From Event Details</label>
          <input style={{ ...inputStyle, color: '#888' }} value={details?.mainCeremony?.dressCode || ''} readOnly placeholder="Set in Event Details" />
        </div>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Expanded Guidance</label>
        <textarea style={textareaStyle} value={policies.dressCode.guidance} onChange={e => set('dressCode', 'guidance', e.target.value)} placeholder="Formal attire — suits and ties for men, cocktail or formal dresses for women..." />
        <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6, marginTop: 12 }}>Weather Note</label>
        <input style={inputStyle} value={policies.dressCode.weatherNote} onChange={e => set('dressCode', 'weatherNote', e.target.value)} placeholder="e.g. Outdoor ceremony — flat heels recommended" />
        <DisplayToggle value={policies.dressCode.display} onChange={v => set('dressCode', 'display', v)} />
      </PolicySection>

      {/* Late Arrival */}
      <PolicySection title="Late Arrival">
        <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Policy</label>
        <textarea style={textareaStyle} value={policies.lateArrival.policy} onChange={e => set('lateArrival', 'policy', e.target.value)} placeholder="Our ceremony begins promptly at 3:00 PM. Please arrive by 2:45 PM." rows={2} />
        <DisplayToggle value={policies.lateArrival.display} onChange={v => set('lateArrival', 'display', v)} />
      </PolicySection>

      {/* Other */}
      <PolicySection title="Other Policies">
        <textarea style={textareaStyle} value={policies.other.text} onChange={e => set('other', 'text', e.target.value)} placeholder="Any additional policies or information for your guests..." rows={4} />
        <DisplayToggle value={policies.other.display} onChange={v => set('other', 'display', v)} />
      </PolicySection>

      <p style={{ fontSize: 12, color: '#888', marginBottom: 16, marginTop: 8, fontStyle: 'italic' }}>
        Policies marked "Display on website" will appear in the Policies section of your wedding website and Experience Guide.
      </p>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #E03553, #803D81)', color: '#FFF', border: 'none', fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {saving ? 'Saving…' : 'Save Policies'}
      </button>
    </div>
  );
}