import React, { useState, useEffect, useRef } from 'react';
import { color } from '@/styles/tokens';
import { parseAvaText } from '@/lib/avaMarkdown';
import { base44 } from '@/api/base44Client';
import { getMyRecords, getMyWeddingDetails, putMyWeddingDetails } from '@/lib/resolveMyWedding';
import { buildWeddingContext } from '@/lib/avaContext';
import { buildAvaPrompt, unwrapLlmReply, ACTION_MIRROR } from '@/lib/avaRequest';
import { filterUnbackedOffers } from '@/lib/avaOfferFilter';
import { executeAvaAction, POD_EXCLUDED_TYPES, filterActionsToMirror } from '@/lib/avaExecute';
import AvaActionCard, { actionLabel } from '@/components/layout/AvaActionCard';
import { parseActions } from '@/lib/avaActions';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

/**
 * THE POD'S MIRROR, NOW THAT IT HAS A CONFIRM CARD.
 *
 * It was `[]`, and the comment here said so honestly: a frame's powers are the
 * actions it can propose AND confirm, and this frame had nothing to press.
 * Ruling 11 (claude/ava-design-spec.md) recorded that as correct "until the
 * confirm card is ported to it". It is ported, so the mirror is real.
 *
 * IT IS ACTION_MIRROR MINUS GUEST EDITS, expressed as a subtraction rather
 * than as a second list — so it can only ever be a subset and this frame can
 * never invent a power the modal does not have.
 *
 * WHY GUESTS ARE OUT. A guest is a person with an email address, an RSVP and a
 * seat. Adding one from a chat window — where the couple confirms a one-line
 * card rather than filling the guest form — creates a half-record that then
 * has to be found and completed. The modal keeps them because it is opened
 * FROM the guest page, with that page's context and that page's form a click
 * away. The pod is opened from anywhere.
 */
const POD_MIRROR = ACTION_MIRROR.filter(a => !POD_EXCLUDED_TYPES.includes(a.type));

const WELCOME = {
  role: 'assistant',
  content: "Hi! I'm Ava, your wedding specialist. Ask me anything — about your planning, your website, your guest list, or anything else wedding related.",
  id: 'welcome',
};

/**
 * THE CONVERSATION IS THE LAYOUT'S, NOT THE POD'S (spec 3.4).
 *
 * It was useState in here, and this component unmounts on close — so closing
 * the pod erased the conversation. A couple who closed it to look at the page
 * they were asking about came back to an empty window. `messages`,
 * `dismissed` and `onClear` are passed in from Layout, which stays mounted.
 *
 * Ruling 8 still holds: this is a TRANSCRIPT, in memory, for the session. It
 * carries no facts about the wedding, it is gone on reload, and every answer
 * is still read fresh from the record.
 */
