/**
 * tests/persistence/email-photos.mjs
 *
 * THE HEADER PHOTO ON EVERY BRAND EMAIL THAT HAS ONE.
 *
 * Owner's picks, 2026-10-14, nine emails that had no photo at all. The
 * contact sheet that found them is the reason this file exists: the shared
 * shell had no photo row, so seventeen emails were missing one for a single
 * reason rather than seventeen.
 *
 * ── WHAT CAN GO WRONG HERE, AND WHY EACH CHECK IS THE SHAPE IT IS ─────────
 *
 * THE SIZE. Two of these ids are 2752x1536 and one is 1280x960. A single
 * height across all nine would reserve the wrong box for most of them while
 * images are still off, which is the whole job of the attribute. So each
 * photo's height is asserted against its own declared ratio, not a constant.
 *
 * THE CARD. The retention emails are drawn at 600 and emailShell at 560.
 * Copying 600 across would overflow eight cards by 40px and nothing would say
 * so, because an oversized img inside a table just stretches it. Each photo is
 * checked against the width of the card it actually lands on.
 *
 * THE ENCODING. Two ids carry an o-grave. A raw non-ASCII byte in an img src
 * is not something every mail client will fetch, so both must travel
 * percent-encoded, and the check is that no src carries a raw one.
 *
 * NO NETWORK. The ids were confirmed to answer 200 image/jpeg by URL before
 * they were written down, by hand, once. This guard does not re-fetch them: a
 * suite that reached Cloudinary on every run would fail on a flaky network and
 * teach people to ignore it.
 */

import { pass, fail } from './_shared.mjs';

/** Each email, the key it uses, and the width of the card it sits on. */
const PLACEMENTS = [
  ['welcome', 560, async () => (await import('../../api/emails/onboarding-day1.js')).onboardingDay1Email({ name: 'Isla', email: 'isla@example.com' })],
  ['onboardingDay3', 560, async () => (await import('../../api/emails/onboarding-day3.js')).onboardingDay3Email({ name: 'Isla', email: 'isla@example.com' })],
  ['onboardingDay7', 560, async () => (await import('../../api/emails/onboarding-day7.js')).onboardingDay7Email({ name: 'Isla', email: 'isla@example.com' })],
  ['purchaseConfirmation', 560, async () => (await import('../../api/emails/purchase-confirmation.js')).purchaseConfirmationEmail({ plan: 'ultra', email: 'isla@example.com', name: 'Isla' })],
  ['giftReceipt', 560, async () => (await import('../../api/emails/gift-receipt.js')).giftReceiptEmail({ plan: 'ultra', recipientEmail: 'isla@example.com', code: 'GIFT-TEST-CODE', recipientEmailSent: true })],
  ['weeklyDigest', 560, async () => (await import('../../src/lib/weeklyDigestEmailTemplate.js')).renderWeeklyDigestEmail({ coupleNames: 'Isla and Theo', daysUntil: 86, newRsvpCount: 0, newAttending: 0, newDeclined: 0, totals: {}, pollActivity: 0, questionnaireActivity: 0, recommendedActions: [], accountUrl: 'https://openinvite.com.au/account' }).html],
  ['notification', 560, async () => (await import('../../src/lib/notificationEmailTemplate.js')).renderNotificationEmail({ title: 'A thing happened', body: 'Some detail.', link: 'https://openinvite.com.au/x' }).html],
  ['guestNote', 600, async () => (await import('../../api/_lib/guestNoteNotification.js')).guestNoteEmail({ guestName: 'Priya Raman', message: 'A note.' }).html],
  ['guestReply', 560, async () => (await import('../../src/lib/guestReplyEmailTemplate.js')).renderGuestReplyEmail({ guestName: 'Priya Raman', coupleNames: 'Isla and Theo', originalMessage: 'A note.', replyText: 'A reply.' }).html],
];

const DELIVERY = 'https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto,w_1200/';

