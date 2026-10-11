/**
 * tests/persistence/guest-note-notification.mjs
 *
 * ONE EMAIL TO THE COUPLE FOR EACH NOTE, AND NOT ONE MORE.
 *
 * Item 4 of goals/2026-10-10-bounces-and-notes.md. The email is rendered for
 * real and the send decision is driven for real, through the deps seam
 * api/guest-note-submit.js exports; nothing here reaches the network, Base44
 * or Resend.
 *
 * WHY THE ENDPOINT IS IMPORTED STATICALLY, AT THE TOP. api/_lib/notify.js
 * constructs its Resend client at module scope, so importing that endpoint
 * without a key throws. _registry.mjs hoists a placeholder RESEND_API_KEY
 * around the IMPORT phase only and restores it before any guard runs, so a
 * dynamic import inside the run function would fail where this one cannot.
 * The sibling guard for item 2 could use a dynamic import because
 * api/send-invites.js builds its client lazily; this file cannot, and the
 * difference is worth stating rather than rediscovering.
 *
 * WHAT THE DECISIONS ARE. The note is already stored and the bell has already
 * rung by the time any of this runs, so every branch asserted below is a
 * branch that must NOT turn a stored note into an error the guest sees: a
 * test wedding, a missing owner, an unreadable account, an account with no
 * address, and a send that fails are five different reasons and none of them
 * throws.
 *
 * COPY IS VERBATIM, from the item. The subject and heading carry a name, so
 * the no-name fallbacks are asserted separately and are marked in the source
 * as fallbacks rather than as the item's words.
 */

import { pass, fail, stripComments } from './_shared.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  guestNoteEmail,
  noteSubject,
  noteHeading,
  noteExcerpt,
  NOTE_EXCERPT_LIMIT,
  NOTE_PREHEADER,
  NOTE_BUTTON_LABEL,
  NOTE_FOOTER_LINE,
  NOTE_REPLY_TO,
} from '../../api/_lib/guestNoteNotification.js';
import { sendNoteNotification } from '../../api/guest-note-submit.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const code = (p) => readFileSync(join(ROOT, p), 'utf8');

const OWNER_ID = 'user_fixture_owner';
const wedding = (over = {}) => ({ id: 'w_1', created_by_id: OWNER_ID, slug: 'ada-and-bo', ...over });

/** Captures the send without performing one. */
function capture({ user = { id: OWNER_ID, email: 'couple@example.com' }, fail: failSend = false } = {}) {
  const calls = [];
  const asked = [];
  return {
    calls,
    asked,
    deps: {
      getUser: async (id) => { asked.push(id); return user; },
      send: async (payload) => {
        calls.push(payload);
        if (failSend) throw new Error('resend is down');
        return { data: { id: 'e_1' } };
      },
    },
  };
}

/** Runs one delivery with console captured, so a log line can be asserted. */
async function run(args, deps) {
  const lines = [];
  const real = { log: console.log, warn: console.warn, error: console.error };
  console.log = (...a) => lines.push(a.join(' '));
  console.warn = (...a) => lines.push(a.join(' '));
  console.error = (...a) => lines.push(a.join(' '));
  // A THROW IS A RED, NOT A CRASH. The whole point of these branches is that
  // a stored note never becomes an error, so a version that throws must fail
  // an assertion rather than take the guard down with it. Caught by plants
  // that made the function throw and crashed this file instead.
  try {
    const out = await sendNoteNotification(args, deps);
    return { out: out || {}, lines, threw: null };
  } catch (err) {
    return { out: { sent: false, reason: `THREW: ${err.message}` }, lines, threw: err };
  } finally {
    Object.assign(console, real);
  }
}

