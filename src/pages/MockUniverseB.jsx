/**
 * /mocks/universe/b — Direction B: TILE + WORLD PAGE.
 *
 * Mock-only. See MockUniverseA.jsx's header for the shared ground rules
 * (real universe data, real read-only John & Suzanne data, no production
 * files touched, no real writes).
 *
 * The idea: a bold grid of large poster tiles. Clicking one swaps the
 * content area (client-side state, same URL — a "page" within the mock)
 * into a full world page: brand reveal, palette/type/motif, asset
 * previews as they'd look in that world, and one clear "Make this my
 * universe" action. Ultra worlds show the lock and an upgrade path here
 * instead of the reveal.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Loader2, ArrowLeft, Lock } from 'lucide-react';
import { getMyWeddingDetails, getMyRecords } from '@/lib/resolveMyWedding';
import { MOCK_UNIVERSES, getMockUniverse } from '@/lib/mockUniverseData';
import {
  useGoogleFontsFor, PaletteSwatches, TypeSpecimen, RealAssetsSection,
  UniverseAssetQuintet, MOTIF_NOTES, mockActionToast, MockDataNotice,
} from '@/components/mocks/MockShared';

const PJS = "'Plus Jakarta Sans', sans-serif";

function WorldPage({ universe, isCurrent, weddingDetails, guests, onBack, navigate }) {
  const locked = universe.isUltra;
  return (
    <div>
      <div style={{ padding: '20px 32px 0' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid rgba(10,10,10,0.15)', borderRadius: 999, padding: '7px 16px', cursor: 'pointer', fontFamily: PJS, fontSize: 12, fontWeight: 600, color: '#0A0A0A' }}>
          <ArrowLeft size={13} /> All worlds
        </button>
      </div>

      {/* Brand reveal */}
      <div style={{
        margin: '20px 32px 0', minHeight: 300, background: universe.colors.darkBg,
        filter: locked ? 'saturate(0.4) brightness(0.7)' : 'none',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: 'clamp(28px, 5vw, 56px)', position: 'relative',
      }}>
        <p style={{ fontFamily: PJS, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: universe.colors.accent, margin: '0 0 10px' }}>
          {universe.tagline}
        </p>
        <h1 style={{ fontFamily: universe.typography.headingFont, fontSize: 'clamp(2.4rem, 6vw, 5rem)', color: universe.colors.lightBg, margin: 0, lineHeight: 1.02 }}>
          {universe.name}
        </h1>
        {isCurrent && !locked && (
          <span style={{ position: 'absolute', top: 20, right: 20, fontSize: 10, fontWeight: 700, fontFamily: PJS, letterSpacing: '0.08em', color: universe.colors.darkBg, background: universe.colors.accent, padding: '5px 12px', borderRadius: 999 }}>
            Your current universe
          </span>
        )}
      </div>

      {locked ? (
        <div style={{ margin: '0 32px', padding: '32px', border: '1px solid rgba(10,10,10,0.1)', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#FBBF24,#F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Crown size={20} color="#FFFFFF" />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <p style={{ fontFamily: PJS, fontSize: 15, fontWeight: 700, color: '#0A0A0A', margin: '0 0 6px' }}>{universe.name} is part of Ultra</p>
            <p style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.5)', margin: 0, maxWidth: 480 }}>
              Upgrade to unlock this world's full palette, type pairing, signature motif and asset previews — plus every other Ultra-only universe.
            </p>
          </div>
          <button onClick={() => navigate('/account')} style={{ padding: '10px 22px', borderRadius: 999, border: 'none', background: '#E03553', color: '#FFFFFF', fontFamily: PJS, fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lock size={12} /> Upgrade to Ultra
          </button>
        </div>
      ) : (
        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            <PaletteSwatches colors={universe.colors} />
            <TypeSpecimen typography={universe.typography} />
          </div>
          <p style={{ fontFamily: PJS, fontSize: 13, color: 'rgba(10,10,10,0.55)', margin: 0, maxWidth: 640 }}>
            <strong style={{ color: '#0A0A0A' }}>Signature motif — </strong>{MOTIF_NOTES[universe.id]}
          </p>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', margin: '0 0 12px' }}>
              How your assets look in this world
            </p>
            <UniverseAssetQuintet universeId={universe.id} weddingDetails={weddingDetails} guests={guests} colors={universe.colors} />
          </div>
          <div>
            <button
              onClick={() => mockActionToast('Make this my universe')}
              style={{ padding: '12px 28px', borderRadius: 999, border: 'none', background: universe.colors.accent, color: universe.colors.darkBg, fontFamily: PJS, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              Make this my universe
            </button>
            <p style={{ fontFamily: PJS, fontSize: 11, color: 'rgba(10,10,10,0.6)', margin: '8px 0 0' }}>
              Restyles your existing invitations, website and RSVP — switching is never destructive.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MockUniverseB() {
  const navigate = useNavigate();
  const [weddingDetails, setWeddingDetails] = useState(null);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState('capri');

  useGoogleFontsFor(MOCK_UNIVERSES);

  useEffect(() => {
    Promise.all([getMyWeddingDetails(), getMyRecords('Guest')])
      .then(([wd, g]) => { setWeddingDetails(wd || {}); setGuests(g || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
        <Loader2 size={22} className="animate-spin" style={{ color: '#E03553' }} />
      </div>
    );
  }

  const activeId = weddingDetails?.activeUniverse || 'capri';
  const open = openId ? getMockUniverse(openId) : null;

  if (open) {
    return (
      <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>
        <WorldPage universe={open} isCurrent={activeId === open.id} weddingDetails={weddingDetails} guests={guests} onBack={() => setOpenId(null)} navigate={navigate} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>
      {/* ── Header: neutral chrome, bold statement ── */}
      <div style={{ padding: '28px 32px 24px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', margin: '0 0 6px' }}>
          Design Studio — mock B · Tile + world page
        </p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', fontWeight: 800, color: '#0A0A0A', margin: 0, letterSpacing: '-0.01em' }}>
          10 worlds, one wedding
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.5)', margin: '8px 0 0', maxWidth: 560 }}>
          Every universe restyles your invitations, website, RSVP and print pieces at once. Open one to see its full world — switching is never destructive.
        </p>
        <MockDataNotice loading={loading} weddingDetails={weddingDetails} />
      </div>

      {/* ── Tile grid ── */}
      <div style={{ padding: '28px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
          {MOCK_UNIVERSES.map(u => {
            const isCurrent = activeId === u.id;
            return (
              <button
                key={u.id}
                onClick={() => setOpenId(u.id)}
                style={{
                  height: 320, background: u.colors.darkBg, border: isCurrent ? `2px solid ${u.colors.accent}` : '2px solid transparent',
                  cursor: 'pointer', position: 'relative', overflow: 'hidden', padding: 0, textAlign: 'left',
                  filter: u.isUltra ? 'saturate(0.5) brightness(0.78)' : 'none',
                }}
              >
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    {isCurrent && (
                      <span style={{ fontSize: 9, fontWeight: 700, fontFamily: PJS, letterSpacing: '0.06em', color: u.colors.darkBg, background: u.colors.accent, padding: '3px 9px', borderRadius: 999 }}>
                        Current
                      </span>
                    )}
                    {u.isUltra && (
                      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, fontFamily: PJS, letterSpacing: '0.06em', color: '#FFFFFF', background: 'rgba(0,0,0,0.5)', padding: '3px 9px', borderRadius: 999 }}>
                        <Crown size={9} /> Ultra
                      </span>
                    )}
                  </div>
                  <div>
                    <p style={{ fontFamily: PJS, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: u.colors.accent, margin: '0 0 6px' }}>{u.tagline}</p>
                    <h3 style={{ fontFamily: u.typography.headingFont, fontSize: 'clamp(1.6rem, 2.4vw, 2.2rem)', color: u.colors.lightBg, margin: 0, lineHeight: 1.05 }}>{u.name}</h3>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Your design assets ── */}
      <div style={{ padding: '8px 32px 56px' }}>
        <p style={{ fontSize: 20, fontWeight: 800, color: '#0A0A0A', margin: '24px 0 16px', letterSpacing: '-0.01em' }}>
          Your design assets
        </p>
        <RealAssetsSection universe={activeId} weddingDetails={weddingDetails} guests={guests} />
      </div>
    </div>
  );
}
