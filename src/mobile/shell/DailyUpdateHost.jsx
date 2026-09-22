import React, { useEffect, useState } from 'react';
import DailyUpdate from './DailyUpdate';
import { dayKey } from '../data/dailyUpdate';
import { dailyPhoto } from './dailyPhotos';
import { prefGet, prefSet } from '../native';

const DAILY_PREF = 'daily_update_date';

// Once per JS load: a route change, a lock or a re-render of the shell
// must not bring it back.
let shownThisLoad = false;

/**
 * Decides when the daily update shows and draws it over the dashboard.
 * `daily` is { ready, content } from useDailyUpdate; `force` shows it
 * regardless (the web preview's ?daily=1).
 */
export default function DailyUpdateHost({ daily, force = false }) {
  const [show, setShow] = useState(null);
  useEffect(() => {
    if (force) { setShow(true); return undefined; }
    if (shownThisLoad) { setShow(false); return undefined; }
    let live = true;
    prefGet(DAILY_PREF).then((v) => { if (live) setShow(v !== dayKey()); }).catch(() => { if (live) setShow(true); });
    return () => { live = false; };
  }, [force]);
  if (!show || !daily?.content) return null;
  shownThisLoad = true;
  const photo = dailyPhoto();
  const c = daily.content;
  const close = () => { setShow(false); prefSet(DAILY_PREF, dayKey()).catch(() => {}); };
  return <DailyUpdate photo={photo.src} alt={photo.alt} dateLabel={c.dateLabel} greeting={c.greeting} lines={c.lines} onGo={close} />;
}