function AvaChatPod({ onClose, openDetail, messages, setMessages, dismissed, setDismissed, onClear }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [weddingContext, setWeddingContext] = useState('');
  // DISMISSED PROPOSALS STAY DISMISSED (spec ruling 9). A card the couple
  // cancelled must not come back in the same conversation, so the ACTION's
  // shape is remembered — type plus a stable digest of its data — and any
  // later proposal matching one is dropped before it is ever rendered.
  // Not the card id: a re-offer is a NEW id for the same thing, which is
  // exactly the case this exists to catch.
  const navigate = useNavigate();
  const location = useLocation();

  // Opened from a page's own "Ask Ava" button: put its question in the box,
  // unsent. The couple presses send — Ava is not asked anything on their
  // behalf.
  useEffect(() => {
    if (openDetail?.seedQuestion) setInput(openDetail.seedQuestion);
  }, [openDetail]);

  /**
   * WHAT A PROPOSAL IS, for the purpose of remembering a No.
   * Its type and its data — never its id, because a re-offer arrives with a
   * fresh id every time and that is exactly the case this exists to catch.
   */
  const actionKey = (a) => `${a.type}:${JSON.stringify(a.data || {})}`;
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    buildWeddingContext().then(setWeddingContext).catch(() => {});
  }, []);

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
      // The route the pod was opened FROM, not the one the couple has since
      // navigated to — a question asked from Seating stays a seating question.
      const currentPage = openDetail?.page || location.pathname;
      const systemPrompt = `You are Ava, the AI wedding specialist built into Openinvite — a premium wedding planning platform. You are warm, knowledgeable, concise, and personal. You help couples with wedding planning advice, timelines, their Openinvite dashboard, Guest Suite (website builder and invitation assets), guest management, budget, vendor management, vow writing, and RSVP management. The Guest Suite is where couples build their guest suite, invitation assets (Save the Date, Digital Invitation, Menu Card, Seating Chart, etc.), Experience Guide, and Policies — accessed via Design Studio → Guest Suite. Keep responses conversational and brief — 2-4 sentences unless they ask for detail. Never use emojis. Use "✦" sparingly for emphasis only.\n\nUse the wedding context below to tailor every answer to this specific couple — their theme, faith/culture, venues, and universe should shape your suggestions, not just generic advice. If the couple has selected cultures and traditions, actively bring in specific, named traditions relevant to those cultures where it's genuinely useful — not just a passing mention that you're "aware" of their background. For example: suggest a Mehndi night in schedule/timeline advice for a couple with Pakistani or Indian heritage, a tea ceremony for Chinese heritage, a sofreh aghd setup for Persian/Iranian heritage — and the equivalent for whatever other cultures they've selected, drawing on real knowledge of that tradition rather than generic "consider your culture" hedging. The context includes a per-guest list (name, RSVP status, table, meal) — this is the owner's own data in their own dashboard, so answer specific questions about a named guest directly (e.g. "has X RSVP'd?", "what table is X on?") using that list, rather than deflecting to aggregate counts only.`;
      // Assembled by the shared builder, so this frame and the modal are one
      // assistant with two doors rather than two assistants. What this frame
      // had that the modal did not — the conversation, the route — it keeps;
      // what it never had — a declared list of what Ava can do — it now
      // states, as the empty list, because that is what is true here.
      const fullPrompt = buildAvaPrompt({
        weddingContext,
        systemPrompt,
        page: currentPage,
        // What THIS page is for, in one sentence, supplied by the button that
        // opened the pod. This is where the retired "wedding favours" and
        // "seating arrangement specialist" modals' prompts now live: the
        // context moved, the second window did not survive.
        pageContext: openDetail?.pageContext,
        messages: newMessages,
        mirror: POD_MIRROR,
        userText: text,
      });
      const response = await base44.integrations.Core.InvokeLLM({
        model: 'claude_sonnet_4_6',
        prompt: fullPrompt,
      });

      const raw = unwrapLlmReply(response, "I'm having trouble responding right now. Please try again.");
      const { cleanText, actions } = parseActions(raw);
      const { text: avaReply } = filterUnbackedOffers(cleanText, POD_MIRROR);
      // A PROPOSAL THE COUPLE ALREADY SAID NO TO IS NOT PROPOSED AGAIN.
      // Matched on what the action WOULD DO, not on its id — a re-offer
      // arrives with a fresh id every time.
      // Mirror first, then dismissals: an action this frame cannot do is
      // dropped before it is ever a card, whatever the model emitted.
      const backed = filterActionsToMirror(actions, POD_MIRROR, location.pathname);
      const fresh = backed.filter(a => !dismissed.has(actionKey(a)));
      setMessages(prev => [...prev, { role: 'assistant', content: avaReply, actions: fresh, id: Date.now().toString() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.', id: 'error-' + Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const updateAction = (msgId, actionId, patch) => {
    setMessages(prev => prev.map(m => m.id !== msgId ? m : {
      ...m, actions: (m.actions || []).map(a => a.id === actionId ? { ...a, ...patch } : a),
    }));
  };

  const confirmAction = async (msgId, actionId) => {
    const msg = messages.find(m => m.id === msgId);
    const action = msg?.actions?.find(a => a.id === actionId);
    if (!action) return;
    updateAction(msgId, actionId, { status: 'executing' });
    try {
      const { ok, error } = await executeAvaAction(action, { entities: base44.entities, navigate, currentPath: location.pathname, listTodos: () => getMyRecords('Note'), readWeddingDetails: getMyWeddingDetails, putWeddingFields: putMyWeddingDetails, listVendors: () => getMyRecords('Vendor'), listGuests: () => getMyRecords('Guest') });
      if (!ok) { updateAction(msgId, actionId, { status: 'error', error }); toast.error(error); return; }
      updateAction(msgId, actionId, { status: 'done' });
      if (action.type !== 'navigate') toast.success(actionLabel(action.type, action.data));
    } catch (err) {
      // NOT AN EMPTY CATCH. executeAvaAction returns {ok:false} for what it can
      // check and THROWS for what only the backend knows — a 404 on a row that
      // is not there is the second kind, and it was landing here and being
      // dropped: no toast, and a card reading "Could not do that".
      const message = err?.message || 'Something went wrong doing that.';
      updateAction(msgId, actionId, { status: 'error', error: message });
      toast.error(message);
    }
  };

  const cancelAction = (msgId, actionId) => {
    const action = messages.find(m => m.id === msgId)?.actions?.find(a => a.id === actionId);
    if (action) setDismissed(prev => new Set(prev).add(actionKey(action)));
    updateAction(msgId, actionId, { status: 'cancelled' });
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
          background: color.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: '#FFF', flexShrink: 0,
          boxShadow: 'none',
        }}>✦</div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>Ava</p>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 400 }}>Your wedding specialist</p>
        </div>
        {/* ONE PLAIN CLEAR, no confirmation ceremony and no persuasion to
            keep it (spec 3.4). Shown only when there is something to clear. */}
        {messages.length > 0 && (
          <button
            onClick={onClear}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Clear
          </button>
        )}
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
        {(messages.length ? messages : [WELCOME]).map((msg) => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            gap: 8,
            alignItems: 'flex-end',
          }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: color.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#FFF', flexShrink: 0, marginBottom: 2 }}>✦</div>
            )}
            <div style={{
              maxWidth: '80%',
              padding: '10px 14px',
              background: msg.role === 'user' ? color.primary : 'rgba(255,255,255,0.07)',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              fontSize: 13,
              color: '#FFFFFF',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}>
              {/* MARKDOWN IN, TEXT OUT. The model writes `**$154,000**`
                  because models write markdown; this printed the string into
                  a pre-wrap div, so the asterisks were on screen. Bold renders
                  as bold and every other mark is stripped to its text — no raw
                  asterisk ever reaches the couple. Tokens, not HTML: this is
                  model output and there is no path here from a string to
                  parsed markup. See src/lib/avaMarkdown.js. */}
              {parseAvaText(msg.content).map((t, i) => (
                t.bold ? <strong key={i} style={{ fontWeight: 700 }}>{t.text}</strong> : <React.Fragment key={i}>{t.text}</React.Fragment>
              ))}
            </div>
            </div>
            {/* THE CONFIRM CARDS, under the message that proposed them —
                grouping them at the foot of the pod would separate a card
                from the sentence that explains it. Dark tone, from the same
                component the modal renders; Ruling 11's port. Nothing is
                written until the couple presses Confirm on one of these. */}
            {(msg.actions || []).map(action => (
              <div key={action.id} style={{ marginLeft: 32 }}>
                <AvaActionCard
                  action={action}
                  tone="dark"
                  onConfirm={() => confirmAction(msg.id, action.id)}
                  onCancel={() => cancelAction(msg.id, action.id)}
                />
              </div>
            ))}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: color.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#FFF', flexShrink: 0 }}>✦</div>
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
      {messages.length === 0 && (
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
              caretColor: color.primary,
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: input.trim() ? color.primary : 'rgba(255,255,255,0.1)',
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