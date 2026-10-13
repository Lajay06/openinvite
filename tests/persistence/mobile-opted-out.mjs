/**
 * tests/persistence/mobile-opted-out.mjs
 *
 * A GUEST WHO ASKED NOT TO BE EMAILED IS SHOWN, AND SKIPPED, ON THE PHONE.
 *
 * Mobile parity 8 of goals/2026-10-10-mobile-pass.md. Since #951 a guest can
 * use the stop-emails link, and the web says so in two places: the guest
 * list's "Asked not to be emailed" line (GuestList.jsx), and the send result,
 * ", N skipped who asked not to be emailed" (SendInvitesModal.jsx), which
 * sends to the sendable guests only. The shell showed neither, and its send
 * screen reported an opted-out guest as Sent and stamped them invited, while
 * the server had quietly skipped them.
 *
 * The wording is checked against the web's own files, so a later change to
 * the web's sentence turns this red instead of leaving two versions.
 */

import fs from 'fs';
import path from 'path';
import { pass, fail, stripComments } from './_shared.mjs';

const ROOT = path.resolve(new URL('../../', import.meta.url).pathname);
const read = (rel) => { try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch { return ''; } };
const code = (rel) => stripComments(read(rel), { line: true });

function span(src, from, to) {
  const a = src.indexOf(from);
  if (a < 0) return '';
  const b = src.indexOf(to, a + from.length);
  return b < 0 ? src.slice(a) : src.slice(a, b);
}

export async function runMobileOptedOut() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── THE WORDS ARE THE WEB'S ──────────────────────────────────────────────
  const webList = code('src/components/guests/GuestList.jsx');
  const webSend = code('src/components/guests/SendInvitesModal.jsx');
  const format = code('src/mobile/lib/format.js');
  ok("the web's row line is still the one copied", />\s*Asked not to be emailed\s*</.test(webList), 'GuestList.jsx');
  ok('  and the shell names it once', /export const OPTED_OUT_LABEL = 'Asked not to be emailed';/.test(format), 'lib/format.js');
  ok("the web's send sentence is still the one copied",
     /`, \$\{nSkipped\} skipped who asked not to be emailed`/.test(webSend), 'SendInvitesModal.jsx');

  // ── THE LIST AND THE DETAIL ──────────────────────────────────────────────
  const list = code('src/mobile/screens/guests/GuestsScreen.jsx');
  const row = span(list, 'export function GuestRow', '\nexport function ');
  ok('a guest row says so when the guest opted out',
     /\{guest\.email_opt_out && <div className="oi-m-row__sub" data-opted-out[^>]*>\{OPTED_OUT_LABEL\}<\/div>\}/.test(row), 'GuestRow');
  ok('  in the same red the web line uses', /data-opted-out style=\{\{ color: 'var\(--m-no\)' \}\}/.test(row)
     && /--m-no: #991B1B;/i.test(read('src/mobile/styles/mobile.css')) && /color: '#991b1b'/i.test(webList), '#991B1B on both');
  const detail = code('src/mobile/screens/guests/GuestDetailScreen.jsx');
  ok('the guest detail says so on the email row',
     /sub=\{guest\.email_opt_out \? OPTED_OUT_LABEL : /.test(detail), 'Contact, Email');

  // ── THE SEND: SENDABLE ONLY ──────────────────────────────────────────────
  const sendSrc = code('src/mobile/screens/guests/SendInvitesScreen.jsx');
  const send = span(sendSrc, 'const send = async', 'const failed = result');
  ok('the send splits off the guests who opted out',
     /const optedOut = list\.filter\(\(g\) => g\.email_opt_out\);/.test(send)
       && /const sendable = list\.filter\(\(g\) => !g\.email_opt_out[ &)]/.test(send), 'optedOut, sendable');
  ok('  mints links for the sendable guests only', /await ensureTokens\(sendable\)/.test(send) && !/ensureTokens\(list\)/.test(send), 'ensureTokens(sendable)');
  ok('  stamps only the guests it sent to',
     /await Promise\.all\(sentGuests\.map\(track\)\)/.test(send) && !/list\.map\(track\)/.test(send), 'track over the guests the send reached');
  ok('  lists an opted-out guest as skipped, with the reason',
     /optedOut\.map\(\(g\) => \(\{ guest: g, status: 'skipped', why: OPTED_OUT_LABEL \}\)\)/.test(send)
       && (send.match(/\.\.\.notSent/g) || []).length === 2,
     'on success and on failure');
  ok('  so a failed send never offers to resend to them',
     /sendable\.map\(\(g\) => \(\{ guest: g, status: 'failed'/.test(send) && !/list\.map\(\(g\) => \(\{ guest: g, status: 'failed'/.test(send), 'failed rows are sendable only');
  ok('  and the result sentence says how many, as the web does',
     /optedOut\.length > 0 \? `, \$\{optedOut\.length\} skipped who asked not to be emailed` : ''/.test(send), 'toast');

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runMobileOptedOut();
  process.exit(r.every(Boolean) ? 0 : 1);
}
