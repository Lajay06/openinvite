import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InvokeLLM } from '@/integrations/Core';
import { base44 } from '@/api/base44Client';
import { buildWeddingContext } from '@/lib/avaContext';
import toast from 'react-hot-toast';
import { interactiveDivProps, useModalFocusTrap } from '@/lib/a11y';

const PJS = "'Plus Jakarta Sans', sans-serif";

const ACTION_INSTRUCTIONS = `You can perform actions in the app. When the user asks you to do something, include an ACTION block AND explain what you are about to do first. Use this exact format (one action per line):

ACTION:{"type":"create_guest","data":{"name":"John Smith","email":"john@example.com","rsvp_status":"pending"}}
ACTION:{"type":"create_budget_item","data":{"category":"Catering","total_amount":8000}}
ACTION:{"type":"create_vendor","data":{"name":"Golden Hour Photography","category":"photography","status":"researching"}}
ACTION:{"type":"create_schedule","data":{"title":"Wedding ceremony","time":"15:00"}}
ACTION:{"type":"navigate","data":{"path":"/Guests"}}
ACTION:{"type":"update_guest","data":{"id":"GUEST_ID","rsvp_status":"confirmed"}}
ACTION:{"type":"update_vendor","data":{"id":"VENDOR_ID","status":"booked"}}

Always describe what you will do before the ACTION block. The user must confirm before anything executes.`;

function extractJson(str) {
  const start = str.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') { depth--; if (depth === 0) return str.slice(start, i + 1); }
  }
  return null;
}

function parseActions(rawText) {
  const actions = [];
  const cleanText = rawText.replace(/ACTION:\s*(\{(?:[^{}]|\{[^{}]*\})*\})/g, (_, jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.type) {
        actions.push({ id: Math.random().toString(36).slice(2), type: parsed.type, data: parsed.data || {}, status: 'pending' });
        return '';
      }
    } catch {}
    return _;
  }).replace(/\n{3,}/g, '\n\n').trim();
  return { cleanText, actions };
}

function actionLabel(type, data) {
  switch (type) {
    case 'create_guest':       return `Add "${data.name || 'guest'}" to your guest list`;
    case 'create_budget_item': return `Add budget item: ${data.category || 'item'}${data.total_amount ? ` ($${Number(data.total_amount).toLocaleString()})` : ''}`;
    case 'create_vendor':      return `Add ${data.name || 'vendor'} to your vendors${data.category ? ` (${data.category})` : ''}`;
    case 'create_schedule':    return `Add to schedule: "${data.title || 'item'}"${data.time ? ` at ${data.time}` : ''}`;
    case 'navigate':           return `Go to ${(data.path || '').replace(/^\//, '')} page`;
    case 'update_guest':       return `Update guest record${data.rsvp_status ? ` → ${data.rsvp_status}` : ''}`;
    case 'update_vendor':      return `Update vendor record${data.status ? ` → ${data.status}` : ''}`;
    default:                   return `Run: ${type}`;
  }
}

function ActionCard({ action, onConfirm, onCancel }) {
  const STATUS_ICON = {
    done:      <Check size={12} style={{ color: '#10B981' }} />,
    error:     <AlertCircle size={12} style={{ color: '#E03553' }} />,
    executing: <Loader2 size={12} className="animate-spin" style={{ color: '#9333ea' }} />,
    cancelled: null,
  };
  const STATUS_TEXT = {
    done:      'Done!',
    error:     'Failed to execute',
    executing: 'Executing…',
    cancelled: 'Cancelled',
  };

  return (
    <div style={{ margin: '6px 0 4px 32px', padding: '10px 14px', border: '1px solid rgba(147,51,234,0.2)', background: 'rgba(147,51,234,0.04)', fontFamily: PJS }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(147,51,234,0.6)', marginBottom: 5 }}>AVA WANTS TO</div>
      <div style={{ fontSize: 13, color: '#0A0A0A', marginBottom: action.status === 'pending' ? 10 : 6 }}>{actionLabel(action.type, action.data)}</div>

      {action.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel}
            style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: PJS, cursor: 'pointer', border: '1px solid rgba(10,10,10,0.15)', background: 'none', color: 'rgba(10,10,10,0.5)' }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: PJS, cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg, #ec4899, #9333ea)', color: '#fff' }}>
            Confirm
          </button>
        </div>
      )}

      {action.status !== 'pending' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: action.status === 'done' ? '#10B981' : action.status === 'error' ? '#E03553' : 'rgba(10,10,10,0.6)', fontWeight: 600 }}>
          {STATUS_ICON[action.status]}
          {STATUS_TEXT[action.status]}
        </div>
      )}
    </div>
  );
}

export default function AvaModal({ isOpen, onClose, systemPrompt, quickActions = [], pageTitle = 'Ava' }) {
  if (!isOpen) return null;
  return <AvaModalDialog onClose={onClose} systemPrompt={systemPrompt} quickActions={quickActions} pageTitle={pageTitle} />;
}

