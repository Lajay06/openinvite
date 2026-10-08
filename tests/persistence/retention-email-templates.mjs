/**
 * tests/persistence/retention-email-templates.mjs
 *
 * THE TWO RETENTION EMAILS SAY WHAT THE OWNER WROTE.
 *
 * Item 1 of goals/2026-10-08-retention-emails.md, whose guard line reads:
 * "Templates: both render with the copy above, plain-text part present, no
 * banned characters."
 *
 * ── WHY THE CHARACTER CHECKS LIVE HERE AND NOT IN THE SHARED GUARD ─────────
 *
 * npm run test:calm-copy scans added lines in src/pages, src/components,
 * src/lib and markdown. api/_lib is in NONE of those, so the em-dash and
 * en-dash rules are unenforced on this file by the instrument that normally
 * enforces them. Same for the emoji ratchet. That is exactly why the goal
 * asks for "no banned characters" in the guard: without these assertions the
 * copy in this file is the only product copy in the goal with no character
 * guard at all.
 *
 * ── RENDERED, NOT GREPPED ──────────────────────────────────────────────────
 *
 * Every assertion runs against the OUTPUT of the real render functions, not
 * against the source file. A guard that greps the module would pass on a
 * string that is present but never placed in the HTML, which is the failure
 * mode that matters for an email: the copy exists, and the couple does not see
 * it. The copy objects are exported so the expected strings come from one
 * place, but each one is then checked for its presence in both parts.
 */

import { pass, fail } from './_shared.mjs';
import {
  setupNudgeEmail,
  guestsNudgeEmail,
  renderBothRetentionEmails,
  retentionGreeting,
  writtenDate,
  listUnsubscribeHeader,
  RETENTION_PHOTOS,
  RETENTION_COPY,
  RETENTION_REPLY_TO,
  RETENTION_BG,
  RETENTION_FOOTER_TEXT,
  RETENTION_HAIRLINE,
} from '../../api/_lib/retentionEmails.js';

/**
 * The shape each photo really is, as Cloudinary delivers it at w_1200.
 *
 *   setup   1200x682  about 16:9
 *   guests  1200x900  4:3
 *
 * Written here rather than derived from the photo entry, because the point of
 * the check is that the entry's own width and height agree with the asset. A
 * ratio computed from the thing being tested would agree with itself.
 */
const EXPECTED_RATIO = { setup: 1200 / 682, guests: 1200 / 900 };

const STOP_URL = 'https://openinvite.com.au/stop-emails/t0ken';
const OPTS = { name: 'Ada Lovelace', createdDate: '2026-05-18T03:00:00Z', stopUrl: STOP_URL };

/** An em dash, an en dash, and anything that renders in the emoji font. */
const EM = '—';
const EN = '–';
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F0FF}\u{FE0F}\u{2726}]/u;

