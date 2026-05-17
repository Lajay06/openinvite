import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function AvaModal({ isOpen, onClose, systemPrompt, quickActions = [], pageTitle = 'Ava' }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setInput('');
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput('');
    const userMsg = { role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const fullPrompt = systemPrompt
        ? `${systemPrompt}\n\nUser: ${content}`
        : content;
      const res = await InvokeLLM({ prompt: fullPrompt, add_context_from_internet: false });
      setMessages(prev => [...prev, { role: 'ava', content: typeof res === 'string' ? res : JSON.stringify(res) }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ava', content: 'Sorry, something went wrong. Please try again.' }]);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#FFFFFF', width: '100%', maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column', borderRadius: 0, overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #ec4899, #9333ea)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={15} style={{ color: '#fff' }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: PJS }}>✦ Ava</span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontFamily: PJS, marginTop: 2 }}>{pageTitle}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', display: 'flex', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Quick actions */}
        {quickActions.length > 0 && messages.length === 0 && (
          <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid rgba(10,10,10,0.08)', flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.4)', fontFamily: PJS, marginBottom: 8 }}>Quick actions</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {quickActions.map(action => (
                <button
                  key={action}
                  onClick={() => sendMessage(action)}
                  disabled={loading}
                  style={{
                    padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(10,10,10,0.12)',
                    background: 'rgba(10,10,10,0.03)', fontSize: 12, fontWeight: 600, fontFamily: PJS,
                    color: '#0A0A0A', cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(147,51,234,0.08)'; e.currentTarget.style.borderColor = '#9333ea'; e.currentTarget.style.color = '#9333ea'; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,10,10,0.03)'; e.currentTarget.style.borderColor = 'rgba(10,10,10,0.12)'; e.currentTarget.style.color = '#0A0A0A'; }}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          {messages.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(10,10,10,0.3)', fontSize: 13, fontFamily: PJS }}>
              Ask me anything or choose a quick action above.
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'ava' && (
                <div style={{ width: 24, height: 24, borderRadius: 999, background: 'linear-gradient(135deg, #ec4899, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8, marginTop: 2 }}>
                  <Sparkles size={11} style={{ color: '#fff' }} />
                </div>
              )}
              <div style={{
                maxWidth: '75%', padding: '10px 14px', fontSize: 13, lineHeight: 1.6, fontFamily: PJS,
                background: msg.role === 'user' ? 'linear-gradient(135deg, #ec4899, #9333ea)' : 'rgba(10,10,10,0.04)',
                color: msg.role === 'user' ? '#fff' : '#0A0A0A',
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 999, background: 'linear-gradient(135deg, #ec4899, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles size={11} style={{ color: '#fff' }} />
              </div>
              <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: 'rgba(10,10,10,0.04)', borderRadius: '12px 12px 12px 2px' }}>
                {[0, 1, 2].map(d => (
                  <div key={d} style={{ width: 6, height: 6, borderRadius: 999, background: '#9333ea', opacity: 0.6, animation: `pulse 1.2s ease-in-out ${d * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid rgba(10,10,10,0.08)', flexShrink: 0, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask Ava anything…"
            disabled={loading}
            style={{
              flex: 1, border: 'none', borderBottom: '1px solid rgba(10,10,10,0.15)',
              background: 'none', fontSize: 13, color: '#0A0A0A', fontFamily: PJS,
              outline: 'none', padding: '6px 0',
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            style={{
              width: 32, height: 32, borderRadius: 999, border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              background: loading || !input.trim() ? 'rgba(10,10,10,0.1)' : 'linear-gradient(135deg, #ec4899, #9333ea)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            <Send size={13} style={{ color: loading || !input.trim() ? 'rgba(10,10,10,0.3)' : '#fff' }} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
