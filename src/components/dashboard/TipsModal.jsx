import React, { useState } from 'react';

const tips = [
  {
    number: '01',
    title: 'Your dashboard is your command centre.',
    body: 'Everything for your wedding lives here — your guest list, budget, checklist, vendors, and more. Use the sidebar to navigate between sections. Each page is focused so you can plan without overwhelm.',
    cta: 'Got it',
  },
  {
    number: '02',
    title: 'Meet Ava — your AI wedding specialist.',
    body: 'Ava is built into every part of Openinvite. She can write your love story, generate your checklist, suggest budget adjustments, and help you find the right words for your vows. Look for the ✦ Ava button wherever you need a hand.',
    cta: 'Tell me more',
  },
  {
    number: '03',
    title: 'Pick a universe — your whole look, everywhere.',
    body: "Design Studio has 10 fully designed style universes to choose from. Your pick sets the fonts, colours, textures, and the entrance moment guests see the instant they open your site — and it carries through your website, invitations, and every asset automatically.",
    cta: 'Nice',
  },
  {
    number: '04',
    title: 'Build your site with blocks, guided one step at a time.',
    body: "The website builder works in blocks you can add, reorder, and personalise from the component library — no blank page. Prefer more guidance? Click \"✦ Ava's Studio\" inside Design Studio and she'll walk you through it question by question. Guests RSVP through a link unique to your site, and responses land straight back in your dashboard.",
    cta: 'Sounds good',
  },
  {
    number: '05',
    title: 'Your Guest Suite assets are ready to print.',
    body: "Save the Dates, invitations, menus, and more — all pre-designed in your universe and ready to download as real, print-ready files. And your wedding date, venue, and couple names are master details: set them once and they flow through your website, your assets, and Ava's suggestions. Change one thing — everything updates.",
    cta: "Let's go →",
    isLast: true,
  },
];

export default function TipsModal({ onClose }) {
  const [currentTip, setCurrentTip] = useState(0);
  const [key, setKey] = useState(0);

  const handleClose = () => {
    localStorage.setItem('openinvite_tips_shown', 'true');
    onClose();
  };

  const goToTip = (index) => {
    setCurrentTip(index);
    setKey(k => k + 1);
  };

  return (
    <>
      <style>{`
        @keyframes tipSlideIn {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Overlay */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
        onClick={handleClose}
      >
        {/* Panel */}
        <div
          style={{
            width: 560, maxWidth: '100%', background: '#FFFFFF', borderRadius: 16,
            maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ padding: '32px 32px 24px', borderBottom: '1px solid #EEEEEE' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #E03553, #803D81)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#FFF', flexShrink: 0 }}>✦</div>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0A0A0A', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Here's how to get started</h2>
              </div>
              <button onClick={handleClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', lineHeight: 1 }}>×</button>
            </div>

            {/* Step dots */}
            <div style={{ display: 'flex', gap: 6 }}>
              {tips.map((_, i) => (
                <div key={i} style={{ height: 3, flex: 1, borderRadius: 999, background: i <= currentTip ? 'linear-gradient(90deg, #E03553, #803D81)' : 'rgba(10,10,10,0.08)', transition: 'background 0.3s ease' }} />
              ))}
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: 32, minHeight: 280, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'auto' }}>
            <div key={key} style={{ animation: 'tipSlideIn 0.3s ease' }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', fontFamily: 'Plus Jakarta Sans', margin: '0 0 12px' }}>
                Tip {currentTip + 1} of {tips.length}
              </p>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: '#0A0A0A', lineHeight: 1.3, marginBottom: 16, marginTop: 0, fontFamily: 'Plus Jakarta Sans' }}>
                {tips[currentTip].title}
              </h3>
              <p style={{ fontSize: 15, color: '#0A0A0A', lineHeight: 1.7, margin: 0, fontFamily: 'Plus Jakarta Sans' }}>
                {tips[currentTip].body}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '24px 32px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #EEEEEE', marginTop: 'auto' }}>
            <button
              onClick={handleClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(10,10,10,0.4)', fontFamily: 'Plus Jakarta Sans' }}
            >
              Skip all
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              {currentTip > 0 && (
                <button onClick={() => goToTip(currentTip - 1)} style={{ padding: '10px 20px', borderRadius: 999, border: '1px solid #EEEEEE', background: 'transparent', color: '#0A0A0A', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans' }}>
                  ← Back
                </button>
              )}
              <button
                onClick={currentTip < tips.length - 1 ? () => goToTip(currentTip + 1) : handleClose}
                style={{ padding: '10px 24px', borderRadius: 999, background: currentTip === tips.length - 1 ? 'linear-gradient(135deg, #E03553, #803D81)' : '#0A0A0A', color: '#FFFFFF', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans' }}
              >
                {tips[currentTip].cta}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}