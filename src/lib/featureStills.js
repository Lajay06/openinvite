/**
 * src/lib/featureStills.js
 *
 * THE PRODUCT INSIDE /features. Site fixes batch 3, item 4 (owner rulings
 * 2026-10-11): each feature section carries one real still of that exact
 * feature, from the rich fixture, cut to 3:2, with no dashboard chrome,
 * browser chrome or device frame. The page adapts nothing; the still adapts
 * to the page.
 *
 * Shot by scripts/tour-recordings/record-feature-stills.mjs (stills) and
 * record-tour-page.mjs --only=feature-seating (the one clip), each uploaded to
 * a new Cloudinary path with overwrite off. A reshoot is a new id here, never
 * a replaced file.
 *
 * Captions are the item 4 proposal's, accepted with the ruling, except two
 * that claimed what their stills cannot show: the guest list has no reply
 * time ("and when" is gone) and the vendors table no owed column ("where
 * each one stands" is its status).
 */
const IMAGE = 'https://res.cloudinary.com/dsr84xknv/image/upload';
const VIDEO = 'https://res.cloudinary.com/dsr84xknv/video/upload';

/** 552 is the text column at 1440; 1104 is the same at 2x, the capture's own scale. */
const STILL_WIDTHS = [552, 1104];

function still(path, alt, caption) {
  const at = (w) => `${IMAGE}/f_auto,q_auto:good,c_limit,w_${w}/${path}`;
  return {
    src: at(STILL_WIDTHS[0]),
    srcSet: STILL_WIDTHS.map((w) => `${at(w)} ${w}w`).join(', '),
    alt,
    caption,
  };
}

export const FEATURE_STILLS = {
  morning: still(
    'v0/studio-tour/stills/feature-morning/1440-PENDING',
    "The Daily update: the date and one sentence about the couple's day, above This week, Ava's briefing and their numbers",
    'The morning page. What today needs, in one sentence.',
  ),
  replies: still(
    'v1791727534/studio-tour/stills/feature-replies/1440-20261011140534',
    "The guest list: each guest's answer for the ceremony and the reception",
    'Who said yes, and to which event.',
  ),
  budget: still(
    'v1791727533/studio-tour/stills/feature-budget/1440-20261011140532',
    "The budget forecast's risk flags, each with what was budgeted and what is committed",
    'What you planned, what you paid, what is still owed.',
  ),
  vendors: still(
    'v1791727535/studio-tour/stills/feature-vendors/1440-20261011140535',
    "The couple's vendors, each with its category, status and price",
    'Every vendor, what they cost, and where each one stands.',
  ),
  suite: still(
    'v0/studio-tour/stills/feature-suite/1440-PENDING',
    "The guest suite's celebration page: the day, then the ceremony with its time, place and dress code",
    'The schedule your guests see, on the site you designed.',
  ),
};

/**
 * THE ONE CLIP: a guest seated by clicking a table, then her name. Recorded at
 * 1440 by 1100 and cut to 3:2 here, at delivery, around the floor plan and the
 * table panel (x 598, y 430, 810 by 540 in the recording's own pixels).
 */
const SEATING_CROP = 'c_crop,x_598,y_430,w_810,h_540';
const SEATING_PATH = 'v1791727556/studio-tour/tour-page/feature-seating/1440-20261011140554';
export const FEATURE_SEATING_CLIP = {
  webm: `${VIDEO}/${SEATING_CROP}/${SEATING_PATH}.webm`,
  mp4: `${VIDEO}/${SEATING_CROP}/vc_h264,q_auto:good/${SEATING_PATH}.mp4`,
  poster: `${VIDEO}/${SEATING_CROP}/so_1.0,q_auto:good/${SEATING_PATH}.jpg`,
  alt: 'A table on the seating plan is clicked, a waiting guest is chosen from its panel, and the table fills to ten of ten',
  caption: 'Every table, every seat, and who is still waiting for one.',
};
