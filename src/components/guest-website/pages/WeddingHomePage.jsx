import React, { useState, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { detectHeroVideoType, youtubeEmbedUrl, vimeoEmbedUrl } from '@/lib/heroVideo';
import UniverseBlocks from '../blocks/UniverseBlocks';
import EditorialMasthead from '../layouts/EditorialMasthead';
import EditorialGridFooter from '../layouts/EditorialGridFooter';
import MinimalMasthead from '../layouts/MinimalMasthead';
import MinimalFooter from '../layouts/MinimalFooter';
import KyotoMasthead from '../layouts/KyotoMasthead';
import KyotoFooter from '../layouts/KyotoFooter';
import BrooklynMasthead from '../layouts/BrooklynMasthead';
import BrooklynFooter from '../layouts/BrooklynFooter';
import BaliMasthead from '../layouts/BaliMasthead';
import BaliFooter from '../layouts/BaliFooter';
import ParisMasthead from '../layouts/ParisMasthead';
import ParisFooter from '../layouts/ParisFooter';
import CapriMasthead from '../layouts/CapriMasthead';
import CapriFooter from '../layouts/CapriFooter';
import MykonosMasthead from '../layouts/MykonosMasthead';
import MykonosFooter from '../layouts/MykonosFooter';
import CapeTownMasthead from '../layouts/CapeTownMasthead';
import CapeTownFooter from '../layouts/CapeTownFooter';
import AmalfiMasthead from '../layouts/AmalfiMasthead';
import AmalfiFooter from '../layouts/AmalfiFooter';
import SedonaMasthead from '../layouts/SedonaMasthead';
import SedonaFooter from '../layouts/SedonaFooter';
import AspenMasthead from '../layouts/AspenMasthead';
import AspenFooter from '../layouts/AspenFooter';
import TajMasthead from '../layouts/TajMasthead';
import TajFooter from '../layouts/TajFooter';
import HavanaMasthead from '../layouts/HavanaMasthead';
import HavanaFooter from '../layouts/HavanaFooter';
import EdinburghMasthead from '../layouts/EdinburghMasthead';
import EdinburghFooter from '../layouts/EdinburghFooter';
import MonacoMasthead from '../layouts/MonacoMasthead';
import MonacoFooter from '../layouts/MonacoFooter';
import FlorenceMasthead from '../layouts/FlorenceMasthead';
import FlorenceFooter from '../layouts/FlorenceFooter';
import SeoulMasthead from '../layouts/SeoulMasthead';
import SeoulFooter from '../layouts/SeoulFooter';
import ShanghaiMasthead from '../layouts/ShanghaiMasthead';
import ShanghaiFooter from '../layouts/ShanghaiFooter';

/** Formats weddingDate for display, or null if unset/unparseable — never
 * lets `new Date('')` render the literal text "Invalid Date" to a guest. */
function formatWeddingDate(weddingDate, options) {
  if (!weddingDate) return null;
  const d = new Date(weddingDate);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', options);
}

// Fullscreen-"cover" CSS trick for 16:9 iframe embeds (YouTube/Vimeo) —
// these players don't support object-fit, so the iframe is deliberately
// oversized and centred to always fill the hero regardless of its own
// aspect ratio, then clipped by the parent's overflow:hidden.
const IFRAME_COVER_STYLE = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: '177.78vh',   // 16:9 aspect, sized off viewport height
  height: '100vh',
  minWidth: '100%',
  minHeight: '56.25vw', // 16:9 aspect, sized off viewport width
  transform: 'translate(-50%, -50%)',
  border: 'none',
  pointerEvents: 'none',
};

/**
 * Small floating on-brand affordance to unmute the hero video — browsers
 * block autoplay-with-sound outright, so every autoplaying hero video
 * starts muted and needs an explicit, visible way for a guest to turn
 * sound on (round 7 ask #14). Bottom-right, out of the way of the
 * masthead/footer content every universe lays over this background.
 */
function UnmuteButton({ unmuted, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={unmuted ? 'Mute video' : 'Unmute video'}
      title={unmuted ? 'Mute video' : 'Unmute video'}
      style={{
        position: 'absolute', bottom: 24, right: 24, zIndex: 5,
        width: 40, height: 40, borderRadius: '50%',
        background: 'rgba(10,10,10,0.45)', backdropFilter: 'blur(4px)',
        border: '1px solid rgba(255,255,255,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: '#FFFFFF',
      }}
    >
      {unmuted ? <Volume2 size={16} /> : <VolumeX size={16} />}
    </button>
  );
}

