import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { InvokeLLM } from '@/integrations/Core';
import AvaActionCard, { actionLabel } from '@/components/layout/AvaActionCard';
import { executeAvaAction, filterActionsToMirror } from '@/lib/avaExecute';
import { parseActions } from '@/lib/avaActions';
import { base44 } from '@/api/base44Client';
import { buildWeddingContext } from '@/lib/avaContext';
import { buildAvaPrompt, ACTION_MIRROR, unwrapLlmReply } from '@/lib/avaRequest';
import { filterUnbackedOffers } from '@/lib/avaOfferFilter';
import toast from 'react-hot-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { createGuest, updateGuest } from '@/lib/guestWrites';

const PJS = "'Plus Jakarta Sans', sans-serif";

// ACTION_INSTRUCTIONS USED TO LIVE HERE, as a hand-written list of seven
// example ACTION blocks plus their field names. It has moved to
// src/lib/avaRequest.js and is now GENERATED from ACTION_MIRROR, because the
// pod could not import a constant that lived inside this component and so had
// no action mirror at all — every offer it made was unbacked by construction.
// One list, four consumers: the prompt, the confirm card, the executor below,
// and the post-filter that removes offers the list does not back.

/* actionLabel and ActionCard LIVED HERE, private to this file, which is why
   the pod could not have them — Ruling 11's "until the confirm card is ported
   to it". They are now src/components/layout/AvaActionCard.jsx, one component
   with a `tone` prop, and the executor beneath them is
   src/lib/avaExecute.js. Copying either into the pod would have produced two
   code paths that write to the couple's database and drift apart. */

export default function AvaModal({ isOpen, onClose, systemPrompt, quickActions = [], pageTitle = 'Ava' }) {
  if (!isOpen) return null;
  return <AvaModalDialog onClose={onClose} systemPrompt={systemPrompt} quickActions={quickActions} pageTitle={pageTitle} />;
}

function AvaModalDialog({ onClose, systemPrompt, quickActions, pageTitle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [weddingContext, setWeddingContext] = useState('');
  const bottomRef = useRef(null);

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
      // ONE EXECUTOR, BOTH FRAMES. The validation gate, the refuse-loudly rule
      // and every entity write live in src/lib/avaExecute.js now; this decides
      // only what the modal does about the result.
      const { ok, error } = await executeAvaAction(action, {
        entities: base44.entities, createGuest, updateGuest, navigate,
      });
      if (!ok) {
        updateAction(msgIndex, actionId, { status: 'error' });
        toast.error(error);
        return;
      }
      updateAction(msgIndex, actionId, { status: 'done' });
      if (action.type === 'navigate') { onClose(); return; }
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
      // THE WHOLE FIX IS IN THIS CALL. It used to be four lines that sent the
      // wedding context, the page's voice line and the action list — and NOT
      // the conversation, and NOT the route. Two consecutive turns produced
      // byte-identical prompts of 3004 characters, which is why Ava repeated
      // herself, and neither contained "/budget" while open on the Budget page,
      // which is why a bare "is this enough?" was answered about guests.
      const fullPrompt = buildAvaPrompt({
        weddingContext,
        systemPrompt,
        page: location.pathname,
        messages: [...messages, { role: 'user', content }],
        mirror: ACTION_MIRROR,
        userText: content,
      });
      const res = await InvokeLLM({ prompt: fullPrompt, add_context_from_internet: false });
      // `JSON.stringify(res)` was here, so an object answer rendered as
      // {"result":"…","status":"success"} in the couple's chat bubble.
      const rawText = unwrapLlmReply(res, 'Sorry, something went wrong. Please try again.');
      const { cleanText, actions: proposed } = parseActions(rawText);
      // Same guard as the pod: a proposal outside the mirror never becomes a
      // card, whatever the model emitted.
      const actions = filterActionsToMirror(proposed, ACTION_MIRROR);
      // No private powers: an offer the mirror does not back never reaches
      // the couple, whatever the prompt asked for.
      const { text: safeText } = filterUnbackedOffers(cleanText, ACTION_MIRROR);
      setMessages(prev => [...prev, { role: 'ava', content: safeText, actions }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ava', content: 'Sorry, something went wrong. Please try again.', actions: [] }]);
    }
    setLoading(false);
  };

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent title={`Ask Ava — ${pageTitle}`} className="p-0 gap-0 max-w-[560px] w-full max-h-[80vh] flex flex-col overflow-hidden [&>button]:hidden">
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
          <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid rgba(10,10,10,0.12)', flexShrink: 0 }}>
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
                <AvaActionCard
                  key={action.id}
                  action={action}
                  tone="light"
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
        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid rgba(10,10,10,0.12)', flexShrink: 0, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
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
            {/* 0.3 here is textDisabled and is correct: this branch only
                renders while the button is disabled, and WCAG 1.4.11 exempts
                disabled controls from the 3:1 non-text minimum. Ticket C
                raised ENABLED icon-only controls to iconMuted 0.45 and
                deliberately left this one — do not "fix" it to 0.45. */}
            <Send size={13} style={{ color: loading || !input.trim() ? 'rgba(10,10,10,0.3)' : '#fff' }} />
          </button>
        </div>
      </DialogContent>

      <style>{`
        @keyframes ava-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1);   }
        }
      `}</style>
    </Dialog>
  );
}
