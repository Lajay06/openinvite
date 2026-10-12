/**
 * tests/persistence/mobile-send-history.mjs
 *
 * A SEND MADE FROM THE PHONE IS ADDED TO THE GUEST'S SEND HISTORY, EXACTLY AS
 * THE WEB ADDS IT.
 *
 * Ordered by the advisor on 2026-10-12 (lane D's finding 7 of
 * goals/2026-10-10-mobile-pass.md): same shape, imported not copied.
 * SendInvitesModal.jsx appends one Guest.send_history entry per guest it
 * minted a link for, built by src/lib/sendHistory.js's newSendEntry, for every
 * type, and the phone wrote none, so a send from the phone was missing from
 * the history on both surfaces.
 *
 * The guard checks the web still writes it this way, the phone writes it the
 * same way through the same import, and nothing in the shell builds an entry
 * of its own (by elimination: no to_hash, no hashing).
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

function walk(dir, out = []) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel, out);
    else if (/\.(jsx?|tsx?)$/.test(e.name)) out.push(rel);
  }
  return out;
}

const ENTRY = /newSendEntry\(type, g\.email, new Date\(sentAt\)\)/;
const APPEND = /send_history: \[\.\.\.\(Array\.isArray\(g\.send_history\) \? g\.send_history : \[\]\), historyById\.get\(g\.id\)\]/;

export async function runMobileSendHistory() {
  const results = [];
  const ok = (label, cond, detail) => results.push(cond ? pass(label, detail) : fail(label, 'see name', detail));

  // ── THE WEB'S WAY, STILL ─────────────────────────────────────────────────
  //
  // sentGuests, not withTokens, since 2026-10-12: the entry is built only for
  // guests an email actually reached. src/lib/sentRecipients.js has the rule.
  const web = code('src/components/guests/SendInvitesModal.jsx');
  ok('the web builds each entry through newSendEntry', /import \{ newSendEntry \} from '@\/lib\/sendHistory';/.test(web)
     && /sentGuests\.map\(async \(g\) => \[g\.id, await newSendEntry\(type, g\.email, new Date\(sentAt\)\)\]\)/.test(web), 'SendInvitesModal.jsx');
  ok('  and appends it to the guest\'s existing array', APPEND.test(web), 'never rewritten');
  ok('  for every type, the stamp beside it only for invite and reminder',
     (web.match(APPEND) && (web.match(/send_history: \[\.\.\./g) || []).length === 2), 'two writes');

  // ── THE PHONE'S WAY, THE SAME ────────────────────────────────────────────
  const shell = code('src/mobile/screens/guests/SendInvitesScreen.jsx');
  const send = span(shell, 'const send = async', 'const failed = result');
  ok('the phone imports newSendEntry', /import \{ newSendEntry \} from '@\/lib\/sendHistory';/.test(shell), 'SendInvitesScreen.jsx');
  ok('  builds one entry per guest a link was minted for',
     /new Map\(await Promise\.all\(withTokens\.map\(async \(g\) => \[g\.id, await newSendEntry\(type, g\.email, new Date\(sentAt\)\)\]\)\)\)/.test(send) && ENTRY.test(send), 'historyById');
  ok('  appends it the web\'s way', APPEND.test(send), 'appended');
  ok('  on every type: no type writes nothing any more',
     /: appended\(g\)\);/.test(send) && !/Promise\.resolve\(\)/.test(send), 'update, save the date, thank you');
  ok('  beside the stamp for invite and reminder, with one sentAt for both',
     /\{ \.\.\.\(type === 'reminder' \? \{ reminder_sent_at: sentAt \} : \{ invite_sent_at: sentAt, invite_channel: channelStr \}\), \.\.\.appended\(g\) \}/.test(send)
       && !/_sent_at: new Date\(\)/.test(send), 'stamp and entry');
  ok('  over the guests it sent to', /await Promise\.all\(withTokens\.map\(track\)\)/.test(send), 'withTokens');

  const retyped = walk('src/mobile').filter((f) => /to_hash|crypto\.subtle|SHA-256/.test(code(f)));
  ok('no shell file builds an entry or a hash of its own', retyped.length === 0, retyped.join(', ') || 'none');

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = await runMobileSendHistory();
  process.exit(r.every(Boolean) ? 0 : 1);
}
