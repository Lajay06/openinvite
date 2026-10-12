/**
 * src/lib/giftingV2.js
 *
 * GIFTING V2: THE FLAG, THE PHOTOS, THE HEADLINES AND THE COPY, IN ONE PLACE.
 * goals/2026-10-11-gifting-v2.md. Everything here is behind GIFTING_V2, off
 * in production until item 9 passes; the v1 gift flow at /gifting keeps
 * working until the flag flips.
 *
 * Copy is the owner's, verbatim. US English, no em dashes. Nothing a Pro
 * giver or couple reads names the Guest Suite, RSVP, song requests or the
 * registry, and nothing anyone reads says the retired name for the guest
 * experience.
 */

/**
 * THE FLAG. On when the build sets VITE_GIFTING_V2=1, in local development,
 * and on Vercel preview deploys (*.vercel.app), so the owner can review the
 * pages on a preview without production seeing them. Off on
 * openinvite.com.au until the owner's word at item 9.
 */
export function isGiftingV2On() {
  if (import.meta.env?.VITE_GIFTING_V2 === '1') return true;
  if (import.meta.env?.DEV) return true;
  if (typeof window !== 'undefined' && /\.vercel\.app$/.test(window.location.hostname)) return true;
  return false;
}

/** The one key the giver's draft lives under until payment. Nothing reaches PlanGift before Stripe confirms. */
export const GIFT_DRAFT_KEY = 'oi_gift_v2_draft';

const CLOUD = 'https://res.cloudinary.com/dsr84xknv/image/upload';

/**
 * THE PICKER'S PHOTOS, the one list in the one file the goal names. The owner
 * may add three more ids later; add them here. Delivered f_auto, q_auto,
 * w_1200, ar_6:5, c_fill, g_auto.
 */
export const GIFT_PHOTOS = [
  { id: 'pin_edinburgh_couple', label: 'Chips on the hill' },
  { id: 'hf_20260905_024501_a377409a-d5cf-4466-9eab-4fbf74a2d127_eitv21', label: 'Heart on the window' },
  { id: 'hf_20260904_090059_18da7a9c-eefa-4e7b-8779-86cdcc3b15e8_q418v1', label: 'The laugh' },
  { id: 'DTS_CURATIVE_Chris_Abatzis_Photos_ID7678_dlsgrm', label: 'Held' },
  { id: 'DTS_BANDITS_PALI_MENDEZ_Photos_ID14261_wcy4l1', label: 'Red rocks' },
  { id: 'DTS_SNOWBOUND_Daniel_Farò_Photos_ID12449_f9hidr', label: 'Snow angels' },
  { id: 'DTS_AURA_Fanette_Guilloud_Photos_ID12987_rupmuq', label: 'Aura' },
  { id: 'DTS_Caldo_Daniel_Farò_Photos_ID3945_cn6h24', label: 'Shallow water' },
  { id: 'DTS_In_Focus_Daniel_Farò_Photos_ID4994_mgw7cw', label: 'Red bloom' },
  { id: 'DTS_UNWRAPPED_Franco_Dupuy_Photos_ID13773_dfzkub', label: 'The boxes' },
  { id: 'DTS_Tradition_Chris_Abatzis_Photos_ID9150_yiunlp', label: 'The meadow' },
  { id: 'DTS_NU_NUPTIALS_Shauna_Summers_Photos_ID10282_hxzktx', label: 'Just married' },
  { id: 'DTS_LUNAR_Daniel_Farò_Photos_ID11287_f3krcq', label: 'Hands at dusk' },
  { id: 'DTS_Caldo_Daniel_Farò_Photos_ID3960_av5mnb', label: 'Coupes in the sun' },
  { id: 'DTS_NU_NUPTIALS_Shauna_Summers_Photos_ID10294_qw316r', label: 'The toast' },
  { id: 'DTS_Springtime_Rob_Christain_Crosby_Photos_ID3094_kjiq9v', label: 'Running' },
  { id: 'DTS_Philia_Daniel_Farò_Photos_ID4659_pnnku3', label: 'The bottle' },
];
export const DEFAULT_PHOTO_ID = 'DTS_UNWRAPPED_Franco_Dupuy_Photos_ID13773_dfzkub';

