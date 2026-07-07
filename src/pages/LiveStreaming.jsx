import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { getMyLiveStream } from '@/lib/resolveMyWedding';
import { Video, Loader2, Check, Radio, ExternalLink } from "lucide-react";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';

const PJS = "'Plus Jakarta Sans', sans-serif";

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: PJS,
};

const inputStyle = {
  width: '100%', border: 'none', borderBottom: '1px solid rgba(10,10,10,0.18)',
  background: 'none', fontSize: 14, color: '#0A0A0A',
  fontFamily: PJS, outline: 'none', padding: '6px 0',
  boxSizing: 'border-box', transition: 'border-color 0.15s',
};

function UInput({ label, value, onChange, placeholder = '', type = 'text', multiline = false }) {
  const [focused, setFocused] = useState(false);
  const style = {
    ...inputStyle,
    borderBottomColor: focused ? '#E03553' : 'rgba(10,10,10,0.18)',
    borderBottomWidth: focused ? 2 : 1,
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={labelStyle}>{label}</label>
      {multiline ? (
        <textarea
          value={value || ''}
          onChange={onChange}
          placeholder={placeholder}
          rows={3}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ ...style, resize: 'vertical', lineHeight: 1.6 }}
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={style}
        />
      )}
    </div>
  );
}

function detectStreamType(url) {
  if (!url) return 'custom';
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
  if (/vimeo\.com/.test(url)) return 'vimeo';
  if (/zoom\.us/.test(url)) return 'zoom';
  if (/facebook\.com\/live|fb\.me\/live/.test(url)) return 'facebook';
  return 'custom';
}

export default function LiveStreamingPage() {
  const [streamId, setStreamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [avaOpen, setAvaOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [togglingLive, setTogglingLive] = useState(false);

  const [form, setForm] = useState({
    title: '',
    stream_url: '',
    scheduled_start: '',
    password: '',
    notes: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const s = await getMyLiveStream();
      if (s) {
        setStreamId(s.id);
        setIsLive(s.is_live || false);
        setForm({
          title:            s.title            || '',
          stream_url:       s.stream_url       || '',
          scheduled_start:  s.scheduled_start  || '',
          password:         s.password         || '',
          notes:            s.notes            || '',
        });
      }
    } catch (e) { console.error('LiveStreaming load error', e); }
    setLoading(false);
  };

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.stream_url.trim()) return;
    setSaveStatus('saving');
    try {
      const data = {
        ...form,
        stream_type: detectStreamType(form.stream_url),
        is_live: isLive,
      };
      if (streamId) {
        await base44.entities.LiveStream.update(streamId, data);
      } else {
        const created = await base44.entities.LiveStream.create(data);
        setStreamId(created.id);
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('LiveStreaming save error', e);
      setSaveStatus('idle');
    }
  };

  const toggleLive = async () => {
    if (!streamId) return;
    setTogglingLive(true);
    try {
      const next = !isLive;
      await base44.entities.LiveStream.update(streamId, { is_live: next });
      setIsLive(next);
    } catch (e) { console.error(e); }
    setTogglingLive(false);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} className="animate-spin" style={{ color: '#E03553' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader
        title="Live stream"
        subtitle="Share your wedding live with guests who can't be there in person"
      />

      {/* Guest Suite visibility banner */}
      <div style={{ padding: '8px 32px', background: 'rgba(10,10,10,0.02)', borderBottom: '1px solid rgba(10,10,10,0.05)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'rgba(10,10,10,0.45)', fontFamily: PJS }}>
          ✨ This is visible to guests in your Guest Suite
        </span>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 32px 80px' }}>

        <div style={{ marginBottom: 28 }}>
          <AvaButton label="Ask Ava about wedding live streaming" onClick={() => setAvaOpen(true)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          <UInput
            label="Stream title"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="e.g. Watch our ceremony live"
          />

          <UInput
            label="Stream URL"
            value={form.stream_url}
            onChange={e => set('stream_url', e.target.value)}
            placeholder="YouTube, Zoom, Vimeo, Facebook Live, or any streaming URL"
          />

          {form.stream_url && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.35)', fontFamily: PJS }}>
                Platform detected:
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(10,10,10,0.06)', color: '#444444', fontFamily: PJS }}>
                {(() => {
                  const t = detectStreamType(form.stream_url);
                  return { youtube: 'YouTube', vimeo: 'Vimeo', zoom: 'Zoom', facebook: 'Facebook Live', custom: 'Custom URL' }[t];
                })()}
              </span>
              <a href={form.stream_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'rgba(10,10,10,0.35)', fontFamily: PJS, textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = '#E03553'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(10,10,10,0.35)'}>
                <ExternalLink size={11} /> Test link
              </a>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <UInput
              label="Stream date"
              value={form.scheduled_start ? form.scheduled_start.split('T')[0] : ''}
              onChange={e => set('scheduled_start', e.target.value + (form.scheduled_start?.split('T')[1] ? 'T' + form.scheduled_start.split('T')[1] : 'T00:00'))}
              type="date"
            />
            <UInput
              label="Stream time"
              value={form.scheduled_start ? form.scheduled_start.split('T')[1] || '' : ''}
              onChange={e => set('scheduled_start', (form.scheduled_start?.split('T')[0] || '') + 'T' + e.target.value)}
              type="time"
            />
          </div>

          <UInput
            label="Password (optional)"
            value={form.password}
            onChange={e => set('password', e.target.value)}
            placeholder="Leave empty for public access"
          />

          <UInput
            label="Notes for guests"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="e.g. Stream starts 10 minutes before ceremony. Use headphones for best audio."
            multiline
          />

          {/* Save row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 4 }}>
            <button
              onClick={handleSave}
              disabled={!form.stream_url.trim() || saveStatus === 'saving'}
              className="btn-primary"
              style={{ fontSize: 13, opacity: !form.stream_url.trim() ? 0.5 : 1 }}
            >
              {saveStatus === 'saving' ? 'Saving…' : 'Save'}
            </button>
            {saveStatus === 'saved' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6b7700', fontFamily: PJS, fontWeight: 600 }}>
                <Check size={13} /> Saved
              </span>
            )}
          </div>
        </div>

        {/* Go live toggle — shown once stream is saved */}
        {streamId && (
          <div style={{ marginTop: 36, padding: '16px 20px', border: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: PJS, margin: '0 0 2px' }}>
                Stream status
              </p>
              <p style={{ fontSize: 12, color: 'rgba(10,10,10,0.5)', fontFamily: PJS, margin: 0 }}>
                Mark as live when your stream starts — guests will see a live indicator
              </p>
            </div>
            <button
              onClick={toggleLive}
              disabled={togglingLive}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', borderRadius: 999, border: 'none',
                background: isLive ? '#E03553' : '#0A0A0A',
                color: '#FFFFFF', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: PJS, flexShrink: 0,
                opacity: togglingLive ? 0.6 : 1,
              }}
            >
              <Radio size={12} />
              {isLive ? 'Live now · Stop' : 'Mark as live'}
            </button>
          </div>
        )}
      </div>

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Live stream advisor"
        systemPrompt="You are Ava, a wedding live streaming advisor. Help couples set up and share their wedding live stream."
        quickActions={[
          "How do I set up a wedding live stream on YouTube?",
          "What are the best platforms for live streaming a wedding?",
          "How can remote guests watch comfortably?",
          "What equipment do I need for a high-quality wedding live stream?",
        ]}
      />
    </div>
  );
}
