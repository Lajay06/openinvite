/**
 * /mocks/universe/c — Direction C: ENTRANCE.
 *
 * Mock-only. See MockUniverseA.jsx's header for the shared ground rules
 * (real universe data, real read-only John & Suzanne data, no production
 * files touched, no real writes).
 *
 * The idea: leans on the existing guest-facing "entrance moment" concept
 * (src/components/guest-website/EntranceMoment.jsx — same framer-motion +
 * useReducedMotion pattern reused here, not reinvented) applied to the
 * couple's OWN universe picker. Previewing a universe briefly takes over
 * the screen with that world's own motion calibration, then lands on a
 * detail view styled in that universe's own layout idiom rather than a
 * neutral template. Reduced-motion gets a near-instant static equivalent,
 * never the theatrical wash.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Crown, Loader2, ArrowLeft } from 'lucide-react';
import { getMyWeddingDetails, getMyRecords } from '@/lib/resolveMyWedding';
import { MOCK_UNIVERSES, getMockUniverse } from '@/lib/mockUniverseData';
import {
  useGoogleFontsFor, PaletteSwatches, TypeSpecimen, RealAssetsSection,
  UniverseAssetQuintet, MOTIF_NOTES, mockActionToast, MockDataNotice,
} from '@/components/mocks/MockShared';

const PJS = "'Plus Jakarta Sans', sans-serif";

// Per-universe layout idiom, in miniature — real `layout` ids from
// UNIVERSE_CONFIGS, given a distinct-enough structural treatment here
// rather than one neutral template for all 10. Capri and Marrakech (the
// two required by this mock) get their real documented idiom; everything
// else falls back to a centred composition, honestly, since building all
// 10 real layout primitives is out of scope for a mock.
function DetailMasthead({ universe }) {
  const { typography, colors, copy } = universe;
  const kicker = copy.heroKicker || universe.name;

  if (universe.layout === 'editorial-masthead') {
    // Marrakech's real idiom: Nº kicker + oversized asymmetric-broken name.
    return (
      <div style={{ textAlign: 'left', maxWidth: 720 }}>
        <p style={{ fontFamily: PJS, fontSize: 12, fontWeight: 700, letterSpacing: '0.22em', color: colors.accent, margin: '0 0 18px' }}>{kicker}</p>
        <h1 style={{ fontFamily: typography.headingFont, fontSize: 'clamp(2.6rem, 7vw, 6.2rem)', color: colors.lightBg, margin: 0, lineHeight: 0.95 }}>
          {universe.name}<br /><i style={{ opacity: 0.8 }}>— {universe.tagline}</i>
        </h1>
      </div>
    );
  }
  if (universe.layout === 'capri-citrus') {
    // Capri's real idiom: bold, breezy, kicker sits beside the name.
    return (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: typography.headingFont, fontSize: 'clamp(2.6rem, 6vw, 5.4rem)', color: colors.lightBg, margin: 0 }}>{universe.name}</h1>
        <p style={{ fontFamily: PJS, fontSize: 14, fontWeight: 700, color: colors.accent, margin: 0 }}>{kicker}</p>
      </div>
    );
  }
  // Fallback — quiet centred composition.
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontFamily: PJS, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: colors.accent, margin: '0 0 14px' }}>{kicker}</p>
      <h1 style={{ fontFamily: typography.headingFont, fontSize: 'clamp(2.2rem, 5vw, 4.2rem)', color: colors.lightBg, margin: 0 }}>{universe.name}</h1>
    </div>
  );
}

function Portal({ u, isCurrent, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        background: 'none', border: 'none', cursor: 'pointer', padding: 12, flexShrink: 0, width: 132,
      }}
    >
      <div style={{
        width: 96, height: 96, borderRadius: '50%', background: u.colors.darkBg,
        border: isCurrent ? `2px solid ${u.colors.accent}` : '2px solid transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        filter: u.isUltra ? 'saturate(0.5) brightness(0.75)' : 'none',
      }}>
        <span style={{ fontFamily: u.typography.headingFont, fontSize: 22, color: u.colors.lightBg }}>{u.name[0]}</span>
        {u.isUltra && (
          <span style={{ position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#FBBF24,#F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Crown size={10} color="#FFFFFF" />
          </span>
        )}
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: PJS, fontSize: 12, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>{u.name}</p>
        <p style={{ fontFamily: PJS, fontSize: 10, color: 'rgba(10,10,10,0.4)', margin: '2px 0 0' }}>{u.tagline}</p>
      </div>
    </button>
  );
}

export default function MockUniverseC() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [weddingDetails, setWeddingDetails] = useState(null);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState('browsing'); // browsing | entering | detail | entering-locked | locked
  const [openId, setOpenId] = useState(null);

  useGoogleFontsFor(MOCK_UNIVERSES);

  useEffect(() => {
    Promise.all([getMyWeddingDetails(), getMyRecords('Guest')])
      .then(([wd, g]) => { setWeddingDetails(wd || {}); setGuests(g || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeId = weddingDetails?.activeUniverse || 'capri';
  const opened = openId ? getMockUniverse(openId) : null;

  const enterUniverse = (u) => {
    setOpenId(u.id);
    const nextPhase = u.isUltra ? 'entering-locked' : 'entering';
    setPhase(nextPhase);
    // Reduced motion: near-instant, no lingering full-screen takeover.
    const washMs = prefersReducedMotion ? 120 : Math.round((u.motion?.duration || 0.7) * 1000) + 250;
    setTimeout(() => setPhase(nextPhase === 'entering-locked' ? 'locked' : 'detail'), washMs);
  };

  const backToBrowsing = () => { setPhase('browsing'); setOpenId(null); };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
        <Loader2 size={22} className="animate-spin" style={{ color: '#E03553' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>

      {/* ── Entrance-wash overlay — plays only during entering/entering-locked ── */}
      <AnimatePresence>
        {(phase === 'entering' || phase === 'entering-locked') && opened && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.08 : (opened.motion?.duration || 0.7), ease: 'easeInOut' }}
            style={{
              position: 'fixed', inset: 0, zIndex: 2000,
              background: opened.colors.darkBg,
              filter: phase === 'entering-locked' ? 'saturate(0.35) brightness(0.7)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {!prefersReducedMotion && (
              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: (opened.motion?.duration || 0.7), delay: 0.1, ease: 'easeOut' }}
                style={{ fontFamily: opened.typography.headingFont, fontSize: 'clamp(1.6rem, 4vw, 3rem)', color: opened.colors.lightBg, margin: 0 }}
              >
                {opened.name}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {phase === 'browsing' && (
        <>
          {/* ── Header ── */}
          <div style={{ padding: '28px 32px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', margin: '0 0 6px' }}>
              Design Studio — mock C · Entrance
            </p>
            <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, color: '#0A0A0A', margin: 0, letterSpacing: '-0.01em' }}>
              Step into your universe
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.5)', margin: '8px 0 0', maxWidth: 560 }}>
              Choose a world to preview it — each one takes over the screen briefly with its own motion, then lands you inside. Switching is never destructive.
            </p>
            <MockDataNotice loading={loading} weddingDetails={weddingDetails} />
          </div>

          {/* ── Portals ── */}
          <div style={{ padding: '32px', display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            {MOCK_UNIVERSES.map(u => (
              <Portal key={u.id} u={u} isCurrent={activeId === u.id} onClick={() => enterUniverse(u)} />
            ))}
          </div>

          {/* ── Your design assets — atmospheric energy ── */}
          <div style={{ background: '#0A0A0A', marginTop: 24, padding: 'clamp(28px, 5vw, 56px) 32px' }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', margin: '0 0 20px', letterSpacing: '-0.01em' }}>
              Your design assets
            </p>
            <div style={{ background: '#FFFFFF', padding: 24 }}>
              <RealAssetsSection universe={activeId} weddingDetails={weddingDetails} guests={guests} />
            </div>
          </div>
        </>
      )}

      {phase === 'detail' && opened && (
        <div>
          <div style={{ padding: '20px 32px 0' }}>
            <button onClick={backToBrowsing} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 999, padding: '7px 16px', cursor: 'pointer', fontFamily: PJS, fontSize: 12, fontWeight: 600, color: '#0A0A0A' }}>
              <ArrowLeft size={13} /> All worlds
            </button>
          </div>
          <div style={{ margin: '20px 32px 0', minHeight: 320, background: opened.colors.darkBg, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(28px, 5vw, 56px)' }}>
            <DetailMasthead universe={opened} />
          </div>
          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 32 }}>
            <p style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.55)', margin: 0, maxWidth: 640 }}>
              <strong style={{ color: '#0A0A0A' }}>Signature motif — </strong>{MOTIF_NOTES[opened.id]}
            </p>
            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
              <PaletteSwatches colors={opened.colors} />
              <TypeSpecimen typography={opened.typography} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.4)', margin: '0 0 12px' }}>
                Assets in this world
              </p>
              <UniverseAssetQuintet universeId={opened.id} weddingDetails={weddingDetails} guests={guests} colors={opened.colors} />
            </div>
            <div>
              <button
                onClick={() => mockActionToast('Set as my universe')}
                style={{ padding: '12px 28px', borderRadius: 999, border: 'none', background: opened.colors.accent, color: opened.colors.darkBg, fontFamily: PJS, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Set as my universe
              </button>
              <p style={{ fontFamily: PJS, fontSize: 11, color: 'rgba(10,10,10,0.4)', margin: '8px 0 0' }}>
                Restyles your existing invitations, website and RSVP — nothing is lost.
              </p>
            </div>
          </div>
        </div>
      )}

      {phase === 'locked' && opened && (
        <div>
          <div style={{ padding: '20px 32px 0' }}>
            <button onClick={backToBrowsing} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 999, padding: '7px 16px', cursor: 'pointer', fontFamily: PJS, fontSize: 12, fontWeight: 600, color: '#0A0A0A' }}>
              <ArrowLeft size={13} /> All worlds
            </button>
          </div>
          <div style={{ margin: '20px 32px 0', minHeight: 260, background: opened.colors.darkBg, filter: 'saturate(0.35) brightness(0.7)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 'clamp(28px, 5vw, 56px)' }}>
            <p style={{ fontFamily: PJS, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: opened.colors.accent, margin: '0 0 10px' }}>{opened.tagline}</p>
            <h1 style={{ fontFamily: opened.typography.headingFont, fontSize: 'clamp(2rem, 5vw, 3.6rem)', color: opened.colors.lightBg, margin: 0 }}>{opened.name}</h1>
          </div>
          <div style={{ margin: '24px 32px 0', padding: '28px', border: '1px solid rgba(10,10,10,0.1)', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#FBBF24,#F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Crown size={20} color="#FFFFFF" />
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <p style={{ fontFamily: PJS, fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: '0 0 6px' }}>{opened.name} is part of Ultra</p>
              <p style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.5)', margin: 0, maxWidth: 460 }}>
                We took you inside for a moment so you could feel the world — upgrading unlocks it fully, palette to print pieces.
              </p>
            </div>
            <button onClick={() => navigate('/account')} style={{ padding: '10px 22px', borderRadius: 999, border: 'none', background: '#E03553', color: '#FFFFFF', fontFamily: PJS, fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              Upgrade to Ultra
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
