/**
 * src/lib/tourMoments.js
 *
 * /tour AS FOUR MOMENTS. Site fixes batch 3, item 5, second half (owner
 * walkthrough 2026-10-11): the morning page, replies, the seating chart and
 * the guest suite, each full width with one line in the owner's voice and
 * nothing else.
 *
 * Each moment is the product at its own size, from the rich fixture, cut to
 * the site's 3:2 (the guest site keeps its own 16:10, see below) with no
 * dashboard chrome: a still where nothing moves in the
 * product (the morning page; replies, because the dashboard does not update
 * live, owner ruling 2026-10-11), a clip where something does (a guest seated
 * by clicking; a guest opening the site). Below 768px a moment shows its
 * phone-readable form instead: the tight /features crop, or the site clip's
 * own 390 take.
 *
 * Every file is a new Cloudinary path with overwrite off; a reshoot is a new
 * id here.
 */
import { FEATURE_STILLS, FEATURE_SEATING_CLIP } from './featureStills.js';
import { TOUR_PAGE_MEDIA } from './studioTour.js';

const IMAGE = 'https://res.cloudinary.com/dsr84xknv/image/upload';
const VIDEO = 'https://res.cloudinary.com/dsr84xknv/video/upload';

/** 1125 is the frame at 1440; 2250 the capture's own 2x. */
const WIDTHS = [1125, 2250];
function wide(path) {
  const at = (w) => `${IMAGE}/f_auto,q_auto:good,c_limit,w_${w}/${path}`;
  return { src: at(WIDTHS[0]), srcSet: WIDTHS.map((w) => `${at(w)} ${w}w`).join(', ') };
}

/** A recorded clip cut to 3:2 at delivery, in its own pixels. */
function cut(take, crop) {
  return {
    webm: `${VIDEO}/${crop}/${take}.webm`,
    mp4: `${VIDEO}/${crop}/vc_h264,q_auto:good/${take}.mp4`,
    poster: `${VIDEO}/${crop}/so_1.0,q_auto:good/${take}.jpg`,
  };
}

const SEATING_TAKE = 'v1791730194/studio-tour/tour-page/feature-seating/1440-20261011144952';
const SITE = TOUR_PAGE_MEDIA.site;

export const TOUR_MOMENTS = [
  {
    key: 'morning',
    line: 'Every morning, one sentence tells you what today needs.',
    still: { ...wide('v1791730231/studio-tour/stills/tour-morning/1325-20261011145029'),
      alt: "The Daily update: the date and one sentence about the couple's day, above This week, Ava's briefing and their numbers" },
    phone: { still: FEATURE_STILLS.morning },
  },
  {
    key: 'replies',
    line: 'Every answer lands on your list, event by event.',
    still: { ...wide('v1791730232/studio-tour/stills/tour-replies/1440-20261011145031'),
      alt: "The guest list: each guest's category, their answer for the ceremony and the reception, and when they were last sent an invitation or reminder" },
    phone: { still: FEATURE_STILLS.replies },
  },
  {
    key: 'seating',
    line: 'Click a table, choose a name, and the seat is theirs.',
    // The floor plan and the table panel, the whole canvas: 975 by 650.
    clip: { ...cut(SEATING_TAKE, 'c_crop,x_433,y_429,w_975,h_650'),
      alt: 'A table on the seating plan is clicked, a waiting guest is chosen from its panel, and the table fills to ten of ten' },
    phone: { clip: FEATURE_SEATING_CLIP },
  },
  {
    key: 'suite',
    line: 'Your guests open one site, in the look you chose.',
    // The whole 1440 by 900 take, at its own 16:10. Cut to 3:2 it loses
    // either the couple's names at the left edge or the site's nav at the
    // right, and both are the couple's design.
    clip: { webm: SITE.webm, mp4: SITE.mp4, poster: SITE.poster, aspect: '16 / 10',
      alt: "The couple's guest site: the cover photograph, then the celebration page with the ceremony and the reception" },
    phone: { clip: { ...SITE.phone, alt: "The couple's guest site on a phone, from the cover photograph down", portrait: true } },
  },
];