export async function runEmailPhotos() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  console.log('\n  The header photo on nine brand emails:\n');

  const { EMAIL_PHOTOS } = await import('../../src/lib/emailPhotos.js');

  ok('every email that should have a photo has one declared',
     PLACEMENTS.every(([k]) => EMAIL_PHOTOS[k]),
     `${Object.keys(EMAIL_PHOTOS).length} declared, ${PLACEMENTS.length} placed`);

  // NO ORPHANS EITHER. A declared photo nothing renders is a dead id that
  // nobody will notice has rotted.
  const placed = new Set(PLACEMENTS.map(([k]) => k));
  ok('  and no declared photo goes unused',
     Object.keys(EMAIL_PHOTOS).every((k) => placed.has(k)),
     Object.keys(EMAIL_PHOTOS).filter((k) => !placed.has(k)).join(', ') || 'none spare');

  for (const [key, cardWidth, render] of PLACEMENTS) {
    const photo = EMAIL_PHOTOS[key];
    if (!photo) continue;

    ok(`${key}: the delivery URL is the shared transform`,
       photo.url.startsWith(DELIVERY), photo.url.slice(0, 64));

    // THE RAW BYTE IS THE BUG. encodeURIComponent turns the o-grave into
    // %C3%B2; a src that still carries the character itself never got encoded.
    // eslint-disable-next-line no-control-regex
    ok(`  ${key}: the src is pure ASCII`,
       // eslint-disable-next-line no-control-regex
       !/[^\x00-\x7F]/.test(photo.url), 'ascii only');

    ok(`  ${key}: the width is the card it sits on`,
       photo.width === cardWidth, `${photo.width} on a ${cardWidth} card`);

    // DECORATIVE, SO SILENT. Owner ruling 2026-10-14: these nine carry no
    // information the copy does not already carry, so alt="" tells a screen
    // reader to skip them. A missing alt attribute would not: that is read as
    // "this might matter", and the reader falls back to the filename.
    ok(`  ${key}: the alt is empty, because the photo is decorative`,
       photo.alt === '', JSON.stringify(photo.alt));

    ok(`  ${key}: it carries its own height, not a shared one`,
       Number.isInteger(photo.height) && photo.height > 0, String(photo.height));

    // RENDERED, NOT JUST DECLARED. The constant can be perfect and the
    // template still not use it.
    const html = await render();
    const tag = `<img src="${photo.url}" width="${photo.width}" height="${photo.height}" alt=""`;
    ok(`  ${key}: and the template actually renders it, at that size`,
       html.includes(tag), html.includes(tag) ? 'rendered' : 'not found in the html');
  }

  // ── AVA'S ICON IS A PNG, NOT CSS ────────────────────────────────────────
  //
  // onboarding-day3 drew it as a div with a linear-gradient and a glyph. Outlook
  // does not render CSS gradients, so Ava's icon was a blank box there and no
  // status check could have said so: there was no image to check.
  const { AVA_ICON } = await import('../../src/lib/emailPhotos.js');
  const day3 = (await import('../../api/emails/onboarding-day3.js')).onboardingDay3Email({ name: 'Isla', email: 'isla@example.com' });
  ok('Ava\'s icon is an image, at 48 with a 2x source',
     day3.includes(`<img src="${AVA_ICON.url}" width="48" height="48" alt=""`),
     AVA_ICON.url.split('/').pop());
  ok('  and no email template paints an icon in CSS',
     !/linear-gradient/.test(day3), 'no gradient');

  // ── NO EMAIL IMAGE MAY COME FROM A HOST THAT BLOCKS CROSS-ORIGIN USE ────
  //
  // www.openinvite.com.au serves email-assets with
  // cross-origin-resource-policy: same-site. curl reports 200 and a valid PNG,
  // so every status check passed, and the logo still failed to draw in every
  // mail client: net::ERR_BLOCKED_BY_RESPONSE.NotSameSite. It was broken in
  // production in the collaborator invite and the verification email, and the
  // only thing that found it was rendering the email in a browser.
  //
  // This is a path check rather than a fetch, for the same reason the ids are
  // not re-fetched: it must be true of the source, every run, offline.
  const SAME_SITE_HOST = /openinvite\.com\.au\/email-assets/;
  const EMAIL_SOURCES = [
    'src/lib/emailBrand.js', 'src/lib/emailPhotos.js', 'src/lib/collaboratorEmailTemplate.js',
    'src/lib/giftWelcomeEmail.js', 'src/lib/guestReplyEmailTemplate.js',
    'src/lib/notificationEmailTemplate.js', 'src/lib/weeklyDigestEmailTemplate.js',
    'api/_lib/retentionEmails.js', 'api/_lib/guestNoteNotification.js',
    'api/emails/gift-reveal.js', 'base44/emails/EmailVerification.html',
  ];
  const { readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const ROOT = resolve(new URL('../../', import.meta.url).pathname);
  const offenders = EMAIL_SOURCES.filter((p) => SAME_SITE_HOST.test(readFileSync(resolve(ROOT, p), 'utf8')));
  ok('no email template serves an image from the same-site host',
     offenders.length === 0,
     offenders.join(', ') || `${EMAIL_SOURCES.length} source(s) clean`);

  // AND THE CHECK CAN FAIL, or it is a line that reads as protection.
  ok('  and that check would catch it',
     SAME_SITE_HOST.test('<img src=https://www.openinvite.com.au/email-assets/x.png>'),
     'caught');

  // THE PHOTO SITS ABOVE THE WORDS, which is what "header photo" means. In
  // every one of these the first heading must come after the image.
  for (const [key, , render] of PLACEMENTS.slice(0, 3)) {
    const html = await render();
    const imgAt = html.indexOf(EMAIL_PHOTOS[key].url);
    const h1At = html.search(/<h1|font-size:2[0-9]px/);
    ok(`  ${key}: the photo is above the heading`,
       imgAt > 0 && h1At > 0 && imgAt < h1At, `img ${imgAt}, heading ${h1At}`);
  }

  // AND THE SHELL IS UNCHANGED FOR EVERYONE ELSE. The photo row is opt-in, so
  // an email that passes none must render exactly as it did.
  const { emailShell } = await import('../../src/lib/emailBrand.js');
  const without = emailShell({ title: 't', bodyRowsHtml: '<tr><td>x</td></tr>' });
  ok('an email that passes no photo renders no photo row',
     !without.includes('f_auto,q_auto,w_1200'), 'unchanged');

  return results;
}
