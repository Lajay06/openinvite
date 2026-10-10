/**
 * tests/persistence/guest-stop-emails.mjs
 *
 * A GUEST CAN ASK NOT TO BE EMAILED, AND THE ASK IS HONORED BY THE SERVER.
 *
 * Item 6 of goals/2026-10-09-reply-lifecycle.md.
 *
 * ── THE FOUR THINGS THE OWNER ASKED BE PROVED ────────────────────────────
 *
 *   · a tampered token changes nothing;
 *   · a valid token sets the flag once;
 *   · a send to a list containing an opted-out guest skips them and reports
 *     how many;
 *   · the footer line is present in every guest-facing template.
 *
 * ── AND THE FAILURE THAT WOULD BE WORST ──────────────────────────────────
 *
 * A CLIENT-ONLY SKIP. The couple's screen filters opted-out guests and shows
 * the count, which is the courtesy; api/send-invites.js reads the flag from
 * the database and skips independently, which is the rule. A caller that
 * simply omitted the field, or an older app build that knows nothing about it,
 * would otherwise mail someone who had asked to be left alone. Both halves are
 * pinned, and the server one is pinned on where it reads from.
 *
 * ── THE TOKENS MUST NOT BE INTERCHANGEABLE ───────────────────────────────
 *
 * api/_lib/stopEmailsToken.js signs a USER id and silences a couple's own
 * account mail. This one signs a GUEST id. Same construction and same secret,
 * so a token from one VERIFIES under the other's HMAC: what stops the confusion
 * is that each endpoint looks the decoded id up in a different entity. That is
 * a property of the endpoints, not of the crypto, so it is asserted here
 * rather than assumed.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (p) => stripComments(read(p));

export async function runGuestStopEmails() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── 1. THE TOKEN ────────────────────────────────────────────────────────
  //
  // The secret is set here and the module is imported fresh, because
  // guestStopToken.js reads it AT CALL TIME: that is the property
  // stopEmailsToken.js learned the hard way, and a guard that set the key
  // after a module-scope read would be testing an empty secret.
  process.env.BASE44_ADMIN_KEY = process.env.BASE44_ADMIN_KEY || 'guard-only-not-a-real-key';
  const { signGuestStopToken, verifyGuestStopToken, guestStopEmailsUrl } =
    await import('../../api/_lib/guestStopToken.js');

  const token = signGuestStopToken('guest-abc');
  ok('a signed token verifies back to the guest id', verifyGuestStopToken(token) === 'guest-abc', 'round trip');

  // A TAMPERED TOKEN CHANGES NOTHING, every way it can be tampered with.
  const TAMPERS = [
    [token.slice(0, -1) + 'X', 'one character of the signature'],
    [token.replace('.', '.X'), 'a byte prepended to the signature'],
    [`${Buffer.from('guest-xyz', 'utf8').toString('base64url')}.${token.split('.')[1]}`, 'another id on the same signature'],
    [token.split('.')[0], 'the body with no signature'],
    [`${token}.extra`, 'a third segment'],
    ['', 'an empty token'],
    [null, 'no token at all'],
  ];
  for (const [bad, why] of TAMPERS) {
    const got = verifyGuestStopToken(bad);
    results.push(got === null
      ? pass(`tampered: ${why} is refused`, 'null')
      : fail(`tampered: ${why} is refused`, null, got));
  }
  ok('signing refuses an empty guest id rather than signing one',
     (() => { try { signGuestStopToken(''); return false; } catch { return true; } })(), 'throws');
  ok('the url drops into the path with no encoding',
     guestStopEmailsUrl('guest-abc', 'https://x.test') === `https://x.test/guest-stop-emails/${token}`,
     'one path segment');

  // ── 2. THE TWO SCOPES ARE SEPARATE AT THE ENDPOINT ──────────────────────
  const endpoint = code('api/guest-stop-emails.js');
  const userEndpoint = code('api/stop-emails.js');
  ok('the guest endpoint looks its id up in Guest', /entityUrl\('Guest', guestId\)/.test(endpoint), 'Guest');
  ok('  and writes only email_opt_out and its timestamp',
     /email_opt_out: true, email_opt_out_at:/.test(endpoint), 'two literals');
  ok('  never User.lifecycleEmails', !/lifecycleEmails/.test(endpoint), 'no account field');
  ok('the account endpoint still writes only lifecycleEmails',
     /lifecycleEmails: false/.test(userEndpoint) && !/email_opt_out/.test(userEndpoint), 'untouched');
  ok('neither endpoint ever turns its flag back on',
     !/email_opt_out: false/.test(endpoint) && !/lifecycleEmails: true/.test(userEndpoint), 'one direction only');
  ok('the guest endpoint is POST only, so a link prefetch cannot write',
     /req\.method !== 'POST'/.test(endpoint), 'POST only');
  ok('  and a bad token is a 404 with no detail',
     /status\(404\)\.json\(\{ error: 'Not found' \}\)/.test(endpoint), '404');
  ok('  a failed write is a 502, never a 200',
     /status\(502\)/.test(endpoint) && !/status\(200\)[\s\S]*Could not save/.test(endpoint), '502');
  ok('  and it accepts no field name from the request',
     !/req\.body\.[a-z_]+\s*[,)]/.test(endpoint.replace(/req\.body \? req\.body\.token/, '')), 'token only');

  // ── 3. THE PAGE WRITES ON MOUNT, NOT ON THE LINK ────────────────────────
  const page = code('src/pages/GuestStopEmails.jsx');
  ok('the page posts to the endpoint on mount', /fetch\('\/api\/guest-stop-emails'/.test(page) && /method: 'POST'/.test(page), 'POST on mount');
  ok('  once, even under strict mode', /sent\.current/.test(page), 'guarded');
  ok('  and only says Done after a 200', /if \(!res\.ok\) \{ setState\('failed'\); return; \}/.test(page), 'gated');
  ok('the confirmation is the owner\'s sentence',
     /will not email you about the wedding again\. You can still reply on their website whenever you like\./.test(page),
     'verbatim');
  ok('  and names the couple, with a fallback rather than a gap',
     /coupleNames\.trim\(\) \|\| 'The couple'/.test(page), 'The couple');
  ok('the route is public and registered',
     /\/guest-stop-emails\/:token/.test(code('src/App.jsx'))
       && /startsWith\('\/guest-stop-emails\/'\)/.test(code('src/App.jsx')),
     'route + public path');

  // ── 4. THE FOOTER LINE, IN BOTH HALVES OF EVERY GUEST TEMPLATE ──────────
  //
  // One template renders all six guest-facing types, so "every template" is
  // one footer; what matters is that BOTH the HTML and the plain text carry
  // it. A text-only client that could not opt out would be the half of the
  // audience this fails.
  const tpl = code('src/lib/emailTemplate.js');
  ok('the template takes the stop url rather than building it', /stopEmailsUrl,/.test(tpl), 'passed in');
  ok('  and never signs anything itself, since it runs in the browser too',
     !/createHmac|guestStopEmailsUrl/.test(tpl), 'no signing');
  ok('the HTML footer carries the line',
     /Do not want emails about this wedding\? <a href="\$\{stopEmailsUrl\}"/.test(tpl), 'html');
  ok('the plain-text footer carries it too',
     /Do not want emails about this wedding\? Stop these emails: \$\{stopEmailsUrl\}/.test(tpl), 'text');
  ok('  and both are omitted when no url is given',
     /\$\{stopEmailsUrl \? `/.test(tpl) && /\.\.\.\(stopEmailsUrl \? \[/.test(tpl), 'conditional');

  // Rendered, not just matched: the one check that the conditional works.
  const { renderInvitationEmail } = await import('../../src/lib/emailTemplate.js');
  const base = { universeId: 'london', guestName: 'Ada', coupleNames: 'Alex & Sam', events: [], siteUrl: 'https://x.test', rsvpUrl: 'https://x.test/r' };
  for (const type of ['save_the_date', 'invite', 'reminder', 'update', 'thank_you_attending', 'thank_you_declined']) {
    const out = renderInvitationEmail({ ...base, type, stopEmailsUrl: 'https://x.test/guest-stop-emails/t.s' });
    const html = typeof out === 'string' ? out : (out.html || '');
    const text = typeof out === 'string' ? '' : (out.text || '');
    ok(`${type}: the footer line renders in both halves`,
       /Do not want emails about this wedding\?/.test(html) && /Stop these emails: https:/.test(text),
       'html + text');
  }
  const bare = renderInvitationEmail({ ...base, type: 'invite' });
  ok('with no url, no line is rendered in either half',
     !/Do not want emails/.test(bare.html || '') && !/Do not want emails/.test(bare.text || ''), 'absent');

  // ── 5. THE SEND SKIPS THEM, AND SAYS HOW MANY ───────────────────────────
  const send = code('api/send-invites.js');
  ok('the send path reads the opt-out flag from the database',
     /adminList\('Guest', \{ created_by_id: userId, email_opt_out: true \}\)/.test(send), 'adminList');
  ok('  never from the request body', !/guests\.filter\([^)]*email_opt_out/.test(send), 'not from the caller');
  ok('  and filters the owned list before validity', /const notOptedOut = ownedGuests\.filter\(/.test(send), 'filtered');
  ok('  reporting the count separately from the aggregate',
     /skippedOptedOut,/.test(send) && /skipped: guests\.length - validGuests\.length/.test(send), 'both');
  ok('  with its own sentence when everyone selected had opted out',
     /Every guest you selected has asked not to be emailed\./.test(send), 'precise error');
  ok('  and it signs the footer url per guest, where the secret is',
     /guestStopEmailsUrl\(String\(g\.id\)\)/.test(send), 'signed server-side');
  ok('  skipping a guest with no id rather than signing an empty one',
     /g\.id \? guestStopEmailsUrl/.test(send), 'guarded');
  ok('api/_lib/auth.js was not widened for this',
     !/email_opt_out/.test(code('api/_lib/auth.js')), 'outside this item\'s set, untouched');

  // ── 6. THE COUPLE SEES IT ON THE ROW ───────────────────────────────────
  //
  // In the send-history cell, because that is where "has this guest been
  // mailed" already lives. Above the history rather than instead of it: what
  // was sent before they opted out is still a true record.
  const list = code('src/components/guests/GuestList.jsx');
  ok('the guest row says when someone asked not to be emailed',
     /data-opted-out/.test(list) && /Asked not to be emailed/.test(list), 'labelled');
  ok('  read from the stored flag', /const optedOut = !!guest\.email_opt_out/.test(list), 'email_opt_out');
  ok('  and shown even when nothing was ever sent to them',
     /return optedOut\s*\?\s*<div data-send-history/.test(list), 'not swallowed by Not sent');
  ok('  without hiding the history that predates it',
     /<div data-send-history[\s\S]{0,200}\{optedOutLine\}[\s\S]{0,200}shown\.map/.test(list), 'above, not instead');

  // The client's half: the courtesy, and the count before the send.
  const modal = code('src/components/guests/SendInvitesModal.jsx');
  ok('the send flow filters opted-out guests out of the send',
     /const sendableGuests = selectedGuests\.filter\(g => !g\.email_opt_out\)/.test(modal), 'filtered');
  ok('  mints no token for them', /ensureTokens\(sendableGuests\)/.test(modal), 'sendable only');
  ok('  and says how many were skipped, in the result',
     /skipped who asked not to be emailed/.test(modal), 'in the sentence');

  return results;
}
