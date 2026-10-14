/**
 * src/components/professional/ProAva.jsx
 *
 * Ava's panel inside Professional, on the existing Ava plumbing
 * (base44.integrations.Core.InvokeLLM). Opened by openProAva({ key, eventId })
 * from any screen. The facts are computed here, never by the model.
 */
import React, { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { unwrapLlmReply } from '@/lib/avaRequest';
import { useProStore } from '@/lib/professionalStore';
import { PROMPTS, factsFor, buildProPrompt, factsAreClean } from '@/lib/professionalAva';
import { useIsMobile } from '@/hooks/use-mobile';
import { s, PRO, PJS } from './proTheme';
import { TYPE } from '@/styles/typeScale';

const EVT = 'oi-pro-ava';
export const openProAva = (detail = {}) => window.dispatchEvent(new CustomEvent(EVT, { detail }));
const FAILED = 'Ava couldn’t answer just now. Try again in a moment.';

export function ProAvaButton({ label = 'Ask Ava', prompt = 'week', eventId = null }) {
  return (
    <button type="button" onClick={() => openProAva({ key: prompt, eventId })} style={{ ...s.btnPrimary, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Sparkles size={13} aria-hidden="true" /> {label}
    </button>
  );
}

export default function ProAva() {
  const store = useProStore();
  const mobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [ctx, setCtx] = useState({ key: 'week', eventId: null });
  const [text, setText] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const on = (e) => { setCtx({ key: e.detail?.key || 'week', eventId: e.detail?.eventId || null }); setAnswer(''); setText(''); setOpen(true); };
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);

  if (!open) return null;
  const event = store.ProEvent.find((e) => e.id === ctx.eventId) || null;
  const prompts = PROMPTS.filter((p) => !p.needsEvent || event);

  const ask = async (key, userText = '') => {
    setBusy(true);
    setAnswer('');
    const facts = factsFor(key, { store, event });
    const guestNames = store.ProGuest.map((g) => g.name);
    if (!factsAreClean(facts, guestNames)) { setBusy(false); setAnswer(FAILED); return; }
    try {
      const res = await base44.integrations.Core.InvokeLLM({ model: 'claude_sonnet_4_6', prompt: buildProPrompt(key, facts, userText) });
      setAnswer(unwrapLlmReply(res, FAILED));
    } catch {
      setAnswer(FAILED);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside role="dialog" aria-label="Ava" style={{ position: 'fixed', zIndex: 70, right: mobile ? 0 : 16, bottom: mobile ? 0 : 16, left: mobile ? 0 : 'auto', top: mobile ? PRO.barHeight : 'auto', width: mobile ? 'auto' : 420, maxHeight: mobile ? undefined : '70vh', background: '#FFFFFF', border: `1px solid ${PRO.borderStrong}`, display: 'flex', flexDirection: 'column', fontFamily: PJS }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: `1px solid ${PRO.border}` }}>
        <Sparkles size={14} color={PRO.red} aria-hidden="true" />
        <span style={{ fontSize: TYPE.body, fontWeight: 600, flex: 1 }}>Ava{event ? `, on ${event.couple_names}` : ''}</span>
        <button type="button" aria-label="Close Ava" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PRO.icon, display: 'flex' }}><X size={16} /></button>
      </header>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {prompts.map((p) => <button key={p.key} type="button" disabled={busy} onClick={() => { setCtx((c) => ({ ...c, key: p.key })); ask(p.key); }} style={s.btnSecondary}>{p.label}</button>)}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) ask(ctx.key, text); }} style={{ display: 'flex', gap: 8 }}>
          <input aria-label="Ask Ava" value={text} onChange={(e) => setText(e.target.value)} placeholder="Or ask something about these facts" style={{ ...s.input, flex: 1 }} />
          <button type="submit" style={s.btnPrimary} disabled={busy}>Ask</button>
        </form>
        {busy && <p style={{ ...s.secondary, margin: 0 }}>Ava is thinking.</p>}
        {answer && <div style={{ ...s.body, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{answer}</div>}
        <p style={{ ...s.secondary, margin: 0 }}>Ava drafts and suggests from your own events. She never sees guests&apos; names or contact details, and never sends anything.</p>
      </div>
    </aside>
  );
}
