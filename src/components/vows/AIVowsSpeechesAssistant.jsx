import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Sparkles, Mic, Wand2, Copy, RefreshCw, Send, Loader2 } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';
import toast from 'react-hot-toast';

const labelStyle = {
  fontSize: 11, fontWeight: 700,
  letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

function Toggle({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      style={{ width: 36, height: 20, borderRadius: 10, border: 'none', background: value ? '#E03553' : 'rgba(10,10,10,0.12)', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: value ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#FFFFFF', transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );
}

export default function AIVowsSpeechesAssistant({ isOpen, onClose, onApply, type = 'vow' }) {
  const [tab, setTab] = useState('generate');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState('');

  const [gf, setGf] = useState({
    type, style: 'romantic', length: 'medium', tone: 'heartfelt',
    includeHumor: false, partnerName: '', relationshipYears: '',
    personalStory: '', favoriteMemory: '', futureHopes: '',
  });
  const setG = (k, v) => setGf(p => ({ ...p, [k]: v }));

  const [imf, setImf] = useState({ originalText: '', improvementType: 'enhance', specificInstructions: '' });
  const setIm = (k, v) => setImf(p => ({ ...p, [k]: v }));

  const handleGenerate = async () => {
    if (!gf.partnerName) { toast.error("Enter your partner's name"); return; }
    setLoading(true);
    const id = toast.loading('Crafting your perfect words…');
    try {
      const prompt = `You are an expert wedding writer. Create ${gf.type === 'vow' ? 'wedding vows' : 'a wedding speech'}.
Style: ${gf.style}. Length: ${gf.length} (short=1-2min, medium=2-3min, long=3-5min). Tone: ${gf.tone}.
${gf.includeHumor ? 'Include light humor.' : 'Keep it sincere and emotional.'}
Partner's name: ${gf.partnerName}${gf.relationshipYears ? `. Years together: ${gf.relationshipYears}` : ''}.
${gf.personalStory ? `Personal story: ${gf.personalStory}` : ''}
${gf.favoriteMemory ? `Favourite memory: ${gf.favoriteMemory}` : ''}
${gf.futureHopes ? `Future hopes: ${gf.futureHopes}` : ''}
Make it emotional, authentic, and memorable. Return plain text only — no markdown.`;
      const res = await InvokeLLM({ prompt, add_context_from_internet: false });
      setGenerated(res);
      setTab('preview');
      toast.success('Your words are ready!', { id });
    } catch (e) {
      toast.error('Failed to generate. Please try again.', { id });
    }
    setLoading(false);
  };

  const handleImprove = async () => {
    if (!imf.originalText.trim()) { toast.error('Paste your text first'); return; }
    setLoading(true);
    const id = toast.loading('Enhancing your words…');
    const instructions = {
      enhance: 'Make it more emotional, heartfelt, and impactful.',
      shorten: 'Make it more concise while keeping emotional impact.',
      lengthen: 'Expand with more depth and personal detail.',
      humor: 'Add light, tasteful humor while staying heartfelt.',
      formal: 'Make it more formal and elegant.',
      casual: 'Make it more relaxed and conversational.',
    };
    try {
      const prompt = `You are an expert wedding writer. ${instructions[imf.improvementType]}
Original text:
"""
${imf.originalText}
"""
${imf.specificInstructions ? `Additional instructions: ${imf.specificInstructions}` : ''}
Return the improved version as plain text only — no markdown.`;
      const res = await InvokeLLM({ prompt, add_context_from_internet: false });
      setGenerated(res);
      setTab('preview');
      toast.success('Text improved!', { id });
    } catch (e) {
      toast.error('Failed to improve. Please try again.', { id });
    }
    setLoading(false);
  };

  const handleCopy = () => { navigator.clipboard.writeText(generated); toast.success('Copied to clipboard'); };
  const handleUse = () => { onApply?.(generated); onClose(); };

  if (!isOpen) return null;

  const TABS = [
    { value: 'generate', label: 'Generate new', icon: Wand2 },
    { value: 'improve', label: 'Improve existing', icon: RefreshCw },
    { value: 'preview', label: 'Preview', icon: Mic, disabled: !generated },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9200, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 760, maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)', flexShrink: 0, background: '#0A1930' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={16} style={{ color: '#DDF762' }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>AI vows &amp; speech writer</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', padding: 4 }}><X size={16} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(10,10,10,0.08)', flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.value} onClick={() => !t.disabled && setTab(t.value)} disabled={t.disabled}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 0', border: 'none', background: 'none', cursor: t.disabled ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, color: tab === t.value ? '#E03553' : t.disabled ? 'rgba(10,10,10,0.2)' : '#444444', borderBottom: `2px solid ${tab === t.value ? '#E03553' : 'transparent'}`, fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: -1 }}>
              <t.icon size={12} />{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* Generate tab */}
          {tab === 'generate' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Label style={labelStyle}>Type</Label>
                  <Select value={gf.type} onValueChange={v => setG('type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vow">Wedding vows</SelectItem>
                      <SelectItem value="speech">Wedding speech</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Label style={labelStyle}>Partner's name *</Label>
                  <Input value={gf.partnerName} onChange={e => setG('partnerName', e.target.value)} placeholder="Your partner's name" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Label style={labelStyle}>Style</Label>
                  <Select value={gf.style} onValueChange={v => setG('style', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="romantic">Romantic &amp; poetic</SelectItem>
                      <SelectItem value="traditional">Traditional &amp; classic</SelectItem>
                      <SelectItem value="modern">Modern &amp; contemporary</SelectItem>
                      <SelectItem value="heartfelt">Heartfelt &amp; sincere</SelectItem>
                      <SelectItem value="lighthearted">Lighthearted &amp; fun</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Label style={labelStyle}>Length</Label>
                  <Select value={gf.length} onValueChange={v => setG('length', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short (1–2 minutes)</SelectItem>
                      <SelectItem value="medium">Medium (2–3 minutes)</SelectItem>
                      <SelectItem value="long">Long (3–5 minutes)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Label style={labelStyle}>Tone</Label>
                  <Select value={gf.tone} onValueChange={v => setG('tone', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="heartfelt">Heartfelt &amp; emotional</SelectItem>
                      <SelectItem value="joyful">Joyful &amp; celebratory</SelectItem>
                      <SelectItem value="solemn">Solemn &amp; reverent</SelectItem>
                      <SelectItem value="intimate">Intimate &amp; personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Label style={labelStyle}>Years together</Label>
                  <Input value={gf.relationshipYears} onChange={e => setG('relationshipYears', e.target.value)} placeholder="e.g. 5" />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label style={labelStyle}>Personal story (optional)</Label>
                <Textarea value={gf.personalStory} onChange={e => setG('personalStory', e.target.value)} placeholder="Share a meaningful story about your relationship…" style={{ minHeight: 72 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Label style={labelStyle}>Favourite memory (optional)</Label>
                  <Textarea value={gf.favoriteMemory} onChange={e => setG('favoriteMemory', e.target.value)} placeholder="What's your favourite memory together?" style={{ minHeight: 60 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Label style={labelStyle}>Future hopes (optional)</Label>
                  <Textarea value={gf.futureHopes} onChange={e => setG('futureHopes', e.target.value)} placeholder="What are you looking forward to together?" style={{ minHeight: 60 }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Include light humor</span>
                <Toggle value={gf.includeHumor} onChange={v => setG('includeHumor', v)} />
              </div>

              <button onClick={handleGenerate} disabled={loading} className="btn-primary"
                style={{ width: '100%', padding: '13px 0', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
                {loading ? <><Loader2 size={14} className="animate-spin" />Generating…</> : <><Sparkles size={14} />Generate {gf.type === 'vow' ? 'vows' : 'speech'}</>}
              </button>
            </div>
          )}

          {/* Improve tab */}
          {tab === 'improve' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label style={labelStyle}>Your current text</Label>
                <Textarea value={imf.originalText} onChange={e => setIm('originalText', e.target.value)} placeholder="Paste your vows or speech here…" style={{ minHeight: 180 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label style={labelStyle}>How should we improve it?</Label>
                <Select value={imf.improvementType} onValueChange={v => setIm('improvementType', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enhance">Enhance overall (more emotional &amp; impactful)</SelectItem>
                    <SelectItem value="shorten">Make it shorter &amp; more concise</SelectItem>
                    <SelectItem value="lengthen">Make it longer &amp; more detailed</SelectItem>
                    <SelectItem value="humor">Add light humor</SelectItem>
                    <SelectItem value="formal">Make it more formal</SelectItem>
                    <SelectItem value="casual">Make it more casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Label style={labelStyle}>Additional instructions (optional)</Label>
                <Textarea value={imf.specificInstructions} onChange={e => setIm('specificInstructions', e.target.value)} placeholder="Any specific changes you'd like to make?" style={{ minHeight: 72 }} />
              </div>
              <button onClick={handleImprove} disabled={loading} className="btn-primary"
                style={{ width: '100%', padding: '13px 0', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
                {loading ? <><Loader2 size={14} className="animate-spin" />Improving…</> : <><RefreshCw size={14} />Improve text</>}
              </button>
            </div>
          )}

          {/* Preview tab */}
          {tab === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ border: '1px solid rgba(10,10,10,0.08)', padding: 24, background: '#FAFAFA' }}>
                <p style={{ fontSize: 15, lineHeight: 1.8, color: '#0A0A0A', fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: 'pre-wrap', margin: 0 }}>{generated}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleCopy} className="btn-editorial-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}>
                  <Copy size={13} />Copy to clipboard
                </button>
                <button onClick={() => setTab('generate')} className="btn-editorial-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}>
                  <RefreshCw size={13} />Generate again
                </button>
                <button onClick={handleUse} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13 }}>
                  <Send size={13} />Use this text
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
