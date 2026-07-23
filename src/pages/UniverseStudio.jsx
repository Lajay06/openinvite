/**
 * Design Studio (fix/design-studio-entrance, fix/design-studio-banners) —
 * rebuilt around the "entrance" concept explored in the
 * feat/mock/universe-studio-redesign mocks (direction C). The page is now
 * the universe experience itself: a stacked wall of full-width
 * photographic banners (microsoft.design/wallpapers reference — the
 * image IS the design), a style filter above them, and pressing a banner
 * triggers a full-screen entrance into that world.
 *
 * "Your design assets" has been removed from this page entirely — every
 * asset it used to show is reachable via Studio dashboard → Guest Suite
 * → Assets (StudioAssetsTab.jsx), which is the more complete of the two
 * (real PDF export via ASSET_EXPORT_SPECS); the live invitation website/
 * RSVP page are reachable via Guest Suite → Website (or the Preview
 * link). See this PR's description for the full asset-by-asset mapping
 * verified before this section was cut.
 *
 * Every palette/type/motion/motif/tag/description value is sourced from
 * UNIVERSE_CONFIGS (src/lib/websiteThemes.js) via src/lib/
 * universeCatalog.js — never hardcoded here. This retires
 * UniverseSelector.jsx, whose thumbnail swatches had drifted out of sync
 * with the real config (e.g. its Capri swatch was the old flagged navy/
 * lemon palette).
 */
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReducedMotion, motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Loader2, Calendar, MapPin, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getMyWeddingDetails, getMyRecords } from '@/lib/resolveMyWedding';
import { UNIVERSE_CATALOG, STYLE_TAGS, getUniverse } from '@/lib/universeCatalog';
import UniverseBanner from '@/components/universe-studio/UniverseBanner';
import UniverseEntranceOverlay from '@/components/universe-studio/UniverseEntranceOverlay';
import UniverseWorldView from '@/components/universe-studio/UniverseWorldView';
import AvaButton from '@/components/shared/AvaButton';
import AvaModal from '@/components/layout/AvaModal';
import DashboardPageHeader from '@/components/layout/DashboardPageHeader';

// chore/consolidate-overview — the couple name + days-to-go countdown are
// already global (Layout.jsx's top bar shows them on every page, per
// DESIGN_SPEC.md), so only venue + formatted date + venue photo — the
// pieces that had no other home in the app — are rehomed here from the
// retired GuestSuite.jsx "Overview" page.
function fmtWeddingDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

const PJS = "'Plus Jakarta Sans', sans-serif";
const WeddingDetails = base44.entities.WeddingDetails;

