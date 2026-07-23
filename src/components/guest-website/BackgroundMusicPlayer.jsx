import React, { useEffect, useRef, useState } from 'react';
import { Music, Pause } from 'lucide-react';

/**
 * BackgroundMusicPlayer (round 7 ask #15) — a persistent, site-wide
 * background track for the guest invite/website. Rendered once at the top
 * level of MultiPageWeddingWebsite.jsx (a sibling of the page-transition
 * area, never inside it) so it survives page navigation instead of
 * restarting the track on every click.
 *
 * Browsers block audio autoplay-with-sound outright, so this never
 * attempts to play on its own — it's a small floating play/pause
 * affordance the guest has to actually click, on-brand with the couple's
 * theme accent colour. The play/pause preference is remembered per wedding
 * (localStorage, keyed by slug) so a returning guest doesn't have to
 * re-discover the control — playback still requires the click itself if
 * the browser's autoplay policy blocks the automatic resume, which is
 * expected and not something a page can override.
 */
export default function BackgroundMusicPlayer({ weddingSlug, musicSettings, accentColor = '#E03553' }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const storageKey = `oi_bg_music_${weddingSlug}`;

  const enabled = !!musicSettings?.enabled && !!musicSettings?.url;

  useEffect(() => {
    if (!enabled) return;
    let wantsToPlay = false;
    try { wantsToPlay = localStorage.getItem(storageKey) === 'playing'; } catch {}
    if (wantsToPlay && audioRef.current) {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, musicSettings?.url]);

  if (!enabled) return null;

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      try { localStorage.setItem(storageKey, 'paused'); } catch {}
    } else {
      audioRef.current.play().then(() => {
        setPlaying(true);
        try { localStorage.setItem(storageKey, 'playing'); } catch {}
      }).catch(() => {});
    }
  };

  return (
    <>
      <audio ref={audioRef} src={musicSettings.url} loop preload="none" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause music' : 'Play music'}
        title={playing ? 'Pause music' : 'Play music'}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 60,
          width: 44, height: 44, borderRadius: '50%',
          background: playing ? accentColor : 'rgba(10,10,10,0.55)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#FFFFFF',
          transition: 'background 0.2s ease',
        }}
      >
        {playing ? <Pause size={17} /> : <Music size={17} />}
      </button>
    </>
  );
}