export async function runGuestNoteNotification() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  const endpoint = code('api/guest-note-submit.js');
  const module = code('api/_lib/guestNoteNotification.js');

  // ── 1. The copy, verbatim ─────────────────────────────────────────────
  ok('the subject is the item’s sentence', noteSubject('Ada') === 'Ada left you a note', noteSubject('Ada'));
  ok('the heading is the item’s sentence', noteHeading('Ada') === 'A note from Ada', noteHeading('Ada'));
  ok('the preheader is the item’s sentence',
     NOTE_PREHEADER === 'It is on your Messages page, with a reply button.', NOTE_PREHEADER);
  ok('the button is the item’s label', NOTE_BUTTON_LABEL === 'Read and reply', NOTE_BUTTON_LABEL);
  ok('the footer line is the item’s sentence',
     NOTE_FOOTER_LINE === 'You get one email for each note. Reply from Messages, not from this email.',
     NOTE_FOOTER_LINE);
  ok('Reply-To is the address the item names',
     NOTE_REPLY_TO === 'hello@openinvite.com.au', NOTE_REPLY_TO);

  // guest_name is a first name or an empty string, so both have a fallback.
  ok('a note with no name still has a subject',
     noteSubject('') === 'A guest left you a note' && noteSubject(undefined) === 'A guest left you a note',
     noteSubject(''));
  ok('  and a heading', noteHeading('   ') === 'A note from a guest', noteHeading('   '));

  // ── 2. The excerpt ────────────────────────────────────────────────────
  ok('the cap is the item’s 240', NOTE_EXCERPT_LIMIT === 240, String(NOTE_EXCERPT_LIMIT));
  const exact = 'x'.repeat(240);
  ok('a note of exactly 240 characters is not cut',
     noteExcerpt(exact) === exact && !noteExcerpt(exact).endsWith('...'), `${noteExcerpt(exact).length} chars`);
  const over = 'y'.repeat(241);
  ok('  one character more is cut, and says so',
     noteExcerpt(over) === `${'y'.repeat(240)}...`, `${noteExcerpt(over).length} chars, ends ${noteExcerpt(over).slice(-4)}`);
  ok('  a short note is untouched', noteExcerpt('Thank you.') === 'Thank you.', noteExcerpt('Thank you.'));
  ok('  whitespace is collapsed before the cap is measured',
     noteExcerpt('a\n\n\n   b') === 'a b', JSON.stringify(noteExcerpt('a\n\n\n   b')));
  ok('  an empty note renders nothing rather than throwing',
     noteExcerpt(undefined) === '' && noteExcerpt(null) === '', 'empty');

  // ── 3. The rendered email ─────────────────────────────────────────────
  const email = guestNoteEmail({ guestName: 'Ada', message: 'Can we bring our daughter?' });
  ok('the rendered subject is the subject',
     email.subject === 'Ada left you a note', email.subject);
  ok('the heading is in the body', email.html.includes('A note from Ada'), 'heading');
  ok('the note’s own words are in the body',
     email.html.includes('Can we bring our daughter?'), 'excerpt');
  ok('the preheader is present and hidden',
     email.html.includes(NOTE_PREHEADER) && /display:none[^>]*>[^<]*It is on your Messages page/.test(email.html),
     'hidden preheader');
  ok('the button points at the Messages page',
     /<a href="https:\/\/openinvite\.com\.au\/Messages"[^>]*>Read and reply<\/a>/.test(email.html),
     'href and label');
  ok('the footer line is in the body', email.html.includes(NOTE_FOOTER_LINE), 'footer');
  ok('replyTo travels with the rendered email', email.replyTo === 'hello@openinvite.com.au', email.replyTo);

  // THE ITEM SAYS NO PHOTO. The retention pair open with a full-width image;
  // this one must not, and "no photo" is checked by counting images rather
  // than by looking for the one photo URL the retention emails happen to use.
  const imgs = email.html.match(/<img\b/g) || [];
  ok('no photo: the only image is the logo mark',
     imgs.length === 1 && /<img src="[^"]*openinvite-icon-mark\.png"/.test(email.html),
     `${imgs.length} image(s)`);

  // The retention emails' layout, which is what the item asks for.
  ok('the retention table layout, down to the card width',
     /role="presentation" width="600"/.test(email.html)
       && /width:600px;max-width:600px/.test(email.html),
     '600px card');
  ok('  every layout table is presentational, for a screen reader',
     (email.html.match(/<table\b/g) || []).length === (email.html.match(/role="presentation"/g) || []).length,
     'all tables marked');
  ok('  on the retention ground, with its hairline and footer tone',
     email.html.includes('#f6f4f1') && email.html.includes('#e8e4df') && email.html.includes('#8a8580'),
     'palette');
  ok('  and the brand red on the button',
     email.html.includes('#E03553'), 'accent');

  const nasty = guestNoteEmail({ guestName: 'Bo & Co', message: 'Is <b>black tie</b> ok? "asking for a friend"' });
  ok('a note is escaped in the HTML part',
     nasty.html.includes('&lt;b&gt;black tie&lt;/b&gt;') && !nasty.html.includes('<b>black tie</b>'),
     'escaped');
  ok('  and the name with it', nasty.subject === 'Bo & Co left you a note'
     && nasty.html.includes('Bo &amp; Co'), 'escaped in body, raw in subject');
  ok('the text part carries the same copy, with the link spelled out',
     nasty.text.includes('Is <b>black tie</b> ok?')
       && nasty.text.includes(`${NOTE_BUTTON_LABEL}: https://openinvite.com.au/Messages`)
       && nasty.text.includes(NOTE_FOOTER_LINE),
     'text part');

  // ── 4. The send decision ──────────────────────────────────────────────
  const happy = capture();
  const sent = await run({ wedding: wedding(), guestName: 'Ada', message: 'Hello' }, happy.deps);
  ok('a note sends one email', sent.out.sent === true && happy.calls.length === 1,
     `${happy.calls.length} send(s)`);
  ok('  to the account address, read from the owner’s own User row',
     happy.calls[0]?.to === 'couple@example.com' && happy.asked.join(',') === OWNER_ID,
     `${happy.calls[0]?.to} / asked ${happy.asked.join(',')}`);
  ok('  from the brand address, with the item’s Reply-To',
     happy.calls[0]?.from === 'Openinvite <hello@openinvite.com.au>'
       && happy.calls[0]?.replyTo === 'hello@openinvite.com.au',
     `${happy.calls[0]?.from} / ${happy.calls[0]?.replyTo}`);
  ok('  carrying both parts, not just HTML',
     typeof happy.calls[0]?.html === 'string' && happy.calls[0].html.length > 0
       && typeof happy.calls[0]?.text === 'string' && happy.calls[0].text.length > 0,
     `html ${typeof happy.calls[0]?.html}, text ${typeof happy.calls[0]?.text}`);
  ok('  and the guest’s name in the subject',
     happy.calls[0]?.subject === 'Ada left you a note', happy.calls[0]?.subject);

  const long = capture();
  await run({ wedding: wedding(), guestName: 'Ada', message: 'z'.repeat(400) }, long.deps);
  // Null-safe on purpose: a plant that drops the text part must make this
  // red, not throw inside the guard.
  const longText = typeof long.calls[0]?.text === 'string' ? long.calls[0].text : '';
  ok('a long note reaches the inbox cut to 240, not whole',
     longText.includes(`${'z'.repeat(240)}...`) && !longText.includes('z'.repeat(241)),
     longText ? 'cut at the cap' : '(no text part)');

  const test = capture();
  const testRun = await run({ wedding: wedding({ is_test: true }), guestName: 'Ada', message: 'Hello' }, test.deps);
  ok('a test wedding sends nothing',
     testRun.out.sent === false && testRun.out.reason === 'is_test' && test.calls.length === 0,
     `${testRun.out.reason}, ${test.calls.length} send(s)`);
  ok('  and does not even read the account',
     test.asked.length === 0, `${test.asked.length} read(s)`);

  const noOwner = capture();
  const noOwnerRun = await run({ wedding: { id: 'w_2' }, guestName: 'Ada', message: 'Hello' }, noOwner.deps);
  ok('a wedding with no owner id sends nothing, and says so',
     noOwnerRun.out.reason === 'no_owner' && noOwner.calls.length === 0
       && noOwnerRun.lines.some((l) => /FAILURE: the wedding has no owner id/.test(l)),
     noOwnerRun.out.reason);

  const noAddress = capture({ user: { id: OWNER_ID, email: '' } });
  const noAddressRun = await run({ wedding: wedding(), guestName: 'Ada', message: 'Hello' }, noAddress.deps);
  ok('an account with no address sends nothing rather than sending to nobody',
     noAddressRun.out.reason === 'no_address' && noAddress.calls.length === 0,
     noAddressRun.out.reason);

  const unreadable = {
    calls: [],
    deps: { getUser: async () => { throw new Error('base44 is down'); }, send: async () => { unreadable.calls.push(1); } },
  };
  const unreadableRun = await run({ wedding: wedding(), guestName: 'Ada', message: 'Hello' }, unreadable.deps);
  ok('an unreadable account is a logged reason, not a thrown error',
     unreadableRun.threw === null && unreadableRun.out.sent === false
       && unreadableRun.out.reason === 'user_read_failed' && unreadable.calls.length === 0,
     unreadableRun.out.reason);

  const broken = capture({ fail: true });
  const brokenRun = await run({ wedding: wedding(), guestName: 'Ada', message: 'Hello' }, broken.deps);
  ok('a failed send is a logged reason too, because the note is already stored',
     brokenRun.threw === null && brokenRun.out.sent === false && brokenRun.out.reason === 'send_failed'
       && brokenRun.lines.some((l) => /FAILURE: the note email did not send/.test(l)),
     brokenRun.out.reason);

  // ── 5. Wired into the submit path, and nothing else ───────────────────
  const live = stripComments(endpoint, { trailing: true });
  ok('the endpoint sends the note email after the row is written',
     /adminCreate\('GuestMessage'[\s\S]{0,1200}await sendNoteNotification\(/.test(live),
     'after the create');
  ok('  passing the plaintext it already holds, not a blob read back',
     /await sendNoteNotification\(\{ wedding, guestName: firstName, message \}\)/.test(live),
     'the submission’s own values');
  ok('  and awaited, because a Vercel function can freeze at the response',
     /await sendNoteNotification/.test(live), 'awaited');
  ok('the bell notification is still sent as well',
     /await notify\(\{/.test(live), 'notify() intact');

  ok('the Resend client is built at call time, never at module scope',
     /\(payload\) => new Resend\(process\.env\.RESEND_API_KEY\)\.emails\.send\(payload\)/.test(live)
       && !/^const resend = new Resend/m.test(live),
     'lazy');
  ok('the account is read by the one path the User entity accepts',
     /getBase44User\(id, process\.env\.BASE44_ADMIN_KEY\)/.test(live), 'getBase44User');

  // Comments stripped: this module's header explains why it is NOT
  // src/lib/emailTemplate.js, and a guard that reads that sentence as an
  // import would go red on the explanation and green on the mistake.
  ok('the email module does not reach into the guest invitation templates',
     !/emailTemplate/.test(stripComments(module, { trailing: true })), 'own file');
  ok('  and adds no dependency',
     !/^import .*from '(?!\.\.\/\.\.\/src\/lib\/emailBrand\.js)[a-z@]/m.test(module),
     'brand tokens only');

  // ── 6. Copy rules ─────────────────────────────────────────────────────
  const copy = [noteSubject('Ada'), noteHeading('Ada'), NOTE_PREHEADER, NOTE_BUTTON_LABEL, NOTE_FOOTER_LINE,
    noteSubject(''), noteHeading('')];
  ok('no em or en dash in any of the strings',
     copy.every((s) => !/[—–]/.test(s)), copy.join(' / '));
  ok('  no exclamation mark', copy.every((s) => !/!/.test(s)), copy.join(' / '));
  // A NAMED LIST, NOT A SUFFIX PATTERN. The first version of this read
  // /\w+(our|ise|isation)\b/ and flagged "your", which is the whole reason
  // scripts/test-us-english-spelling.mjs carries a word list rather than a
  // rule. api/ and tests/ are outside that script's scope, so this is the
  // only guard these particular strings get.
  const BRITISH = /\b(honour|colour|favourite|organise|organisation|recognise|apologise|realise|centre|licence|practise|whilst|cancelled|travelling)\b/i;
  ok('  and US English spelling throughout',
     copy.every((s) => !BRITISH.test(s)), copy.join(' / '));

  return results;
}