/** A picker photo at 6:5, as the goal delivers them. Public ids carry non-ASCII, so they are URL-encoded. */
export function giftPhotoUrl(id, { width = 1200, ratio = '6:5' } = {}) {
  return `${CLOUD}/f_auto,q_auto,w_${width},ar_${ratio},c_fill,g_auto/${encodeURIComponent(id)}`;
}
export const photoLabel = (id) => GIFT_PHOTOS.find((p) => p.id === id)?.label || '';

/**
 * The step 1 and done-screen photos, onboarding's own, reused as is, no new
 * asset. DONE is onboarding's completion image. STEP_ONE is onboarding's
 * welcome image, the owner's choice of 2026-10-11: onboarding has no plan step
 * (the plan choice is ChoosePlan.jsx, outside the shell, with no photo).
 */
export const ONBOARDING_IMAGES = {
  STEP_ONE: `${CLOUD}/f_auto,q_auto/DTS_BANDITS_PALI_MENDEZ_Photos_ID14263_su2ltz.jpg`,
  // Page 2, who it is for: onboarding's names-step image (owner's review of #994).
  WHO: `${CLOUD}/f_auto,q_auto/DTS_SUITE_TALK_PALI_MENDEZ_Photos_ID14160_vgcgxf.jpg`,
  DONE: `${CLOUD}/f_auto,q_auto/DTS_Community_Agust%C3%ADn_Far%C3%ADas_Photos_ID6374_iumjqj.jpg`,
};

/** The five first lines. {names} is how the couple are addressed. */
export const HEADLINES = [
  { key: 'nice_start', text: 'Well. This is a nice way to start.' },
  { key: 'for_you', text: '{names}, this one is for you.' },
  { key: 'enjoy_this', text: 'Someone thinks you should enjoy this part.' },
  { key: 'spreadsheet', text: 'Congratulations. The spreadsheet can go.' },
  { key: 'sorted', text: 'The planning is sorted. Go be engaged.' },
];
export const DEFAULT_HEADLINE = 'nice_start';
export function headlineText(key, names) {
  const h = HEADLINES.find((x) => x.key === key) || HEADLINES[0];
  return h.text.replace('{names}', names || 'You two');
}

export const NOTE_STYLES = [
  { key: 'plain', label: 'Plain' },
  { key: 'serif', label: 'Serif' },
  { key: 'hand', label: 'Handwriting' },
];
export const NOTE_MAX = 600;

export const PLAN_NAMES = { pro: 'Pro', ultra: 'Ultra' };

/** The giver's seven pages, verbatim. */
export const COPY = {
  plan: {
    heading: 'Give them the whole thing.',
    sub: 'One payment. Theirs for 24 months. Nothing for them to pay, ever.',
    // Owner's review of #994, 2026-10-11: product facts, not marketing. "Ava AI"
    // on first mention, "Ava" after.
    pro: 'The whole planner: guest list, budget, seating, vendors, schedule, to-dos.',
    proLines: ['Ava AI included.'],
    ultra: 'Everything in Pro, plus the Guest Suite:',
    ultraLines: ['Digital invitations', 'Real-time RSVPs', 'A guest experience for everyone invited (their website)'],
  },
  // The placeholder is the label, as onboarding's names step; no help lines.
  who: {
    heading: 'Who is the lucky couple?',
    namesLabel: 'How should we address them',
    emailLabel: 'Their email',
    giverLabel: 'Your name, as they know it',
  },
  // Page 3, one accordion (owner's review of #994).
  theirs: {
    heading: 'Make it theirs.',
    note: 'Your note',
    headline: 'The first line they read',
    photo: 'The picture at the top',
    when: 'When it lands',
  },
  when: {
    now: { title: 'Now', line: 'Within a minute of your payment.' },
    date: { title: 'On a date', line: 'Pick a morning. We send it at 9 am where they are.' },
    // Owner ruling 2026-10-11: the browser's zone is the giver's, so the line says so.
    tzLine: 'at 9 am where they are ({timezone}, from your browser)',
    fine: 'You pay on Stripe. Your receipt comes from Stripe; everything else comes from us. Refund any time until they open it.',
  },
  done: {
    heading: 'That was generous of you, {giver}.',
    body: 'It is on its way to {email}. We have sent you a copy, with their claim link in case you want to hand it over in person.',
    boxTitle: 'What happens next',
    box: '{names} open the email, tap Open your gift, sign in with Google, Apple or email, and they are inside with {Plan} already on. Nothing to type, nothing to pay.',
    second: 'If it has not arrived in an hour, forward your copy to them; the link works either way.',
    change: 'Change the address or the note',
    another: 'Give another',
  },
};

