/**
 * api/_lib/retentionEmails.js
 *
 * THE TWO RETENTION EMAILS, AND NOTHING THAT SENDS THEM.
 *
 * Item 1 of goals/2026-10-08-retention-emails.md. Two emails to a COUPLE who
 * stalled: one for an account that never finished setup, one for an account
 * with an empty guest list. Each exports an HTML part and a plain-text part.
 *
 * ── WHY THIS IS ITS OWN FILE AND NOT src/lib/emailBrand.js ─────────────────
 *
 * The goal's territory says so, and the reason holds up: these two have their
 * own visual spec (a #f6f4f1 ground, a full-width photo, a #8a8580 footer over
 * a hairline) which the existing brand shell does not have. Putting that spec
 * into emailShell would change the day-1, day-3, day-7, gift and purchase
 * emails, none of which this goal is about. So the shell is local and the
 * TOKENS are shared, which is the half worth sharing: the font stack, the
 * brand red and the support address are the same facts here as there.
 *
 * ── WHAT IS SHARED, DELIBERATELY ───────────────────────────────────────────
 *
 * firstNameOrNull from src/lib/emailGreeting.js. That module exists because the
 * welcome email once greeted the owner with his own email address, and its rule
 * is: never print an address where a name goes. These emails take a name from
 * the same Base44 `full_name` field, so they inherit the same hazard and must
 * inherit the same guard. See the note on the greeting below for the one place
 * this goal's ruling and that module's own preference differ.
 *
 * ── NO SENDING HERE ────────────────────────────────────────────────────────
 *
 * This file renders. It does not read a User, decide whether an email is due,
 * record that one was sent, or call Resend. That is item 2, in the cron, and
 * keeping it out means this file can be rendered by a guard and by item 4's dry
 * mode without a single network call or a single env var.
 */

import { EMAIL_FONT, EMAIL_ACCENT, EMAIL_BLACK, EMAIL_SUPPORT_ADDRESS, escapeHtml } from '../../src/lib/emailBrand.js';
import { firstNameOrNull } from '../../src/lib/emailGreeting.js';

// ── The spec's own colors ────────────────────────────────────────────────────
//
// Not from emailBrand: that file's EMAIL_BG is #F7F7F7 and its footer text is
// an rgba of black. The goal names #f6f4f1 and #8a8580, which are warmer, and
// these two emails are the only things that use them. Local constants rather
// than new shared exports, so nothing else drifts onto them by accident.
export const RETENTION_BG = '#f6f4f1';
export const RETENTION_CARD = '#ffffff';
export const RETENTION_FOOTER_TEXT = '#8a8580';
export const RETENTION_HAIRLINE = '#e8e4df';
export const RETENTION_BODY_TEXT = 'rgba(10,10,10,0.72)';

/**
 * THE LOGO IS THE MARK, NOT A WORDMARK, and that is a reversal of the goal's
 * word rather than of its intent.
 *
 * The goal asks for a "logo wordmark top left". There is no wordmark asset:
 * src/lib/emailBrand.js ships one logo file, the "O" mark, and its comment
 * records that the header renders that image ALONE, "not a separate plain-text
 * wordmark next to it" — a decision made after an earlier version had one. So
 * this uses the same mark every other brand email uses, top left, at the same
 * 28px. Drawing a text wordmark here instead would reverse that decision for
 * two emails and leave six disagreeing with them.
 */
const LOGO_URL = 'https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto/v1785659181/email-assets/openinvite-icon-mark.png';

