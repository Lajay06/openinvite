/**
 * src/lib/emailPhotos.js
 *
 * THE HEADER PHOTO FOR EVERY BRAND EMAIL THAT HAS ONE.
 *
 * Owner's picks, 2026-10-14. Same construction as RETENTION_PHOTOS in
 * api/_lib/retentionEmails.js: a Cloudinary delivery URL with
 * f_auto,q_auto,w_1200, and a width and height attribute per photo.
 *
 * ── WHY EACH PHOTO CARRIES ITS OWN HEIGHT ─────────────────────────────────
 *
 * Outlook and Gmail both start with remote images off, and the width/height
 * attributes are what reserve the right-shaped box before the image arrives.
 * A single height across photos of different proportions would reserve the
 * wrong box for most of them, which is the exact fault the attribute exists to
 * prevent. So the height is this photo's own, computed from its real pixel
 * dimensions against the card it sits on.
 *
 * ── TWO CARD WIDTHS, AND THEY ARE NOT INTERCHANGEABLE ─────────────────────
 *
 * The retention emails are drawn on a 600px card. Every email built on
 * emailShell is 560 (src/lib/emailBrand.js), and the guest-note email has its
 * own 600px shell. Copying the retention pattern's 600 across would have
 * overflowed eight cards by 40px. Owner ruling 2026-10-14, asked and answered:
 * the shell stays at 560 and the photos are sized to the card they land on.
 *
 * ── THE ALT TEXT IS EMPTY, AND THAT IS THE ANSWER, NOT A GAP ─────────────
 *
 * Owner ruling 2026-10-14: these nine are decorative. A header photo that
 * carries no information the copy does not already carry should be announced
 * to nobody, and alt="" is how you say that to a screen reader. It is read as
 * "skip me", where a missing alt attribute is read as "this might matter, here
 * is the filename".
 *
 * So this is not the placeholder it was for half a day. Descriptive alt text
 * would have been wrong here: it would make a screen reader stop and describe
 * a mood photograph before the sentence that actually says what the email is
 * for.
 *
 * The collaborator invite keeps its own alt, which is its own ruling.
 */

const CLOUDINARY = 'https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto,w_1200';

/**
 * The ò in two of these ids is percent-encoded, because a raw non-ASCII byte
 * in an img src is not a URL every mail client will fetch. Both were confirmed
 * to answer 200 image/jpeg in this encoded form before being written here.
 */
const url = (publicId) => `${CLOUDINARY}/${encodeURIComponent(publicId).replace(/%2F/g, '/')}`;

/**
 * AVA'S ICON, AS A PNG, because the email drew it in CSS.
 *
 * api/emails/onboarding-day3.js had a div with
 * linear-gradient(135deg,#ec4899,#9333ea) and a glyph inside it. Outlook does
 * not render CSS gradients, so Ava's icon was a blank box there.
 *
 * The file is the app's own values rendered at 96px and uploaded: the gradient
 * from src/Layout.jsx and AnimatedSidebar.jsx, and the Sparkles mark that
 * src/components/layout/AvaModal.jsx uses, drawn white. 96 is 2x the 48 it
 * shows at, so it stays sharp on a retina screen.
 *
 * Decorative: the heading beside it already says the email is about Ava, so
 * the alt is empty for the same reason the nine photos' are.
 */
export const AVA_ICON = {
  url: 'https://res.cloudinary.com/dsr84xknv/image/upload/v1791970786/email-assets/ava-icon-2x.png',
  alt: '', width: 48, height: 48,
};

/** Keyed by the email each belongs to. Width is the card's, height is the photo's. */
export const EMAIL_PHOTOS = {
  welcome: {
    url: url('DTS_BANDITS_PALI_MENDEZ_Photos_ID14280_cddisg'),
    alt: '', width: 560, height: 420,
  },
  onboardingDay3: {
    url: url('DTS_LONELY_COMMUTE_Mark_Forbes_Photos_ID2352_zrq7ma'),
    alt: '', width: 560, height: 373,
  },
  onboardingDay7: {
    url: url('DTS_INFLUENCER_Daniel_Farò_Photos_ID8176_o11cc0'),
    alt: '', width: 560, height: 373,
  },
  purchaseConfirmation: {
    url: url('hf_20260904_090213_add0b2d6-8dcc-44ce-8360-762925a327c7_g5eb7y'),
    alt: '', width: 560, height: 313,
  },
  giftReceipt: {
    url: url('DTS_TERRA_Chris_Abatzis_Photos_ID13220_kxcbio'),
    alt: '', width: 560, height: 372,
  },
  weeklyDigest: {
    url: url('DTS_MISC_1__NICK_FANCHER__Nick_Fancher_Photos_ID6168_uikduy'),
    alt: '', width: 560, height: 373,
  },
  notification: {
    url: url('hf_20260907_065547_b4779030-2092-4779-9296-824674aac120_i7hid6'),
    alt: '', width: 560, height: 313,
  },
  // THE ONE ON A 600 CARD. api/_lib/guestNoteNotification.js has its own shell.
  guestNote: {
    url: url('DTS_MINDFUL_MESS_Shauna_Summers_Photos_ID8767_sflfia'),
    alt: '', width: 600, height: 400,
  },
  guestReply: {
    url: url('DTS_LUNAR_Daniel_Farò_Photos_ID11287_f3krcq'),
    alt: '', width: 560, height: 374,
  },
};
