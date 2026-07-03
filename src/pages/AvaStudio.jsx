import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getMyWeddingDetails } from '@/lib/resolveMyWedding';

const sans = "'Plus Jakarta Sans', sans-serif";

export default function AvaStudio() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(() => localStorage.getItem('ava-studio-mode') || 'dark');
  const [details, setDetails] = useState(null);
  const [avaRec, setAvaRec] = useState(null);
  const [avaLoading, setAvaLoading] = useState(false);

  const dark = mode === 'dark';
  const bg = dark ? '#0A0A0A' : '#FFFFFF';
  const fg = dark ? '#FFFFFF' : '#0A0A0A';
  const sub = dark ? 'rgba(255,255,255,0.45)' : '#666';
  const border = dark ? 'rgba(255,255,255,0.1)' : '#EEEEEE';
  const cardBg = dark ? 'rgba(255,255,255,0.03)' : '#FAFAFA';

  const toggleMode = () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    localStorage.setItem('ava-studio-mode', next);
  };

  useEffect(() => {
    getMyWeddingDetails().then(r => { if (r) setDetails(r); });
  }, []);

  const coupleName = details?.coupleNames || `${details?.couple1Name || 'You'} & ${details?.couple2Name || 'Your Partner'}`;
  const firstName = details?.couple1Name || 'there';

  // Count completed pages / assets
  const pageSections = details?.pageSections || {};
  const completedPages = Object.values(pageSections).filter(s => s && s.length > 0).length;
  const assetContent = details?.assetContent || {};
  const assetKeys = ['saveTheDate', 'weddingInvitation', 'rsvpCard', 'menuCard', 'placeCard', 'welcomeSignage', 'programCard', 'thankYouCard', 'mealChoice', 'seatingChart'];
  const completedAssets = assetKeys.filter(k => assetContent[k] && Object.keys(assetContent[k]).some(f => assetContent[k][f])).length;

  const handleAvaDecide = async () => {
    setAvaLoading(true);
    const completionState = {
      pagesBuilt: completedPages,
      assetsBuilt: completedAssets,
      hasPhoto: !!details?.coverPhoto,
      hasStory: !!details?.coupleStory,
      hasCeremony: !!details?.mainCeremony?.venueName,
      hasRSVP: (details?.enabledPages || []).includes('rsvp'),
    };
    try {
      const rec = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Ava, a warm and expert wedding website specialist. A couple is building their wedding website. Here's their current progress: ${JSON.stringify(completionState)}. In 2-3 sentences max, tell them the single most important next step and WHY it matters. Be warm, direct, and specific. Don't use lists. Sound like a trusted friend, not a chatbot.`,
      });
      setAvaRec(rec);
    } catch {
      setAvaRec("I recommend starting with your cover photo — it's the first thing guests see and sets the entire mood of your website. Once that's in place, everything else flows naturally from there.");
    }
    setAvaLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: sans, display: 'flex', flexDirection: 'column' }}>
      {/* TOP BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 40px', flexShrink: 0 }}>
        <button onClick={() => navigate('/studio')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: sub, fontFamily: sans }}>
          ← Studio
        </button>
        <button onClick={toggleMode} style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${border}`, borderRadius: 100, padding: '6px 14px', cursor: 'pointer', background: 'transparent' }}>
          <span style={{ fontSize: 14 }}>{dark ? '☀️' : '🌙'}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: sub, fontFamily: sans }}>{dark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>

      {/* HERO */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 40px 60px', textAlign: 'center' }}>

        {/* Ava avatar */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #E03553, #803D81)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, marginBottom: 32, animation: 'avaPulseGlow 3s ease-in-out infinite',
        }}>✦</div>

        <p style={{ fontSize: 12, color: sub, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16, margin: '0 0 16px' }}>
          Your personal wedding specialist
        </p>

        <h1 style={{ fontWeight: 700, fontSize: 'clamp(34px, 5.5vw, 66px)', color: fg, letterSpacing: '-0.02em', lineHeight: 1.1, margin: '0 0 20px', maxWidth: 700 }}>
          Hi {firstName}. I'm Ava.<br />
          <span style={{ background: 'linear-gradient(135deg, #E03553, #803D81)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Let's build something beautiful.
          </span>
        </h1>

        <p style={{ fontSize: 16, color: sub, maxWidth: 460, lineHeight: 1.7, margin: '0 0 44px' }}>
          I'll guide you through your wedding website and invitation suite one step at a time. No overwhelm. Just focus — and results you'll love.
        </p>

        {/* Progress pills */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 44, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { label: 'Website Pages', done: completedPages, total: 9, icon: '🌐' },
            { label: 'Assets', done: completedAssets, total: 10, icon: '✉️' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', border: `1px solid ${border}`, borderRadius: 100 }}>
              <span>{item.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: dark ? 'rgba(255,255,255,0.7)' : '#444' }}>{item.label}</span>
              <span style={{ fontSize: 12, color: item.done === item.total ? '#22C55E' : sub }}>
                {item.done}/{item.total}
              </span>
            </div>
          ))}
        </div>

        {/* MAIN ACTION CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, maxWidth: 640, width: '100%', marginBottom: 32 }}>
          <ActionCard
            emoji="🌐" title="Build Guest Suite" subtitle="One page at a time. I'll guide you through each section."
            cta={`${completedPages} of 9 done →`} ctaColor="#E03553"
            border={border} cardBg={cardBg} fg={fg} sub={sub} hoverColor="#E03553"
            onClick={() => navigate('/studio/ava/website')}
          />
          <ActionCard
            emoji="✉️" title="Create Assets" subtitle="Save the Dates, invitations, menus — one at a time."
            cta={`${completedAssets} of 10 done →`} ctaColor="#803D81"
            border={border} cardBg={cardBg} fg={fg} sub={sub} hoverColor="#803D81"
            onClick={() => navigate('/studio/ava/assets')}
          />
        </div>

        {/* Let Ava Decide */}
        <button
          onClick={handleAvaDecide}
          disabled={avaLoading}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: 'transparent', border: `1px solid ${dark ? 'rgba(224,53,83,0.4)' : 'rgba(224,53,83,0.3)'}`, borderRadius: 100, cursor: 'pointer', color: '#E03553', fontSize: 13, fontWeight: 600, fontFamily: sans, marginBottom: 24 }}
        >
          <span>✦</span>
          <span>{avaLoading ? 'Thinking…' : "Let Ava decide what's next"}</span>
        </button>

        {/* Ava recommendation bubble */}
        {avaRec && (
          <div style={{ background: dark ? 'rgba(224,53,83,0.06)' : 'rgba(224,53,83,0.04)', border: '1px solid rgba(224,53,83,0.2)', padding: 24, maxWidth: 480, width: '100%', marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #E03553, #803D81)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>✦</div>
              <p style={{ fontSize: 11, color: '#E03553', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: 8, margin: 0 }}>Ava's Recommendation</p>
            </div>
            <p style={{ fontSize: 15, color: fg, lineHeight: 1.65, margin: '0 0 20px' }}>{avaRec}</p>
            <button onClick={() => navigate('/studio/ava/website')} style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #E03553, #803D81)', color: '#FFF', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: sans }}>
              Let's do it →
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes avaPulseGlow {
          0%, 100% { box-shadow: 0 0 40px rgba(224,53,83,0.2); }
          50% { box-shadow: 0 0 80px rgba(224,53,83,0.45), 0 0 120px rgba(128,61,129,0.2); }
        }
      `}</style>
    </div>
  );
}

function ActionCard({ emoji, title, subtitle, cta, ctaColor, border, cardBg, fg, sub, hoverColor, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 32, border: hovered ? `1px solid ${hoverColor}` : `1px solid ${border}`,
        background: hovered ? `${hoverColor}08` : cardBg,
        cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease',
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 16 }}>{emoji}</div>
      <p style={{ fontSize: 16, fontWeight: 700, color: fg, margin: '0 0 6px' }}>{title}</p>
      <p style={{ fontSize: 13, color: sub, lineHeight: 1.5, margin: '0 0 20px' }}>{subtitle}</p>
      <div style={{ fontSize: 11, fontWeight: 600, color: ctaColor, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{cta}</div>
    </div>
  );
}