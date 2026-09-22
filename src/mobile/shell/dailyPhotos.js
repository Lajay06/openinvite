import mon from '../assets/daily/mon.webp?no-inline';
import tue from '../assets/daily/tue.webp?no-inline';
import wed from '../assets/daily/wed.webp?no-inline';
import thu from '../assets/daily/thu.webp?no-inline';
import fri from '../assets/daily/fri.webp?no-inline';
import sat from '../assets/daily/sat.webp?no-inline';
import sun from '../assets/daily/sun.webp?no-inline';
import { IMAGES } from '../images';

/**
 * The daily update's photos (goal 7): seven files bundled into the app at
 * build time, so the card's photo is on screen the instant the card is,
 * with nothing waiting on the network. 800 by 800 WebP (goal 8: the photo
 * fills the top 45 percent of the screen, near enough square), about 35 to 90 KB
 * each. Which one shows turns over with the day of the week. The slots in
 * images.ts (dailyMon to dailySun) record where each came from in the
 * Cloudinary `app` folder, so the once-only check covers them. `?no-inline`
 * keeps them files in dist/assets: the desktop Vite config inlines every
 * non-font asset as base64, which would put 400 KB into a JS chunk.
 */
const BY_DAY = [
  { key: 'dailySun', src: sun },
  { key: 'dailyMon', src: mon },
  { key: 'dailyTue', src: tue },
  { key: 'dailyWed', src: wed },
  { key: 'dailyThu', src: thu },
  { key: 'dailyFri', src: fri },
  { key: 'dailySat', src: sat },
];

/** { src, alt } for the day, Sunday first as Date.getDay() counts. */
export function dailyPhoto(now = new Date()) {
  const d = BY_DAY[now.getDay()] || BY_DAY[1];
  return { src: d.src, alt: IMAGES[d.key].alt };
}

/** Every bundled photo, for the gallery. */
export function allDailyPhotos() {
  return BY_DAY.map((d) => ({ key: d.key, src: d.src, alt: IMAGES[d.key].alt }));
}