/** The two photos, named by the goal, with the alt text it specifies. */
/**
 * The two photos, replaced by the owner on 2026-10-08.
 *
 * image/upload, not video/upload: the first pair were video assets read at
 * frame zero with so_0. These are stills, so the delivery type changes with
 * them and so_0 goes.
 *
 * ── THE HEIGHTS ARE NOT THE SAME, AND THAT IS WHY THEY ARE PER PHOTO ───────
 *
 * The instruction asked for width="600" height="338" on both, which is 16:9.
 * Only one of these is 16:9. At w_1200 Cloudinary delivers:
 *
 *   setup   1200x682   about 16:9   ->  600x341
 *   guests  1200x900   4:3          ->  600x450
 *
 * A height attribute exists so a client that has not loaded the image yet, or
 * has blocked it, reserves the right box. Putting 338 on the 4:3 photo would
 * reserve a box 112px too short and the email would jump when it loaded, which
 * is the thing the attribute is there to prevent. So each photo carries its
 * own true height. If a uniform 16:9 band is wanted instead, the fix is on the
 * URL rather than here: add c_fill,ar_16:9 and both become 600x338.
 *
 * ── THE ALT TEXT DESCRIBES THESE PHOTOS ────────────────────────────────────
 *
 * The instruction proposed "A couple on the beach at golden hour" and "A
 * couple walking the shoreline", and said to adjust to what the photos
 * actually show. Neither is a beach: one is a street, one is a desert. No
 * place is named in either line, because the location is a guess from the
 * image and a guess does not belong in alt text.
 */
export const RETENTION_PHOTOS = {
  setup: {
    url: 'https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto,w_1200/hf_20260906_081156_b6b89167-b256-4926-9576-cf2a6f72acb4_birugr',
    alt: 'A couple laughing on a sunlit street of painted houses',
    width: 600,
    height: 341,
  },
  guests: {
    url: 'https://res.cloudinary.com/dsr84xknv/image/upload/f_auto,q_auto,w_1200/DTS_BANDITS_PALI_MENDEZ_Photos_ID14261_wcy4l1',
    alt: 'A couple laughing in a red rock desert',
    width: 600,
    height: 450,
  },
};

const APP_URL = process.env.VITE_APP_URL || 'https://openinvite.com.au';

/**
 * A WRITTEN DATE, because every email in this product uses one.
 *
 * The footer says "you created an Openinvite account on {date}". User.dateFormat
 * is explicitly a DASHBOARD preference and its own schema description says
 * emails keep their written dates, so this does not read it. 'en-GB' gives
 * "18 May 2026" with the day first, which is the form the rest of the product's
 * mail uses; the locale is pinned rather than left to the server, because a
 * cron's locale is not a thing anyone chose.
 */
export function writtenDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/**
 * "Hi Ada," or "Hi there,".
 *
 * ── ONE DISAGREEMENT, RESOLVED THE GOAL'S WAY AND WORTH NAMING ─────────────
 *
 * src/lib/emailGreeting.js prefers a greeting with NO name over a placeholder:
 * its header argues that "Welcome, there." is "a small fiction about knowing
 * who you are talking to". By that preference a nameless couple would get
 * "Hi," here.
 *
 * This goal rules otherwise, explicitly: 'If first name is missing, "Hi
 * there,"'. That ruling is newer and it is specific to these two emails, so it
 * wins. What is NOT given up is the part of that module that matters most: the
 * name still comes from firstNameOrNull, so an account whose full_name holds
 * an email address gets "Hi there," and never "Hi la.jay06@gmail.com,".
 */
export function retentionGreeting(fullName) {
  const first = firstNameOrNull(fullName);
  return first ? `Hi ${first},` : 'Hi there,';
}

/**
 * The List-Unsubscribe value for a stop URL.
 *
 * One-Click is deliberately NOT advertised: RFC 8058 requires that the URL
 * accept a POST and act on it, and the stop page in item 3 is a GET a human
 * clicks. Claiming One-Click while answering only GET is how a provider starts
 * treating the header as broken.
 */
export function listUnsubscribeHeader(stopUrl) {
  return `<${stopUrl}>`;
}

/** Preheader text: shown in the inbox list, never in the open email. */
function preheaderHtml(text) {
  return `<div style="display:none;font-size:1px;color:${RETENTION_BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(text)}</div>`;
}

function buttonRow(label, href) {
  return `
          <tr>
            <td style="padding:8px 40px 32px;">
              <a href="${href}" style="display:inline-block;background:${EMAIL_ACCENT};color:#ffffff;font-family:${EMAIL_FONT};font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:6px;">${escapeHtml(label)}</a>
            </td>
          </tr>`;
}