/** The couple's email, verbatim. */
export const REVEAL = {
  subject: '{giver} has given you Openinvite {Plan}',
  preheader: 'Paid for. One tap and it is yours.',
  body: {
    ultra: '{giver} has given you Openinvite Ultra: every guest, every reply, every table, the budget, the Guest Suite, all of it. Paid for. Nothing for you to pay, now or later.',
    pro: '{giver} has given you Openinvite Pro: every guest, every table, the budget, the schedule, the to-dos, all of it. Paid for. Nothing for you to pay, now or later.',
  },
  button: 'Open your gift',
  under: 'One tap. We will ask for your names and a date, and then it is yours.',
  descriptor: {
    ultra: 'Openinvite runs the whole wedding from one place: the guest list, the budget, the seating, the vendors, the schedule, the to-dos, and Ava AI to tell you what today actually needs. Ultra adds the Guest Suite, the guest experience: everyone replies, picks their meal and finds the details from one link, with no accounts and no app. Yours for 24 months, and it never asks you for anything again.',
    pro: 'Openinvite runs the whole wedding from one place: the guest list, the budget, the seating, the vendors, the schedule, the to-dos, and Ava AI to tell you what today actually needs. On your phone and your computer, always the same wedding. Yours for 24 months, and it never asks you for anything again.',
  },
  footer: 'Sent to you because {giver} typed in this address. Wrong person? Reply to this email and we will put it right.',
};

/** The giver's email (the confirmation), verbatim from the goal. */
export const CONFIRM = {
  subject: 'Your gift to {names} is on its way',
  preheader: 'Here is your copy, and their link.',
  heading: 'Done. That was generous of you.',
  body: 'You have given {names} Openinvite {Plan}. We have sent it to {email}, with your note exactly as you wrote it.',
  // When send_at is in the future the body says this instead.
  scheduled: 'You have given {names} Openinvite {Plan}. We will send it on {date} at 9 am where they are.',
  linkBox: 'Their claim link, in case you want to hand it over yourself',
  forward: 'If it has not arrived in an hour, forward this email to them; the link works either way.',
  receipt: 'Your receipt from Stripe arrives separately.',
  button: 'Change the address or the note',
  footer: 'You are getting this because you bought a gift on openinvite.com.au. Questions, reply here.',
};

/** The couple's claim page, /gift/claim/:token (item 3), verbatim from the goal. */
export const CLAIM = {
  button: 'Open your gift',
  under: 'We will ask for your names and a date.',
  used: 'This link has already been used. If that is a surprise, reply to the email it came in and we will look.',
};

/**
 * The giver's edit page, /gift/edit/:token (item 3). The goal names the page
 * ("Change the address or the note") and the link that opens it, not its
 * copy: the heading and labels reuse lines the flow already has, and its
 * three own lines are the owner's (ruled 2026-10-12).
 */
export const EDIT = {
  heading: 'Change the address or the note',
  emailLabel: 'Their email',
  noteLabel: 'Your note',
  save: 'Save changes',
  claimed: 'They have opened it, so it can no longer be changed.',
  gone: 'This link no longer works. If that is a surprise, reply to your confirmation email and we will sort it out.',
};

/**
 * Fill {giver}, {names}, {email}, {Plan} in a copy line. `plan: null` leaves
 * {Plan} in place, for a caller that sets the plan as its badge.
 */
export function fill(text, { giver = '', names = '', email = '', plan = 'ultra' } = {}) {
  const out = String(text)
    .replace(/\{giver\}/g, giver)
    .replace(/\{names\}/g, names)
    .replace(/\{email\}/g, email);
  return plan === null ? out : out.replace(/\{Plan\}/g, PLAN_NAMES[plan] || 'Ultra');
}

/**
 * THE TIMEZONE IN PLAIN WORDS (owner ruling 2026-10-11): the city where the
 * IANA name has one ("Australia/Sydney" reads "Sydney"), the raw name
 * otherwise ("UTC", "Etc/GMT+10").
 */
const CITY_REGIONS = /^(Africa|America|Antarctica|Asia|Atlantic|Australia|Europe|Indian|Pacific)\//;
export function timezoneInWords(tz) {
  if (!tz) return '';
  if (!CITY_REGIONS.test(tz)) return tz;
  return tz.split('/').pop().replace(/_/g, ' ');
}
export const browserTimezone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; }
};
