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
 * ── THE ALT TEXT IS A PLACEHOLDER AND SHOULD NOT STAY ONE ─────────────────
 *
 * Every line here reads "Openinvite", which is what the collaborator invite's
 * photo carries (src/lib/collaboratorEmailTemplate.js, owner-approved
 * 2026-10-13). It is true and it is not descriptive.
 *
 * Descriptive alt text means describing what is in the photograph, and the
 * instruction that brought these ids here also said not to open them. The
 * public id is not a description: DTS_LONELY_COMMUTE is a collection name, and
 * RETENTION_PHOTOS' own comment makes the point that a guess from the image
 * does not belong in alt text, let alone a guess from its filename. So these
 * wait for a line from someone who has seen them. One edit each.
 */

const CLOUDINARY = 'https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto,w_1200';

/**
 * The ò in two of these ids is percent-encoded, because a raw non-ASCII byte
 * in an img src is not a URL every mail client will fetch. Both were confirmed
 * to answer 200 image/jpeg in this encoded form before being written here.
 */
const url = (publicId) => `${CLOUDINARY}/${encodeURIComponent(publicId).replace(/%2F/g, '/')}`;

/** Keyed by the email each belongs to. Width is the card's, height is the photo's. */
export const EMAIL_PHOTOS = {
  welcome: {
    url: url('DTS_BANDITS_PALI_MENDEZ_Photos_ID14280_cddisg'),
    alt: 'Openinvite', width: 560, height: 420,
  },
  onboardingDay3: {
    url: url('DTS_LONELY_COMMUTE_Mark_Forbes_Photos_ID2352_zrq7ma'),
    alt: 'Openinvite', width: 560, height: 373,
  },
  onboardingDay7: {
    url: url('DTS_INFLUENCER_Daniel_Farò_Photos_ID8176_o11cc0'),
    alt: 'Openinvite', width: 560, height: 373,
  },
  purchaseConfirmation: {
    url: url('hf_20260904_090213_add0b2d6-8dcc-44ce-8360-762925a327c7_g5eb7y'),
    alt: 'Openinvite', width: 560, height: 313,
  },
  giftReceipt: {
    url: url('DTS_TERRA_Chris_Abatzis_Photos_ID13220_kxcbio'),
    alt: 'Openinvite', width: 560, height: 372,
  },
  weeklyDigest: {
    url: url('DTS_MISC_1__NICK_FANCHER__Nick_Fancher_Photos_ID6168_uikduy'),
    alt: 'Openinvite', width: 560, height: 373,
  },
  notification: {
    url: url('hf_20260907_065547_b4779030-2092-4779-9296-824674aac120_i7hid6'),
    alt: 'Openinvite', width: 560, height: 313,
  },
  // THE ONE ON A 600 CARD. api/_lib/guestNoteNotification.js has its own shell.
  guestNote: {
    url: url('DTS_MINDFUL_MESS_Shauna_Summers_Photos_ID8767_sflfia'),
    alt: 'Openinvite', width: 600, height: 400,
  },
  guestReply: {
    url: url('DTS_LUNAR_Daniel_Farò_Photos_ID11287_f3krcq'),
    alt: 'Openinvite', width: 560, height: 374,
  },
};