/**
 * Renders the hero's background media: a real video (direct file or
 * YouTube/Vimeo embed) when the couple has set one, falling back to the
 * existing static cover-photo image otherwise — or if the video fails to
 * load, or the visitor has data-saver/prefers-reduced-motion enabled, in
 * which case autoplaying video is skipped entirely in favour of the image
 * (never a broken player).
 */
function HeroBackground({ coverPhoto, heroVideoUrl, prefersReduced }) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [unmuted, setUnmuted] = useState(false);
  const videoRef = useRef(null);
  const video = useMemo(() => detectHeroVideoType(heroVideoUrl), [heroVideoUrl]);

  // Network Information API — not supported everywhere; absence just means
  // this signal is skipped, not that data-saver mode is assumed off.
  const saveData = typeof navigator !== 'undefined' && navigator.connection?.saveData === true;

  const showVideo = !!video && !videoFailed && !prefersReduced && !saveData;

  const imageFallback = (
    <div
      style={{
        position: 'absolute', inset: 0,
        backgroundImage: coverPhoto ? `url(${coverPhoto})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    />
  );

  if (!showVideo) return imageFallback;

  if (video.type === 'file') {
    const toggleMute = () => {
      if (videoRef.current) videoRef.current.muted = unmuted;
      setUnmuted(v => !v);
    };
    return (
      <>
        {/* Poster shows immediately; swapped for the playing video once it
            can play, and shown again permanently if the video errors. */}
        {imageFallback}
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          poster={coverPhoto || undefined}
          onError={() => setVideoFailed(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        >
          <source src={video.url} />
        </video>
        <UnmuteButton unmuted={unmuted} onToggle={toggleMute} />
      </>
    );
  }

  // YouTube / Vimeo — privacy-friendly embed, no controls, autoplay muted
  // loop. No reliable onError signal for cross-origin iframes, so a
  // malformed embed just renders an empty/black frame over the image
  // fallback rather than crashing. Neither embed exposes a live mute
  // toggle without the full player JS API, so unmuting remounts the
  // iframe (key change) with sound on from the start of the loop — a
  // small restart, but a real, working unmute rather than none at all.
  const embedUrl = video.type === 'youtube'
    ? youtubeEmbedUrl(video.id).replace('mute=1', unmuted ? 'mute=0' : 'mute=1')
    : vimeoEmbedUrl(video.id).replace('muted=1', unmuted ? 'muted=0' : 'muted=1');
  return (
    <>
      {imageFallback}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <iframe
          key={unmuted ? 'unmuted' : 'muted'}
          src={embedUrl}
          title="Wedding hero video"
          allow="autoplay; encrypted-media"
          style={IFRAME_COVER_STYLE}
        />
      </div>
      <UnmuteButton unmuted={unmuted} onToggle={() => setUnmuted(v => !v)} />
    </>
  );
}

/**
 * GenericMastheadHero (feat/universes-expansion-10) — the shared hero
 * composition for the 10 new universes: full-bleed hero background + a
 * scrim, the universe's own Masthead centred, its own Footer (date/venue/
 * RSVP columns) beneath. This is the exact same shape Capri/Mykonos/Cape
 * Town/Kyoto's own dedicated branches below already use — per the design
 * system's own rule ("reuse primitives with a universe's own theme/
 * typography/copy, never fork the page component"), the 10 new universes
 * share this one composition rather than each hand-writing a near-
 * identical 35-line branch; what makes each one look genuinely different
 * is its own Masthead/Footer (arch framing, sunburst, thistle, etc.), not
 * a bespoke DOM shape.
 */
function GenericMastheadHero({ Masthead, Footer, weddingDetails, theme, typography, universeConfig, copy, prefersReduced, formattedDate, venueFallback }) {
  return (
    <div style={{ backgroundColor: theme.darkBg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <HeroBackground coverPhoto={weddingDetails.coverPhoto} heroVideoUrl={weddingDetails.heroVideoUrl} prefersReduced={prefersReduced} />
        <div style={{ position: 'absolute', inset: 0, backgroundColor: `${theme.darkBg}45` }} />

        <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 32px 60px' }}>
          <motion.div
            initial={{ opacity: 0, y: prefersReduced ? 0 : (universeConfig?.motion?.yOffset ?? 14) }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReduced ? 0 : (universeConfig?.motion?.duration ?? 0.55), ease: universeConfig?.motion?.ease }}
            style={{ width: '100%' }}
          >
            <Masthead coupleNames={weddingDetails.coupleNames} kicker={copy.heroKicker} theme={theme} typography={typography} textColor={theme.lightBg} accentColor={theme.accent} />
          </motion.div>
        </div>

        <div style={{ position: 'relative', zIndex: 10, padding: '0 32px 56px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <Footer
              theme={theme} typography={typography} textColor={theme.lightBg} accentColor={theme.accent}
              columns={[
                { label: 'The date', value: formattedDate || 'To be announced' },
                { label: 'Join us in', value: weddingDetails.mainCeremony?.venueName || weddingDetails.mainCeremony?.address?.split(',')[0] || venueFallback },
                { label: 'RSVP', value: 'View invitation', href: weddingDetails.slug ? `/w/${weddingDetails.slug}/rsvp` : undefined },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function WeddingHomePageContent({ weddingDetails, theme, typography, universeConfig }) {
  const tagline = weddingDetails.homeContent?.tagline || weddingDetails.welcomeMessage || 'We are overjoyed to celebrate with you.';
  const prefersReduced = useReducedMotion();
  const isEditorial = universeConfig?.layout === 'editorial-masthead';
  const isMinimal = universeConfig?.layout === 'london-minimal';
  const isKyoto = universeConfig?.layout === 'kyoto-vertical';
  const isBrooklyn = universeConfig?.layout === 'brooklyn-offgrid';
  const isBali = universeConfig?.layout === 'bali-organic';
  const isParis = universeConfig?.layout === 'paris-couture';
  const isCapri = universeConfig?.layout === 'capri-citrus';
  const isMykonos = universeConfig?.layout === 'mykonos-whitewash';
  const isCapeTown = universeConfig?.layout === 'capetown-estate';
  const isAmalfi = universeConfig?.layout === 'amalfi-citrus';
  const isSedona = universeConfig?.layout === 'sedona-mesa';
  const isAspen = universeConfig?.layout === 'aspen-lodge';
  const isTaj = universeConfig?.layout === 'taj-pavilion';
  const isHavana = universeConfig?.layout === 'havana-deco';
  const isEdinburgh = universeConfig?.layout === 'edinburgh-estate';
  const isMonaco = universeConfig?.layout === 'monaco-marina';
  const isFlorence = universeConfig?.layout === 'florence-editorial';
  const isSeoul = universeConfig?.layout === 'seoul-glass';
  const isShanghai = universeConfig?.layout === 'shanghai-glamour';
  const copy = universeConfig?.copy || {};
  const formattedDate = formatWeddingDate(weddingDetails.weddingDate, { month: 'long', day: 'numeric', year: 'numeric' });

  const genericHeroProps = { weddingDetails, theme, typography, universeConfig, copy, prefersReduced, formattedDate };
  if (isAmalfi) return <GenericMastheadHero Masthead={AmalfiMasthead} Footer={AmalfiFooter} venueFallback="Amalfi" {...genericHeroProps} />;
  if (isSedona) return <GenericMastheadHero Masthead={SedonaMasthead} Footer={SedonaFooter} venueFallback="Sedona" {...genericHeroProps} />;
  if (isAspen) return <GenericMastheadHero Masthead={AspenMasthead} Footer={AspenFooter} venueFallback="Aspen" {...genericHeroProps} />;
  if (isTaj) return <GenericMastheadHero Masthead={TajMasthead} Footer={TajFooter} venueFallback="the pavilion" {...genericHeroProps} />;
  if (isHavana) return <GenericMastheadHero Masthead={HavanaMasthead} Footer={HavanaFooter} venueFallback="Havana" {...genericHeroProps} />;
  if (isEdinburgh) return <GenericMastheadHero Masthead={EdinburghMasthead} Footer={EdinburghFooter} venueFallback="the estate" {...genericHeroProps} />;
  if (isMonaco) return <GenericMastheadHero Masthead={MonacoMasthead} Footer={MonacoFooter} venueFallback="Monaco" {...genericHeroProps} />;
  if (isFlorence) return <GenericMastheadHero Masthead={FlorenceMasthead} Footer={FlorenceFooter} venueFallback="Florence" {...genericHeroProps} />;
  if (isSeoul) return <GenericMastheadHero Masthead={SeoulMasthead} Footer={SeoulFooter} venueFallback="Seoul" {...genericHeroProps} />;
  if (isShanghai) return <GenericMastheadHero Masthead={ShanghaiMasthead} Footer={ShanghaiFooter} venueFallback="Shanghai" {...genericHeroProps} />;

  if (isParis) {
    return (
      <div style={{ backgroundColor: theme.darkBg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <HeroBackground coverPhoto={weddingDetails.coverPhoto} heroVideoUrl={weddingDetails.heroVideoUrl} prefersReduced={prefersReduced} />
          <div style={{ position: 'absolute', inset: 0, backgroundColor: `${theme.darkBg}60` }} />

          <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '140px 40px 80px' }}>
            <motion.div
              initial={{ opacity: 0, y: prefersReduced ? 0 : (universeConfig?.motion?.yOffset ?? 12) }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReduced ? 0 : (universeConfig?.motion?.duration ?? 0.7), ease: universeConfig?.motion?.ease }}
              style={{ width: '100%' }}
            >
              <ParisMasthead coupleNames={weddingDetails.coupleNames} kicker={copy.heroKicker} theme={theme} typography={typography} textColor={theme.lightBg} />
            </motion.div>
          </div>

          <div style={{ position: 'relative', zIndex: 10, padding: '0 40px 64px' }}>
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              <ParisFooter
                theme={theme} typography={typography} textColor={theme.lightBg}
                columns={[
                  { label: 'The date', value: formattedDate || 'To be announced' },
                  { label: 'Join us in', value: weddingDetails.mainCeremony?.venueName || weddingDetails.mainCeremony?.address?.split(',')[0] || 'Paris' },
                  { label: 'RSVP', value: 'View invitation', href: weddingDetails.slug ? `/w/${weddingDetails.slug}/rsvp` : undefined },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isCapri) {
    return (
      <div style={{ backgroundColor: theme.darkBg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <HeroBackground coverPhoto={weddingDetails.coverPhoto} heroVideoUrl={weddingDetails.heroVideoUrl} prefersReduced={prefersReduced} />
          <div style={{ position: 'absolute', inset: 0, backgroundColor: `${theme.darkBg}45` }} />

          <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 32px 60px' }}>
            <motion.div
              initial={{ opacity: 0, y: prefersReduced ? 0 : (universeConfig?.motion?.yOffset ?? 14) }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReduced ? 0 : (universeConfig?.motion?.duration ?? 0.55), ease: universeConfig?.motion?.ease }}
              style={{ width: '100%' }}
            >
              <CapriMasthead coupleNames={weddingDetails.coupleNames} kicker={copy.heroKicker} theme={theme} typography={typography} textColor={theme.lightBg} accentColor={theme.accent} />
            </motion.div>
          </div>

          <div style={{ position: 'relative', zIndex: 10, padding: '0 32px 56px' }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <CapriFooter
                theme={theme} typography={typography} textColor={theme.lightBg} accentColor={theme.accent}
                columns={[
                  { label: 'The date', value: formattedDate || 'To be announced' },
                  { label: 'Join us in', value: weddingDetails.mainCeremony?.venueName || weddingDetails.mainCeremony?.address?.split(',')[0] || 'Capri' },
                  { label: 'RSVP', value: 'View invitation', href: weddingDetails.slug ? `/w/${weddingDetails.slug}/rsvp` : undefined },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isMykonos) {
    return (
      <div style={{ backgroundColor: theme.darkBg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <HeroBackground coverPhoto={weddingDetails.coverPhoto} heroVideoUrl={weddingDetails.heroVideoUrl} prefersReduced={prefersReduced} />
          <div style={{ position: 'absolute', inset: 0, backgroundColor: `${theme.darkBg}55` }} />

          <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', padding: '150px 48px 90px' }}>
            <motion.div
              initial={{ opacity: 0, y: prefersReduced ? 0 : (universeConfig?.motion?.yOffset ?? 8) }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReduced ? 0 : (universeConfig?.motion?.duration ?? 0.6), ease: universeConfig?.motion?.ease }}
              style={{ width: '100%', maxWidth: 900 }}
            >
              <MykonosMasthead coupleNames={weddingDetails.coupleNames} kicker={copy.heroKicker} theme={theme} typography={typography} textColor={theme.lightBg} accentColor={theme.accent} />
            </motion.div>
          </div>

          <div style={{ position: 'relative', zIndex: 10, padding: '0 48px 80px' }}>
            <MykonosFooter
              theme={theme} typography={typography} textColor={theme.lightBg} accentColor={theme.accent}
              lines={[
                { label: 'The date', value: formattedDate || 'To be announced' },
                { label: 'RSVP', value: 'Send it over', href: weddingDetails.slug ? `/w/${weddingDetails.slug}/rsvp` : undefined },
              ]}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isCapeTown) {
    return (
      <div style={{ backgroundColor: theme.darkBg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <HeroBackground coverPhoto={weddingDetails.coverPhoto} heroVideoUrl={weddingDetails.heroVideoUrl} prefersReduced={prefersReduced} />
          <div style={{ position: 'absolute', inset: 0, backgroundColor: `${theme.darkBg}60` }} />

          <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', padding: '140px 48px 80px' }}>
            <motion.div
              initial={{ opacity: 0, y: prefersReduced ? 0 : (universeConfig?.motion?.yOffset ?? 18) }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReduced ? 0 : (universeConfig?.motion?.duration ?? 0.75), ease: universeConfig?.motion?.ease }}
            >
              <CapeTownMasthead coupleNames={weddingDetails.coupleNames} kicker={copy.heroKicker} theme={theme} typography={typography} textColor={theme.lightBg} />
            </motion.div>
          </div>

          <div style={{ position: 'relative', zIndex: 10, padding: '0 48px 72px' }}>
            <CapeTownFooter
              theme={theme} typography={typography} textColor={theme.lightBg}
              lines={[
                { label: 'The date', value: formattedDate || 'To be announced' },
                { label: 'RSVP', value: 'View invitation', href: weddingDetails.slug ? `/w/${weddingDetails.slug}/rsvp` : undefined },
              ]}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isKyoto) {
    return (
      <div style={{ backgroundColor: theme.darkBg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <HeroBackground
            coverPhoto={weddingDetails.coverPhoto}
            heroVideoUrl={weddingDetails.heroVideoUrl}
            prefersReduced={prefersReduced}
          />
          <div style={{ position: 'absolute', inset: 0, backgroundColor: `${theme.darkBg}70` }} />

          <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', padding: '140px 48px 80px' }}>
            <motion.div
              initial={{ opacity: 0, y: prefersReduced ? 0 : (universeConfig?.motion?.yOffset ?? 10) }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReduced ? 0 : (universeConfig?.motion?.duration ?? 0.8), ease: universeConfig?.motion?.ease }}
            >
              <KyotoMasthead
                coupleNames={weddingDetails.coupleNames}
                kicker={copy.heroKicker}
                theme={theme}
                typography={typography}
                textColor={theme.lightBg}
              />
            </motion.div>
          </div>

          <div style={{ position: 'relative', zIndex: 10, padding: '0 48px 72px' }}>
            <KyotoFooter
              theme={theme}
              typography={typography}
              textColor={theme.lightBg}
              lines={[
                { label: 'The date', value: formattedDate || 'To be announced' },
                { label: 'RSVP', value: 'View invitation', href: weddingDetails.slug ? `/w/${weddingDetails.slug}/rsvp` : undefined },
              ]}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isBrooklyn) {
    return (
      <div style={{ backgroundColor: theme.darkBg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <HeroBackground
            coverPhoto={weddingDetails.coverPhoto}
            heroVideoUrl={weddingDetails.heroVideoUrl}
            prefersReduced={prefersReduced}
          />
          <div style={{ position: 'absolute', inset: 0, backgroundColor: `${theme.darkBg}55` }} />

          <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'flex-end', padding: '120px 32px 48px' }}>
            <motion.div
              initial={{ opacity: 0, y: prefersReduced ? 0 : (universeConfig?.motion?.yOffset ?? 10) }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReduced ? 0 : (universeConfig?.motion?.duration ?? 0.4), ease: universeConfig?.motion?.ease }}
              style={{ width: '100%' }}
            >
              <BrooklynMasthead
                coupleNames={weddingDetails.coupleNames}
                kicker={copy.heroKicker}
                theme={theme}
                typography={typography}
                textColor={theme.lightBg}
                accentColor={theme.accent}
              />
            </motion.div>
          </div>

          <div style={{ position: 'relative', zIndex: 10, padding: '0 32px 56px' }}>
            <BrooklynFooter
              theme={theme}
              typography={typography}
              textColor={theme.lightBg}
              accentColor={theme.accent}
              lines={[
                { label: 'The date', value: formattedDate || 'To be announced' },
                { label: 'RSVP', value: 'Get my invite →', href: weddingDetails.slug ? `/w/${weddingDetails.slug}/rsvp` : undefined },
              ]}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isBali) {
    return (
      <div style={{ backgroundColor: theme.darkBg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <HeroBackground
            coverPhoto={weddingDetails.coverPhoto}
            heroVideoUrl={weddingDetails.heroVideoUrl}
            prefersReduced={prefersReduced}
          />
          <div style={{ position: 'absolute', inset: 0, backgroundColor: `${theme.darkBg}50` }} />

          <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', padding: '130px 40px 70px' }}>
            <motion.div
              initial={{ opacity: 0, y: prefersReduced ? 0 : (universeConfig?.motion?.yOffset ?? 20) }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReduced ? 0 : (universeConfig?.motion?.duration ?? 0.9), ease: universeConfig?.motion?.ease }}
              style={{ width: '100%', maxWidth: 900, margin: '0 auto' }}
            >
              <BaliMasthead
                coupleNames={weddingDetails.coupleNames}
                kicker={copy.heroKicker}
                theme={theme}
                typography={typography}
                textColor={theme.lightBg}
              />
            </motion.div>
          </div>

          <div style={{ position: 'relative', zIndex: 10, padding: '0 40px 64px' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <BaliFooter
                theme={theme}
                typography={typography}
                textColor={theme.lightBg}
                lines={[
                  { label: 'The date', value: formattedDate || 'To be announced' },
                  { label: 'RSVP', value: 'Join us', href: weddingDetails.slug ? `/w/${weddingDetails.slug}/rsvp` : undefined },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isMinimal) {
    return (
      <div style={{ backgroundColor: theme.darkBg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <HeroBackground
            coverPhoto={weddingDetails.coverPhoto}
            heroVideoUrl={weddingDetails.heroVideoUrl}
            prefersReduced={prefersReduced}
          />
          <div style={{ position: 'absolute', inset: 0, backgroundColor: `${theme.darkBg}66` }} />

          <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '160px 40px 100px', textAlign: 'center' }}>
            <motion.div
              initial={{ opacity: 0, y: prefersReduced ? 0 : (universeConfig?.motion?.yOffset ?? 14) }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReduced ? 0 : (universeConfig?.motion?.duration ?? 0.95) }}
              style={{ width: '100%' }}
            >
              <MinimalMasthead
                coupleNames={weddingDetails.coupleNames}
                kicker={copy.heroKicker}
                theme={theme}
                typography={typography}
                textColor={theme.lightBg}
              />
            </motion.div>
          </div>

          <div style={{ position: 'relative', zIndex: 10, padding: '0 40px 96px' }}>
            <MinimalFooter
              theme={theme}
              typography={typography}
              textColor={theme.lightBg}
              lines={[
                { label: 'The date', value: formattedDate || 'To be announced' },
                { label: 'RSVP', value: 'View invitation', href: weddingDetails.slug ? `/w/${weddingDetails.slug}/rsvp` : undefined },
              ]}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isEditorial) {
    return (
      <div style={{ backgroundColor: theme.darkBg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <HeroBackground
            coverPhoto={weddingDetails.coverPhoto}
            heroVideoUrl={weddingDetails.heroVideoUrl}
            prefersReduced={prefersReduced}
          />
          <div style={{ position: 'absolute', inset: 0, backgroundColor: `${theme.darkBg}59` }} />

          <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', alignItems: 'center', padding: '120px 40px 60px' }}>
            <motion.div
              initial={{ opacity: 0, y: prefersReduced ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReduced ? 0 : (universeConfig?.motion?.duration ?? 0.85) }}
              style={{ width: '100%', maxWidth: 1100, margin: '0 auto' }}
            >
              <EditorialMasthead
                coupleNames={weddingDetails.coupleNames}
                kicker={copy.heroKicker}
                theme={theme}
                typography={typography}
                textColor={theme.lightBg}
              />
            </motion.div>
          </div>

          <div style={{ position: 'relative', zIndex: 10, padding: '0 40px 56px' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <EditorialGridFooter
                theme={theme}
                typography={typography}
                textColor={theme.lightBg}
                columns={[
                  { label: 'The date', value: formattedDate || 'To be announced' },
                  { label: 'Join us in', value: weddingDetails.mainCeremony?.venueName || weddingDetails.mainCeremony?.address?.split(',')[0] || 'Marrakech' },
                  { label: 'RSVP', value: 'View invitation →', href: weddingDetails.slug ? `/w/${weddingDetails.slug}/rsvp` : undefined },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: theme.darkBg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero */}
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <HeroBackground
          coverPhoto={weddingDetails.coverPhoto}
          heroVideoUrl={weddingDetails.heroVideoUrl}
          prefersReduced={prefersReduced}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: `${theme.darkBg}40`
          }}
        />

        {/* Texture now renders once, site-wide, at the root in
            MultiPageWeddingWebsite.jsx — no longer duplicated here. */}

        <motion.div
          initial={{ opacity: 0, y: prefersReduced ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReduced ? 0 : (universeConfig?.motion?.duration ?? 0.8) }}
          style={{
            position: 'relative',
            zIndex: 10,
            textAlign: 'center',
            color: theme.lightBg
          }}
        >
          <h1
            style={{
              fontFamily: typography.headingFont,
              fontSize: 'clamp(2rem, 8vw, 4.5rem)',
              fontWeight: typography.headingWeight,
              fontStyle: typography.headingStyle || 'normal',
              letterSpacing: '-0.02em',
              marginBottom: '12px',
              lineHeight: 1.1
            }}
          >
            {weddingDetails.coupleNames}
          </h1>

          <p
            style={{
              fontFamily: typography.bodyFont,
              fontSize: 'clamp(0.875rem, 2vw, 1.25rem)',
              fontWeight: typography.bodyWeight,
              marginBottom: '24px',
              opacity: 0.9
            }}
          >
            {formattedDate || 'Date to be announced'}
          </p>

          <motion.div
            initial={{ opacity: 0, y: prefersReduced ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: prefersReduced ? 0 : 0.3, duration: prefersReduced ? 0 : (universeConfig?.motion?.duration ?? 0.8) }}
            style={{
              fontFamily: typography.bodyFont,
              fontSize: 'clamp(0.875rem, 1.5vw, 1rem)',
              fontWeight: typography.bodyWeight,
              maxWidth: '600px',
              margin: '0 auto',
              letterSpacing: '0.05em',
              opacity: 0.85
            }}
          >
            {tagline}
          </motion.div>

          {weddingDetails.slug && (
            <motion.div
              initial={{ opacity: 0, y: prefersReduced ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: prefersReduced ? 0 : 0.45, duration: prefersReduced ? 0 : (universeConfig?.motion?.duration ?? 0.8) }}
              style={{ marginTop: '28px' }}
            >
              <a
                href={`/w/${weddingDetails.slug}/rsvp`}
                style={{
                  display: 'inline-block',
                  padding: '10px 28px',
                  border: `1px solid ${theme.lightBg}60`,
                  borderRadius: 999,
                  color: theme.lightBg,
                  fontFamily: typography.bodyFont,
                  fontSize: '0.8125rem',
                  fontWeight: typography.bodyWeight,
                  letterSpacing: '0.04em',
                  textDecoration: 'none',
                }}
              >
                RSVP
              </a>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '24px',
          opacity: 0.6,
          zIndex: 20
        }}
      >
        ↓
      </motion.div>
    </div>
  );
}

// Blocks (feat/block-builder) render as additional content appended after
// the universe's fixed hero — same real component, same render pass, so it
// appears identically on the published site, builder canvas, and full-
// screen preview. Wrapping at the export boundary (rather than editing
// every isXxx branch above) keeps this purely additive: nothing above is
// touched, and a wedding with no homeContent.blocks renders exactly as
// before.
export default function WeddingHomePage(props) {
  return (
    <>
      <WeddingHomePageContent {...props} />
      <UniverseBlocks
        blocks={props.weddingDetails?.homeContent?.blocks}
        weddingDetails={props.weddingDetails}
        theme={props.theme}
        typography={props.typography}
        universeConfig={props.universeConfig}
        editable={props.editable}
        onRequestInsert={props.onRequestInsert}
        onMoveBlock={props.onMoveBlock}
        onDeleteBlock={props.onDeleteBlock}
        onSelectBlock={props.onSelectBlock}
        selectedBlockId={props.selectedBlockId}
      />
    </>
  );
}
