/**
 * /mocks/universe/a — Direction A: GALLERY (full-bleed editorial).
 *
 * Mock-only design exploration for the Design Studio redesign. Not linked
 * from any nav; reachable only by typing the URL. Does not modify
 * UniverseStudio.jsx or any production page/route — this is a standalone
 * page reusing real universe data (src/lib/mockUniverseData.js →
 * UNIVERSE_CONFIGS) and real John & Suzanne wedding/asset data, read-only
 * (see src/components/mocks/MockShared.jsx's file header).
 *
 * The idea: the active universe leads the page as a statement, rendered in
 * its own palette/type, instead of a chip. Below it, a gallery wall of
 * large cinematic panels — one per universe, each in its own idiom.
 * Opening a panel expands it in place into a full-width immersive spread.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Loader2, ArrowDown, X } from 'lucide-react';
import { getMyWeddingDetails, getMyRecords } from '@/lib/resolveMyWedding';
import { MOCK_UNIVERSES, getMockUniverse } from '@/lib/mockUniverseData';
import {
  useGoogleFontsFor, PaletteSwatches, TypeSpecimen, RealAssetsSection,
  UniverseAssetQuintet, MOTIF_NOTES, mockActionToast, MockDataNotice,
} from '@/components/mocks/MockShared';

const PJS = "'Plus Jakarta Sans', sans-serif";

export default function MockUniverseA() {
  const navigate = useNavigate();
  const [weddingDetails, setWeddingDetails] = useState(null);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState('capri');
  const [lockedId, setLockedId] = useState(null);

  useGoogleFontsFor(MOCK_UNIVERSES);

  useEffect(() => {
    Promise.all([getMyWeddingDetails(), getMyRecords('Guest')])
      .then(([wd, g]) => { setWeddingDetails(wd || {}); setGuests(g || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeId = weddingDetails?.activeUniverse || 'capri';
  const active = getMockUniverse(activeId) || getMockUniverse('capri');
  const openUniverse = openId ? getMockUniverse(openId) : null;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
        <Loader2 size={22} className="animate-spin" style={{ color: '#E03553' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>

      {/* ── Neutral chrome kicker — the app frame stays quiet ── */}
      <div style={{ padding: '20px 32px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', margin: 0 }}>
          Design Studio — mock A · Gallery
        </p>
        <MockDataNotice loading={loading} weddingDetails={weddingDetails} />
      </div>

      {/* ── Hero: the active universe leads the page as a statement ── */}
      <div style={{
        margin: '20px 32px 0', minHeight: 340, background: active.colors.darkBg,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: 'clamp(28px, 5vw, 64px)', position: 'relative', overflow: 'hidden',
      }}>
        <p style={{ fontFamily: PJS, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: active.colors.accent, margin: '0 0 12px' }}>
          {active.copy.heroKicker || `You're in ${active.name}`}
        </p>
        <h1 style={{ fontFamily: active.typography.headingFont, fontSize: 'clamp(2.4rem, 6vw, 5.2rem)', color: active.colors.lightBg, margin: 0, lineHeight: 1.02 }}>
          You're in {active.name}
        </h1>
        <p style={{ fontFamily: active.typography.bodyFont, fontSize: 'clamp(1rem, 1.6vw, 1.3rem)', color: active.colors.lightBg, opacity: 0.75, margin: '10px 0 0', maxWidth: 560 }}>
          {active.tagline} — your invitations, website, RSVP and print pieces are all styled from this one world.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 28, flexWrap: 'wrap' }}>
          <a href="#gallery-wall" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 999, background: active.colors.accent, color: active.colors.darkBg, fontFamily: PJS, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            Explore all 10 worlds <ArrowDown size={12} />
          </a>
          <p style={{ fontFamily: PJS, fontSize: 11, color: active.colors.lightBg, opacity: 0.5, margin: 0 }}>
            Switching universes restyles your existing invitations, website and RSVP — nothing is lost.
          </p>
        </div>
      </div>

      {/* ── Gallery wall ── */}
      <div id="gallery-wall" style={{ padding: '40px 32px 8px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', margin: '0 0 16px' }}>
          All 10 worlds
        </p>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 12, scrollSnapType: 'x proximity' }}>
          {MOCK_UNIVERSES.map(u => {
            const isOpen = openId === u.id;
            const isCurrent = activeId === u.id;
            return (
              <button
                key={u.id}
                onClick={() => { u.isUltra ? (setLockedId(u.id), setOpenId(null)) : (setOpenId(u.id), setLockedId(null)); }}
                style={{
                  flexShrink: 0, width: 'min(78vw, 320px)', height: 420, scrollSnapAlign: 'start',
                  background: u.colors.darkBg, border: isOpen || (u.isUltra && lockedId === u.id) ? `2px solid ${u.colors.accent}` : '2px solid transparent',
                  cursor: 'pointer', position: 'relative', overflow: 'hidden', padding: 0, textAlign: 'left',
                  filter: u.isUltra ? 'saturate(0.55) brightness(0.8)' : 'none',
                }}
              >
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 22 }}>
                  <p style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: u.colors.accent, margin: '0 0 8px' }}>
                    {u.tagline}
                  </p>
                  <h3 style={{ fontFamily: u.typography.headingFont, fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', color: u.colors.lightBg, margin: 0, lineHeight: 1.05 }}>
                    {u.name}
                  </h3>
                </div>
                {isCurrent && (
                  <span style={{ position: 'absolute', top: 14, left: 14, fontSize: 10, fontWeight: 700, fontFamily: PJS, letterSpacing: '0.08em', color: u.colors.darkBg, background: u.colors.accent, padding: '4px 10px', borderRadius: 999 }}>
                    Current
                  </span>
                )}
                {u.isUltra && (
                  <span style={{ position: 'absolute', top: 14, right: 14, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, fontFamily: PJS, letterSpacing: '0.06em', color: '#FFFFFF', background: 'rgba(0,0,0,0.55)', padding: '4px 10px', borderRadius: 999 }}>
                    <Crown size={10} /> Ultra
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Opened universe: full-width immersive spread ── */}
      {openUniverse && (
        <div style={{ margin: '24px 32px 0', border: `1px solid ${openUniverse.colors.darkBg}` }}>
          <div style={{ background: openUniverse.colors.darkBg, padding: 'clamp(24px, 4vw, 48px)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontFamily: PJS, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: openUniverse.colors.accent, margin: '0 0 8px' }}>
                {openUniverse.copy.heroKicker || `Nº — ${openUniverse.name}`}
              </p>
              <h2 style={{ fontFamily: openUniverse.typography.headingFont, fontSize: 'clamp(2rem, 4vw, 3.4rem)', color: openUniverse.colors.lightBg, margin: 0 }}>
                {openUniverse.name}
              </h2>
              <p style={{ fontFamily: openUniverse.typography.bodyFont, fontSize: 14, color: openUniverse.colors.lightBg, opacity: 0.7, margin: '8px 0 0', maxWidth: 520 }}>
                {MOTIF_NOTES[openUniverse.id]}
              </p>
            </div>
            <button onClick={() => setOpenId(null)} style={{ background: 'none', border: `1px solid ${openUniverse.colors.lightBg}55`, borderRadius: 999, color: openUniverse.colors.lightBg, cursor: 'pointer', padding: 8, display: 'flex' }}>
              <X size={14} />
            </button>
          </div>

          <div style={{ background: openUniverse.colors.lightBg, padding: 'clamp(24px, 4vw, 48px)', display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
              <PaletteSwatches colors={openUniverse.colors} textOn={openUniverse.colors.lightText} />
              <TypeSpecimen typography={openUniverse.typography} textOn={openUniverse.colors.lightText} />
            </div>

            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: openUniverse.colors.lightText, opacity: 0.5, margin: '0 0 12px' }}>
                Assets in this world
              </p>
              <UniverseAssetQuintet universeId={openUniverse.id} weddingDetails={weddingDetails} guests={guests} colors={openUniverse.colors} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <button
                onClick={() => mockActionToast('Make this my universe')}
                style={{ padding: '10px 22px', borderRadius: 999, border: 'none', background: openUniverse.colors.accent, color: openUniverse.colors.darkBg, fontFamily: PJS, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Make this my universe
              </button>
              <p style={{ fontSize: 11, fontFamily: PJS, color: openUniverse.colors.lightText, opacity: 0.5, margin: 0 }}>
                Restyles your existing assets — nothing is deleted or rebuilt from scratch.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Locked (Ultra) universe spread ── */}
      {lockedId && (() => {
        const u = getMockUniverse(lockedId);
        return (
          <div style={{ margin: '24px 32px 0', border: '1px solid rgba(10,10,10,0.12)' }}>
            <div style={{ background: u.colors.darkBg, filter: 'saturate(0.4) brightness(0.75)', padding: 'clamp(24px, 4vw, 48px)', position: 'relative' }}>
              <p style={{ fontFamily: PJS, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: u.colors.accent, margin: '0 0 8px' }}>{u.tagline}</p>
              <h2 style={{ fontFamily: u.typography.headingFont, fontSize: 'clamp(2rem, 4vw, 3.4rem)', color: u.colors.lightBg, margin: 0 }}>{u.name}</h2>
              <button onClick={() => setLockedId(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: `1px solid ${u.colors.lightBg}55`, borderRadius: 999, color: u.colors.lightBg, cursor: 'pointer', padding: 8, display: 'flex' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#FBBF24,#F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Crown size={18} color="#FFFFFF" />
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <p style={{ fontFamily: PJS, fontSize: 14, fontWeight: 700, color: '#0A0A0A', margin: '0 0 4px' }}>{u.name} is part of Ultra</p>
                <p style={{ fontFamily: PJS, fontSize: 12, color: 'rgba(10,10,10,0.5)', margin: 0 }}>Upgrade to unlock the full palette, type, motifs and asset previews for this world.</p>
              </div>
              <button onClick={() => navigate('/account')} style={{ padding: '9px 20px', borderRadius: 999, border: 'none', background: '#E03553', color: '#FFFFFF', fontFamily: PJS, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                Upgrade to Ultra
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── Your design assets — cinematic filmstrip framing ── */}
      <div style={{ background: '#0A0A0A', marginTop: 48, padding: 'clamp(28px, 5vw, 56px) 32px' }}>
        <p style={{ fontFamily: active.typography.headingFont, fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: '#FFFFFF', margin: '0 0 20px' }}>
          Your design assets
        </p>
        <div style={{ background: '#FFFFFF', padding: 24 }}>
          <RealAssetsSection universe={activeId} weddingDetails={weddingDetails} guests={guests} />
        </div>
      </div>
    </div>
  );
}
