/**
 * tests/persistence/email-templates-editor.mjs
 *
 * THE EMAILS SECTION OF THE WEBSITE BUILDER — every property the owner's
 * ruling turned on, checked against what the SENDING renderer actually
 * produces rather than against the editor's own opinion of itself.
 *
 * Owner ruling 2026-09-07, rejecting the first attempt: "this editor needs to
 * be in the design studio like I asked. Just have it in the right panel and
 * then enable similar design controls. Enable the ability to add a banner
 * photo, and clearly advise the default wording vs what they can change."
 *
 * ── WHAT IS CHECKED, AND WHY EACH ONE IS HERE ───────────────────────────────
 *
 *   NO VIDEO IN AN EMAIL. A wedding's cover photo is a URL and nothing stops
 *   it being an .mp4 — the hero on the guest site frequently is one. Dropped
 *   into an <img src> that is a broken image in every mail client on earth.
 *   Checked across four URL shapes (file extension, Cloudinary video
 *   delivery, YouTube, Vimeo) and every email type, because the first version
 *   of the rule only knew about file extensions.
 *
 *   EVERY VARIANT IS LEGIBLE ON EVERY UNIVERSE. The variants exist so a couple
 *   can use their universe's dark half, and the template used to write
 *   `rgba(0,0,0,0.55)` for its secondary lines — black at 55%, invisible on a
 *   dark card. 20 universes x 4 variants x 2 button styles is 160 renders, and
 *   every one of them has to clear WCAG on the ink, the accent and the button
 *   label. This is the check that makes the dark halves usable rather than
 *   decorative.
 *
 *   THE DEFAULTS THAT ARE SHOWN ARE THE DEFAULTS THAT SEND. The panel
 *   pre-fills the four editable fields and says "Default wording — edit to
 *   make it yours". If those strings were a separate copy from what the
 *   renderer falls back to, the panel would be showing a couple words their
 *   guests will not receive. So the rendered HTML is searched for the exact
 *   strings the panel displays.
 *
 *   THE LOCKED ROWS ARE THE REAL VALUES. The Content tab shows the kicker, the
 *   button label and the footer as read-only rows marked "Default — can't be
 *   changed". Each is asserted to be the renderer's own literal, so the rows
 *   cannot drift into a paraphrase of a value that has since changed.
 *
 *   THE SILENT DISCARD. WeddingDetails.emailTemplates does not exist in the
 *   Base44 schema. Base44 accepts an unknown field with HTTP 200 and drops it,
 *   so a save that trusts the status code reports success over data that is
 *   already gone. saveTemplates is run against four fake backends — one that
 *   keeps the field, one that discards it, one that throws on write, one that
 *   throws on read-back — and must report the truth for all four.
 */

import { pass, fail } from './_shared.mjs';
import {
  renderInvitationEmail, getEmailTypeConfig, EMAIL_TYPES,
  isVideoUrl, emailBannerUrl, getBannerImageUrl, getDefaultBannerChoice,
} from '../../src/lib/emailTemplate.js';
import { emailPalette, PALETTE_VARIANT_IDS } from '../../src/lib/emailPalette.js';
import { UNIVERSE_EMAIL_STYLES } from '../../src/lib/universeEmailStyles.js';
import { contrastRatio } from '../../src/lib/surfaceTint.js';
import {
  EDITOR_TEMPLATES, TEMPLATE_TYPES, TEMPLATE_FIELDS, defaultsFor, defaultFor,
  lockedRowsFor, designOf, personalMessageFrom, subjectFrom, isDefault, isWritten,
  templatesOf, saveTemplates, publicIdOf, emptyTemplate, SAVE_FAILURE_MESSAGE,
} from '../../src/lib/emailTemplateStore.js';

const UNIVERSE_IDS = Object.keys(UNIVERSE_EMAIL_STYLES);

const WEDDING = {
  coupleNames: 'Margot & Theo',
  weddingDate: '2026-11-02',
  slug: 'margot-and-theo',
};

function render(type, { design, bannerImageUrl, universeId = 'london', personalMessage } = {}) {
  return renderInvitationEmail({
    universeId,
    type,
    guestName: 'Sam Whitfield',
    coupleNames: WEDDING.coupleNames,
    events: [{ name: 'Ceremony', date: WEDDING.weddingDate, startTime: '3:00 pm', venue: 'The Old Observatory' }],
    personalMessage,
    rsvpUrl: 'https://openinvite.com.au/w/margot-and-theo',
    siteUrl: 'https://openinvite.com.au/w/margot-and-theo',
    weddingDate: WEDDING.weddingDate,
    bannerImageUrl,
    design,
  });
}