function AvaModalDialog({ onClose, systemPrompt, quickActions, pageTitle }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [weddingContext, setWeddingContext] = useState('');
  const bottomRef = useRef(null);
  const dialogRef = useModalFocusTrap(onClose);

  useEffect(() => {
    setMessages([]);
    setInput('');
    setWeddingContext('');
    buildWeddingContext()
      .then(ctx => setWeddingContext(ctx))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const updateAction = (msgIndex, actionId, patch) => {
    setMessages(prev => prev.map((m, i) =>
      i !== msgIndex ? m : {
        ...m,
        actions: m.actions.map(a => a.id === actionId ? { ...a, ...patch } : a),
      }
    ));
  };

  const confirmAction = async (msgIndex, actionId) => {
    const action = messages[msgIndex]?.actions?.find(a => a.id === actionId);
    if (!action) return;
    updateAction(msgIndex, actionId, { status: 'executing' });
    try {
      if (action.type === 'navigate') {
        navigate(action.data.path);
        updateAction(msgIndex, actionId, { status: 'done' });
        onClose();
        return;
      }
      const entityMap = {
        create_guest:       () => base44.entities.Guest.create(action.data),
        create_budget_item: () => base44.entities.Budget.create(action.data),
        create_vendor:      () => base44.entities.Vendor.create(action.data),
        create_schedule:    () => base44.entities.Schedule.create(action.data),
        update_guest:       () => base44.entities.Guest.update(action.data.id, action.data),
        update_vendor:      () => base44.entities.Vendor.update(action.data.id, action.data),
      };
      const fn = entityMap[action.type];
      if (fn) await fn();
      updateAction(msgIndex, actionId, { status: 'done' });
      toast.success(actionLabel(action.type, action.data));
    } catch {
      updateAction(msgIndex, actionId, { status: 'error' });
    }
  };

  const cancelAction = (msgIndex, actionId) => {
    updateAction(msgIndex, actionId, { status: 'cancelled' });
    setMessages(prev => [...prev, { role: 'ava', content: 'No problem, I won\'t do that.', actions: [] }]);
  };

  const sendMessage = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content }]);
    setLoading(true);
    try {
      const fullPrompt = [weddingContext, systemPrompt, ACTION_INSTRUCTIONS]
        .filter(Boolean).join('\n\n') + `\n\nUser: ${content}`;
      const res = await InvokeLLM({ prompt: fullPrompt, add_context_from_internet: false });
      const rawText = typeof res === 'string' ? res : JSON.stringify(res);
      const { cleanText, actions } = parseActions(rawText);
      setMessages(prev => [...prev, { role: 'ava', content: cleanText, actions }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ava', content: 'Sorry, something went wrong. Please try again.', actions: [] }]);
    }
    setLoading(false);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
      {...interactiveDivProps(onClose, { label: 'Close Ava modal' })}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{ background: '#FFFFFF', width: '100%', maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
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
          <button onClick={onClose} aria-label="Close Ava modal" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', display: 'flex', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Quick actions */}
        {quickActions.length > 0 && messages.length === 0 && (
          <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid rgba(10,10,10,0.08)', flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(10,10,10,0.6)', fontFamily: PJS, marginBottom: 8 }}>Quick actions</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {quickActions.map(action => (
                <button key={action} onClick={() => sendMessage(action)} disabled={loading}
                  style={{ padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(10,10,10,0.12)', background: 'rgba(10,10,10,0.03)', fontSize: 12, fontWeight: 600, fontFamily: PJS, color: '#0A0A0A', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.12s' }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(147,51,234,0.08)'; e.currentTarget.style.borderColor = '#9333ea'; e.currentTarget.style.color = '#9333ea'; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,10,10,0.03)'; e.currentTarget.style.borderColor = 'rgba(10,10,10,0.12)'; e.currentTarget.style.color = '#0A0A0A'; }}>
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 0 }}>
          {messages.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(10,10,10,0.6)', fontSize: 13, fontFamily: PJS }}>
              Ask me anything or choose a quick action above.
            </div>
          )}

          {messages.map((msg, msgIndex) => (
            <div key={msgIndex} style={{ display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'ava' && (
                  <div style={{ width: 24, height: 24, borderRadius: 999, background: 'linear-gradient(135deg, #ec4899, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8, marginTop: 2 }}>
                    <Sparkles size={11} style={{ color: '#fff' }} />
                  </div>
                )}
                {msg.content ? (
                  <div style={{
                    maxWidth: '75%', padding: '10px 14px', fontSize: 13, lineHeight: 1.6, fontFamily: PJS,
                    background: msg.role === 'user' ? 'linear-gradient(135deg, #ec4899, #9333ea)' : 'rgba(10,10,10,0.04)',
                    color: msg.role === 'user' ? '#fff' : '#0A0A0A',
                    borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                  </div>
                ) : null}
              </div>

              {/* Action confirmation cards */}
              {msg.actions?.map(action => (
                <ActionCard
                  key={action.id}
                  action={action}
                  onConfirm={() => confirmAction(msgIndex, action.id)}
                  onCancel={() => cancelAction(msgIndex, action.id)}
                />
              ))}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 999, background: 'linear-gradient(135deg, #ec4899, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles size={11} style={{ color: '#fff' }} />
              </div>
              <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: 'rgba(10,10,10,0.04)', borderRadius: '12px 12px 12px 2px' }}>
                {[0, 1, 2].map(d => (
                  <div key={d} style={{ width: 6, height: 6, borderRadius: 999, background: '#9333ea', opacity: 0.6, animation: `ava-pulse 1.2s ease-in-out ${d * 0.2}s infinite` }} />
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
            style={{ flex: 1, border: 'none', borderBottom: '1px solid rgba(10,10,10,0.15)', background: 'none', fontSize: 13, color: '#0A0A0A', fontFamily: PJS, outline: 'none', padding: '6px 0' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            aria-label="Send message"
            style={{ width: 32, height: 32, borderRadius: 999, border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', background: loading || !input.trim() ? 'rgba(10,10,10,0.1)' : 'linear-gradient(135deg, #ec4899, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
          >
            <Send size={13} style={{ color: loading || !input.trim() ? 'rgba(10,10,10,0.3)' : '#fff' }} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes ava-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1);   }
        }
      `}</style>
    </div>
  );
}