function paragraphRows(paragraphs) {
  return paragraphs.map((p, i) => `
          <tr>
            <td style="padding:${i === 0 ? '0' : '0'} 40px 18px;">
              <p style="margin:0;font-family:${EMAIL_FONT};font-size:15px;line-height:1.7;color:${RETENTION_BODY_TEXT};">${escapeHtml(p)}</p>
            </td>
          </tr>`).join('');
}

/**
 * The shell. 600px, centred, white card on the warm ground, mark top left, one
 * full-width photo, then the rows the caller built, then the footer over a
 * hairline.
 *
 * `role="presentation"` on every layout table, because a screen reader
 * announcing "table with 1 column" before each paragraph of a four-paragraph
 * email is the accessibility cost of table layout, and it is avoidable.
 */
function shell({ title, preheader, photo, bodyRowsHtml, footerHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${RETENTION_BG};font-family:${EMAIL_FONT};">
  ${preheaderHtml(preheader)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${RETENTION_BG};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:${RETENTION_CARD};">
          <tr>
            <td style="padding:32px 40px 24px;">
              <img src="${LOGO_URL}" width="28" height="28" alt="Openinvite" style="display:block;width:28px;height:28px;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:0;">
              <!-- THE BACKGROUND IS WHAT A BLOCKED IMAGE SHOWS. Outlook and
                   Gmail both start with remote images off, and without a
                   background the reserved box is a white rectangle on a white
                   card: invisible, so the email looks like it begins with a
                   gap. A tone off the card's own palette makes the box read as
                   a deliberate placeholder rather than a rendering fault. -->
              <img src="${photo.url}" width="${photo.width}" height="${photo.height}" alt="${escapeHtml(photo.alt)}" style="display:block;width:100%;max-width:${photo.width}px;height:auto;border:0;background:${RETENTION_HAIRLINE};" />
            </td>
          </tr>
${bodyRowsHtml}
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:${RETENTION_HAIRLINE};line-height:1px;font-size:0;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 36px;">
              <p style="margin:0;font-family:${EMAIL_FONT};font-size:12px;line-height:1.7;color:${RETENTION_FOOTER_TEXT};">
                ${footerHtml}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * THE COPY IS THE OWNER'S, VERBATIM, and lives in one object per email so a
 * guard can assert the strings without parsing HTML. Nothing here is
 * paraphrased, reflowed or softened; the only substitutions are the greeting
 * and the account date.
 */
const SETUP = {
  key: 'setup',
  subject: 'You got as far as your names',
  preheader: 'Which is further than most people get on a Tuesday.',
  heading: 'You got as far as your names.',
  paragraphs: [
    'You started setting up your wedding on Openinvite, typed your names, and then something more interesting came along. Fair enough.',
    'Here is the thing: the part you left is the short part. The date, the place, roughly how many people. Three answers, and the studio builds itself around them: a wedding site in your colors, a guest list that knows who is coming, and Ava, who has read all of it and will answer questions at 11pm so you do not have to.',
    'Nothing is lost. Everything you typed is still there.',
  ],
  button: { label: 'Pick up where you left off', path: `/login?next=${encodeURIComponent('/Onboarding')}` },
  afterButton: 'If something got in the way, a question, a worry, a thing that did not work, reply to this email. A real person reads it (hello, that is me, Jay).',
  footerReason: 'and have not finished setting up',
};

const GUESTS = {
  key: 'guests',
  subject: 'Your guest list is still empty, and that is fine',
  preheader: 'Ten names and the whole studio wakes up.',
  heading: 'Your guest list is still empty, and that is fine.',
  paragraphs: [
    'You made an account, had a look around, and then real life happened. Happens to everyone.',
    'Ten names is all it takes to make the rest of the studio come alive. Add the people you could not get married without, and watch the seating chart, the RSVP page and the invitations wake up around them.',
    'Nothing is lost. Your wedding is exactly where you left it.',
  ],
  button: { label: 'Add your first ten guests', path: '/Guests' },
  afterButton: 'Stuck on who makes the list? Ava is good at that conversation. Stuck on something else? Reply here and a real person answers (hello, that is me, Jay).',
  footerReason: 'and your guest list is empty',
};

/**
 * Render one of the two.
 *
 * @param {object} spec        SETUP or GUESTS
 * @param {object} opts
 * @param {string} [opts.name]        the User's full_name, which may be an address
 * @param {string} [opts.createdDate] the account's created_date, for the footer
 * @param {string} opts.stopUrl       the signed stop link (item 3 mints it)
 * @returns {{ key: string, subject: string, html: string, text: string, headers: object }}
 */
function render(spec, { name, createdDate, stopUrl }) {
  if (!stopUrl) throw new Error('Refusing to render a retention email with no stop link.');

  const hello = retentionGreeting(name);
  const dateStr = writtenDate(createdDate);
  const photo = RETENTION_PHOTOS[spec.key];
  const href = `${APP_URL}${spec.button.path}`;

  // The footer sentence, assembled from the owner's wording. "Stop these
  // emails." is the link; everything around it is plain text.
  const footerSentence = dateStr
    ? `You are getting this because you created an Openinvite account on ${escapeHtml(dateStr)} ${spec.footerReason}.`
    // NO DATE, NO FICTION. A missing created_date drops the clause rather than
    // printing "on " with nothing after it or inventing today.
    : `You are getting this because you created an Openinvite account ${spec.footerReason}.`;
  const footerHtml = `${footerSentence} Not planning a wedding anymore, or just want quiet? <a href="${stopUrl}" style="color:${RETENTION_FOOTER_TEXT};text-decoration:underline;">Stop these emails</a>. Openinvite, Australia. <a href="mailto:${EMAIL_SUPPORT_ADDRESS}" style="color:${RETENTION_FOOTER_TEXT};text-decoration:underline;">${EMAIL_SUPPORT_ADDRESS}</a>`;

  const bodyRowsHtml = `
          <tr>
            <td style="padding:32px 40px 18px;">
              <h1 style="margin:0;font-family:${EMAIL_FONT};font-size:26px;font-weight:700;line-height:1.25;letter-spacing:-0.02em;color:${EMAIL_BLACK};">${escapeHtml(spec.heading)}</h1>
            </td>
          </tr>
${paragraphRows([hello, ...spec.paragraphs])}
${buttonRow(spec.button.label, href)}
${paragraphRows([spec.afterButton])}`;

  const html = shell({
    title: spec.subject,
    preheader: spec.preheader,
    photo,
    bodyRowsHtml,
    footerHtml,
  });

  // THE PLAIN-TEXT PART IS NOT AN AFTERTHOUGHT. Same copy, same order, the
  // button as a labelled URL, and the footer with the stop link spelled out,
  // because a text-only reader must be able to stop these too.
  const text = [
    spec.heading,
    '',
    hello,
    '',
    ...spec.paragraphs.flatMap((p) => [p, '']),
    `${spec.button.label}: ${href}`,
    '',
    spec.afterButton,
    '',
    '---',
    dateStr
      ? `You are getting this because you created an Openinvite account on ${dateStr} ${spec.footerReason}.`
      : `You are getting this because you created an Openinvite account ${spec.footerReason}.`,
    `Not planning a wedding anymore, or just want quiet? Stop these emails: ${stopUrl}`,
    `Openinvite, Australia. ${EMAIL_SUPPORT_ADDRESS}`,
  ].join('\n');

  return {
    key: spec.key,
    subject: spec.subject,
    html,
    text,
    headers: { 'List-Unsubscribe': listUnsubscribeHeader(stopUrl) },
  };
}

/** Trigger 1: the account that never finished setup. */
export function setupNudgeEmail(opts) {
  return render(SETUP, opts);
}

/** Trigger 2: the account with an empty guest list. */
export function guestsNudgeEmail(opts) {
  return render(GUESTS, opts);
}

/**
 * Both, for item 4's dry mode and for the guard, so neither has to know the
 * two function names or keep a list of them in step with this file.
 */
export function renderBothRetentionEmails(opts) {
  return [setupNudgeEmail(opts), guestsNudgeEmail(opts)];
}

/** The copy itself, exported so a guard can assert it without parsing HTML. */
export const RETENTION_COPY = { setup: SETUP, guests: GUESTS };

/** Reply-To for both, per the goal. The From address is the cron's, not this file's. */
export const RETENTION_REPLY_TO = EMAIL_SUPPORT_ADDRESS;
