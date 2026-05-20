import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AmanUniverseView from '@/components/studio/AmanUniverseView';

const UNIVERSES = [
  { id: 'aman', name: 'AMAN', tagline: 'Quiet Luxury', number: '01', photo: 'https://static.wixstatic.com/media/d2df22_8e79926ce6c74e55aa7ee84c8a8be77c~mv2.jpg', available: true },
  { id: 'tulum', name: 'TULUM', tagline: 'Desert Bloom', number: '02', photo: 'https://static.wixstatic.com/media/d2df22_13c4e04a228543a184b586a274ce748a~mv2.jpg', available: true },
  { id: 'kyoto', name: 'KYOTO', tagline: 'Zen & Ceremony', number: '03', photo: 'https://static.wixstatic.com/media/d2df22_40822e26660c4112aef53ff2526c0345~mv2.jpg', available: true },
  { id: 'capri', name: 'CAPRI', tagline: 'Italian Coast', number: '04', photo: 'https://static.wixstatic.com/media/d2df22_9b775b3cf3ad493e9437383894f91e9b~mv2.jpg', available: true },
  { id: 'marrakech', name: 'MARRAKECH', tagline: 'Spice & Gold', number: '05', photo: 'https://static.wixstatic.com/media/d2df22_5ea2e70835a14465be546237fd1dd55a~mv2.jpg', available: true },
  { id: 'brooklyn', name: 'BROOKLYN', tagline: 'Industrial Edge', number: '06', photo: 'https://static.wixstatic.com/media/d2df22_f0eef5788fdd4876a0a300e43228f919~mv2.jpg', available: true },
  { id: 'bali', name: 'BALI', tagline: 'Sacred Garden', number: '07', photo: 'https://static.wixstatic.com/media/d2df22_e30eff6d03424dd6baf63143722b2a3d~mv2.jpg', available: true },
  { id: 'paris', name: 'PARIS', tagline: 'Haussmann Romance', number: '08', photo: 'https://static.wixstatic.com/media/d2df22_6aab4aa83a3b40eabd571d355ed75c7c~mv2.jpg', available: true },
  { id: 'cape-town', name: 'CAPE TOWN', tagline: 'Wild & Free', number: '09', photo: 'https://static.wixstatic.com/media/d2df22_2bbfee1f5b034379a76f063c2f97f653~mv2.jpg', available: true },
];

function ComingSoonOverlay({ universe, onBack }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0A0A0A', display: 'flex', flexDirection: 'column',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div style={{
        height: 56, display: 'flex', alignItems: 'center',
        padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
          ← Back
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, textAlign: 'center' }}>
        <img src={universe.photo} alt={universe.name} style={{ width: '100%', maxWidth: 400, height: 260, objectFit: 'cover', opacity: 0.2, marginBottom: 48 }} />
        <h1 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 300, fontSize: 'clamp(60px, 10vw, 100px)', color: '#FFFFFF', letterSpacing: '0.2em', margin: '0 0 16px', lineHeight: 1 }}>{universe.name}</h1>
        <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: 20, color: 'rgba(255,255,255,0.4)', margin: '0 0 32px' }}>{universe.tagline}</p>
        <p style={{ fontSize: 14, color: '#888888', margin: '0 0 8px' }}>Coming Soon</p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', maxWidth: 360, lineHeight: 1.7 }}>We're working on this universe. Stay tuned.</p>
      </div>
    </motion.div>
  );
}

export default function OnboardingStepUniverse({ onNext, data, theme }) {
  const [selectedUniverse, setSelectedUniverse] = useState(data.activeUniverse || null);
  const [websiteMode, setWebsiteMode] = useState(data.websiteMode || 'dark');
  const [previewUniverse, setPreviewUniverse] = useState(null);
  const isDark = theme !== 'light';
  const textPrimary = isDark ? '#FFFFFF' : '#0A0A0A';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
  const textFaint = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';

  const handleContinue = () => {
    onNext({ activeUniverse: selectedUniverse || 'aman', websiteMode });
  };

  const handleSelectFromOverlay = () => {
    setSelectedUniverse(previewUniverse.id);
    setPreviewUniverse(null);
  };

  return (
    <>
      <div style={{ width: '100%', maxWidth: 960, margin: '0 auto', paddingTop: 40, paddingBottom: 60, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {/* Ava prompt */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12, paddingLeft: 4 }}
        >
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #E03553, #803D81)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#FFF', flexShrink: 0, marginTop: 2 }}>✦</div>
          <div>
            <p style={{ fontSize: 16, color: textPrimary, lineHeight: 1.6, margin: 0, maxWidth: 560 }}>
              "Now let's choose the aesthetic for your entire wedding — your invitations, website, and every piece of design will follow this style."
            </p>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          style={{ fontSize: 13, color: textFaint, marginBottom: 28, paddingLeft: 42 }}
        >
          Tap any universe to preview it. You can change this at any time from your Design Studio.
        </motion.p>

        {/* Universe cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, scrollbarWidth: 'none' }}
        >
          {UNIVERSES.map((u) => {
            const isSelected = selectedUniverse === u.id;
            return (
              <div
                key={u.id}
                onClick={() => u.id === 'aman' ? setPreviewUniverse(u) : setSelectedUniverse(u.id)}
                style={{
                  width: 220, flexShrink: 0, height: 280,
                  position: 'relative', overflow: 'hidden',
                  cursor: 'pointer',
                  border: isSelected ? '1px solid rgba(255,255,255,0.6)' : '1px solid transparent',
                  transition: 'border 0.2s ease',
                  opacity: 1,
                  background: '#111',
                }}
              >
                <img
                  src={u.photo}
                  alt={u.name}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45 }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0A0A0A 0%, rgba(10,10,10,0.6) 50%, transparent 100%)' }} />

                {/* Selected badge */}
                {isSelected && (
                  <div style={{ position: 'absolute', top: 12, right: 12, padding: '3px 0' }}>
                  </div>
                )}

                {/* Bottom info */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 16px 18px' }}>
                  <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 300, fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', margin: '0 0 4px' }}>{u.number}</p>
                  <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0, letterSpacing: '0.05em' }}>{u.tagline}</p>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Website mode */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ marginTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: textMuted, fontFamily: 'Plus Jakarta Sans, sans-serif', margin: 0 }}>
            Website appearance
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Dark', 'Light'].map(mode => (
              <button
                key={mode}
                onClick={() => setWebsiteMode(mode.toLowerCase())}
                style={{
                  padding: '8px 24px',
                  border: `1px solid ${websiteMode === mode.toLowerCase() ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  background: websiteMode === mode.toLowerCase() ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: websiteMode === mode.toLowerCase() ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  transition: 'all 0.2s ease',
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Continue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}
        >
          <button
            onClick={handleContinue}
            disabled={!selectedUniverse}
            style={{
              padding: '14px 48px',
              background: selectedUniverse ? 'linear-gradient(135deg, #E03553, #803D81)' : 'transparent',
              border: selectedUniverse ? 'none' : '1px solid rgba(255,255,255,0.25)',
              color: selectedUniverse ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
              cursor: selectedUniverse ? 'pointer' : 'default',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              transition: 'all 0.3s ease',
            }}
          >
            Continue →
          </button>
        </motion.div>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {previewUniverse && previewUniverse.id === 'aman' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, overflowY: 'auto' }}
          >
            <AmanUniverseView
              isOnboarding={true}
              onBack={() => setPreviewUniverse(null)}
              onSelect={handleSelectFromOverlay}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`div::-webkit-scrollbar { display: none; }`}</style>
    </>
  );
}