export default function UniverseStudio() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const canAccessUltra = (user?.plan || 'free') === 'ultra';

  const [weddingDetails, setWeddingDetails] = useState(null);
  const [guests, setGuests] = useState([]);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterTag, setFilterTag] = useState('all');

  const [phase, setPhase] = useState('browsing'); // browsing | entering | world
  const [openId, setOpenId] = useState(null);
  const [avaOpen, setAvaOpen] = useState(false);
  // Root cause of the mid-page landing bug: entering/leaving a world is a
  // same-page conditional re-render (no real route change — the banner
  // wall and the world view are two branches of one component, swapped
  // by `phase`), so the browser never touches window.scrollY on its own.
  // Whatever the wall was scrolled to when a banner was pressed is still
  // the scroll position once the world view's DOM mounts in its place —
  // this ref remembers that position so it can be restored on the way
  // back, and the world view resets scroll to 0 itself on mount (see
  // UniverseWorldView.jsx's own useLayoutEffect) rather than this page
  // reaching in to do it, so the fix holds regardless of how phase gets
  // there.
  const wallScrollRef = useRef(0);

  useEffect(() => {
    Promise.all([getMyWeddingDetails(), getMyRecords('Guest')])
      .then(([wd, g]) => {
        const details = wd || {};
        setWeddingDetails(details);
        setRecordId(details.id || null);
        setGuests(g || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeId = weddingDetails?.activeUniverse || 'london';
  const active = getUniverse(activeId) || getUniverse('london');
  const opened = openId ? getUniverse(openId) : null;

  // Rehomed from GuestSuite.jsx's "Overview" page (now retired) — the one
  // piece of couple-facing wedding info with no other home in the app.
  const venueName = weddingDetails?.mainCeremony?.venueName || '';
  const venuePhotoUrl = weddingDetails?.mainCeremony?.photoUrl || null;
  const weddingDateStr = fmtWeddingDate(weddingDetails?.weddingDate);
  const hasEventDetails = !!(weddingDetails?.couple1Name || weddingDetails?.weddingDate || venueName);

  const enterUniverse = (u) => {
    wallScrollRef.current = window.scrollY;
    setOpenId(u.id);
    setPhase('entering');
    const washMs = prefersReducedMotion ? 100 : Math.round((u.motion?.duration || 0.7) * 1000) + 250;
    setTimeout(() => setPhase('world'), washMs);
  };

  const backToBrowsing = () => { setPhase('browsing'); setOpenId(null); };

  // Restores the wall's scroll position on the way back — synchronously,
  // before the browser paints, so there's no visible jump to the top
  // followed by a jump back down. Harmless no-op on first mount
  // (wallScrollRef starts at 0, and the page is already at 0 then).
  useLayoutEffect(() => {
    if (phase === 'browsing') {
      window.scrollTo(0, wallScrollRef.current);
    }
  }, [phase]);

  const handleSwitchUniverse = async (universeId) => {
    try {
      if (recordId) {
        await WeddingDetails.update(recordId, { activeUniverse: universeId });
      } else {
        const created = await WeddingDetails.create({ activeUniverse: universeId });
        setRecordId(created.id);
      }
      setWeddingDetails(prev => ({ ...(prev || {}), activeUniverse: universeId }));
      const u = getUniverse(universeId);
      toast.success(`You're now in ${u?.name || universeId} — your invitations, website and RSVP are restyled.`);
    } catch {
      toast.error('Could not switch universe — please try again.');
    }
  };

  const handleUpgrade = () => navigate('/account');

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
        <Loader2 size={22} className="animate-spin" style={{ color: '#E03553' }} />
      </div>
    );
  }

  const visibleUniverses = UNIVERSE_CATALOG.filter(u =>
    filterTag === 'all' || u.tags.includes(filterTag) || u.id === activeId
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: PJS }}>

      <UniverseEntranceOverlay
        universe={opened}
        active={phase === 'entering'}
        muted={opened?.isUltra && !canAccessUltra}
        prefersReducedMotion={prefersReducedMotion}
      />

      {phase !== 'world' && (
        <>
          <DashboardPageHeader title="Design studio" subtitle="Choose the aesthetic for your entire wedding suite" />

          {/* Header — neutral chrome, current universe as a declaration.
              Padding normalised to the same 16px 32px every other page's
              Ava/actions bar uses (round 7 ask #8) — was 28px/24px, making
              this the one page whose combined header stack read taller
              than the rest of the app. */}
          <div style={{ padding: '16px 32px', borderBottom: '1px solid rgba(10,10,10,0.08)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(10,10,10,0.6)', margin: '0 0 8px' }}>
              Design Studio
            </p>
            <h1 style={{ fontSize: 'clamp(1.6rem, 2.6vw, 2.2rem)', fontWeight: 800, color: '#0A0A0A', margin: 0, letterSpacing: '-0.01em' }}>
              You're in {active.name} — {active.tagline}
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(10,10,10,0.5)', margin: '8px 0 0', maxWidth: 620 }}>
              Every universe restyles your invitations, website, RSVP and print pieces at once. Press a world below to step inside it — switching is never destructive.
            </p>

            {/* Rehomed from GuestSuite.jsx's "Overview" page (retired,
                chore/consolidate-overview) — venue/date/photo had no other
                home in the app; couple name + countdown stay out since
                Layout.jsx's top bar already shows those on every page. */}
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              {hasEventDetails ? (
                (weddingDateStr || venueName) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {venuePhotoUrl && (
                      <div style={{ width: 48, height: 48, flexShrink: 0, overflow: 'hidden', background: '#ECE7E1' }}>
                        <img
                          src={venuePhotoUrl}
                          alt={venueName || 'Venue'}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {weddingDateStr && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'rgba(10,10,10,0.55)', fontFamily: PJS }}>
                          <Calendar size={13} style={{ color: 'rgba(10,10,10,0.6)' }} /> {weddingDateStr}
                        </span>
                      )}
                      {venueName && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'rgba(10,10,10,0.55)', fontFamily: PJS }}>
                          <MapPin size={13} style={{ color: 'rgba(10,10,10,0.6)' }} /> {venueName}
                        </span>
                      )}
                    </div>
                  </div>
                )
              ) : (
                <button
                  onClick={() => navigate('/event-details')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
                    fontSize: 13, fontWeight: 700, color: '#E03553', fontFamily: PJS,
                    background: 'none', border: '1px solid rgba(224,53,83,0.3)', borderRadius: 999,
                    padding: '8px 16px', cursor: 'pointer',
                  }}
                >
                  Complete event details <ArrowRight size={13} />
                </button>
              )}
              <AvaButton label="Ask Ava about your design & guest experience" onClick={() => setAvaOpen(true)} />
            </div>
          </div>

          {/* Style filter */}
          <div style={{ padding: '20px 32px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['all', ...STYLE_TAGS].map(tag => {
              const isActive = filterTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setFilterTag(tag)}
                  style={{
                    padding: '6px 16px', borderRadius: 999, fontSize: 12, fontWeight: 600, fontFamily: PJS,
                    cursor: 'pointer', border: 'none', textTransform: 'none',
                    background: isActive ? '#0A0A0A' : 'rgba(10,10,10,0.06)',
                    color: isActive ? '#FFFFFF' : '#444444',
                  }}
                >
                  {tag === 'all' ? 'All' : tag.charAt(0).toUpperCase() + tag.slice(1)}
                </button>
              );
            })}
          </div>

          {/* Banner wall — flush stacked rows, no gutters between them:
              each banner's own background is the separation, so the wall
              reads as one continuous surface. Only the top keeps a
              deliberate breathing gap under the filter pills; the bottom
              has none, so the last row ends cleanly. layout+AnimatePresence
              so filtered-out banners fade out and the rest reflow smoothly.
              AnimatePresence's own initial={false} (fix/design-studio-back-
              fade-fix) skips the enter animation for whichever banners are
              already present on first mount — they're simply opaque
              immediately, no white flash — while still animating banners
              added/removed by a filter-pill change afterward. */}
          <div style={{ padding: '24px 32px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <AnimatePresence initial={false}>
                {visibleUniverses.map(u => (
                  <motion.div
                    key={u.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={prefersReducedMotion ? { duration: 0.01 } : { duration: 0.3, ease: 'easeOut' }}
                  >
                    <UniverseBanner
                      universe={u}
                      isCurrent={activeId === u.id}
                      onClick={() => enterUniverse(u)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}

      {phase === 'world' && opened && (
        <UniverseWorldView
          universe={opened}
          weddingDetails={weddingDetails}
          guests={guests}
          isCurrent={activeId === opened.id}
          canAccessUltra={canAccessUltra}
          onBack={backToBrowsing}
          onSwitchUniverse={handleSwitchUniverse}
          onUpgrade={handleUpgrade}
          motifNote={opened.motifNote}
        />
      )}

      <AvaModal
        isOpen={avaOpen}
        onClose={() => setAvaOpen(false)}
        pageTitle="Design & guest experience advisor"
        systemPrompt="You are Ava, helping a couple with both their wedding's visual design (universe/theme choice, website, invitations, print pieces) and their overall guest experience (RSVP flow, guest communication, making guests feel welcome)."
        quickActions={["Which universe suits our wedding style?", "What should go on my wedding website?", "How do I write a great RSVP message?", "Tips for making guests feel welcome"]}
      />
    </div>
  );
}
