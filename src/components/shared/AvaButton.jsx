import React from 'react';
import { Sparkles } from 'lucide-react';
import { openAva } from '@/lib/avaOpen';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function AvaButton({ label, onClick, seedQuestion, pageContext }) {
  return (
    <button
      // The no-onClick path dispatched a CustomEvent NOTHING LISTENED FOR, so
      // four buttons — Account, Event details, Polls, Q&A — did nothing at all
      // when pressed. openAva() carries the page and any seed question, and
      // Layout listens. See src/lib/avaOpen.js.
      onClick={onClick || (() => openAva({ seedQuestion, pageContext }))}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        borderRadius: 999, padding: '7px 14px',
        background: 'linear-gradient(135deg, #ec4899, #9333ea)',
        color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: PJS,
        border: 'none', cursor: 'pointer',
        transition: 'transform 0.15s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <Sparkles size={13} />
      {label}
    </button>
  );
}