export async function runRetentionEmailTemplates() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── BOTH RENDER ─────────────────────────────────────────────────────────
  const both = renderBothRetentionEmails(OPTS);
  ok('both emails render', both.length === 2, both.map((e) => e.key).join(', '));
  ok('  and they are the two the goal names',
     both[0].key === 'setup' && both[1].key === 'guests', 'setup, guests');
  ok('  and the single-email exports agree with the pair',
     setupNudgeEmail(OPTS).html === both[0].html && guestsNudgeEmail(OPTS).html === both[1].html,
     'one renderer behind both doors');

  for (const email of both) {
    const spec = RETENTION_COPY[email.key];
    const where = `${email.key}:`;

    // ── THE COPY, VERBATIM, IN BOTH PARTS ───────────────────────────────
    ok(`${where} the subject is the owner's`, email.subject === spec.subject, JSON.stringify(email.subject));
    ok(`${where}   the preheader is in the html`, email.html.includes(spec.preheader), 'present');
    ok(`${where}   the heading is in both parts`,
       email.html.includes(spec.heading) && email.text.includes(spec.heading), 'html and text');

    const missingHtml = spec.paragraphs.filter((p) => !email.html.includes(p));
    const missingText = spec.paragraphs.filter((p) => !email.text.includes(p));
    ok(`${where}   every body paragraph is in the html`, missingHtml.length === 0,
       missingHtml.length ? `missing: ${missingHtml[0].slice(0, 40)}` : `${spec.paragraphs.length} paragraphs`);
    ok(`${where}   and in the plain-text part`, missingText.length === 0,
       missingText.length ? `missing: ${missingText[0].slice(0, 40)}` : `${spec.paragraphs.length} paragraphs`);

    ok(`${where}   the button says what the owner wrote`,
       email.html.includes(spec.button.label) && email.text.includes(spec.button.label), spec.button.label);
    ok(`${where}   and points where the goal says`,
       email.html.includes(spec.button.path.replace(/&/g, '&amp;')) || email.html.includes(spec.button.path),
       spec.button.path);
    ok(`${where}   the line after the button is in both parts`,
       email.html.includes(spec.afterButton) && email.text.includes(spec.afterButton), 'html and text');

    // ── THE FOOTER, AND THE WAY OUT ─────────────────────────────────────
    ok(`${where}   the footer gives the reason this arrived`,
       email.html.includes('You are getting this because you created an Openinvite account on 18 May 2026')
       && email.html.includes(spec.footerReason), 'date and reason');
    ok(`${where}   the stop link is in the html and the text`,
       email.html.includes(STOP_URL) && email.text.includes(STOP_URL), 'both parts');
    ok(`${where}   "Stop these emails" is the link text`,
       /<a href="[^"]*stop-emails[^"]*"[^>]*>Stop these emails<\/a>/.test(email.html), 'anchored on the words');
    ok(`${where}   and the footer names the sender and the address`,
       email.html.includes('Openinvite, Australia.') && email.html.includes('hello@openinvite.com.au'), 'both');

    // ── A PLAIN-TEXT PART THAT IS ACTUALLY A PART ───────────────────────
    //
    // Not just non-empty: it must carry no markup, or it is the HTML again
    // under a different key.
    ok(`${where}   the plain-text part is plain`,
       typeof email.text === 'string' && email.text.length > 400 && !/<[a-z/][^>]*>/i.test(email.text),
       `${email.text.length} chars, no tags`);

    // ── NO BANNED CHARACTERS, IN EITHER PART ────────────────────────────
    ok(`${where}   no em dash`, !email.html.includes(EM) && !email.text.includes(EM), 'none');
    ok(`${where}   no en dash`, !email.html.includes(EN) && !email.text.includes(EN), 'none');
    ok(`${where}   no emoji`, !EMOJI.test(email.html) && !EMOJI.test(email.text), 'none');
    // Exclamation marks are barred in product chrome, and an email is chrome.
    ok(`${where}   no exclamation marks`, !email.text.includes('!'), 'none');
    // US English, the one word in this copy where it shows.
    ok(`${where}   US spelling`, !/colours|honour|organis|realis/i.test(email.text), 'colors');

    // ── THE HEADER AND THE SPEC'S OWN LOOK ──────────────────────────────
    ok(`${where}   List-Unsubscribe points at the stop link`,
       email.headers['List-Unsubscribe'] === `<${STOP_URL}>`, email.headers['List-Unsubscribe']);
    ok(`${where}   600px card on the warm ground`,
       email.html.includes('width:600px') && email.html.includes(RETENTION_BG), `600px, ${RETENTION_BG}`);
    ok(`${where}   brand red button at 6px`,
       /background:#E03553[^"]*border-radius:6px/.test(email.html), '#E03553, 6px');
    ok(`${where}   footer is 12px in the muted warm grey`,
       new RegExp(`font-size:12px[^"]*color:${RETENTION_FOOTER_TEXT}`).test(email.html), `12px ${RETENTION_FOOTER_TEXT}`);
    ok(`${where}   the font stack is the brand's with both fallbacks`,
       /Plus Jakarta Sans', Helvetica, Arial, sans-serif/.test(email.html), 'Plus Jakarta Sans, Helvetica, Arial');
    // MATCHED ON THE HAIRLINE'S OWN COLOR, not on "height:1px".
    //
    // The first version counted /height:1px/ and reported three for one
    // hairline: `line-height:1px` in the preheader and again on the hairline
    // div itself both contain it as a substring. A count of a substring is not
    // a count of the thing. The rule is one divider above the footer, and the
    // divider is the only element with that background.
    ok(`${where}   one hairline above the footer`,
       (email.html.match(new RegExp(`height:1px;background:${RETENTION_HAIRLINE}`, 'g')) || []).length === 1,
       `exactly one, ${RETENTION_HAIRLINE}`);

    // ── THE PHOTO, FULL WIDTH, WITH THE ALT TEXT THE GOAL SPECIFIES ─────
    const photo = RETENTION_PHOTOS[email.key];
    ok(`${where}   carries its own photo`, email.html.includes(photo.url), photo.url.split('/').pop().slice(0, 28));
    ok(`${where}   delivered as an image, not a video frame`,
       photo.url.includes('/image/upload/') && !photo.url.includes('so_0'), 'image/upload');
    ok(`${where}   with alt text that is one short line`,
       email.html.includes(photo.alt) && photo.alt.length > 10 && photo.alt.length <= 60 && !photo.alt.includes('.'),
       `${photo.alt.length} chars`);
    ok(`${where}   rendered full width`,
       new RegExp(`src="${photo.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*width:100%`).test(email.html), '100%');
    // ── THE RESERVED BOX ────────────────────────────────────────────────
    //
    // width and height exist so a client that has blocked the image, or has
    // not loaded it yet, reserves the right space. A height that does not
    // match the photo's real ratio reserves the WRONG space, which is worse
    // than none: the email jumps when the image arrives. So the attribute is
    // checked against the ratio rather than against a number written here.
    ok(`${where}   declares its own width and height`,
       new RegExp(`width="${photo.width}" height="${photo.height}"`).test(email.html),
       `${photo.width}x${photo.height}`);
    const declaredRatio = photo.width / photo.height;
    ok(`${where}   and that height matches the photo's shape`,
       Math.abs(declaredRatio - EXPECTED_RATIO[email.key]) < 0.02,
       `${declaredRatio.toFixed(3)} vs ${EXPECTED_RATIO[email.key].toFixed(3)}`);
    ok(`${where}   with a background so a blocked image is a visible box`,
       new RegExp(`src="${photo.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*background:#`).test(email.html),
       'placeholder tone');
    // AND NOT THE OTHER ONE. Two emails, two photos; a copy-paste that leaves
    // both pointing at the same image passes every check above.
    const otherPhoto = RETENTION_PHOTOS[email.key === 'setup' ? 'guests' : 'setup'];
    ok(`${where}   and not the other email's photo`, !email.html.includes(otherPhoto.url), 'distinct');
  }

  // ── THE TWO ARE NOT THE SAME EMAIL ──────────────────────────────────────
  ok('the two emails differ in subject, heading and body',
     both[0].subject !== both[1].subject && both[0].html !== both[1].html && both[0].text !== both[1].text,
     'distinct');

  // ── THE GREETING, INCLUDING THE BUG THAT MADE emailGreeting.js EXIST ────
  ok('a name is greeted by first name', retentionGreeting('Ada Lovelace') === 'Hi Ada,', 'Hi Ada,');
  ok('  a missing name gets the goal\'s fallback', retentionGreeting(null) === 'Hi there,', 'Hi there,');
  ok('  and an email address is NEVER printed as a name',
     retentionGreeting('la.jay06@gmail.com') === 'Hi there,', 'the owner\'s rule holds');
  const nameless = setupNudgeEmail({ ...OPTS, name: 'la.jay06@gmail.com' });
  ok('  not even once it is rendered',
     !nameless.html.includes('la.jay06@gmail.com') && nameless.html.includes('Hi there,'),
     'no address in the greeting');

  // ── A STOP LINK IS NOT OPTIONAL ─────────────────────────────────────────
  //
  // An email with no way out is the one thing these must never be, so the
  // renderer refuses rather than rendering a footer with an empty href.
  let threw = false;
  try { setupNudgeEmail({ name: 'Ada', createdDate: OPTS.createdDate }); } catch { threw = true; }
  ok('rendering without a stop link refuses', threw, 'throws rather than mailing a dead link');

  // ── THE DATE, WRITTEN, AND ABSENT WITHOUT A FICTION ─────────────────────
  ok('the account date is written, not numeric', writtenDate('2026-05-18T03:00:00Z') === '18 May 2026', '18 May 2026');
  ok('  and a missing date drops the clause rather than inventing one',
     writtenDate(null) === '' && writtenDate('not a date') === '', 'empty');
  const undated = setupNudgeEmail({ name: 'Ada', stopUrl: STOP_URL });
  ok('  so an undated account still gets a true sentence',
     undated.html.includes('you created an Openinvite account and have not finished setting up')
     && !undated.html.includes('account on  '), 'no dangling "on"');

  // ── ONE-CLICK IS NOT CLAIMED ────────────────────────────────────────────
  //
  // RFC 8058 One-Click requires the URL to accept a POST and act on it. The
  // stop page is a GET a human clicks, so advertising One-Click would be a
  // promise the endpoint does not keep.
  ok('List-Unsubscribe does not claim One-Click',
     listUnsubscribeHeader(STOP_URL) === `<${STOP_URL}>`
     && !JSON.stringify(both[0].headers).includes('One-Click'), 'header is the URL alone');

  ok('Reply-To is the support address', RETENTION_REPLY_TO === 'hello@openinvite.com.au', RETENTION_REPLY_TO);

  // ── THE SIGN-OFF ────────────────────────────────────────────────────────
  //
  // The owner changed the name from "La" to "Jay" on 2026-10-08. Pinned
  // because it is the one piece of copy in these emails that is a person
  // rather than a product, and a later sweep over "La" elsewhere must not
  // quietly take it back.
  for (const email of both) {
    ok(`${email.key}: signs off as Jay`,
       email.html.includes('(hello, that is me, Jay)') && email.text.includes('(hello, that is me, Jay)'),
       'both parts');
    ok(`${email.key}:   and not as La`, !email.html.includes('that is me, La'), 'the old name is gone');
  }

  // ── THE PHOTOS ACTUALLY RESOLVE ─────────────────────────────────────────
  //
  // Asked for by name in the instruction, and it is the one thing no amount
  // of reading the source can establish: a template can reference a public id
  // that was renamed, deleted or never existed, and every other check in this
  // file passes while the email arrives with two broken boxes.
  //
  // THIS MAKES THE GUARD NEED A NETWORK, which is a real cost: it can fail for
  // a reason that is nothing to do with this repo. It is not made tolerant,
  // because a check that passes when it cannot reach the thing it is checking
  // is not a check. If Cloudinary being unreachable starts failing CI, the
  // answer is to move this one assertion to the live lane, not to soften it.
  for (const key of ['setup', 'guests']) {
    const { url } = RETENTION_PHOTOS[key];
    let status = 0;
    let type = '';
    try {
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(15000) });
      status = res.status;
      type = res.headers.get('content-type') || '';
    } catch (err) {
      type = `fetch failed: ${err.message}`;
    }
    ok(`the ${key} photo resolves`, status === 200, `HTTP ${status}`);
    ok(`  and is served as an image`, /^image\//.test(type), type);
  }

  // ── THIS FILE SENDS NOTHING ─────────────────────────────────────────────
  //
  // The templates must stay renderable with no network and no env var, which
  // is what lets this guard and item 4's dry mode run at all.
  const src = (await import('node:fs')).readFileSync(
    new URL('../../api/_lib/retentionEmails.js', import.meta.url), 'utf8');
  ok('the template module calls no mailer',
     !/from 'resend'|new Resend|emails\.send/.test(src), 'no Resend import, no send');
  ok('  and reads no User record',
     !/entities\/User|getBase44User|BASE44_ADMIN_KEY/.test(src), 'rendering only');

  return results;
}
