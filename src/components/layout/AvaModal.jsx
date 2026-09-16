import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { InvokeLLM } from '@/integrations/Core';
import AvaActionCard, { actionLabel } from '@/components/layout/AvaActionCard';
import { executeAvaAction, filterActionsToMirror } from '@/lib/avaExecute';
import { parseActions } from '@/lib/avaActions';
import { base44 } from '@/api/base44Client';
import { getMyRecords, getMyWeddingDetails, putMyWeddingDetails } from '@/lib/resolveMyWedding';
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

/**
 * `body` LETS A PAGE PUT ITS OWN TOOL INSIDE THE ONE SHELL.
 *
 * Owner ruling, Run 5 T3: every page-level Ask Ava opens one shared shell.
 * Vows & speeches has a writer — tabs, a generator, a refiner — that is not a
 * chat and should not become one. Rather than leave it as a second window with
 * its own navy header, the shell supplies the frame, the title and the quick
 * actions, and the writer renders as the content.
 *
 * With a body there is no transcript and no composer: the page's tool IS the
 * conversation. Without one, nothing changes for the twenty-five pages that
 * use the chat.
 */
export default function AvaModal({ isOpen, onClose, systemPrompt, quickActions = [], pageTitle = 'Ava', body = null }) {
  if (!isOpen) return null;
  return <AvaModalDialog onClose={onClose} systemPrompt={systemPrompt} quickActions={quickActions} pageTitle={pageTitle} body={body} />;
}

function AvaModalDialog({ onClose, systemPrompt, quickActions, pageTitle, body }) {
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
        entities: base44.entities, createGuest, updateGuest, navigate, currentPath: location.pathname,
        listTodos: () => getMyRecords('Note'),
        readWeddingDetails: getMyWeddingDetails,
        putWeddingFields: putMyWeddingDetails,
        listVendors: () => getMyRecords('Vendor'),
        listGuests: () => getMyRecords('Guest'),
      });
      if (!ok) {
        updateAction(msgIndex, actionId, { status: 'error', error });
        toast.error(error);
        return;
      }
      updateAction(msgIndex, actionId, { status: 'done' });
      if (action.type === 'navigate') { onClose(); return; }
      toast.success(actionLabel(action.type, action.data));
    } catch (err) {
      // NOT AN EMPTY CATCH. executeAvaAction returns {ok:false} for what it can
      // check and THROWS for what only the backend knows — a 404 on a row that
      // is not there is the second kind, and it was landing here and being
      // dropped: no toast, and a card reading "Could not do that".
      const message = err?.message || 'Something went wrong doing that.';
      updateAction(msgIndex, actionId, { status: 'error', error: message });
      toast.error(message);
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
      const actions = filterActionsToMirror(proposed, ACTION_MIRROR, location.pathname);
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
      <DialogContent
        /* A NAME TO ASK THE SHELL BY. `[data-ava-pod]` exists because
           "the pod did not open" could otherwise only be guessed at from
           geometry — and a plant proved that deleting the attribute left
           every pod assertion green, since a selector matching nothing
           also matches nothing. The same is true of "this is the one
           shell": without a name, a page could open a bespoke dialog and
           any structural check would pass on it. */
        data-ava-shell
        title={`Ask Ava — ${pageTitle}`} className={`p-0 gap-0 w-full flex flex-col overflow-hidden [&>button]:hidden ${body ? 'max-w-[760px] max-h-[92vh]' : 'max-w-[560px] max-h-[80vh]'}`}>
        {/* ── ONE SHELL, FLAT, AND THE MARK SAID ONCE (owner ruling, Run 5 T3) ──
            The header was a pink-to-purple gradient carrying the Ava mark
            TWICE — a Sparkles icon and the ✦ beside it — over a two-line title
            that repeated the page name under the word "Ava". None of that is
            the brand: the product is flat #E03553, and a mark shown twice in
            one header is decoration rather than identity.

            The title is now the sentence the dialog already passes to
            DialogContent, so the visible heading and the accessible name are
            the same string rather than two descriptions of the same window. */}
        <div style={{ background: '#E03553', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: PJS }}>
            ✦ Ask Ava — {pageTitle}
          </span>
          <button onClick={onClose} aria-label="Close Ava modal" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', display: 'flex', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Quick actions */}
        {quickActions.length > 0 && messages.length === 0 && (
          <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid rgba(10,10,10,0.12)', flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(10,10,10,0.6)', fontFamily: PJS, marginBottom: 8 }}>Quick actions</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {quickActions.map(action => (
                <button key={action} onClick={() => sendMessage(action)} disabled={loading}
                  style={{ padding: '5px 12px', borderRadius: 999, border: '1px solid rgba(10,10,10,0.12)', background: 'rgba(10,10,10,0.03)', fontSize: 12, fontWeight: 600, fontFamily: PJS, color: '#0A0A0A', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.12s' }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(224,53,83,0.08)'; e.currentTarget.style.borderColor = '#E03553'; e.currentTarget.style.color = '#E03553'; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,10,10,0.03)'; e.currentTarget.style.borderColor = 'rgba(10,10,10,0.12)'; e.currentTarget.style.color = '#0A0A0A'; }}>
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* A PAGE'S OWN TOOL, WHERE THE CHAT WOULD BE. The header, the title
            and the quick actions are the shell's; below them the page decides
            whether the answer is a conversation or an instrument. */}
        {body ? (
          /* The body owns its own scrolling — a tool with pinned tabs and a
             scrolling pane under them needs the column, not a scroll box. */
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>{body}</div>
        ) : (
        <>
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
                  <div style={{ width: 24, height: 24, borderRadius: 999, background: '#E03553', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8, marginTop: 2 }}>
                    <Sparkles size={11} style={{ color: '#fff' }} />
                  </div>
                )}
                {msg.content ? (
                  <div style={{
                    maxWidth: '75%', padding: '10px 14px', fontSize: 13, lineHeight: 1.6, fontFamily: PJS,
                    background: msg.role === 'user' ? '#E03553' : 'rgba(10,10,10,0.04)',
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
              <div style={{ width: 24, height: 24, borderRadius: 999, background: '#E03553', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles size={11} style={{ color: '#fff' }} />
              </div>
              <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: 'rgba(10,10,10,0.04)', borderRadius: '12px 12px 12px 2px' }}>
                {[0, 1, 2].map(d => (
                  <div key={d} style={{ width: 6, height: 6, borderRadius: 999, background: '#E03553', opacity: 0.6, animation: `ava-pulse 1.2s ease-in-out ${d * 0.2}s infinite` }} />
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
            style={{ width: 32, height: 32, borderRadius: 999, border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', background: loading || !input.trim() ? 'rgba(10,10,10,0.1)' : '#E03553', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
          >
            {/* 0.3 here is textDisabled and is correct: this branch only
                renders while the button is disabled, and WCAG 1.4.11 exempts
                disabled controls from the 3:1 non-text minimum. Ticket C
                raised ENABLED icon-only controls to iconMuted 0.45 and
                deliberately left this one — do not "fix" it to 0.45. */}
            <Send size={13} style={{ color: loading || !input.trim() ? 'rgba(10,10,10,0.3)' : '#fff' }} />
          </button>
        </div>
        </>
        )}
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
