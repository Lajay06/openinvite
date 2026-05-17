import React from 'react';
import { Sparkles } from 'lucide-react';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function AvaButton({ label, onClick }) {
  return (
    <button
      onClick={onClick || (() => window.dispatchEvent(new CustomEvent('openAva')))}
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
