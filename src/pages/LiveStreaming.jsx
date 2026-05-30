import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { InvokeLLM } from "@/integrations/Core";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Plus, Trash2, Loader2, Radio, Copy, X, Lightbulb, Edit2 } from "lucide-react";
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';
import AvaButton from '@/components/shared/AvaButton';

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

const EMPTY_FORM = { title: '', stream_url: '', stream_type: 'youtube', embed_code: '', scheduled_start: '', is_live: false, chat_enabled: true, password: '' };

const TYPE_LABELS = { youtube: 'YouTube Live', vimeo: 'Vimeo', zoom: 'Zoom', custom: 'Custom embed' };

const AVA_PROMPTS = [
  "How do I set up a wedding live stream on YouTube?",
  "What are the best platforms for live streaming a wedding?",
  "How can remote guests interact during a live streamed wedding?",
  "What equipment do I need for a high-quality wedding live stream?",
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
      const res = await InvokeLLM({ prompt: `Wedding live streaming: ${question}` });
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
            <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Ask Ava — live stream</span>
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

function StreamFormModal({ stream, onClose, onSave }) {
  const [form, setForm] = useState(stream ? {
    title: stream.title || '', stream_url: stream.stream_url || '',
    stream_type: stream.stream_type || 'youtube', embed_code: stream.embed_code || '',
    scheduled_start: stream.scheduled_start || '', is_live: stream.is_live || false,
    chat_enabled: stream.chat_enabled !== false, password: stream.password || '',
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.stream_url.trim()) return;
    setSaving(true);
    try {
      if (stream?.id) {
        await base44.entities.LiveStream.update(stream.id, form);
      } else {
        await base44.entities.LiveStream.create(form);
      }
      onSave();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#FFFFFF', width: '100%', maxWidth: 540, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#0A1930', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Video size={16} style={{ color: '#DDF762' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{stream ? 'Edit stream' : 'Create stream'}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', padding: 4 }}><X size={16} /></button>
        </div>
        <div style={{ padding: 24, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Stream title *</label>
            <input value={form.title} onChange={e => set({ title: e.target.value })} placeholder="e.g. Wedding ceremony" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Platform</label>
            <Select value={form.stream_type} onValueChange={v => set({ stream_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube Live</SelectItem>
                <SelectItem value="vimeo">Vimeo</SelectItem>
                <SelectItem value="zoom">Zoom</SelectItem>
                <SelectItem value="custom">Custom embed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Stream URL *</label>
            <input value={form.stream_url} onChange={e => set({ stream_url: e.target.value })} placeholder="https://youtube.com/watch?v=…" style={inputStyle} />
          </div>
          {form.stream_type === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={labelStyle}>Custom embed code</label>
              <textarea value={form.embed_code} onChange={e => set({ embed_code: e.target.value })} placeholder="<iframe src=...></iframe>" rows={3}
                style={{ ...inputStyle, resize: 'vertical', borderBottom: '1px solid rgba(10,10,10,0.18)' }} />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Scheduled start</label>
            <input type="datetime-local" value={form.scheduled_start} onChange={e => set({ scheduled_start: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>Password (optional)</label>
            <input value={form.password} onChange={e => set({ password: e.target.value })} placeholder="Leave empty for public access" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <PillToggle label="Chat enabled" value={form.chat_enabled} onChange={v => set({ chat_enabled: v })} />
            <PillToggle label="Stream is live now" value={form.is_live} onChange={v => set({ is_live: v })} />
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 8 }}>
            <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.stream_url.trim()} className="btn-primary" style={{ fontSize: 13 }}>
              {saving ? 'Saving…' : stream ? 'Update stream' : 'Create stream'}
            </button>
            <button onClick={onClose} className="btn-editorial-secondary" style={{ fontSize: 13 }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LiveStreamingPage() {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStream, setEditingStream] = useState(null);
  const [showAva, setShowAva] = useState(false);

  useEffect(() => { loadStreams(); }, []);

  const loadStreams = async () => {
    try {
      const data = await base44.entities.LiveStream.list('-created_date');
      setStreams(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleEdit = (stream) => {
    setEditingStream(stream);
    setShowForm(true);
  };

  const handleDelete = async (streamId) => {
    if (!window.confirm('Delete this stream?')) return;
    try {
      await base44.entities.LiveStream.delete(streamId);
      loadStreams();
    } catch (e) { console.error(e); }
  };

  const toggleLiveStatus = async (stream) => {
    try {
      await base44.entities.LiveStream.update(stream.id, { is_live: !stream.is_live });
      loadStreams();
    } catch (e) { console.error(e); }
  };

  const copyStreamLink = (streamId) => {
    const link = `${window.location.origin}/wedding?stream=${streamId}`;
    navigator.clipboard.writeText(link);
  };

  const closeForm = () => { setShowForm(false); setEditingStream(null); };
  const onSaved = () => { closeForm(); loadStreams(); };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} style={{ color: '#E03553' }} className="animate-spin" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <DashboardPageHeader title="Live stream" subtitle="Share your wedding live with guests who can't be there" />

      <div style={{ padding: '32px 32px 48px', maxWidth: 760, margin: '0 auto' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <AvaButton label="Ask Ava" onClick={() => setShowAva(true)} />
          </div>
          <button onClick={() => { setEditingStream(null); setShowForm(true); }} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <Plus size={14} />Add stream
          </button>
        </div>

        {/* Stat strip */}
        <div style={{ display: 'flex', borderTop: '1px solid rgba(10,10,10,0.08)', borderBottom: '1px solid rgba(10,10,10,0.08)', marginBottom: 32 }}>
          {[
            { label: 'Total streams', value: streams.length },
            { label: 'Live now', value: streams.filter(s => s.is_live).length },
            { label: 'With chat', value: streams.filter(s => s.chat_enabled !== false).length },
          ].map((stat, i, arr) => (
            <div key={stat.label} style={{ flex: 1, padding: '20px 24px', borderRight: i < arr.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
              <div style={labelStyle}>{stat.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#0A0A0A', marginTop: 4, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Stream list */}
        {streams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', border: '1px dashed rgba(10,10,10,0.12)' }}>
            <Video size={40} style={{ color: 'rgba(10,10,10,0.15)', margin: '0 auto 16px' }} />
            <p style={{ fontSize: 14, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 16 }}>No live streams yet</p>
            <button onClick={() => { setEditingStream(null); setShowForm(true); }} className="btn-primary" style={{ fontSize: 13 }}>
              <Plus size={14} style={{ display: 'inline', marginRight: 6 }} />Create first stream
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {streams.map((stream, i) => (
              <div key={stream.id} style={{ padding: '20px 0', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{stream.title}</span>
                    {stream.is_live && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#E03553', color: '#FFFFFF', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        <Radio size={9} />LIVE
                      </span>
                    )}
                    {stream.password && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(10,10,10,0.06)', color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Password protected</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{TYPE_LABELS[stream.stream_type] || stream.stream_type}</span>
                    {stream.scheduled_start && (
                      <span style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Scheduled: {new Date(stream.scheduled_start).toLocaleString()}</span>
                    )}
                    {stream.chat_enabled !== false && (
                      <span style={{ fontSize: 12, color: '#6b7700', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Chat enabled</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <button onClick={() => toggleLiveStatus(stream)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", border: 'none',
                      background: stream.is_live ? '#E03553' : '#0A0A0A', color: '#FFFFFF' }}>
                    <Radio size={11} />{stream.is_live ? 'Stop' : 'Go live'}
                  </button>
                  <button onClick={() => copyStreamLink(stream.id)} title="Copy stream link"
                    style={{ padding: '6px 10px', borderRadius: 999, border: '1.5px solid rgba(10,10,10,0.15)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Copy size={13} style={{ color: '#444444' }} />
                  </button>
                  <button onClick={() => handleEdit(stream)} title="Edit"
                    style={{ padding: '6px 10px', borderRadius: 999, border: '1.5px solid rgba(10,10,10,0.15)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Edit2 size={13} style={{ color: '#444444' }} />
                  </button>
                  <button onClick={() => handleDelete(stream.id)} title="Delete"
                    style={{ padding: '6px 10px', borderRadius: 999, border: '1.5px solid rgba(10,10,10,0.15)', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={13} style={{ color: '#E03553' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && <StreamFormModal stream={editingStream} onClose={closeForm} onSave={onSaved} />}
      {showAva && <AvaModal onClose={() => setShowAva(false)} />}
    </div>
  );
}
