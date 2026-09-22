import React, { useEffect, useRef, useState } from 'react';
import DailyUpdate from './DailyUpdate';
import { dayKey } from '../data/dailyUpdate';
import { dailyPhoto } from './dailyPhotos';
import { isNative, onAppStateChange, prefGet, prefSet } from '../native';

/** The card is kept away until the next calendar day after "Not again today". */
const SKIP_PREF = 'daily_update_skip';
/** Coming back from the background after this long counts as a new open. */
const BACKGROUND_MS = 15 * 60 * 1000;

// Once per JS load: a route change, a lock or a re-render of the shell
// must not bring it back; only a cold start or a long stay in the
// background does.
let shownThisLoad = false;

/**
 * When the daily update shows (goal 7):
 *   every cold start of the app;
 *   every return from the background after 15 minutes or more;
 *   not on a tab change, and not on a return after a few seconds;
 *   never again that calendar day after "Not again today";
 *   on demand when `replay` changes (the demo build's long press on the
 *   Account title), whatever the day's answer.
 * `daily` is { ready, content } from useDailyUpdate; the card waits for the
 * content and then slides up over the dashboard. On the web the card shows
 * only when `force` is set (the preview's ?daily=1), so the browser preview
 * and its screenshot run are not covered by it.
 */
export default function DailyUpdateHost({ daily, force = false, replay = 0 }) {
  const [wanted, setWanted] = useState(() => (force ? 'force' : !shownThisLoad && isNative() ? 'open' : null));
  const [open, setOpen] = useState(false);
  const hiddenAt = useRef(null);
  const lastReplay = useRef(replay);

  // The photo decodes ahead of the card, so nothing waits when it slides up.
  useEffect(() => { const img = new Image(); img.src = dailyPhoto().src; }, []);

  // A return from the background after 15 minutes counts as an open.
  useEffect(() => {
    let dispose = () => {};
    onAppStateChange((active) => {
      if (!active) { hiddenAt.current = Date.now(); return; }
      if (hiddenAt.current && Date.now() - hiddenAt.current >= BACKGROUND_MS) setWanted('open');
      hiddenAt.current = null;
    }).then((d) => { dispose = d; });
    return () => dispose();
  }, []);

  useEffect(() => { if (replay !== lastReplay.current) { lastReplay.current = replay; setWanted('force'); } }, [replay]);

  // Wanted and the words are in: check the day's answer, then show.
  useEffect(() => {
    if (!wanted || open || !daily?.content) return undefined;
    let live = true;
    const show = () => { if (!live) return; shownThisLoad = true; setWanted(null); setOpen(true); };
    if (wanted === 'force') { show(); return undefined; }
    prefGet(SKIP_PREF).then((v) => { if (!live) return; if (v === dayKey()) { shownThisLoad = true; setWanted(null); } else show(); }).catch(show);
    return () => { live = false; };
  }, [wanted, open, daily?.content]);

  if (!open || !daily?.content) return null;
  const photo = dailyPhoto();
  const c = daily.content;
  return (
    <DailyUpdate
      photo={photo.src}
      alt={photo.alt}
      dateLabel={c.dateLabel}
      greeting={c.greeting}
      lines={c.lines}
      onGo={() => setOpen(false)}
      onNotToday={() => { setOpen(false); prefSet(SKIP_PREF, dayKey()).catch(() => {}); }}
    />
  );
}