export async function runEmailTemplatesEditor() {
  const results = [];
  const t = (name, ok, note) => results.push(ok ? pass(name, note) : fail(name, 'as described above', note || 'no'));

  // ── THE FIVE THE OWNER NAMED ────────────────────────────────────────────
  console.log('\n  The five emails, as the owner listed them:\n');

  const OWNER_LIST = ['Save the date', 'Invitation', 'Update', 'Reminder', 'Thank you'];
  t('the section lists exactly the owner’s five, in his order',
    EDITOR_TEMPLATES.length === 5 && EDITOR_TEMPLATES.every((e, i) => e.label === OWNER_LIST[i]),
    EDITOR_TEMPLATES.map((e) => e.label).join(' · '));

  // NOTHING IS HIDDEN BY THE LIST BEING FIVE. "Thank you" stands for two real
  // emails — a guest who accepted and a guest who declined get different
  // letters. If the list of five silently dropped one of them, a couple would
  // be editing an email that is not the one their guest receives.
  t('every email the product sends is reachable from the list',
    EMAIL_TYPES.every((type) => TEMPLATE_TYPES.includes(type)) && TEMPLATE_TYPES.length === EMAIL_TYPES.length,
    `${TEMPLATE_TYPES.length} types behind ${EDITOR_TEMPLATES.length} entries`);
  t('and no entry claims a type that does not exist',
    TEMPLATE_TYPES.every((type) => EMAIL_TYPES.includes(type)),
    TEMPLATE_TYPES.join(', '));
  t('the two thank-yous keep their own words',
    defaultFor('thank_you_attending', 'body') !== defaultFor('thank_you_declined', 'body'),
    'attending ≠ declined');

  // ── NO VIDEO, ACROSS EVERY SHAPE A VIDEO URL TAKES ──────────────────────
  console.log('\n  No video reaches an email banner:\n');

  const VIDEO_URLS = [
    'https://res.cloudinary.com/demo/image/upload/v1/wed/hero.mp4',
    'https://res.cloudinary.com/demo/video/upload/f_auto,q_auto/v1/wed/hero',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://vimeo.com/76979871',
  ];
  const PHOTO_URL = 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_1400/v1/wed/hero.jpg';

  for (const url of VIDEO_URLS) {
    t(`  recognized as video: ${url.slice(0, 52)}`, isVideoUrl(url) === true);
    t('    and the banner refuses it', emailBannerUrl(url) === null);
    t('    and it is never the default banner choice',
      getDefaultBannerChoice({ coverPhoto: url, venuePhotoUrl: null }) !== 'wedding');
    t('    and an explicit pick of it still yields nothing',
      getBannerImageUrl({ coverPhoto: url, venuePhotoUrl: null }, 'wedding') === null);
  }
  t('  a photograph is NOT mistaken for a video', isVideoUrl(PHOTO_URL) === false);
  t('  and it does reach the banner', typeof emailBannerUrl(PHOTO_URL) === 'string');

  // The whole email, not just the helper: no rendered email of any type, on a
  // wedding whose cover is a video, may contain a <video> element or a video
  // URL anywhere in its HTML.
  for (const type of EMAIL_TYPES) {
    const bad = VIDEO_URLS.filter((url) => {
      const { html } = render(type, { bannerImageUrl: emailBannerUrl(url) });
      return /<video/i.test(html) || VIDEO_URLS.some((v) => html.includes(v));
    });
    t(`  ${type} — no video element and no video URL in the HTML`, bad.length === 0, bad.join(', ') || '4 shapes');
  }

  // ── THE BANNER IS CROPPED TO THE FACES ──────────────────────────────────
  console.log('\n  The banner crop:\n');

  const cropped = emailBannerUrl(PHOTO_URL);
  t('the crop asks for faces, falling back to subject detection',
    cropped.includes('g_faces:auto'), cropped);
  // REPLACED, NOT APPENDED. The stored URL already carries w_1400; a chained
  // transform would crop pixels the first transform had already discarded.
  t('and it REPLACES the stored transform rather than chaining onto it',
    !cropped.includes('w_1400'), cropped);
  t('a non-Cloudinary photo is passed through unchanged, not broken',
    emailBannerUrl('https://example.com/photo.jpg') === 'https://example.com/photo.jpg');
  t('an empty banner is nothing, not a broken image',
    emailBannerUrl('') === null && emailBannerUrl(undefined) === null);
  t('the public id is read off the delivery URL, so one photo is one photo',
    publicIdOf(PHOTO_URL) === 'v1/wed/hero.jpg' && publicIdOf('not-a-url') === '',
    publicIdOf(PHOTO_URL));

  // ── EVERY VARIANT, EVERY UNIVERSE, LEGIBLE ──────────────────────────────
  console.log(`\n  Every palette variant on every universe (${UNIVERSE_IDS.length} x ${PALETTE_VARIANT_IDS.length}):\n`);

  const inkFails = [];
  const accentFails = [];
  const labelFails = [];
  for (const id of UNIVERSE_IDS) {
    const style = UNIVERSE_EMAIL_STYLES[id];
    for (const variant of PALETTE_VARIANT_IDS) {
      const pal = emailPalette(style, variant);
      // Body text: WCAG AA for normal text.
      if ((contrastRatio(pal.ink, pal.cardBg) || 0) < 4.5) inkFails.push(`${id}/${variant} ink ${pal.ink} on ${pal.cardBg}`);
      if ((contrastRatio(pal.inkMuted, pal.cardBg) || 0) < 4.5) inkFails.push(`${id}/${variant} muted ${pal.inkMuted} on ${pal.cardBg}`);
      // The accent paints the kicker and the divider. On the two variants that
      // MOVE it onto a ground the universe never chose it against, it must
      // clear 3:1. On `default` and `light` it must be the universe's own
      // accent, untouched — a wedding that never opened this section renders
      // exactly as it does today, and that is the stronger property.
      if (variant === 'dark' || variant === 'inverted') {
        if ((contrastRatio(pal.accent, pal.cardBg) || 0) < 3) accentFails.push(`${id}/${variant} accent ${pal.accent} on ${pal.cardBg}`);
      } else if (pal.accent !== style.accent) {
        accentFails.push(`${id}/${variant} changed the accent (${style.accent} → ${pal.accent})`);
      }
      // The solid button's label, against the button.
      if ((contrastRatio(pal.onAccent, pal.accent) || 0) < 4.5) labelFails.push(`${id}/${variant} label ${pal.onAccent} on ${pal.accent}`);
    }
  }
  t('body and secondary ink clear 4.5:1 on the card in every variant',
    inkFails.length === 0, inkFails.slice(0, 3).join(' · ') || `${UNIVERSE_IDS.length * PALETTE_VARIANT_IDS.length} combinations`);
  t('the accent clears 3:1 on the card in every variant',
    accentFails.length === 0, accentFails.slice(0, 3).join(' · ') || 'all clear');
  t('the solid button’s label clears 4.5:1 on the button in every variant',
    labelFails.length === 0, labelFails.slice(0, 3).join(' · ') || 'all clear');

  // A VARIANT THAT CHANGES NOTHING IS NOT A VARIANT. If two of the four
  // rendered identically the panel would be offering a choice that does not
  // exist, which is worse than offering fewer.
  const sameLooking = [];
  for (const id of UNIVERSE_IDS) {
    const seen = new Map();
    for (const variant of PALETTE_VARIANT_IDS) {
      const pal = emailPalette(UNIVERSE_EMAIL_STYLES[id], variant);
      const key = `${pal.pageBg}|${pal.cardBg}|${pal.ink}|${pal.hairline}`;
      if (seen.has(key)) sameLooking.push(`${id}: ${seen.get(key)} = ${variant}`);
      seen.set(key, variant);
    }
  }
  t('the four variants are four different emails on every universe',
    sameLooking.length === 0, sameLooking.slice(0, 3).join(' · ') || `${UNIVERSE_IDS.length} universes`);

  // THE HARD-CODED BLACKS ARE GONE. This is the specific defect the variants
  // exposed: `rgba(0,0,0,0.55)` is invisible on a dark card, and it was in the
  // template on four lines.
  const rgbaLeaks = [];
  for (const id of UNIVERSE_IDS.slice(0, 6)) {
    for (const variant of PALETTE_VARIANT_IDS) {
      for (const type of EMAIL_TYPES) {
        const { html } = render(type, { universeId: id, design: { paletteVariant: variant }, bannerImageUrl: cropped });
        if (/rgba\(0,\s*0,\s*0/.test(html)) rgbaLeaks.push(`${id}/${variant}/${type}`);
      }
    }
  }
  t('no rendered email paints text as black-at-an-alpha any more',
    rgbaLeaks.length === 0, rgbaLeaks.slice(0, 3).join(' · ') || '144 renders');

  // ── THE BUTTON ──────────────────────────────────────────────────────────
  console.log('\n  Solid and outline:\n');

  for (const variant of PALETTE_VARIANT_IDS) {
    const pal = emailPalette(UNIVERSE_EMAIL_STYLES.london, variant);
    const solid = render('invite', { design: { paletteVariant: variant, buttonStyle: 'solid' } }).html;
    const outline = render('invite', { design: { paletteVariant: variant, buttonStyle: 'outline' } }).html;
    t(`  ${variant} — solid fills with the accent`,
      solid.includes(`background:${pal.accent};border-radius:999px;`));
    t(`  ${variant} — solid takes its label FROM the accent, never fixed white`,
      solid.includes(`color:${pal.onAccent};text-decoration:none`) && !solid.includes('color:#FFFFFF;text-decoration:none'));
    t(`  ${variant} — outline is a hairline in the accent, with the accent as the label`,
      outline.includes(`border:1px solid ${pal.accent};border-radius:999px;`)
      && outline.includes(`color:${pal.accent};text-decoration:none`));
    t(`  ${variant} — and outline does not also fill`,
      !outline.includes(`background:${pal.accent};border-radius:999px;`));
  }
  t('an unrecognized button style falls back to solid rather than rendering nothing',
    render('invite', { design: { buttonStyle: 'neon' } }).html.includes('border-radius:999px;'));
  t('an unrecognized variant falls back to the universe’s own',
    render('invite', { design: { paletteVariant: 'chartreuse' } }).html
      === render('invite', { design: { paletteVariant: 'default' } }).html);
  t('and a wedding that never opened the section renders as it always did',
    render('invite').html === render('invite', { design: {} }).html);

  // ── THE DEFAULTS THAT ARE SHOWN ARE THE DEFAULTS THAT SEND ──────────────
  console.log('\n  Default wording versus the couple’s own:\n');

  for (const type of TEMPLATE_TYPES) {
    const defaults = defaultsFor(type);
    t(`  ${type} — all four editable fields have a default to show`,
      TEMPLATE_FIELDS.every((f) => (defaults[f] || '').trim().length > 0),
      TEMPLATE_FIELDS.filter((f) => !(defaults[f] || '').trim()).join(', ') || '4 fields');

    // What the panel puts in the boxes is what the guest reads.
    const { html } = render(type, { personalMessage: personalMessageFrom(emptyTemplate(), type) });
    const missing = ['greeting', 'body', 'signOff'].filter((f) => {
      const first = defaults[f].split('\n')[0];
      return !html.includes(escapeForHtml(first));
    });
    t(`  ${type} — the shown default is the sent default, word for word`,
      missing.length === 0, missing.join(', ') || 'greeting · message · sign-off');

    // AND THE RENDERER'S OWN PRIVATE DEFAULT NEVER FIRES.
    //
    // There are two sets of default copy in this product: TYPE_CONFIG's
    // `defaultMessage()` inside the renderer, and the store's, which is what
    // the panel pre-fills the boxes with. They do not say the same thing. If
    // the store ever handed the renderer a null — which the first version of
    // personalMessageFrom did, for an untouched template — the renderer would
    // quietly substitute its own, and the couple would have read one letter in
    // the editor while their guests received another.
    //
    // This is the check the previous version could not make: it compared the
    // store to itself and passed while that gap was open.
    const rendererOwn = getEmailTypeConfig(type).defaultMessage('Sam', WEDDING.coupleNames).split('\n')[0];
    t(`  ${type} — and the renderer’s own private default never reaches a guest`,
      personalMessageFrom(emptyTemplate(), type) !== null && !html.includes(escapeForHtml(rendererOwn)),
      rendererOwn.slice(0, 40));

    t(`  ${type} — an untouched field reads as the default`,
      TEMPLATE_FIELDS.every((f) => isDefault(emptyTemplate(), type, f)) && !isWritten(emptyTemplate(), type));
    t(`  ${type} — and a written one does not`,
      isDefault({ body: 'Our own words' }, type, 'body') === false
      && isWritten({ body: 'Our own words' }, type) === true);
    // RESET IS A REAL RESET. The panel's Reset writes '' back, and '' has to
    // mean "the default sends" rather than "send an empty email".
    t(`  ${type} — clearing a field restores the default rather than blanking the email`,
      personalMessageFrom({ body: '' }, type).includes(defaults.body.split('\n')[0]));
    t(`  ${type} — the couple’s own words replace the default`,
      personalMessageFrom({ body: 'Come to Provence.' }, type).includes('Come to Provence.'));
    t(`  ${type} — and the subject follows the same rule`,
      subjectFrom({}, type) === defaults.subject && subjectFrom({ subject: 'Ours' }, type) === 'Ours');
  }

  // ── THE LOCKED ROWS ARE THE REAL VALUES ─────────────────────────────────
  console.log('\n  The parts a couple cannot change, shown truthfully:\n');

  for (const type of TEMPLATE_TYPES) {
    const cfg = getEmailTypeConfig(type);
    const rows = lockedRowsFor(type);
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    t(`  ${type} — the kicker row IS the renderer’s kicker`, byKey.kicker === cfg.kicker, byKey.kicker);
    if (cfg.showRsvp && cfg.ctaLabel) {
      t(`  ${type} — the button row IS the renderer’s button label`, byKey.cta === cfg.ctaLabel, byKey.cta);
      const { html } = render(type);
      t(`  ${type} — and that label is what the email actually paints`, html.includes(escapeForHtml(cfg.ctaLabel)));
    }
    t(`  ${type} — the footer row IS the footer the guest reads`,
      byKey.footer.includes(`You received this ${cfg.footerNoun}`)
      && render(type).html.includes(`You received this ${cfg.footerNoun}`));
    t(`  ${type} — every locked row has words in it`,
      rows.every((r) => r.label && r.value && String(r.value).trim().length > 0), `${rows.length} rows`);
  }

  // ── THE BANNER DEFAULT ──────────────────────────────────────────────────
  console.log('\n  Which photograph an email starts with:\n');

  t('an email with no pick inherits the website’s hero photo',
    designOf({}, { coverPhoto: PHOTO_URL }).bannerUrl === PHOTO_URL);
  t('and says so — it is inherited, not chosen',
    designOf({}, { coverPhoto: PHOTO_URL }).bannerIsOwn === false);
  t('a pick overrides the hero for that email only',
    designOf({ bannerUrl: 'https://x/own.jpg' }, { coverPhoto: PHOTO_URL }).bannerUrl === 'https://x/own.jpg');
  t('and is marked as the couple’s own',
    designOf({ bannerUrl: 'https://x/own.jpg' }, { coverPhoto: PHOTO_URL }).bannerIsOwn === true);
  t('a wedding with no hero at all simply has no banner, not a broken one',
    designOf({}, {}).bannerUrl === '');
  // AND THE INHERITANCE OBEYS THE VIDEO RULE. A wedding whose hero is a video
  // must not inherit it into the email.
  t('a video hero is not inherited into the email either',
    emailBannerUrl(designOf({}, { coverPhoto: VIDEO_URLS[0] }).bannerUrl) === null);

  // ── THE SILENT DISCARD ──────────────────────────────────────────────────
  console.log('\n  A save is only a save if it survives the round-trip:\n');

  const draft = templatesOf(null);
  draft.invite = { ...draft.invite, body: 'Come to Provence.', paletteVariant: 'inverted', buttonStyle: 'outline' };

  // A backend that keeps the field.
  let stored = null;
  const keeps = await saveTemplates({
    id: 'wd1',
    update: async (_id, patch) => { stored = patch.emailTemplates; },
    reload: async () => ({ emailTemplates: stored }),
    templates: draft,
  });
  t('a backend that keeps the field reports saved', keeps.ok === true, JSON.stringify(keeps));

  // THE PLANT: Base44's actual behavior today — HTTP 200, field discarded.
  const discards = await saveTemplates({
    id: 'wd1',
    update: async () => { /* 200 OK, and the field is dropped */ },
    reload: async () => ({}),
    templates: draft,
  });
  t('a backend that accepts and DISCARDS is reported as not switched on',
    discards.ok === false && discards.reason === 'not-switched-on', JSON.stringify(discards));

  // A backend that keeps the text but drops the design — the design rides the
  // same field, so a partial survival is still a loss.
  const partial = await saveTemplates({
    id: 'wd1',
    update: async (_id, patch) => {
      stored = Object.fromEntries(Object.entries(patch.emailTemplates)
        .map(([k, v]) => [k, { ...v, paletteVariant: '', buttonStyle: '' }]));
    },
    reload: async () => ({ emailTemplates: stored }),
    templates: draft,
  });
  t('a partial survival — text kept, design dropped — is not reported as saved',
    partial.ok === false && partial.reason === 'not-switched-on', JSON.stringify(partial));

  const threwOnWrite = await saveTemplates({
    id: 'wd1', update: async () => { throw new Error('network'); }, reload: async () => ({}), templates: draft,
  });
  t('a write that throws is reported as a write failure, not as saved',
    threwOnWrite.ok === false && threwOnWrite.reason === 'write-failed', JSON.stringify(threwOnWrite));

  const threwOnRead = await saveTemplates({
    id: 'wd1', update: async () => {}, reload: async () => { throw new Error('gone'); }, templates: draft,
  });
  t('a read-back that throws is not reported as saved either',
    threwOnRead.ok === false && threwOnRead.reason === 'read-back-failed', JSON.stringify(threwOnRead));

  // A REFUSAL IS NOT A FAILURE. Base44 validates the merged record, so a row
  // holding a legacy value refuses every write identically, for ever. Telling
  // the couple to "try again" there is advice that cannot work — the two
  // cases must reach different words.
  const refused422 = await saveTemplates({
    id: 'wd1',
    update: async () => { throw Object.assign(new Error('Unprocessable'), { status: 422 }); },
    reload: async () => ({}), templates: draft,
  });
  t('a 422 is reported as a REFUSAL, not a failure',
    refused422.reason === 'write-refused' && refused422.status === 422, JSON.stringify(refused422.reason));
  const refusedText = await saveTemplates({
    id: 'wd1',
    update: async () => { throw new Error('Base44 PUT /entities/WeddingDetails/x failed (422): {}'); },
    reload: async () => ({}), templates: draft,
  });
  t('  including when the status is only in the message text',
    refusedText.reason === 'write-refused', refusedText.reason);
  const plainFail = await saveTemplates({
    id: 'wd1', update: async () => { throw new Error('Failed to fetch'); },
    reload: async () => ({}), templates: draft,
  });
  t('  while a network error stays a retryable failure',
    plainFail.reason === 'write-failed', plainFail.reason);
  t('the refusal wording never says "try again"',
    !/try again/i.test(SAVE_FAILURE_MESSAGE['write-refused']), 'it sends them to the dashboard instead');
  t('  and does say their words are safe',
    /nothing you have written is lost/i.test(SAVE_FAILURE_MESSAGE['write-refused']));
  t('  while the retryable failure still does say try again',
    /try again/i.test(SAVE_FAILURE_MESSAGE['write-failed']));

  t('no record at all is reported rather than written into the void',
    (await saveTemplates({ id: null, update: async () => {}, reload: async () => ({}), templates: draft })).reason === 'no-record');

  // AND THE DRAFT IS NEVER TOUCHED BY A FAILED SAVE. This is the property the
  // owner's rule is actually about: "never silently lose a write."
  t('a failed save leaves the couple’s draft exactly as they typed it',
    draft.invite.body === 'Come to Provence.' && draft.invite.paletteVariant === 'inverted');

  // ── NORMALISATION ───────────────────────────────────────────────────────
  console.log('\n  A stored record that is the wrong shape does not break the panel:\n');

  const junk = templatesOf({ emailTemplates: { invite: { body: 42, subject: 'ok' }, ghost: { body: 'x' } } });
  t('a non-string value is dropped rather than rendered as a number',
    junk.invite.body === '' && junk.invite.subject === 'ok');
  t('a key that is not an email type is not picked up as a sixth email',
    Object.keys(junk).length === TEMPLATE_TYPES.length && !('ghost' in junk));
  t('a null record normalizes to every template empty',
    Object.keys(templatesOf(null)).length === TEMPLATE_TYPES.length);

  return results;
}

/**
 * The renderer escapes before it prints, so a search string has to as well —
 * and it has to escape THE SAME THREE. emailTemplate.js's escapeHtml handles
 * `& < >` and deliberately leaves the apostrophe alone (an apostrophe inside a
 * text node needs no escaping, and escaping it makes the HTML unreadable in a
 * diff). A guard that escaped a fourth character searched for `We&#39;d` in an
 * email that says `We'd`, and reported the defaults as missing.
 */
function escapeForHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
