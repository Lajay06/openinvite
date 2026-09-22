import React, { useEffect, useRef, useState } from 'react';
import SmartImage from '../ui/SmartImage';
import { imageUrl } from '../images';
import { setStatusBarDark, isNative, prefGet, prefSet } from '../native';
import DailyUpdate from './DailyUpdate';
import { dayKey } from '../data/dailyUpdate';
import { deliver } from '../lib/images';

/**
 * The launch sequence the web layer runs once per app open, handing off from
 * the native launch screen (flat ink, the brand mark centred):
 *
 *   native    the storyboard, held at least NATIVE_HOLD before the web layer
 *             hides it (MobileShell calls hideSplash on that timer)
 *   splash    the full logo over a photo from the splash pool with the scrim,
 *             on screen at least MIN_SPLASH after the native screen goes and
 *             until the daily update's data is in (at most MAX_SPLASH), then
 *             a gentle crossfade onward: the next screen is already
 *             underneath while this one fades
 *   daily     the daily update, on the first open of each calendar day, held
 *             until "Let's go"; later opens that day go straight on
 *   done      the dashboard settles in
 *
 * Reduced motion: plain fades. The photo stays a still: no zoom, no motion.
 */
export const NATIVE_HOLD = 1200;
export const MIN_SPLASH = 1800;
export const MAX_SPLASH = 6000;
const EXIT_MS = 420;
const DAILY_PREF = 'daily_update_date';

/** The in-app splash on its own (also /m/preview/splash). */
export function LaunchSplash({ photo, alt = '', leaving = false }) {
  return (
    <div className={`oi-m-launch${leaving ? ' oi-m-launch--leaving' : ''}`} aria-hidden="true">
      {photo && <SmartImage src={photo} alt={alt} width={390} height={844} eager className="oi-m-launch__photo" />}
      <div className="oi-m-launch__scrim" />
      <img className="oi-m-launch__logo" src="/openinvite-logo.png" alt="Openinvite" width={160} height={37} />
    </div>
  );
}

/**
 * Runs the whole sequence over the shell. `ready` is "the daily update's
 * data is in"; `daily` is the built update ({ dateLabel, greeting, lines,
 * photo, alt }); `onDone` fires once the last screen has left.
 */
export default function LaunchSequence({ ready, photo, alt, daily, onDone, forceDaily = false }) {
  const [stage, setStage] = useState('splash'); // splash | crossfade | daily | daily-leaving | done
  const started = useRef(Date.now());
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  // Whether today has had its update: read once, before the splash can end.
  const [showDaily, setShowDaily] = useState(forceDaily ? true : null);
  useEffect(() => {
    if (forceDaily) return;
    let live = true;
    prefGet(DAILY_PREF).then((v) => { if (live) setShowDaily(v !== dayKey()); }).catch(() => { if (live) setShowDaily(true); });
    return () => { live = false; };
  }, [forceDaily]);
  // The photo counts as part of "ready": the splash is the photo, so it
  // waits for it (within MAX_SPLASH) rather than leaving on a bare panel.
  const [photoReady, setPhotoReady] = useState(!photo);
  useEffect(() => {
    if (!photo) return undefined;
    const img = new Image();
    let live = true;
    img.onload = () => { if (live) setPhotoReady(true); };
    img.onerror = () => { if (live) setPhotoReady(true); };
    img.src = deliver(photo, { width: 390, height: 844, dpr: typeof window !== 'undefined' && window.devicePixelRatio >= 3 ? 3 : 2 });
    return () => { live = false; };
  }, [photo]);

  // Light status bar content over the ink and the photo; the shell flips it
  // back when the dashboard settles.
  useEffect(() => { setStatusBarDark(true); return () => { setStatusBarDark(false); }; }, []);

  // Splash: the native screen covers the first NATIVE_HOLD natively, so the
  // splash's own minimum counts from there; it leaves once the data and the
  // once-a-day answer are in, never before its minimum, and at MAX_SPLASH
  // whatever is still missing.
  useEffect(() => {
    if (stage !== 'splash') return undefined;
    const elapsed = Date.now() - started.current;
    const floor = (isNative() ? NATIVE_HOLD : 0) + MIN_SPLASH;
    const settled = ready && photoReady && showDaily !== null;
    const wait = settled ? Math.max(0, floor - elapsed) : Math.max(0, MAX_SPLASH - elapsed);
    const t = setTimeout(() => setStage('crossfade'), wait);
    return () => clearTimeout(t);
  }, [stage, ready, photoReady, showDaily]);

  useEffect(() => {
    if (stage === 'crossfade') {
      const t = setTimeout(() => {
        if (showDaily && daily) { setStage('daily'); prefSet(DAILY_PREF, dayKey()); }
        else { setStage('done'); doneRef.current?.(); }
      }, EXIT_MS);
      return () => clearTimeout(t);
    }
    if (stage === 'daily-leaving') { const t = setTimeout(() => { setStage('done'); doneRef.current?.(); }, EXIT_MS); return () => clearTimeout(t); }
    return undefined;
  }, [stage, showDaily, daily]);

  if (stage === 'done') return null;
  const goingDaily = showDaily && daily;
  return (
    <>
      {(stage === 'crossfade' && goingDaily) || stage === 'daily' || stage === 'daily-leaving' ? (
        <DailyUpdate photo={daily.photo} alt={daily.alt} dateLabel={daily.dateLabel} greeting={daily.greeting} lines={daily.lines} leaving={stage === 'daily-leaving'} onGo={() => setStage('daily-leaving')} />
      ) : null}
      {(stage === 'splash' || stage === 'crossfade') && <LaunchSplash photo={photo} alt={alt} leaving={stage === 'crossfade'} />}
    </>
  );
}

/** The first photo of the splash pool, for anything that needs one without the rotation. */
export function launchPhoto() {
  return imageUrl('splash1');
}
