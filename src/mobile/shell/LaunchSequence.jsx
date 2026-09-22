import React, { useEffect, useRef, useState } from 'react';
import SmartImage from '../ui/SmartImage';
import { imageUrl } from '../images';
import { setStatusBarDark } from '../native';
import { deliver } from '../lib/images';

/**
 * The launch sequence the web layer runs once per app open, handing off from
 * the native launch screen (flat ink, the logo centred at 160px):
 *
 *   splash    the same logo over a photo from the app/ folder with the scrim,
 *             held until the shell and the first data are ready, at least
 *             MIN_SPLASH and at most MAX_SPLASH
 *   greeting  "Good morning, {name}" and one line of briefing, gone after
 *             GREETING_MS or on tap, sliding up and fading (a plain fade
 *             under prefers-reduced-motion)
 *   done      the dashboard is underneath the whole time and settles in
 *
 * The photo stays a still: no zoom, no crossfade.
 */
export const MIN_SPLASH = 800;
export const MAX_SPLASH = 2500;
export const GREETING_MS = 1800;
const EXIT_MS = 420;

/** "Good morning" before noon, "Good afternoon" before six, "Good evening" after. */
export function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** One short line from real data, in order of what matters most today. */
export function briefingLine({ daysToGo, newReplies = 0, awaiting = 0, openTasks = 0 } = {}) {
  const parts = [];
  if (daysToGo != null) parts.push(daysToGo === 0 ? 'It is today.' : daysToGo === 1 ? '1 day to go.' : daysToGo < 0 ? 'The day has been and gone.' : `${daysToGo} days to go.`);
  if (newReplies > 0) parts.push(`${newReplies} new ${newReplies === 1 ? 'RSVP' : 'RSVPs'} since yesterday.`);
  else if (awaiting > 0) parts.push(`${awaiting} ${awaiting === 1 ? 'guest' : 'guests'} still to reply.`);
  else if (openTasks > 0) parts.push(`${openTasks} open ${openTasks === 1 ? 'task' : 'tasks'}.`);
  return parts.slice(0, 2).join(' ');
}

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

/** The greeting moment on its own (also /m/preview/greeting). `hold` keeps it up for the preview. */
export function Greeting({ salutation, firstName, line, leaving = false, onTap }) {
  const title = firstName ? `${salutation}, ${firstName}` : salutation;
  return (
    <div className={`oi-m-greeting${leaving ? ' oi-m-greeting--leaving' : ''}`} onClick={onTap} role={onTap ? 'button' : undefined} tabIndex={onTap ? 0 : undefined} onKeyDown={onTap ? (e) => { if (e.key === 'Enter' || e.key === ' ') onTap(); } : undefined} aria-label={onTap ? `${title}. ${line || ''} Tap to continue.` : undefined}>
      <div className="oi-m-greeting__inner">
        <h1 className="oi-m-greeting__title">{title}</h1>
        {line && <p className="oi-m-greeting__line">{line}</p>}
      </div>
    </div>
  );
}

/**
 * Runs the whole sequence over the shell. `ready` is the shell's "first data
 * loaded"; `onDone` fires once the greeting has left.
 */
export default function LaunchSequence({ ready, firstName, line, photo, alt, onDone }) {
  const [stage, setStage] = useState('splash'); // splash | splash-leaving | greeting | greeting-leaving | done
  const started = useRef(Date.now());
  const salutation = useRef(greetingFor()).current;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
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

  // Splash: leave once ready and MIN_SPLASH has passed, or at MAX_SPLASH.
  useEffect(() => {
    if (stage !== 'splash') return undefined;
    const elapsed = Date.now() - started.current;
    const wait = ready && photoReady ? Math.max(0, MIN_SPLASH - elapsed) : Math.max(0, MAX_SPLASH - elapsed);
    const t = setTimeout(() => setStage('splash-leaving'), wait);
    return () => clearTimeout(t);
  }, [stage, ready, photoReady]);

  useEffect(() => {
    if (stage === 'splash-leaving') { const t = setTimeout(() => setStage('greeting'), EXIT_MS); return () => clearTimeout(t); }
    if (stage === 'greeting') { const t = setTimeout(() => setStage('greeting-leaving'), GREETING_MS); return () => clearTimeout(t); }
    if (stage === 'greeting-leaving') { const t = setTimeout(() => { setStage('done'); doneRef.current?.(); }, EXIT_MS); return () => clearTimeout(t); }
    return undefined;
  }, [stage]);

  if (stage === 'done') return null;
  if (stage === 'splash' || stage === 'splash-leaving') return <LaunchSplash photo={photo} alt={alt} leaving={stage === 'splash-leaving'} />;
  return <Greeting salutation={salutation} firstName={firstName} line={line} leaving={stage === 'greeting-leaving'} onTap={() => { if (stage === 'greeting') setStage('greeting-leaving'); }} />;
}

/** The splash photo, from the manifest. */
export function launchPhoto() {
  return imageUrl('splash1');
}
