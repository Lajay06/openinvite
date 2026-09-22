import { useEffect, useMemo, useState } from 'react';
import { useDailyUpdate } from '../data/dailyUpdate';
import { nextSplashPhoto } from '../lib/splashPool';
import { ownImages, imageUrl } from '../lib/images';

/** One of the couple's photos by the day, so the daily update turns over without repeating on a day. */
export function photoOfTheDay(list, now = new Date()) {
  if (!list.length) return null;
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  return list[dayOfYear % list.length];
}

/**
 * What the launch sequence needs, for the signed-in app and the preview
 * alike: the splash photo for this open (the pool, one per open), and the
 * daily update built from the same stores and functions the desktop reads.
 * `ready` once both are in; the sequence still holds its minimums.
 */
export default function useLaunch() {
  const daily = useDailyUpdate();
  const [splash, setSplash] = useState(null);
  useEffect(() => { let live = true; nextSplashPhoto().then((p) => { if (live) setSplash(p); }).catch(() => { if (live) setSplash({ key: null, url: '', alt: '' }); }); return () => { live = false; }; }, []);
  return useMemo(() => {
    const details = daily.data?.details;
    // The couple's own photos lead the daily update; with none, the standard hero photo stands in.
    const own = ownImages(details);
    const photo = photoOfTheDay(own) || imageUrl('heroDays');
    return {
      ready: !daily.loading && splash !== null,
      photo: splash?.url || '',
      alt: splash?.alt || '',
      daily: daily.content ? { ...daily.content, photo, alt: own.length ? 'One of your photos' : 'A couple in an arched doorway, forehead to forehead' } : null,
    };
  }, [daily.loading, daily.data, daily.content, splash]);
}
