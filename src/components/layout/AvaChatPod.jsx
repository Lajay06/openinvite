import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

function AvaChatPod({ onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm Ava, your wedding specialist. Ask me anything — about your planning, your website, your guest list, or anything else wedding related.",
      id: 'welcome',
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleSend = async (overrideInput) => {
    const text = (overrideInput ?? input).trim();
    if (!text || loading) return;

    const userMessage = { role: 'user', content: text, id: Date.now().toString() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const currentPage = window.location.pathname;
      const response = await base44.integrations.Core.InvokeLLM({
        model: 'claude_sonnet_4_6',
        prompt: `You are Ava, the AI wedding specialist built into Openinvite — a premium wedding planning platform. You are warm, knowledgeable, concise, and personal. You help couples with wedding planning advice, timelines, their Openinvite dashboard, Guest Suite (website builder and invitation assets), guest management, budget, vendor management, vow writing, and RSVP management. The Guest Suite is where couples build their wedding website, invitation assets (Save the Date, Digital Invitation, Menu Card, Seating Chart, etc.), Experience Guide, and Policies — accessed via Design Studio → Guest Suite. Keep responses conversational and brief — 2-4 sentences unless they ask for detail. Never use emojis. Use "✦" sparingly for emphasis only. The user is currently on the ${currentPage} page of their Openinvite dashboard.\n\nConversation so far:\n${newMessages.map(m => `${m.role === 'user' ? 'User' : 'Ava'}: ${m.content}`).join('\n')}\n\nRespond as Ava:`,
      });

      const avaReply = typeof response === 'string' ? response : (response?.result ?? "I'm having trouble responding right now. Please try again.");
      setMessages(prev => [...prev, { role: 'assistant', content: avaReply, id: Date.now().toString() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.', id: 'error-' + Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    'What should I do first?',
    'Help me write my vows',
    'How do I add guests?',
    'Review my budget',
  ];

  return (
    <div style={{
      width: 380,
      height: 520,
      background: '#1A1A1A',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
      animation: 'avaPopIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
    }}>

      {/* HEADER */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(255,255,255,0.02)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #E03553, #803D81)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: '#FFF', flexShrink: 0,
          boxShadow: '0 0 16px rgba(224,53,83,0.3)',
        }}>✦</div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>Ava</p>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 400 }}>Your wedding specialist</p>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />
      </div>

      {/* MESSAGES */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            gap: 8,
            alignItems: 'flex-end',
          }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #E03553, #803D81)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#FFF', flexShrink: 0, marginBottom: 2 }}>✦</div>
            )}
            <div style={{
              maxWidth: '80%',
              padding: '10px 14px',
              background: msg.role === 'user' ? 'linear-gradient(135deg, #E03553, #803D81)' : 'rgba(255,255,255,0.07)',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              fontSize: 13,
              color: '#FFFFFF',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #E03553, #803D81)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#FFF', flexShrink: 0 }}>✦</div>
            <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.07)', borderRadius: '16px 16px 16px 4px', display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.4)', animation: `avaDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* QUICK PROMPTS */}
      {messages.length === 1 && (
        <div style={{ padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0 }}>
          {quickPrompts.map(prompt => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              style={{
                padding: '5px 12px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 100,
                fontSize: 11,
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: 500,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(224,53,83,0.4)'; e.currentTarget.style.color = '#FFFFFF'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* INPUT AREA */}
      <div style={{
        padding: '12px 16px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.2)',
        flexShrink: 0,
      }}>
        <div
          style={{
            background: '#2A2A2A',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 24,
            padding: '8px 12px 8px 16px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: 8,
            transition: 'border-color 0.2s',
          }}
          onFocusCapture={e => e.currentTarget.style.borderColor = 'rgba(224,53,83,0.4)'}
          onBlurCapture={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Ava anything..."
            disabled={loading}
            rows={1}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontSize: 13,
              color: '#FFFFFF',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              lineHeight: 1.5,
              padding: '4px 0',
              maxHeight: 120,
              overflowY: 'auto',
              caretColor: '#E03553',
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: input.trim() ? 'linear-gradient(135deg, #E03553, #803D81)' : 'rgba(255,255,255,0.1)',
              border: 'none',
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? (
              <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #FFF', borderRadius: '50%', animation: 'avaSpinChat 0.7s linear infinite' }} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <line x1="12" y1="19" x2="12" y2="5"/>
                <polyline points="5 12 12 5 19 12"/>
              </svg>
            )}
          </button>
        </div>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 8, fontFamily: 'Plus Jakarta Sans, sans-serif', margin: '8px 0 0' }}>
          Ava · Openinvite AI
        </p>
      </div>

      <style>{`
        @keyframes avaPopIn {
          from { opacity: 0; transform: scale(0.85) translateY(16px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes avaDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes avaSpinChat {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default AvaChatPod;