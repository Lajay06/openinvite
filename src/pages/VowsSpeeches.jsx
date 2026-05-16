import React, { useState, useEffect, useRef } from 'react';
import { VowSpeech } from '@/entities/VowSpeech';
import { Plus, Edit, Trash2, Mic, Heart, Printer, Sparkles, Loader2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import VowSpeechEditor from '../components/vows/VowSpeechEditor';
import AIVowsSpeechesAssistant from '../components/vows/AIVowsSpeechesAssistant';

const labelStyle = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

function CountUp({ to, duration = 1200 }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (to === 0) { setValue(0); return; }
    ref.current = null;
    let raf;
    const tick = (ts) => {
      if (!ref.current) ref.current = ts;
      const p = Math.min((ts - ref.current) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(e * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{value}</>;
}

export default function VowsSpeechesPage() {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const [aiType, setAiType] = useState('vow');
  const [activeTab, setActiveTab] = useState('vows');

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await VowSpeech.list('-created_date');
      setItems(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load items');
    }
    setLoading(false);
  };

  const handleSave = async (data) => {
    const id = toast.loading(data.id ? 'Updating…' : 'Saving…');
    try {
      if (data.id) await VowSpeech.update(data.id, data);
      else await VowSpeech.create(data);
      toast.success(data.id ? 'Updated' : 'Saved', { id });
      setIsEditing(false);
      setSelectedItem(null);
      loadItems();
    } catch (e) {
      toast.error('Failed to save', { id });
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Delete this item?')) return;
    const id = toast.loading('Deleting…');
    try {
      await VowSpeech.delete(itemId);
      if (selectedItem?.id === itemId) setSelectedItem(null);
      toast.success('Deleted', { id });
      loadItems();
    } catch (e) {
      toast.error('Failed to delete', { id });
    }
  };

  const handleAIApply = (text) => {
    setSelectedItem({ title: aiType === 'vow' ? 'My wedding vows' : 'Wedding speech', type: aiType, author: '', content: text, notes: '' });
    setIsEditing(true);
  };

  const handlePrint = () => {
    if (!selectedItem) return;
    const w = window.open('', '', 'height=600,width=800');
    w.document.write(`<html><head><title>Print</title><style>body{font-family:sans-serif;padding:2rem;line-height:1.7;}h1{font-size:1.4rem;font-weight:700;margin-bottom:0.25rem;}h2{font-size:0.9rem;color:#555;margin-bottom:1.5rem;}p{white-space:pre-wrap;}</style></head><body><h1>${selectedItem.title}</h1><h2>By ${selectedItem.author}</h2><p>${selectedItem.content || ''}</p></body></html>`);
    w.document.close();
    w.print();
  };

  const vows = items.filter(i => i.type === 'vow');
  const speeches = items.filter(i => i.type === 'speech');
  const listItems = activeTab === 'vows' ? vows : speeches;

  const stats = [
    { label: 'Total items', value: items.length },
    { label: 'Vows', value: vows.length },
    { label: 'Speeches', value: speeches.length },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      {/* Sub-header */}
      <div style={{ height: 48, background: '#FFFFFF', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Vows &amp; speeches</span>
      </div>
      {/* Descriptor strip */}
      <div style={{ background: '#F5F5F5', padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(10,10,10,0.5)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Write, store and polish your vows and wedding-day speeches</span>
      </div>

      {/* Stat strip */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        {stats.map((s, i) => (
          <div key={i} style={{ flex: 1, padding: '24px 32px', borderRight: i < stats.length - 1 ? '1px solid rgba(10,10,10,0.08)' : 'none' }}>
            <p style={labelStyle}>{s.label}</p>
            <p style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '8px 0 0' }}>
              <CountUp to={s.value} />
            </p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => { setAiType(activeTab === 'vows' ? 'vow' : 'speech'); setShowAI(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#0A1930', color: '#FFFFFF', border: 'none', borderRadius: 999, padding: '9px 16px', fontSize: 12, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer' }}>
          <Sparkles size={12} style={{ color: '#DDF762' }} />Ask Ava — write with AI
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={() => { setSelectedItem(null); setIsEditing(true); }} className="btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={12} />Write new
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '80px 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Loader2 size={20} style={{ color: 'rgba(10,10,10,0.3)' }} className="animate-spin" />
          <span style={{ fontSize: 14, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading…</span>
        </div>
      ) : (
        <div style={{ display: 'flex', height: 'calc(100vh - 260px)', minHeight: 500 }}>
          {/* Left panel — list */}
          <div style={{ width: 280, borderRight: '1px solid rgba(10,10,10,0.08)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            {/* Tab bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
              {[{ value: 'vows', label: 'Vows', icon: Heart }, { value: 'speeches', label: 'Speeches', icon: Mic }].map(t => (
                <button key={t.value} onClick={() => setActiveTab(t.value)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: activeTab === t.value ? '#E03553' : '#444444', borderBottom: `2px solid ${activeTab === t.value ? '#E03553' : 'transparent'}`, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: -1 }}>
                  <t.icon size={12} />{t.label}
                </button>
              ))}
            </div>

            {/* Item list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {listItems.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  {activeTab === 'vows' ? <Heart size={32} style={{ color: 'rgba(10,10,10,0.15)', margin: '0 auto 12px' }} /> : <Mic size={32} style={{ color: 'rgba(10,10,10,0.15)', margin: '0 auto 12px' }} />}
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 6 }}>No {activeTab} yet</p>
                  <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 16 }}>Start writing or use AI to help</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button onClick={() => { setAiType(activeTab === 'vows' ? 'vow' : 'speech'); setShowAI(true); }} className="btn-editorial-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <Sparkles size={11} />Generate with AI
                    </button>
                    <button onClick={() => { setSelectedItem(null); setIsEditing(true); }} className="btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <Plus size={11} />Write manually
                    </button>
                  </div>
                </div>
              ) : (
                listItems.map(item => (
                  <div key={item.id} onClick={() => { setSelectedItem(item); setIsEditing(false); }}
                    style={{ padding: '12px 16px', borderBottom: '1px solid rgba(10,10,10,0.06)', cursor: 'pointer', borderLeft: `3px solid ${selectedItem?.id === item.id ? '#E03553' : 'transparent'}`, background: selectedItem?.id === item.id ? 'rgba(224,53,83,0.04)' : 'transparent' }}
                    onMouseEnter={e => { if (selectedItem?.id !== item.id) e.currentTarget.style.background = 'rgba(10,10,10,0.02)'; }}
                    onMouseLeave={e => { if (selectedItem?.id !== item.id) e.currentTarget.style.background = 'transparent'; }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                        <p style={{ fontSize: 11, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <User size={10} />{item.author || 'No author'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        <button onClick={e => { e.stopPropagation(); setSelectedItem(item); setIsEditing(true); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,10,0.35)', padding: 4, display: 'flex' }}>
                          <Edit size={13} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E03553', padding: 4, display: 'flex' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right panel — viewer / editor */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {isEditing ? (
              <VowSpeechEditor
                initialData={selectedItem}
                onSave={handleSave}
                onCancel={() => { setIsEditing(false); setSelectedItem(null); }}
              />
            ) : selectedItem ? (
              <>
                {/* Viewer header */}
                <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0 }}>{selectedItem.title}</p>
                    <p style={{ fontSize: 12, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <User size={11} />By {selectedItem.author}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handlePrint} className="btn-editorial-secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Printer size={12} />Print
                    </button>
                    <button onClick={() => setIsEditing(true)} className="btn-primary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Edit size={12} />Edit
                    </button>
                  </div>
                </div>
                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                  <div style={{ maxWidth: 680, fontSize: 15, lineHeight: 1.8, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'pre-wrap' }}>
                    {selectedItem.content || <span style={{ color: '#444444', fontStyle: 'italic' }}>No content yet.</span>}
                  </div>
                  {selectedItem.notes && (
                    <div style={{ maxWidth: 680, marginTop: 32, padding: 16, border: '1px solid rgba(10,10,10,0.08)', background: '#F5F5F5' }}>
                      <p style={{ ...labelStyle, marginBottom: 8 }}>Private notes</p>
                      <p style={{ fontSize: 13, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'pre-wrap', margin: 0 }}>{selectedItem.notes}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
                <Mic size={48} style={{ color: 'rgba(10,10,10,0.12)', marginBottom: 16 }} />
                <p style={{ fontSize: 16, fontWeight: 700, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 8 }}>Ready to write your perfect words?</p>
                <p style={{ fontSize: 14, color: '#444444', fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 24 }}>Select an item from the list, or create a new one</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setAiType('vow'); setShowAI(true); }} className="btn-editorial-secondary" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={12} />Use AI writer
                  </button>
                  <button onClick={() => { setSelectedItem(null); setIsEditing(true); }} className="btn-primary" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={12} />Write manually
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showAI && (
        <AIVowsSpeechesAssistant isOpen={showAI} onClose={() => setShowAI(false)} onApply={handleAIApply} type={aiType} />
      )}
    </div>
  );
}
